/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRODUCCIÓN
   Sistema completo integrado con tree-manager y correlativos
   Convertido a funciones JavaScript
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let productionData = new Map();
let dailyProduction = new Map();
let seasonalData = new Map();
let qualityMetrics = new Map();
let isProductionInitialized = false;

// Configuración
const currentSeason = getCurrentSeason();
const qualityGrades = ['AAA', 'AA', 'A', 'B', 'C'];

// Precios de mercado
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
    productivity: 0
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
        
        // Calcular estadísticas
        await calculateProductionStatistics();
        
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
            cargarDatos: loadProductionData
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
        getForecast: () => Promise.resolve({})
    };
}

function createFallbackTreeManager() {
    return {
        getAllTrees: () => Promise.resolve([]),
        getTree: (id) => Promise.resolve(null),
        updateTree: (id, data) => Promise.resolve(),
        getAllSectors: () => Promise.resolve([]),
        obtenerListaCompleta: () => []
    };
}

// ==========================================
// CARGA DE DATOS INTEGRADA
// ==========================================

async function loadOfflineProductionData() {
    try {
        const harvestsData = await offlineManager.getAllData('cosechas') || [];
        harvestsData.forEach(harvestData => {
            productionData.set(harvestData.id, harvestData.data);
        });
        
        const dailyData = await offlineManager.getAllData('produccion_diaria') || [];
        dailyData.forEach(dayData => {
            dailyProduction.set(dayData.id, dayData.data);
        });
        
        console.log(`💾 Datos offline cargados: ${productionData.size} cosechas`);
        
    } catch (error) {
        console.warn('⚠️ Error cargando datos offline:', error);
    }
}

async function loadTreesProductionData() {
    try {
        if (!treeManager) return;
        
        const trees = await treeManager.getAllTrees();
        
        // Crear registros de producción basados en árboles existentes
        if (productionData.size === 0 && trees.length > 0) {
            await createSampleProductionFromTrees(trees);
        }
        
        console.log(`🌳 Datos de árboles integrados: ${trees.length} árboles`);
        
    } catch (error) {
        console.error('❌ Error cargando datos de árboles:', error);
    }
}

async function createSampleProductionFromTrees(trees) {
    const today = new Date();
    
    // Crear algunos registros de ejemplo para los primeros 5 árboles
    const samplesToCreate = Math.min(trees.length, 5);
    
    for (let i = 0; i < samplesToCreate; i++) {
        const tree = trees[i];
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const harvestId = generateHarvestId();
        const production = Math.floor(Math.random() * 50) + 20; // 20-70 kg
        
        const harvestRecord = {
            id: harvestId,
            date: date.toISOString().split('T')[0],
            treeCorrelative: tree.correlative || '00000',
            harvester: { name: `Trabajador ${i + 1}` },
            location: {
                type: 'tree',
                id: tree.id,
                name: `Árbol #${tree.correlative || '00000'}`,
                blockId: tree.blockId
            },
            production: {
                totalWeight: production,
                containerCount: Math.ceil(production / 25)
            },
            quality: {
                grade: getQualityFromHealth(tree.health?.overall || 80),
                overallScore: tree.health?.overall || 80
            },
            efficiency: {
                kgPerHour: Math.floor(Math.random() * 20) + 15
            },
            season: currentSeason,
            createdAt: date.toISOString(),
            status: 'active'
        };
        
        productionData.set(harvestId, harvestRecord);
        
        // Guardar offline
        if (offlineManager) {
            await offlineManager.saveData('cosechas', harvestId, harvestRecord);
        }
    }
    
    console.log(`📊 Creados ${samplesToCreate} registros de ejemplo`);
}

function getQualityFromHealth(health) {
    if (health >= 90) return 'AAA';
    if (health >= 80) return 'AA';
    if (health >= 70) return 'A';
    if (health >= 60) return 'B';
    return 'C';
}

// ==========================================
// API PÚBLICA PARA INTEGRACIÓN
// ==========================================

async function loadProductionData() {
    await calculateProductionStatistics();
    return true;
}

async function getFormOptions() {
    try {
        const sectores = await treeManager.getAllSectors();
        const trees = await treeManager.getAllTrees();
        const listaCompleta = treeManager.obtenerListaCompleta ? 
            treeManager.obtenerListaCompleta() : [];
        
        return {
            sectores: sectores.map(sector => ({
                value: sector.id,
                label: sector.name
            })),
            opciones: [
                // Sectores
                ...sectores.map(sector => ({
                    value: sector.id,
                    label: `${sector.name} (Sector completo)`,
                    type: 'sector'
                })),
                // Árboles individuales con correlativo
                ...trees.map(tree => ({
                    value: tree.id,
                    label: `Árbol #${tree.correlative || '00000'} - ${tree.blockId || 'Sin sector'}`,
                    type: 'tree'
                }))
            ]
        };
    } catch (error) {
        console.error('❌ Error obteniendo opciones:', error);
        return {
            sectores: [],
            opciones: []
        };
    }
}

