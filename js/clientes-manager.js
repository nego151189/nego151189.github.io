/* ========================================
   FINCA LA HERRADURA - GESTOR CENTRALIZADO DE CLIENTES
   Sistema unificado para gestión de clientes entre módulos
   ======================================== */

// Import de offline.js
import offlineManager from './offline.js';

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let systemInitialized = false;
let offlineAvailable = false;

// Datos centralizados
let clientes = new Map();
let historialClientes = new Map();

// Configuración base
const clientesConfig = {
    fincaId: 'finca_la_herradura',
    version: '1.0.0'
};

// Datos unificados de clientes (mismos en todos los módulos)
const clientesUnificados = [
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

// ==========================================
// CLASE PRINCIPAL
// ==========================================

class ClientesManager {
    constructor() {
        this.eventListeners = new Map();
        this.syncQueue = [];
        this.init();
    }

    async init() {
        try {
            console.log('👥 Inicializando ClientesManager...');
            
            await this.waitForOfflineManager();
            await this.loadInitialData();
            
            systemInitialized = true;
            console.log('✅ ClientesManager inicializado correctamente');
            
            this.dispatchEvent('clientesManagerReady', {
                clientesCount: clientes.size
            });
            
        } catch (error) {
            console.error('❌ Error inicializando ClientesManager:', error);
            await this.initWithoutOffline();
        }
    }

    async waitForOfflineManager() {
        return new Promise((resolve) => {
            const maxWait = 10000;
            const checkInterval = 100;
            let elapsed = 0;

            const check = () => {
                if (window.offlineManager || offlineManager) {
                    offlineAvailable = true;
                    resolve();
                } else if (elapsed < maxWait) {
                    elapsed += checkInterval;
                    setTimeout(check, checkInterval);
                } else {
                    offlineAvailable = false;
                    resolve();
                }
            };

            check();
        });
    }

    async loadInitialData() {
        try {
            if (offlineAvailable) {
                await this.loadFromOffline();
            }
            
            // Si no hay datos offline, cargar datos unificados
            if (clientes.size === 0) {
                this.loadUnifiedData();
            }
            
            console.log(`📊 Clientes cargados: ${clientes.size}`);
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.loadUnifiedData();
        }
    }

    async initWithoutOffline() {
        console.log('📱 Inicializando sin persistencia offline');
        this.loadUnifiedData();
        systemInitialized = true;
    }

    loadUnifiedData() {
        clientes.clear();
        clientesUnificados.forEach(cliente => {
            clientes.set(cliente.id, { ...cliente });
        });
        console.log('✅ Datos unificados de clientes cargados');
    }

    async loadFromOffline() {
        try {
            const offlineMgr = window.offlineManager || offlineManager;
            if (!offlineMgr) return;
            
            const clientesData = await offlineMgr.getAllData('clientes');
            clientesData.forEach(item => {
                clientes.set(item.id, item.data);
            });
            
            console.log(`📱 Clientes cargados desde offline: ${clientes.size}`);
            
        } catch (error) {
            console.error('❌ Error cargando desde offline:', error);
        }
    }

    // ==========================================
    // GESTIÓN DE CLIENTES
    // ==========================================

    async crearCliente(datos) {
        try {
            const id = this.generateId();
            const cliente = {
                id,
                nombre: datos.nombre,
                empresa: datos.empresa || datos.nombre,
                telefono: datos.telefono || datos.contacto,
                email: datos.email,
                direccion: datos.direccion,
                tipo: datos.tipo || 'minorista',
                credito: datos.credito || 0,
                descuento: datos.descuento || 0,
                activo: true,
                fechaRegistro: new Date().toISOString().split('T')[0],
                totalVentas: 0,
                totalNegocios: 0,
                ultimaCompra: null,
                calificacion: 'B',
                usuarioId: this.getCurrentUserId(),
                createdAt: new Date().toISOString()
            };

            clientes.set(id, cliente);
            
            // Guardar offline
            if (offlineAvailable) {
                const offlineMgr = window.offlineManager || offlineManager;
                if (offlineMgr) {
                    await offlineMgr.saveData('clientes', id, cliente);
                }
            }

            // Sincronizar con otros módulos
            await this.sincronizarConModulos(cliente, 'created');
            
            this.dispatchEvent('clienteCreated', { cliente });
            
            console.log(`✅ Cliente creado: ${cliente.nombre}`);
            return cliente;
            
        } catch (error) {
            console.error('❌ Error creando cliente:', error);
            throw error;
        }
    }

    async actualizarCliente(id, datos) {
        try {
            const cliente = clientes.get(id);
            if (!cliente) {
                throw new Error(`Cliente no encontrado: ${id}`);
            }

            const clienteActualizado = {
                ...cliente,
                ...datos,
                updatedAt: new Date().toISOString()
            };

            clientes.set(id, clienteActualizado);
            
            // Guardar offline
            if (offlineAvailable) {
                const offlineMgr = window.offlineManager || offlineManager;
                if (offlineMgr) {
                    await offlineMgr.saveData('clientes', id, clienteActualizado);
                }
            }

            // Sincronizar con otros módulos
            await this.sincronizarConModulos(clienteActualizado, 'updated');
            
            this.dispatchEvent('clienteUpdated', { cliente: clienteActualizado });
            
            console.log(`✅ Cliente actualizado: ${clienteActualizado.nombre}`);
            return clienteActualizado;
            
        } catch (error) {
            console.error('❌ Error actualizando cliente:', error);
            throw error;
        }
    }

    obtenerCliente(id) {
        return clientes.get(id) || null;
    }

    obtenerTodos(filtros = {}) {
        let clientesList = Array.from(clientes.values()).filter(c => c.activo);
        
        if (filtros.tipo) {
            clientesList = clientesList.filter(c => c.tipo === filtros.tipo);
        }
        
        if (filtros.calificacion) {
            clientesList = clientesList.filter(c => c.calificacion === filtros.calificacion);
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

    // ==========================================
    // ACTUALIZACIÓN DE MÉTRICAS
    // ==========================================

    async actualizarMetricasVenta(clienteId, montoVenta) {
        try {
            const cliente = clientes.get(clienteId);
            if (!cliente) return;

            cliente.totalVentas += montoVenta;
            cliente.ultimaCompra = new Date().toISOString().split('T')[0];
            
            // Actualizar calificación
            cliente.calificacion = this.calcularCalificacion(cliente);
            
            await this.actualizarCliente(clienteId, cliente);
            
        } catch (error) {
            console.error('❌ Error actualizando métricas de venta:', error);
        }
    }

    async actualizarMetricasNegocio(clienteId, valorNegocio, estado) {
        try {
            const cliente = clientes.get(clienteId);
            if (!cliente) return;

            if (estado === 'cerrado') {
                cliente.totalNegocios += 1;
            }
            
            cliente.calificacion = this.calcularCalificacion(cliente);
            
            await this.actualizarCliente(clienteId, cliente);
            
        } catch (error) {
            console.error('❌ Error actualizando métricas de negocio:', error);
        }
    }

    calcularCalificacion(cliente) {
        let puntos = 0;
        
        // Puntos por volumen de ventas
        if (cliente.totalVentas > 150000) puntos += 3;
        else if (cliente.totalVentas > 75000) puntos += 2;
        else if (cliente.totalVentas > 25000) puntos += 1;
        
        // Puntos por frecuencia
        if (cliente.totalNegocios > 2) puntos += 2;
        else if (cliente.totalNegocios > 0) puntos += 1;
        
        // Puntos por antigüedad
        const mesesActivo = this.calcularMesesActivo(cliente.fechaRegistro);
        if (mesesActivo > 6) puntos += 1;
        
        // Convertir a calificación
        if (puntos >= 5) return 'AAA';
        if (puntos >= 3) return 'AA';
        if (puntos >= 1) return 'A';
        return 'B';
    }

    calcularMesesActivo(fechaRegistro) {
        const hoy = new Date();
        const registro = new Date(fechaRegistro);
        return Math.floor((hoy - registro) / (1000 * 60 * 60 * 24 * 30));
    }

    // ==========================================
    // SINCRONIZACIÓN CON MÓDULOS
    // ==========================================

    async sincronizarConModulos(cliente, accion) {
        try {
            // Sincronizar con ventas
            if (window.ventasManager && window.ventasManager.sincronizarCliente) {
                await window.ventasManager.sincronizarCliente(cliente, accion);
            }
            
            // Sincronizar con negocios
            if (window.negociosManager && window.negociosManager.sincronizarCliente) {
                await window.negociosManager.sincronizarCliente(cliente, accion);
            }
            
            console.log(`🔄 Cliente sincronizado: ${cliente.nombre}`);
            
        } catch (error) {
            console.error('❌ Error sincronizando cliente:', error);
        }
    }

    validarCoherencia() {
        const errores = [];
        
        // Validar datos requeridos
        clientes.forEach((cliente, id) => {
            if (!cliente.nombre || !cliente.telefono) {
                errores.push({
                    tipo: 'datos_incompletos',
                    clienteId: id,
                    mensaje: `Cliente ${id} tiene datos incompletos`
                });
            }
        });
        
        return errores;
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `CLI_${timestamp}_${random}`.toUpperCase();
    }

    getCurrentUserId() {
        if (window.authManager && window.authManager.currentUser) {
            return window.authManager.currentUser.uid;
        }
        return 'anonymous_user';
    }

    dispatchEvent(eventType, data) {
        window.dispatchEvent(new CustomEvent(eventType, {
            detail: {
                ...data,
                timestamp: Date.now(),
                source: 'clientesManager'
            }
        }));
    }

    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    getStatus() {
        return {
            initialized: systemInitialized,
            offlineAvailable: offlineAvailable,
            clientesCount: clientes.size,
            clientesActivos: Array.from(clientes.values()).filter(c => c.activo).length
        };
    }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Crear instancia global
let clientesManagerInstance = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (!clientesManagerInstance) {
        clientesManagerInstance = new ClientesManager();
        window.clientesManager = clientesManagerInstance;
        
        console.log('👥 ClientesManager disponible globalmente');
    }
});

// Funciones globales de conveniencia
window.crearCliente = function(datos) {
    return window.clientesManager?.crearCliente(datos);
};

window.obtenerCliente = function(id) {
    return window.clientesManager?.obtenerCliente(id);
};

window.obtenerTodosClientes = function(filtros) {
    return window.clientesManager?.obtenerTodos(filtros);
};

// Export por defecto para módulos ES6
export default ClientesManager;
