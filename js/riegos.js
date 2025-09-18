/* ========================================
   FINCA LA HERRADURA - SISTEMA DE RIEGO INTEGRADO
   Sistema completo integrado con TreeManager y Firebase
   ======================================== */

class RiegoManager {
    constructor() {
        // Configuración base
        this.fincaId = 'finca_la_herradura';
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentTime = new Date().toTimeString().slice(0, 5);
        
        // Datos en memoria
        this.riegos = new Map();
        this.horarios = new Map();
        this.sensores = new Map();
        this.alertas = [];
        
        // Referencias a otros managers
        this.treeManager = null;
        this.firebaseDb = null;
        this.firebaseAuth = null;
        
        // Configuración de riego para limones
        this.cropParameters = {
            'Lima Persa': {
                waterRequirement: 1200, // mm/año
                optimalHumidity: 70,
                maxDailyWater: 25, // L por árbol por día
                rootDepth: 60 // cm
            },
            'Limón Eureka': {
                waterRequirement: 1100,
                optimalHumidity: 65,
                maxDailyWater: 22,
                rootDepth: 55
            },
            'Limón Meyer': {
                waterRequirement: 1000,
                optimalHumidity: 68,
                maxDailyWater: 20,
                rootDepth: 50
            }
        };
        
        // Umbrales de alerta
        this.alertThresholds = {
            lowHumidity: 45,
            highHumidity: 90,
            lowPressure: 1.0,
            highPressure: 4.0,
            systemFailure: 0.5,
            waterWaste: 150
        };
        
        this.init();
    }

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    async init() {
        try {
            console.log('💧 Inicializando sistema de riego integrado...');
            
            // Esperar dependencias
            await this.waitForDependencies();
            
            // Cargar datos offline
            await this.loadOfflineData();
            
            // Inicializar sensores
            await this.initializeSensors();
            
            // Configurar monitoreo automático
            this.setupAutoUpdate();
            
            console.log('✅ Sistema de riego inicializado');
            
            // Notificar que está listo
            window.dispatchEvent(new CustomEvent('riegoManagerReady'));
            
        } catch (error) {
            console.error('❌ Error inicializando sistema de riego:', error);
        }
    }

