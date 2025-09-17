/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE VENTAS
   Sistema integrado con clientes, precios y gastos
   ======================================== */

// ==========================================
// SISTEMA DE NOTIFICACIONES
// ==========================================

// Variables globales de notificaciones
let notificationsContainer = null;
let notificationsQueue = [];

function createNotificationManager() {
    createNotificationsContainer();
    
    return {
        show: showNotification,
        hide: hideNotification,
        hideAll: hideAllNotifications,
        success: function(message, duration) { return showNotification(message, 'success', duration || 5000); },
        error: function(message, duration) { return showNotification(message, 'error', duration || 8000); },
        warning: function(message, duration) { return showNotification(message, 'warning', duration || 6000); },
        info: function(message, duration) { return showNotification(message, 'info', duration || 5000); }
    };
}

function createNotificationsContainer() {
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notification-container';
        notificationsContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(notificationsContainer);
    }
}

function showNotification(message, type, duration) {
    type = type || 'info';
    duration = duration || 5000;
    
    var id = Date.now().toString();
    var notification = createNotificationElement(id, message, type, duration);
    
    notificationsQueue.push({ id: id, element: notification, timeout: null });
    notificationsContainer.appendChild(notification);
    
    setTimeout(function() {
        notification.classList.add('show');
    }, 100);
    
    if (duration > 0) {
        var timeout = setTimeout(function() {
            hideNotification(id);
        }, duration);
        
        var notif = notificationsQueue.find(function(n) { return n.id === id; });
        if (notif) notif.timeout = timeout;
    }
    
    return id;
}

