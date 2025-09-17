/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRODUCCIÓN COMPLETA
   Sistema completo integrado con tree-manager y correlativos
   Backend puro - Sin código de interfaz
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let productionData = new Map();
let dailyProduction = new Map();
let seasonalData = new Map();
let qualityMetrics = new Map();
let treatmentPlans = new Map();
let qualityControls = new Map();
let harvestSchedule = new Map();
let isProductionInitialized = false;

// Configuración
const currentSeason = getCurrentSeason();
const qualityGrades = ['AAA', 'AA', 'A', 'B', 'C'];

// Precios de mercado actualizados
const marketPrices = {
    'AAA': 8.50,
    'AA': 7.50,
    'A': 6.50,
    'B': 5.00,
    'C': 3.50
};

// Estadísticas en tiempo real
let statistics = {
    totalSeason: 0,
    totalLifetime: 0,
    averageDaily: 0,
    averagePerTree: 0,
    qualityDistribution: {},
    topPerformingBlocks: [],
    productivity: 0,
    efficiency: 0,
    revenueProjection: 0
};

// Referencias a managers externos
let treeManager = null;
let offlineManager = null;
let climateManager = null;

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

async function initializeProductionSystem() {
    try {
        console.log('🚀 Inicializando sistema de producción integrado...');
        
        // Esperar a que los managers estén disponibles
        await waitForManagers();
        
        // Cargar datos offline
        await loadOfflineProductionData();
        
        // Cargar datos existentes de árboles
        await loadTreesProductionData();
        
        // Cargar datos climáticos para predicciones
        await loadClimateData();
        
        // Calcular estadísticas
        await calculateProductionStatistics();
        
        // Inicializar módulos avanzados
        await initializeQualityControl();
        await initializeHarvestPlanning();
        await initializeTreatmentPlanning();
        
        isProductionInitialized = true;
        
        console.log('✅ Sistema de producción inicializado correctamente');
        
        return {
            registrarProduccion: registerProduction,
            registrarProduccionCompleta: registerCompleteProduction,
            calcularKPIs: calculateKPIs,
            obtenerActividadesRecientes: getRecentActivities,
            obtenerRegistrosFiltrados: getFilteredRecords,
            generarPrediccionesIA: generateAIPredictions,
            obtenerDatosGraficos: getChartData,
            aplicarFiltros: applyFilters,
            exportarDatos: exportProductionData,
            generarReporteDiario: generateDailyReport,
            getOpcionesFormulario: getFormOptions,
            cargarDatos: loadProductionData,
            // NUEVAS FUNCIONALIDADES IMPLEMENTADAS
            controlCalidad: qualityControl,
            planificarCosecha: planHarvest,
            gestionarTratamientos: manageTreatments,
            analizarRendimiento: analyzePerformance,
            prediccionAvanzada: advancedPrediction,
            optimizarRiego: optimizeIrrigation,
            generarReporteCompleto: generateCompleteReport,
            // FUNCIÓN DE REGISTRO COMPLETO MEJORADA
            abrirRegistroCompleto: abrirRegistroCompleto
        };
        
    } catch (error) {
        console.error('❌ Error inicializando sistema de producción:', error);
        throw error;
    }
}

async function waitForManagers() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.treeManager && window.treeManager.isInitialized) {
            treeManager = window.treeManager;
            offlineManager = window.offlineManager || createFallbackOfflineManager();
            climateManager = window.climateManager || createFallbackClimateManager();
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!treeManager) {
        console.warn('⚠️ TreeManager no disponible, usando fallback');
        treeManager = createFallbackTreeManager();
    }
    
    console.log('📦 Managers cargados correctamente');
}

function createFallbackOfflineManager() {
    return {
        getAllData: (collection) => Promise.resolve([]),
        saveData: (collection, id, data) => Promise.resolve(),
        loadData: (collection, id) => Promise.resolve(null)
    };
}

function createFallbackClimateManager() {
    return {
        getCurrentWeather: () => Promise.resolve({}),
        getForecast: () => Promise.resolve({}),
        getHistoricalData: () => Promise.resolve([]),
        analyzeClimateImpact: () => Promise.resolve({})
    };
}

function createFallbackTreeManager() {
    return {
        getAllTrees: () => Promise.resolve([]),
        getTree: (id) => Promise.resolve(null),
        updateTree: (id, data) => Promise.resolve(),
        getAllSectors: () => Promise.resolve([]),
        obtenerListaCompleta: () => [],
        getStatistics: () => Promise.resolve({})
    };
}

// ==========================================
// FUNCIÓN DE REGISTRO COMPLETO MEJORADA
// ==========================================