function calculateKPIs() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyHarvests = Array.from(productionData.values()).filter(h => {
        const harvestDate = new Date(h.date);
        return harvestDate.getMonth() === currentMonth && 
               harvestDate.getFullYear() === currentYear &&
               h.status === 'active';
    });
    
    const produccionMes = monthlyHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0);
    const rendimientoPromedio = monthlyHarvests.length > 0 ? 
        produccionMes / monthlyHarvests.length : 0;
    const calidadPromedio = monthlyHarvests.length > 0 ?
        monthlyHarvests.reduce((sum, h) => sum + h.quality.overallScore, 0) / monthlyHarvests.length : 0;
    
    // Calcular ingresos basado en calidad
    const ingresosMes = monthlyHarvests.reduce((sum, h) => {
        const precio = marketPrices[h.quality.grade] || 5.0;
        return sum + (h.production.totalWeight * precio);
    }, 0);
    
    return {
        produccionMes,
        rendimientoPromedio: Math.round(rendimientoPromedio * 10) / 10,
        calidadPromedio: Math.round(calidadPromedio),
        ingresosMes: Math.round(ingresosMes)
    };
}

function getRecentActivities() {
    const recent = Array.from(productionData.values())
        .filter(h => h.status === 'active')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    return recent.map(harvest => ({
        fecha: harvest.date,
        descripcion: `Cosecha en ${harvest.location.name}`,
        cantidad: harvest.production.totalWeight,
        detalles: `Por ${harvest.harvester.name} - Calidad ${harvest.quality.grade}`
    }));
}

function getFilteredRecords() {
    return Array.from(productionData.values())
        .filter(h => h.status === 'active')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20)
        .map(harvest => ({
            id: harvest.id,
            fecha: harvest.date,
            arbol: harvest.location.name,
            bloque: harvest.location.blockId,
            cantidad: harvest.production.totalWeight,
            tipo: harvest.quality.grade.toLowerCase(),
            calidad: harvest.quality.overallScore,
            responsable: harvest.harvester.name
        }));
}

// ==========================================
// REGISTRO DE PRODUCCIÓN
// ==========================================

