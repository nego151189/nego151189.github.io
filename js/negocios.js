/* ========================================
   FINCA LA HERRADURA - SISTEMA DE NEGOCIOS
   Sistema integrado con gestión unificada de clientes
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let negociosSystemInitialized = false;
let negociosOfflineAvailable = false;

// Datos en memoria
let negociosData = [];
let contratosData = [];
let actividadesData = [];
let negociosMetricas = {
  ventasTotales: 125500,
  negociosActivos: 12,
  clientesActivos: 8,
  tasaConversion: 68,
  cicloPromedio: 21,
  cambioVentas: 15,
  cambioNegocios: 3,
  cambioClientes: 2,
  cambioConversion: 5,
  cambioCiclo: -3
};

// Datos de ejemplo vinculados con ClientesManager
const negociosEjemplo = [
  {
    id: 'NEG_001',
    nombre: 'Suministro Aguacates Premium',
    clienteId: 'CLI_001',
    cliente: 'María González',
    empresa: 'Exportadora Maya',
    valor: 85000,
    estado: 'negociacion',
    fechaCierre: '2024-03-15',
    probabilidad: 75,
    progreso: 65,
    descripcion: 'Contrato anual para suministro de aguacates premium para exportación',
    contacto: 'María González',
    diasDesdeCreacion: 15,
    productos: 'Aguacates Hass Premium, calibre 16-20',
    notas: 'Cliente interesado en certificación orgánica',
    precioEstimado: 12.50,
    cantidadEstimada: 6800,
    margenEstimado: 35.5,
    fechaCreacion: '2024-01-15'
  },
  {
    id: 'NEG_002',
    nombre: 'Venta Directa Mercado Local',
    clienteId: 'CLI_002',
    cliente: 'Carlos Ruiz',
    empresa: 'Supermercados Paiz',
    valor: 45000,
    estado: 'propuesta',
    fechaCierre: '2024-02-28',
    probabilidad: 60,
    progreso: 40,
    descripcion: 'Suministro semanal a cadena de supermercados',
    contacto: 'Carlos Ruiz',
    diasDesdeCreacion: 8,
    productos: 'Aguacates variados, empaque retail',
    notas: 'Requieren entrega puntual los lunes',
    precioEstimado: 15.00,
    cantidadEstimada: 3000,
    margenEstimado: 42.3,
    fechaCreacion: '2024-02-01'
  },
  {
    id: 'NEG_003',
    nombre: 'Contrato Procesadora',
    clienteId: 'CLI_003',
    cliente: 'Ana López',
    empresa: 'Alimentos La Pradera',
    valor: 120000,
    estado: 'cerrado',
    fechaCierre: '2024-01-30',
    probabilidad: 100,
    progreso: 100,
    descripcion: 'Suministro para producción de guacamole industrial',
    contacto: 'Ana López',
    diasDesdeCreacion: 45,
    productos: 'Aguacates grado industrial, segunda calidad',
    notas: 'Contrato firmado, entregas programadas',
    precioEstimado: 10.80,
    cantidadEstimada: 11111,
    margenEstimado: 28.7,
    fechaCreacion: '2023-12-15'
  },
  {
    id: 'NEG_004',
    nombre: 'Distribución Regional',
    clienteId: 'CLI_004',
    cliente: 'Roberto Mendoza',
    empresa: 'Distribuidora López',
    valor: 65000,
    estado: 'calificado',
    fechaCierre: '2024-04-10',
    probabilidad: 70,
    progreso: 30,
    descripcion: 'Distribución en mercados regionales',
    contacto: 'Roberto Mendoza',
    diasDesdeCreacion: 5,
    productos: 'Aguacates clasificados por tamaño',
    notas: 'Interesado en volúmenes grandes',
    precioEstimado: 11.20,
    cantidadEstimada: 5800,
    margenEstimado: 32.1,
    fechaCreacion: '2024-02-05'
  }
];

const actividadesEjemplo = [
  {
    id: 'ACT_001',
    negocioId: 'NEG_001',
    clienteId: 'CLI_001',
    tipo: 'llamada',
    descripcion: 'Llamada de seguimiento con Exportadora Maya',
    tiempoRelativo: 'hace 2 horas',
    fecha: new Date(Date.now() - 2 * 60 * 60 * 1000),
    resultado: 'Positivo - interesados en aumentar volumen'
  },
  {
    id: 'ACT_002',
    negocioId: 'NEG_002',
    clienteId: 'CLI_002',
    tipo: 'email',
    descripcion: 'Envío de propuesta a Supermercados Paiz',
    tiempoRelativo: 'hace 1 día',
    fecha: new Date(Date.now() - 24 * 60 * 60 * 1000),
    resultado: 'Pendiente de respuesta'
  },
  {
    id: 'ACT_003',
    negocioId: 'NEG_003',
    clienteId: 'CLI_003',
    tipo: 'reunion',
    descripcion: 'Reunión presencial con Alimentos La Pradera',
    tiempoRelativo: 'hace 3 días',
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    resultado: 'Contrato firmado exitosamente'
  },
  {
    id: 'ACT_004',
    negocioId: 'NEG_004',
    clienteId: 'CLI_004',
    tipo: 'propuesta',
    descripcion: 'Presentación de nueva línea de productos',
    tiempoRelativo: 'hace 1 semana',
    fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    resultado: 'Solicitaron modificaciones de precio'
  }
];

// Variables de estado
let eventListeners = new Map();
let filtrosActivos = {};

// ==========================================
// FUNCIONES PRINCIPALES DE INICIALIZACIÓN
// ==========================================

function initNegociosManager() {
    console.log('💼 Inicializando sistema de negocios...');
    
    return new Promise(function(resolve) {
        waitForClientesManager()
            .then(function() {
                loadNegociosSampleData();
                setupNegociosSyncListeners();
                
                negociosSystemInitialized = true;
                console.log('✅ Sistema de negocios inicializado correctamente');
                
                dispatchNegociosSystemEvent('negociosManagerReady', {
                    negociosCount: negociosData.length,
                    mode: 'integrated'
                });
                
                resolve();
            })
            .catch(function(error) {
                console.error('❌ Error en inicialización de negocios:', error);
                resolve();
            });
    });
}

function waitForClientesManager() {
    return new Promise(function(resolve) {
        var maxWait = 15000;
        var checkInterval = 200;
        var elapsed = 0;

        function check() {
            if (window.clientesManager) {
                console.log('✅ ClientesManager disponible para NegociosManager');
                resolve();
            } else if (elapsed < maxWait) {
                elapsed += checkInterval;
                setTimeout(check, checkInterval);
            } else {
                console.warn('⚠️ Timeout esperando ClientesManager');
                resolve();
            }
        }

        check();
    });
}

function setupNegociosSyncListeners() {
    // Escuchar cambios de clientes
    window.addEventListener('clienteCreated', function(event) {
        onClienteUpdated(event.detail.cliente, 'created');
    });

    window.addEventListener('clienteUpdated', function(event) {
        onClienteUpdated(event.detail.cliente, 'updated');
    });

    // Escuchar cambios de precios
    window.addEventListener('precioCreated', function(event) {
        onPrecioUpdated(event.detail.precio);
    });

    // Escuchar cambios de ventas
    window.addEventListener('ventaCreated', function(event) {
        onVentaCreated(event.detail.venta);
    });
}

function loadNegociosSampleData() {
    try {
        negociosData = negociosEjemplo.slice();
        actividadesData = actividadesEjemplo.slice();
        
        // Sincronizar datos de clientes si está disponible
        if (window.clientesManager) {
            sincronizarDatosClientes();
        }
        
        console.log('📊 Datos cargados: ' + negociosData.length + ' negocios');
        
    } catch (error) {
        console.error('❌ Error cargando datos de ejemplo:', error);
    }
}

function sincronizarDatosClientes() {
    negociosData.forEach(function(negocio) {
        var cliente = window.clientesManager.obtenerCliente(negocio.clienteId);
        if (cliente) {
            negocio.cliente = cliente.nombre;
            negocio.empresa = cliente.empresa;
            negocio.contacto = cliente.telefono;
        }
    });
}

// ==========================================
// FUNCIONES PRINCIPALES DE NEGOCIOS
// ==========================================

function obtenerNegociosMetricas() {
    // Calcular métricas dinámicas
    var negociosActivos = negociosData.filter(function(n) {
        return ['prospecto', 'calificado', 'propuesta', 'negociacion'].includes(n.estado);
    }).length;
    
    var negociosCerrados = negociosData.filter(function(n) {
        return n.estado === 'cerrado';
    }).length;
    var totalNegocios = negociosData.length;
    
    return Object.assign({}, negociosMetricas, {
        negociosActivos: negociosActivos,
        tasaConversion: totalNegocios > 0 ? Math.round((negociosCerrados / totalNegocios) * 100) : 0,
        clientesActivos: window.clientesManager ? 
            window.clientesManager.obtenerTodos().length : negociosMetricas.clientesActivos
    });
}

function obtenerNegociosFiltrados(filtros) {
    filtros = filtros || {};
    var negociosFiltrados = negociosData.slice();
    
    if (filtros.estado) {
        negociosFiltrados = negociosFiltrados.filter(function(n) {
            return n.estado === filtros.estado;
        });
    }
    
    if (filtros.cliente) {
        negociosFiltrados = negociosFiltrados.filter(function(n) {
            return n.clienteId === filtros.cliente;
        });
    }
    
    if (filtros.valorMin) {
        negociosFiltrados = negociosFiltrados.filter(function(n) {
            return n.valor >= filtros.valorMin;
        });
    }
    
    return negociosFiltrados.sort(function(a, b) {
        return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
    });
}

function obtenerNegociosPipelineVisual() {
    var pipeline = [
        {
            clase: 'prospectos',
            nombre: 'Prospectos',
            descripcion: 'Clientes potenciales',
            cantidad: negociosData.filter(function(n) { return n.estado === 'prospecto'; }).length,
            valor: negociosData.filter(function(n) { return n.estado === 'prospecto'; }).reduce(function(sum, n) { return sum + n.valor; }, 0),
            color: '#3b82f6',
            icono: 'fa-eye'
        },
        {
            clase: 'calificados',
            nombre: 'Calificados',
            descripcion: 'Oportunidades válidas',
            cantidad: negociosData.filter(function(n) { return n.estado === 'calificado'; }).length,
            valor: negociosData.filter(function(n) { return n.estado === 'calificado'; }).reduce(function(sum, n) { return sum + n.valor; }, 0),
            color: '#8b5cf6',
            icono: 'fa-filter'
        },
        {
            clase: 'propuestas',
            nombre: 'Propuestas',
            descripcion: 'Propuestas enviadas',
            cantidad: negociosData.filter(function(n) { return n.estado === 'propuesta'; }).length,
            valor: negociosData.filter(function(n) { return n.estado === 'propuesta'; }).reduce(function(sum, n) { return sum + n.valor; }, 0),
            color: '#f59e0b',
            icono: 'fa-file-alt'
        },
        {
            clase: 'negociacion',
            nombre: 'Negociación',
            descripcion: 'En negociación',
            cantidad: negociosData.filter(function(n) { return n.estado === 'negociacion'; }).length,
            valor: negociosData.filter(function(n) { return n.estado === 'negociacion'; }).reduce(function(sum, n) { return sum + n.valor; }, 0),
            color: '#ef4444',
            icono: 'fa-handshake'
        },
        {
            clase: 'cerrados',
            nombre: 'Cerrados',
            descripcion: 'Negocios ganados',
            cantidad: negociosData.filter(function(n) { return n.estado === 'cerrado'; }).length,
            valor: negociosData.filter(function(n) { return n.estado === 'cerrado'; }).reduce(function(sum, n) { return sum + n.valor; }, 0),
            color: '#22c55e',
            icono: 'fa-check-circle'
        }
    ];
    
    return pipeline;
}

function obtenerClientesRecientes() {
    if (!window.clientesManager) {
        return [];
    }
    
    return window.clientesManager.obtenerTodos()
        .sort(function(a, b) {
            return new Date(b.ultimaCompra || 0) - new Date(a.ultimaCompra || 0);
        })
        .slice(0, 5)
        .map(function(cliente) {
            return {
                id: cliente.id,
                nombre: cliente.nombre,
                empresa: cliente.empresa,
                valorTotal: cliente.totalVentas,
                telefono: cliente.telefono,
                email: cliente.email
            };
        });
}

function obtenerActividadesRecientes() {
    return actividadesData
        .sort(function(a, b) {
            return new Date(b.fecha) - new Date(a.fecha);
        })
        .slice(0, 5);
}

function obtenerListaClientes() {
    if (!window.clientesManager) {
        return [];
    }
    
    return window.clientesManager.obtenerParaSelectores();
}

function obtenerNegocio(id) {
    return negociosData.find(function(n) {
        return n.id === id;
    });
}

function obtenerContactosCliente(clienteId) {
    if (!window.clientesManager) {
        return [];
    }
    
    var cliente = window.clientesManager.obtenerCliente(clienteId);
    if (!cliente) return [];
    
    return [
        {
            nombre: cliente.nombre,
            cargo: 'Contacto Principal',
            email: cliente.email,
            telefono: cliente.telefono
        }
    ];
}

// ==========================================
// GESTIÓN DE NEGOCIOS CON VALIDACIONES
// ==========================================

function guardarNegocio(datos) {
    return new Promise(function(resolve, reject) {
        try {
            // Validar cliente
            if (!window.clientesManager || !window.clientesManager.obtenerCliente(datos.clienteId)) {
                reject(new Error('Cliente no válido'));
                return;
            }

            // Validar precio contra mercado si está disponible
            if (window.preciosManager && datos.precioEstimado) {
                validarPrecioConMercado(datos.precioEstimado)
                    .then(function(validacionPrecio) {
                        if (!validacionPrecio.valido) {
                            console.warn('⚠️ Precio fuera de rango de mercado:', validacionPrecio.mensaje);
                        }
                        continuarGuardado();
                    })
                    .catch(function() {
                        continuarGuardado();
                    });
            } else {
                continuarGuardado();
            }

            function continuarGuardado() {
                // Calcular margen estimado
                if (datos.precioEstimado && datos.cantidadEstimada) {
                    calcularMargenEstimado(datos.precioEstimado, datos.cantidadEstimada)
                        .then(function(margen) {
                            datos.margenEstimado = margen;
                            finalizarGuardado();
                        })
                        .catch(function() {
                            finalizarGuardado();
                        });
                } else {
                    finalizarGuardado();
                }
            }

            function finalizarGuardado() {
                if (datos.id) {
                    // Actualizar existente
                    var index = negociosData.findIndex(function(n) {
                        return n.id === datos.id;
                    });
                    if (index !== -1) {
                        negociosData[index] = Object.assign({}, negociosData[index], datos, {
                            fechaModificacion: new Date().toISOString()
                        });
                    }
                } else {
                    // Crear nuevo
                    var nuevoNegocio = Object.assign({
                        id: generateNegocioId(),
                        fechaCreacion: new Date().toISOString(),
                        diasDesdeCreacion: 0,
                        progreso: calcularProgresoInicial(datos.estado)
                    }, datos);
                    negociosData.push(nuevoNegocio);
                }
                
                // Notificar cambio
                dispatchNegociosSystemEvent('negocioGuardado', { negocio: datos });
                
                console.log('✅ Negocio guardado correctamente');
                resolve();
            }
            
        } catch (error) {
            console.error('❌ Error guardando negocio:', error);
            reject(error);
        }
    });
}

function avanzarEtapa(id) {
    return new Promise(function(resolve, reject) {
        try {
            var negocio = negociosData.find(function(n) {
                return n.id === id;
            });
            if (!negocio) {
                reject(new Error('Negocio no encontrado'));
                return;
            }
            
            var estados = ['prospecto', 'calificado', 'propuesta', 'negociacion', 'cerrado'];
            var currentIndex = estados.indexOf(negocio.estado);
            
            if (currentIndex < estados.length - 1) {
                negocio.estado = estados[currentIndex + 1];
                negocio.progreso = Math.min(100, negocio.progreso + 25);
                
                if (negocio.estado === 'cerrado') {
                    negocio.probabilidad = 100;
                    negocio.progreso = 100;
                    
                    // Actualizar métricas del cliente
                    if (window.clientesManager) {
                        window.clientesManager.actualizarMetricasNegocio(
                            negocio.clienteId, 
                            negocio.valor, 
                            'cerrado'
                        );
                    }
                }
            }
            
            // Registrar actividad
            registrarActividad({
                negocioId: id,
                clienteId: negocio.clienteId,
                tipo: 'avance_etapa',
                descripcion: 'Negocio avanzado a etapa: ' + negocio.estado,
                resultado: 'Etapa actualizada automáticamente'
            });
            
            console.log('✅ Etapa avanzada: ' + negocio.nombre + ' -> ' + negocio.estado);
            resolve();
            
        } catch (error) {
            console.error('❌ Error avanzando etapa:', error);
            reject(error);
        }
    });
}

function aplicarFiltros(filtros) {
    console.log('🔍 Aplicando filtros:', filtros);
    filtrosActivos = Object.assign({}, filtrosActivos, filtros);
}

// ==========================================
// ANÁLISIS Y VALIDACIONES
// ==========================================

function validarPrecioConMercado(precioEstimado) {
    return new Promise(function(resolve) {
        if (!window.preciosManager) {
            resolve({ valido: true, mensaje: 'Sistema de precios no disponible' });
            return;
        }

        try {
            var resumenPrecios = window.preciosManager.obtenerResumenPrecios();
            var precioMercado = resumenPrecios.actual;
            
            var diferencia = Math.abs(precioEstimado - precioMercado) / precioMercado * 100;
            
            if (diferencia > 20) {
                resolve({
                    valido: false,
                    mensaje: 'Precio estimado (Q' + precioEstimado + ') difiere ' + diferencia.toFixed(1) + '% del mercado (Q' + precioMercado + ')'
                });
            } else {
                resolve({ valido: true, mensaje: 'Precio dentro del rango de mercado' });
            }
            
        } catch (error) {
            console.error('❌ Error validando precio:', error);
            resolve({ valido: true, mensaje: 'No se pudo validar precio' });
        }
    });
}

function calcularMargenEstimado(precioVenta, cantidad) {
    return new Promise(function(resolve) {
        var costoPorKg = 8.50; // Costo base por defecto
        
        // Obtener costo real si está disponible el sistema de gastos
        if (window.expenseManager || window.gastosManager) {
            try {
                var gestor = window.expenseManager || window.gastosManager;
                var resumenFinanciero = gestor.getFinancialSummary('month');
                var produccionEstimada = 1000; // kg por mes
                costoPorKg = resumenFinanciero.total / produccionEstimada;
            } catch (error) {
                console.warn('⚠️ No se pudo calcular costo real:', error);
            }
        }
        
        var costoTotal = cantidad * costoPorKg;
        var ingresoTotal = cantidad * precioVenta;
        var margen = ((ingresoTotal - costoTotal) / ingresoTotal) * 100;
        
        resolve(Math.round(margen * 10) / 10); // Redondear a 1 decimal
    });
}

function calcularProgresoInicial(estado) {
    var progresos = {
        'prospecto': 10,
        'calificado': 25,
        'propuesta': 50,
        'negociacion': 75,
        'cerrado': 100
    };
    return progresos[estado] || 10;
}

function registrarActividad(datos) {
    var actividad = Object.assign({
        id: generateNegocioId(),
        fecha: new Date(),
        tiempoRelativo: 'hace unos momentos'
    }, datos);
    
    actividadesData.unshift(actividad);
    
    // Mantener solo las últimas 100 actividades
    if (actividadesData.length > 100) {
        actividadesData = actividadesData.slice(0, 100);
    }
}

// ==========================================
// ANÁLISIS Y REPORTES
// ==========================================

function obtenerDatosVentasMes() {
    var ventasPorMes = negociosData
        .filter(function(n) { return n.estado === 'cerrado'; })
        .reduce(function(acc, negocio) {
            var fecha = new Date(negocio.fechaCreacion);
            var mes = fecha.getMonth();
            acc[mes] = (acc[mes] || 0) + negocio.valor;
            return acc;
        }, {});
    
    return {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        data: [
            ventasPorMes[0] || 85000,
            ventasPorMes[1] || 92000,
            ventasPorMes[2] || 78000,
            ventasPorMes[3] || 105000,
            ventasPorMes[4] || 98000,
            ventasPorMes[5] || 125500
        ]
    };
}

function obtenerDistribucionEstados() {
    var estados = negociosData.reduce(function(acc, negocio) {
        acc[negocio.estado] = (acc[negocio.estado] || 0) + 1;
        return acc;
    }, {});
    
    return {
        labels: Object.keys(estados).map(function(estado) {
            return estado.charAt(0).toUpperCase() + estado.slice(1);
        }),
        data: Object.values(estados)
    };
}

// ==========================================
// EVENTOS DE SINCRONIZACIÓN
// ==========================================

function onClienteUpdated(cliente, accion) {
    console.log('🔄 Cliente ' + accion + ':', cliente.nombre);
    
    // Actualizar negocios relacionados
    negociosData.forEach(function(negocio) {
        if (negocio.clienteId === cliente.id) {
            negocio.cliente = cliente.nombre;
            negocio.empresa = cliente.empresa;
            negocio.contacto = cliente.telefono;
        }
    });
}

function onPrecioUpdated(precio) {
    console.log('💰 Precio actualizado:', precio);
    
    // Recalcular márgenes de negocios activos
    var negociosActivos = negociosData.filter(function(n) {
        return ['prospecto', 'calificado', 'propuesta', 'negociacion'].includes(n.estado);
    });
    
    negociosActivos.forEach(function(negocio) {
        if (negocio.precioEstimado && negocio.cantidadEstimada) {
            calcularMargenEstimado(negocio.precioEstimado, negocio.cantidadEstimada)
                .then(function(margen) {
                    negocio.margenEstimado = margen;
                })
                .catch(function(error) {
                    console.error('Error recalculando margen:', error);
                });
        }
    });
}

function onVentaCreated(venta) {
    console.log('💵 Venta creada:', venta);
    
    // Buscar negocio relacionado y actualizarlo
    var negocioRelacionado = negociosData.find(function(n) {
        return n.clienteId === venta.clienteId && n.estado !== 'cerrado';
    });
    
    if (negocioRelacionado) {
        negocioRelacionado.estado = 'cerrado';
        negocioRelacionado.progreso = 100;
        negocioRelacionado.probabilidad = 100;
        
        registrarActividad({
            negocioId: negocioRelacionado.id,
            clienteId: venta.clienteId,
            tipo: 'venta_realizada',
            descripcion: 'Venta realizada: ' + venta.cantidad + ' kg por Q' + venta.total,
            resultado: 'Negocio cerrado exitosamente'
        });
    }
}

// Función para sincronizar cliente (llamada desde ClientesManager)
function sincronizarClienteNegocios(cliente, accion) {
    onClienteUpdated(cliente, accion);
}

// ==========================================
// FUNCIONES DE INTERFAZ
// ==========================================

function mostrarModalActividad(id) {
    console.log('📝 Mostrar modal de actividad para negocio ' + id);
    if (window.notificationManager) {
        window.notificationManager.info('Función de actividades en desarrollo');
    }
}

function mostrarDetalle(id) {
    var negocio = obtenerNegocio(id);
    if (negocio) {
        console.log('👁️ Mostrar detalle del negocio: ' + negocio.nombre);
        if (window.notificationManager) {
            window.notificationManager.info('Detalle: ' + negocio.nombre + ' - Q' + negocio.valor.toLocaleString());
        }
    }
}

function mostrarDetalleCliente(id) {
    if (!window.clientesManager) return;
    
    var cliente = window.clientesManager.obtenerCliente(id);
    if (cliente) {
        console.log('👤 Mostrar detalle del cliente: ' + cliente.nombre);
        if (window.notificationManager) {
            window.notificationManager.info('Cliente: ' + cliente.nombre + ' - ' + cliente.empresa);
        }
    }
}

function mostrarModalCliente() {
    console.log('👥 Mostrar modal de nuevo cliente');
    if (window.notificationManager) {
        window.notificationManager.info('Función de nuevo cliente en desarrollo');
    }
}

function generarReporte() {
    console.log('📊 Generar reporte de negocios');
    if (window.notificationManager) {
        window.notificationManager.info('Generando reporte de negocios...');
    }
}

function exportarDatos() {
    console.log('💾 Exportar datos de negocios');
    if (window.notificationManager) {
        window.notificationManager.info('Exportando datos de negocios...');
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function generateNegocioId() {
    return 'NEG_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function dispatchNegociosSystemEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, {
        detail: Object.assign({}, data, {
            timestamp: Date.now(),
            source: 'negociosManager'
        })
    }));
}

function getNegociosSystemStatus() {
    return {
        initialized: negociosSystemInitialized,
        offlineAvailable: negociosOfflineAvailable,
        negociosCount: negociosData.length,
        integrations: {
            clientesManager: !!window.clientesManager,
            preciosManager: !!window.preciosManager,
            expenseManager: !!(window.expenseManager || window.gastosManager)
        }
    };
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Manager global de negocios
window.negociosManager = {
    // Estado
    getStatus: getNegociosSystemStatus,
    
    // Datos principales
    obtenerMetricas: obtenerNegociosMetricas,
    obtenerNegociosFiltrados: obtenerNegociosFiltrados,
    obtenerPipelineVisual: obtenerNegociosPipelineVisual,
    obtenerClientesRecientes: obtenerClientesRecientes,
    obtenerActividadesRecientes: obtenerActividadesRecientes,
    obtenerListaClientes: obtenerListaClientes,
    obtenerNegocio: obtenerNegocio,
    obtenerContactosCliente: obtenerContactosCliente,
    
    // Gestión de negocios
    guardarNegocio: guardarNegocio,
    avanzarEtapa: avanzarEtapa,
    aplicarFiltros: aplicarFiltros,
    
    // Análisis y reportes
    obtenerDatosVentasMes: obtenerDatosVentasMes,
    obtenerDistribucionEstados: obtenerDistribucionEstados,
    
    // Interfaz
    mostrarModalActividad: mostrarModalActividad,
    mostrarDetalle: mostrarDetalle,
    mostrarDetalleCliente: mostrarDetalleCliente,
    mostrarModalCliente: mostrarModalCliente,
    generarReporte: generarReporte,
    exportarDatos: exportarDatos,
    
    // Sincronización
    sincronizarCliente: sincronizarClienteNegocios,
    
    // Datos directos
    get negocios() { return negociosData; },
    get actividades() { return actividadesData; }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initNegociosManager()
        .then(function() {
            console.log('💼 NegociosManager disponible globalmente');
        })
        .catch(function(error) {
            console.error('Error inicializando NegociosManager:', error);
        });
});

console.log('💼 Sistema de negocios integrado cargado correctamente');