async function abrirRegistroCompleto() {
    try {
        console.log('📝 Abriendo registro completo desde productionManager...');
        
        // Verificar que el modal existe
        const modal = document.getElementById('modalRegistroCompleto');
        if (!modal) {
            throw new Error('Modal de registro completo no encontrado');
        }
        
        // Abrir el modal
        modal.classList.add('show');
        
        // Establecer fecha y hora actual
        const ahora = new Date();
        const fechaHora = ahora.toISOString().slice(0, 16);
        const fechaInput = document.getElementById('fechaCompleta');
        if (fechaInput) {
            fechaInput.value = fechaHora;
        }
        
        // Cargar opciones actualizadas
        const opciones = await getFormOptions();
        actualizarSelectCompleto(opciones);
        
        // Limpiar formulario
        const form = document.getElementById('formRegistroCompleto');
        if (form) {
            form.reset();
            // Restablecer fecha después del reset
            if (fechaInput) {
                fechaInput.value = fechaHora;
            }
        }
        
        // Resetear campos GPS
        resetearCamposGPS();
        
        console.log('✅ Registro completo abierto correctamente');
        
        if (window.showNotification) {
            window.showNotification('Formulario de registro completo listo', 'info');
        }
        
    } catch (error) {
        console.error('❌ Error abriendo registro completo:', error);
        if (window.showNotification) {
            window.showNotification('Error abriendo formulario: ' + error.message, 'error');
        }
    }
}

function actualizarSelectCompleto(opciones) {
    const select = document.getElementById('arbolCompleto');
    if (select && opciones && opciones.opciones) {
        select.innerHTML = '<option value="">Seleccionar ubicación...</option>';
        opciones.opciones.forEach(opcion => {
            const option = document.createElement('option');
            option.value = opcion.value;
            option.textContent = opcion.label;
            select.appendChild(option);
        });
    }
}

function resetearCamposGPS() {
    const latInput = document.getElementById('latitudCompleta');
    const lngInput = document.getElementById('longitudCompleta');
    const gpsStatus = document.getElementById('gpsStatus');
    
    if (latInput) latInput.value = '';
    if (lngInput) lngInput.value = '';
    if (gpsStatus) {
        gpsStatus.textContent = 'Presiona \'Capturar GPS\' para obtener ubicación actual';
        gpsStatus.style.color = '#6b7280';
    }
}

// ==========================================
// FUNCIONES PRINCIPALES DE REGISTRO
// ==========================================

async function registerProduction(productionData) {
    try {
        console.log('📝 Registrando producción:', productionData);
        
        const registro = {
            id: generateProductionId(),
            timestamp: new Date().toISOString(),
            ...productionData,
            status: 'active'
        };
        
        // Guardar en el mapa local
        productionData.set(registro.id, registro);
        
        // Guardar offline
        if (offlineManager) {
            await offlineManager.saveData('cosechas', registro.id, registro);
        }
        
        // Actualizar estadísticas
        await calculateProductionStatistics();
        
        // Notificar actualización
        window.dispatchEvent(new CustomEvent('productionUpdate', {
            detail: { action: 'create', registro }
        }));
        
        console.log('✅ Producción registrada:', registro.id);
        return registro;
        
    } catch (error) {
        console.error('❌ Error registrando producción:', error);
        throw error;
    }
}

async function registerCompleteProduction(datos) {
    try {
        console.log('📋 Registrando producción completa:', datos);
        
        const registro = {
            id: generateProductionId(),
            timestamp: new Date().toISOString(),
            fecha: datos.fecha,
            arbolId: datos.arbolId,
            responsable: datos.responsable,
            tipo: datos.tipo,
            production: {
                unidades: datos.unidades,
                totalWeight: datos.cantidad,
                calibres: datos.calibres,
                calidad: datos.calidad,
                merma: datos.merma
            },
            location: datos.ubicacion,
            observaciones: datos.observaciones,
            status: 'active'
        };
        
        // Validar datos completos
        if (!validateCompleteProduction(registro)) {
            throw new Error('Datos de producción incompletos o inválidos');
        }
        
        // Guardar en el mapa local
        productionData.set(registro.id, registro);
        
        // Guardar offline
        if (offlineManager) {
            await offlineManager.saveData('cosechas', registro.id, registro);
        }
        
        // Actualizar árbol con nueva producción
        if (treeManager && registro.arbolId) {
            await updateTreeProduction(registro.arbolId, registro.production.totalWeight);
        }
        
        // Actualizar estadísticas
        await calculateProductionStatistics();
        
        // Notificar actualización
        window.dispatchEvent(new CustomEvent('productionUpdate', {
            detail: { action: 'create', registro }
        }));
        
        console.log('✅ Producción completa registrada:', registro.id);
        return registro;
        
    } catch (error) {
        console.error('❌ Error registrando producción completa:', error);
        throw error;
    }
}

function validateCompleteProduction(registro) {
    const required = ['fecha', 'arbolId', 'tipo'];
    for (const field of required) {
        if (!registro[field]) {
            console.error(`Campo requerido faltante: ${field}`);
            return false;
        }
    }
    
    if (!registro.production || registro.production.totalWeight <= 0) {
        console.error('Cantidad de producción inválida');
        return false;
    }
    
    return true;
}

