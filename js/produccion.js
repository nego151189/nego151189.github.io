/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRODUCCIÓN
   Sistema integrado con archivos base - JavaScript puro
   v14 - CORREGIDO E INTEGRADO vfull
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
var treeManagerReady = false;
var chartsReady = false;
var chartsInitialized = false;

// Datos en memoria
var productionData = [];
var treeOptions = [];
var sectorOptions = [];
var kpisData = {};

// Managers integrados
var managers = {
    tree: null,
    offline: null,
    sync: null,
    auth: null,
    climate: null
};

// Variables para gráficos
var graficoProduccion = null;
var graficoRendimiento = null;

// Configuración
var productionConfig = {
    fincaId: 'finca_la_herradura',
    limonesPorKg: 7,
    chartUpdateDebounce: 1000,
    currentDate: new Date().toISOString().split('T')[0]
};

// Control de timeouts
var chartUpdateTimeout = null;
var dataRefreshTimeout = null;

// ==========================================
// SISTEMA DE CARGA MEJORADO
// ==========================================

function initializeLoadingSystem() {
    console.log('🌱 Iniciando sistema de carga de producción...');
    
    var loader = document.getElementById('productionLoader');
    var progressBar = document.getElementById('productionLoaderProgressBar');
    var loaderMessage = document.getElementById('productionLoaderMessage');
    var loaderIcon = document.getElementById('productionLoaderIcon');
    
    var steps = {
        step1: { element: document.getElementById('productionStep1'), label: 'Conectando con base de datos...', progress: 25 },
        step2: { element: document.getElementById('productionStep2'), label: 'Cargando gráficos...', progress: 50 },
        step3: { element: document.getElementById('productionStep3'), label: 'Sincronizando árboles...', progress: 75 },
        step4: { element: document.getElementById('productionStep4'), label: 'Sistema de producción listo!', progress: 100 }
    };
    
    var currentStep = 0;
    var stepKeys = Object.keys(steps);
    
    function updateProductionLoadingStep(stepKey) {
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
                    stepElement.className = 'production-loader-step completed';
                } else if (currentStepKey === stepKey) {
                    stepElement.className = 'production-loader-step active';
                } else {
                    stepElement.className = 'production-loader-step';
                }
            }
            
            // Cambiar ícono según el paso
            var icons = ['fa-database', 'fa-chart-bar', 'fa-tree', 'fa-check-circle'];
            loaderIcon.className = 'fas ' + icons[currentStep];
            
            currentStep++;
            
            console.log('🌱 Paso de carga producción:', step.label);
            
        } catch (error) {
            console.error('❌ Error actualizando paso de carga:', error);
        }
    }
    
    function hideProductionLoader() {
        try {
            setTimeout(function() {
                if (loader) {
                    loader.classList.add('loaded');
                    setTimeout(function() {
                        loader.style.display = 'none';
                    }, 800);
                }
                console.log('✅ Sistema de carga de producción completado');
            }, 500);
        } catch (error) {
            console.error('❌ Error ocultando loader de producción:', error);
        }
    }
    
    // Exponer funciones globalmente
    window.updateProductionLoadingStep = updateProductionLoadingStep;
    window.hideProductionLoader = hideProductionLoader;
}

// ==========================================
// INICIALIZACIÓN DEL SISTEMA PRINCIPAL
// ==========================================

function initializeProductionSystem() {
    try {
        console.log('🌱 Iniciando sistema de gestión de producción...');
        
        // Paso 1: Conectar con base de datos
        window.updateProductionLoadingStep('step1');
        
        // Esperar a que otros sistemas estén listos
        waitForProductionDependencies().then(function() {
            
            // Cargar datos reales únicamente
            loadRealProductionData().then(function() {
                
                // Paso 2: Inicializar gráficos
                window.updateProductionLoadingStep('step2');
                setTimeout(function() {
                    initializeProductionCharts();
                    
                    // Paso 3: Sincronizar árboles
                    window.updateProductionLoadingStep('step3');
                    setTimeout(function() {
                        setupTreeIntegration();
                        setupEventListeners();
                        setupFormDefaults();
                        updateUI();
                        
                        // Paso 4: Sistema listo
                        window.updateProductionLoadingStep('step4');
                        setTimeout(function() {
                            systemInitialized = true;
                            window.hideProductionLoader();
                            
                            // Notificar que el sistema está listo
                            dispatchProductionEvent('productionSystemReady', {
                                recordsCount: productionData.length,
                                treeOptionsCount: treeOptions.length,
                                integrated: true
                            });
                            
                            console.log('✅ Sistema de producción inicializado completamente');
                            
                        }, 1000);
                    }, 1500);
                }, 1000);
            });
        });
        
    } catch (error) {
        console.error('❌ Error en inicialización de producción:', error);
        setTimeout(window.hideProductionLoader, 2000);
    }
}