    async waitForDependencies() {
        // Esperar TreeManager
        await new Promise((resolve) => {
            const checkTreeManager = () => {
                if (window.treeManager && window.treeManager.isInitialized) {
                    this.treeManager = window.treeManager;
                    console.log('✅ TreeManager conectado a RiegoManager');
                    resolve();
                } else {
                    setTimeout(checkTreeManager, 100);
                }
            };
            checkTreeManager();
            setTimeout(resolve, 5000); // Timeout de 5 segundos
        });

        // Esperar Firebase
        await new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.db && window.auth) {
                    this.firebaseDb = window.db;
                    this.firebaseAuth = window.auth;
                    console.log('✅ Firebase conectado a RiegoManager');
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
            setTimeout(resolve, 3000); // Timeout de 3 segundos
        });
    }

    async loadOfflineData() {
        try {
            // Cargar riegos existentes
            if (this.firebaseDb) {
                const snapshot = await this.firebaseDb.collection('riegos')
                    .where('fincaId', '==', this.fincaId)
                    .orderBy('createdAt', 'desc')
                    .limit(100)
                    .get();

                snapshot.forEach(doc => {
                    this.riegos.set(doc.id, {
                        id: doc.id,
                        ...doc.data(),
                        firebaseRef: doc.ref
                    });
                });

                console.log(`💧 ${this.riegos.size} riegos cargados desde Firebase`);
            }

            // Cargar horarios
            if (this.firebaseDb) {
                const horariosSnapshot = await this.firebaseDb.collection('horarios_riego')
                    .where('fincaId', '==', this.fincaId)
                    .where('active', '==', true)
                    .get();

                horariosSnapshot.forEach(doc => {
                    this.horarios.set(doc.id, {
                        id: doc.id,
                        ...doc.data(),
                        firebaseRef: doc.ref
                    });
                });

                console.log(`⏰ ${this.horarios.size} horarios cargados desde Firebase`);
            }

        } catch (error) {
            console.error('Error cargando datos offline:', error);
        }
    }

    async initializeSensors() {
        try {
            // Crear sensores para sectores existentes si no existen
            if (this.treeManager) {
                const sectores = this.treeManager.getAllSectors();
                
                for (const sector of sectores) {
                    await this.createSensorForSector(sector);
                }
            }

            // Iniciar simulación de sensores (solo para demostración)
            this.startSensorSimulation();

        } catch (error) {
            console.error('Error inicializando sensores:', error);
        }
    }

    async createSensorForSector(sector) {
        const sensorId = `sensor_${sector.id}`;
        
        if (!this.sensores.has(sensorId)) {
            const sensor = {
                id: sensorId,
                sectorId: sector.id,
                sectorName: sector.name,
                type: 'humedad_suelo',
                status: 'active',
                lastReading: {
                    value: 65 + Math.random() * 20,
                    timestamp: new Date().toISOString(),
                    quality: 'good'
                },
                position: sector.coordinates?.center || [14.6349, -90.5069],
                createdAt: new Date().toISOString()
            };

            this.sensores.set(sensorId, sensor);

            // Guardar en Firebase si está disponible
            if (this.firebaseDb) {
                try {
                    await this.firebaseDb.collection('sensores_riego').doc(sensorId).set({
                        ...sensor,
                        createdAt: this.firebaseDb.FieldValue?.serverTimestamp?.() || new Date(),
                        fincaId: this.fincaId
                    });
                } catch (error) {
                    console.error('Error guardando sensor en Firebase:', error);
                }
            }
        }
    }

    startSensorSimulation() {
        // Actualizar lecturas de sensores cada 15 minutos
        setInterval(() => {
            this.updateSensorReadings();
        }, 15 * 60 * 1000);

        // Primera actualización inmediata
        this.updateSensorReadings();
    }

    async updateSensorReadings() {
        for (const [sensorId, sensor] of this.sensores) {
            if (sensor.status !== 'active') continue;

            try {
                // Simular lectura realista
                const oldValue = sensor.lastReading?.value || 65;
                let newValue = oldValue + (Math.random() - 0.5) * 5;

                // Simular efecto de riego reciente
                const recentRiego = this.getRecentRiegoForSector(sensor.sectorId);
                if (recentRiego) {
                    const hoursAgo = (new Date() - new Date(recentRiego.createdAt)) / (1000 * 60 * 60);
                    if (hoursAgo < 2) {
                        newValue += 15 * (1 - hoursAgo / 2);
                    }
                }

                // Mantener dentro de rangos realistas
                newValue = Math.max(20, Math.min(95, newValue));

                sensor.lastReading = {
                    value: Math.round(newValue * 10) / 10,
                    timestamp: new Date().toISOString(),
                    quality: 'good'
                };

                // Verificar alertas
                this.checkSensorAlerts(sensor);

            } catch (error) {
                console.error(`Error actualizando sensor ${sensorId}:`, error);
            }
        }
    }

    getRecentRiegoForSector(sectorId) {
        const recentRiegos = Array.from(this.riegos.values())
            .filter(riego => 
                riego.ubicacion === sectorId &&
                riego.estado === 'completado' &&
                new Date(riego.createdAt) > new Date(Date.now() - 6 * 60 * 60 * 1000) // últimas 6 horas
            )
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return recentRiegos[0] || null;
    }

    checkSensorAlerts(sensor) {
        const value = sensor.lastReading.value;
        
        if (value < this.alertThresholds.lowHumidity) {
            this.addAlert({
                type: 'critical',
                title: 'Humedad Crítica Baja',
                message: `${sensor.sectorName}: ${value}% - Riego urgente requerido`,
                sectorId: sensor.sectorId,
                action: 'regar_inmediato'
            });
        } else if (value > this.alertThresholds.highHumidity) {
            this.addAlert({
                type: 'warning',
                title: 'Humedad Alta',
                message: `${sensor.sectorName}: ${value}% - Verificar drenaje`,
                sectorId: sensor.sectorId,
                action: 'verificar_drenaje'
            });
        }
    }

    addAlert(alert) {
        alert.id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        alert.timestamp = new Date().toISOString();
        
        // Evitar duplicados
        const exists = this.alertas.find(a => 
            a.type === alert.type && 
            a.sectorId === alert.sectorId &&
            (new Date() - new Date(a.timestamp)) < 30 * 60 * 1000 // últimos 30 min
        );

        if (!exists) {
            this.alertas.unshift(alert);
            
            // Mantener solo las últimas 20 alertas
            if (this.alertas.length > 20) {
                this.alertas = this.alertas.slice(0, 20);
            }

            // Notificar nueva alerta
            window.dispatchEvent(new CustomEvent('nuevaAlertaRiego', {
                detail: alert
            }));

            console.log(`🚨 Nueva alerta: ${alert.title}`);
        }
    }

    // ==========================================
    // GESTIÓN DE RIEGOS
    // ==========================================

    async crearRiego(datos) {
        try {
            const riegoId = this.generateRiegoId();
            
            const riego = {
                id: riegoId,
                ubicacion: datos.ubicacion, // Sector ID
                arbolId: datos.arbolId || null,
                tipoRiego: datos.tipoRiego || 'manual',
                duracion: parseInt(datos.duracion),
                caudal: parseFloat(datos.caudal) || 10,
                fechaHora: datos.fechaHora || new Date().toISOString(),
                estado: datos.estado || 'programado',
                responsable: datos.responsable || 'Sistema',
                observaciones: datos.observaciones || '',
                
                // Cálculos automáticos
                volumenEstimado: this.calcularVolumenEstimado(datos),
                humedadObjetivo: this.calcularHumedadObjetivo(datos),
                
                // Metadatos
                createdAt: new Date().toISOString(),
                fincaId: this.fincaId,
                createdBy: this.firebaseAuth?.currentUser?.uid || 'anonymous'
            };

            // Guardar en memoria
            this.riegos.set(riegoId, riego);

            // Guardar en Firebase
            if (this.firebaseDb) {
                await this.firebaseDb.collection('riegos').doc(riegoId).set({
                    ...riego,
                    createdAt: this.firebaseDb.FieldValue?.serverTimestamp?.() || new Date()
                });
            }

            console.log(`💧 Riego creado: ${riegoId}`);

            // Notificar actualización
            window.dispatchEvent(new CustomEvent('riegoCreado', {
                detail: riego
            }));

            return riego;

        } catch (error) {
            console.error('Error creando riego:', error);
            throw error;
        }
    }

    calcularVolumenEstimado(datos) {
        const duracion = parseInt(datos.duracion);
        const caudal = parseFloat(datos.caudal) || 10;
        return duracion * caudal; // Litros
    }

    calcularHumedadObjetivo(datos) {
        // Basado en la variedad de limón si está disponible
        if (datos.arbolId && this.treeManager) {
            this.treeManager.getTree(datos.arbolId).then(arbol => {
                if (arbol && this.cropParameters[arbol.variety]) {
                    return this.cropParameters[arbol.variety].optimalHumidity;
                }
            });
        }
        
        return 70; // Humedad objetivo por defecto
    }

    async iniciarRiego(riegoId) {
        try {
            const riego = this.riegos.get(riegoId);
            if (!riego) throw new Error('Riego no encontrado');

            riego.estado = 'activo';
            riego.horaInicio = new Date().toISOString();
            riego.updatedAt = new Date().toISOString();

            // Actualizar en Firebase
            if (this.firebaseDb && riego.firebaseRef) {
                await riego.firebaseRef.update({
                    estado: 'activo',
                    horaInicio: this.firebaseDb.FieldValue?.serverTimestamp?.() || new Date(),
                    updatedAt: this.firebaseDb.FieldValue?.serverTimestamp?.() || new Date()
                });
            }

            console.log(`🚀 Riego iniciado: ${riegoId}`);

            // Programar finalización automática
            setTimeout(() => {
                this.completarRiego(riegoId);
            }, riego.duracion * 60 * 1000);

            // Notificar
            window.dispatchEvent(new CustomEvent('riegoIniciado', {
                detail: riego
            }));

            return riego;

        } catch (error) {
            console.error('Error iniciando riego:', error);
            throw error;
        }
    }

    async completarRiego(riegoId) {
        try {
            const riego = this.riegos.get(riegoId);
            if (!riego) return;

            riego.estado = 'completado';
            riego.horaFin = new Date().toISOString();
            riego.updatedAt = new Date().toISOString();

            // Calcular duración real
            if (riego.horaInicio) {
                const duracionReal = (new Date(riego.horaFin) - new Date(riego.horaInicio)) / (1000 * 60);
                riego.duracionReal = Math.round(duracionReal);
                riego.volumenReal = riego.duracionReal * riego.caudal;
            }

            // Actualizar en Firebase
            if (this.firebaseDb && riego.firebaseRef) {
                await riego.firebaseRef.update({
                    estado: 'completado',
                    horaFin: this.firebaseDb.FieldValue?.serverTimestamp?.() || new Date(),
                    duracionReal: riego.duracionReal || riego.duracion,
                    volumenReal: riego.volumenReal || riego.volumenEstimado,
                    updatedAt: this.firebaseDb.FieldValue?.serverTimestamp?.() || new Date()
                });
            }

            console.log(`✅ Riego completado: ${riegoId}`);

            // Notificar
            window.dispatchEvent(new CustomEvent('riegoCompletado', {
                detail: riego
            }));

        } catch (error) {
            console.error('Error completando riego:', error);
        }
    }

    // ==========================================
    // GESTIÓN DE HORARIOS
    // ==========================================

    async crearHorario(datos) {
        try {
            const horarioId = this.generateHorarioId();
            
            const horario = {
                id: horarioId,
                nombre: datos.nombre,
                ubicacion: datos.ubicacion,
                diasSemana: datos.diasSemana || [1, 3, 5], // Lun, Mié, Vie
                hora: datos.hora,
                duracion: parseInt(datos.duracion),
                caudal: parseFloat(datos.caudal) || 10,
                activo: datos.activo !== false,
                
                // Condiciones
                humedadMinima: datos.humedadMinima || 50,
                humedadMaxima: datos.humedadMaxima || 85,
                omitirLluvia: datos.omitirLluvia !== false,
                
                // Metadatos
                createdAt: new Date().toISOString(),
                fincaId: this.fincaId,
                createdBy: this.firebaseAuth?.currentUser?.uid || 'anonymous'
            };

            // Calcular próxima ejecución
            horario.proximaEjecucion = this.calcularProximaEjecucion(horario);

            // Guardar en memoria
            this.horarios.set(horarioId, horario);

            // Guardar en Firebase
            if (this.firebaseDb) {
                await this.firebaseDb.collection('horarios_riego').doc(horarioId).set({
                    ...horario,
                    createdAt: this.firebaseDb.FieldValue?.serverTimestamp?.() || new Date()
                });
            }

            console.log(`⏰ Horario creado: ${horarioId}`);

            return horario;

        } catch (error) {
            console.error('Error creando horario:', error);
            throw error;
        }
    }

    calcularProximaEjecucion(horario) {
        const ahora = new Date();
        const [hora, minuto] = horario.hora.split(':').map(Number);
        
        let proximaFecha = new Date();
        proximaFecha.setHours(hora, minuto, 0, 0);

        // Si ya pasó la hora de hoy, buscar el próximo día válido
        if (proximaFecha <= ahora) {
            proximaFecha.setDate(proximaFecha.getDate() + 1);
        }

        // Encontrar el próximo día de la semana válido
        while (!horario.diasSemana.includes(proximaFecha.getDay())) {
            proximaFecha.setDate(proximaFecha.getDate() + 1);
        }

        return proximaFecha.toISOString();
    }

    // ==========================================
    // EJECUCIÓN AUTOMÁTICA
    // ==========================================

    setupAutoUpdate() {
        // Verificar horarios cada minuto
        setInterval(() => {
            this.verificarHorarios();
        }, 60 * 1000);

        // Actualizar sensores cada 15 minutos
        setInterval(() => {
            this.updateSensorReadings();
        }, 15 * 60 * 1000);

        console.log('⏰ Monitoreo automático configurado');
    }

    async verificarHorarios() {
        const ahora = new Date();
        
        for (const [horarioId, horario] of this.horarios) {
            if (!horario.activo) continue;
            
            const proximaEjecucion = new Date(horario.proximaEjecucion);
            
            if (proximaEjecucion <= ahora) {
                await this.ejecutarHorario(horario);
            }
        }
    }

    async ejecutarHorario(horario) {
        try {
            // Verificar condiciones antes de ejecutar
            const puedeEjecutar = await this.verificarCondicionesRiego(horario);
            
            if (!puedeEjecutar.permitido) {
                console.log(`⏸️ Riego omitido: ${puedeEjecutar.razon}`);
                
                // Actualizar próxima ejecución
                horario.proximaEjecucion = this.calcularProximaEjecucion(horario);
                
                if (this.firebaseDb && horario.firebaseRef) {
                    await horario.firebaseRef.update({
                        proximaEjecucion: horario.proximaEjecucion,
                        ultimaOmision: new Date().toISOString(),
                        razonOmision: puedeEjecutar.razon
                    });
                }
                
                return;
            }

            // Crear riego automático
            const riego = await this.crearRiego({
                ubicacion: horario.ubicacion,
                tipoRiego: 'automatico',
                duracion: horario.duracion,
                caudal: horario.caudal,
                responsable: 'Sistema Automático',
                observaciones: `Riego automático - Horario: ${horario.nombre}`,
                horarioId: horario.id
            });

            // Iniciar inmediatamente
            await this.iniciarRiego(riego.id);

            // Actualizar horario
            horario.proximaEjecucion = this.calcularProximaEjecucion(horario);
            horario.ultimaEjecucion = new Date().toISOString();

            if (this.firebaseDb && horario.firebaseRef) {
                await horario.firebaseRef.update({
                    proximaEjecucion: horario.proximaEjecucion,
                    ultimaEjecucion: horario.ultimaEjecucion
                });
            }

            console.log(`✅ Horario ejecutado: ${horario.nombre}`);

        } catch (error) {
            console.error('Error ejecutando horario:', error);
        }
    }

    async verificarCondicionesRiego(horario) {
        try {
            // Verificar humedad del suelo
            const sensor = Array.from(this.sensores.values())
                .find(s => s.sectorId === horario.ubicacion);

            if (sensor && sensor.lastReading) {
                const humedad = sensor.lastReading.value;
                
                if (humedad > horario.humedadMaxima) {
                    return { 
                        permitido: false, 
                        razon: `Humedad alta: ${humedad}%` 
                    };
                }
                
                if (humedad > horario.humedadMinima) {
                    return { 
                        permitido: false, 
                        razon: `Humedad adecuada: ${humedad}%` 
                    };
                }
            }

            // Verificar lluvia (simplificado - en producción usar datos meteorológicos)
            if (horario.omitirLluvia && Math.random() < 0.1) { // 10% probabilidad de lluvia
                return { 
                    permitido: false, 
                    razon: 'Lluvia detectada' 
                };
            }

            return { permitido: true, razon: 'Condiciones favorables' };

        } catch (error) {
            console.error('Error verificando condiciones:', error);
            return { permitido: false, razon: 'Error verificando condiciones' };
        }
    }

    // ==========================================
    // API PÚBLICA PARA LA INTERFAZ
    // ==========================================

    // Obtener métricas para el dashboard
    obtenerMetricas() {
        const riegosHoy = Array.from(this.riegos.values())
            .filter(r => r.createdAt.startsWith(this.currentDate));

        const consumoHoy = riegosHoy.reduce((total, r) => 
            total + (r.volumenReal || r.volumenEstimado || 0), 0);

        const riegosActivos = Array.from(this.riegos.values())
            .filter(r => r.estado === 'activo');

        const horariosActivos = Array.from(this.horarios.values())
            .filter(h => h.activo);

        return {
            consumoHoy: Math.round(consumoHoy),
            tiempoActivo: riegosActivos.length > 0 ? 
                Math.max(...riegosActivos.map(r => 
                    Math.round((new Date() - new Date(r.horaInicio || r.createdAt)) / (1000 * 60))
                )) : 0,
            humedadPromedio: this.calcularHumedadPromedio(),
            zonasActivas: riegosActivos.length,
            costoHoy: Math.round(consumoHoy * 0.05), // Q0.05 por litro
            sistemaActivo: horariosActivos.length > 0 || riegosActivos.length > 0,
            cambioConsumo: this.calcularCambioConsumo(),
            estadoHumedad: this.evaluarEstadoHumedad(),
            estadoCosto: this.evaluarEstadoCosto(consumoHoy),
            zonasTotal: this.sensores.size
        };
    }

    calcularHumedadPromedio() {
        const lecturas = Array.from(this.sensores.values())
            .filter(s => s.lastReading && s.status === 'active')
            .map(s => s.lastReading.value);

        if (lecturas.length === 0) return 0;
        
        return Math.round(lecturas.reduce((sum, v) => sum + v, 0) / lecturas.length);
    }

    calcularCambioConsumo() {
        // Simplificado - comparar con día anterior
        const hoy = Array.from(this.riegos.values())
            .filter(r => r.createdAt.startsWith(this.currentDate))
            .reduce((total, r) => total + (r.volumenReal || r.volumenEstimado || 0), 0);

        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const ayerStr = ayer.toISOString().split('T')[0];
        
        const consumoAyer = Array.from(this.riegos.values())
            .filter(r => r.createdAt.startsWith(ayerStr))
            .reduce((total, r) => total + (r.volumenReal || r.volumenEstimado || 0), 0);

        if (consumoAyer === 0) return 0;
        return Math.round(((hoy - consumoAyer) / consumoAyer) * 100);
    }

    evaluarEstadoHumedad() {
        const promedio = this.calcularHumedadPromedio();
        if (promedio >= 60 && promedio <= 80) return 'Óptima';
        if (promedio >= 50) return 'Aceptable';
        return 'Baja';
    }

    evaluarEstadoCosto(consumo) {
        const presupuestoDiario = 500; // Q500 por día
        const costoHoy = consumo * 0.05;
        
        if (costoHoy <= presupuestoDiario * 0.8) return 'Dentro presupuesto';
        if (costoHoy <= presupuestoDiario) return 'Cerca del límite';
        return 'Sobre presupuesto';
    }

    // Obtener programas activos para la interfaz
    obtenerProgramasActivos() {
        return Array.from(this.horarios.values())
            .filter(h => h.activo)
            .map(h => ({
                id: h.id,
                nombre: h.nombre,
                horario: `${h.hora} - ${h.diasSemana.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')}`,
                duracion: h.duracion,
                zonas: [h.ubicacion],
                estado: new Date(h.proximaEjecucion) <= new Date() ? 'activo' : 'programado'
            }));
    }

    // Obtener datos de sensores para la interfaz
    obtenerDatosSensores() {
        return Array.from(this.sensores.values())
            .filter(s => s.status === 'active')
            .map(s => ({
                nombre: `Sensor ${s.sectorName}`,
                ubicacion: s.sectorName,
                tipo: s.type,
                valor: s.lastReading ? `${s.lastReading.value.toFixed(1)}%` : 'Sin datos',
                unidad: '%'
            }));
    }

    // Obtener alertas para la interfaz
    obtenerAlertas() {
        return this.alertas.slice(0, 5).map(a => ({
            titulo: a.title,
            descripcion: a.message,
            tipo: a.type,
            icono: this.getAlertIcon(a.type)
        }));
    }

    getAlertIcon(type) {
        const icons = {
            'critical': 'fa-exclamation-triangle',
            'warning': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    // Obtener historial de riegos
    obtenerHistorialRiegos() {
        return Array.from(this.riegos.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20)
            .map(r => ({
                fechaHora: r.fechaHora || r.createdAt,
                zona: r.ubicacion,
                duracion: r.duracionReal || r.duracion,
                consumo: r.volumenReal || r.volumenEstimado || 0,
                humedadInicial: this.getHumedadSector(r.ubicacion, r.fechaHora) - 15,
                humedadFinal: this.getHumedadSector(r.ubicacion, r.fechaHora),
                tipo: r.tipoRiego,
                estado: r.estado
            }));
    }

    getHumedadSector(sectorId, fecha) {
        const sensor = Array.from(this.sensores.values())
            .find(s => s.sectorId === sectorId);
        
        return sensor?.lastReading?.value || 65;
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    generateRiegoId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 4);
        return `RIE_${timestamp}_${random}`.toUpperCase();
    }

    generateHorarioId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 4);
        return `HOR_${timestamp}_${random}`.toUpperCase();
    }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Instancia global del gestor de riego
let riegoManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Crear instancia del manager
        riegoManager = new RiegoManager();
        
        // Hacer disponible globalmente
        window.riegoManager = riegoManager;
        
        console.log('💧 RiegoManager disponible globalmente');
        
    } catch (error) {
        console.error('❌ Error inicializando RiegoManager:', error);
    }
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RiegoManager };
}

console.log('💧 Sistema de riego integrado cargado');