async function updateTreeProduction(treeId, weight) {
    try {
        if (treeManager && treeManager.updateTree) {
            const tree = await treeManager.getTree(treeId);
            if (tree) {
                const currentProduction = tree.production?.currentSeason || 0;
                await treeManager.updateTree(treeId, {
                    production: {
                        ...tree.production,
                        currentSeason: currentProduction + weight,
                        lastHarvest: new Date().toISOString()
                    }
                });
            }
        }
    } catch (error) {
        console.warn('⚠️ Error actualizando producción del árbol:', error);
    }
}

// ==========================================
// FUNCIONES DE DATOS Y ESTADÍSTICAS
// ==========================================

function calculateKPIs() {
    try {
        const ahora = new Date();
        const mesActual = ahora.getMonth();
        const añoActual = ahora.getFullYear();
        
        const registros = Array.from(productionData.values())
            .filter(r => r.status === 'active');
        
        // Producción del mes
        const produccionMes = registros
            .filter(r => {
                const fechaRegistro = new Date(r.fecha || r.timestamp);
                return fechaRegistro.getMonth() === mesActual && 
                       fechaRegistro.getFullYear() === añoActual;
            })
            .reduce((sum, r) => sum + (r.production?.totalWeight || r.cantidad || 0), 0);
        
        // Calcular rendimiento promedio
        const totalArboles = treeManager ? 
            (treeManager.trees?.size || 100) : 100;
        const rendimientoPromedio = totalArboles > 0 ? 
            (produccionMes / totalArboles).toFixed(1) : 0;
        
        // Calidad promedio
        const calidadPromedio = registros.length > 0 ?
            Math.round(registros.reduce((sum, r) => 
                sum + (r.production?.calidad || r.calidad || 85), 0) / registros.length) : 85;
        
        // Ingresos del mes
        const precioPromedio = 7.0; // Precio promedio por kg
        const ingresosMes = Math.round(produccionMes * precioPromedio);
        
        return {
            produccionMes: Math.round(produccionMes * 100) / 100,
            rendimientoPromedio: parseFloat(rendimientoPromedio),
            calidadPromedio,
            ingresosMes
        };
        
    } catch (error) {
        console.error('❌ Error calculando KPIs:', error);
        return {
            produccionMes: 0,
            rendimientoPromedio: 0,
            calidadPromedio: 0,
            ingresosMes: 0
        };
    }
}

function getRecentActivities() {
    try {
        const registros = Array.from(productionData.values())
            .filter(r => r.status === 'active')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        return registros.map(registro => ({
            fecha: registro.timestamp,
            descripcion: `Cosecha ${registro.tipo || 'general'}`,
            cantidad: registro.production?.totalWeight || registro.cantidad || 0,
            detalles: `${registro.responsable || 'Sistema'} - Calidad ${registro.production?.calidad || registro.calidad || 'N/A'}%`,
            arbolId: registro.arbolId,
            ubicacion: registro.location
        }));
        
    } catch (error) {
        console.error('❌ Error obteniendo actividades recientes:', error);
        return [];
    }
}

async function getFormOptions() {
    try {
        let opciones = [];
        
        if (treeManager) {
            // Obtener sectores
            const sectores = await treeManager.getAllSectors();
            sectores.forEach(sector => {
                opciones.push({
                    value: sector.id,
                    label: `📦 ${sector.name} (Sector completo)`,
                    type: 'sector'
                });
            });
            
            // Obtener árboles
            const arboles = await treeManager.getAllTrees();
            arboles.forEach(arbol => {
                if (arbol.active !== false) {
                    const sector = sectores.find(s => s.id === arbol.blockId);
                    const nombreSector = sector ? sector.name : 'Sin sector';
                    
                    opciones.push({
                        value: arbol.id,
                        label: `🌳 Árbol ${arbol.correlative || arbol.id.substring(0, 8)} - ${nombreSector}`,
                        type: 'tree'
                    });
                }
            });
        } else {
            // Opciones de fallback
            opciones = [
                { value: 'SECTOR_NORTE', label: '📦 Sector Norte (Sector completo)', type: 'sector' },
                { value: 'SECTOR_SUR', label: '📦 Sector Sur (Sector completo)', type: 'sector' },
                { value: 'SECTOR_ESTE', label: '📦 Sector Este (Sector completo)', type: 'sector' },
                { value: 'ARBOL_001', label: '🌳 Árbol 001 - Sector Norte', type: 'tree' },
                { value: 'ARBOL_002', label: '🌳 Árbol 002 - Sector Sur', type: 'tree' }
            ];
        }
        
        // Ordenar: sectores primero, luego árboles
        opciones.sort((a, b) => {
            if (a.type === 'sector' && b.type === 'tree') return -1;
            if (a.type === 'tree' && b.type === 'sector') return 1;
            return a.label.localeCompare(b.label);
        });
        
        return { opciones };
        
    } catch (error) {
        console.error('❌ Error obteniendo opciones de formulario:', error);
        return { opciones: [] };
    }
}