function waitForProductionDependencies() {
    return new Promise(function(resolve) {
        var maxWait = 20000; // 20 segundos máximo
        var checkInterval = 300;
        var elapsed = 0;
        
        function checkDependencies() {
            try {
                // Verificar dependencias críticas
                authReady = window.authManager && typeof window.authManager.getCurrentUser === 'function';
                offlineReady = window.offlineManager && typeof window.offlineManager.saveData === 'function';
                syncReady = window.dataSyncManager && typeof window.dataSyncManager.syncData === 'function';
                navigationReady = window.navigationManager && typeof window.navigationManager.init === 'function';
                treeManagerReady = window.treeManager && typeof window.treeManager.getAllTrees === 'function';
                chartsReady = window.Chart && typeof window.Chart === 'function';
                
                var allReady = authReady && offlineReady && syncReady && navigationReady && chartsReady;
                
                console.log('🔍 Verificando dependencias de producción:', {
                    auth: authReady,
                    offline: offlineReady,
                    sync: syncReady,
                    navigation: navigationReady,
                    treeManager: treeManagerReady,
                    charts: chartsReady,
                    allReady: allReady
                });
                
                if (allReady || elapsed >= maxWait) {
                    if (allReady) {
                        console.log('✅ Todas las dependencias de producción están listas');
                        
                        // Asignar managers disponibles
                        managers.tree = window.treeManager;
                        managers.offline = window.offlineManager;
                        managers.sync = window.dataSyncManager;
                        managers.auth = window.authManager;
                        managers.climate = window.climateManager;
                        
                    } else {
                        console.warn('⚠️ Timeout esperando dependencias de producción, continuando...');
                    }
                    resolve();
                } else {
                    elapsed += checkInterval;
                    setTimeout(checkDependencies, checkInterval);
                }
                
            } catch (error) {
                console.error('❌ Error verificando dependencias de producción:', error);
                resolve(); // Continuar aunque haya error
            }
        }
        
        checkDependencies();
    });
}

// ==========================================
// CARGA DE DATOS REALES
// ==========================================

function loadRealProductionData() {
    return new Promise(function(resolve) {
        console.log('📊 Cargando datos reales de producción...');
        
        // Cargar desde Firebase si está disponible
        if (window.db) {
            loadProductionFromFirebase().then(function() {
                // Cargar opciones de formularios
                loadTreeOptionsFromDatabase().then(function() {
                    // Calcular KPIs reales
                    calculateRealKPIs();
                    resolve();
                });
            });
        } else {
            // Sin Firebase, cargar opciones básicas si hay TreeManager
            loadTreeOptionsFromDatabase().then(function() {
                calculateRealKPIs();
                resolve();
            });
        }
    });
}

function loadProductionFromFirebase() {
    return new Promise(function(resolve) {
        try {
            window.db.collection('cosechas')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get()
                .then(function(snapshot) {
                    productionData = [];
                    snapshot.forEach(function(doc) {
                        productionData.push({
                            id: doc.id,
                            fecha: doc.data().fecha,
                            arbolId: doc.data().arbolId,
                            cantidad: doc.data().cantidad,
                            tipo: doc.data().tipo,
                            calidad: doc.data().calidad,
                            observaciones: doc.data().observaciones,
                            timestamp: doc.data().timestamp,
                            createdAt: doc.data().createdAt
                        });
                    });
                    
                    console.log('✅ Datos de producción cargados desde Firebase:', productionData.length + ' registros');
                    resolve();
                })
                .catch(function(error) {
                    console.error('❌ Error cargando datos de Firebase:', error);
                    productionData = [];
                    resolve();
                });
                
        } catch (error) {
            console.error('❌ Error accediendo a Firebase:', error);
            productionData = [];
            resolve();
        }
    });
}

function loadTreeOptionsFromDatabase() {
    return new Promise(function(resolve) {
        try {
            treeOptions = [];
            sectorOptions = [];
            
            if (!managers.tree) {
                console.log('📊 TreeManager no disponible, usando opciones básicas');
                showEmptyTreeOptions();
                resolve();
                return;
            }
            
            // Cargar sectores
            if (managers.tree.getAllSectors) {
                managers.tree.getAllSectors().then(function(sectors) {
                    sectors.forEach(function(sector) {
                        sectorOptions.push({
                            value: sector.id,
                            label: '📦 ' + (sector.name || sector.correlative || sector.id) + ' (Sector completo)',
                            type: 'sector'
                        });
                    });
                    
                    // Cargar árboles
                    if (managers.tree.getAllTrees) {
                        managers.tree.getAllTrees().then(function(trees) {
                            trees.forEach(function(tree) {
                                if (tree.active !== false) {
                                    var sectorName = sectors.find(function(s) { return s.id === tree.blockId; });
                                    var sectorLabel = sectorName ? sectorName.name : 'Sin sector';
                                    
                                    treeOptions.push({
                                        value: tree.id,
                                        label: '🌳 Árbol ' + (tree.correlative || tree.id.substring(0, 8)) + ' - ' + sectorLabel,
                                        type: 'tree'
                                    });
                                }
                            });
                            
                            // Combinar opciones
                            var allOptions = sectorOptions.concat(treeOptions);
                            
                            // Ordenar: sectores primero
                            allOptions.sort(function(a, b) {
                                if (a.type === 'sector' && b.type === 'tree') return -1;
                                if (a.type === 'tree' && b.type === 'sector') return 1;
                                return a.label.localeCompare(b.label);
                            });
                            
                            updateFormSelects(allOptions);
                            console.log('✅ Opciones de árboles cargadas:', allOptions.length);
                            resolve();
                        }).catch(function(error) {
                            console.error('❌ Error cargando árboles:', error);
                            showEmptyTreeOptions();
                            resolve();
                        });
                    } else {
                        showEmptyTreeOptions();
                        resolve();
                    }
                }).catch(function(error) {
                    console.error('❌ Error cargando sectores:', error);
                    showEmptyTreeOptions();
                    resolve();
                });
            } else {
                showEmptyTreeOptions();
                resolve();
            }
            
        } catch (error) {
            console.error('❌ Error cargando opciones de árboles:', error);
            showEmptyTreeOptions();
            resolve();
        }
    });
}

