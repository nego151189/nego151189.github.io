// recordatorios.js - Sistema Inteligente de Recordatorios Finca La Herradura
class RecordatoriosManager {
    constructor() {
        this.recordatorios = [];
        this.alertasActivas = [];
        this.prediccionesIA = [];
        this.configuracionNotificaciones = {};
        this.intervalos = new Map();
        this.init();
    }

    async init() {
        await this.cargarConfiguracion();
        await this.cargarRecordatorios();
        this.configurarNotificaciones();
        this.inicializarIA();
        this.configurarEventListeners();
        this.iniciarMonitoreo();
    }

    // ==================== MACHINE LEARNING & IA ====================
    async analizarPatronesActividades() {
        try {
            // Analizar patrones históricos de actividades
            const actividades = await this.obtenerHistorialActividades();
            const patrones = this.detectarPatronesTemporales(actividades);
            
            // IA para predecir mejores momentos para actividades
            const predicciones = await this.predecirMommentosOptimos(patrones);
            
            return {
                patronesDetectados: patrones,
                prediccionesIA: predicciones,
                recomendaciones: await this.generarRecomendacionesInteligentes(patrones)
            };
        } catch (error) {
            console.error('Error en análisis de patrones:', error);
        }
    }

    async predecirRecordatoriosNecesarios() {
        const datosEntrenamiento = {
            climaActual: await climaManager.obtenerPrediccion(7),
            estadoCultivo: await arbolesManager.obtenerEstadoGeneral(),
            historicoActividades: this.obtenerHistoricoActividades(),
            fechasImportantes: this.calcularFechasImportantes()
        };

        // IA para generar recordatorios predictivos
        const predicciones = await this.modeloIA.predecirActividades(datosEntrenamiento);
        
        return predicciones.map(p => ({
            tipo: p.actividad,
            prioridad: p.urgencia,
            fechaOptima: p.fechaRecomendada,
            razonIA: p.justificacion,
            probabilidadExito: p.probabilidad,
            recursosNecesarios: p.recursos
        }));
    }

    async analizarRendimientoRecordatorios() {
        const analisis = this.recordatorios
            .filter(r => r.completado)
            .reduce((acc, r) => {
                const categoria = r.categoria;
                if (!acc[categoria]) {
                    acc[categoria] = {
                        total: 0,
                        completadosATiempo: 0,
                        completadosTarde: 0,
                        tiempoPromedioComplecion: 0,
                        impactoProductividad: 0
                    };
                }
                
                acc[categoria].total++;
                if (r.fechaComplecion <= r.fechaVencimiento) {
                    acc[categoria].completadosATiempo++;
                } else {
                    acc[categoria].completadosTarde++;
                }
                
                const tiempoComplecion = r.fechaComplecion - r.fechaCreacion;
                acc[categoria].tiempoPromedioComplecion += tiempoComplecion;
                acc[categoria].impactoProductividad += r.impactoProductividad || 0;
                
                return acc;
            }, {});

        // Calcular métricas finales
        Object.keys(analisis).forEach(categoria => {
            const datos = analisis[categoria];
            datos.efectividad = datos.completadosATiempo / datos.total * 100;
            datos.tiempoPromedioComplecion = datos.tiempoPromedioComplecion / datos.total;
            datos.impactoPromedio = datos.impactoProductividad / datos.total;
        });

        return analisis;
    }

    // ==================== GESTIÓN DE RECORDATORIOS ====================
    async crearRecordatorio(datos) {
        try {
            const gpsCoords = await this.obtenerUbicacionActual();
            
            const recordatorio = {
                id: this.generarId(),
                titulo: datos.titulo,
                descripcion: datos.descripcion,
                categoria: datos.categoria, // riego, tratamiento, cosecha, mantenimiento, venta, pago
                prioridad: datos.prioridad, // alta, media, baja
                fechaCreacion: new Date(),
                fechaVencimiento: new Date(datos.fechaVencimiento),
                ubicacion: gpsCoords,
                arbolesAfectados: datos.arbolesAfectados || [],
                bloquesAfectados: datos.bloquesAfectados || [],
                recursosNecesarios: datos.recursos || [],
                costoEstimado: datos.costo || 0,
                responsable: datos.responsable,
                notificaciones: {
                    activadas: true,
                    anticipacion: datos.anticipacion || [24, 2], // horas antes
                    canales: datos.canales || ['push', 'email']
                },
                repeticion: datos.repeticion || null, // diaria, semanal, mensual, anual
                estado: 'pendiente', // pendiente, en_progreso, completado, cancelado
                metadatos: {
                    creadoPorIA: datos.creadoPorIA || false,
                    prediccionIA: datos.prediccionIA || null,
                    clima: await climaManager.obtenerDatosActuales()
                },
                sincronizado: navigator.onLine
            };

            // Guardar offline
            await this.guardarOffline('recordatorios', recordatorio);
            
            // Sincronizar con Firebase
            if (navigator.onLine) {
                await this.sincronizarConFirebase(recordatorio);
            }

            this.recordatorios.push(recordatorio);
            this.programarNotificaciones(recordatorio);
            this.actualizarUI();
            
            return recordatorio;
        } catch (error) {
            console.error('Error creando recordatorio:', error);
            this.mostrarNotificacion('Error al crear recordatorio', 'error');
        }
    }

