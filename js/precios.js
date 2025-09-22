/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRECIOS
   Sistema integrado con archivos base - JavaScript puro
   v13 - CORREGIDO E INTEGRADO vfull
   ======================================== */

// ==========================================
// VARIABLES GLOBALES DEL SISTEMA
// ==========================================

// Estado del sistema
var systemInitialized = false;
var authReady = false;
var offlineReady = false;
var syncReady = false;
var navigationReady = false;
var chartsReady = false;

// Datos en memoria
var precios = [];
var mercados = new Map();
var alertasPrecios = [];
var predicciones = [];

// Datos de integración con sistema de gastos
var datosIntegracion = {
    costosActuales: {},
    margenesCalculados: {},
    alertasRentabilidad: [],
    ultimaSincronizacion: null,
    gastosIntegrados: false
};

// Configuración base
var preciosConfig = {
    fincaId: 'finca_la_herradura',
    currency: 'GTQ',
    baseCurrency: 'USD',
    currentDate: new Date().toISOString().split('T')[0]
};

// Configuración de mercados con información de márgenes
var mercadosConfig = {
    'mayorista': {
        name: 'Mercado Mayorista',
        type: 'mayorista',
        weight: 0.4,
        location: 'Guatemala City',
        active: true,
        color: '#ef4444',
        icon: 'fa-warehouse',
        margenMinimo: 15,
        margenOptimo: 25
    },
    'minorista': {
        name: 'Mercado Minorista',
        type: 'minorista',
        weight: 0.3,
        location: 'Guatemala City',
        active: true,
        color: '#3b82f6',
        icon: 'fa-store',
        margenMinimo: 20,
        margenOptimo: 30
    },
    'exportacion': {
        name: 'Mercado Exportación',
        type: 'exportacion',
        weight: 0.2,
        location: 'Puerto Quetzal',
        active: true,
        color: '#8b5cf6',
        icon: 'fa-shipping-fast',
        margenMinimo: 25,
        margenOptimo: 35
    },
    'finca': {
        name: 'Precio Finca',
        type: 'finca',
        weight: 0.1,
        location: 'Finca La Herradura',
        active: true,
        color: '#22c55e',
        icon: 'fa-seedling',
        margenMinimo: 10,
        margenOptimo: 20
    }
};

// Variables para gráficos
var graficoEvolucion = null;
var graficoComparativo = null;

// ==========================================
// SISTEMA DE CARGA MEJORADO
// ==========================================

function initializeLoadingSystem() {
    console.log('🔄 Iniciando sistema de carga integrado...');
    
    var loader = document.getElementById('systemLoader');
    var progressBar = document.getElementById('loaderProgressBar');
    var loaderMessage = document.getElementById('loaderMessage');
    var loaderIcon = document.getElementById('loaderIcon');
    
    var steps = {
        step1: { element: document.getElementById('step1'), label: 'Cargando datos base...', progress: 25 },
        step2: { element: document.getElementById('step2'), label: 'Inicializando gráficos...', progress: 50 },
        step3: { element: document.getElementById('step3'), label: 'Integrando sistemas...', progress: 75 },
        step4: { element: document.getElementById('step4'), label: 'Sistema listo!', progress: 100 }
    };
    
    var currentStep = 0;
    var stepKeys = Object.keys(steps);
    
    function updateLoadingStep(stepKey) {
        try {
            var step = steps[stepKey];
            if (!step) return;
            
            // Actualizar mensaje
            loaderMessage.textContent = step.label;
            
            // Actualizar barra de progreso
            progressBar.style.width = step.progress + '%';
            
            // Marcar pasos como completados
            for (var i = 0; i < stepKeys.length; i++) {
                var currentStepKey = stepKeys[i];
                var stepElement = steps[currentStepKey].element;
                
                if (i < currentStep) {
                    stepElement.className = 'loader-step completed';
                } else if (currentStepKey === stepKey) {
                    stepElement.className = 'loader-step active';
                } else {
                    stepElement.className = 'loader-step';
                }
            }
            
            // Cambiar ícono según el paso
            var icons = ['fa-database', 'fa-chart-bar', 'fa-sync-alt', 'fa-check-circle'];
            loaderIcon.className = 'fas ' + icons[currentStep];
            
            currentStep++;
            
            console.log('📍 Paso de carga:', step.label);
            
        } catch (error) {
            console.error('❌ Error actualizando paso de carga:', error);
        }
    }
    
    function hideLoader() {
        try {
            setTimeout(function() {
                if (loader) {
                    loader.classList.add('loaded');
                    setTimeout(function() {
                        loader.style.display = 'none';
                    }, 800);
                }
                console.log('✅ Sistema de carga completado');
            }, 500);
        } catch (error) {
            console.error('❌ Error ocultando loader:', error);
        }
    }
    
    // Exponer funciones globalmente para el proceso de carga
    window.updateLoadingStep = updateLoadingStep;
    window.hideLoader = hideLoader;
}

// ==========================================
// INICIALIZACIÓN DEL SISTEMA PRINCIPAL
// ==========================================

function initializePreciosSystem() {
    try {
        console.log('💲 Iniciando sistema de gestión de precios...');
        
        // Paso 1: Cargar datos base
        window.updateLoadingStep('step1');
        loadSampleData();
        initializeMercados();
        
        // Esperar a que otros sistemas estén listos
        waitForSystemDependencies().then(function() {
            
            // Paso 2: Inicializar gráficos
            window.updateLoadingStep('step2');
            setTimeout(function() {
                initializeCharts();
                
                // Paso 3: Integrar con otros sistemas
                window.updateLoadingStep('step3');
                setTimeout(function() {
                    integrateWithOtherSystems();
                    setupEventListeners();
                    updateUI();
                    
                    // Paso 4: Sistema listo
                    window.updateLoadingStep('step4');
                    setTimeout(function() {
                        systemInitialized = true;
                        window.hideLoader();
                        
                        // Notificar que el sistema está listo
                        dispatchSystemEvent('preciosSystemReady', {
                            preciosCount: precios.length,
                            mercadosCount: mercados.size,
                            integrated: true
                        });
                        
                        console.log('✅ Sistema de precios inicializado completamente');
                        
                    }, 1000);
                }, 1500);
            }, 1000);
        });
        
    } catch (error) {
        console.error('❌ Error en inicialización de precios:', error);
        // Ocultar loader en caso de error
        setTimeout(window.hideLoader, 2000);
    }
}

