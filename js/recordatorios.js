/* ========================================
   RECORDATORIOS MANAGER - FINCA LA HERRADURA
   Sistema completo con todos los métodos implementados
   ======================================== */

class RecordatoriosManager {
    constructor() {
        this.recordatorios = [];
        this.alertasActivas = [];
        this.configuracionNotificaciones = {
            push: false,
            email: false,
            anticipacion: [24, 2] // horas antes
        };
        this.filtrosActivos = {};
        this.vistaActual = 'tarjetas';
        this.initialized = false;
        
        console.log('🔔 Inicializando RecordatoriosManager...');
        this.init();
    }

    async init() {
        try {
            await this.cargarConfiguracion();
            await this.cargarRecordatorios();
            this.configurarNotificaciones();
            this.configurarEventListeners();
            this.initialized = true;
            console.log('✅ RecordatoriosManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando RecordatoriosManager:', error);
        }
    }

    // ===========================================
    // MÉTODOS FALTANTES IMPLEMENTADOS
    // ===========================================

    async cargarConfiguracion() {
        try {
            // Cargar configuración desde localStorage o valores por defecto
            const configGuardada = localStorage.getItem('recordatorios_config');
            if (configGuardada) {
                this.configuracionNotificaciones = {
                    ...this.configuracionNotificaciones,
                    ...JSON.parse(configGuardada)
                };
            }
            console.log('⚙️ Configuración cargada:', this.configuracionNotificaciones);
        } catch (error) {
            console.warn('⚠️ Error cargando configuración, usando valores por defecto');
        }
    }

    async cargarRecordatorios() {
        try {
            // Intentar cargar desde IndexedDB primero
            const recordatoriosLocales = await this.cargarDatosOffline('recordatorios');
            if (recordatoriosLocales && recordatoriosLocales.length > 0) {
                this.recordatorios = recordatoriosLocales;
                console.log(`📋 Cargados ${this.recordatorios.length} recordatorios desde cache local`);
            }

            // Si hay conexión, sincronizar con Firebase
            if (navigator.onLine && window.db) {
                await this.sincronizarConFirebase();
            }

            // Si no hay recordatorios, crear algunos de ejemplo
            if (this.recordatorios.length === 0) {
                await this.crearRecordatoriosEjemplo();
            }

        } catch (error) {
            console.error('❌ Error cargando recordatorios:', error);
            // Crear recordatorios de ejemplo si hay error
            await this.crearRecordatoriosEjemplo();
        }
    }

    async crearRecordatoriosEjemplo() {
        const ejemplos = [
            {
                titulo: 'Riego matutino sector A',
                descripcion: 'Riego programado para los árboles del sector A, revisar presión del agua',
                categoria: 'riego',
                prioridad: 'alta',
                fechaVencimiento: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
                ubicacion: 'Sector A - Árboles 1-50'
            },
            {
                titulo: 'Aplicación de fertilizante',
                descripcion: 'Aplicar fertilizante orgánico en sector B según cronograma',
                categoria: 'fertilizacion',
                prioridad: 'media',
                fechaVencimiento: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 día
                ubicacion: 'Sector B'
            },
            {
                titulo: 'Poda de limpieza',
                descripcion: 'Realizar poda de limpieza en árboles identificados',
                categoria: 'poda',
                prioridad: 'baja',
                fechaVencimiento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
                ubicacion: 'Múltiples sectores'
            },
            {
                titulo: 'Cosecha programada',
                descripcion: 'Cosecha de limones en punto óptimo de maduración',
                categoria: 'cosecha',
                prioridad: 'alta',
                fechaVencimiento: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 horas
                ubicacion: 'Sector C'
            },
            {
                titulo: 'Mantenimiento de bomba de agua',
                descripcion: 'Revisión mensual del sistema de bombeo',
                categoria: 'mantenimiento',
                prioridad: 'media',
                fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
                ubicacion: 'Casa de bombas'
            }
        ];

        for (const ejemplo of ejemplos) {
            await this.crearRecordatorio(ejemplo);
        }

        console.log('📝 Recordatorios de ejemplo creados');
    }

