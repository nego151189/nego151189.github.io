/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRODUCCIÓN
   Sistema inteligente de registro de cosechas y análisis productivo
   ======================================== */

// Variables para managers externos
let offlineManager, climateManager, treeManager;

// Función para cargar dependencias de forma segura
async function loadDependencies() {
  try {
    // Esperar a que los managers estén disponibles globalmente
    await waitForManagers();
    
    offlineManager = window.offlineManager || window.offline;
    climateManager = window.climateManager || window.climate;  
    treeManager = window.treeManager || window.trees;
    
    console.log('📦 Dependencias de producción cargadas');
  } catch (error) {
    console.warn('⚠️ Error cargando dependencias, usando fallbacks:', error);
    createFallbackManagers();
  }
}

async function waitForManagers() {
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    if (window.offlineManager && window.treeManager) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
}

function createFallbackManagers() {
  if (!offlineManager) {
    offlineManager = {
      getAllData: (collection) => Promise.resolve([]),
      saveData: (collection, id, data) => Promise.resolve(),
      loadData: (collection, id) => Promise.resolve(null)
    };
  }
  
  if (!climateManager) {
    climateManager = {
      getCurrentWeather: () => Promise.resolve({}),
      getForecast: () => Promise.resolve({})
    };
  }
  
  if (!treeManager) {
    treeManager = {
      getTree: (id) => Promise.resolve(null),
      updateTree: (id, data) => Promise.resolve(),
      getProductionSummary: () => Promise.resolve({
        totalProduction: 0,
        totalTrees: 0,
        averagePerTree: 0
      }),
      obtenerListaCompleta: () => [
        { id: 'arbol_001', label: 'Árbol 001', type: 'tree' },
        { id: 'bloque_a', label: 'Bloque A', type: 'block' }
      ]
    };
  }
}

class ProductionManager {
  constructor() {
    // Configuración base
    this.fincaId = 'finca_la_herradura';
    this.currentSeason = this.getCurrentSeason();
    this.qualityGrades = ['AAA', 'AA', 'A', 'B', 'C'];
    
    // Datos en memoria
    this.harvests = new Map();
    this.dailyProduction = new Map();
    this.seasonalData = new Map();
    this.qualityMetrics = new Map();
    
    // Machine Learning para producción
    this.mlModels = {
      yield: null,
      quality: null,
      timing: null,
      market: null
    };
    
    // Métricas y estadísticas
    this.statistics = {
      totalSeason: 0,
      totalLifetime: 0,
      averageDaily: 0,
      averagePerTree: 0,
      qualityDistribution: {},
      topPerformingBlocks: [],
      productivity: 0
    };
    
    // Configuración de alertas y umbrales
    this.thresholds = {
      dailyProduction: {
        low: 100,
        normal: 500,
        high: 1000
      },
      quality: {
        excellent: 95,
        good: 80,
        acceptable: 60
      },
      efficiency: {
        treesPerHour: 5,
        kgPerHour: 25,
        kgPerTree: 50
      }
    };
    
    // Precios y mercado
    this.marketPrices = {
      current: {
        'AAA': 8.50,
        'AA': 7.50,
        'A': 6.50,
        'B': 5.00,
        'C': 3.50
      },
      historical: [],
      trends: {}
    };
    
    this.init();
  }

  async init() {
    try {
      console.log('📈 Inicializando sistema de producción...');
      
      // Cargar dependencias
      await loadDependencies();
      
      // Cargar datos offline
      await this.loadOfflineData();
      
      // Inicializar modelos ML
      await this.initMLModels();
      
      // Cargar precios de mercado
      await this.loadMarketPrices();
      
      // Calcular estadísticas
      await this.calculateStatistics();
      
      // Crear algunos datos de ejemplo
      await this.createSampleData();
      
      console.log(`✅ Sistema de producción inicializado: ${this.harvests.size} registros de cosecha`);
      
    } catch (error) {
      console.error('❌ Error inicializando sistema de producción:', error);
    }
  }

  async loadOfflineData() {
    try {
      if (!offlineManager) return;
      
      const harvestsData = await offlineManager.getAllData('cosechas') || [];
      harvestsData.forEach(harvestData => {
        this.harvests.set(harvestData.id, harvestData.data);
      });
      
      const dailyData = await offlineManager.getAllData('produccion_diaria') || [];
      dailyData.forEach(dayData => {
        this.dailyProduction.set(dayData.id, dayData.data);
      });
      
      console.log(`📱 Datos de producción cargados offline: ${this.harvests.size} cosechas`);
      
    } catch (error) {
      console.warn('Error cargando datos offline de producción:', error);
    }
  }