function showEmptyTreeOptions() {
    var selects = ['arbolCorte', 'arbolCompleto'];
    selects.forEach(function(selectId) {
        var select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">No hay árboles/sectores disponibles</option>';
            select.disabled = true;
        }
    });
}

function updateFormSelects(options) {
    var selects = ['arbolCorte', 'arbolCompleto'];
    
    selects.forEach(function(selectId) {
        var select = document.getElementById(selectId);
        if (select) {
            var currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar...</option>';
            select.disabled = false;
            
            options.forEach(function(option) {
                var opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.label;
                select.appendChild(opt);
            });
            
            // Restaurar valor si era válido
            if (currentValue && options.some(function(opt) { return opt.value === currentValue; })) {
                select.value = currentValue;
            }
        }
    });
}

function calculateRealKPIs() {
    try {
        if (productionData.length === 0) {
            showEmptyKPIs();
            return;
        }
        
        var now = new Date();
        var thisMonth = now.getMonth();
        var thisYear = now.getFullYear();
        
        // Filtrar datos del mes actual
        var monthlyData = productionData.filter(function(record) {
            var recordDate = new Date(record.fecha);
            return recordDate.getMonth() === thisMonth && 
                   recordDate.getFullYear() === thisYear;
        });
        
        // Calcular KPIs desde datos reales
        var produccionMes = monthlyData.reduce(function(sum, record) { 
            return sum + (record.cantidad || 0); 
        }, 0);
        
        var numRegistros = monthlyData.length;
        var rendimientoPromedio = numRegistros > 0 ? produccionMes / numRegistros : 0;
        
        var calidadPromedio = 0;
        if (numRegistros > 0) {
            var totalCalidad = monthlyData.reduce(function(sum, record) { 
                return sum + (record.calidad || 0); 
            }, 0);
            calidadPromedio = totalCalidad / numRegistros;
        }
        
        var ingresosMes = produccionMes * 7.5; // Precio promedio por kg
        
        // Guardar datos para uso posterior
        kpisData = {
            produccionMes: produccionMes,
            rendimientoPromedio: rendimientoPromedio,
            calidadPromedio: calidadPromedio,
            ingresosMes: ingresosMes,
            numRegistros: numRegistros
        };
        
        console.log('📊 KPIs calculados con ' + numRegistros + ' registros del mes');
        
    } catch (error) {
        console.error('❌ Error calculando KPIs:', error);
        showEmptyKPIs();
    }
}

function showEmptyKPIs() {
    kpisData = {
        produccionMes: 0,
        rendimientoPromedio: 0,
        calidadPromedio: 0,
        ingresosMes: 0,
        numRegistros: 0
    };
}

// ==========================================
// INTEGRACIÓN CON OTROS SISTEMAS
// ==========================================

function setupTreeIntegration() {
    try {
        console.log('🌳 Configurando integración con sistema de árboles...');
        
        // Configurar eventos de integración
        setupProductionIntegrationEvents();
        
        // Sincronizar con otros sistemas si están disponibles
        if (managers.sync) {
            syncWithOtherSystems();
        }
        
        console.log('✅ Integración con árboles configurada');
        
    } catch (error) {
        console.error('❌ Error configurando integración con árboles:', error);
    }
}

function setupProductionIntegrationEvents() {
    // Escuchar cambios en árboles para actualizar opciones
    window.addEventListener('treeCreated', function(event) {
        setTimeout(function() {
            loadTreeOptionsFromDatabase();
        }, 500);
    });
    
    window.addEventListener('treeUpdated', function(event) {
        setTimeout(function() {
            loadTreeOptionsFromDatabase();
        }, 500);
    });
    
    // Escuchar solicitudes de datos de producción desde otros módulos
    window.addEventListener('productionDataRequested', function(event) {
        var summary = getProductionSummary();
        
        window.dispatchEvent(new CustomEvent('productionDataResponse', {
            detail: summary
        }));
    });
    
    // Escuchar cambios de autenticación
    window.addEventListener('authStateChanged', function(event) {
        if (event.detail.authenticated) {
            loadUserProductionData();
        }
    });
}

function syncWithOtherSystems() {
    try {
        // Sincronizar con sistema de precios si está disponible
        if (window.preciosManager) {
            var productionSummary = getProductionSummary();
            
            // Notificar datos de producción al sistema de precios
            window.dispatchEvent(new CustomEvent('productionDataSync', {
                detail: {
                    summary: productionSummary,
                    lastUpdate: new Date().toISOString()
                }
            }));
        }
        
        // Sincronizar con sistema de gastos si está disponible
        if (window.expenseManager) {
            // Aquí podrías sincronizar costos de producción
        }
        
        console.log('🔄 Sincronización con otros sistemas completa');
        
    } catch (error) {
        console.error('❌ Error sincronizando con otros sistemas:', error);
    }
}

// ==========================================
// INICIALIZACIÓN DE GRÁFICOS
// ==========================================