    async crearRecordatorio(datos) {
        const recordatorio = {
            id: this.generarId(),
            titulo: datos.titulo,
            descripcion: datos.descripcion,
            categoria: datos.categoria,
            prioridad: datos.prioridad,
            fechaCreacion: new Date(),
            fechaVencimiento: new Date(datos.fechaVencimiento),
            ubicacion: datos.ubicacion || '',
            estado: 'pendiente',
            notificaciones: datos.notificaciones || this.configuracionNotificaciones,
            repetir: datos.repetir || '',
            notas: datos.notas || '',
            sincronizado: false
        };

        this.recordatorios.push(recordatorio);
        await this.guardarOffline('recordatorios', recordatorio);
        
        if (navigator.onLine && window.db) {
            await this.sincronizarRecordatorioConFirebase(recordatorio);
        }

        console.log('✅ Recordatorio creado:', recordatorio.titulo);
        return recordatorio;
    }

    async guardarRecordatorio(datos) {
        if (datos.id) {
            // Actualizar existente
            const index = this.recordatorios.findIndex(r => r.id === datos.id);
            if (index !== -1) {
                this.recordatorios[index] = { ...this.recordatorios[index], ...datos };
                await this.guardarOffline('recordatorios', this.recordatorios[index]);
            }
        } else {
            // Crear nuevo
            await this.crearRecordatorio(datos);
        }
    }

    async completarRecordatorio(id) {
        const recordatorio = this.recordatorios.find(r => r.id === id);
        if (recordatorio) {
            recordatorio.estado = 'completado';
            recordatorio.fechaComplecion = new Date();
            await this.guardarOffline('recordatorios', recordatorio);
            console.log('✅ Recordatorio completado:', recordatorio.titulo);
        }
    }

    async eliminarRecordatorio(id) {
        const index = this.recordatorios.findIndex(r => r.id === id);
        if (index !== -1) {
            const recordatorio = this.recordatorios[index];
            this.recordatorios.splice(index, 1);
            await this.eliminarDatosOffline('recordatorios', id);
            console.log('🗑️ Recordatorio eliminado:', recordatorio.titulo);
        }
    }

    async posponerRecordatorio(id, nuevaFecha) {
        const recordatorio = this.recordatorios.find(r => r.id === id);
        if (recordatorio) {
            recordatorio.fechaVencimiento = new Date(nuevaFecha);
            await this.guardarOffline('recordatorios', recordatorio);
            console.log('⏰ Recordatorio pospuesto:', recordatorio.titulo);
        }
    }

    // ===========================================
    // GESTIÓN DE DATOS OFFLINE
    // ===========================================

    async guardarOffline(tabla, datos) {
        try {
            if (!window.offlineManager) {
                // Fallback a localStorage
                const key = `${tabla}_${datos.id}`;
                localStorage.setItem(key, JSON.stringify(datos));
                return;
            }

            await window.offlineManager.guardarDatos(tabla, datos);
        } catch (error) {
            console.error('Error guardando offline:', error);
            // Fallback a localStorage
            const key = `${tabla}_${datos.id}`;
            localStorage.setItem(key, JSON.stringify(datos));
        }
    }

    async cargarDatosOffline(tabla) {
        try {
            if (!window.offlineManager) {
                // Fallback desde localStorage
                const keys = Object.keys(localStorage).filter(key => key.startsWith(`${tabla}_`));
                return keys.map(key => JSON.parse(localStorage.getItem(key)));
            }

            return await window.offlineManager.obtenerDatos(tabla);
        } catch (error) {
            console.error('Error cargando datos offline:', error);
            return [];
        }
    }

