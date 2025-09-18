/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE NEGOCIOS
   Sistema integrado con ventas y clientes
   ======================================== */

// ==========================================
// CLASE PRINCIPAL DE NEGOCIOS
// ==========================================

class NegociosManager {
    constructor() {
        this.negocios = new Map();
        this.actividades = new Map();
        this.clientesRecientes = [];
        this.filtrosActivos = {
            estado: '',
            cliente: '',
            fechaDesde: '',
            fechaHasta: ''
        };
        
        this.estadisticas = {
            ventasTotales: 0,
            negociosActivos: 0,
            clientesActivos: 0,
            tasaConversion: 0,
            cambioVentas: 0,
            cambioNegocios: 0,
            cambioClientes: 0,
            cambioConversion: 0
        };

        this.init();
    }

    async init() {
        try {
            console.log('🎯 Inicializando NegociosManager...');
            
            await this.waitForIntegrations();
            await this.cargarDatos();
            
            this.setupSyncListeners();
            
            console.log('✅ NegociosManager inicializado');
            
        } catch (error) {
            console.error('⚠️ Error inicializando NegociosManager:', error);
            this.generarDatosEjemplo();
        }
    }

    async waitForIntegrations() {
        const maxWait = 15000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            if (window.clientesManager) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('🔗 Integraciones de negocios detectadas');
    }

    setupSyncListeners() {
        // Escuchar cambios de clientes
        window.addEventListener('clienteCreated', (event) => {
            this.onClienteUpdated(event.detail.cliente, 'created');
        });

        window.addEventListener('clienteUpdated', (event) => {
            this.onClienteUpdated(event.detail.cliente, 'updated');
        });

        // Escuchar cambios de ventas
        window.addEventListener('ventaCreated', (event) => {
            this.onVentaCreada(event.detail.venta);
        });
    }

    // ==========================================
    // GESTIÓN DE NEGOCIOS
    // ==========================================

    async guardarNegocio(datos) {
        try {
            const negocioId = datos.id || this.generateId();
            const fechaActual = new Date();
            
            // Validar cliente
            if (window.clientesManager && datos.clienteId) {
                const cliente = window.clientesManager.obtenerCliente(datos.clienteId);
                if (!cliente) {
                    throw new Error('Cliente no válido');
                }
            }
            
            const negocio = {
                id: negocioId,
                nombre: datos.nombre,
                clienteId: datos.clienteId,
                cliente: datos.cliente || await this.getNombreCliente(datos.clienteId),
                valor: datos.valor,
                estado: datos.estado || 'prospecto',
                fechaCierre: datos.fechaCierre,
                descripcion: datos.descripcion || '',
                probabilidad: datos.probabilidad || 75,
                cantidadEstimada: datos.cantidadEstimada || 0,
                productos: datos.productos || '',
                notas: datos.notas || '',
                fechaCreacion: datos.id ? undefined : fechaActual.toISOString(),
                fechaModificacion: fechaActual.toISOString(),
                usuarioId: this.getCurrentUserId(),
                progreso: this.calcularProgreso(datos.estado),
                diasDesdeCreacion: datos.id ? this.calcularDias(datos.fechaCreacion) : 0
            };
            
            this.negocios.set(negocioId, negocio);
            
            // Guardar en Firebase si está disponible
            if (window.db && window.firebase) {
                await this.sincronizarNegocioConFirebase(negocioId, negocio);
            }
            
            // Guardar offline
            if (window.offlineManager) {
                await window.offlineManager.saveData('negocios', negocioId, negocio);
            }
            
            // Actualizar métricas del cliente
            if (window.clientesManager && datos.clienteId) {
                await window.clientesManager.actualizarMetricasNegocio(datos.clienteId, datos.valor, datos.estado);
            }
            
            this.calcularEstadisticas();
            this.broadcastUpdate('negocio_creado', negocio);
            
            return negocio;
            
        } catch (error) {
            console.error('Error guardando negocio:', error);
            throw error;
        }
    }