function initializeProductionCharts() {
    try {
        if (!window.Chart) {
            console.warn('⚠️ Chart.js no disponible');
            showEmptyCharts();
            return;
        }
        
        if (chartsInitialized) {
            console.log('📊 Gráficos ya inicializados');
            return;
        }
        
        console.log('📊 Inicializando gráficos de producción...');
        
        // Configuración global optimizada
        Chart.defaults.animation = false;
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.interaction.intersect = false;
        Chart.defaults.interaction.mode = 'index';
        
        // Solo crear gráficos si hay datos reales
        if (productionData.length === 0) {
            showEmptyCharts();
            return;
        }
        
        // Crear gráficos
        createProductionEvolutionChart();
        createSectorPerformanceChart();
        
        chartsInitialized = true;
        console.log('📊 Gráficos de producción inicializados correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando gráficos de producción:', error);
        showEmptyCharts();
    }
}

function createProductionEvolutionChart() {
    try {
        var ctx = document.getElementById('graficoProduccion');
        if (!ctx) return;
        
        // Destruir gráfico existente si existe
        if (graficoProduccion) {
            graficoProduccion.destroy();
        }
        
        // Preparar datos de los últimos 7 días
        var chartData = prepareEvolutionChartData();
        
        graficoProduccion = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Producción (kg)',
                    data: chartData.values,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#16a34a',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' kg';
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando gráfico de evolución:', error);
    }
}

function createSectorPerformanceChart() {
    try {
        var ctx = document.getElementById('graficoRendimiento');
        if (!ctx) return;
        
        // Destruir gráfico existente si existe
        if (graficoRendimiento) {
            graficoRendimiento.destroy();
        }
        
        // Preparar datos por sector
        var chartData = prepareSectorChartData();
        
        graficoRendimiento = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Rendimiento (kg)',
                    data: chartData.values,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' kg';
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando gráfico de rendimiento:', error);
    }
}

function prepareEvolutionChartData() {
    var chartData = {
        labels: [],
        values: []
    };
    
    // Generar últimos 7 días
    var last7Days = [];
    for (var i = 6; i >= 0; i--) {
        var date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date);
    }
    
    last7Days.forEach(function(date) {
        var dayData = productionData.filter(function(record) {
            var recordDate = new Date(record.fecha);
            return recordDate.toDateString() === date.toDateString();
        });
        
        var totalKg = dayData.reduce(function(sum, record) {
            return sum + (record.cantidad || 0);
        }, 0);
        
        chartData.labels.push(date.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric' }));
        chartData.values.push(totalKg);
    });
    
    return chartData;
}

function prepareSectorChartData() {
    var chartData = {
        labels: [],
        values: []
    };
    
    // Agrupar por árbol/sector
    var sectorData = {};
    productionData.forEach(function(record) {
        var key = record.arbolId || 'Sin especificar';
        if (!sectorData[key]) {
            sectorData[key] = 0;
        }
        sectorData[key] += record.cantidad || 0;
    });
    
    // Convertir a array y ordenar
    var sortedData = Object.entries(sectorData)
        .sort(function(a, b) { return b[1] - a[1]; })
        .slice(0, 6); // Solo top 6
    
    sortedData.forEach(function(entry) {
        var key = entry[0];
        var value = entry[1];
        
        // Buscar nombre amigable
        var friendlyName = key;
        if (key.length > 15) {
            friendlyName = key.substring(0, 15) + '...';
        }
        
        // Buscar en opciones cargadas
        var option = treeOptions.find(function(opt) { return opt.value === key; });
        if (option) {
            friendlyName = option.label.replace('🌳 ', '').replace('📦 ', '');
            if (friendlyName.length > 20) {
                friendlyName = friendlyName.substring(0, 20) + '...';
            }
        }
        
        chartData.labels.push(friendlyName);
        chartData.values.push(value);
    });
    
    return chartData;
}

function showEmptyCharts() {
    var containers = [
        { id: 'containerGraficoProduccion', title: 'Evolución de la Producción', icon: 'fa-chart-line' },
        { id: 'containerGraficoRendimiento', title: 'Rendimiento por Sector', icon: 'fa-chart-bar' }
    ];
    
    containers.forEach(function(container) {
        var element = document.getElementById(container.id);
        if (element) {
            element.innerHTML = '<div class="empty-state">' +
                '<div class="empty-state-icon">' +
                    '<i class="fas ' + container.icon + '"></i>' +
                '</div>' +
                '<h3>' + container.title + '</h3>' +
                '<p>Sin datos para mostrar</p>' +
                '<p>Registra tu primera cosecha para ver gráficos</p>' +
                '</div>';
        }
    });
}

// ==========================================
// EVENT LISTENERS Y CONFIGURACIÓN
// ==========================================

