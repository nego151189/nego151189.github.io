/* ========================================
   FINCA LA HERRADURA - GESTOR CENTRALIZADO DE CLIENTES
   Sistema unificado para gestión de clientes entre módulos
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let clientesSystemInitialized = false;
let clientesOfflineAvailable = false;

// Datos centralizados
let clientesMap = new Map();
let historialClientesMap = new Map();

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
// FUNCIONES PRINCIPALES
// ==========================================

function initClientesManager() {
    console.log('👥 Inicializando ClientesManager...');
    
    return new Promise(function(resolve) {
        waitForOfflineManager()
            .then(function() {
                return loadInitialClientesData();
            })
            .then(function() {
                clientesSystemInitialized = true;
                console.log('✅ ClientesManager inicializado correctamente');
                
                dispatchClientesEvent('clientesManagerReady', {
                    clientesCount: clientesMap.size
                });
                
                resolve();
            })
            .catch(function(error) {
                console.error('❌ Error inicializando ClientesManager:', error);
                initWithoutOffline();
                resolve();
            });
    });
}

function waitForOfflineManager() {
    return new Promise(function(resolve) {
        var maxWait = 10000;
        var checkInterval = 100;
        var elapsed = 0;

        function check() {
            if (window.offlineManager) {
                clientesOfflineAvailable = true;
                resolve();
            } else if (elapsed < maxWait) {
                elapsed += checkInterval;
                setTimeout(check, checkInterval);
            } else {
                clientesOfflineAvailable = false;
                resolve();
            }
        }

        check();
    });
}

function loadInitialClientesData() {
    return new Promise(function(resolve) {
        if (clientesOfflineAvailable) {
            loadFromOffline()
                .then(function() {
                    if (clientesMap.size === 0) {
                        loadUnifiedClientesData();
                    }
                    console.log('📊 Clientes cargados: ' + clientesMap.size);
                    resolve();
                })
                .catch(function(error) {
                    console.error('❌ Error cargando desde offline:', error);
                    loadUnifiedClientesData();
                    resolve();
                });
        } else {
            loadUnifiedClientesData();
            console.log('📊 Clientes cargados: ' + clientesMap.size);
            resolve();
        }
    });
}

function initWithoutOffline() {
    console.log('📱 Inicializando sin persistencia offline');
    loadUnifiedClientesData();
    clientesSystemInitialized = true;
}

function loadUnifiedClientesData() {
    clientesMap.clear();
    clientesUnificados.forEach(function(cliente) {
        clientesMap.set(cliente.id, Object.assign({}, cliente));
    });
    console.log('✅ Datos unificados de clientes cargados');
}

function loadFromOffline() {
    return new Promise(function(resolve, reject) {
        try {
            if (!window.offlineManager) {
                reject(new Error('OfflineManager no disponible'));
                return;
            }
            
            window.offlineManager.getAllData('clientes')
                .then(function(clientesData) {
                    clientesData.forEach(function(item) {
                        clientesMap.set(item.id, item.data);
                    });
                    
                    console.log('📱 Clientes cargados desde offline: ' + clientesMap.size);
                    resolve();
                })
                .catch(reject);
                
        } catch (error) {
            console.error('❌ Error cargando desde offline:', error);
            reject(error);
        }
    });
}

// ==========================================
// GESTIÓN DE CLIENTES
// ==========================================

function crearCliente(datos) {
    return new Promise(function(resolve, reject) {
        try {
            var id = generateClienteId();
            var cliente = {
                id: id,
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
                usuarioId: getCurrentUserId(),
                createdAt: new Date().toISOString()
            };

            clientesMap.set(id, cliente);
            
            // Guardar offline
            if (clientesOfflineAvailable && window.offlineManager) {
                window.offlineManager.saveData('clientes', id, cliente)
                    .catch(function(error) {
                        console.warn('Advertencia guardando offline:', error);
                    });
            }

            // Sincronizar con Firebase si está disponible
            if (window.db && window.auth && window.auth.currentUser) {
                window.db.collection('clientes').add(cliente)
                    .then(function() {
                        console.log('Cliente guardado en Firebase');
                    })
                    .catch(function(error) {
                        console.warn('Error guardando en Firebase:', error);
                    });
            }

            // Sincronizar con otros módulos
            sincronizarClienteConModulos(cliente, 'created');
            
            dispatchClientesEvent('clienteCreated', { cliente: cliente });
            
            console.log('✅ Cliente creado: ' + cliente.nombre);
            resolve(cliente);
            
        } catch (error) {
            console.error('❌ Error creando cliente:', error);
            reject(error);
        }
    });
}

function actualizarCliente(id, datos) {
    return new Promise(function(resolve, reject) {
        try {
            var cliente = clientesMap.get(id);
            if (!cliente) {
                reject(new Error('Cliente no encontrado: ' + id));
                return;
            }

            var clienteActualizado = Object.assign({}, cliente, datos, {
                updatedAt: new Date().toISOString()
            });

            clientesMap.set(id, clienteActualizado);
            
            // Guardar offline
            if (clientesOfflineAvailable && window.offlineManager) {
                window.offlineManager.saveData('clientes', id, clienteActualizado)
                    .catch(function(error) {
                        console.warn('Advertencia guardando offline:', error);
                    });
            }

            // Sincronizar con otros módulos
            sincronizarClienteConModulos(clienteActualizado, 'updated');
            
            dispatchClientesEvent('clienteUpdated', { cliente: clienteActualizado });
            
            console.log('✅ Cliente actualizado: ' + clienteActualizado.nombre);
            resolve(clienteActualizado);
            
        } catch (error) {
            console.error('❌ Error actualizando cliente:', error);
            reject(error);
        }
    });
}

function obtenerCliente(id) {
    return clientesMap.get(id) || null;
}

function obtenerTodosClientes(filtros) {
    filtros = filtros || {};
    
    var clientesList = Array.from(clientesMap.values()).filter(function(c) {
        return c.activo;
    });
    
    if (filtros.tipo) {
        clientesList = clientesList.filter(function(c) {
            return c.tipo === filtros.tipo;
        });
    }
    
    if (filtros.calificacion) {
        clientesList = clientesList.filter(function(c) {
            return c.calificacion === filtros.calificacion;
        });
    }
    
    return clientesList.sort(function(a, b) {
        return a.nombre.localeCompare(b.nombre);
    });
}

function obtenerParaSelectores() {
    return obtenerTodosClientes().map(function(cliente) {
        return {
            id: cliente.id,
            nombre: cliente.nombre,
            empresa: cliente.empresa,
            displayName: cliente.nombre + ' - ' + cliente.empresa
        };
    });
}

// ==========================================
// ACTUALIZACIÓN DE MÉTRICAS
// ==========================================

function actualizarMetricasVenta(clienteId, montoVenta) {
    return new Promise(function(resolve) {
        try {
            var cliente = clientesMap.get(clienteId);
            if (!cliente) {
                resolve();
                return;
            }

            cliente.totalVentas += montoVenta;
            cliente.ultimaCompra = new Date().toISOString().split('T')[0];
            
            // Actualizar calificación
            cliente.calificacion = calcularCalificacion(cliente);
            
            actualizarCliente(clienteId, cliente)
                .then(resolve)
                .catch(function(error) {
                    console.error('❌ Error actualizando métricas de venta:', error);
                    resolve();
                });
            
        } catch (error) {
            console.error('❌ Error actualizando métricas de venta:', error);
            resolve();
        }
    });
}

function actualizarMetricasNegocio(clienteId, valorNegocio, estado) {
    return new Promise(function(resolve) {
        try {
            var cliente = clientesMap.get(clienteId);
            if (!cliente) {
                resolve();
                return;
            }

            if (estado === 'cerrado') {
                cliente.totalNegocios += 1;
            }
            
            cliente.calificacion = calcularCalificacion(cliente);
            
            actualizarCliente(clienteId, cliente)
                .then(resolve)
                .catch(function(error) {
                    console.error('❌ Error actualizando métricas de negocio:', error);
                    resolve();
                });
            
        } catch (error) {
            console.error('❌ Error actualizando métricas de negocio:', error);
            resolve();
        }
    });
}

function calcularCalificacion(cliente) {
    var puntos = 0;
    
    // Puntos por volumen de ventas
    if (cliente.totalVentas > 150000) puntos += 3;
    else if (cliente.totalVentas > 75000) puntos += 2;
    else if (cliente.totalVentas > 25000) puntos += 1;
    
    // Puntos por frecuencia
    if (cliente.totalNegocios > 2) puntos += 2;
    else if (cliente.totalNegocios > 0) puntos += 1;
    
    // Puntos por antigüedad
    var mesesActivo = calcularMesesActivo(cliente.fechaRegistro);
    if (mesesActivo > 6) puntos += 1;
    
    // Convertir a calificación
    if (puntos >= 5) return 'AAA';
    if (puntos >= 3) return 'AA';
    if (puntos >= 1) return 'A';
    return 'B';
}

function calcularMesesActivo(fechaRegistro) {
    var hoy = new Date();
    var registro = new Date(fechaRegistro);
    return Math.floor((hoy - registro) / (1000 * 60 * 60 * 24 * 30));
}

// ==========================================
// SINCRONIZACIÓN CON MÓDULOS
// ==========================================

function sincronizarClienteConModulos(cliente, accion) {
    try {
        // Sincronizar con ventas
        if (window.ventasManager && window.ventasManager.sincronizarCliente) {
            window.ventasManager.sincronizarCliente(cliente, accion);
        }
        
        // Sincronizar con negocios
        if (window.negociosManager && window.negociosManager.sincronizarCliente) {
            window.negociosManager.sincronizarCliente(cliente, accion);
        }
        
        console.log('🔄 Cliente sincronizado: ' + cliente.nombre);
        
    } catch (error) {
        console.error('❌ Error sincronizando cliente:', error);
    }
}

function validarCoherencia() {
    var errores = [];
    
    // Validar datos requeridos
    clientesMap.forEach(function(cliente, id) {
        if (!cliente.nombre || !cliente.telefono) {
            errores.push({
                tipo: 'datos_incompletos',
                clienteId: id,
                mensaje: 'Cliente ' + id + ' tiene datos incompletos'
            });
        }
    });
    
    return errores;
}

// ==========================================
// UTILIDADES
// ==========================================

function generateClienteId() {
    var timestamp = Date.now().toString(36);
    var random = Math.random().toString(36).substr(2, 5);
    return ('CLI_' + timestamp + '_' + random).toUpperCase();
}

function getCurrentUserId() {
    if (window.auth && window.auth.currentUser) {
        return window.auth.currentUser.uid;
    }
    return 'anonymous_user';
}

function dispatchClientesEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, {
        detail: Object.assign({}, data, {
            timestamp: Date.now(),
            source: 'clientesManager'
        })
    }));
}

function getClientesStatus() {
    return {
        initialized: clientesSystemInitialized,
        offlineAvailable: clientesOfflineAvailable,
        clientesCount: clientesMap.size,
        clientesActivos: Array.from(clientesMap.values()).filter(function(c) {
            return c.activo;
        }).length
    };
}

// ==========================================
// INICIALIZACIÓN Y EXPOSICIÓN GLOBAL
// ==========================================

// Manager global de clientes
window.clientesManager = {
    // Estado
    getStatus: getClientesStatus,
    
    // Gestión de clientes
    crearCliente: crearCliente,
    actualizarCliente: actualizarCliente,
    obtenerCliente: obtenerCliente,
    obtenerTodos: obtenerTodosClientes,
    obtenerParaSelectores: obtenerParaSelectores,
    
    // Actualización de métricas
    actualizarMetricasVenta: actualizarMetricasVenta,
    actualizarMetricasNegocio: actualizarMetricasNegocio,
    
    // Utilidades
    validarCoherencia: validarCoherencia,
    sincronizarCliente: sincronizarClienteConModulos
};

// Funciones globales de conveniencia
window.crearCliente = crearCliente;
window.obtenerCliente = obtenerCliente;
window.obtenerTodosClientes = obtenerTodosClientes;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initClientesManager()
        .then(function() {
            console.log('👥 ClientesManager disponible globalmente');
        })
        .catch(function(error) {
            console.error('Error inicializando ClientesManager:', error);
        });
});

console.log('👥 Sistema de clientes cargado correctamente');