async function registerProduction(datos) {
    const harvestId = generateHarvestId();
    
    // Obtener información del árbol/sector
    let locationInfo = await getLocationInfo(datos.arbolId);
    
    const harvest = {
        id: harvestId,
        date: datos.fecha,
        treeCorrelative: locationInfo.correlative,
        harvester: { name: datos.responsable || 'Usuario Actual' },
        location: {
            type: locationInfo.type,
            id: datos.arbolId,
            name: locationInfo.name,
            blockId: locationInfo.blockId
        },
        production: {
            totalWeight: datos.cantidad,
            containerCount: Math.ceil(datos.cantidad / 25)
        },
        quality: {
            grade: getGradeFromType(datos.tipo),
            overallScore: Math.floor(Math.random() * 20) + 75
        },
        efficiency: {
            kgPerHour: Math.floor(Math.random() * 15) + 20
        },
        season: currentSeason,
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    
    productionData.set(harvestId, harvest);
    
    // Guardar offline
    if (offlineManager) {
        await offlineManager.saveData('cosechas', harvestId, harvest);
    }
    
    // Actualizar producción en el árbol si es un árbol individual
    if (locationInfo.type === 'tree' && treeManager.updateTree) {
        try {
            const currentProduction = locationInfo.data?.production?.currentSeason || 0;
            await treeManager.updateTree(datos.arbolId, {
                production: {
                    currentSeason: currentProduction + datos.cantidad,
                    lastHarvest: new Date().toISOString()
                }
            });
        } catch (error) {
            console.warn('⚠️ Error actualizando producción del árbol:', error);
        }
    }
    
    await calculateProductionStatistics();
    
    console.log('🌾 Producción registrada:', harvestId);
    return harvest;
}

async function registerCompleteProduction(datos) {
    const harvestId = generateHarvestId();
    
    // Obtener información del árbol/sector
    let locationInfo = await getLocationInfo(datos.arbolId);
    
    const harvest = {
        id: harvestId,
        date: datos.fecha.split('T')[0],
        treeCorrelative: locationInfo.correlative,
        harvester: { name: datos.responsable },
        location: {
            type: locationInfo.type,
            id: datos.arbolId,
            name: locationInfo.name,
            blockId: locationInfo.blockId,
            gps: datos.ubicacion
        },
        production: {
            totalWeight: datos.cantidad,
            containerCount: Math.ceil(datos.cantidad / 25)
        },
        quality: {
            grade: datos.calidad >= 90 ? 'AAA' : datos.calidad >= 80 ? 'AA' : datos.calidad >= 70 ? 'A' : 'B',
            overallScore: datos.calidad
        },
        calibres: datos.calibres,
        merma: datos.merma,
        observaciones: datos.observaciones,
        fotos: datos.fotos || [],
        efficiency: {
            kgPerHour: Math.floor(Math.random() * 15) + 20
        },
        season: currentSeason,
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    
    productionData.set(harvestId, harvest);
    
    if (offlineManager) {
        await offlineManager.saveData('cosechas', harvestId, harvest);
    }
    
    // Actualizar producción en el árbol
    if (locationInfo.type === 'tree' && treeManager.updateTree) {
        try {
            const currentProduction = locationInfo.data?.production?.currentSeason || 0;
            await treeManager.updateTree(datos.arbolId, {
                production: {
                    currentSeason: currentProduction + datos.cantidad,
                    lastHarvest: new Date().toISOString()
                }
            });
        } catch (error) {
            console.warn('⚠️ Error actualizando producción del árbol:', error);
        }
    }
    
    await calculateProductionStatistics();
    
    console.log('🌾 Producción completa registrada:', harvestId);
    return harvest;
}

async function getLocationInfo(locationId) {
    try {
        // Verificar si es un árbol
        const tree = await treeManager.getTree(locationId);
        if (tree) {
            return {
                type: 'tree',
                correlative: tree.correlative,
                name: `Árbol #${tree.correlative || '00000'}`,
                blockId: tree.blockId,
                data: tree
            };
        }
        
        // Verificar si es un sector
        const sector = treeManager.getSector ? await treeManager.getSector(locationId) : null;
        if (sector) {
            return {
                type: 'sector',
                correlative: null,
                name: sector.name,
                blockId: locationId,
                data: sector
            };
        }
        
        // Fallback
        return {
            type: 'unknown',
            correlative: null,
            name: `Ubicación ${locationId}`,
            blockId: locationId,
            data: null
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo info de ubicación:', error);
        return {
            type: 'unknown',
            correlative: null,
            name: `Ubicación ${locationId}`,
            blockId: locationId,
            data: null
        };
    }
}

function getGradeFromType(tipo) {
    switch (tipo) {
        case 'principal': return 'AA';
        case 'secundaria': return 'A';
        case 'extra': return 'AAA';
        default: return 'B';
    }
}

// ==========================================
// ANÁLISIS Y PREDICCIONES
// ==========================================

async function generateAIPredictions() {
    const trees = await treeManager.getAllTrees();
    const healthyTrees = trees.filter(t => t.health?.overall >= 80).length;
    const totalTrees = trees.length;
    
    const recentProduction = Array.from(productionData.values())
        .filter(h => {
            const harvestDate = new Date(h.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return harvestDate >= weekAgo && h.status === 'active';
        })
        .reduce((sum, h) => sum + h.production.totalWeight, 0);
    
    const predictions = [
        {
            titulo: 'Producción Esperada',
            valor: totalTrees > 0 ? `+${Math.round((healthyTrees / totalTrees) * 20)}% próximos 7 días` : '+15% próximos 7 días',
            color: '#22c55e',
            confianza: Math.round((healthyTrees / Math.max(totalTrees, 1)) * 100),
            descripcion: `Basado en ${healthyTrees} árboles saludables de ${totalTrees} total`
        },
        {
            titulo: 'Calidad Proyectada',
            valor: healthyTrees > totalTrees * 0.8 ? 'Grado AA promedio' : 'Grado A promedio',
            color: '#3b82f6',
            confianza: 78,
            descripcion: 'Basado en salud general de los árboles'
        },
        {
            titulo: 'Rendimiento Estimado',
            valor: recentProduction > 0 ? `${Math.round(recentProduction / 7)} kg/día proyectado` : '45 kg/día proyectado',
            color: '#f59e0b',
            confianza: 85,
            descripcion: `Basado en producción reciente: ${recentProduction} kg en 7 días`
        }
    ];
    
    return predictions;
}

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
                .filter(h => h.date === dateStr)
                .reduce((sum, h) => sum + h.production.totalWeight, 0);
            
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
                    .filter(h => h.date === dateStr)
                    .reduce((sum, h) => sum + h.production.totalWeight, 0);
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
                    const harvestDate = new Date(h.date);
                    return harvestDate.getMonth() === date.getMonth() && 
                           harvestDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, h) => sum + h.production.totalWeight, 0);
            
            produccionData.push(monthProduction);
        }
    }
    
    // Rendimiento por sector usando datos reales
    const sectors = await treeManager.getAllSectors();
    const bloquesLabels = sectors.map(s => s.name);
    const rendimientoData = [];
    
    for (const sector of sectors) {
        const sectorProduction = harvests
            .filter(h => h.location.blockId === sector.id)
            .reduce((sum, h) => sum + h.production.totalWeight, 0);
        
        rendimientoData.push(sectorProduction);
    }
    
    return {
        labels,
        produccion: produccionData,
        bloquesLabels,
        rendimiento: rendimientoData
    };
}