    async avanzarEtapa(negocioId) {
        try {
            const negocio = this.negocios.get(negocioId);
            if (!negocio) {
                throw new Error('Negocio no encontrado');
            }

            const etapas = ['prospecto', 'calificado', 'propuesta', 'negociacion', 'cerrado'];
            const etapaActual = etapas.indexOf(negocio.estado);
            
            if (etapaActual < etapas.length - 1) {
                negocio.estado = etapas[etapaActual + 1];
                negocio.progreso = this.calcularProgreso(negocio.estado);
                negocio.fechaModificacion = new Date().toISOString();
                
                // Si se cierra el negocio, crear venta automáticamente
                if (negocio.estado === 'cerrado' && negocio.cantidadEstimada > 0) {
                    await this.convertirAVenta(negocio);
                }
                
                this.negocios.set(negocioId, negocio);
                
                // Sincronizar cambios
                if (window.db) {
                    await this.sincronizarNegocioConFirebase(negocioId, negocio);
                }
                
                this.calcularEstadisticas();
                this.broadcastUpdate('negocio_actualizado', negocio);
                
                // Registrar actividad
                await this.registrarActividad(negocioId, `Negocio avanzado a ${negocio.estado}`);
            }
            
        } catch (error) {
            console.error('Error avanzando etapa:', error);
            throw error;
        }
    }

    async convertirAVenta(negocio) {
        try {
            if (window.ventasManager) {
                const datosVenta = {
                    fecha: new Date().toISOString().split('T')[0],
                    clienteId: negocio.clienteId,
                    cliente: negocio.cliente,
                    cantidad: negocio.cantidadEstimada,
                    precioKg: negocio.valor / negocio.cantidadEstimada,
                    metodoPago: 'transferencia',
                    observaciones: `Venta generada desde negocio: ${negocio.nombre}`,
                    negocioId: negocio.id
                };
                
                await window.ventasManager.registrarVenta(datosVenta);
                console.log('✅ Negocio convertido a venta automáticamente');
            }
        } catch (error) {
            console.error('Error convirtiendo negocio a venta:', error);
        }
    }

    async registrarActividad(negocioId, descripcion, tipo = 'nota') {
        try {
            const actividadId = this.generateId();
            const actividad = {
                id: actividadId,
                negocioId: negocioId,
                descripcion: descripcion,
                tipo: tipo,
                fecha: new Date().toISOString(),
                usuarioId: this.getCurrentUserId(),
                tiempoRelativo: 'Ahora mismo'
            };
            
            if (!this.actividades.has(negocioId)) {
                this.actividades.set(negocioId, []);
            }
            
            this.actividades.get(negocioId).push(actividad);
            
            // Mantener solo las últimas 10 actividades por negocio
            if (this.actividades.get(negocioId).length > 10) {
                this.actividades.get(negocioId).shift();
            }
            
        } catch (error) {
            console.error('Error registrando actividad:', error);
        }
    }

    // ==========================================
    // OBTENCIÓN DE DATOS
    // ==========================================

    obtenerMetricas() {
        this.calcularEstadisticas();
        return this.estadisticas;
    }

    obtenerNegociosFiltrados(filtros = {}) {
        let negocios = Array.from(this.negocios.values());
        
        if (filtros.estado) {
            negocios = negocios.filter(n => n.estado === filtros.estado);
        }
        
        if (filtros.cliente) {
            negocios = negocios.filter(n => n.clienteId === filtros.cliente);
        }
        
        return negocios.sort((a, b) => new Date(b.fechaModificacion) - new Date(a.fechaModificacion));
    }

    obtenerPipelineVisual() {
        const etapas = [
            { nombre: 'Prospectos', clase: 'prospectos', color: '#3b82f6', icono: 'fa-eye' },
            { nombre: 'Calificados', clase: 'calificados', color: '#8b5cf6', icono: 'fa-star' },
            { nombre: 'Propuestas', clase: 'propuestas', color: '#f59e0b', icono: 'fa-file-alt' },
            { nombre: 'Negociación', clase: 'negociacion', color: '#ef4444', icono: 'fa-handshake' },
            { nombre: 'Cerrados', clase: 'cerrados', color: '#22c55e', icono: 'fa-check-circle' }
        ];
        
        return etapas.map(etapa => {
            const negociosEtapa = Array.from(this.negocios.values())
                .filter(n => n.estado === etapa.clase.replace('s', ''));
            
            return {
                ...etapa,
                cantidad: negociosEtapa.length,
                valor: negociosEtapa.reduce((sum, n) => sum + n.valor, 0)
            };
        });
    }

