// tratamientos.js - Sistema Inteligente de Tratamientos Finca La Herradura
class TratamientosManager {
    constructor() {
        this.tratamientos = [];
        this.enfermedades = [];
        this.productos = [];
        this.historialTratamientos = [];
        this.prediccionesIA = [];
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.configurarEventListeners();
        this.inicializarMLPredicciones();
        this.configurarGeolocation();
    }

    // ==================== MACHINE LEARNING & IA ====================
    async analizarEfectividadTratamientos() {
        try {
            const datosEntrenamiento = this.historialTratamientos.map(t => ({
                enfermedad: t.enfermedad,
                producto: t.producto,
                dosis: t.dosis,
                clima: t.climaAplicacion,
                efectividad: t.resultadoEfectividad,
                tiempoRecuperacion: t.tiempoRecuperacion,
                coordenadas: t.gps
            }));

            // Algoritmo ML para predecir efectividad
            const modelo = await this.entrenarModeloEfectividad(datosEntrenamiento);
            return modelo;
        } catch (error) {
            console.error('Error en análisis ML:', error);
        }
    }

    async predecirTratamientoOptimo(enfermedad, arbolId, condicionesClimaticas) {
        const prediccion = await this.modeloIA.predict({
            enfermedad: enfermedad,
            climaActual: condicionesClimaticas,
            historialArbol: await this.obtenerHistorialArbol(arbolId),
            ubicacionGPS: await this.obtenerCoordenadas(arbolId)
        });

        return {
            productoRecomendado: prediccion.producto,
            dosisOptima: prediccion.dosis,
            mejorMomento: prediccion.momento,
            probabilidadExito: prediccion.probabilidad,
            costo: prediccion.costoEstimado
        };
    }