function setupEventListeners() {
    try {
        console.log('🔧 Configurando event listeners de producción...');
        
        // Botones principales del header
        var btnNuevoCorte = document.getElementById('btnNuevoCorte');
        if (btnNuevoCorte) {
            btnNuevoCorte.addEventListener('click', function() {
                abrirModal('modalNuevoCorte');
            });
        }
        
        var btnRegistroCompleto = document.getElementById('btnRegistroCompleto');
        if (btnRegistroCompleto) {
            btnRegistroCompleto.addEventListener('click', function() {
                abrirModal('modalRegistroCompleto');
            });
        }
        
        var btnExportarDatos = document.getElementById('btnExportarDatos');
        if (btnExportarDatos) {
            btnExportarDatos.addEventListener('click', exportarDatos);
        }
        
        // Acciones rápidas
        var accionNuevoCorte = document.getElementById('accionNuevoCorte');
        if (accionNuevoCorte) {
            accionNuevoCorte.addEventListener('click', function() {
                abrirModal('modalNuevoCorte');
            });
        }
        
        var accionControlCalidad = document.getElementById('accionControlCalidad');
        if (accionControlCalidad) {
            accionControlCalidad.addEventListener('click', function() {
                ejecutarAccionRapida('control-calidad');
            });
        }
        
        var accionReporteDiario = document.getElementById('accionReporteDiario');
        if (accionReporteDiario) {
            accionReporteDiario.addEventListener('click', function() {
                ejecutarAccionRapida('reporte-diario');
            });
        }
        
        var accionPlanificar = document.getElementById('accionPlanificar');
        if (accionPlanificar) {
            accionPlanificar.addEventListener('click', function() {
                ejecutarAccionRapida('planificar-cosecha');
            });
        }
        
        // Formularios
        var formNuevoCorte = document.getElementById('formNuevoCorte');
        if (formNuevoCorte) {
            formNuevoCorte.addEventListener('submit', handleNuevoCorte);
        }
        
        var formRegistroCompleto = document.getElementById('formRegistroCompleto');
        if (formRegistroCompleto) {
            formRegistroCompleto.addEventListener('submit', handleRegistroCompleto);
        }
        
        // Resize de gráficos con debounce
        window.addEventListener('resize', debounceChartResize);
        
        console.log('✅ Event listeners de producción configurados');
        
    } catch (error) {
        console.error('❌ Error configurando event listeners:', error);
    }
}

function setupFormDefaults() {
    try {
        var today = new Date().toISOString().split('T')[0];
        var now = new Date().toISOString().slice(0, 16);
        
        updateElementProperty('fechaCorte', 'value', today);
        updateElementProperty('fechaCompleta', 'value', now);
        
        console.log('📝 Valores por defecto de formularios configurados');
        
    } catch (error) {
        console.error('❌ Error configurando formularios:', error);
    }
}

// ==========================================
// ACTUALIZACIÓN DE UI
// ==========================================

function updateUI() {
    try {
        console.log('🎨 Actualizando interfaz de usuario de producción...');
        
        updateKPIsDisplay();
        updateTimelineDisplay();
        updateRecentRecordsTable();
        updateSystemStatus();
        
        console.log('✅ Interfaz de usuario actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando UI:', error);
    }
}

function updateKPIsDisplay() {
    try {
        var produccionText = kpisData.produccionMes > 0 ? 
            Math.round(kpisData.produccionMes) + ' kg' : '0 kg';
        
        var rendimientoText = kpisData.rendimientoPromedio > 0 ? 
            (Math.round(kpisData.rendimientoPromedio * 100) / 100) + ' kg/registro' : '0 kg/registro';
        
        var calidadText = kpisData.calidadPromedio > 0 ? 
            Math.round(kpisData.calidadPromedio) + '%' : 'N/A';
        
        var ingresosText = kpisData.ingresosMes > 0 ? 
            'Q ' + Math.round(kpisData.ingresosMes).toLocaleString() : 'Q 0';
        
        updateElementContent('produccionMes', produccionText);
        updateElementContent('rendimientoPromedio', rendimientoText);
        updateElementContent('calidadPromedio', calidadText);
        updateElementContent('ingresosMes', ingresosText);
        
    } catch (error) {
        console.error('❌ Error actualizando KPIs:', error);
    }
}

function updateTimelineDisplay() {
    try {
        var container = document.getElementById('timelineProduccion');
        if (!container) return;
        
        if (productionData.length === 0) {
            container.innerHTML = '<div class="empty-state">' +
                '<div class="empty-state-icon">' +
                    '<i class="fas fa-seedling"></i>' +
                '</div>' +
                '<h3>No hay registros de producción</h3>' +
                '<p>Los registros aparecerán aquí cuando registres tu primera cosecha</p>' +
                '</div>';
            return;
        }
        
        // Mostrar solo datos reales - últimos 5 registros
        var recentData = productionData
            .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); })
            .slice(0, 5);
            
        var html = recentData.map(function(record) {
            var fechaFormateada = formatDate(record.fecha);
            var descripcion = record.observaciones || 'Cosecha registrada';
            var cantidad = record.cantidad || 0;
            var calidadHtml = record.calidad ? 
                '<div class="text-muted small">Calidad: ' + record.calidad + '%</div>' : '';
            
            return '<div class="timeline-item">' +
                '<div class="text-muted small mb-1">' + fechaFormateada + '</div>' +
                '<div class="fw-semibold">' + descripcion + '</div>' +
                '<div class="text-success fw-bold fs-5 mt-1">' + cantidad + ' kg</div>' +
                calidadHtml +
                '</div>';
        }).join('');
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error actualizando timeline:', error);
    }
}

function updateRecentRecordsTable() {
    try {
        var tbody = document.getElementById('tablaProduccionBody');
        if (!tbody) return;
        
        if (productionData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay registros de producción</td></tr>';
            return;
        }
        
        // Mostrar últimos 10 registros
        var recentRecords = productionData
            .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); })
            .slice(0, 10);
        
        var html = recentRecords.map(function(record) {
            var fechaFormateada = formatDateShort(record.fecha);
            var arbolDisplay = getTreeDisplayName(record.arbolId);
            var tipoDisplay = record.tipo ? 
                '<span class="badge badge-' + record.tipo + '">' + record.tipo + '</span>' : 
                '<span class="badge badge-secondary">Sin tipo</span>';
            var calidadDisplay = record.calidad ? 
                '<span class="d-none d-lg-table-cell">' + record.calidad + '%</span>' : 
                '<span class="d-none d-lg-table-cell">-</span>';
            
            return '<tr>' +
                '<td>' + fechaFormateada + '</td>' +
                '<td>' + arbolDisplay + '</td>' +
                '<td class="fw-semibold">' + (record.cantidad || 0) + ' kg</td>' +
                '<td>' + tipoDisplay + '</td>' +
                calidadDisplay +
                '<td>' +
                    '<div class="btn-group btn-group-sm">' +
                        '<button class="btn btn-outline-primary" onclick="editarRegistro(\'' + record.id + '\')" title="Editar">' +
                            '<i class="fas fa-edit"></i>' +
                        '</button>' +
                        '<button class="btn btn-outline-danger" onclick="eliminarRegistro(\'' + record.id + '\')" title="Eliminar">' +
                            '<i class="fas fa-trash"></i>' +
                        '</button>' +
                    '</div>' +
                '</td>' +
                '</tr>';
        }).join('');
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error actualizando tabla:', error);
    }
}

