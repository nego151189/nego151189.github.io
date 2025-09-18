/* ========================================
   FINCA LA HERRADURA - SINCRONIZACIÓN DE DATOS MEJORADA
   Sistema central de integración entre módulos optimizado
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let syncInitialized = false;
let moduleStatus = new Map();
let dataValidationErrors = [];
let syncQueue = [];

// Configuración de sincronización
const syncConfig = {
    autoSync: true,
    syncInterval: 30000, // 30 segundos
    maxRetries: 3,
    validateOnSync: true,
    enableRealTimeSync: true
};

// ==========================================
// GESTOR CENTRAL DE CLIENTES MEJORADO
// ==========================================

class ClientesManagerMejorado {
    constructor() {
        this.clientes = new Map();
        this.clientesByName = new Map();
        this.initialized = false;
        this.eventListeners = new Map();
        this.syncQueue = [];
    }

    async initialize() {
        try {
            console.log('👥 Inicializando gestor central de clientes mejorado...');
            
            // Esperar a que otros sistemas estén listos
            await this.waitForDependencies();
            
            // Cargar clientes desde diferentes fuentes
            await this.sincronizarClientesExistentes();
            
            // Configurar listeners de eventos
            this.setupEventListeners();
            
            this.initialized = true;
            console.log(`✅ ClientesManager mejorado inicializado: ${this.clientes.size} clientes`);
            
            this.broadcastEvent('clientesManagerReady', {
                clientesCount: this.clientes.size,
                features: ['sync', 'validation', 'integration']
            });
            
        } catch (error) {
            console.error('⚠️ Error inicializando ClientesManager mejorado:', error);
        }
    }

    async waitForDependencies() {
        const dependencies = ['firebase', 'offlineManager'];
        const maxWait = 15000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            const available = dependencies.filter(dep => {
                if (dep === 'firebase') return window.firebase && window.db;
                if (dep === 'offlineManager') return window.offlineManager;
                return false;
            });
            
            if (available.length >= 1) break;
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('🔗 Dependencias de ClientesManager disponibles');
    }

    setupEventListeners() {
        // Escuchar eventos de otros módulos
        window.addEventListener('ventaCreated', (event) => {
            this.onVentaCreated(event.detail.venta);
        });

        window.addEventListener('negocio_creado', (event) => {
            this.onNegocioCreated(event.detail.negocio);
        });

        // Configurar sincronización automática
        if (syncConfig.enableRealTimeSync) {
            setInterval(() => {
                this.processSyncQueue();
            }, syncConfig.syncInterval);
        }
    }

    async sincronizarClientesExistentes() {
        const clientesUnificados = new Map();
        
        try {
            // Cargar desde Firebase si está disponible
            if (window.db && window.firebase) {
                await this.loadClientesFromFirebase(clientesUnificados);
            }
            
            // Cargar desde almacenamiento offline
            if (window.offlineManager) {
                await this.loadClientesFromOffline(clientesUnificados);
            }
            
            // Si no hay datos, usar datos por defecto
            if (clientesUnificados.size === 0) {
                this.loadClientesDefecto(clientesUnificados);
            }
            
            this.clientes = clientesUnificados;
            this.actualizarIndicePorNombre();
            
        } catch (error) {
            console.error('Error sincronizando clientes existentes:', error);
            this.loadClientesDefecto(clientesUnificados);
            this.clientes = clientesUnificados;
            this.actualizarIndicePorNombre();
        }
    }

    async loadClientesFromFirebase(clientesMap) {
        try {
            const user = window.firebase.auth().currentUser;
            if (!user) return;

            const clientesSnapshot = await window.db.collection('clientes')
                .where('usuarioId', '==', user.uid)
                .get();

            clientesSnapshot.forEach(doc => {
                const cliente = this.normalizarCliente({
                    id: doc.id,
                    ...doc.data()
                }, 'firebase');
                
                clientesMap.set(cliente.id, cliente);
            });

            console.log(`Clientes cargados desde Firebase: ${clientesSnapshot.size}`);
        } catch (error) {
            console.error('Error cargando clientes desde Firebase:', error);
        }
    }

    async loadClientesFromOffline(clientesMap) {
        try {
            const clientesData = await window.offlineManager.getAllData('clientes');
            
            clientesData.forEach(item => {
                const cliente = this.normalizarCliente(item.data, 'offline');
                
                // Solo agregar si no existe ya (Firebase tiene prioridad)
                if (!clientesMap.has(cliente.id)) {
                    clientesMap.set(cliente.id, cliente);
                }
            });

            console.log(`Clientes adicionales desde offline: ${clientesData.length}`);
        } catch (error) {
            console.error('Error cargando clientes desde offline:', error);
        }
    }

    loadClientesDefecto(clientesMap) {
        const clientesDefecto = [
            {
                id: 'CLI_001',
                nombre: 'María González',
                empresa: 'Exportadora Maya',
                telefono: '+502 2345-6789',
                email: 'maria@exportadoramaya.com',
                direccion: 'Zona 10, Guatemala',
                tipo: 'exportador',
                credito: 50000,
                descuento: 5,
                activo: true,
                fechaRegistro: '2024-01-15',
                totalVentas: 150000,
                totalNegocios: 2,
                ultimaCompra: '2024-12-28',
                calificacion: 'AAA'
            },
            {
                id: 'CLI_002', 
                nombre: 'Carlos Ruiz',
                empresa: 'Supermercados Paiz',
                telefono: '+502 3456-7890',
                email: 'carlos@paiz.com.gt',
                direccion: 'Zona 11, Guatemala',
                tipo: 'minorista',
                credito: 25000,
                descuento: 3,
                activo: true,
                fechaRegistro: '2024-02-10',
                totalVentas: 85000,
                totalNegocios: 1,
                ultimaCompra: '2024-12-25',
                calificacion: 'AA'
            },
            {
                id: 'CLI_003',
                nombre: 'Ana López',
                empresa: 'Alimentos La Pradera',
                telefono: '+502 4567-8901',
                email: 'ana@lapradera.com',
                direccion: 'Zona 4, Guatemala',
                tipo: 'procesador',
                credito: 75000,
                descuento: 8,
                activo: true,
                fechaRegistro: '2024-01-20',
                totalVentas: 200000,
                totalNegocios: 3,
                ultimaCompra: '2024-12-30',
                calificacion: 'AAA'
            },
            {
                id: 'CLI_004',
                nombre: 'Roberto Mendoza',
                empresa: 'Distribuidora López',
                telefono: '+502 5678-9012',
                email: 'roberto@distlopez.com',
                direccion: 'Villa Nueva, Guatemala',
                tipo: 'distribuidor',
                credito: 30000,
                descuento: 4,
                activo: true,
                fechaRegistro: '2024-03-05',
                totalVentas: 120000,
                totalNegocios: 2,
                ultimaCompra: '2024-12-20',
                calificacion: 'AA'
            },
            {
                id: 'CLI_005',
                nombre: 'Laura Castillo',
                empresa: 'Mercado San Juan',
                telefono: '+502 6789-0123',
                email: 'laura@mercadosanjuan.com',
                direccion: 'Mixco, Guatemala',
                tipo: 'mayorista',
                credito: 40000,
                descuento: 6,
                activo: true,
                fechaRegistro: '2024-02-28',
                totalVentas: 95000,
                totalNegocios: 1,
                ultimaCompra: '2024-12-22',
                calificacion: 'AA'
            }
        ];

        clientesDefecto.forEach(cliente => {
            const clienteNormalizado = this.normalizarCliente(cliente, 'defecto');
            clientesMap.set(clienteNormalizado.id, clienteNormalizado);
        });

        console.log(`Clientes por defecto cargados: ${clientesDefecto.length}`);
    }

    normalizarCliente(cliente, origen) {
        return {
            id: cliente.id || this.generateClienteId(),
            nombre: cliente.nombre?.trim() || '',
            empresa: cliente.empresa || cliente.nombre || '',
            telefono: cliente.telefono || cliente.contacto || '',
            email: cliente.email || '',
            direccion: cliente.direccion || '',
            tipo: cliente.tipo || 'minorista',
            credito: Number(cliente.credito) || 0,
            descuento: Number(cliente.descuento) || 0,
            activo: cliente.activo !== false,
            fechaRegistro: cliente.fechaRegistro || new Date().toISOString().split('T')[0],
            totalVentas: Number(cliente.totalVentas) || 0,
            totalNegocios: Number(cliente.totalNegocios) || 0,
            ultimaCompra: cliente.ultimaCompra || null,
            calificacion: cliente.calificacion || 'B',
            origen: origen,
            fechaCreacion: cliente.fechaCreacion || new Date().toISOString(),
            fechaModificacion: new Date().toISOString(),
            usuarioId: cliente.usuarioId || this.getCurrentUserId()
        };
    }

    async crearCliente(datos) {
        try {
            const id = this.generateClienteId();
            const cliente = this.normalizarCliente({
                ...datos,
                id: id
            }, 'manual');
            
            // Validar datos
            this.validarDatosCliente(cliente);
            
            this.clientes.set(id, cliente);
            this.actualizarIndicePorNombre();
            
            // Agregar a cola de sincronización
            this.syncQueue.push({
                action: 'create',
                type: 'cliente',
                data: cliente,
                timestamp: Date.now()
            });
            
            // Sincronización inmediata
            await this.syncClienteToFirebase(cliente);
            await this.syncClienteToOffline(cliente);
            
            // Propagar a otros módulos
            await this.propagarClienteAModulos(cliente, 'created');
            
            console.log(`✅ Cliente creado: ${cliente.nombre}`);
            this.broadcastEvent('clienteCreated', { cliente });
            
            return cliente;
            
        } catch (error) {
            console.error('⚠️ Error creando cliente:', error);
            throw error;
        }
    }

    async actualizarCliente(id, datos) {
        try {
            const cliente = this.clientes.get(id);
            if (!cliente) {
                throw new Error(`Cliente no encontrado: ${id}`);
            }

            const clienteActualizado = {
                ...cliente,
                ...datos,
                fechaModificacion: new Date().toISOString()
            };

            // Validar datos actualizados
            this.validarDatosCliente(clienteActualizado);

            this.clientes.set(id, clienteActualizado);
            this.actualizarIndicePorNombre();
            
            // Agregar a cola de sincronización
            this.syncQueue.push({
                action: 'update',
                type: 'cliente',
                data: clienteActualizado,
                timestamp: Date.now()
            });

            // Sincronización inmediata
            await this.syncClienteToFirebase(clienteActualizado);
            await this.syncClienteToOffline(clienteActualizado);
            
            // Propagar a otros módulos
            await this.propagarClienteAModulos(clienteActualizado, 'updated');
            
            console.log(`✅ Cliente actualizado: ${clienteActualizado.nombre}`);
            this.broadcastEvent('clienteUpdated', { cliente: clienteActualizado });
            
            return clienteActualizado;
            
        } catch (error) {
            console.error('⚠️ Error actualizando cliente:', error);
            throw error;
        }
    }

    async eliminarCliente(id) {
        try {
            const cliente = this.clientes.get(id);
            if (!cliente) {
                throw new Error(`Cliente no encontrado: ${id}`);
            }

            // Marcar como inactivo en lugar de eliminar completamente
            cliente.activo = false;
            cliente.fechaModificacion = new Date().toISOString();

            this.clientes.set(id, cliente);
            
            // Sincronizar cambios
            await this.syncClienteToFirebase(cliente);
            await this.syncClienteToOffline(cliente);
            
            console.log(`✅ Cliente desactivado: ${cliente.nombre}`);
            this.broadcastEvent('clienteDeleted', { cliente });
            
            return cliente;
            
        } catch (error) {
            console.error('⚠️ Error eliminando cliente:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTRICAS Y ANÁLISIS
    // ==========================================

    async actualizarMetricasVenta(clienteId, montoVenta) {
        try {
            const cliente = this.clientes.get(clienteId);
            if (!cliente) return;

            cliente.totalVentas += montoVenta;
            cliente.ultimaCompra = new Date().toISOString().split('T')[0];
            cliente.calificacion = this.calcularCalificacion(cliente);
            cliente.fechaModificacion = new Date().toISOString();
            
            await this.actualizarCliente(clienteId, {
                totalVentas: cliente.totalVentas,
                ultimaCompra: cliente.ultimaCompra,
                calificacion: cliente.calificacion
            });
            
            console.log(`📊 Métricas de venta actualizadas para: ${cliente.nombre}`);
            
        } catch (error) {
            console.error('⚠️ Error actualizando métricas de venta:', error);
        }
    }

    async actualizarMetricasNegocio(clienteId, valorNegocio, estado) {
        try {
            const cliente = this.clientes.get(clienteId);
            if (!cliente) return;

            if (estado === 'cerrado') {
                cliente.totalNegocios += 1;
                // Si el negocio se cerró exitosamente, actualizar ventas también
                if (valorNegocio > 0) {
                    cliente.totalVentas += valorNegocio;
                    cliente.ultimaCompra = new Date().toISOString().split('T')[0];
                }
            }
            
            cliente.calificacion = this.calcularCalificacion(cliente);
            cliente.fechaModificacion = new Date().toISOString();
            
            await this.actualizarCliente(clienteId, {
                totalNegocios: cliente.totalNegocios,
                totalVentas: cliente.totalVentas,
                ultimaCompra: cliente.ultimaCompra,
                calificacion: cliente.calificacion
            });
            
            console.log(`🤝 Métricas de negocio actualizadas para: ${cliente.nombre}`);
            
        } catch (error) {
            console.error('⚠️ Error actualizando métricas de negocio:', error);
        }
    }

    calcularCalificacion(cliente) {
        let puntos = 0;
        
        // Puntos por volumen de ventas
        if (cliente.totalVentas > 150000) puntos += 3;
        else if (cliente.totalVentas > 75000) puntos += 2;
        else if (cliente.totalVentas > 25000) puntos += 1;
        
        // Puntos por frecuencia de negocios
        if (cliente.totalNegocios > 2) puntos += 2;
        else if (cliente.totalNegocios > 0) puntos += 1;
        
        // Puntos por antigüedad
        const mesesActivo = this.calcularMesesActivo(cliente.fechaRegistro);
        if (mesesActivo > 6) puntos += 1;
        
        // Puntos por actividad reciente
        if (cliente.ultimaCompra) {
            const diasUltimaCompra = this.calcularDiasDesdeUltimaCompra(cliente.ultimaCompra);
            if (diasUltimaCompra <= 30) puntos += 1;
        }
        
        // Convertir a calificación
        if (puntos >= 6) return 'AAA';
        if (puntos >= 4) return 'AA';
        if (puntos >= 2) return 'A';
        return 'B';
    }

    calcularMesesActivo(fechaRegistro) {
        const hoy = new Date();
        const registro = new Date(fechaRegistro);
        return Math.floor((hoy - registro) / (1000 * 60 * 60 * 24 * 30));
    }

    calcularDiasDesdeUltimaCompra(ultimaCompra) {
        const hoy = new Date();
        const compra = new Date(ultimaCompra);
        return Math.floor((hoy - compra) / (1000 * 60 * 60 * 24));
    }

    // ==========================================
    // OBTENCIÓN DE DATOS
    // ==========================================

    obtenerCliente(id) {
        return this.clientes.get(id) || null;
    }

    obtenerTodos(filtros = {}) {
        let clientesList = Array.from(this.clientes.values()).filter(c => c.activo);
        
        if (filtros.tipo) {
            clientesList = clientesList.filter(c => c.tipo === filtros.tipo);
        }
        
        if (filtros.calificacion) {
            clientesList = clientesList.filter(c => c.calificacion === filtros.calificacion);
        }

        if (filtros.busqueda) {
            const busqueda = filtros.busqueda.toLowerCase();
            clientesList = clientesList.filter(c => 
                c.nombre.toLowerCase().includes(busqueda) ||
                c.empresa.toLowerCase().includes(busqueda) ||
                c.email.toLowerCase().includes(busqueda)
            );
        }
        
        return clientesList.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    obtenerParaSelectores() {
        return this.obtenerTodos().map(cliente => ({
            id: cliente.id,
            nombre: cliente.nombre,
            empresa: cliente.empresa,
            displayName: `${cliente.nombre} - ${cliente.empresa}`
        }));
    }

    obtenerEstadisticas() {
        const clientes = this.obtenerTodos();
        
        return {
            total: clientes.length,
            porTipo: this.agruparPorTipo(clientes),
            porCalificacion: this.agruparPorCalificacion(clientes),
            ventasPromedio: clientes.reduce((sum, c) => sum + c.totalVentas, 0) / clientes.length,
            clientesActivos: clientes.filter(c => {
                if (!c.ultimaCompra) return false;
                const diasUltimaCompra = this.calcularDiasDesdeUltimaCompra(c.ultimaCompra);
                return diasUltimaCompra <= 90;
            }).length
        };
    }

    agruparPorTipo(clientes) {
        const grupos = {};
        clientes.forEach(cliente => {
            grupos[cliente.tipo] = (grupos[cliente.tipo] || 0) + 1;
        });
        return grupos;
    }

    agruparPorCalificacion(clientes) {
        const grupos = {};
        clientes.forEach(cliente => {
            grupos[cliente.calificacion] = (grupos[cliente.calificacion] || 0) + 1;
        });
        return grupos;
    }

    // ==========================================
    // SINCRONIZACIÓN
    // ==========================================

    async syncClienteToFirebase(cliente) {
        try {
            if (!window.db || !window.firebase) return;
            
            const user = window.firebase.auth().currentUser;
            if (!user) return;

            await window.db.collection('clientes').doc(cliente.id).set({
                nombre: cliente.nombre,
                empresa: cliente.empresa,
                telefono: cliente.telefono,
                email: cliente.email,
                direccion: cliente.direccion,
                tipo: cliente.tipo,
                credito: cliente.credito,
                descuento: cliente.descuento,
                activo: cliente.activo,
                fechaRegistro: cliente.fechaRegistro,
                totalVentas: cliente.totalVentas,
                totalNegocios: cliente.totalNegocios,
                ultimaCompra: cliente.ultimaCompra,
                calificacion: cliente.calificacion,
                fechaCreacion: window.firebase.firestore.Timestamp.fromDate(new Date(cliente.fechaCreacion)),
                fechaModificacion: window.firebase.firestore.Timestamp.fromDate(new Date(cliente.fechaModificacion)),
                usuarioId: cliente.usuarioId
            });
            
        } catch (error) {
            console.error(`Error sincronizando cliente ${cliente.id} con Firebase:`, error);
        }
    }

    async syncClienteToOffline(cliente) {
        try {
            if (!window.offlineManager) return;
            
            await window.offlineManager.saveData('clientes', cliente.id, cliente);
            
        } catch (error) {
            console.error(`Error sincronizando cliente ${cliente.id} offline:`, error);
        }
    }

    async processSyncQueue() {
        if (this.syncQueue.length === 0) return;

        console.log(`📤 Procesando cola de sincronización: ${this.syncQueue.length} elementos`);
        
        const batch = this.syncQueue.splice(0, 10); // Procesar 10 a la vez
        
        for (const item of batch) {
            try {
                if (item.type === 'cliente') {
                    await this.syncClienteToFirebase(item.data);
                    await this.syncClienteToOffline(item.data);
                }
            } catch (error) {
                console.error('Error procesando elemento de sincronización:', error);
                // Reintroduce el elemento con contador de reintentos
                item.retries = (item.retries || 0) + 1;
                if (item.retries < syncConfig.maxRetries) {
                    this.syncQueue.push(item);
                }
            }
        }
    }

    // ==========================================
    // PROPAGACIÓN A MÓDULOS
    // ==========================================

    async propagarClienteAModulos(cliente, accion) {
        try {
            // Propagar a ventas
            if (window.ventasManager && typeof window.ventasManager.onClienteUpdated === 'function') {
                window.ventasManager.onClienteUpdated(cliente, accion);
            }
            
            // Propagar a negocios
            if (window.negociosManager && typeof window.negociosManager.onClienteUpdated === 'function') {
                window.negociosManager.onClienteUpdated(cliente, accion);
            }
            
            console.log(`🔄 Cliente propagado a módulos: ${cliente.nombre}`);
            
        } catch (error) {
            console.error('Error propagando cliente a módulos:', error);
        }
    }

    // ==========================================
    // EVENTOS DE OTROS MÓDULOS
    // ==========================================

    onVentaCreated(venta) {
        if (venta.clienteId) {
            // Programar actualización de métricas
            setTimeout(() => {
                this.actualizarMetricasVenta(venta.clienteId, venta.total);
            }, 100);
        }
    }

    onNegocioCreated(negocio) {
        if (negocio.clienteId) {
            // Programar actualización de métricas
            setTimeout(() => {
                this.actualizarMetricasNegocio(negocio.clienteId, negocio.valor, negocio.estado);
            }, 100);
        }
    }

    // ==========================================
    // VALIDACIÓN Y UTILIDADES
    // ==========================================

    validarDatosCliente(cliente) {
        if (!cliente.nombre || cliente.nombre.trim() === '') {
            throw new Error('El nombre del cliente es requerido');
        }

        if (!cliente.telefono || cliente.telefono.trim() === '') {
            throw new Error('El teléfono del cliente es requerido');
        }

        if (cliente.email && !this.validarEmail(cliente.email)) {
            throw new Error('El email del cliente no es válido');
        }

        if (cliente.credito < 0) {
            throw new Error('El crédito no puede ser negativo');
        }

        if (cliente.descuento < 0 || cliente.descuento > 100) {
            throw new Error('El descuento debe estar entre 0 y 100');
        }
    }

    validarEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    actualizarIndicePorNombre() {
        this.clientesByName.clear();
        this.clientes.forEach(cliente => {
            const nombreKey = cliente.nombre.toLowerCase().trim();
            this.clientesByName.set(nombreKey, cliente.id);
        });
    }

    buscarPorNombre(nombre) {
        const nombreKey = nombre.toLowerCase().trim();
        const clienteId = this.clientesByName.get(nombreKey);
        return clienteId ? this.clientes.get(clienteId) : null;
    }

    generateClienteId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `CLI_${timestamp}_${random}`.toUpperCase();
    }

    getCurrentUserId() {
        if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
            return window.firebase.auth().currentUser.uid;
        }
        return 'anonymous_user';
    }

    broadcastEvent(eventType, data) {
        window.dispatchEvent(new CustomEvent(eventType, {
            detail: {
                ...data,
                timestamp: Date.now(),
                source: 'clientesManagerMejorado'
            }
        }));
    }

    getStatus() {
        return {
            initialized: this.initialized,
            clientesCount: this.clientes.size,
            clientesActivos: Array.from(this.clientes.values()).filter(c => c.activo).length,
            syncQueueSize: this.syncQueue.length,
            features: ['firebase', 'offline', 'validation', 'metrics', 'integration']
        };
    }
}

// ==========================================
// VALIDADOR DE COHERENCIA MEJORADO
// ==========================================

class DataValidatorMejorado {
    constructor() {
        this.errores = [];
        this.warnings = [];
        this.validationRules = new Map();
        this.setupValidationRules();
    }

    setupValidationRules() {
        // Reglas de validación para clientes
        this.validationRules.set('cliente_duplicados', {
            description: 'Verificar clientes duplicados por nombre',
            severity: 'warning',
            validate: (data) => this.validateClientesDuplicados(data)
        });

        this.validationRules.set('cliente_datos_incompletos', {
            description: 'Verificar datos incompletos en clientes',
            severity: 'error',
            validate: (data) => this.validateClientesDatosIncompletos(data)
        });

        this.validationRules.set('ventas_coherencia_clientes', {
            description: 'Verificar coherencia entre ventas y clientes',
            severity: 'error',
            validate: (data) => this.validateVentasClientesCoherencia(data)
        });

        this.validationRules.set('negocios_coherencia_clientes', {
            description: 'Verificar coherencia entre negocios y clientes',
            severity: 'error',
            validate: (data) => this.validateNegociosClientesCoherencia(data)
        });
    }

    async validarCoherenciaGeneral() {
        try {
            console.log('🔍 Validando coherencia de datos mejorada...');
            this.errores = [];
            this.warnings = [];
            
            // Recopilar datos de todos los módulos
            const data = await this.recopilarDatos();
            
            // Ejecutar todas las reglas de validación
            for (const [ruleId, rule] of this.validationRules) {
                try {
                    const result = await rule.validate(data);
                    if (result && result.length > 0) {
                        if (rule.severity === 'error') {
                            this.errores.push(...result);
                        } else {
                            this.warnings.push(...result);
                        }
                    }
                } catch (error) {
                    console.error(`Error ejecutando regla ${ruleId}:`, error);
                }
            }
            
            console.log(`✅ Validación completa: ${this.errores.length} errores, ${this.warnings.length} advertencias`);
            
            this.broadcastValidationResult();
            
            return {
                valido: this.errores.length === 0,
                errores: this.errores,
                warnings: this.warnings,
                resumen: this.generarResumenValidacion()
            };
            
        } catch (error) {
            console.error('⚠️ Error en validación:', error);
            return { 
                valido: false, 
                errores: ['Error interno de validación: ' + error.message],
                warnings: []
            };
        }
    }

    async recopilarDatos() {
        const data = {
            clientes: [],
            ventas: [],
            negocios: []
        };

        // Recopilar clientes
        if (window.clientesManager) {
            data.clientes = window.clientesManager.obtenerTodos({ incluirInactivos: true });
        }

        // Recopilar ventas
        if (window.ventasManager) {
            data.ventas = window.ventasManager.obtenerVentasFiltradas() || [];
        }

        // Recopilar negocios
        if (window.negociosManager) {
            data.negocios = window.negociosManager.obtenerNegociosFiltrados() || [];
        }

        return data;
    }

    validateClientesDuplicados(data) {
        const warnings = [];
        const nombresMap = new Map();
        
        data.clientes.forEach(cliente => {
            const nombre = cliente.nombre.toLowerCase().trim();
            if (nombresMap.has(nombre)) {
                const clienteExistente = nombresMap.get(nombre);
                warnings.push({
                    tipo: 'cliente_duplicado',
                    mensaje: `Posibles clientes duplicados: "${cliente.nombre}" (${cliente.id}) y "${clienteExistente.nombre}" (${clienteExistente.id})`,
                    datos: [cliente, clienteExistente],
                    severidad: 'warning'
                });
            } else {
                nombresMap.set(nombre, cliente);
            }
        });

        return warnings;
    }

    validateClientesDatosIncompletos(data) {
        const errores = [];
        
        data.clientes.forEach(cliente => {
            const camposFaltantes = [];
            
            if (!cliente.nombre || cliente.nombre.trim() === '') {
                camposFaltantes.push('nombre');
            }
            
            if (!cliente.telefono || cliente.telefono.trim() === '') {
                camposFaltantes.push('telefono');
            }
            
            if (cliente.email && !this.validarEmail(cliente.email)) {
                camposFaltantes.push('email válido');
            }
            
            if (camposFaltantes.length > 0) {
                errores.push({
                    tipo: 'datos_incompletos',
                    mensaje: `Cliente "${cliente.nombre}" (${cliente.id}) tiene datos incompletos: ${camposFaltantes.join(', ')}`,
                    datos: { cliente, camposFaltantes },
                    severidad: 'error'
                });
            }
        });

        return errores;
    }

    validateVentasClientesCoherencia(data) {
        const errores = [];
        const clientesMap = new Map();
        
        data.clientes.forEach(cliente => {
            clientesMap.set(cliente.id, cliente);
        });
        
        data.ventas.forEach(venta => {
            if (venta.clienteId && !clientesMap.has(venta.clienteId)) {
                errores.push({
                    tipo: 'venta_cliente_inexistente',
                    mensaje: `Venta ${venta.id} referencia cliente inexistente: ${venta.clienteId}`,
                    datos: { venta, clienteId: venta.clienteId },
                    severidad: 'error'
                });
            }
        });

        return errores;
    }

    validateNegociosClientesCoherencia(data) {
        const errores = [];
        const clientesMap = new Map();
        
        data.clientes.forEach(cliente => {
            clientesMap.set(cliente.id, cliente);
        });
        
        data.negocios.forEach(negocio => {
            if (negocio.clienteId && !clientesMap.has(negocio.clienteId)) {
                errores.push({
                    tipo: 'negocio_cliente_inexistente',
                    mensaje: `Negocio ${negocio.id} referencia cliente inexistente: ${negocio.clienteId}`,
                    datos: { negocio, clienteId: negocio.clienteId },
                    severidad: 'error'
                });
            }
        });

        return errores;
    }

    validarEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    generarResumenValidacion() {
        return {
            totalErrores: this.errores.length,
            totalWarnings: this.warnings.length,
            tiposErrores: this.agruparPorTipo(this.errores),
            tiposWarnings: this.agruparPorTipo(this.warnings),
            estado: this.errores.length === 0 ? 'válido' : 'inválido'
        };
    }

    agruparPorTipo(items) {
        const grupos = {};
        items.forEach(item => {
            grupos[item.tipo] = (grupos[item.tipo] || 0) + 1;
        });
        return grupos;
    }

    broadcastValidationResult() {
        window.dispatchEvent(new CustomEvent('validacionCompleta', {
            detail: {
                errores: this.errores,
                warnings: this.warnings,
                resumen: this.generarResumenValidacion(),
                timestamp: Date.now()
            }
        }));
    }
}

// ==========================================
// GESTOR PRINCIPAL MEJORADO
// ==========================================

class DataSyncManagerMejorado {
    constructor() {
        this.clientesManager = new ClientesManagerMejorado();
        this.validator = new DataValidatorMejorado();
        this.initialized = false;
        this.syncStatus = {
            lastSync: null,
            syncInProgress: false,
            errors: []
        };
    }

    async initialize() {
        try {
            console.log('🔄 Inicializando sistema de sincronización mejorado...');
            
            // Esperar a que los módulos core estén listos
            await this.waitForCoreModules();
            
            // Inicializar componentes
            await this.clientesManager.initialize();
            
            // Configurar eventos de sincronización
            this.setupEventListeners();
            
            // Ejecutar validación inicial
            setTimeout(() => {
                this.validator.validarCoherenciaGeneral();
            }, 2000);
            
            this.initialized = true;
            console.log('✅ Sistema de sincronización mejorado inicializado');
            
            this.broadcastEvent('dataSyncReady', {
                components: ['clientesManagerMejorado', 'dataValidatorMejorado'],
                features: ['realTimeSync', 'validation', 'integration']
            });
            
        } catch (error) {
            console.error('⚠️ Error inicializando sincronización mejorada:', error);
        }
    }

    async waitForCoreModules() {
        const maxWait = 15000;
        const checkInterval = 500;
        let elapsed = 0;
        
        return new Promise((resolve) => {
            const check = () => {
                const modulesReady = Boolean(
                    window.firebase || 
                    window.offlineManager
                );
                
                if (modulesReady || elapsed >= maxWait) {
                    console.log('📦 Módulos core disponibles para sincronización mejorada');
                    resolve();
                } else {
                    elapsed += checkInterval;
                    setTimeout(check, checkInterval);
                }
            };
            
            check();
        });
    }

    setupEventListeners() {
        // Escuchar eventos de otros módulos para mantener sincronización
        window.addEventListener('ventaCreated', (event) => {
            this.onVentaCreated(event.detail.venta);
        });

        window.addEventListener('negocio_creado', (event) => {
            this.onNegocioCreated(event.detail.negocio);
        });

        // Configurar sincronización automática
        if (syncConfig.autoSync) {
            setInterval(() => {
                this.syncAll();
            }, syncConfig.syncInterval);
        }

        // Escuchar cambios de conectividad
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada - sincronizando datos...');
            this.syncAll();
        });
    }

    async syncAll() {
        if (this.syncStatus.syncInProgress) return;
        
        try {
            this.syncStatus.syncInProgress = true;
            this.syncStatus.errors = [];
            
            console.log('🔄 Sincronizando todos los datos...');
            
            // Sincronizar clientes
            if (this.clientesManager.initialized) {
                await this.clientesManager.processSyncQueue();
            }
            
            // Validar coherencia
            const validationResult = await this.validator.validarCoherenciaGeneral();
            
            this.syncStatus.lastSync = new Date().toISOString();
            this.syncStatus.syncInProgress = false;
            
            console.log('✅ Sincronización completa');
            
            return {
                success: true,
                timestamp: this.syncStatus.lastSync,
                validation: validationResult
            };
            
        } catch (error) {
            console.error('⚠️ Error en sincronización completa:', error);
            this.syncStatus.errors.push(error.message);
            this.syncStatus.syncInProgress = false;
            
            return { 
                success: false, 
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    onVentaCreated(venta) {
        console.log('💰 Venta creada - actualizando sincronización');
        // La sincronización se maneja automáticamente por los event listeners
    }

    onNegocioCreated(negocio) {
        console.log('🤝 Negocio creado - actualizando sincronización');
        // La sincronización se maneja automáticamente por los event listeners
    }

    broadcastEvent(eventType, data) {
        window.dispatchEvent(new CustomEvent(eventType, {
            detail: {
                ...data,
                timestamp: Date.now(),
                source: 'dataSyncManagerMejorado'
            }
        }));
    }

    getStatus() {
        return {
            initialized: this.initialized,
            syncStatus: this.syncStatus,
            components: {
                clientesManager: this.clientesManager.getStatus(),
                validator: {
                    lastValidation: this.validator.lastValidation,
                    errorsCount: this.validator.errores.length,
                    warningsCount: this.validator.warnings.length
                }
            }
        };
    }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Crear instancia global
const dataSyncManagerMejorado = new DataSyncManagerMejorado();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Esperar un poco para que otros módulos se carguen
    setTimeout(async () => {
        await dataSyncManagerMejorado.initialize();
    }, 1000);
});

// Exponer managers globalmente
window.dataSyncManager = dataSyncManagerMejorado;
window.clientesManager = dataSyncManagerMejorado.clientesManager;

// Funciones de conveniencia globales
window.validarCoherenciaGeneral = () => dataSyncManagerMejorado.validator.validarCoherenciaGeneral();
window.sincronizarTodo = () => dataSyncManagerMejorado.syncAll();

// Función para debug
window.debugDataSync = () => {
    console.log('📊 Estado del sistema de sincronización:');
    console.log('Clientes:', window.clientesManager.getStatus());
    console.log('Sync Manager:', dataSyncManagerMejorado.getStatus());
    
    return {
        clientes: window.clientesManager.getStatus(),
        syncManager: dataSyncManagerMejorado.getStatus()
    };
};

console.log('🔄 Sistema de sincronización de datos mejorado cargado');

export default dataSyncManagerMejorado;