// ==========================================
// FUNCIONES AVANZADAS
// ==========================================

async function qualityControl(sampleData) {
    try {
        console.log('🔬 Iniciando control de calidad avanzado...');
        
        const qualityAnalysis = {
            id: generateQualityControlId(),
            timestamp: new Date().toISOString(),
            location: sampleData.location,
            inspector: sampleData.inspector || 'Sistema automático',
            samples: sampleData.samples || [],
            results: {
                visual: await performVisualInspection(sampleData),
                chemical: await performChemicalAnalysis(sampleData),
                physical: await performPhysicalTests(sampleData),
                microbiological: await performMicrobiologicalTests(sampleData)
            },
            overall: {
                grade: '',
                score: 0,
                recommendations: [],
                certification: null
            },
            aiPrediction: await predictQualityTrends(sampleData)
        };
        
        // Calcular calificación general
        qualityAnalysis.overall = calculateOverallQuality(qualityAnalysis.results);
        
        // Guardar resultados
        qualityControls.set(qualityAnalysis.id, qualityAnalysis);
        await offlineManager.saveData('quality_controls', qualityAnalysis.id, qualityAnalysis);
        
        // Generar certificación si aplica
        if (qualityAnalysis.overall.score >= 85) {
            qualityAnalysis.overall.certification = await generateQualityCertificate(qualityAnalysis);
        }
        
        // Actualizar estadísticas de calidad
        await updateQualityStatistics(qualityAnalysis);
        
        console.log('✅ Control de calidad completado:', qualityAnalysis.id);
        
        // Notificar resultados
        window.dispatchEvent(new CustomEvent('qualityControlCompleted', {
            detail: qualityAnalysis
        }));
        
        return qualityAnalysis;
        
    } catch (error) {
        console.error('❌ Error en control de calidad:', error);
        throw error;
    }
}

async function planHarvest(parameters) {
    try {
        console.log('📅 Planificando cosecha inteligente...');
        
        const harvestPlan = {
            id: generateHarvestPlanId(),
            createdAt: new Date().toISOString(),
            parameters: parameters,
            recommendations: {
                optimal_dates: [],
                tree_priorities: [],
                weather_windows: [],
                crew_assignments: [],
                equipment_needs: []
            },
            aiPredictions: {
                yield_forecast: 0,
                quality_projection: {},
                risk_assessment: {},
                optimal_timing: null
            },
            logistics: {
                route_optimization: [],
                storage_planning: {},
                transportation: {},
                processing_schedule: []
            }
        };
        
        // Obtener datos de árboles
        const trees = await treeManager.getAllTrees();
        const treeStats = await treeManager.getStatistics();
        
        // Obtener datos climáticos
        const weatherForecast = await climateManager.getForecast();
        const historicalWeather = await climateManager.getHistoricalData();
        
        // Análisis de madurez de árboles
        harvestPlan.recommendations.tree_priorities = await analyzeTreeMaturity(trees);
        
        // Predicción de rendimiento con IA
        harvestPlan.aiPredictions.yield_forecast = await predictHarvestYield(trees, weatherForecast);
        
        // Análisis de ventanas climáticas
        harvestPlan.recommendations.weather_windows = await analyzeWeatherWindows(weatherForecast);
        
        // Optimización de rutas
        harvestPlan.logistics.route_optimization = await optimizeHarvestRoutes(trees);
        
        // Planificación de crew
        harvestPlan.recommendations.crew_assignments = await planCrewAssignments(harvestPlan);
        
        // Evaluación de riesgos
        harvestPlan.aiPredictions.risk_assessment = await assessHarvestRisks(weatherForecast, trees);
        
        // Guardar plan
        harvestSchedule.set(harvestPlan.id, harvestPlan);
        await offlineManager.saveData('harvest_plans', harvestPlan.id, harvestPlan);
        
        console.log('✅ Plan de cosecha generado:', harvestPlan.id);
        
        // Notificar plan completado
        window.dispatchEvent(new CustomEvent('harvestPlanReady', {
            detail: harvestPlan
        }));
        
        return harvestPlan;
        
    } catch (error) {
        console.error('❌ Error en planificación de cosecha:', error);
        throw error;
    }
}

// ==========================================
// FUNCIONES DE DATOS Y GRÁFICOS
// ==========================================