    async detectarPatronesPlagas() {
        const analisisGeoespacial = this.tratamientos
            .filter(t => t.fecha >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .reduce((acc, t) => {
                const zona = this.determinarZona(t.gps);
                if (!acc[zona]) acc[zona] = {};
                if (!acc[zona][t.enfermedad]) acc[zona][t.enfermedad] = 0;
                acc[zona][t.enfermedad]++;
                return acc;
            }, {});

        // IA para detectar focos de infección
        const focos = Object.entries(analisisGeoespacial)
            .filter(([zona, enfermedades]) => 
                Object.values(enfermedades).some(cantidad => cantidad > 3)
            );

        return {
            focosCriticos: focos,
            recomendacionesIA: await this.generarRecomendacionesPreventivas(focos),
            alertasPrioritarias: await this.calcularAlertasPrioridad(focos)
        };
    }

    // ==================== GESTIÓN DE TRATAMIENTOS ====================
    async registrarTratamiento(datos) {
        try {
            const gpsCoords = await this.obtenerUbicacionActual();
            const climaActual = await climaManager.obtenerDatosActuales();
            
            const tratamiento = {
                id: this.generarId(),
                fecha: new Date(),
                arbolId: datos.arbolId,
                bloqueId: datos.bloqueId,
                enfermedad: datos.enfermedad,
                sintomas: datos.sintomas,
                producto: datos.producto,
                dosis: datos.dosis,
                metodoAplicacion: datos.metodo,
                costo: datos.costo,
                responsable: datos.responsable,
                gps: gpsCoords,
                clima: climaActual,
                fotos: datos.fotos || [],
                observaciones: datos.observaciones,
                fechaProximoSeguimiento: this.calcularProximoSeguimiento(datos.enfermedad),
                estadoSincronizacion: navigator.onLine ? 'sincronizado' : 'pendiente'
            };

            // Guardar en IndexedDB para offline
            await this.guardarOffline('tratamientos', tratamiento);
            
            // Sincronizar con Firebase si hay conexión
            if (navigator.onLine) {
                await this.sincronizarConFirebase(tratamiento);
            }

            this.tratamientos.push(tratamiento);
            this.actualizarUI();
            this.generarAlertasIA(tratamiento);

            return tratamiento;
        } catch (error) {
            console.error('Error registrando tratamiento:', error);
            this.mostrarNotificacion('Error al registrar tratamiento', 'error');
        }
    }

    async seguimientoTratamiento(tratamientoId, resultados) {
        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
        if (!tratamiento) return;

        const seguimiento = {
            id: this.generarId(),
            tratamientoId: tratamientoId,
            fecha: new Date(),
            estadoMejoria: resultados.mejoria, // 1-10
            sintomas: resultados.sintomas,
            efectosSecundarios: resultados.efectos,
            necesitaRetratamiento: resultados.retratar,
            observaciones: resultados.observaciones,
            fotos: resultados.fotos || [],
            gps: await this.obtenerUbicacionActual()
        };

        tratamiento.seguimientos = tratamiento.seguimientos || [];
        tratamiento.seguimientos.push(seguimiento);
        tratamiento.efectividad = this.calcularEfectividad(tratamiento);

        // Actualizar modelo ML con nuevos datos
        await this.actualizarModeloML(tratamiento);
        
        await this.guardarOffline('tratamientos', tratamiento);
        this.actualizarUI();
    }

    // ==================== ANÁLISIS Y REPORTES ====================
    generarReporteTratamientos(filtros = {}) {
        const tratamientosFiltrados = this.filtrarTratamientos(filtros);
        
        const reporte = {
            resumen: {
                totalTratamientos: tratamientosFiltrados.length,
                costoTotal: tratamientosFiltrados.reduce((sum, t) => sum + t.costo, 0),
                efectividadPromedio: this.calcularEfectividadPromedio(tratamientosFiltrados),
                enfermedadesMasComunes: this.analizarEnfermedadesFrecuentes(tratamientosFiltrados)
            },
            analisisGeografico: this.analizarDistribucionGeografica(tratamientosFiltrados),
            tendencias: this.analizarTendencias(tratamientosFiltrados),
            prediccionesIA: this.generarPrediccionesFuturas(tratamientosFiltrados),
            recomendaciones: this.generarRecomendacionesIA(tratamientosFiltrados)
        };

        return reporte;
    }

    analizarEficienciaProductos() {
        const productos = {};
        
        this.historialTratamientos.forEach(t => {
            if (!productos[t.producto]) {
                productos[t.producto] = {
                    usos: 0,
                    efectividadTotal: 0,
                    costoTotal: 0,
                    tiempoRecuperacionPromedio: 0
                };
            }
            
            productos[t.producto].usos++;
            productos[t.producto].efectividadTotal += t.efectividad;
            productos[t.producto].costoTotal += t.costo;
            productos[t.producto].tiempoRecuperacionPromedio += t.tiempoRecuperacion;
        });

        return Object.entries(productos).map(([nombre, datos]) => ({
            producto: nombre,
            efectividadPromedio: datos.efectividadTotal / datos.usos,
            costoPromedio: datos.costoTotal / datos.usos,
            tiempoRecuperacion: datos.tiempoRecuperacionPromedio / datos.usos,
            frecuenciaUso: datos.usos,
            costoBeneficio: (datos.efectividadTotal / datos.usos) / (datos.costoTotal / datos.usos)
        })).sort((a, b) => b.costoBeneficio - a.costoBeneficio);
    }

    // ==================== GESTIÓN GPS ====================
    async obtenerUbicacionActual() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date()
                    });
                },
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }

    determinarZona(coordenadas) {
        // Dividir finca en zonas de 100x100 metros
        const zoneLat = Math.floor(coordenadas.lat * 1000) / 1000;
        const zoneLng = Math.floor(coordenadas.lng * 1000) / 1000;
        return `zona_${zoneLat}_${zoneLng}`;
    }

    calcularDistanciaEntreArboles(coord1, coord2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
        const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000; // Retorna en metros
    }

    // ==================== SINCRONIZACIÓN Y OFFLINE ====================
    async sincronizarDatos() {
        if (!navigator.onLine) return;

        try {
            // Subir datos pendientes
            const datosPendientes = await this.obtenerDatosPendientes();
            for (const dato of datosPendientes) {
                await this.sincronizarConFirebase(dato);
                dato.estadoSincronizacion = 'sincronizado';
                await this.guardarOffline('tratamientos', dato);
            }

            // Descargar datos actualizados
            const datosFirebase = await this.obtenerDatosFirebase();
            await this.actualizarDatosLocales(datosFirebase);

            this.mostrarNotificacion('Datos sincronizados correctamente', 'success');
        } catch (error) {
            console.error('Error en sincronización:', error);
            this.mostrarNotificacion('Error en sincronización', 'error');
        }
    }

    async guardarOffline(tabla, datos) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FincaHerraduraDB', 1);
            
            request.onsuccess = event => {
                const db = event.target.result;
                const transaction = db.transaction([tabla], 'readwrite');
                const store = transaction.objectStore(tabla);
                store.put(datos);
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
        });
    }

    // ==================== UI Y EVENTOS ====================
    configurarEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.configurarFormularios();
            this.configurarFiltros();
            this.configurarMapas();
            this.configurarNotificaciones();
        });

        // Eventos de conectividad
        window.addEventListener('online', () => this.sincronizarDatos());
        window.addEventListener('offline', () => this.modoOffline());
    }

    configurarFormularios() {
        const formTratamiento = document.getElementById('formTratamiento');
        if (formTratamiento) {
            formTratamiento.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const datos = Object.fromEntries(formData.entries());
                await this.registrarTratamiento(datos);
            });
        }

        const formSeguimiento = document.getElementById('formSeguimiento');
        if (formSeguimiento) {
            formSeguimiento.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const datos = Object.fromEntries(formData.entries());
                await this.seguimientoTratamiento(datos.tratamientoId, datos);
            });
        }
    }

    actualizarUI() {
        this.actualizarListaTratamientos();
        this.actualizarEstadisticas();
        this.actualizarMapa();
        this.actualizarAlertas();
    }

    actualizarListaTratamientos() {
        const contenedor = document.getElementById('listaTratamientos');
        if (!contenedor) return;

        contenedor.innerHTML = this.tratamientos.map(t => `
            <div class="tratamiento-card" data-id="${t.id}">
                <div class="tratamiento-header">
                    <h4>Árbol ${t.arbolId} - ${t.enfermedad}</h4>
                    <span class="fecha">${this.formatearFecha(t.fecha)}</span>
                </div>
                <div class="tratamiento-body">
                    <p><strong>Producto:</strong> ${t.producto}</p>
                    <p><strong>Dosis:</strong> ${t.dosis}</p>
                    <p><strong>Responsable:</strong> ${t.responsable}</p>
                    <div class="efectividad">
                        <span class="label">Efectividad:</span>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${t.efectividad || 0}%"></div>
                        </div>
                    </div>
                </div>
                <div class="tratamiento-actions">
                    <button onclick="tratamientosManager.verDetalle('${t.id}')" class="btn-detalle">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button onclick="tratamientosManager.seguimiento('${t.id}')" class="btn-seguimiento">
                        <i class="fas fa-stethoscope"></i> Seguimiento
                    </button>
                    <button onclick="tratamientosManager.editar('${t.id}')" class="btn-editar">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ==================== UTILIDADES ====================
    generarId() {
        return 'trat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-GT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    mostrarNotificacion(mensaje, tipo) {
        // Implementar sistema de notificaciones
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    }

    async cargarDatos() {
        try {
            // Cargar desde IndexedDB primero
            this.tratamientos = await this.cargarDatosOffline('tratamientos') || [];
            
            // Si hay conexión, sincronizar
            if (navigator.onLine) {
                await this.sincronizarDatos();
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    }
}

// Inicializar el manager cuando se carga la página
const tratamientosManager = new TratamientosManager();