function updateSystemStatus() {
    try {
        var statusElement = document.getElementById('estadoProduccion');
        if (statusElement) {
            var statusText = systemInitialized ? 'Sistema listo' : 'Cargando...';
            var statusIcon = systemInitialized ? 'fa-check-circle' : 'fa-spinner fa-spin';
            
            statusElement.innerHTML = '<i class="fas ' + statusIcon + '"></i> <span>' + statusText + '</span>';
        }
    } catch (error) {
        console.error('❌ Error actualizando estado del sistema:', error);
    }
}

// ==========================================
// MANEJO DE FORMULARIOS
// ==========================================

function handleNuevoCorte(event) {
    event.preventDefault();
    
    try {
        var datos = {
            fecha: document.getElementById('fechaCorte').value,
            arbolId: document.getElementById('arbolCorte').value,
            cantidad: parseFloat(document.getElementById('cantidadCorte').value),
            tipo: document.getElementById('tipoCorte').value
        };
        
        // Validaciones
        if (!datos.fecha || !datos.arbolId || !datos.cantidad || !datos.tipo) {
            showNotification('Por favor completa todos los campos', 'warning');
            return;
        }
        
        if (datos.cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'warning');
            return;
        }
        
        // Crear registro
        var registro = {
            id: generateId(),
            fecha: datos.fecha,
            arbolId: datos.arbolId,
            cantidad: datos.cantidad,
            tipo: datos.tipo,
            observaciones: 'Cosecha ' + datos.tipo,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        
        // Guardar registro
        saveProductionRecord(registro).then(function() {
            showNotification('Corte registrado exitosamente', 'success');
            
            // Actualizar datos locales
            productionData.unshift(registro);
            
            // Actualizar interfaz
            calculateRealKPIs();
            updateUI();
            recreateCharts();
            
            // Cerrar modal y limpiar
            cerrarModal('modalNuevoCorte');
            document.getElementById('formNuevoCorte').reset();
            setupFormDefaults();
            
            // Notificar a otros sistemas
            dispatchProductionEvent('productionRecordCreated', { record: registro });
            
        }).catch(function(error) {
            console.error('❌ Error guardando corte:', error);
            showNotification('Error guardando el corte', 'error');
        });
        
    } catch (error) {
        console.error('❌ Error procesando nuevo corte:', error);
        showNotification('Error procesando el formulario', 'error');
    }
}

function handleRegistroCompleto(event) {
    event.preventDefault();
    
    try {
        var datos = {
            fecha: document.getElementById('fechaCompleta').value,
            arbolId: document.getElementById('arbolCompleto').value,
            cantidad: parseFloat(document.getElementById('cantidadCompleta').value),
            calidad: parseFloat(document.getElementById('calidadCompleta').value),
            observaciones: document.getElementById('observacionesCompletas').value
        };
        
        // Validaciones
        if (!datos.fecha || !datos.arbolId || !datos.cantidad) {
            showNotification('Por favor completa los campos obligatorios', 'warning');
            return;
        }
        
        if (datos.cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'warning');
            return;
        }
        
        if (datos.calidad < 0 || datos.calidad > 100) {
            showNotification('La calidad debe estar entre 0% y 100%', 'warning');
            return;
        }
        
        // Crear registro
        var registro = {
            id: generateId(),
            fecha: datos.fecha,
            arbolId: datos.arbolId,
            cantidad: datos.cantidad,
            calidad: datos.calidad,
            observaciones: datos.observaciones || 'Registro completo de producción',
            tipo: 'completo',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        
        // Guardar registro
        saveProductionRecord(registro).then(function() {
            showNotification('Registro completo guardado exitosamente', 'success');
            
            // Actualizar datos locales
            productionData.unshift(registro);
            
            // Actualizar interfaz
            calculateRealKPIs();
            updateUI();
            recreateCharts();
            
            // Cerrar modal y limpiar
            cerrarModal('modalRegistroCompleto');
            document.getElementById('formRegistroCompleto').reset();
            setupFormDefaults();
            
            // Notificar a otros sistemas
            dispatchProductionEvent('productionRecordCreated', { record: registro });
            
        }).catch(function(error) {
            console.error('❌ Error guardando registro completo:', error);
            showNotification('Error guardando el registro', 'error');
        });
        
    } catch (error) {
        console.error('❌ Error procesando registro completo:', error);
        showNotification('Error procesando el formulario', 'error');
    }
}