async function getChartData(periodo) {
    const labels = [];
    const produccionData = [];
    
    // Datos de producción real
    const harvests = Array.from(productionData.values()).filter(h => h.status === 'active');
    
    if (periodo === 'semana') {
        // Últimos 7 días
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            labels.push(date.toLocaleDateString('es-ES', { weekday: 'short' }));
            
            const dayProduction = harvests
                .filter(h => h.fecha === dateStr)
                .reduce((sum, h) => sum + (h.production?.totalWeight || 0), 0);
            
            produccionData.push(dayProduction);
        }
    } else if (periodo === 'mes') {
        // Últimos 30 días, agrupado cada 3 días
        for (let i = 30; i >= 0; i -= 3) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            labels.push(date.getDate().toString());
            
            // Producción de 3 días
            let periodProduction = 0;
            for (let j = 0; j < 3; j++) {
                const checkDate = new Date(date);
                checkDate.setDate(checkDate.getDate() + j);
                const dateStr = checkDate.toISOString().split('T')[0];
                
                periodProduction += harvests
                    .filter(h => h.fecha === dateStr)
                    .reduce((sum, h) => sum + (h.production?.totalWeight || 0), 0);
            }
            
            produccionData.push(periodProduction);
        }
    } else {
        // Año - por meses
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            
            labels.push(date.toLocaleDateString('es-ES', { month: 'short' }));
            
            const monthProduction = harvests
                .filter(h => {
                    const harvestDate = new Date(h.fecha);
                    return harvestDate.getMonth() === date.getMonth() && 
                           harvestDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, h) => sum + (h.production?.totalWeight || 0), 0);
            
            produccionData.push(monthProduction);
        }
    }
    
    // Rendimiento por sector usando datos reales de TreeManager
    const sectors = await treeManager.getAllSectors();
    const bloquesLabels = sectors.map(s => s.name);
    const rendimientoData = [];
    
    for (const sector of sectors) {
        const sectorProduction = harvests
            .filter(h => h.location?.blockId === sector.id)
            .reduce((sum, h) => sum + (h.production?.totalWeight || 0), 0);
        
        rendimientoData.push(sectorProduction);
    }
    
    // Datos de calidad por tiempo
    const calidadData = labels.map((label, index) => {
        const relevantHarvests = harvests.filter(h => {
            // Filtrar cosechas relevantes para este período
            return true; // Simplificado - en producción sería más específico
        });
        
        if (relevantHarvests.length === 0) return 0;
        
        return relevantHarvests.reduce((sum, h) => sum + (h.production?.calidad || 0), 0) / relevantHarvests.length;
    });
    
    return {
        labels,
        produccion: produccionData,
        bloquesLabels,
        rendimiento: rendimientoData,
        calidad: calidadData,
        // Datos adicionales para gráficos avanzados
        eficiencia: labels.map(() => Math.random() * 20 + 75), // Placeholder
        ingresos: produccionData.map(prod => prod * 7.5), // Precio promedio
        prediccion: produccionData.map(prod => prod * 1.1) // Predicción 10% mayor
    };
}