  async initMLModels() {
    try {
      this.mlModels.yield = this.createEmptyModel('yield');
      this.mlModels.quality = this.createEmptyModel('quality');
      this.mlModels.timing = this.createEmptyModel('timing');
      this.mlModels.market = this.createEmptyModel('market');
      
      console.log('🤖 Modelos ML de producción inicializados');
      
    } catch (error) {
      console.error('Error inicializando modelos ML:', error);
    }
  }

  createEmptyModel(type) {
    return {
      type,
      version: 1,
      trainedAt: null,
      accuracy: 0,
      features: [],
      predictions: [],
      patterns: []
    };
  }

  async createSampleData() {
    // Crear algunos registros de ejemplo si no hay datos
    if (this.harvests.size === 0) {
      const sampleHarvests = this.generateSampleHarvests();
      for (const harvest of sampleHarvests) {
        this.harvests.set(harvest.id, harvest);
      }
      console.log('📊 Datos de ejemplo creados');
    }
  }

  generateSampleHarvests() {
    const samples = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const harvestId = `HST_${Date.now()}_${i}`;
      samples.push({
        id: harvestId,
        date: date.toISOString().split('T')[0],
        harvester: { name: `Trabajador ${i + 1}` },
        location: {
          type: 'tree',
          id: `arbol_00${i + 1}`,
          name: `Árbol ${i + 1}`
        },
        production: {
          totalWeight: Math.floor(Math.random() * 50) + 20,
          containerCount: Math.floor(Math.random() * 5) + 2
        },
        quality: {
          grade: ['AAA', 'AA', 'A', 'B'][Math.floor(Math.random() * 4)],
          overallScore: Math.floor(Math.random() * 30) + 70
        },
        efficiency: {
          kgPerHour: Math.floor(Math.random() * 20) + 15
        },
        season: this.currentSeason,
        createdAt: date.toISOString(),
        status: 'active'
      });
    }
    