function saveProductionRecord(registro) {
    return new Promise(function(resolve, reject) {
        try {
            var promises = [];
            
            // Guardar offline si está disponible
            if (managers.offline && managers.offline.saveData) {
                promises.push(
                    managers.offline.saveData('cosechas', registro.id, registro)
                        .catch(function(error) {
                            console.warn('⚠️ Error guardando offline:', error);
                        })
                );
            }
            
            // Guardar en Firebase si está disponible
            if (window.db) {
                promises.push(
                    window.db.collection('cosechas').add(registro)
                        .catch(function(error) {
                            console.warn('⚠️ Error guardando en Firebase:', error);
                        })
                );
            }
            
            if (promises.length > 0) {
                Promise.all(promises).finally(function() {
                    resolve();
                });
            } else {
                // Sin servicios de guardado, solo guardar localmente
                resolve();
            }
            
        } catch (error) {
            reject(error);
        }
    });
}

// ==========================================
// ACCIONES RÁPIDAS
// ==========================================

function ejecutarAccionRapida(accion) {
    switch (accion) {
        case 'control-calidad':
            if (productionData.length === 0) {
                showNotification('No hay datos de producción para analizar', 'warning');
                return;
            }
            
            showNotification('Analizando calidad de la producción...', 'info');
            setTimeout(function() {
                var recentData = productionData.slice(0, 10);
                var recordsWithQuality = recentData.filter(function(r) { return r.calidad > 0; });
                
                if (recordsWithQuality.length > 0) {
                    var avgQuality = recordsWithQuality.reduce(function(sum, record) { 
                        return sum + record.calidad; 
                    }, 0) / recordsWithQuality.length;
                    
                    showNotification('Calidad promedio reciente: ' + Math.round(avgQuality) + '%', 'success');
                } else {
                    showNotification('No hay registros con datos de calidad', 'warning');
                }
            }, 1500);
            break;
            
        case 'reporte-diario':
            if (productionData.length === 0) {
                showNotification('No hay datos para generar reporte', 'warning');
                return;
            }
            
            showNotification('Generando reporte diario...', 'info');
            setTimeout(function() {
                var today = new Date().toDateString();
                var todayData = productionData.filter(function(record) {
                    return new Date(record.fecha).toDateString() === today;
                });
                
                var totalKg = todayData.reduce(function(sum, record) { 
                    return sum + (record.cantidad || 0); 
                }, 0);
                
                var message = todayData.length > 0 ? 
                    'Hoy: ' + totalKg + 'kg en ' + todayData.length + ' registros' :
                    'No hay registros de producción para hoy';
                    
                showNotification(message, 'success');
            }, 1500);
            break;
            
        case 'planificar-cosecha':
            showNotification('Función de planificación en desarrollo', 'info');
            break;
            
        default:
            showNotification('Función ' + accion + ' en desarrollo', 'info');
    }
}

// ==========================================
// FUNCIONES DE MODAL
// ==========================================

function abrirModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        
        // Recargar opciones si es necesario
        if (modalId.includes('Corte') || modalId.includes('Completo')) {
            loadTreeOptionsFromDatabase();
        }
    }
}

function cerrarModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// ==========================================
// FUNCIONES DE EXPORTACIÓN
// ==========================================

function exportarDatos() {
    try {
        if (productionData.length === 0) {
            showNotification('No hay datos para exportar', 'warning');
            return;
        }
        
        showNotification('Exportando datos de producción...', 'info');
        
        var dataToExport = {
            fecha_exportacion: new Date().toISOString(),
            total_registros: productionData.length,
            resumen_kpis: kpisData,
            datos: productionData
        };
        
        var dataStr = JSON.stringify(dataToExport, null, 2);
        var dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        var link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'produccion_' + new Date().toISOString().split('T')[0] + '.json';
        link.click();
        
        showNotification(productionData.length + ' registros exportados correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error exportando datos:', error);
        showNotification('Error exportando los datos', 'error');
    }
}

// ==========================================
// FUNCIONES DE GRÁFICOS AUXILIARES
// ==========================================

function recreateCharts() {
    if (!chartsInitialized) return;
    
    if (chartUpdateTimeout) {
        clearTimeout(chartUpdateTimeout);
    }
    
    chartUpdateTimeout = setTimeout(function() {
        try {
            console.log('🔄 Recreando gráficos con nuevos datos...');
            
            // Destruir gráficos existentes
            if (graficoProduccion) {
                graficoProduccion.destroy();
                graficoProduccion = null;
            }
            
            if (graficoRendimiento) {
                graficoRendimiento.destroy();
                graficoRendimiento = null;
            }
            
            // Recrear si hay datos
            if (productionData.length > 0) {
                createProductionEvolutionChart();
                createSectorPerformanceChart();
            } else {
                showEmptyCharts();
            }
            
        } catch (error) {
            console.error('❌ Error recreando gráficos:', error);
        }
    }, productionConfig.chartUpdateDebounce);
}