function waitForSystemDependencies() {
    return new Promise(function(resolve) {
        var maxWait = 20000; // 20 segundos máximo
        var checkInterval = 300;
        var elapsed = 0;
        
        function checkDependencies() {
            try {
                // Verificar dependencias críticas
                authReady = window.authManager && typeof window.authManager.getCurrentUser === 'function';
                offlineReady = window.offlineManager && typeof window.offlineManager.isOnline === 'function';
                syncReady = window.dataSyncManager && typeof window.dataSyncManager.syncData === 'function';
                navigationReady = window.navigationManager && typeof window.navigationManager.init === 'function';
                chartsReady = window.Chart && typeof window.Chart === 'function';
                
                var allReady = authReady && offlineReady && syncReady && navigationReady && chartsReady;
                
                console.log('🔍 Verificando dependencias:', {
                    auth: authReady,
                    offline: offlineReady,
                    sync: syncReady,
                    navigation: navigationReady,
                    charts: chartsReady,
                    allReady: allReady
                });
                
                if (allReady || elapsed >= maxWait) {
                    if (allReady) {
                        console.log('✅ Todas las dependencias están listas');
                    } else {
                        console.warn('⚠️ Timeout esperando dependencias, continuando...');
                    }
                    resolve();
                } else {
                    elapsed += checkInterval;
                    setTimeout(checkDependencies, checkInterval);
                }
                
            } catch (error) {
                console.error('❌ Error verificando dependencias:', error);
                resolve(); // Continuar aunque haya error
            }
        }
        
        checkDependencies();
    });
}

// ==========================================
// CARGA DE DATOS Y INICIALIZACIÓN
// ==========================================

function loadSampleData() {
    try {
        // Datos de precios con información realista
        var preciosEjemplo = [
            {
                id: generatePrecioId(),
                fecha: preciosConfig.currentDate,
                mercado: 'mayorista',
                valor: 11.80,
                fuente: 'Mercado La Terminal',
                observaciones: 'Precio estable',
                cambio: 4.4,
                tendencia: 'up',
                createdAt: new Date().toISOString(),
                costoPorKg: 8.50,
                margenCalculado: 27.97,
                rentabilidadValidada: true
            },
            {
                id: generatePrecioId(),
                fecha: preciosConfig.currentDate,
                mercado: 'minorista',
                valor: 15.00,
                fuente: 'Supermercados',
                observaciones: 'Demanda alta',
                cambio: 1.7,
                tendencia: 'up',
                createdAt: new Date().toISOString(),
                costoPorKg: 8.50,
                margenCalculado: 43.33,
                rentabilidadValidada: true
            },
            {
                id: generatePrecioId(),
                fecha: preciosConfig.currentDate,
                mercado: 'exportacion',
                valor: 18.50,
                fuente: 'Exportadora Maya',
                observaciones: 'Precio premium',
                cambio: 5.7,
                tendencia: 'up',
                createdAt: new Date().toISOString(),
                costoPorKg: 8.50,
                margenCalculado: 54.05,
                rentabilidadValidada: true
            },
            {
                id: generatePrecioId(),
                fecha: preciosConfig.currentDate,
                mercado: 'finca',
                valor: 12.75,
                fuente: 'Precio Interno',
                observaciones: 'Ajustado a mercado',
                cambio: 2.0,
                tendencia: 'up',
                createdAt: new Date().toISOString(),
                costoPorKg: 8.50,
                margenCalculado: 33.33,
                rentabilidadValidada: true
            }
        ];
        
        // Datos históricos adicionales
        var fechaAnterior = new Date();
        fechaAnterior.setDate(fechaAnterior.getDate() - 1);
        var fechaAnteriorStr = fechaAnterior.toISOString().split('T')[0];
        
        preciosEjemplo.push({
            id: generatePrecioId(),
            fecha: fechaAnteriorStr,
            mercado: 'mayorista',
            valor: 11.30,
            fuente: 'Mercado Central',
            observaciones: 'Precio día anterior',
            cambio: -2.1,
            tendencia: 'down',
            createdAt: new Date(fechaAnterior).toISOString(),
            costoPorKg: 8.50,
            margenCalculado: 24.78,
            rentabilidadValidada: true
        });
        
        precios = preciosEjemplo;
        
        // Cargar alertas de ejemplo
        loadSampleAlertas();
        
        console.log('📊 Datos de ejemplo cargados:', precios.length + ' precios');
        
    } catch (error) {
        console.error('❌ Error cargando datos de ejemplo:', error);
    }
}

function loadSampleAlertas() {
    alertasPrecios = [
        {
            id: 'ALERT_001',
            tipo: 'oportunidad',
            titulo: 'Oportunidad de Venta',
            mensaje: 'Los precios han subido 6.4% esta semana. Buen momento para vender.',
            icono: 'fa-arrow-up',
            accion: 'Ver Análisis',
            actionFunction: 'verAnalisisOportunidad'
        },
        {
            id: 'ALERT_002',
            tipo: 'advertencia',
            titulo: 'Volatilidad Alta',
            mensaje: 'El mercado mayorista muestra alta volatilidad. Monitorear de cerca.',
            icono: 'fa-exclamation-triangle',
            accion: 'Ver Detalles',
            actionFunction: 'verDetallesVolatilidad'
        },
        {
            id: 'ALERT_003',
            tipo: 'critica',
            titulo: 'Precio Bajo Competencia',
            mensaje: 'Nuestro precio está 8% por debajo de la competencia en exportación.',
            icono: 'fa-exclamation-circle',
            accion: 'Ajustar Precio',
            actionFunction: 'ajustarPrecio'
        },
        {
            id: 'ALERT_004',
            tipo: 'info',
            titulo: 'Análisis de Costos',
            mensaje: 'Costo por kg actual: Q8.50. Márgenes calculados automáticamente.',
            icono: 'fa-calculator',
            accion: 'Ver Márgenes',
            actionFunction: 'verAnalisisMargen'
        }
    ];
}

function initializeMercados() {
    try {
        mercados.clear();
        
        for (var id in mercadosConfig) {
            if (mercadosConfig.hasOwnProperty(id)) {
                var config = mercadosConfig[id];
                mercados.set(id, {
                    id: id,
                    name: config.name,
                    type: config.type,
                    weight: config.weight,
                    location: config.location,
                    active: config.active,
                    color: config.color,
                    icon: config.icon,
                    margenMinimo: config.margenMinimo,
                    margenOptimo: config.margenOptimo,
                    ultimoPrecio: 0,
                    ultimaActualizacion: null,
                    historial: []
                });
            }
        }
        
        console.log('🏪 ' + mercados.size + ' mercados inicializados');
        
    } catch (error) {
        console.error('❌ Error inicializando mercados:', error);
    }
}