    async completarRecordatorio(recordatorioId, datos = {}) {
        const recordatorio = this.recordatorios.find(r => r.id === recordatorioId);
        if (!recordatorio) return;

        recordatorio.estado = 'completado';
        recordatorio.fechaComplecion = new Date();
        recordatorio.resultados = {
            observaciones: datos.observaciones || '',
            fotos: datos.fotos || [],
            costoReal: datos.costoReal || recordatorio.costoEstimado,
            tiempoInvertido: datos.tiempoInvertido || 0,
            satisfaccion: datos.satisfaccion || 0, // 1-10
            proximaAccion: datos.proximaAccion || null
        };

        // Analizar efectividad para IA
        recordatorio.impactoProductividad = await this.calcularImpactoProductividad(recordatorio);
        
        // Aprender de la actividad completada
        await this.actualizarModeloIA(recordatorio);
        
        // Crear recordatorios de seguimiento si es necesario
        if (recordatorio.resultados.proximaAccion) {
            await this.crearRecordatorioSeguimiento(recordatorio);
        }

        await this.guardarOffline('recordatorios', recordatorio);
        this.cancelarNotificaciones(recordatorioId);
        this.actualizarUI();
    }

    async crearRecordatoriosInteligentes() {
        const predicciones = await this.predecirRecordatoriosNecesarios();
        
        for (const prediccion of predicciones) {
            if (prediccion.probabilidadExito > 0.7) {
                await this.crearRecordatorio({
                    titulo: `[IA] ${prediccion.tipo}`,
                    descripcion: prediccion.razonIA,
                    categoria: this.mapearCategoriaIA(prediccion.tipo),
                    prioridad: prediccion.prioridad,
                    fechaVencimiento: prediccion.fechaOptima,
                    recursos: prediccion.recursosNecesarios,
                    creadoPorIA: true,
                    prediccionIA: prediccion
                });
            }
        }
    }

    // ==================== NOTIFICACIONES ====================
    async configurarNotificaciones() {
        // Solicitar permisos para notificaciones
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.configuracionNotificaciones.push = permission === 'granted';
        }

