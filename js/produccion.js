/* ========================================
   PRODUCCIÓN JS - ULTRA OPTIMIZADO SIN RAF ISSUES
   Versión que elimina problemas de requestAnimationFrame v1
   ======================================== */

// Variables globales
let isProductionReady = false;
let productionData = [];
let charts = {};
let chartsInitialized = false;
let chartUpdateTimeout = null;
let managers = {
    tree: null,
    offline: null,
    climate: null
};

// Configuración
const LIMONES_POR_KG = 7;
const CHART_UPDATE_DEBOUNCE = 1000; // 1 segundo de debounce

// INICIALIZACIÓN PRINCIPAL
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando página de producción...');
    
    try {
        // Esperar a que Firebase esté listo (SIN interferir con auth)
        await waitForFirebase();
        
        // Inicializar managers disponibles
        await initializeManagers();
        
        // Configurar eventos
        setupEventListeners();
        
        // Cargar datos REALES únicamente
        await loadRealDataOnly();
        
        // Configurar formularios
        setupForms();
        
        // Inicializar gráficos con mayor delay y optimización extrema
        setTimeout(() => initializeChartsUltraOptimized(), 2000);
        
        isProductionReady = true;
        console.log('Producción inicializada correctamente');
        
    } catch (error) {
        console.error('Error inicializando producción:', error);
        showNotification('Error inicializando el sistema', 'error');
    }
});