    async eliminarDatosOffline(tabla, id) {
        try {
            if (!window.offlineManager) {
                localStorage.removeItem(`${tabla}_${id}`);
                return;
            }

            await window.offlineManager.eliminarDatos(tabla, id);
        } catch (error) {
            console.error('Error eliminando datos offline:', error);
            localStorage.removeItem(`${tabla}_${id}`);
        }
    }

    // ===========================================
    // SINCRONIZACIÓN CON FIREBASE
    // ===========================================

    async sincronizarConFirebase() {
        if (!window.db) {
            console.warn('⚠️ Firebase no disponible para sincronización');
            return;
        }

        try {
            // Cargar recordatorios desde Firebase
            const snapshot = await window.db.collection('recordatorios_finca')
                .where('fincaId', '==', 'finca_la_herradura')
                .orderBy('fechaCreacion', 'desc')
                .get();

            const recordatoriosFirebase = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                recordatoriosFirebase.push({
                    id: doc.id,
                    ...data,
                    fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
                    fechaVencimiento: data.fechaVencimiento?.toDate() || new Date()
                });
            });

            // Mergear con datos locales
            this.recordatorios = this.mergearRecordatorios(this.recordatorios, recordatoriosFirebase);
            
            console.log(`🔄 Sincronizados ${recordatoriosFirebase.length} recordatorios desde Firebase`);
        } catch (error) {
            console.error('❌ Error sincronizando con Firebase:', error);
        }
    }

    async sincronizarRecordatorioConFirebase(recordatorio) {
        if (!window.db) return;

        try {
            const docData = {
                ...recordatorio,
                fincaId: 'finca_la_herradura',
                fechaCreacion: firebase.firestore.Timestamp.fromDate(recordatorio.fechaCreacion),
                fechaVencimiento: firebase.firestore.Timestamp.fromDate(recordatorio.fechaVencimiento)
            };

            if (recordatorio.id.startsWith('rec_')) {
                // Nuevo recordatorio
                const docRef = await window.db.collection('recordatorios_finca').add(docData);
                recordatorio.firebaseId = docRef.id;
            } else {
                // Actualizar existente
                await window.db.collection('recordatorios_finca').doc(recordatorio.firebaseId).update(docData);
            }

            recordatorio.sincronizado = true;
            await this.guardarOffline('recordatorios', recordatorio);
        } catch (error) {
            console.error('Error sincronizando recordatorio individual:', error);
        }
    }

    mergearRecordatorios(locales, remotos) {
        const merged = [...locales];
        
        remotos.forEach(remoto => {
            const existeLocal = merged.find(local => 
                local.firebaseId === remoto.id || local.id === remoto.id
            );
            
            if (!existeLocal) {
                merged.push(remoto);
            } else if (remoto.fechaModificacion > existeLocal.fechaModificacion) {
                Object.assign(existeLocal, remoto);
            }
        });

        return merged;
    }

    // ===========================================
    // FILTROS Y BÚSQUEDA
    // ===========================================

    aplicarFiltros(filtros) {
        this.filtrosActivos = filtros;
    }

    obtenerRecordatoriosFiltrados() {
        let filtrados = [...this.recordatorios];

        if (this.filtrosActivos.estado) {
            filtrados = filtrados.filter(r => r.estado === this.filtrosActivos.estado);
        }

        if (this.filtrosActivos.prioridad) {
            filtrados = filtrados.filter(r => r.prioridad === this.filtrosActivos.prioridad);
        }

        if (this.filtrosActivos.categoria) {
            filtrados = filtrados.filter(r => r.categoria === this.filtrosActivos.categoria);
        }

        if (this.filtrosActivos.periodo) {
            const ahora = new Date();
            let filtroFecha;

            switch (this.filtrosActivos.periodo) {
                case 'hoy':
                    filtroFecha = (r) => {
                        const fecha = new Date(r.fechaVencimiento);
                        return fecha.toDateString() === ahora.toDateString();
                    };
                    break;
                case 'semana':
                    filtroFecha = (r) => {
                        const fecha = new Date(r.fechaVencimiento);
                        const unaSemana = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
                        return fecha >= ahora && fecha <= unaSemana;
                    };
                    break;
                case 'mes':
                    filtroFecha = (r) => {
                        const fecha = new Date(r.fechaVencimiento);
                        return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
                    };
                    break;
                default:
                    filtroFecha = () => true;
            }

            filtrados = filtrados.filter(filtroFecha);
        }

        return filtrados;
    }

    // ===========================================
    // ESTADÍSTICAS
    // ===========================================

    obtenerEstadisticasHoy() {
        const hoy = new Date();
        const recordatoriosHoy = this.recordatorios.filter(r => {
            const fecha = new Date(r.fechaVencimiento);
            return fecha.toDateString() === hoy.toDateString();
        });

        const proximos3Dias = new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000);
        const recordatoriosProximos = this.recordatorios.filter(r => {
            const fecha = new Date(r.fechaVencimiento);
            return fecha > hoy && fecha <= proximos3Dias;
        });

        return {
            total: recordatoriosHoy.length,
            pendientes: recordatoriosHoy.filter(r => r.estado === 'pendiente').length,
            completados: recordatoriosHoy.filter(r => r.estado === 'completado').length,
            vencidos: recordatoriosHoy.filter(r => r.estado === 'pendiente' && new Date(r.fechaVencimiento) < hoy).length,
            proximos: recordatoriosProximos.length
        };
    }

    obtenerEstadisticasGenerales() {
        const total = this.recordatorios.length;
        const pendientes = this.recordatorios.filter(r => r.estado === 'pendiente').length;
        const hoy = new Date();
        const completadosHoy = this.recordatorios.filter(r => {
            const fecha = new Date(r.fechaComplecion || 0);
            return r.estado === 'completado' && fecha.toDateString() === hoy.toDateString();
        }).length;

        const proximaSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
        const proximaSemanaCount = this.recordatorios.filter(r => {
            const fecha = new Date(r.fechaVencimiento);
            return fecha > hoy && fecha <= proximaSemana;
        }).length;

        return {
            total,
            pendientes,
            completadosHoy,
            proximaSemana
        };
    }

    obtenerContadoresCategorias() {
        const contadores = {};
        this.recordatorios.forEach(r => {
            contadores[r.categoria] = (contadores[r.categoria] || 0) + 1;
        });
        return contadores;
    }

    // ===========================================
    // UTILIDADES
    // ===========================================

    obtenerRecordatorio(id) {
        return this.recordatorios.find(r => r.id === id);
    }

    cambiarVista(vista) {
        this.vistaActual = vista;
    }

    filtrarPorFecha(fecha) {
        this.filtrosActivos.fechaEspecifica = fecha;
    }

    tieneRecordatorios(año, mes, dia) {
        return this.recordatorios.some(r => {
            const fecha = new Date(r.fechaVencimiento);
            return fecha.getFullYear() === año && 
                   fecha.getMonth() === mes && 
                   fecha.getDate() === dia;
        });
    }

    async sincronizar() {
        await this.sincronizarConFirebase();
    }

    exportarCalendario() {
        const datos = this.recordatorios.map(r => ({
            titulo: r.titulo,
            descripcion: r.descripcion,
            fecha: r.fechaVencimiento,
            categoria: r.categoria
        }));

        const json = JSON.stringify(datos, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `recordatorios_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    configurarNotificaciones() {
        // Solicitar permisos para notificaciones
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                this.configuracionNotificaciones.push = permission === 'granted';
            });
        }
    }

    configurarEventListeners() {
        // Los event listeners se configuran desde el HTML
    }

    generarId() {
        return 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Inicializar manager globalmente
window.recordatoriosManager = new RecordatoriosManager();

console.log('📋 Sistema de recordatorios cargado');