function debounceChartResize() {
    if (chartUpdateTimeout) {
        clearTimeout(chartUpdateTimeout);
    }
    
    chartUpdateTimeout = setTimeout(function() {
        if (graficoProduccion && graficoProduccion.resize) {
            try {
                graficoProduccion.resize();
            } catch (error) {
                console.warn('⚠️ Error redimensionando gráfico de producción:', error);
            }
        }
        
        if (graficoRendimiento && graficoRendimiento.resize) {
            try {
                graficoRendimiento.resize();
            } catch (error) {
                console.warn('⚠️ Error redimensionando gráfico de rendimiento:', error);
            }
        }
    }, productionConfig.chartUpdateDebounce);
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

function getProductionSummary() {
    return {
        totalRecords: productionData.length,
        kpis: kpisData,
        lastUpdate: new Date().toISOString(),
        systemReady: systemInitialized
    };
}

function getTreeDisplayName(arbolId) {
    if (!arbolId) return 'Sin especificar';
    
    // Buscar en opciones cargadas
    var option = treeOptions.find(function(opt) { return opt.value === arbolId; });
    if (option) {
        return option.label.replace('🌳 ', '').replace('📦 ', '');
    }
    
    // Buscar en opciones de sector
    option = sectorOptions.find(function(opt) { return opt.value === arbolId; });
    if (option) {
        return option.label.replace('🌳 ', '').replace('📦 ', '');
    }
    
    return arbolId.length > 20 ? arbolId.substring(0, 20) + '...' : arbolId;
}

function formatDate(dateString) {
    try {
        var date = new Date(dateString);
        return date.toLocaleDateString('es-GT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function formatDateShort(dateString) {
    try {
        var date = new Date(dateString);
        var today = new Date();
        var yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Hoy';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Ayer';
        } else {
            return date.toLocaleDateString('es-GT', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    } catch (error) {
        return dateString;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function dispatchProductionEvent(eventType, data) {
    try {
        window.dispatchEvent(new CustomEvent(eventType, {
            detail: {
                timestamp: Date.now(),
                source: 'productionManager',
                data: data
            }
        }));
    } catch (error) {
        console.error('❌ Error despachando evento:', error);
    }
}

function updateElementContent(id, content) {
    var element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

function updateElementProperty(id, property, value) {
    var element = document.getElementById(id);
    if (element) {
        element[property] = value;
    }
}

function showNotification(mensaje, tipo) {
    try {
        var notification = document.createElement('div');
        notification.className = 'notification ' + (tipo || 'info');
        notification.textContent = mensaje;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; padding: 1rem 1.5rem; border-radius: 8px; color: white; font-weight: 600; max-width: 300px; transform: translateX(100%); opacity: 0; transition: all 0.3s ease;';
        
        switch (tipo) {
            case 'success':
                notification.style.backgroundColor = '#16a34a';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc2626';
                break;
            case 'warning':
                notification.style.backgroundColor = '#d97706';
                break;
            default:
                notification.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        setTimeout(function() {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
        
    } catch (error) {
        console.error('❌ Error mostrando notificación:', error);
    }
}

// ==========================================
// FUNCIONES GLOBALES PARA EVENTOS
// ==========================================

function editarRegistro(id) {
    console.log('✏️ Editando registro:', id);
    showNotification('Función de edición en desarrollo', 'info');
}

function eliminarRegistro(id) {
    if (!confirm('¿Está seguro de eliminar este registro de producción?')) {
        return;
    }
    
    try {
        productionData = productionData.filter(function(record) { 
            return record.id !== id; 
        });
        
        // Actualizar interfaz
        calculateRealKPIs();
        updateUI();
        recreateCharts();
        
        showNotification('Registro eliminado correctamente', 'success');
        
        // Notificar cambio
        dispatchProductionEvent('productionRecordDeleted', { recordId: id });
        
    } catch (error) {
        console.error('❌ Error eliminando registro:', error);
        showNotification('Error eliminando el registro', 'error');
    }
}

function loadUserProductionData() {
    // Recargar datos cuando el usuario se autentica
    loadRealProductionData().then(function() {
        updateUI();
        if (chartsInitialized) {
            recreateCharts();
        }
    });
}

// ==========================================
// MANAGER GLOBAL EXPORTADO
// ==========================================

// Crear manager global
window.productionManager = {
    // Estado del sistema
    getStatus: function() {
        return {
            initialized: systemInitialized,
            authReady: authReady,
            offlineReady: offlineReady,
            syncReady: syncReady,
            treeManagerReady: treeManagerReady,
            recordsCount: productionData.length,
            kpis: kpisData
        };
    },
    
    // Datos principales
    getProductionData: function() { return productionData; },
    getKPIs: function() { return kpisData; },
    getProductionSummary: getProductionSummary,
    
    // Gestión de registros
    addRecord: function(recordData) {
        return new Promise(function(resolve, reject) {
            try {
                var registro = {
                    id: generateId(),
                    fecha: recordData.fecha || new Date().toISOString().split('T')[0],
                    arbolId: recordData.arbolId,
                    cantidad: recordData.cantidad,
                    tipo: recordData.tipo || 'api',
                    calidad: recordData.calidad,
                    observaciones: recordData.observaciones || '',
                    timestamp: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                };
                
                saveProductionRecord(registro).then(function() {
                    productionData.unshift(registro);
                    calculateRealKPIs();
                    updateUI();
                    recreateCharts();
                    
                    dispatchProductionEvent('productionRecordCreated', { record: registro });
                    resolve(registro);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    // UI
    updateUI: updateUI,
    
    // Integración
    syncWithOtherSystems: syncWithOtherSystems,
    
    // Datos directos
    data: productionData,
    kpis: kpisData
};

// Funciones globales
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.exportarDatos = exportarDatos;
window.editarRegistro = editarRegistro;
window.eliminarRegistro = eliminarRegistro;

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🌱 Iniciando aplicación de gestión de producción integrada...');
    
    // Inicializar sistema de carga
    initializeLoadingSystem();
    
    // Inicializar sistema principal
    setTimeout(function() {
        initializeProductionSystem();
    }, 500);
});

console.log('🌱 Sistema de gestión de producción INTEGRADO cargado - JavaScript puro v14');