// ESPERAR FIREBASE (SIN INTERFERIR CON AUTH)
async function waitForFirebase() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkFirebase = () => {
            attempts++;
            
            if (window.firebase && window.db && window.auth) {
                console.log('Firebase disponible para producción');
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.log('Continuando sin Firebase completo');
                resolve(false);
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// INICIALIZAR MANAGERS DISPONIBLES
async function initializeManagers() {
    // Tree Manager (opcional)
    if (window.treeManager) {
        managers.tree = window.treeManager;
        console.log('TreeManager disponible');
    }
    
    // Offline Manager (opcional)
    if (window.offlineManager) {
        managers.offline = window.offlineManager;
        console.log('OfflineManager disponible');
    }
    
    // Climate Manager (opcional) - NO esperar
    if (window.climateManager) {
        managers.climate = window.climateManager;
        console.log('ClimateManager disponible');
    }
    
    console.log('Managers inicializados');
}

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    // Formulario nuevo corte
    const formCorte = document.getElementById('formNuevoCorte');
    if (formCorte) {
        formCorte.addEventListener('submit', handleNuevoCorte);
    }
    
    // Formulario registro completo
    const formCompleto = document.getElementById('formRegistroCompleto');
    if (formCompleto) {
        formCompleto.addEventListener('submit', handleRegistroCompleto);
    }
    
    // Prevenir múltiples inicializaciones de gráficos
    window.addEventListener('resize', debounceChartResize);
    
    console.log('Event listeners configurados');
}

// DEBOUNCE PARA RESIZE DE GRÁFICOS
function debounceChartResize() {
    if (chartUpdateTimeout) {
        clearTimeout(chartUpdateTimeout);
    }
    
    chartUpdateTimeout = setTimeout(() => {
        if (chartsInitialized && charts.produccion) {
            try {
                charts.produccion.resize();
            } catch (error) {
                console.warn('Error resizing chart:', error);
            }
        }
        if (chartsInitialized && charts.rendimiento) {
            try {
                charts.rendimiento.resize();
            } catch (error) {
                console.warn('Error resizing chart:', error);
            }
        }
    }, CHART_UPDATE_DEBOUNCE);
}

// CARGAR SOLO DATOS REALES
async function loadRealDataOnly() {
    try {
        // Primero cargar datos de producción desde Firebase
        await loadProductionDataFromFirebase();
        
        // Cargar opciones de formularios desde TreeManager
        await loadFormOptionsFromDatabase();
        
        // Cargar KPIs basados en datos reales
        await loadRealKPIs();
        
        // Cargar timeline con datos reales
        await loadRealTimeline();
        
        // Configurar fecha actual
        setCurrentDate();
        
        console.log('Datos REALES cargados exitosamente');
        
    } catch (error) {
        console.error('Error cargando datos reales:', error);
        showEmptyStates();
    }
}

// CARGAR DATOS DE PRODUCCIÓN DESDE FIREBASE
async function loadProductionDataFromFirebase() {
    if (!window.db) {
        console.log('Firebase no disponible, sin datos de producción');
        productionData = [];
        return;
    }
    
    try {
        const snapshot = await window.db.collection('cosechas')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        productionData = [];
        snapshot.forEach(doc => {
            productionData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Datos de producción cargados: ${productionData.length} registros`);
        
    } catch (error) {
        console.error('Error cargando datos de Firebase:', error);
        productionData = [];
    }
}

// CARGAR OPCIONES DE FORMULARIOS DESDE BASE DE DATOS
async function loadFormOptionsFromDatabase() {
    try {
        let options = [];
        
        // Intentar cargar desde TreeManager
        if (managers.tree && managers.tree.getAllSectors && managers.tree.getAllTrees) {
            try {
                const sectors = await managers.tree.getAllSectors();
                const trees = await managers.tree.getAllTrees();
                
                // Agregar sectores
                sectors.forEach(sector => {
                    options.push({
                        value: sector.id,
                        label: `📦 ${sector.name || sector.correlative || sector.id} (Sector completo)`,
                        type: 'sector'
                    });
                });
                
                // Agregar árboles activos únicamente
                trees.forEach(tree => {
                    if (tree.active !== false) {
                        const sectorName = sectors.find(s => s.id === tree.blockId)?.name || 'Sin sector';
                        options.push({
                            value: tree.id,
                            label: `🌳 Árbol ${tree.correlative || tree.id.substring(0, 8)} - ${sectorName}`,
                            type: 'tree'
                        });
                    }
                });
                
                console.log(`Opciones reales cargadas: ${options.length}`);
                
            } catch (error) {
                console.warn('Error obteniendo datos del TreeManager:', error);
            }
        }
        
        // Si no hay opciones, mostrar estado vacío
        if (options.length === 0) {
            console.log('No hay opciones disponibles desde la base de datos');
            showEmptyFormOptions();
            return;
        }
        
        // Ordenar: sectores primero
        options.sort((a, b) => {
            if (a.type === 'sector' && b.type === 'tree') return -1;
            if (a.type === 'tree' && b.type === 'sector') return 1;
            return a.label.localeCompare(b.label);
        });
        
        // Actualizar selects
        updateSelect('arbolCorte', options);
        updateSelect('arbolCompleto', options);
        
    } catch (error) {
        console.error('Error cargando opciones:', error);
        showEmptyFormOptions();
    }
}

// MOSTRAR ESTADO VACÍO PARA OPCIONES DE FORMULARIO
function showEmptyFormOptions() {
    updateSelect('arbolCorte', []);
    updateSelect('arbolCompleto', []);
    
    // Agregar mensaje informativo
    const selects = ['arbolCorte', 'arbolCompleto'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">No hay árboles/sectores disponibles</option>';
            select.disabled = true;
        }
    });
}

// ACTUALIZAR SELECT
function updateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Seleccionar...</option>';
    select.disabled = false;
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        select.appendChild(opt);
    });
    
    // Restaurar valor si era válido
    if (currentValue && options.some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

// CARGAR KPIS REALES ÚNICAMENTE
async function loadRealKPIs() {
    try {
        if (productionData.length === 0) {
            showEmptyKPIs();
            return;
        }
        
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        // Filtrar datos del mes actual
        const monthlyData = productionData.filter(record => {
            const recordDate = new Date(record.fecha);
            return recordDate.getMonth() === thisMonth && 
                   recordDate.getFullYear() === thisYear;
        });
        
        // Calcular KPIs desde datos reales
        const produccionMes = monthlyData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
        const numRegistros = monthlyData.length;
        const rendimientoPromedio = numRegistros > 0 ? produccionMes / numRegistros : 0;
        const calidadPromedio = numRegistros > 0 ? 
            monthlyData.reduce((sum, record) => sum + (record.calidad || 0), 0) / numRegistros : 0;
        const ingresosMes = produccionMes * 7.5; // Precio promedio por kg
        
        // Actualizar UI con datos reales
        updateElement('produccionMes', produccionMes > 0 ? `${Math.round(produccionMes)} kg` : '0 kg');
        updateElement('rendimientoPromedio', rendimientoPromedio > 0 ? `${Math.round(rendimientoPromedio * 100) / 100} kg/registro` : '0 kg/registro');
        updateElement('calidadPromedio', calidadPromedio > 0 ? `${Math.round(calidadPromedio)}%` : 'N/A');
        updateElement('ingresosMes', ingresosMes > 0 ? `Q ${Math.round(ingresosMes).toLocaleString()}` : 'Q 0');
        
        console.log(`KPIs calculados con ${monthlyData.length} registros del mes`);
        
    } catch (error) {
        console.error('Error cargando KPIs:', error);
        showEmptyKPIs();
    }
}

// MOSTRAR KPIS VACÍOS
function showEmptyKPIs() {
    updateElement('produccionMes', '0 kg');
    updateElement('rendimientoPromedio', '0 kg/registro');
    updateElement('calidadPromedio', 'N/A');
    updateElement('ingresosMes', 'Q 0');
}

// CARGAR TIMELINE REAL ÚNICAMENTE
async function loadRealTimeline() {
    const container = document.getElementById('timelineProduccion');
    if (!container) return;
    
    try {
        if (productionData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-seedling" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>No hay registros de producción aún</p>
                    <p style="font-size: 0.875rem;">Los registros aparecerán aquí cuando registres tu primera cosecha</p>
                </div>
            `;
            return;
        }
        
        // Mostrar solo datos reales
        const recentData = productionData
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 5);
            
        container.innerHTML = recentData.map(record => `
            <div style="padding: 1rem; border-left: 3px solid #3b82f6; margin-bottom: 1rem;">
                <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem;">
                    ${formatDate(record.fecha)}
                </div>
                <div style="font-weight: 600;">${record.descripcion || 'Cosecha registrada'}</div>
                <div style="font-size: 1.125rem; font-weight: 700; color: #16a34a; margin-top: 0.5rem;">
                    ${record.cantidad} kg
                </div>
                ${record.calidad ? `<div style="font-size: 0.875rem; color: #6b7280;">Calidad: ${record.calidad}%</div>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando timeline:', error);
        container.innerHTML = '<p style="color: #dc2626;">Error cargando actividades</p>';
    }
}

// MOSTRAR ESTADOS VACÍOS
function showEmptyStates() {
    console.log('Mostrando estados vacíos - sin datos ficticios');
    showEmptyKPIs();
    
    const container = document.getElementById('timelineProduccion');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                <p>Sin conexión a la base de datos</p>
                <p style="font-size: 0.875rem;">Verifica tu conexión e intenta recargar la página</p>
            </div>
        `;
    }
}

// INICIALIZAR GRÁFICOS ULTRA OPTIMIZADOS
function initializeChartsUltraOptimized() {
    if (chartsInitialized) return;
    
    try {
        // Solo crear gráficos si hay datos reales
        if (productionData.length === 0) {
            showEmptyCharts();
            return;
        }
        
        // Verificar que Chart.js esté disponible
        if (!window.Chart) {
            console.warn('Chart.js no disponible');
            showEmptyCharts();
            return;
        }
        
        // Configurar Chart.js para máximo rendimiento
        Chart.defaults.animation = false;
        Chart.defaults.responsive = false;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.interaction.intersect = false;
        Chart.defaults.interaction.mode = 'index';
        
        // Crear gráficos con configuración extremadamente optimizada
        createUltraOptimizedCharts();
        
    } catch (error) {
        console.error('Error inicializando gráficos:', error);
        showEmptyCharts();
    }
}

// CREAR GRÁFICOS ULTRA OPTIMIZADOS
function createUltraOptimizedCharts() {
    try {
        // Destruir gráficos existentes si los hay
        destroyExistingCharts();
        
        // Preparar datos reales para gráficos
        const chartData = prepareRealChartData();
        
        // Configurar dimensiones fijas para evitar redraws
        setupFixedChartDimensions();
        
        // Gráfico de producción - ULTRA OPTIMIZADO
        const ctxProd = document.getElementById('graficoProduccion');
        if (ctxProd && chartData.production.length > 0) {
            charts.produccion = new Chart(ctxProd, {
                type: 'line',
                data: {
                    labels: chartData.production.map(d => d.label),
                    datasets: [{
                        label: 'Producción (kg)',
                        data: chartData.production.map(d => d.value),
                        borderColor: '#16a34a',
                        backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        tension: 0.2, // Reducir tensión para mejor rendimiento
                        fill: false, // Deshabilitar fill para mejor rendimiento
                        pointRadius: 1, // Puntos más pequeños
                        pointHoverRadius: 3,
                        borderWidth: 2
                    }]
                },
                options: {
                    // CONFIGURACIÓN ULTRA OPTIMIZADA
                    animation: false,
                    responsive: false,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    },
                    elements: {
                        point: {
                            radius: 1,
                            hoverRadius: 3
                        },
                        line: {
                            tension: 0.2
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: false,
                                boxWidth: 12
                            }
                        },
                        tooltip: {
                            enabled: true,
                            mode: 'nearest',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            display: true,
                            beginAtZero: true,
                            grid: {
                                display: true,
                                color: 'rgba(0,0,0,0.1)'
                            }
                        }
                    },
                    // DESHABILITAR TODAS LAS ANIMACIONES
                    events: ['mousemove', 'mouseout', 'click'], // Minimizar eventos
                    onResize: null // Deshabilitar resize automático
                }
            });
        }
        
        // Gráfico de rendimiento - ULTRA OPTIMIZADO
        const ctxRend = document.getElementById('graficoRendimiento');
        if (ctxRend && chartData.sectors.length > 0) {
            charts.rendimiento = new Chart(ctxRend, {
                type: 'bar',
                data: {
                    labels: chartData.sectors.map(d => d.label),
                    datasets: [{
                        label: 'Rendimiento (kg)',
                        data: chartData.sectors.map(d => d.value),
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    }]
                },
                options: {
                    // CONFIGURACIÓN ULTRA OPTIMIZADA
                    animation: false,
                    responsive: false,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            mode: 'nearest',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            display: true,
                            beginAtZero: true,
                            grid: {
                                display: true,
                                color: 'rgba(0,0,0,0.1)'
                            }
                        }
                    },
                    // DESHABILITAR TODAS LAS ANIMACIONES
                    events: ['mousemove', 'mouseout', 'click'], // Minimizar eventos
                    onResize: null // Deshabilitar resize automático
                }
            });
        }
        
        chartsInitialized = true;
        console.log('Gráficos ultra optimizados creados con datos reales');
        
    } catch (error) {
        console.error('Error creando gráficos:', error);
        showEmptyCharts();
    }
}

// DESTRUIR GRÁFICOS EXISTENTES
function destroyExistingCharts() {
    try {
        if (charts.produccion) {
            charts.produccion.destroy();
            charts.produccion = null;
        }
        if (charts.rendimiento) {
            charts.rendimiento.destroy();
            charts.rendimiento = null;
        }
    } catch (error) {
        console.warn('Error destruyendo gráficos:', error);
    }
}

// CONFIGURAR DIMENSIONES FIJAS PARA GRÁFICOS
function setupFixedChartDimensions() {
    const chartContainers = ['graficoProduccion', 'graficoRendimiento'];
    
    chartContainers.forEach(containerId => {
        const canvas = document.getElementById(containerId);
        if (canvas) {
            // Establecer dimensiones fijas
            canvas.style.width = '100%';
            canvas.style.height = '200px';
            canvas.width = canvas.offsetWidth;
            canvas.height = 200;
        }
    });
}

// PREPARAR DATOS REALES PARA GRÁFICOS
function prepareRealChartData() {
    const chartData = {
        production: [],
        sectors: []
    };
    
    if (productionData.length === 0) return chartData;
    
    // Agrupar por fecha para gráfico de producción (últimos 7 días)
    const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date;
    }).reverse();
    
    chartData.production = last7Days.map(date => {
        const dayData = productionData.filter(record => {
            const recordDate = new Date(record.fecha);
            return recordDate.toDateString() === date.toDateString();
        });
        
        const totalKg = dayData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
        
        return {
            label: date.toLocaleDateString('es-GT', { weekday: 'short' }),
            value: totalKg
        };
    });
    
    // Agrupar por sector/árbol para gráfico de rendimiento
    const sectorData = {};
    productionData.forEach(record => {
        const key = record.arbolId || 'Sin especificar';
        if (!sectorData[key]) {
            sectorData[key] = 0;
        }
        sectorData[key] += record.cantidad || 0;
    });
    
    chartData.sectors = Object.entries(sectorData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6) // Solo top 6
        .map(([key, value]) => ({
            label: key.length > 15 ? key.substring(0, 15) + '...' : key,
            value: value
        }));
    
    return chartData;
}

// MOSTRAR GRÁFICOS VACÍOS
function showEmptyCharts() {
    const containers = ['graficoProduccion', 'graficoRendimiento'];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const parent = container.parentElement;
            if (parent) {
                parent.innerHTML = `
                    <h3>${containerId === 'graficoProduccion' ? 'Evolución de la Producción' : 'Rendimiento por Sector'}</h3>
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #6b7280; text-align: center;">
                        <div>
                            <i class="fas fa-chart-${containerId === 'graficoProduccion' ? 'line' : 'bar'}" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                            <p>Sin datos para mostrar</p>
                            <p style="font-size: 0.875rem;">Registra tu primera cosecha para ver gráficos</p>
                        </div>
                    </div>
                `;
            }
        }
    });
}

// CONFIGURAR FORMULARIOS
function setupForms() {
    setCurrentDate();
    console.log('Formularios configurados');
}

// ESTABLECER FECHA ACTUAL
function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().slice(0, 16);
    
    updateElement('fechaCorte', today, 'value');
    updateElement('fechaCompleta', now, 'value');
}

// MANEJAR NUEVO CORTE
async function handleNuevoCorte(event) {
    event.preventDefault();
    
    try {
        const datos = {
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
        
        // Agregar a datos locales
        const registro = {
            id: generateId(),
            ...datos,
            descripcion: `Cosecha ${datos.tipo}`,
            timestamp: new Date().toISOString()
        };
        
        productionData.unshift(registro); // Agregar al inicio
        
        // Guardar si hay managers disponibles
        if (managers.offline && managers.offline.saveData) {
            await managers.offline.saveData('cosechas', registro.id, registro);
        }
        
        // Guardar en Firebase si está disponible
        if (window.db) {
            try {
                await window.db.collection('cosechas').add(registro);
            } catch (error) {
                console.warn('Error guardando en Firebase:', error);
            }
        }
        
        showNotification('Corte registrado exitosamente', 'success');
        
        // Actualizar interfaz
        await loadRealKPIs();
        await loadRealTimeline();
        
        // Actualizar gráficos con debounce
        scheduleChartUpdate();
        
        // Cerrar modal y limpiar
        cerrarModal('modalNuevoCorte');
        document.getElementById('formNuevoCorte').reset();
        setCurrentDate();
        
    } catch (error) {
        console.error('Error registrando corte:', error);
        showNotification('Error registrando corte: ' + error.message, 'error');
    }
}

// MANEJAR REGISTRO COMPLETO
async function handleRegistroCompleto(event) {
    event.preventDefault();
    
    try {
        const datos = {
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
        
        // Agregar a datos locales
        const registro = {
            id: generateId(),
            ...datos,
            descripcion: 'Cosecha completa',
            timestamp: new Date().toISOString()
        };
        
        productionData.unshift(registro); // Agregar al inicio
        
        // Guardar si hay managers disponibles
        if (managers.offline && managers.offline.saveData) {
            await managers.offline.saveData('cosechas', registro.id, registro);
        }
        
        // Guardar en Firebase si está disponible
        if (window.db) {
            try {
                await window.db.collection('cosechas').add(registro);
            } catch (error) {
                console.warn('Error guardando en Firebase:', error);
            }
        }
        
        showNotification('Registro completo guardado exitosamente', 'success');
        
        // Actualizar interfaz
        await loadRealKPIs();
        await loadRealTimeline();
        
        // Actualizar gráficos con debounce
        scheduleChartUpdate();
        
        // Cerrar modal y limpiar
        cerrarModal('modalRegistroCompleto');
        document.getElementById('formRegistroCompleto').reset();
        setCurrentDate();
        
    } catch (error) {
        console.error('Error registrando completo:', error);
        showNotification('Error registrando: ' + error.message, 'error');
    }
}

// PROGRAMAR ACTUALIZACIÓN DE GRÁFICOS CON DEBOUNCE
function scheduleChartUpdate() {
    if (chartUpdateTimeout) {
        clearTimeout(chartUpdateTimeout);
    }
    
    chartUpdateTimeout = setTimeout(() => {
        recreateChartsWithNewData();
    }, CHART_UPDATE_DEBOUNCE);
}

// RECREAR GRÁFICOS CON NUEVOS DATOS (EVITA RAF ISSUES)
function recreateChartsWithNewData() {
    if (!chartsInitialized) return;
    
    try {
        console.log('Recreando gráficos con nuevos datos...');
        
        // Destruir gráficos existentes
        destroyExistingCharts();
        
        // Marcar como no inicializados
        chartsInitialized = false;
        
        // Recrear con datos actualizados
        setTimeout(() => {
            createUltraOptimizedCharts();
        }, 100);
        
    } catch (error) {
        console.error('Error recreando gráficos:', error);
    }
}

// ACCIONES RÁPIDAS
async function accionRapida(accion) {
    switch (accion) {
        case 'nuevo-corte':
            abrirModal('modalNuevoCorte');
            break;
            
        case 'control-calidad':
            if (productionData.length === 0) {
                showNotification('No hay datos de producción para analizar', 'warning');
                return;
            }
            
            showNotification('Analizando datos de calidad...', 'info');
            setTimeout(() => {
                const recentData = productionData.slice(0, 10);
                const avgQuality = recentData.reduce((sum, record) => sum + (record.calidad || 0), 0) / recentData.length;
                if (avgQuality > 0) {
                    showNotification(`Calidad promedio reciente: ${Math.round(avgQuality)}%`, 'success');
                } else {
                    showNotification('No hay datos de calidad registrados', 'warning');
                }
            }, 1500);
            break;
            
        case 'reporte-diario':
            if (productionData.length === 0) {
                showNotification('No hay datos para generar reporte', 'warning');
                return;
            }
            
            showNotification('Generando reporte con datos reales...', 'info');
            setTimeout(() => {
                const today = new Date().toDateString();
                const todayData = productionData.filter(record => {
                    return new Date(record.fecha).toDateString() === today;
                });
                const totalKg = todayData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
                showNotification(`Reporte: ${totalKg}kg cosechados hoy`, 'success');
            }, 1500);
            break;
            
        case 'planificar-cosecha':
            showNotification('Función de planificación en desarrollo', 'info');
            break;
            
        default:
            showNotification(`Función ${accion} en desarrollo`, 'info');
    }
}

// FUNCIONES DE MODAL
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        
        // Recargar opciones si es necesario
        if (modalId.includes('Corte') || modalId.includes('Completo')) {
            loadFormOptionsFromDatabase();
        }
    }
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// EXPORTAR DATOS REALES
async function exportarDatos() {
    try {
        if (productionData.length === 0) {
            showNotification('No hay datos para exportar', 'warning');
            return;
        }
        
        showNotification('Exportando datos reales...', 'info');
        
        const dataToExport = {
            fecha_exportacion: new Date().toISOString(),
            total_registros: productionData.length,
            datos: productionData
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `produccion_real_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification(`${productionData.length} registros exportados correctamente`, 'success');
        
    } catch (error) {
        console.error('Error exportando:', error);
        showNotification('Error exportando datos', 'error');
    }
}

// FUNCIONES DE UTILIDAD
function updateElement(id, value, property = 'textContent') {
    const element = document.getElementById(id);
    if (element) {
        element[property] = value;
    }
}

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('es-GT', {
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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function showNotification(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.textContent = mensaje;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// HACER FUNCIONES GLOBALES
window.accionRapida = accionRapida;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.exportarDatos = exportarDatos;

console.log('Sistema de producción ultra optimizado cargado - Sin RAF issues');