function createNotificationElement(id, message, type, duration) {
    var notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.style.pointerEvents = 'auto';
    notification.setAttribute('data-id', id);
    
    var icon = getNotificationIcon(type);
    var title = getNotificationTitle(type);
    
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">
                <i class="fas ${icon}"></i>
                ${title}
            </div>
            <button class="notification-close" onclick="window.notificationManager.hide('${id}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-body">
            ${message}
        </div>
        ${duration > 0 ? `<div class="notification-progress"><div class="progress-bar" style="animation: progress ${duration}ms linear;"></div></div>` : ''}
    `;
    
    return notification;
}

function getNotificationIcon(type) {
    var icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

function getNotificationTitle(type) {
    var titles = {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información'
    };
    return titles[type] || titles.info;
}

function hideNotification(id) {
    var notificationData = notificationsQueue.find(function(n) { return n.id === id; });
    if (!notificationData) return;
    
    var element = notificationData.element;
    var timeout = notificationData.timeout;
    
    if (timeout) {
        clearTimeout(timeout);
    }
    
    element.classList.remove('show');
    
    setTimeout(function() {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        notificationsQueue = notificationsQueue.filter(function(n) { return n.id !== id; });
    }, 300);
}

function hideAllNotifications() {
    notificationsQueue.forEach(function(notif) {
        hideNotification(notif.id);
    });
}

// ==========================================
// SISTEMA PRINCIPAL DE VENTAS INTEGRADO
// ==========================================

// Variables globales del sistema de ventas
let ventasSystemInitialized = false;
let ventasOfflineAvailable = false;

let ventasMap = new Map();
let ventasFiltrosActivos = {
    periodo: 'mes',
    cliente: '',
    estado: '',
    metodoPago: ''
};

let ventasEstadisticas = {
    ingresosDelMes: 0,
    cantidadVendida: 0,
    precioPromedio: 0,
    margenGanancia: 0,
    tendencia: 0,
    costoPromedio: 0,
    rentabilidadReal: 0
};

let ventasIntegrations = {
    clientesManager: false,
    preciosManager: false,
    gastosManager: false
};

// Configuración del sistema
var ventasFincaId = 'finca_la_herradura';
var ventasCurrency = 'GTQ';
var ventasCurrentMonth = new Date().getMonth();
var ventasCurrentYear = new Date().getFullYear();
var ventasCurrentUser = null;

// ==========================================
// INICIALIZACIÓN INTEGRADA
// ==========================================

function initVentasManager() {
    console.log('💰 Inicializando VentasManager integrado...');
    
    return new Promise(function(resolve) {
        waitForFirebaseVentas()
            .then(function() {
                return waitForVentasIntegrations();
            })
            .then(function() {
                return setupVentasAuth();
            })
            .then(function() {
                return cargarVentasDatos();
            })
            .then(function() {
                setupVentasSyncListeners();
                ventasSystemInitialized = true;
                console.log('✅ VentasManager integrado inicializado');
                resolve();
            })
            .catch(function(error) {
                console.error('⚠️ Error inicializando VentasManager:', error);
                initVentasOfflineMode();
                resolve();
            });
    });
}

function waitForFirebaseVentas() {
    return new Promise(function(resolve, reject) {
        var maxWait = 10000;
        var elapsed = 0;
        var interval = 100;
        
        function checkFirebase() {
            if (window.firebase && window.db && window.auth) {
                resolve();
            } else if (elapsed < maxWait) {
                elapsed += interval;
                setTimeout(checkFirebase, interval);
            } else {
                reject(new Error('Firebase timeout'));
            }
        }
        
        checkFirebase();
    });
}

function waitForVentasIntegrations() {
    return new Promise(function(resolve) {
        var maxWait = 15000;
        var startTime = Date.now();
        
        function checkIntegrations() {
            // Verificar ClientesManager
            if (window.clientesManager) {
                ventasIntegrations.clientesManager = true;
            }
            
            // Verificar PreciosManager
            if (window.preciosManager) {
                ventasIntegrations.preciosManager = true;
            }
            
            // Verificar GastosManager
            if (window.expenseManager || window.gastosManager) {
                ventasIntegrations.gastosManager = true;
            }
            
            // Si tenemos al menos ClientesManager, continuar
            if (ventasIntegrations.clientesManager || (Date.now() - startTime > maxWait)) {
                console.log('🔗 Integraciones detectadas:', ventasIntegrations);
                resolve();
            } else {
                setTimeout(checkIntegrations, 200);
            }
        }
        
        checkIntegrations();
    });
}

function setupVentasAuth() {
    return new Promise(function(resolve) {
        if (window.auth) {
            window.auth.onAuthStateChanged(function(user) {
                ventasCurrentUser = user;
                if (user) {
                    console.log('Usuario autenticado en ventas:', user.email);
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}

function setupVentasSyncListeners() {
    // Escuchar cambios de clientes
    window.addEventListener('clienteCreated', function(event) {
        onVentasClienteUpdated(event.detail.cliente, 'created');
    });

    window.addEventListener('clienteUpdated', function(event) {
        onVentasClienteUpdated(event.detail.cliente, 'updated');
    });

    // Escuchar cambios de precios
    window.addEventListener('precioCreated', function(event) {
        onVentasPrecioUpdated(event.detail.precio);
    });

    // Escuchar cambios de gastos
    window.addEventListener('expenseCreated', function(event) {
        recalcularVentasRentabilidad();
    });
}

function initVentasOfflineMode() {
    console.log('📱 VentasManager en modo offline');
    loadVentasOfflineData();
    ventasSystemInitialized = true;
}

// ==========================================
// CARGA DE DATOS INTEGRADA
// ==========================================

function cargarVentasDatos() {
    return new Promise(function(resolve) {
        if (window.db && ventasCurrentUser) {
            loadVentasFromFirebase()
                .then(function() {
                    calcularVentasEstadisticas();
                    resolve();
                })
                .catch(function(error) {
                    console.error('Error cargando datos de ventas:', error);
                    loadVentasOfflineData();
                    resolve();
                });
        } else {
            loadVentasOfflineData();
            resolve();
        }
    });
}

function loadVentasFromFirebase() {
    return new Promise(function(resolve, reject) {
        if (!window.db) {
            reject(new Error('Firestore no disponible'));
            return;
        }
        
        try {
            console.log('Cargando ventas desde Firebase...');
            
            window.db.collection('ventas')
                .where('usuarioId', '==', ventasCurrentUser.uid)
                .limit(100)
                .get()
                .then(function(ventasSnapshot) {
                    var ventasArray = [];
                    ventasSnapshot.forEach(function(doc) {
                        var data = doc.data();
                        ventasArray.push({
                            id: doc.id,
                            fecha: data.fecha,
                            cliente: data.cliente || 'Cliente no especificado',
                            clienteId: data.clienteId,
                            cantidad: Number(data.cantidad) || 0,
                            precioKg: Number(data.precioKg) || 0,
                            total: Number(data.total) || 0,
                            metodoPago: data.metodoPago || 'efectivo',
                            estado: data.estado || 'completada'
                        });
                    });
                    
                    // Filtrar y ordenar
                    var inicioMes = getVentasStartOfMonth();
                    var finMes = getVentasEndOfMonth();
                    
                    var ventasFiltradas = ventasArray
                        .filter(function(venta) {
                            return venta.fecha >= inicioMes && venta.fecha <= finMes;
                        })
                        .sort(function(a, b) {
                            return new Date(b.fecha) - new Date(a.fecha);
                        });
                    
                    ventasFiltradas.forEach(function(venta) {
                        ventasMap.set(venta.id, venta);
                    });
                    
                    console.log('Ventas cargadas: ' + ventasFiltradas.length);
                    resolve();
                })
                .catch(reject);
                
        } catch (error) {
            console.error('Error cargando desde Firebase:', error);
            reject(error);
        }
    });
}

function loadVentasOfflineData() {
    try {
        if (window.offlineManager) {
            window.offlineManager.getAllData('ventas')
                .then(function(ventasData) {
                    ventasData.forEach(function(item) {
                        ventasMap.set(item.id, item.data);
                    });
                })
                .catch(function(error) {
                    console.error('Error cargando datos offline:', error);
                    generarVentasDatosEjemplo();
                });
        } else {
            loadVentasFromLocalStorage();
        }
        
        if (ventasMap.size === 0) {
            generarVentasDatosEjemplo();
        }
        
    } catch (error) {
        console.error('Error cargando datos offline:', error);
        generarVentasDatosEjemplo();
    }
}

function loadVentasFromLocalStorage() {
    try {
        var ventasLS = localStorage.getItem('finca_ventas');
        if (ventasLS) {
            var ventas = JSON.parse(ventasLS);
            ventas.forEach(function(venta) {
                ventasMap.set(venta.id, venta);
            });
        }
    } catch (error) {
        console.error('Error cargando desde localStorage:', error);
    }
}

// ==========================================
// GESTIÓN DE VENTAS CON VALIDACIONES
// ==========================================

function registrarVenta(datos) {
    return new Promise(function(resolve, reject) {
        try {
            var ventaId = generateVentaId();
            var fechaActual = new Date();
            
            // Validar cliente
            if (ventasIntegrations.clientesManager && datos.clienteId) {
                var cliente = window.clientesManager.obtenerCliente(datos.clienteId);
                if (!cliente) {
                    reject(new Error('Cliente no válido'));
                    return;
                }
                datos.cliente = cliente.nombre;
            }
            
            // Validar precio contra mercado
            if (ventasIntegrations.preciosManager) {
                validarVentaPrecioVenta(datos.precioKg, datos.cantidad)
                    .then(function(validacionPrecio) {
                        if (!validacionPrecio.valido && window.notificationManager) {
                            window.notificationManager.warning(validacionPrecio.mensaje);
                        }
                        continuarRegistro();
                    })
                    .catch(function() {
                        continuarRegistro();
                    });
            } else {
                continuarRegistro();
            }
            
            function continuarRegistro() {
                var venta = {
                    id: ventaId,
                    fecha: datos.fecha || fechaActual.toISOString().split('T')[0],
                    clienteId: datos.clienteId,
                    cliente: datos.cliente || 'Cliente no especificado',
                    cantidad: Number(datos.cantidad),
                    precioKg: Number(datos.precioKg),
                    total: Number(datos.cantidad) * Number(datos.precioKg),
                    metodoPago: datos.metodoPago || 'efectivo',
                    estado: 'completada',
                    fechaCreacion: fechaActual.toISOString(),
                    fechaModificacion: fechaActual.toISOString(),
                    usuarioId: ventasCurrentUser ? ventasCurrentUser.uid : 'anonymous',
                    
                    // Campos calculados
                    costoEstimado: 0,
                    margenReal: 0,
                    rentabilidad: 0
                };
                
                // Calcular rentabilidad real
                if (ventasIntegrations.gastosManager) {
                    calcularVentaRentabilidadReal(venta)
                        .then(function(rentabilidad) {
                            venta.costoEstimado = rentabilidad.costoTotal;
                            venta.margenReal = rentabilidad.margen;
                            venta.rentabilidad = rentabilidad.ganancia;
                            finalizarRegistro();
                        })
                        .catch(function() {
                            finalizarRegistro();
                        });
                } else {
                    finalizarRegistro();
                }
                
                function finalizarRegistro() {
                    ventasMap.set(ventaId, venta);
                    
                    // Guardar offline
                    if (window.offlineManager) {
                        window.offlineManager.saveData('ventas', ventaId, venta)
                            .catch(function(error) {
                                console.warn('Error guardando offline:', error);
                            });
                    } else {
                        saveVentasToLocalStorage();
                    }
                    
                    // Sincronizar con Firebase
                    if (window.db && ventasCurrentUser) {
                        sincronizarVentaConFirebase(ventaId, venta)
                            .catch(function(error) {
                                console.warn('Error sincronizando con Firebase:', error);
                            });
                    }
                    
                    // Actualizar métricas del cliente
                    if (ventasIntegrations.clientesManager && datos.clienteId) {
                        window.clientesManager.actualizarMetricasVenta(datos.clienteId, venta.total);
                    }
                    
                    calcularVentasEstadisticas();
                    broadcastVentasUpdate('venta_creada', venta);
                    
                    if (window.notificationManager) {
                        var mensaje = 'Venta registrada: ' + venta.cantidad + ' kg a ' + venta.cliente;
                        window.notificationManager.success(mensaje);
                    }
                    
                    resolve(venta);
                }
            }
            
        } catch (error) {
            console.error('Error registrando venta:', error);
            if (window.notificationManager) {
                window.notificationManager.error('Error al registrar la venta');
            }
            reject(error);
        }
    });
}

function validarVentaPrecioVenta(precioIngresado, cantidad) {
    return new Promise(function(resolve) {
        if (!ventasIntegrations.preciosManager) {
            resolve({ valido: true, mensaje: 'Sistema de precios no disponible' });
            return;
        }
        
        try {
            var preciosActuales = window.preciosManager.obtenerResumenPrecios();
            var precioMercado = preciosActuales.mercados.finca || preciosActuales.actual;
            
            var diferencia = Math.abs(precioIngresado - precioMercado) / precioMercado * 100;
            
            if (precioIngresado < precioMercado * 0.8) {
                resolve({
                    valido: false,
                    mensaje: 'Precio bajo: Q' + precioIngresado + ' vs mercado Q' + precioMercado.toFixed(2),
                    sugerencia: precioMercado
                });
                return;
            }
            
            if (diferencia > 30) {
                resolve({
                    valido: false,
                    mensaje: 'Precio difiere ' + diferencia.toFixed(1) + '% del mercado'
                });
                return;
            }
            
            resolve({ valido: true, mensaje: 'Precio validado contra mercado' });
            
        } catch (error) {
            console.error('Error validando precio:', error);
            resolve({ valido: true, mensaje: 'No se pudo validar precio' });
        }
    });
}

function calcularVentaRentabilidadReal(venta) {
    return new Promise(function(resolve) {
        if (!ventasIntegrations.gastosManager) {
            resolve({
                costoTotal: 0,
                margen: 0,
                ganancia: venta.total
            });
            return;
        }
        
        try {
            calcularVentasCostoPorKg()
                .then(function(gastosPorKg) {
                    var costoTotal = venta.cantidad * gastosPorKg;
                    var ingresoTotal = venta.total;
                    var ganancia = ingresoTotal - costoTotal;
                    var margen = ingresoTotal > 0 ? (ganancia / ingresoTotal) * 100 : 0;
                    
                    resolve({
                        costoTotal: Math.round(costoTotal * 100) / 100,
                        margen: Math.round(margen * 100) / 100,
                        ganancia: Math.round(ganancia * 100) / 100
                    });
                })
                .catch(function(error) {
                    console.error('Error calculando rentabilidad:', error);
                    resolve({
                        costoTotal: 0,
                        margen: 0,
                        ganancia: venta.total
                    });
                });
            
        } catch (error) {
            console.error('Error calculando rentabilidad:', error);
            resolve({
                costoTotal: 0,
                margen: 0,
                ganancia: venta.total
            });
        }
    });
}

function calcularVentasCostoPorKg() {
    return new Promise(function(resolve) {
        if (!ventasIntegrations.gastosManager) {
            resolve(8.50); // Costo estimado por defecto
            return;
        }
        
        try {
            var gestor = window.expenseManager || window.gastosManager;
            var gastosDelMes = gestor.getFinancialSummary ? 
                gestor.getFinancialSummary('month') : 
                { total: 25000 }; // Fallback
            
            var produccionEstimada = 1000; // kg por mes
            resolve(gastosDelMes.total / produccionEstimada);
            
        } catch (error) {
            console.error('Error calculando costo por kg:', error);
            resolve(8.50);
        }
    });
}

function sincronizarVentaConFirebase(ventaId, venta) {
    return new Promise(function(resolve, reject) {
        if (!window.db) {
            reject(new Error('Firestore no disponible'));
            return;
        }
        
        try {
            window.db.collection('ventas').doc(ventaId).set({
                fecha: venta.fecha,
                clienteId: venta.clienteId,
                cliente: venta.cliente,
                cantidad: venta.cantidad,
                precioKg: venta.precioKg,
                total: venta.total,
                metodoPago: venta.metodoPago,
                estado: venta.estado,
                costoEstimado: venta.costoEstimado,
                margenReal: venta.margenReal,
                rentabilidad: venta.rentabilidad,
                fechaCreacion: firebase.firestore.Timestamp.fromDate(new Date(venta.fechaCreacion)),
                fechaModificacion: firebase.firestore.Timestamp.fromDate(new Date(venta.fechaModificacion)),
                usuarioId: venta.usuarioId
            })
            .then(function() {
                console.log('Venta ' + ventaId + ' sincronizada con Firebase');
                resolve();
            })
            .catch(reject);
            
        } catch (error) {
            console.error('Error sincronizando venta ' + ventaId + ':', error);
            reject(error);
        }
    });
}

// ==========================================
// CÁLCULOS Y ESTADÍSTICAS INTEGRADAS
// ==========================================

function calcularVentasEstadisticas() {
    var ventasActivas = Array.from(ventasMap.values()).filter(function(venta) {
        return venta.estado === 'completada';
    });
    var ventasDelMes = getVentasDelMes();
    var ventasMesAnterior = getVentasMesAnterior();
    
    // Cálculos básicos
    ventasEstadisticas.ingresosDelMes = ventasDelMes.reduce(function(sum, v) {
        return sum + v.total;
    }, 0);
    ventasEstadisticas.cantidadVendida = ventasDelMes.reduce(function(sum, v) {
        return sum + v.cantidad;
    }, 0);
    ventasEstadisticas.precioPromedio = ventasDelMes.length > 0 
        ? ventasDelMes.reduce(function(sum, v) { return sum + v.precioKg; }, 0) / ventasDelMes.length
        : 0;
    
    // Cálculos avanzados con integración de gastos
    if (ventasIntegrations.gastosManager) {
        var costosReales = ventasDelMes.filter(function(v) { return v.costoEstimado > 0; });
        if (costosReales.length > 0) {
            ventasEstadisticas.costoPromedio = costosReales.reduce(function(sum, v) {
                return sum + v.costoEstimado;
            }, 0) / costosReales.length;
            ventasEstadisticas.margenGanancia = costosReales.reduce(function(sum, v) {
                return sum + v.margenReal;
            }, 0) / costosReales.length;
            ventasEstadisticas.rentabilidadReal = costosReales.reduce(function(sum, v) {
                return sum + v.rentabilidad;
            }, 0);
        }
    } else {
        // Estimación sin datos de gastos
        ventasEstadisticas.margenGanancia = 35; // Estimado
        ventasEstadisticas.costoPromedio = 8.50;
    }
    
    // Tendencia
    var ingresosMesAnterior = ventasMesAnterior.reduce(function(sum, v) {
        return sum + v.total;
    }, 0);
    if (ingresosMesAnterior > 0) {
        ventasEstadisticas.tendencia = ((ventasEstadisticas.ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100;
    } else {
        ventasEstadisticas.tendencia = ventasEstadisticas.ingresosDelMes > 0 ? 100 : 0;
    }
}

function calcularVentasMetricas() {
    calcularVentasEstadisticas();
    return {
        ingresosDelMes: ventasEstadisticas.ingresosDelMes,
        cantidadVendida: ventasEstadisticas.cantidadVendida,
        precioPromedio: ventasEstadisticas.precioPromedio,
        margenGanancia: ventasEstadisticas.margenGanancia,
        tendencia: ventasEstadisticas.tendencia,
        costoPromedio: ventasEstadisticas.costoPromedio,
        rentabilidadReal: ventasEstadisticas.rentabilidadReal
    };
}

function recalcularVentasRentabilidad() {
    var ventasArray = Array.from(ventasMap.values());
    
    var promises = ventasArray.map(function(venta) {
        return new Promise(function(resolve) {
            if (venta.estado === 'completada') {
                calcularVentaRentabilidadReal(venta)
                    .then(function(rentabilidad) {
                        venta.costoEstimado = rentabilidad.costoTotal;
                        venta.margenReal = rentabilidad.margen;
                        venta.rentabilidad = rentabilidad.ganancia;
                        
                        ventasMap.set(venta.id, venta);
                        resolve();
                    })
                    .catch(function() {
                        resolve();
                    });
            } else {
                resolve();
            }
        });
    });
    
    Promise.all(promises)
        .then(function() {
            calcularVentasEstadisticas();
            console.log('📊 Rentabilidad recalculada para todas las ventas');
        })
        .catch(function(error) {
            console.error('Error recalculando rentabilidad:', error);
        });
}

// ==========================================
// OBTENCIÓN DE DATOS INTEGRADA
// ==========================================

function getVentasDelMes() {
    var inicio = getVentasStartOfMonth();
    var fin = getVentasEndOfMonth();
    
    return Array.from(ventasMap.values()).filter(function(venta) {
        return venta.fecha >= inicio && venta.fecha <= fin && venta.estado === 'completada';
    });
}

function getVentasMesAnterior() {
    var inicioMesAnterior = getVentasStartOfPreviousMonth();
    var finMesAnterior = getVentasEndOfPreviousMonth();
    
    return Array.from(ventasMap.values()).filter(function(venta) {
        return venta.fecha >= inicioMesAnterior && venta.fecha <= finMesAnterior && venta.estado === 'completada';
    });
}

function obtenerVentasFiltradas() {
    var ventas = Array.from(ventasMap.values());
    
    if (ventasFiltrosActivos.cliente) {
        ventas = ventas.filter(function(v) { return v.clienteId === ventasFiltrosActivos.cliente; });
    }
    
    if (ventasFiltrosActivos.estado) {
        ventas = ventas.filter(function(v) { return v.estado === ventasFiltrosActivos.estado; });
    }
    
    if (ventasFiltrosActivos.metodoPago) {
        ventas = ventas.filter(function(v) { return v.metodoPago === ventasFiltrosActivos.metodoPago; });
    }
    
    // Filtro por período
    var fechaInicio = getFechaInicioPeriodo(ventasFiltrosActivos.periodo);
    ventas = ventas.filter(function(v) { return v.fecha >= fechaInicio; });
    
    return ventas.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
}

function obtenerClientesRecientes() {
    if (ventasIntegrations.clientesManager) {
        return window.clientesManager.obtenerTodos()
            .filter(function(cliente) { return cliente.totalVentas > 0; })
            .sort(function(a, b) { return new Date(b.ultimaCompra || 0) - new Date(a.ultimaCompra || 0); })
            .slice(0, 5)
            .map(function(cliente) {
                return {
                    id: cliente.id,
                    nombre: cliente.nombre,
                    totalCompras: cliente.totalVentas,
                    ultimaCompra: cliente.totalVentas > 0 ? 'Q' + cliente.totalVentas.toLocaleString() : 'Sin ventas',
                    fechaUltimaCompra: cliente.ultimaCompra
                };
            });
    }
    
    // Fallback sin ClientesManager
    var ventasRecientes = Array.from(ventasMap.values())
        .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); })
        .slice(0, 10);
    
    var clientesMap = new Map();
    
    ventasRecientes.forEach(function(venta) {
        if (!clientesMap.has(venta.clienteId)) {
            clientesMap.set(venta.clienteId, {
                id: venta.clienteId,
                nombre: venta.cliente,
                totalCompras: calcularVentasTotalComprasCliente(venta.clienteId),
                ultimaCompra: venta.cantidad + ' kg',
                fechaUltimaCompra: venta.fecha
            });
        }
    });
    
    return Array.from(clientesMap.values()).slice(0, 5);
}

function obtenerVentasListaClientes() {
    if (ventasIntegrations.clientesManager) {
        return window.clientesManager.obtenerParaSelectores();
    }
    
    // Fallback: extraer de ventas existentes
    var clientesUnicos = new Map();
    Array.from(ventasMap.values()).forEach(function(venta) {
        if (venta.clienteId && !clientesUnicos.has(venta.clienteId)) {
            clientesUnicos.set(venta.clienteId, {
                id: venta.clienteId,
                nombre: venta.cliente,
                displayName: venta.cliente
            });
        }
    });
    
    return Array.from(clientesUnicos.values());
}

function obtenerVentasCliente(clienteId) {
    if (ventasIntegrations.clientesManager) {
        return window.clientesManager.obtenerCliente(clienteId);
    }
    
    return null;
}

// ==========================================
// FUNCIONES DE EVENTOS DE SINCRONIZACIÓN
// ==========================================

function onVentasClienteUpdated(cliente, accion) {
    console.log('🔄 Cliente ' + accion + ' en ventas:', cliente.nombre);
    
    // Actualizar ventas relacionadas
    Array.from(ventasMap.values()).forEach(function(venta) {
        if (venta.clienteId === cliente.id) {
            venta.cliente = cliente.nombre;
            ventasMap.set(venta.id, venta);
        }
    });
}

function onVentasPrecioUpdated(precio) {
    console.log('💰 Precio actualizado en ventas:', precio);
    
    // Podrías recalcular márgenes o mostrar alertas
    if (window.notificationManager) {
        window.notificationManager.info('Precios de mercado actualizados');
    }
}

// Función para sincronizar desde ClientesManager
function sincronizarVentasCliente(cliente, accion) {
    onVentasClienteUpdated(cliente, accion);
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function calcularVentasTotalComprasCliente(clienteId) {
    return Array.from(ventasMap.values())
        .filter(function(v) { return v.clienteId === clienteId; })
        .reduce(function(sum, v) { return sum + v.total; }, 0);
}

function aplicarVentasFiltros(filtros) {
    ventasFiltrosActivos = Object.assign({}, ventasFiltrosActivos, filtros);
}

function getFechaInicioPeriodo(periodo) {
    var ahora = new Date();
    
    switch (periodo) {
        case 'hoy':
            return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString().split('T')[0];
        case 'semana':
            return new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        case 'mes':
            return getVentasStartOfMonth();
        case 'trimestre':
            return new Date(ahora.getFullYear(), Math.floor(ahora.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
        case 'ano':
            return new Date(ahora.getFullYear(), 0, 1).toISOString().split('T')[0];
        default:
            return getVentasStartOfMonth();
    }
}

function generateVentaId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getVentasStartOfMonth() {
    return new Date(ventasCurrentYear, ventasCurrentMonth, 1).toISOString().split('T')[0];
}

function getVentasEndOfMonth() {
    return new Date(ventasCurrentYear, ventasCurrentMonth + 1, 0).toISOString().split('T')[0];
}

function getVentasStartOfPreviousMonth() {
    return new Date(ventasCurrentYear, ventasCurrentMonth - 1, 1).toISOString().split('T')[0];
}

function getVentasEndOfPreviousMonth() {
    return new Date(ventasCurrentYear, ventasCurrentMonth, 0).toISOString().split('T')[0];
}

// ==========================================
// PERSISTENCIA
// ==========================================

function saveVentasToLocalStorage() {
    try {
        localStorage.setItem('finca_ventas', JSON.stringify(Array.from(ventasMap.values())));
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
    }
}

// ==========================================
// FUNCIONES AVANZADAS INTEGRADAS
// ==========================================

function identificarVentasOportunidades() {
    return new Promise(function(resolve) {
        var oportunidades = [];
        
        if (ventasIntegrations.clientesManager) {
            var clientes = window.clientesManager.obtenerTodos();
            
            // Clientes sin compras recientes
            clientes.forEach(function(cliente) {
                if (cliente.ultimaCompra) {
                    var ultimaCompra = new Date(cliente.ultimaCompra);
                    var diasSinCompra = (new Date() - ultimaCompra) / (1000 * 60 * 60 * 24);
                    
                    if (diasSinCompra > 14 && cliente.totalVentas > 10000) {
                        oportunidades.push({
                            titulo: 'Cliente frecuente sin pedido reciente',
                            descripcion: cliente.nombre + ' no ha realizado pedidos en ' + Math.floor(diasSinCompra) + ' días',
                            valorPotencial: Math.round(cliente.totalVentas * 0.1),
                            icono: 'fa-user-clock'
                        });
                    }
                }
            });
        }
        
        // Oportunidades de precio
        if (ventasIntegrations.preciosManager) {
            var resumenPrecios = window.preciosManager.obtenerResumenPrecios();
            var precioActual = ventasEstadisticas.precioPromedio;
            
            if (precioActual < resumenPrecios.actual * 0.9) {
                oportunidades.push({
                    titulo: 'Oportunidad de incremento de precio',
                    descripcion: 'Precio actual (Q' + precioActual.toFixed(2) + ') por debajo del mercado (Q' + resumenPrecios.actual.toFixed(2) + ')',
                    valorPotencial: Math.round((resumenPrecios.actual - precioActual) * ventasEstadisticas.cantidadVendida),
                    icono: 'fa-chart-line'
                });
            }
        }
        
        resolve(oportunidades);
    });
}

function generarVentasPrediccionesIA() {
    return new Promise(function(resolve) {
        var predicciones = [];
        
        // Predicción basada en tendencia
        var tendencia = ventasEstadisticas.tendencia;
        var ingresosActuales = ventasEstadisticas.ingresosDelMes;
        var proyeccionProximoMes = ingresosActuales * (1 + tendencia / 100);
        
        predicciones.push({
            titulo: 'Ingresos próximo mes',
            valor: 'Q ' + Math.round(proyeccionProximoMes).toLocaleString(),
            confianza: tendencia > 0 ? 85 : 70,
            descripcion: 'Basado en tendencia actual',
            color: tendencia > 0 ? '#22c55e' : '#f59e0b'
        });
        
        // Mejor día para vender (basado en datos históricos)
        var ventasPorDia = Array.from(ventasMap.values()).reduce(function(acc, venta) {
            var dia = new Date(venta.fecha).getDay();
            acc[dia] = (acc[dia] || 0) + venta.total;
            return acc;
        }, {});
        
        var mejorDia = Object.entries(ventasPorDia).sort(function(a, b) { return b[1] - a[1]; })[0];
        var nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        if (mejorDia) {
            predicciones.push({
                titulo: 'Mejor día para vender',
                valor: nombresDias[mejorDia[0]],
                confianza: 78,
                descripcion: 'Análisis de patrones históricos',
                color: '#3b82f6'
            });
        }
        
        // Cliente más rentable
        if (ventasIntegrations.clientesManager) {
            var clientesMasRentables = window.clientesManager.obtenerTodos()
                .sort(function(a, b) { return b.totalVentas - a.totalVentas; })[0];
            
            if (clientesMasRentables) {
                predicciones.push({
                    titulo: 'Cliente más rentable',
                    valor: clientesMasRentables.nombre,
                    confianza: 92,
                    descripcion: 'Mayor volumen y frecuencia',
                    color: '#f59e0b'
                });
            }
        }
        
        resolve(predicciones);
    });
}

// ==========================================
// DATOS DE EJEMPLO INTEGRADOS
// ==========================================

function generarVentasDatosEjemplo() {
    console.log('Generando datos de ejemplo integrados...');
    
    // Usar clientes del ClientesManager si está disponible
    var clientesDisponibles = [];
    if (ventasIntegrations.clientesManager) {
        clientesDisponibles = window.clientesManager.obtenerTodos();
    } else {
        // Fallback: clientes de ejemplo
        clientesDisponibles = [
            { id: 'CLI_001', nombre: 'María González', empresa: 'Exportadora Maya' },
            { id: 'CLI_002', nombre: 'Carlos Ruiz', empresa: 'Supermercados Paiz' },
            { id: 'CLI_003', nombre: 'Ana López', empresa: 'Alimentos La Pradera' }
        ];
    }
    
    // Generar ventas de ejemplo
    for (var i = 0; i < 15; i++) {
        var cliente = clientesDisponibles[Math.floor(Math.random() * clientesDisponibles.length)];
        var cantidad = Math.random() * 500 + 50;
        var precioKg = Math.random() * 5 + 8;
        var fecha = new Date();
        fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 30));
        
        var venta = {
            id: generateVentaId(),
            fecha: fecha.toISOString().split('T')[0],
            clienteId: cliente.id,
            cliente: cliente.nombre,
            cantidad: Math.round(cantidad * 10) / 10,
            precioKg: Math.round(precioKg * 100) / 100,
            total: Math.round(cantidad * precioKg * 100) / 100,
            metodoPago: ['efectivo', 'transferencia', 'credito'][Math.floor(Math.random() * 3)],
            estado: 'completada',
            costoEstimado: Math.round(cantidad * 8.5 * 100) / 100,
            margenReal: Math.round(((precioKg - 8.5) / precioKg) * 100 * 100) / 100,
            rentabilidad: Math.round(cantidad * (precioKg - 8.5) * 100) / 100
        };
        
        ventasMap.set(venta.id, venta);
    }
    
    calcularVentasEstadisticas();
}

// ==========================================
// COMUNICACIÓN
// ==========================================

function broadcastVentasUpdate(evento, datos) {
    window.dispatchEvent(new CustomEvent('ventasUpdate', {
        detail: { evento: evento, datos: datos, timestamp: Date.now() }
    }));
    
    // También disparar evento específico
    window.dispatchEvent(new CustomEvent(evento, {
        detail: { venta: datos, timestamp: Date.now() }
    }));
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Manager global de ventas
window.ventasManager = {
    // Estado
    getStatus: function() {
        return {
            initialized: ventasSystemInitialized,
            offlineAvailable: ventasOfflineAvailable,
            ventasCount: ventasMap.size,
            integrations: ventasIntegrations
        };
    },
    
    // Gestión de ventas
    registrarVenta: registrarVenta,
    calcularMetricas: calcularVentasMetricas,
    obtenerVentasFiltradas: obtenerVentasFiltradas,
    obtenerClientesRecientes: obtenerClientesRecientes,
    obtenerListaClientes: obtenerVentasListaClientes,
    aplicarFiltros: aplicarVentasFiltros,
    
    // Análisis avanzado
    identificarOportunidades: identificarVentasOportunidades,
    generarPrediccionesIA: generarVentasPrediccionesIA,
    
    // Sincronización
    sincronizarCliente: sincronizarVentasCliente,
    
    // Datos directos
    get ventas() { return Array.from(ventasMap.values()); }
};

// Funciones globales de conveniencia
window.mostrarNotificacion = function(mensaje, tipo) {
    if (window.notificationManager) {
        window.notificationManager.show(mensaje, tipo);
    } else {
        console.log(tipo.toUpperCase() + ': ' + mensaje);
    }
};

window.actualizarMetricas = function() {
    if (window.ventasManager) {
        var metricas = window.ventasManager.calcularMetricas();
        
        var elementos = {
            'ingresosDelMes': 'Q ' + metricas.ingresosDelMes.toLocaleString(),
            'cantidadVendida': metricas.cantidadVendida.toLocaleString() + ' kg',
            'precioPromedio': 'Q ' + metricas.precioPromedio.toFixed(2),
            'margenGanancia': metricas.margenGanancia.toFixed(1) + '%'
        };
        
        Object.entries(elementos).forEach(function(entry) {
            var id = entry[0];
            var valor = entry[1];
            var elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        });
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Crear gestor de notificaciones primero
    window.notificationManager = createNotificationManager();
    
    // Crear gestor de ventas
    initVentasManager()
        .then(function() {
            console.log('💰 VentasManager integrado disponible globalmente');
        })
        .catch(function(error) {
            console.error('Error inicializando VentasManager:', error);
        });
});

console.log('💰 Sistema de ventas integrado cargado correctamente');