// ==========================================
// INTEGRACIÓN CON OTROS SISTEMAS
// ==========================================

function integrateWithOtherSystems() {
    try {
        console.log('🔗 Integrando con otros sistemas...');
        
        // Configurar eventos de integración
        setupIntegrationEvents();
        
        // Sincronizar con sistema de gastos si está disponible
        if (window.expenseManager) {
            syncWithExpenseSystem();
        }
        
        // Integrar con sistema offline
        if (offlineReady) {
            setupOfflineIntegration();
        }
        
        // Integrar con autenticación
        if (authReady) {
            setupAuthIntegration();
        }
        
        console.log('✅ Integración con otros sistemas completa');
        
    } catch (error) {
        console.error('❌ Error en integración con otros sistemas:', error);
    }
}

function setupIntegrationEvents() {
    // Escuchar cambios en gastos para recalcular márgenes
    window.addEventListener('expenseCreated', function(event) {
        setTimeout(function() {
            syncWithExpenseSystem();
            calculateRealMargins();
        }, 500);
    });
    
    window.addEventListener('statisticsUpdated', function(event) {
        setTimeout(function() {
            syncWithExpenseSystem();
            calculateRealMargins();
        }, 500);
    });
    
    // Escuchar solicitudes de validación de precios desde otros módulos
    window.addEventListener('precioValidacionSolicitada', function(event) {
        var datos = event.detail;
        var validacion = validarPrecioIntegrado(datos.precio, datos.cantidad, datos.mercado);
        
        window.dispatchEvent(new CustomEvent('precioValidacionCompleta', {
            detail: validacion
        }));
    });
    
    // Escuchar cambios de autenticación
    window.addEventListener('authStateChanged', function(event) {
        if (event.detail.authenticated) {
            loadUserPriceData();
        }
    });
}

function syncWithExpenseSystem() {
    try {
        if (!window.expenseManager) {
            console.log('📊 Sistema de gastos no disponible para sincronización');
            return;
        }
        
        var resumenFinanciero = window.expenseManager.getFinancialSummary('month');
        
        if (resumenFinanciero && resumenFinanciero.integration) {
            datosIntegracion = {
                costosActuales: {
                    costoPorKg: resumenFinanciero.integration.costPerKg || 8.50,
                    totalGastos: resumenFinanciero.total || 0,
                    costoPorCategoria: resumenFinanciero.costoPorCategoria || {}
                },
                gastosIntegrados: true,
                ultimaSincronizacion: new Date().toISOString()
            };
            
            // Recalcular márgenes con datos reales
            calculateRealMargins();
            
            console.log('💰 Datos sincronizados con sistema de gastos');
        }
        
    } catch (error) {
        console.error('❌ Error sincronizando con sistema de gastos:', error);
    }
}

function calculateRealMargins() {
    try {
        if (!datosIntegracion.gastosIntegrados) {
            console.log('📊 Calculando márgenes con datos base');
            return;
        }
        
        var costoPorKg = datosIntegracion.costosActuales.costoPorKg || 8.50;
        var resumenPrecios = obtenerResumenPrecios();
        
        datosIntegracion.margenesCalculados = {};
        
        for (var mercado in resumenPrecios.mercados) {
            if (resumenPrecios.mercados.hasOwnProperty(mercado)) {
                var precio = resumenPrecios.mercados[mercado];
                var margen = costoPorKg > 0 ? ((precio - costoPorKg) / precio) * 100 : 0;
                var gananciaKg = precio - costoPorKg;
                var mercadoConfig = mercadosConfig[mercado];
                
                datosIntegracion.margenesCalculados[mercado] = {
                    precio: precio,
                    costo: costoPorKg,
                    margen: margen,
                    gananciaKg: gananciaKg,
                    rentable: margen > 0,
                    cumpleMinimo: margen >= (mercadoConfig ? mercadoConfig.margenMinimo : 10),
                    esOptimo: margen >= (mercadoConfig ? mercadoConfig.margenOptimo : 20),
                    recomendacion: getMarginRecommendation(margen, mercadoConfig)
                };
            }
        }
        
        console.log('📈 Márgenes reales calculados');
        
    } catch (error) {
        console.error('❌ Error calculando márgenes reales:', error);
    }
}

function setupOfflineIntegration() {
    if (!window.offlineManager) return;
    
    try {
        // Configurar sincronización offline para precios
        window.offlineManager.registerDataType('precios', {
            syncFunction: syncPreciosData,
            priority: 'high'
        });
        
        console.log('📱 Integración offline configurada');
        
    } catch (error) {
        console.error('❌ Error configurando integración offline:', error);
    }
}

function setupAuthIntegration() {
    if (!window.authManager) return;
    
    try {
        // Verificar permisos del usuario
        var currentUser = window.authManager.getCurrentUser();
        if (currentUser && currentUser.role) {
            setupUserPermissions(currentUser.role);
        }
        
        console.log('🔐 Integración de autenticación configurada');
        
    } catch (error) {
        console.error('❌ Error configurando integración de autenticación:', error);
    }
}

// ==========================================
// INICIALIZACIÓN DE GRÁFICOS
// ==========================================

function initializeCharts() {
    try {
        if (!window.Chart) {
            console.warn('⚠️ Chart.js no disponible');
            return;
        }
        
        console.log('📊 Inicializando gráficos...');
        
        // Configuración global de Chart.js
        Chart.defaults.font.family = 'Inter, sans-serif';
        Chart.defaults.color = '#64748b';
        Chart.defaults.borderColor = '#e2e8f0';
        
        // Inicializar gráfico de evolución
        initializeEvolutionChart();
        
        // Inicializar gráfico comparativo
        initializeComparisonChart();
        
        console.log('📊 Gráficos inicializados correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando gráficos:', error);
    }
}