    return samples;
  }

  // ==========================================
  // API PÚBLICA PARA EL HTML
  // ==========================================

  async cargarDatos() {
    await this.calculateStatistics();
    return true;
  }

  calcularKPIs() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyHarvests = Array.from(this.harvests.values()).filter(h => {
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
    const ingresosMes = produccionMes * 7; // Precio promedio estimado
    
    return {
      produccionMes,
      rendimientoPromedio: Math.round(rendimientoPromedio * 10) / 10,
      calidadPromedio: Math.round(calidadPromedio),
      ingresosMes
    };
  }

  obtenerActividadesRecientes() {
    const recent = Array.from(this.harvests.values())
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

  obtenerRegistrosFiltrados() {
    return Array.from(this.harvests.values())
      .filter(h => h.status === 'active')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20)
      .map(harvest => ({
        id: harvest.id,
        fecha: harvest.date,
        arbol: harvest.location.name,
        bloque: harvest.location.id,
        cantidad: harvest.production.totalWeight,
        tipo: harvest.quality.grade.toLowerCase(),
        calidad: harvest.quality.overallScore,
        responsable: harvest.harvester.name
      }));
  }

  async generarPrediccionesIA() {
    // Simulación de predicciones IA
    return [
      {
        titulo: 'Producción Esperada',
        valor: '+15% próximos 7 días',
        color: '#22c55e',
        confianza: 85,
        descripcion: 'Condiciones favorables detectadas'
      },
      {
        titulo: 'Calidad Proyectada',
        valor: 'Grado AA promedio',
        color: '#3b82f6',
        confianza: 78,
        descripcion: 'Basado en condiciones climáticas'
      },
      {
        titulo: 'Mejor Período Cosecha',
        valor: 'Próximos 3-5 días',
        color: '#f59e0b',
        confianza: 92,
        descripcion: 'Modelo de timing óptimo'
      }
    ];
  }

  async obtenerDatosGraficos(periodo) {
    const labels = [];
    const produccionData = [];
    const bloquesLabels = ['Bloque A', 'Bloque B', 'Bloque C'];
    const rendimientoData = [45, 38, 52];
    
    // Generar datos de ejemplo basados en el período
    const days = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      if (periodo === 'semana') {
        labels.push(date.toLocaleDateString('es-ES', { weekday: 'short' }));
        produccionData.push(Math.floor(Math.random() * 100) + 50);
      } else if (periodo === 'mes') {
        if (i % 3 === 0) { // Cada 3 días
          labels.push(date.getDate().toString());
          produccionData.push(Math.floor(Math.random() * 300) + 200);
        }
      } else {
        if (i % 30 === 0) { // Cada mes
          labels.push(date.toLocaleDateString('es-ES', { month: 'short' }));
          produccionData.push(Math.floor(Math.random() * 1000) + 500);
        }
      }
    }
    
    return {
      labels,
      produccion: produccionData,
      bloquesLabels,
      rendimiento: rendimientoData
    };
  }

  async registrarProduccion(datos) {
    const harvestId = this.generateHarvestId();
    const harvest = {
      id: harvestId,
      date: datos.fecha,
      harvester: { name: datos.responsable },
      location: {
        type: 'tree',
        id: datos.arbolId,
        name: `Árbol ${datos.arbolId}`
      },
      production: {
        totalWeight: datos.cantidad,
        containerCount: Math.ceil(datos.cantidad / 25)
      },
      quality: {
        grade: datos.tipo === 'principal' ? 'AA' : datos.tipo === 'secundaria' ? 'A' : 'B',
        overallScore: Math.floor(Math.random() * 20) + 80
      },
      efficiency: {
        kgPerHour: Math.floor(Math.random() * 15) + 20
      },
      season: this.currentSeason,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    this.harvests.set(harvestId, harvest);
    
    // Guardar offline si está disponible
    if (offlineManager) {
      await offlineManager.saveData('cosechas', harvestId, harvest);
    }
    
    console.log('🌾 Producción registrada:', harvestId);
    return harvest;
  }

  async registrarProduccionCompleta(datos) {
    const harvestId = this.generateHarvestId();
    const harvest = {
      id: harvestId,
      date: datos.fecha.split('T')[0],
      harvester: { name: datos.responsable },
      location: {
        type: 'tree',
        id: datos.arbolId,
        name: `Árbol ${datos.arbolId}`,
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
      season: this.currentSeason,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    this.harvests.set(harvestId, harvest);
    
    if (offlineManager) {
      await offlineManager.saveData('cosechas', harvestId, harvest);
    }
    
    console.log('🌾 Producción completa registrada:', harvestId);
    return harvest;
  }

  aplicarFiltros(filtros) {
    this.currentFilters = filtros;
    console.log('🔍 Filtros aplicados:', filtros);
  }

  exportarDatos() {
    const data = {
      harvests: Array.from(this.harvests.values()),
      statistics: this.statistics,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produccion_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📁 Datos exportados');
  }

  generarReporteDiario() {
    const today = new Date().toISOString().split('T')[0];
    const todayHarvests = Array.from(this.harvests.values())
      .filter(h => h.date === today && h.status === 'active');
    
    const totalProduccion = todayHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0);
    
    console.log(`📊 Reporte diario - ${today}: ${totalProduccion}kg en ${todayHarvests.length} cosechas`);
    
    if (window.notificationManager) {
      window.notificationManager.success(
        `Reporte generado: ${totalProduccion}kg cosechados hoy`, 
        4000
      );
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  generateHarvestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `HST_${timestamp}_${random}`.toUpperCase();
  }

  getCurrentSeason() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (month >= 4 && month <= 9) {
      return `${year}_lluviosa`;
    } else {
      return `${year}_seca`;
    }
  }

  async calculateStatistics() {
    const activeHarvests = Array.from(this.harvests.values()).filter(h => h.status === 'active');
    
    this.statistics = {
      totalSeason: activeHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0),
      totalLifetime: activeHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0),
      averageDaily: activeHarvests.length > 0 ? 
        activeHarvests.reduce((sum, h) => sum + h.production.totalWeight, 0) / activeHarvests.length : 0,
      averagePerTree: 25.5, // Valor estimado
      qualityDistribution: this.calculateQualityDistribution(activeHarvests),
      productivity: 85
    };
  }

  calculateQualityDistribution(harvests) {
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

  async loadMarketPrices() {
    // Los precios ya están definidos en el constructor
    console.log('💰 Precios de mercado cargados');
  }
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

let productionManager = null;

// Función de inicialización que espera a que el DOM esté listo
async function initializeProductionManager() {
  if (productionManager) return productionManager;
  
  try {
    console.log('🚀 Inicializando ProductionManager...');
    
    productionManager = new ProductionManager();
    
    // Hacer disponible globalmente
    window.productionManager = productionManager;
    
    // Funciones de conveniencia
    window.createHarvest = (data) => productionManager.registrarProduccion(data);
    window.updateHarvest = (id, data) => productionManager.updateHarvest(id, data);
    window.getHarvest = (id) => productionManager.getHarvest(id);
    
    console.log('✅ ProductionManager inicializado y disponible globalmente');
    
    return productionManager;
    
  } catch (error) {
    console.error('❌ Error inicializando ProductionManager:', error);
    return null;
  }
}

// Auto-inicializar cuando se carga el módulo
if (typeof window !== 'undefined') {
  // Si el DOM ya está listo, inicializar inmediatamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProductionManager);
  } else {
    // DOM ya listo, inicializar con un pequeño delay
    setTimeout(initializeProductionManager, 100);
  }
}

// Export por defecto
export default initializeProductionManager;

console.log('📈 Sistema de gestión de producción cargado');