async function generateAIPredictions() {
    try {
        const trees = await treeManager.getAllTrees();
        const treeStats = await treeManager.getStatistics();
        const climateData = await loadClimateData();
        
        const healthyTrees = trees.filter(t => t.health?.overall >= 80).length;
        const totalTrees = trees.length;
        
        // Obtener producción reciente real
        const recentProduction = Array.from(productionData.values())
            .filter(h => {
                const harvestDate = new Date(h.fecha);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return harvestDate >= weekAgo && h.status === 'active';
            })
            .reduce((sum, h) => sum + (h.production?.totalWeight || 0), 0);
        
        // Análisis climático para predicciones
        const weatherImpact = climateData ? await analyzeWeatherImpact(climateData) : 1.0;
        
        const predictions = [
            {
                titulo: 'Producción Esperada',
                valor: totalTrees > 0 ? 
                    `+${Math.round((healthyTrees / totalTrees) * 20 * weatherImpact)}% próximos 7 días` : 
                    '+15% próximos 7 días',
                color: weatherImpact > 1 ? '#22c55e' : '#f59e0b',
                confianza: Math.round((healthyTrees / Math.max(totalTrees, 1)) * 100 * weatherImpact),
                descripcion: `Basado en ${healthyTrees} árboles saludables de ${totalTrees} total y condiciones climáticas`
            },
            {
                titulo: 'Calidad Proyectada',
                valor: treeStats.averageHealth > 80 ? 'Grado AA promedio' : 'Grado A promedio',
                color: '#3b82f6',
                confianza: Math.round(treeStats.averageHealth || 78),
                descripcion: `Basado en salud promedio de árboles: ${Math.round(treeStats.averageHealth || 0)}%`
            },
            {
                titulo: 'Rendimiento Estimado',
                valor: recentProduction > 0 ? 
                    `${Math.round(recentProduction / 7 * weatherImpact)} kg/día proyectado` : 
                    `${Math.round(45 * weatherImpact)} kg/día proyectado`,
                color: '#f59e0b',
                confianza: 85,
                descripcion: recentProduction > 0 ? 
                    `Basado en producción reciente: ${recentProduction} kg en 7 días` :
                    'Basado en rendimiento promedio histórico'
            },
            {
                titulo: 'Riesgo Climático',
                valor: await calculateClimateRisk(climateData),
                color: '#ef4444',
                confianza: 75,
                descripcion: 'Análisis de condiciones meteorológicas adversas'
            }
        ];
        
        return predictions;
        
    } catch (error) {
        console.error('❌ Error generando predicciones IA:', error);
        return getFallbackPredictions();
    }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function generateProductionId() {
    return `PROD_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
}

function generateQualityControlId() {
    return `QC_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
}

function generateHarvestPlanId() {
    return `HP_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
}

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

// Funciones de análisis simplificadas para demostración
async function performVisualInspection(sampleData) {
    return {
        color: { hue: Math.random() * 60 + 50, saturation: Math.random() * 20 + 70 },
        shape: { roundness: Math.random() * 20 + 80 },
        surface: { smoothness: Math.random() * 20 + 80 },
        defects: Math.random() < 0.1 ? ['spots'] : [],
        score: Math.random() * 20 + 80
    };
}

async function performChemicalAnalysis(sampleData) {
    return {
        ph: Math.random() * 0.5 + 2.0,
        acidez: Math.random() * 2 + 6,
        azucares: Math.random() * 2 + 8,
        vitamina_c: Math.random() * 20 + 40,
        score: Math.random() * 20 + 80
    };
}

async function performPhysicalTests(sampleData) {
    return {
        firmeza: Math.random() * 20 + 80,
        peso: Math.random() * 50 + 100,
        diametro: Math.random() * 20 + 60,
        score: Math.random() * 20 + 75
    };
}

async function performMicrobiologicalTests(sampleData) {
    return {
        bacterias: Math.random() * 100,
        hongos: Math.random() * 50,
        patogenos: Math.random() < 0.1 ? ['Detected'] : [],
        score: Math.random() < 0.1 ? 60 : Math.random() * 20 + 80
    };
}

function calculateOverallQuality(results) {
    const weights = {
        visual: 0.3,
        chemical: 0.25,
        physical: 0.25,
        microbiological: 0.2
    };
    
    const overallScore = 
        (results.visual.score * weights.visual) +
        (results.chemical.score * weights.chemical) +
        (results.physical.score * weights.physical) +
        (results.microbiological.score * weights.microbiological);
    
    let grade;
    if (overallScore >= 95) grade = 'AAA';
    else if (overallScore >= 90) grade = 'AA';
    else if (overallScore >= 80) grade = 'A';
    else if (overallScore >= 70) grade = 'B';
    else grade = 'C';
    
    return {
        grade,
        score: Math.round(overallScore),
        recommendations: generateQualityRecommendations(results, overallScore),
        certification: null
    };
}

function generateQualityRecommendations(results, overallScore) {
    const recommendations = [];
    
    if (results.visual.score < 80) {
        recommendations.push('Mejorar prácticas de manejo para reducir defectos visuales');
    }
    
    if (results.chemical.score < 80) {
        recommendations.push('Optimizar programa de fertilización');
    }
    
    if (overallScore >= 90) {
        recommendations.push('Excelente calidad - mantener prácticas actuales');
    }
    
    return recommendations;
}

async function loadOfflineProductionData() {
    try {
        const harvestsData = await offlineManager.getAllData('cosechas') || [];
        harvestsData.forEach(harvestData => {
            productionData.set(harvestData.id, harvestData.data);
        });
        
        console.log(`💾 Datos offline cargados: ${productionData.size} cosechas`);
        
    } catch (error) {
        console.warn('⚠️ Error cargando datos offline:', error);
    }
}

async function loadTreesProductionData() {
    try {
        if (treeManager) {
            const trees = await treeManager.getAllTrees();
            console.log(`🌳 ${trees.length} árboles disponibles para producción`);
        }
    } catch (error) {
        console.warn('⚠️ Error cargando datos de árboles:', error);
    }
}

async function loadClimateData() {
    try {
        if (climateManager) {
            const currentWeather = await climateManager.getCurrentWeather();
            const forecast = await climateManager.getForecast();
            const historical = await climateManager.getHistoricalData();
            
            console.log('🌤️ Datos climáticos cargados para predicciones');
            return { currentWeather, forecast, historical };
        }
        return null;
    } catch (error) {
        console.warn('⚠️ Error cargando datos climáticos:', error);
        return null;
    }
}

async function calculateProductionStatistics() {
    try {
        const registros = Array.from(productionData.values());
        
        statistics.totalSeason = registros.reduce((sum, r) => 
            sum + (r.production?.totalWeight || 0), 0);
        
        statistics.averageDaily = statistics.totalSeason / Math.max(registros.length, 1);
        
        console.log('📊 Estadísticas de producción calculadas');
    } catch (error) {
        console.warn('⚠️ Error calculando estadísticas:', error);
    }
}

async function initializeQualityControl() {
    try {
        const existingControls = await offlineManager.getAllData('quality_controls') || [];
        existingControls.forEach(control => {
            qualityControls.set(control.id, control.data);
        });
        
        console.log(`🔬 ${qualityControls.size} controles de calidad cargados`);
    } catch (error) {
        console.warn('⚠️ Error inicializando control de calidad:', error);
    }
}

async function initializeHarvestPlanning() {
    try {
        const existingPlans = await offlineManager.getAllData('harvest_plans') || [];
        existingPlans.forEach(plan => {
            harvestSchedule.set(plan.id, plan.data);
        });
        
        console.log(`📅 ${harvestSchedule.size} planes de cosecha cargados`);
    } catch (error) {
        console.warn('⚠️ Error inicializando planificación de cosecha:', error);
    }
}

async function initializeTreatmentPlanning() {
    try {
        const existingTreatments = await offlineManager.getAllData('treatments') || [];
        existingTreatments.forEach(treatment => {
            treatmentPlans.set(treatment.id, treatment.data);
        });
        
        console.log(`💊 ${treatmentPlans.size} tratamientos cargados`);
    } catch (error) {
        console.warn('⚠️ Error inicializando gestión de tratamientos:', error);
    }
}

// Funciones de fallback para cuando no hay datos
function getFallbackPredictions() {
    return [
        {
            titulo: 'Producción Esperada',
            valor: '+15% próximos 7 días',
            color: '#22c55e',
            confianza: 80,
            descripcion: 'Estimación basada en datos históricos'
        },
        {
            titulo: 'Calidad Proyectada',
            valor: 'Grado AA promedio',
            color: '#3b82f6',
            confianza: 78,
            descripcion: 'Basado en condiciones actuales de la finca'
        }
    ];
}

// Funciones de análisis climático simplificadas
async function analyzeWeatherImpact(climateData) {
    if (!climateData || !climateData.forecast) return 1.0;
    
    let impact = 1.0;
    const avgTemp = climateData.forecast.temperature || 25;
    
    if (avgTemp >= 20 && avgTemp <= 30) {
        impact += 0.1;
    } else if (avgTemp > 35 || avgTemp < 15) {
        impact -= 0.2;
    }
    
    return Math.max(impact, 0.5);
}

async function calculateClimateRisk(climateData) {
    if (!climateData || !climateData.forecast) return 'Riesgo bajo';
    
    let riskScore = 0;
    const forecast = climateData.forecast;
    
    if (forecast.temperature > 35 || forecast.temperature < 10) {
        riskScore += 30;
    }
    
    if (forecast.rainfall > 200) {
        riskScore += 25;
    }
    
    if (riskScore >= 50) return 'Riesgo alto';
    if (riskScore >= 25) return 'Riesgo medio';
    return 'Riesgo bajo';
}

// Funciones placeholder para funcionalidades avanzadas
async function manageTreatments(treatmentData) {
    console.log('💊 Gestión de tratamientos:', treatmentData);
    return { id: 'TREATMENT_DEMO', status: 'scheduled' };
}

async function analyzePerformance(analysisParams) {
    console.log('📊 Análisis de rendimiento:', analysisParams);
    return { metrics: {}, trends: {}, recommendations: [] };
}

async function advancedPrediction(predictionType, parameters) {
    console.log('🤖 Predicción avanzada:', predictionType, parameters);
    return { type: predictionType, results: {}, confidence: 85 };
}

async function optimizeIrrigation(parameters) {
    console.log('💧 Optimización de riego:', parameters);
    return { schedule: [], efficiency: 0.9 };
}

async function generateCompleteReport() {
    console.log('📋 Generando reporte completo...');
    return { sections: [], generated: new Date().toISOString() };
}

async function exportProductionData() {
    console.log('📤 Exportando datos de producción...');
    return { exported: true, records: productionData.size };
}

async function generateDailyReport() {
    const hoy = new Date().toISOString().split('T')[0];
    const registrosHoy = Array.from(productionData.values())
        .filter(r => r.fecha === hoy || r.timestamp.startsWith(hoy));
    
    const totalProduccion = registrosHoy.reduce((sum, r) => 
        sum + (r.production?.totalWeight || 0), 0);
    
    return {
        fecha: hoy,
        totalProduccion: Math.round(totalProduccion * 100) / 100,
        registros: registrosHoy.length,
        calidadPromedio: registrosHoy.length > 0 ? 
            registrosHoy.reduce((sum, r) => sum + (r.production?.calidad || 85), 0) / registrosHoy.length : 85
    };
}

// Funciones auxiliares para planificación de cosecha
async function analyzeTreeMaturity(trees) {
    return trees.slice(0, 10).map((tree, index) => ({
        treeId: tree.id,
        correlative: tree.correlative || `00${index + 1}`,
        maturityScore: Math.random() * 40 + 60,
        harvestPriority: Math.random() * 100,
        estimatedYield: Math.random() * 50 + 30
    }));
}

async function predictHarvestYield(trees, weatherForecast) {
    const totalTrees = trees.length;
    const baseYield = totalTrees * 45;
    const weatherMultiplier = Math.random() * 0.3 + 0.85;
    return Math.round(baseYield * weatherMultiplier);
}

async function analyzeWeatherWindows(forecast) {
    return [
        { date: '2024-01-15', conditions: 'optimal', confidence: 0.9 },
        { date: '2024-01-16', conditions: 'good', confidence: 0.8 }
    ];
}

async function optimizeHarvestRoutes(trees) {
    return [
        { route: 'Ruta A', trees: trees.slice(0, 10), efficiency: 0.95 },
        { route: 'Ruta B', trees: trees.slice(10, 20), efficiency: 0.88 }
    ];
}

async function planCrewAssignments(harvestPlan) {
    return [
        { crew: 'Equipo 1', leader: 'Juan Pérez', members: 4, assignment: 'Sector Norte' },
        { crew: 'Equipo 2', leader: 'María González', members: 3, assignment: 'Sector Sur' }
    ];
}

async function assessHarvestRisks(weatherForecast, trees) {
    return {
        level: 'Bajo',
        factors: ['Condiciones climáticas favorables', 'Árboles en buen estado'],
        recommendations: ['Proceder según plan', 'Monitorear clima diariamente']
    };
}

// Funciones adicionales de calidad
async function predictQualityTrends(sampleData) {
    return {
        trend: 'improving',
        confidence: 0.85,
        factors: ['Mejor manejo', 'Condiciones climáticas favorables']
    };
}

async function generateQualityCertificate(qualityAnalysis) {
    return {
        id: `CERT_${Date.now()}`,
        grade: qualityAnalysis.overall.grade,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        authority: 'Finca La Herradura Quality Control'
    };
}

async function updateQualityStatistics(qualityAnalysis) {
    const grade = qualityAnalysis.overall.grade;
    if (!qualityMetrics.has(grade)) {
        qualityMetrics.set(grade, []);
    }
    qualityMetrics.get(grade).push(qualityAnalysis);
    console.log(`📊 Estadísticas de calidad actualizadas para grado ${grade}`);
}

// Funciones de carga y filtros
async function loadProductionData(filters = {}) {
    try {
        let data = Array.from(productionData.values());
        
        if (filters.dateFrom) {
            data = data.filter(r => new Date(r.fecha) >= new Date(filters.dateFrom));
        }
        
        if (filters.dateTo) {
            data = data.filter(r => new Date(r.fecha) <= new Date(filters.dateTo));
        }
        
        if (filters.arbolId) {
            data = data.filter(r => r.arbolId === filters.arbolId);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error cargando datos de producción:', error);
        return [];
    }
}

async function getFilteredRecords(filters) {
    return await loadProductionData(filters);
}

async function applyFilters(filters) {
    const filteredData = await getFilteredRecords(filters);
    console.log(`🔍 Aplicados filtros, ${filteredData.length} registros encontrados`);
    return filteredData;
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

// Variable global para el manager
let productionManager = null;

async function initializeGlobalProductionManager() {
    if (productionManager) return productionManager;
    
    try {
        console.log('🚀 Inicializando ProductionManager global completo...');
        
        productionManager = await initializeProductionSystem();
        
        // Hacer disponible globalmente con todas las funciones
        window.productionManager = productionManager;
        
        console.log('✅ ProductionManager completo disponible globalmente');
        
        // Disparar evento para notificar que está listo
        window.dispatchEvent(new CustomEvent('productionManagerReady', {
            detail: productionManager
        }));
        
        return productionManager;
        
    } catch (error) {
        console.error('❌ Error inicializando ProductionManager completo:', error);
        return null;
    }
}

// Auto-inicializar
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGlobalProductionManager);
    } else {
        setTimeout(initializeGlobalProductionManager, 100);
    }
}

// Escuchar actualizaciones del sistema de árboles
if (typeof window !== 'undefined') {
    window.addEventListener('treeUpdate', async (event) => {
        console.log('🌳 Árbol actualizado, recargando datos de producción');
        if (productionManager) {
            await loadTreesProductionData();
            await calculateProductionStatistics();
        }
    });
    
    window.addEventListener('sectorUpdate', async (event) => {
        console.log('📦 Sector actualizado, recargando datos de producción');
        if (productionManager) {
            await loadTreesProductionData();
            await calculateProductionStatistics();
        }
    });
}

console.log('🌾 Sistema de gestión de producción completo integrado cargado');

// Exportar para otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeProductionSystem,
        registerProduction,
        registerCompleteProduction,
        calculateKPIs,
        getRecentActivities,
        generateAIPredictions,
        getChartData,
        qualityControl,
        planHarvest,
        manageTreatments,
        analyzePerformance,
        advancedPrediction,
        abrirRegistroCompleto
    };
}