function initializeEvolutionChart() {
    try {
        var ctx = document.getElementById('graficoEvolucion');
        if (!ctx) return;
        
        var labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        var data = [10.80, 11.25, 11.80, 12.50, 12.30, 12.75, 13.10];
        
        graficoEvolucion = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Precio Promedio (Q)',
                    data: data,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 10,
                        ticks: {
                            callback: function(value) {
                                return 'Q ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando gráfico de evolución:', error);
    }
}

function initializeComparisonChart() {
    try {
        var ctx = document.getElementById('graficoComparativo');
        if (!ctx) return;
        
        var labels = ['Mayorista', 'Minorista', 'Exportación', 'Finca'];
        var data = [11.80, 15.00, 18.50, 12.75];
        var colors = ['rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(34, 197, 94, 0.8)'];
        var borderColors = ['#ef4444', '#3b82f6', '#8b5cf6', '#22c55e'];
        
        graficoComparativo = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Precio Actual (Q)',
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 10,
                        ticks: {
                            callback: function(value) {
                                return 'Q ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando gráfico comparativo:', error);
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    try {
        console.log('🔧 Configurando event listeners...');
        
        // Botones principales
        var btnActualizar = document.getElementById('btnActualizarPrecios');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', actualizarPrecios);
        }
        
        var btnNuevoPrecio = document.getElementById('btnNuevoPrecio');
        if (btnNuevoPrecio) {
            btnNuevoPrecio.addEventListener('click', mostrarFormularioPrecio);
        }
        
        var btnExportar = document.getElementById('btnExportarAnalisis');
        if (btnExportar) {
            btnExportar.addEventListener('click', exportarAnalisis);
        }
        
        var btnGuardarPrecio = document.getElementById('guardarPrecio');
        if (btnGuardarPrecio) {
            btnGuardarPrecio.addEventListener('click', guardarPrecioRapido);
        }
        
        // Filtros
        var btnAplicarFiltros = document.getElementById('aplicarFiltros');
        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', aplicarFiltros);
        }
        
        var btnLimpiarFiltros = document.getElementById('limpiarFiltros');
        if (btnLimpiarFiltros) {
            btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
        }
        
        // Configurar fecha por defecto
        var fechaPrecio = document.getElementById('fechaPrecio');
        if (fechaPrecio) {
            fechaPrecio.value = preciosConfig.currentDate;
        }
        
        console.log('✅ Event listeners configurados');
        
    } catch (error) {
        console.error('❌ Error configurando event listeners:', error);
    }
}

// ==========================================
// ACTUALIZACIÓN DE UI
// ==========================================

function updateUI() {
    try {
        console.log('🎨 Actualizando interfaz de usuario...');
        
        updatePricesDisplay();
        updateMarketsGrid();
        updateAlertsPanel();
        updateHistoryTable();
        updateActionsPanel();
        updateLastUpdateTime();
        
        console.log('✅ Interfaz de usuario actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando UI:', error);
    }
}

function updatePricesDisplay() {
    try {
        var resumen = obtenerResumenPrecios();
        
        // Actualizar precio actual
        var precioActualEl = document.getElementById('precioActual');
        if (precioActualEl) {
            precioActualEl.textContent = resumen.actual.toFixed(2);
        }
        
        // Actualizar cambios
        var cambioAbsoluto = document.getElementById('cambioAbsoluto');
        var cambioRelativo = document.getElementById('cambioRelativo');
        var tendenciaIcon = document.getElementById('tendenciaIcon');
        
        if (cambioAbsoluto) {
            var signo = resumen.cambio >= 0 ? '+' : '';
            cambioAbsoluto.textContent = signo + 'Q ' + resumen.cambio.toFixed(2);
        }
        
        if (cambioRelativo) {
            var signo = resumen.porcentaje >= 0 ? '+' : '';
            cambioRelativo.textContent = signo + resumen.porcentaje.toFixed(1) + '%';
        }
        
        if (tendenciaIcon) {
            var iconClass = resumen.porcentaje >= 0 ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger';
            tendenciaIcon.innerHTML = '<i class="fas ' + iconClass.split(' ')[0] + '"></i>';
            tendenciaIcon.className = iconClass.split(' ')[1] || 'text-success';
        }
        
        // Actualizar comparaciones
        updateComparisonValues(resumen);
        
    } catch (error) {
        console.error('❌ Error actualizando display de precios:', error);
    }
}

function updateComparisonValues(resumen) {
    var comparisons = {
        'precioHoy': resumen.actual,
        'precioSemana': resumen.promedioSemanal,
        'precioMes': resumen.promedioMensual,
        'precioMaximo': resumen.maximo,
        'precioMinimo': resumen.minimo
    };
    
    for (var id in comparisons) {
        if (comparisons.hasOwnProperty(id)) {
            var element = document.getElementById(id);
            if (element) {
                element.textContent = 'Q ' + comparisons[id].toFixed(2);
            }
        }
    }
}

function updateMarketsGrid() {
    try {
        var mercadosGrid = document.getElementById('mercadosGrid');
        if (!mercadosGrid) return;
        
        var html = '';
        
        mercados.forEach(function(mercado, id) {
            var precio = obtenerUltimoPrecioMercado(id);
            var cambio = calcularCambioMercado(id);
            var estado = mercado.active ? 'activo' : 'inactivo';
            var cambioClass = cambio >= 0 ? 'text-success' : 'text-danger';
            var cambioIcon = cambio >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            var signo = cambio >= 0 ? '+' : '';
            
            html += '<div class="mercado-card ' + mercado.type + '">' +
                '<div class="mercado-header">' +
                    '<div class="mercado-nombre">' +
                        '<i class="fas ' + mercado.icon + '"></i> ' + mercado.name +
                    '</div>' +
                    '<div class="badge badge-' + (mercado.active ? 'success' : 'secondary') + '">' + 
                        (mercado.active ? 'Activo' : 'Inactivo') +
                    '</div>' +
                '</div>' +
                '<div class="mercado-precio">Q ' + precio.toFixed(2) + '</div>' +
                '<div class="mercado-cambio ' + cambioClass + '">' +
                    '<i class="fas ' + cambioIcon + '"></i>' +
                    '<span>' + signo + 'Q ' + Math.abs(cambio).toFixed(2) + '</span>' +
                '</div>' +
                '<div class="text-muted small">Actualizado: Hoy</div>' +
                '</div>';
        });
        
        mercadosGrid.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error actualizando grid de mercados:', error);
    }
}

function updateAlertsPanel() {
    try {
        var alertasPanel = document.getElementById('listaAlertasPrecios');
        if (!alertasPanel) return;
        
        var html = '';
        
        alertasPrecios.forEach(function(alerta) {
            var alertClass = 'alert-' + alerta.tipo;
            var iconBg = getAlertIconBackground(alerta.tipo);
            
            html += '<div class="alert ' + alertClass + ' mb-3">' +
                '<div class="d-flex align-items-start">' +
                    '<div class="alert-icon me-3" style="background: ' + iconBg + ';">' +
                        '<i class="fas ' + alerta.icono + '"></i>' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<h6 class="alert-title">' + alerta.titulo + '</h6>' +
                        '<p class="alert-message mb-2">' + alerta.mensaje + '</p>' +
                        '<button class="btn btn-sm btn-' + getAlertButtonClass(alerta.tipo) + '" onclick="' + (alerta.actionFunction || 'handleAlertAction') + '(\'' + alerta.id + '\')">' +
                            alerta.accion +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '</div>';
        });
        
        alertasPanel.innerHTML = html || '<div class="text-center text-muted py-3"><i class="fas fa-check-circle"></i><br>No hay alertas pendientes</div>';
        
    } catch (error) {
        console.error('❌ Error actualizando panel de alertas:', error);
    }
}

function updateHistoryTable() {
    try {
        var tbody = document.getElementById('tablaPreciosBody');
        if (!tbody) return;
        
        var html = '';
        
        // Ordenar precios por fecha (más recientes primero)
        var preciosOrdenados = precios.slice().sort(function(a, b) {
            return new Date(b.fecha) - new Date(a.fecha);
        });
        
        preciosOrdenados.slice(0, 10).forEach(function(precio) { // Mostrar solo los 10 más recientes
            var mercadoConfig = mercadosConfig[precio.mercado];
            var badgeClass = 'badge-' + precio.mercado;
            var cambioClass = precio.cambio >= 0 ? 'text-success' : 'text-danger';
            var signo = precio.cambio >= 0 ? '+' : '';
            
            var fechaFormateada = formatearFecha(precio.fecha);
            
            html += '<tr>' +
                '<td>' + fechaFormateada + '</td>' +
                '<td><span class="badge ' + badgeClass + '">' + (mercadoConfig ? mercadoConfig.name : precio.mercado) + '</span></td>' +
                '<td>Q ' + precio.valor.toFixed(2) + '</td>' +
                '<td class="' + cambioClass + '">' + signo + precio.cambio.toFixed(1) + '%</td>' +
                '<td>' + precio.fuente + '</td>' +
                '<td class="d-none d-lg-table-cell">' + (precio.observaciones || '-') + '</td>' +
                '<td>' +
                    '<div class="btn-group btn-group-sm">' +
                        '<button class="btn btn-outline-primary" onclick="editarPrecio(\'' + precio.id + '\')" title="Editar">' +
                            '<i class="fas fa-edit"></i>' +
                        '</button>' +
                        '<button class="btn btn-outline-danger" onclick="eliminarPrecio(\'' + precio.id + '\')" title="Eliminar">' +
                            '<i class="fas fa-trash"></i>' +
                        '</button>' +
                    '</div>' +
                '</td>' +
                '</tr>';
        });
        
        tbody.innerHTML = html || '<tr><td colspan="7" class="text-center text-muted">No hay datos disponibles</td></tr>';
        
    } catch (error) {
        console.error('❌ Error actualizando tabla de historial:', error);
    }
}

function updateActionsPanel() {
    try {
        var accionesPanel = document.getElementById('accionesPrecios');
        if (!accionesPanel) return;
        
        var acciones = [
            {
                id: 'actualizar',
                icon: 'fa-sync-alt',
                titulo: 'Actualizar Precios',
                descripcion: 'Obtener últimos datos',
                color: '#f59e0b',
                action: 'actualizarPrecios'
            },
            {
                id: 'comparar',
                icon: 'fa-balance-scale',
                titulo: 'Comparar Mercados',
                descripcion: 'Análisis comparativo',
                color: '#3b82f6',
                action: 'compararMercados'
            },
            {
                id: 'prediccion',
                icon: 'fa-crystal-ball',
                titulo: 'Predicción IA',
                descripcion: 'Proyección de precios',
                color: '#8b5cf6',
                action: 'mostrarPredicciones'
            },
            {
                id: 'optimizar',
                icon: 'fa-bullseye',
                titulo: 'Optimizar Ventas',
                descripcion: 'Mejor momento',
                color: '#22c55e',
                action: 'optimizarMomentoVenta'
            }
        ];
        
        var html = '';
        
        acciones.forEach(function(accion) {
            html += '<div class="card card-hover cursor-pointer" onclick="' + accion.action + '()">' +
                '<div class="card-body d-flex align-items-center">' +
                    '<div class="icon-circle me-3" style="background: ' + accion.color + ';">' +
                        '<i class="fas ' + accion.icon + ' text-white"></i>' +
                    '</div>' +
                    '<div>' +
                        '<h6 class="card-title mb-1">' + accion.titulo + '</h6>' +
                        '<p class="card-text small text-muted mb-0">' + accion.descripcion + '</p>' +
                    '</div>' +
                '</div>' +
                '</div>';
        });
        
        accionesPanel.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error actualizando panel de acciones:', error);
    }
}

function updateLastUpdateTime() {
    try {
        var tiempoElement = document.getElementById('tiempoActualizacion');
        if (tiempoElement) {
            tiempoElement.textContent = 'pocos segundos';
        }
        
        var ultimaActualizacionElement = document.getElementById('ultimaActualizacion');
        if (ultimaActualizacionElement) {
            var now = new Date();
            var timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
            ultimaActualizacionElement.textContent = 'Hoy ' + timeString;
        }
        
    } catch (error) {
        console.error('❌ Error actualizando tiempo de actualización:', error);
    }
}

// ==========================================
// FUNCIONES PRINCIPALES DE NEGOCIO
// ==========================================

function obtenerResumenPrecios() {
    try {
        var preciosRecientes = precios.filter(function(p) {
            return p.fecha === preciosConfig.currentDate;
        });
        
        var preciosAnteriores = precios.filter(function(p) {
            return p.fecha !== preciosConfig.currentDate;
        });
        
        var actual = preciosRecientes.length > 0 
            ? preciosRecientes.reduce(function(sum, p) { return sum + p.valor; }, 0) / preciosRecientes.length 
            : 12.50;
        
        var anterior = preciosAnteriores.length > 0 
            ? preciosAnteriores.reduce(function(sum, p) { return sum + p.valor; }, 0) / preciosAnteriores.length 
            : 11.75;
        
        var cambio = actual - anterior;
        var porcentaje = anterior > 0 ? (cambio / anterior) * 100 : 0;
        
        return {
            actual: actual,
            cambio: cambio,
            porcentaje: porcentaje,
            hoy: actual,
            promedioSemanal: 11.80,
            promedioMensual: 11.25,
            maximo: 18.50,
            minimo: 9.50,
            mercados: {
                mayorista: obtenerUltimoPrecioMercado('mayorista'),
                minorista: obtenerUltimoPrecioMercado('minorista'),
                exportacion: obtenerUltimoPrecioMercado('exportacion'),
                finca: obtenerUltimoPrecioMercado('finca')
            }
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo resumen de precios:', error);
        return {
            actual: 0,
            cambio: 0,
            porcentaje: 0,
            hoy: 0,
            promedioSemanal: 0,
            promedioMensual: 0,
            maximo: 0,
            minimo: 0,
            mercados: {}
        };
    }
}

function obtenerUltimoPrecioMercado(mercado) {
    var preciosMercado = precios.filter(function(p) {
        return p.mercado === mercado;
    });
    
    if (preciosMercado.length === 0) {
        // Valores por defecto según el mercado
        var defaults = {
            'mayorista': 11.80,
            'minorista': 15.00,
            'exportacion': 18.50,
            'finca': 12.75
        };
        return defaults[mercado] || 12.00;
    }
    
    // Ordenar por fecha y obtener el más reciente
    preciosMercado.sort(function(a, b) {
        return new Date(b.fecha) - new Date(a.fecha);
    });
    
    return preciosMercado[0].valor;
}

function calcularCambioMercado(mercado) {
    var preciosMercado = precios.filter(function(p) {
        return p.mercado === mercado;
    }).sort(function(a, b) {
        return new Date(b.fecha) - new Date(a.fecha);
    });
    
    if (preciosMercado.length < 2) {
        return Math.random() * 4 - 2; // Valor aleatorio entre -2 y 2 para demo
    }
    
    var precioActual = preciosMercado[0].valor;
    var precioAnterior = preciosMercado[1].valor;
    
    return precioActual - precioAnterior;
}

function validarPrecioIntegrado(precio, cantidad, mercado) {
    try {
        var validacion = {
            precio: precio,
            cantidad: cantidad,
            mercado: mercado,
            valido: true,
            alertas: [],
            recomendaciones: [],
            datosCalculados: {}
        };
        
        if (!datosIntegracion.gastosIntegrados) {
            validacion.alertas.push({
                tipo: 'info',
                mensaje: 'Validación básica - sistema de gastos no integrado'
            });
            return validacion;
        }
        
        var costoPorKg = datosIntegracion.costosActuales.costoPorKg || 8.50;
        var ingresoTotal = precio * cantidad;
        var costoTotal = costoPorKg * cantidad;
        var ganancia = ingresoTotal - costoTotal;
        var margen = ingresoTotal > 0 ? (ganancia / ingresoTotal) * 100 : 0;
        
        validacion.datosCalculados = {
            costoPorKg: costoPorKg,
            ingresoTotal: ingresoTotal,
            costoTotal: costoTotal,
            ganancia: ganancia,
            margen: margen
        };
        
        // Validaciones críticas
        if (margen < 0) {
            validacion.valido = false;
            validacion.alertas.push({
                tipo: 'critica',
                mensaje: 'Precio por debajo del costo. Pérdida: Q' + Math.abs(ganancia).toFixed(2)
            });
        }
        
        // Validaciones de mercado
        var mercadoConfig = mercadosConfig[mercado];
        if (mercadoConfig) {
            if (margen < mercadoConfig.margenMinimo) {
                validacion.alertas.push({
                    tipo: 'advertencia',
                    mensaje: 'Margen por debajo del mínimo recomendado (' + mercadoConfig.margenMinimo + '%)'
                });
                
                var precioRecomendado = costoPorKg / (1 - mercadoConfig.margenMinimo / 100);
                validacion.recomendaciones.push({
                    tipo: 'precio_minimo',
                    mensaje: 'Precio mínimo recomendado: Q' + precioRecomendado.toFixed(2) + '/kg',
                    valor: precioRecomendado
                });
            }
        }
        
        return validacion;
        
    } catch (error) {
        console.error('❌ Error en validación integrada:', error);
        return {
            precio: precio,
            valido: false,
            alertas: [{ tipo: 'error', mensaje: 'Error en validación' }]
        };
    }
}

// ==========================================
// FUNCIONES DE INTERFAZ
// ==========================================

function actualizarPrecios() {
    try {
        console.log('🔄 Actualizando precios...');
        
        // Simular actualización
        showNotification('Actualizando precios de mercado...', 'info');
        
        setTimeout(function() {
            // Simular nuevos datos
            var factorCambio = 0.95 + (Math.random() * 0.1); // ±5% de cambio
            
            precios.forEach(function(precio) {
                if (precio.fecha === preciosConfig.currentDate) {
                    precio.valor *= factorCambio;
                }
            });
            
            updateUI();
            showNotification('Precios actualizados correctamente', 'success');
            
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error actualizando precios:', error);
        showNotification('Error actualizando precios', 'error');
    }
}

function guardarPrecioRapido() {
    try {
        var fecha = document.getElementById('fechaPrecio').value;
        var mercado = document.getElementById('mercadoPrecio').value;
        var valor = parseFloat(document.getElementById('valorPrecio').value);
        var fuente = document.getElementById('fuentePrecio').value;
        var observaciones = document.getElementById('observacionesPrecio').value;
        
        // Validación básica
        if (!fecha || !mercado || !valor || valor <= 0) {
            showNotification('Por favor complete todos los campos requeridos', 'warning');
            return;
        }
        
        // Validar precio integrado si es posible
        if (datosIntegracion.gastosIntegrados) {
            var validacion = validarPrecioIntegrado(valor, 1, mercado);
            if (!validacion.valido) {
                var mensaje = 'Advertencias de validación:\n';
                validacion.alertas.forEach(function(alerta) {
                    mensaje += '• ' + alerta.mensaje + '\n';
                });
                if (!confirm(mensaje + '\n¿Desea continuar?')) {
                    return;
                }
            }
        }
        
        var nuevoPrecio = {
            id: generatePrecioId(),
            fecha: fecha,
            mercado: mercado,
            valor: valor,
            fuente: fuente || 'Manual',
            observaciones: observaciones || '',
            cambio: calcularCambioPrecio(valor, mercado),
            tendencia: determinarTendencia(valor, mercado),
            createdAt: new Date().toISOString(),
            costoPorKg: datosIntegracion.costosActuales.costoPorKg || 0,
            margenCalculado: 0,
            rentabilidadValidada: datosIntegracion.gastosIntegrados
        };
        
        // Calcular margen si hay datos de gastos
        if (datosIntegracion.gastosIntegrados) {
            var costoPorKg = datosIntegracion.costosActuales.costoPorKg;
            nuevoPrecio.margenCalculado = costoPorKg > 0 ? ((valor - costoPorKg) / valor) * 100 : 0;
        }
        
        precios.unshift(nuevoPrecio);
        
        // Limpiar formulario
        document.getElementById('valorPrecio').value = '';
        document.getElementById('fuentePrecio').value = '';
        document.getElementById('observacionesPrecio').value = '';
        document.getElementById('mercadoPrecio').selectedIndex = 0;
        
        // Actualizar UI
        updateUI();
        
        // Guardar offline si está disponible
        if (offlineReady && window.offlineManager) {
            window.offlineManager.saveData('precios_historicos', nuevoPrecio.id, nuevoPrecio);
        }
        
        showNotification('Precio registrado correctamente', 'success');
        
        // Notificar al sistema
        dispatchSystemEvent('precioCreated', { precio: nuevoPrecio });
        
    } catch (error) {
        console.error('❌ Error guardando precio:', error);
        showNotification('Error guardando el precio', 'error');
    }
}

function mostrarFormularioPrecio() {
    // Scroll al formulario
    var formulario = document.querySelector('.form-precio');
    if (formulario) {
        formulario.scrollIntoView({ behavior: 'smooth' });
        
        // Focus en el primer campo
        setTimeout(function() {
            var primerCampo = document.getElementById('valorPrecio');
            if (primerCampo) {
                primerCampo.focus();
            }
        }, 500);
    }
}

function exportarAnalisis() {
    try {
        console.log('📊 Exportando análisis...');
        
        var resumen = obtenerResumenPrecios();
        var fecha = new Date().toLocaleDateString('es-GT');
        
        var contenido = '=== REPORTE DE PRECIOS - FINCA LA HERRADURA ===\n';
        contenido += 'Fecha: ' + fecha + '\n\n';
        contenido += 'RESUMEN DE PRECIOS:\n';
        contenido += '- Precio actual: Q' + resumen.actual.toFixed(2) + '\n';
        contenido += '- Cambio: ' + (resumen.cambio >= 0 ? '+' : '') + 'Q' + resumen.cambio.toFixed(2) + '\n';
        contenido += '- Porcentaje: ' + (resumen.porcentaje >= 0 ? '+' : '') + resumen.porcentaje.toFixed(1) + '%\n\n';
        
        contenido += 'PRECIOS POR MERCADO:\n';
        for (var mercado in resumen.mercados) {
            if (resumen.mercados.hasOwnProperty(mercado)) {
                var mercadoConfig = mercadosConfig[mercado];
                contenido += '- ' + (mercadoConfig ? mercadoConfig.name : mercado) + ': Q' + resumen.mercados[mercado].toFixed(2) + '\n';
            }
        }
        
        if (datosIntegracion.gastosIntegrados) {
            contenido += '\nANÁLISIS DE RENTABILIDAD:\n';
            contenido += '- Costo por kg: Q' + datosIntegracion.costosActuales.costoPorKg.toFixed(2) + '\n';
            
            for (var mercado in datosIntegracion.margenesCalculados) {
                if (datosIntegracion.margenesCalculados.hasOwnProperty(mercado)) {
                    var datos = datosIntegracion.margenesCalculados[mercado];
                    var mercadoConfig = mercadosConfig[mercado];
                    contenido += '- ' + (mercadoConfig ? mercadoConfig.name : mercado) + ': Margen ' + datos.margen.toFixed(1) + '%\n';
                }
            }
        }
        
        // Crear y descargar archivo
        var blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'analisis_precios_' + new Date().toISOString().split('T')[0] + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Análisis exportado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error exportando análisis:', error);
        showNotification('Error exportando el análisis', 'error');
    }
}

function aplicarFiltros() {
    try {
        var periodo = document.getElementById('filtroPeriodo').value;
        var mercado = document.getElementById('filtroMercado').value;
        var analisis = document.getElementById('filtroAnalisis').value;
        
        console.log('🔍 Aplicando filtros:', { periodo: periodo, mercado: mercado, analisis: analisis });
        
        // Aquí implementarías la lógica de filtrado
        showNotification('Filtros aplicados: ' + periodo + (mercado ? ', ' + mercado : ''), 'info');
        
        // Actualizar gráficos con datos filtrados
        updateChartsWithFilters(periodo, mercado, analisis);
        
    } catch (error) {
        console.error('❌ Error aplicando filtros:', error);
    }
}

function limpiarFiltros() {
    try {
        document.getElementById('filtroPeriodo').value = 'mes';
        document.getElementById('filtroMercado').value = '';
        document.getElementById('filtroAnalisis').value = 'tendencia';
        
        // Restaurar gráficos originales
        updateChartsWithFilters('mes', '', 'tendencia');
        
        showNotification('Filtros limpiados', 'info');
        
    } catch (error) {
        console.error('❌ Error limpiando filtros:', error);
    }
}

// ==========================================
// FUNCIONES DE ACCIONES
// ==========================================

function compararMercados() {
    console.log('📊 Comparando mercados...');
    showNotification('Análisis comparativo iniciado', 'info');
    
    // Aquí implementarías la lógica de comparación
}

function mostrarPredicciones() {
    console.log('🔮 Mostrando predicciones IA...');
    showNotification('Generando predicciones con IA...', 'info');
    
    // Aquí implementarías la lógica de predicción
}

function optimizarMomentoVenta() {
    console.log('🎯 Optimizando momento de venta...');
    showNotification('Analizando mejor momento para vender...', 'info');
    
    // Aquí implementarías la lógica de optimización
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

function generatePrecioId() {
    return 'PRECIO_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function dispatchSystemEvent(eventType, data) {
    try {
        window.dispatchEvent(new CustomEvent(eventType, {
            detail: {
                timestamp: Date.now(),
                source: 'preciosManager',
                data: data
            }
        }));
    } catch (error) {
        console.error('❌ Error despachando evento:', error);
    }
}

function formatearFecha(fechaStr) {
    try {
        var fecha = new Date(fechaStr + 'T00:00:00');
        var hoy = new Date();
        var ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        
        if (fecha.toDateString() === hoy.toDateString()) {
            return 'Hoy';
        } else if (fecha.toDateString() === ayer.toDateString()) {
            return 'Ayer';
        } else {
            return fecha.toLocaleDateString('es-GT', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    } catch (error) {
        return fechaStr;
    }
}

function calcularCambioPrecio(valor, mercado) {
    var preciosAnteriores = precios.filter(function(p) { 
        return p.mercado === mercado && p.fecha !== preciosConfig.currentDate; 
    });
    
    if (preciosAnteriores.length === 0) return 0;
    
    var ultimoPrecio = preciosAnteriores[0].valor;
    return ultimoPrecio > 0 ? ((valor - ultimoPrecio) / ultimoPrecio) * 100 : 0;
}

function determinarTendencia(valor, mercado) {
    var cambio = calcularCambioPrecio(valor, mercado);
    
    if (cambio > 2) return 'up';
    if (cambio < -2) return 'down';
    return 'stable';
}

function showNotification(message, type) {
    try {
        // Crear notificación simple
        var notification = document.createElement('div');
        notification.className = 'notification notification-' + type;
        notification.textContent = message;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; padding: 1rem; border-radius: 8px; color: white; font-weight: 500; max-width: 300px;';
        
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#22c55e';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f59e0b';
                break;
            default:
                notification.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.style.opacity = '0';
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error mostrando notificación:', error);
    }
}

function getAlertIconBackground(tipo) {
    switch (tipo) {
        case 'oportunidad': return '#22c55e';
        case 'advertencia': return '#f59e0b';
        case 'critica': return '#ef4444';
        default: return '#3b82f6';
    }
}

function getAlertButtonClass(tipo) {
    switch (tipo) {
        case 'oportunidad': return 'success';
        case 'advertencia': return 'warning';
        case 'critica': return 'danger';
        default: return 'primary';
    }
}

function getMarginRecommendation(margen, mercadoConfig) {
    if (!mercadoConfig) return 'Analizar mercado';
    
    if (margen < 0) return 'CRÍTICO: Precio por debajo del costo';
    if (margen < mercadoConfig.margenMinimo) return 'Aumentar precio para cubrir costos';
    if (margen < mercadoConfig.margenOptimo) return 'Margen aceptable, evaluar mejora';
    return 'Margen óptimo, mantener estrategia';
}

// ==========================================
// FUNCIONES DE GRÁFICOS AUXILIARES
// ==========================================

function updateChartsWithFilters(periodo, mercado, analisis) {
    try {
        // Actualizar datos de los gráficos según filtros
        if (graficoEvolucion) {
            // Aquí actualizarías los datos del gráfico de evolución
            graficoEvolucion.update();
        }
        
        if (graficoComparativo) {
            // Aquí actualizarías los datos del gráfico comparativo
            graficoComparativo.update();
        }
        
    } catch (error) {
        console.error('❌ Error actualizando gráficos con filtros:', error);
    }
}

// ==========================================
// FUNCIONES GLOBALES PARA EVENTOS
// ==========================================

function editarPrecio(id) {
    console.log('✏️ Editando precio:', id);
    showNotification('Función de edición en desarrollo', 'info');
}

function eliminarPrecio(id) {
    if (!confirm('¿Está seguro de eliminar este precio?')) {
        return;
    }
    
    try {
        precios = precios.filter(function(p) { return p.id !== id; });
        updateUI();
        showNotification('Precio eliminado correctamente', 'success');
    } catch (error) {
        console.error('❌ Error eliminando precio:', error);
        showNotification('Error eliminando precio', 'error');
    }
}

function handleAlertAction(alertId) {
    console.log('🚨 Manejando acción de alerta:', alertId);
    showNotification('Procesando acción de alerta...', 'info');
}

function verAnalisisOportunidad() {
    console.log('📈 Mostrando análisis de oportunidad');
    showNotification('Abriendo análisis detallado...', 'info');
}

function verDetallesVolatilidad() {
    console.log('📊 Mostrando detalles de volatilidad');
    showNotification('Cargando datos de volatilidad...', 'info');
}

function ajustarPrecio() {
    console.log('💰 Iniciando ajuste de precio');
    showNotification('Abriendo asistente de ajuste de precios...', 'info');
}

function verAnalisisMargen() {
    console.log('📊 Mostrando análisis de márgenes');
    showNotification('Cargando análisis de rentabilidad...', 'info');
}

// ==========================================
// MANAGER GLOBAL EXPORTADO
// ==========================================

// Crear manager global
window.preciosManager = {
    // Estado del sistema
    getStatus: function() {
        return {
            initialized: systemInitialized,
            authReady: authReady,
            offlineReady: offlineReady,
            syncReady: syncReady,
            preciosCount: precios.length,
            mercadosCount: mercados.size,
            integrated: datosIntegracion.gastosIntegrados
        };
    },
    
    // Datos principales
    obtenerResumenPrecios: obtenerResumenPrecios,
    obtenerPrecios: function() { return precios; },
    obtenerMercados: function() { return mercados; },
    obtenerAlertas: function() { return alertasPrecios; },
    
    // Gestión de precios
    registrarPrecio: function(datos) {
        return new Promise(function(resolve, reject) {
            try {
                var nuevoPrecio = {
                    id: generatePrecioId(),
                    fecha: datos.fecha,
                    mercado: datos.mercado,
                    valor: datos.valor,
                    fuente: datos.fuente || 'API',
                    observaciones: datos.observaciones || '',
                    cambio: calcularCambioPrecio(datos.valor, datos.mercado),
                    tendencia: determinarTendencia(datos.valor, datos.mercado),
                    createdAt: new Date().toISOString(),
                    costoPorKg: datosIntegracion.costosActuales.costoPorKg || 0,
                    margenCalculado: 0,
                    rentabilidadValidada: datosIntegracion.gastosIntegrados
                };
                
                precios.unshift(nuevoPrecio);
                updateUI();
                
                dispatchSystemEvent('precioCreated', { precio: nuevoPrecio });
                resolve(nuevoPrecio);
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    // Validación integrada
    validarPrecioIntegrado: validarPrecioIntegrado,
    
    // Integración
    syncWithExpenseSystem: syncWithExpenseSystem,
    calculateRealMargins: calculateRealMargins,
    
    // UI
    updateUI: updateUI,
    
    // Datos de integración
    getDatosIntegracion: function() { return datosIntegracion; }
};

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('💲 Iniciando aplicación de gestión de precios integrada...');
    
    // Inicializar sistema de carga
    initializeLoadingSystem();
    
    // Inicializar sistema principal
    setTimeout(function() {
        initializePreciosSystem();
    }, 500);
});

console.log('💲 Sistema de gestión de precios INTEGRADO cargado - JavaScript puro v13');