// ==========================================
// UTILIDADES
// ==========================================

function generateHarvestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `HST_${timestamp}_${random}`.toUpperCase();
}

function getCurrentSeason() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (month >= 4 && month <= 9) {
        return `${year}_lluviosa`;
    } else {
        return `${year}_seca`;
    }
}

async function calculateProductionStatistics() {
    const activeHarvests = Array.from(productionData.values()).filter(h => h.status === 'active');
    
    statistics = {
        totalSeason: activeHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0),
        totalLifetime: activeHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0),
        averageDaily: activeHarvests.length > 0 ? 
            activeHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0) / activeHarvests.length : 0,
        averagePerTree: 25.5,
        qualityDistribution: calculateQualityDistribution(activeHarvests),
        productivity: 85
    };
}

function calculateQualityDistribution(harvests) {
    const distribution = {};
    let totalWeight = 0;
    
    harvests.forEach(harvest => {
        const grade = harvest.quality.grade;
        const weight = harvest.production.totalWeight;
        
        distribution[grade] = (distribution[grade] || 0) + weight;
        totalWeight += weight;
    });
    
    return distribution;
}

function applyFilters(filtros) {
    console.log('🔍 Filtros aplicados:', filtros);
    // La lógica de filtrado se puede implementar aquí
}

function exportProductionData() {
    const data = {
        harvests: Array.from(productionData.values()),
        statistics: statistics,
        exportDate: new Date().toISOString(),
        season: currentSeason
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], 
        { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produccion_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📄 Datos de producción exportados');
}

function generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const todayHarvests = Array.from(productionData.values())
        .filter(h => h.date === today && h.status === 'active');
    
    const totalProduccion = todayHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0);
    const arbolesUnicos = new Set(todayHarvests.map(h => h.location.id)).size;
    
    console.log(`📊 Reporte diario - ${today}: ${totalProduccion}kg en ${todayHarvests.length} cosechas de ${arbolesUnicos} ubicaciones`);
    
    // Disparar notificación si hay sistema de notificaciones
    if (window.showNotification) {
        window.showNotification(
            `Reporte generado: ${totalProduccion}kg cosechados hoy de ${arbolesUnicos} ubicaciones`, 
            'success'
        );
    }
    
    return {
        fecha: today,
        totalProduccion,
        numeroCosechas: todayHarvests.length,
        ubicacionesUnicas: arbolesUnicos,
        detalles: todayHarvests
    };
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN GLOBAL
// ==========================================

// Variable global para el manager
let productionManager = null;

async function initializeGlobalProductionManager() {
    if (productionManager) return productionManager;
    
    try {
        console.log('🚀 Inicializando ProductionManager global...');
        
        productionManager = await initializeProductionSystem();
        
        // Hacer disponible globalmente con todas las funciones
        window.productionManager = productionManager;
        
        console.log('✅ ProductionManager disponible globalmente');
        
        // Disparar evento para notificar que está listo
        window.dispatchEvent(new CustomEvent('productionManagerReady', {
            detail: productionManager
        }));
        
        return productionManager;
        
    } catch (error) {
        console.error('❌ Error inicializando ProductionManager:', error);
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
        console.log('🏢 Sector actualizado, recargando datos de producción');
        if (productionManager) {
            await loadTreesProductionData();
            await calculateProductionStatistics();
        }
    });
}

console.log('🌾 Sistema de gestión de producción integrado cargado');

// Exportar funciones para otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeProductionSystem,
        registerProduction,
        registerCompleteProduction,
        calculateKPIs,
        getRecentActivities,
        generateAIPredictions,
        getChartData
    };
}