        // Configurar service worker para notificaciones push
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('sw.js');
            this.configuracionNotificaciones.serviceWorker = registration;
        }
    }

    programarNotificaciones(recordatorio) {
        recordatorio.notificaciones.anticipacion.forEach(horas => {
            const tiempoNotificacion = new Date(recordatorio.fechaVencimiento.getTime() - (horas * 60 * 60 * 1000));
            
            if (tiempoNotificacion > new Date()) {
                const timeout = setTimeout(() => {
                    this.enviarNotificacion(recordatorio, horas);
                }, tiempoNotificacion.getTime() - Date.now());
                
                this.intervalos.set(`${recordatorio.id}_${horas}`, timeout);
            }
        });
    }

    async enviarNotificacion(recordatorio, horasAntes) {
        const mensaje = horasAntes > 1 
            ? `Recordatorio en ${horasAntes} horas: ${recordatorio.titulo}`
            : `¡Urgente! ${recordatorio.titulo}`;

        // Notificación push del navegador
        if (this.configuracionNotificaciones.push) {
            new Notification(mensaje, {
                body: recordatorio.descripcion,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                data: { recordatorioId: recordatorio.id },
                actions: [
                    { action: 'completar', title: 'Marcar como completado' },
                    { action: 'posponer', title: 'Posponer 1 hora' }
                ]
            });
        }

        // Guardar en alertas activas
        this.alertasActivas.push({
            id: this.generarId(),
            recordatorioId: recordatorio.id,
            mensaje: mensaje,
            tipo: this.determinarTipoAlerta(recordatorio),
            timestamp: new Date(),
            leida: false
        });

        this.actualizarContadorAlertas();
    }

    cancelarNotificaciones(recordatorioId) {
        for (const [key, timeout] of this.intervalos.entries()) {
            if (key.startsWith(recordatorioId)) {
                clearTimeout(timeout);
                this.intervalos.delete(key);
            }
        }
    }

    // ==================== ANÁLISIS GEOGRÁFICO ====================
    async obtenerRecordatoriosPorUbicacion(ubicacion, radio = 100) {
        return this.recordatorios.filter(r => {
            if (!r.ubicacion) return false;
            const distancia = this.calcularDistancia(ubicacion, r.ubicacion);
            return distancia <= radio;
        });
    }

    async generarMapaRecordatorios() {
        const mapa = {
            recordatoriosPendientes: [],
            recordatoriosCompletados: [],
            zonasCriticas: [],
            estadisticasPorZona: {}
        };

        this.recordatorios.forEach(r => {
            if (!r.ubicacion) return;
            
            const zona = this.determinarZona(r.ubicacion);
            if (!mapa.estadisticasPorZona[zona]) {
                mapa.estadisticasPorZona[zona] = {
                    pendientes: 0,
                    completados: 0,
                    prioridadAlta: 0,
                    costoTotal: 0
                };
            }

            const stats = mapa.estadisticasPorZona[zona];
            if (r.estado === 'pendiente') {
                stats.pendientes++;
                mapa.recordatoriosPendientes.push({
                    ...r,
                    zona: zona
                });
            } else if (r.estado === 'completado') {
                stats.completados++;
                mapa.recordatoriosCompletados.push({
                    ...r,
                    zona: zona
                });
            }

            if (r.prioridad === 'alta') stats.prioridadAlta++;
            stats.costoTotal += r.costoEstimado;
        });

        // Identificar zonas críticas
        mapa.zonasCriticas = Object.entries(mapa.estadisticasPorZona)
            .filter(([zona, stats]) => stats.prioridadAlta > 2 || stats.pendientes > 5)
            .map(([zona, stats]) => ({ zona, ...stats }));

        return mapa;
    }

    // ==================== REPORTES E ANÁLISIS ====================
    generarReporteProductividad(periodo = 30) {
        const fechaInicio = new Date(Date.now() - (periodo * 24 * 60 * 60 * 1000));
        const recordatoriosPeriodo = this.recordatorios.filter(r => 
            r.fechaCreacion >= fechaInicio
        );

        const reporte = {
            resumen: {
                totalRecordatorios: recordatoriosPeriodo.length,
                completados: recordatoriosPeriodo.filter(r => r.estado === 'completado').length,
                pendientes: recordatoriosPeriodo.filter(r => r.estado === 'pendiente').length,
                vencidos: recordatoriosPeriodo.filter(r => 
                    r.estado === 'pendiente' && r.fechaVencimiento < new Date()
                ).length
            },
            productividad: {
                tasaComplecion: 0,
                tiempoPromedioComplecion: 0,
                eficienciaPorCategoria: {},
                tendencia: this.calcularTendenciaProductividad(recordatoriosPeriodo)
            },
            impactoEconomico: {
                costoPresupuestado: recordatoriosPeriodo.reduce((sum, r) => sum + r.costoEstimado, 0),
                costoReal: recordatoriosPeriodo
                    .filter(r => r.estado === 'completado')
                    .reduce((sum, r) => sum + (r.resultados?.costoReal || r.costoEstimado), 0),
                ahorroGenerado: 0
            },
            recomendacionesIA: this.generarRecomendacionesProductividad(recordatoriosPeriodo)
        };

        // Calcular métricas
        reporte.productividad.tasaComplecion = 
            (reporte.resumen.completados / reporte.resumen.totalRecordatorios) * 100;
        
        reporte.impactoEconomico.ahorroGenerado = 
            reporte.impactoEconomico.costoPresupuestado - reporte.impactoEconomico.costoReal;

        return reporte;
    }

    async exportarDatos(formato = 'json') {
        const datos = {
            recordatorios: this.recordatorios,
            alertas: this.alertasActivas,
            configuracion: this.configuracionNotificaciones,
            estadisticas: this.generarReporteProductividad(),
            metadatos: {
                fechaExportacion: new Date(),
                version: '1.0',
                totalRegistros: this.recordatorios.length
            }
        };

        switch (formato) {
            case 'json':
                return JSON.stringify(datos, null, 2);
            case 'csv':
                return this.convertirACSV(datos.recordatorios);
            case 'excel':
                return await this.convertirAExcel(datos);
            default:
                return datos;
        }
    }

    // ==================== SINCRONIZACIÓN Y OFFLINE ====================
    async sincronizarDatos() {
        if (!navigator.onLine) return;

        try {
            // Sincronizar recordatorios pendientes
            const pendientes = this.recordatorios.filter(r => !r.sincronizado);
            for (const recordatorio of pendientes) {
                await this.sincronizarConFirebase(recordatorio);
                recordatorio.sincronizado = true;
                await this.guardarOffline('recordatorios', recordatorio);
            }

            // Descargar actualizaciones
            const datosFirebase = await this.obtenerDatosFirebase();
            await this.actualizarDatosLocales(datosFirebase);

            this.mostrarNotificacion('Recordatorios sincronizados', 'success');
        } catch (error) {
            console.error('Error en sincronización:', error);
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
            this.configurarNotificacionesUI();
        });

        // Escuchar eventos de notificaciones
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.action === 'notificationClick') {
                    this.manejarClickNotificacion(event.data);
                }
            });
        }

        // Monitorear conectividad
        window.addEventListener('online', () => this.sincronizarDatos());
        window.addEventListener('offline', () => this.modoOffline());
    }

    actualizarUI() {
        this.actualizarListaRecordatorios();
        this.actualizarContadorAlertas();
        this.actualizarCalendario();
        this.actualizarEstadisticas();
    }

    actualizarListaRecordatorios() {
        const contenedor = document.getElementById('listaRecordatorios');
        if (!contenedor) return;

        const recordatoriosOrdenados = this.recordatorios
            .sort((a, b) => {
                if (a.prioridad !== b.prioridad) {
                    const prioridades = { 'alta': 3, 'media': 2, 'baja': 1 };
                    return prioridades[b.prioridad] - prioridades[a.prioridad];
                }
                return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento);
            });

        contenedor.innerHTML = recordatoriosOrdenados.map(r => `
            <div class="recordatorio-card ${r.estado} ${r.prioridad}" data-id="${r.id}">
                <div class="recordatorio-header">
                    <h4>${r.titulo}</h4>
                    <div class="recordatorio-meta">
                        <span class="categoria">${r.categoria}</span>
                        <span class="prioridad ${r.prioridad}">${r.prioridad}</span>
                    </div>
                </div>
                <div class="recordatorio-body">
                    <p>${r.descripcion}</p>
                    <div class="fechas">
                        <span class="vencimiento">
                            <i class="fas fa-clock"></i>
                            ${this.formatearFecha(r.fechaVencimiento)}
                        </span>
                        ${r.ubicacion ? `
                        <span class="ubicacion">
                            <i class="fas fa-map-marker-alt"></i>
                            GPS: ${r.ubicacion.lat.toFixed(4)}, ${r.ubicacion.lng.toFixed(4)}
                        </span>
                        ` : ''}
                    </div>
                    ${r.metadatos.creadoPorIA ? `
                    <div class="ia-badge">
                        <i class="fas fa-robot"></i>
                        Sugerido por IA
                    </div>
                    ` : ''}
                </div>
                <div class="recordatorio-actions">
                    ${r.estado === 'pendiente' ? `
                    <button onclick="recordatoriosManager.completarRecordatorio('${r.id}')" class="btn-completar">
                        <i class="fas fa-check"></i> Completar
                    </button>
                    <button onclick="recordatoriosManager.posponer('${r.id}')" class="btn-posponer">
                        <i class="fas fa-clock"></i> Posponer
                    </button>
                    ` : ''}
                    <button onclick="recordatoriosManager.verDetalle('${r.id}')" class="btn-detalle">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button onclick="recordatoriosManager.editar('${r.id}')" class="btn-editar">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ==================== UTILIDADES ====================
    generarId() {
        return 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

    calcularDistancia(coord1, coord2) {
        const R = 6371;
        const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
        const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000;
    }

    determinarZona(coordenadas) {
        const zoneLat = Math.floor(coordenadas.lat * 1000) / 1000;
        const zoneLng = Math.floor(coordenadas.lng * 1000) / 1000;
        return `zona_${zoneLat}_${zoneLng}`;
    }

    mostrarNotificacion(mensaje, tipo) {
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
        // Implementar sistema de notificaciones UI
    }

    async iniciarMonitoreo() {
        // Verificar recordatorios cada 5 minutos
        setInterval(() => {
            this.verificarRecordatoriosVencidos();
            this.crearRecordatoriosInteligentes();
        }, 5 * 60 * 1000);

        // Sincronizar cada 30 minutos
        setInterval(() => {
            if (navigator.onLine) {
                this.sincronizarDatos();
            }
        }, 30 * 60 * 1000);
    }

    async cargarRecordatorios() {
        try {
            this.recordatorios = await this.cargarDatosOffline('recordatorios') || [];
            if (navigator.onLine) {
                await this.sincronizarDatos();
            }
        } catch (error) {
            console.error('Error cargando recordatorios:', error);
        }
    }
}

// Inicializar el manager
const recordatoriosManager = new RecordatoriosManager();