    obtenerClientesRecientes() {
        if (window.clientesManager) {
            return window.clientesManager.obtenerTodos()
                .slice(0, 5)
                .map(cliente => ({
                    id: cliente.id,
                    nombre: cliente.nombre,
                    empresa: cliente.empresa || cliente.nombre,
                    valorTotal: cliente.totalVentas || 0
                }));
        }
        
        return this.clientesRecientes;
    }

    obtenerActividadesRecientes() {
        const todasActividades = [];
        
        this.actividades.forEach(actividades => {
            todasActividades.push(...actividades);
        });
        
        return todasActividades
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 5)
            .map(actividad => ({
                ...actividad,
                tiempoRelativo: this.calcularTiempoRelativo(actividad.fecha)
            }));
    }

    obtenerListaClientes() {
        if (window.clientesManager) {
            return window.clientesManager.obtenerParaSelectores();
        }
        
        // Fallback: extraer clientes únicos de negocios
        const clientesUnicos = new Map();
        Array.from(this.negocios.values()).forEach(negocio => {
            if (negocio.clienteId && !clientesUnicos.has(negocio.clienteId)) {
                clientesUnicos.set(negocio.clienteId, {
                    id: negocio.clienteId,
                    nombre: negocio.cliente,
                    displayName: negocio.cliente
                });
            }
        });
        
        return Array.from(clientesUnicos.values());
    }

    obtenerNegocio(id) {
        return this.negocios.get(id) || null;
    }

    // ==========================================
    // CÁLCULOS Y ESTADÍSTICAS
    // ==========================================

    calcularEstadisticas() {
        const negociosArray = Array.from(this.negocios.values());
        const negociosActivos = negociosArray.filter(n => n.estado !== 'cerrado');
        const negociosCerrados = negociosArray.filter(n => n.estado === 'cerrado');
        
        this.estadisticas.ventasTotales = negociosCerrados.reduce((sum, n) => sum + n.valor, 0);
        this.estadisticas.negociosActivos = negociosActivos.length;
        this.estadisticas.tasaConversion = negociosArray.length > 0 
            ? Math.round((negociosCerrados.length / negociosArray.length) * 100)
            : 0;
        
        if (window.clientesManager) {
            this.estadisticas.clientesActivos = window.clientesManager.obtenerTodos().length;
        }
        
        // Calcular cambios (simulados por ahora)
        this.estadisticas.cambioVentas = 15;
        this.estadisticas.cambioNegocios = 3;
        this.estadisticas.cambioClientes = 2;
        this.estadisticas.cambioConversion = 5;
    }

    calcularProgreso(estado) {
        const progresos = {
            'prospecto': 20,
            'calificado': 40,
            'propuesta': 60,
            'negociacion': 80,
            'cerrado': 100
        };
        
        return progresos[estado] || 0;
    }

    calcularDias(fechaCreacion) {
        if (!fechaCreacion) return 0;
        const hoy = new Date();
        const creacion = new Date(fechaCreacion);
        return Math.floor((hoy - creacion) / (1000 * 60 * 60 * 24));
    }

    calcularTiempoRelativo(fecha) {
        const ahora = new Date();
        const fechaActividad = new Date(fecha);
        const diff = ahora - fechaActividad;
        
        const minutos = Math.floor(diff / 60000);
        const horas = Math.floor(diff / 3600000);
        const dias = Math.floor(diff / 86400000);
        
        if (minutos < 1) return 'Ahora mismo';
        if (minutos < 60) return `Hace ${minutos} min`;
        if (horas < 24) return `Hace ${horas}h`;
        return `Hace ${dias}d`;
    }

    // ==========================================
    // INTEGRACIÓN CON OTROS MÓDULOS
    // ==========================================

    aplicarFiltros(filtros) {
        this.filtrosActivos = { ...this.filtrosActivos, ...filtros };
    }

    onClienteUpdated(cliente, accion) {
        console.log(`🔄 Cliente ${accion} en negocios:`, cliente.nombre);
        
        // Actualizar negocios relacionados
        Array.from(this.negocios.values()).forEach(negocio => {
            if (negocio.clienteId === cliente.id) {
                negocio.cliente = cliente.nombre;
                this.negocios.set(negocio.id, negocio);
            }
        });
    }

    onVentaCreada(venta) {
        console.log('💰 Venta creada desde negocios:', venta);
        
        // Si la venta tiene negocioId, actualizar el negocio
        if (venta.negocioId) {
            const negocio = this.negocios.get(venta.negocioId);
            if (negocio) {
                negocio.estado = 'cerrado';
                negocio.progreso = 100;
                this.negocios.set(venta.negocioId, negocio);
            }
        }
    }

    async sincronizarCliente(cliente, accion) {
        this.onClienteUpdated(cliente, accion);
    }

    // ==========================================
    // FUNCIONES DE INTERFAZ
    // ==========================================

    mostrarModalActividad(negocioId) {
        // Esta función se puede expandir para mostrar un modal de actividades
        console.log('📝 Mostrando modal de actividad para negocio:', negocioId);
        
        if (window.notificationManager) {
            window.notificationManager.info('Modal de actividades en desarrollo');
        }
    }

    mostrarDetalle(negocioId) {
        const negocio = this.negocios.get(negocioId);
        if (negocio) {
            console.log('👁️ Mostrando detalle de negocio:', negocio);
            // Aquí podrías implementar un modal de detalle
        }
    }

    mostrarDetalleCliente(clienteId) {
        if (window.clientesManager) {
            const cliente = window.clientesManager.obtenerCliente(clienteId);
            console.log('👤 Mostrando detalle de cliente:', cliente);
        }
    }

    mostrarModalCliente() {
        console.log('👥 Mostrando modal de nuevo cliente');
        if (window.clientesManager) {
            // Aquí podrías implementar la creación de cliente desde negocios
        }
    }

    generarReporte() {
        console.log('📊 Generando reporte de negocios...');
        
        const reporte = {
            fecha: new Date().toISOString(),
            negocios: Array.from(this.negocios.values()),
            estadisticas: this.estadisticas,
            pipeline: this.obtenerPipelineVisual()
        };
        
        // Aquí podrías implementar la exportación del reporte
        console.log('Reporte generado:', reporte);
        
        if (window.notificationManager) {
            window.notificationManager.success('Reporte generado correctamente');
        }
    }

    // ==========================================
    // PERSISTENCIA
    // ==========================================

    async cargarDatos() {
        try {
            if (window.db && window.firebase) {
                await this.loadFromFirebase();
            } else if (window.offlineManager) {
                await this.loadFromOffline();
            } else {
                this.generarDatosEjemplo();
            }
            
            this.calcularEstadisticas();
            
        } catch (error) {
            console.error('Error cargando datos de negocios:', error);
            this.generarDatosEjemplo();
        }
    }

    async loadFromFirebase() {
        try {
            const userId = this.getCurrentUserId();
            const negociosSnapshot = await window.db.collection('negocios')
                .where('usuarioId', '==', userId)
                .limit(100)
                .get();
            
            negociosSnapshot.forEach(doc => {
                const negocio = doc.data();
                this.negocios.set(doc.id, {
                    id: doc.id,
                    ...negocio,
                    progreso: this.calcularProgreso(negocio.estado),
                    diasDesdeCreacion: this.calcularDias(negocio.fechaCreacion)
                });
            });
            
            console.log(`Negocios cargados desde Firebase: ${this.negocios.size}`);
            
        } catch (error) {
            console.error('Error cargando desde Firebase:', error);
            throw error;
        }
    }

    async loadFromOffline() {
        try {
            const negociosData = await window.offlineManager.getAllData('negocios');
            negociosData.forEach(item => {
                this.negocios.set(item.id, item.data);
            });
            
            console.log(`Negocios cargados desde offline: ${this.negocios.size}`);
            
        } catch (error) {
            console.error('Error cargando desde offline:', error);
            throw error;
        }
    }

    async sincronizarNegocioConFirebase(negocioId, negocio) {
        try {
            if (!window.db) return;
            
            await window.db.collection('negocios').doc(negocioId).set({
                nombre: negocio.nombre,
                clienteId: negocio.clienteId,
                cliente: negocio.cliente,
                valor: negocio.valor,
                estado: negocio.estado,
                fechaCierre: negocio.fechaCierre,
                descripcion: negocio.descripcion,
                probabilidad: negocio.probabilidad,
                cantidadEstimada: negocio.cantidadEstimada,
                productos: negocio.productos,
                notas: negocio.notas,
                fechaCreacion: negocio.fechaCreacion ? window.firebase.firestore.Timestamp.fromDate(new Date(negocio.fechaCreacion)) : null,
                fechaModificacion: window.firebase.firestore.Timestamp.fromDate(new Date(negocio.fechaModificacion)),
                usuarioId: negocio.usuarioId
            });
            
            console.log(`Negocio ${negocioId} sincronizado con Firebase`);
            
        } catch (error) {
            console.error(`Error sincronizando negocio ${negocioId}:`, error);
        }
    }

    // ==========================================
    // DATOS DE EJEMPLO
    // ==========================================

    generarDatosEjemplo() {
        console.log('Generando datos de ejemplo para negocios...');
        
        const clientesEjemplo = [
            { id: 'CLI_001', nombre: 'María González', empresa: 'Exportadora Maya' },
            { id: 'CLI_002', nombre: 'Carlos Ruiz', empresa: 'Supermercados Paiz' },
            { id: 'CLI_003', nombre: 'Ana López', empresa: 'Alimentos La Pradera' }
        ];
        
        const negociosEjemplo = [
            {
                id: 'NEG_001',
                nombre: 'Suministro Aguacates Premium',
                clienteId: 'CLI_001',
                cliente: 'María González',
                valor: 25000,
                estado: 'negociacion',
                fechaCierre: '2024-02-15',
                descripcion: 'Suministro mensual de aguacates premium para exportación',
                probabilidad: 85,
                cantidadEstimada: 2000,
                productos: 'Aguacates Hass Premium',
                fechaCreacion: '2024-01-15T10:00:00Z',
                fechaModificacion: new Date().toISOString(),
                usuarioId: 'user123'
            },
            {
                id: 'NEG_002',
                nombre: 'Contrato Supermercados',
                clienteId: 'CLI_002',
                cliente: 'Carlos Ruiz',
                valor: 18000,
                estado: 'propuesta',
                fechaCierre: '2024-02-20',
                descripción: 'Contrato de suministro para cadena de supermercados',
                probabilidad: 70,
                cantidadEstimada: 1500,
                productos: 'Aguacates variados',
                fechaCreacion: '2024-01-20T14:30:00Z',
                fechaModificacion: new Date().toISOString(),
                usuarioId: 'user123'
            }
        ];
        
        negociosEjemplo.forEach(negocio => {
            negocio.progreso = this.calcularProgreso(negocio.estado);
            negocio.diasDesdeCreacion = this.calcularDias(negocio.fechaCreacion);
            this.negocios.set(negocio.id, negocio);
        });
        
        // Generar actividades de ejemplo
        this.actividades.set('NEG_001', [
            {
                id: 'ACT_001',
                negocioId: 'NEG_001',
                descripcion: 'Llamada telefónica con el cliente',
                tipo: 'llamada',
                fecha: new Date(Date.now() - 3600000).toISOString(),
                tiempoRelativo: 'Hace 1h'
            }
        ]);
        
        this.clientesRecientes = clientesEjemplo;
        this.calcularEstadisticas();
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    getCurrentUserId() {
        if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
            return window.firebase.auth().currentUser.uid;
        }
        return 'anonymous_user';
    }

    async getNombreCliente(clienteId) {
        if (window.clientesManager) {
            const cliente = window.clientesManager.obtenerCliente(clienteId);
            return cliente ? cliente.nombre : 'Cliente desconocido';
        }
        return 'Cliente desconocido';
    }

    broadcastUpdate(evento, datos) {
        window.dispatchEvent(new CustomEvent('negociosUpdate', {
            detail: { evento, datos, timestamp: Date.now() }
        }));
        
        // También disparar evento específico
        window.dispatchEvent(new CustomEvent(evento, {
            detail: { negocio: datos, timestamp: Date.now() }
        }));
    }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Crear instancia global
let negociosManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    negociosManager = new NegociosManager();
    window.negociosManager = negociosManager;
    
    console.log('🎯 NegociosManager disponible globalmente');
});

// Funciones globales para compatibilidad
window.crearNegocio = function(datos) {
    return window.negociosManager?.guardarNegocio(datos);
};

window.obtenerNegocio = function(id) {
    return window.negociosManager?.obtenerNegocio(id);
};

window.avanzarEtapaNegocio = function(id) {
    return window.negociosManager?.avanzarEtapa(id);
};

// Exportar para otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NegociosManager };
}
