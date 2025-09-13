/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRECIOS
   Sistema de monitoreo y análisis de precios INTEGRADO
   ======================================== */

// Import de offline.js
import offlineManager from './offline.js';

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let systemInitialized = false;
let offlineAvailable = false;
let syncManagerReady = false;

// Datos en memoria
let precios = [];
let mercados = new Map();
let alertasPrecios = [];
let predicciones = [];

// NUEVO: Datos de integración
let datosIntegracion = {
  costosActuales: {},
  margenesCalculados: {},
  alertasRentabilidad: [],
  ultimaSincronizacion: null,
  gastosIntegrados: false
};

// Configuración base
const preciosConfig = {
  fincaId: 'finca_la_herradura',
  currency: 'GTQ',
  baseCurrency: 'USD',
  currentDate: new Date().toISOString().split('T')[0]
};

// Configuración de mercados MEJORADA
const mercadosConfig = {
  'mayorista': {
    name: 'Mercado Mayorista',
    type: 'mayorista',
    weight: 0.4,
    location: 'Guatemala City',
    active: true,
    color: '#ef4444',
    // NUEVO: Configuración de margen
    margenMinimo: 15, // % mínimo recomendado
    margenOptimo: 25  // % óptimo recomendado
  },
  'minorista': {
    name: 'Mercado Minorista',
    type: 'minorista',
    weight: 0.3,
    location: 'Guatemala City',
    active: true,
    color: '#3b82f6',
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
    margenMinimo: 10,
    margenOptimo: 20
  }
};

// Tipos de cambio
let exchangeRates = new Map([
  ['USD', 7.85],
  ['EUR', 8.50],
  ['MXN', 0.45]
]);

// ==========================================
// FUNCIONES DE INICIALIZACIÓN MEJORADAS
// ==========================================

function initializePreciosSystem() {
  try {
    console.log('💲 Inicializando sistema de gestión de precios integrado...');
    
    // Esperar a que DataSyncManager esté disponible
    waitForSyncManager().then(async () => {
      // Cargar datos de ejemplo
      loadSampleData();
      
      // Inicializar mercados
      initializeMercados();
      
      // NUEVO: Integrar con sistema de gastos
      await integrateWithExpenseSystem();
      
      // Sistema inicializado
      systemInitialized = true;
      console.log('✅ Sistema de precios integrado inicializado correctamente');
      
      // Notificar inicialización
      dispatchSystemEvent('preciosManagerReady', {
        preciosCount: precios.length,
        mercadosCount: mercados.size,
        mode: 'demo',
        integrated: syncManagerReady
      });
    });
    
  } catch (error) {
    console.error('❌ Error en inicialización de precios:', error);
  }
}

async function waitForSyncManager() {
  return new Promise((resolve) => {
    const maxWait = 15000;
    const checkInterval = 200;
    let elapsed = 0;

    const check = () => {
      if (window.dataSyncManager && window.rentabilidadManager) {
        console.log('✅ DataSyncManager disponible para PreciosManager');
        syncManagerReady = true;
        resolve();
      } else if (elapsed < maxWait) {
        elapsed += checkInterval;
        setTimeout(check, checkInterval);
      } else {
        console.warn('⚠️ Timeout esperando DataSyncManager, continuando sin integración');
        syncManagerReady = false;
        resolve();
      }
    };

    check();
  });
}

async function integrateWithExpenseSystem() {
  if (!syncManagerReady) return;
  
  try {
    console.log('🔄 Integrando con sistema de gastos...');
    
    // Configurar eventos de integración
    setupIntegrationEvents();
    
    // Sincronizar datos iniciales
    await syncWithExpenseSystem();
    
    // Calcular márgenes con datos reales
    await calculateRealMargins();
    
    console.log('✅ Integración con sistema de gastos completa');
    
  } catch (error) {
    console.error('❌ Error en integración:', error);
  }
}

function setupIntegrationEvents() {
  // Escuchar cambios en gastos para recalcular márgenes
  window.addEventListener('expenseCreated', async (event) => {
    await syncWithExpenseSystem();
    await calculateRealMargins();
    await generateAlertasIntegradas();
  });
  
  window.addEventListener('statisticsUpdated', async (event) => {
    await syncWithExpenseSystem();
    await calculateRealMargins();
  });
  
  // Escuchar solicitudes de validación de precios desde otros módulos
  window.addEventListener('precioValidacionSolicitada', async (event) => {
    const { precio, cantidad, mercado } = event.detail;
    const validacion = await validarPrecioIntegrado(precio, cantidad, mercado);
    
    window.dispatchEvent(new CustomEvent('precioValidacionCompleta', {
      detail: validacion
    }));
  });
}

async function syncWithExpenseSystem() {
  try {
    if (!window.expenseManager) return;
    
    const resumenFinanciero = window.expenseManager.getFinancialSummary('month');
    
    if (resumenFinanciero && resumenFinanciero.integration) {
      datosIntegracion = {
        ...datosIntegracion,
        costosActuales: {
          costoPorKg: resumenFinanciero.integration.costPerKg || 0,
          totalGastos: resumenFinanciero.total || 0,
          costoPorCategoria: resumenFinanciero.costoPorCategoria || {}
        },
        gastosIntegrados: true,
        ultimaSincronizacion: new Date().toISOString()
      };
    }
    
    console.log('💰 Datos sincronizados con sistema de gastos');
    
  } catch (error) {
    console.error('❌ Error sincronizando con gastos:', error);
  }
}

async function calculateRealMargins() {
  try {
    if (!datosIntegracion.gastosIntegrados) return;
    
    const costoPorKg = datosIntegracion.costosActuales.costoPorKg || 0;
    const resumenPrecios = obtenerResumenPrecios();
    
    // Calcular márgenes reales para cada mercado
    datosIntegracion.margenesCalculados = {};
    
    Object.entries(resumenPrecios.mercados).forEach(([mercado, precio]) => {
      const margen = costoPorKg > 0 ? ((precio - costoPorKg) / precio) * 100 : 0;
      const gananciaKg = precio - costoPorKg;
      const mercadoConfig = mercadosConfig[mercado];
      
      datosIntegracion.margenesCalculados[mercado] = {
        precio: precio,
        costo: costoPorKg,
        margen: margen,
        gananciaKg: gananciaKg,
        rentable: margen > 0,
        cumpleMinimo: margen >= (mercadoConfig?.margenMinimo || 10),
        esOptimo: margen >= (mercadoConfig?.margenOptimo || 20),
        recomendacion: getMarginRecommendation(margen, mercadoConfig)
      };
    });
    
    console.log('📈 Márgenes reales calculados:', datosIntegracion.margenesCalculados);
    
  } catch (error) {
    console.error('❌ Error calculando márgenes reales:', error);
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
// FUNCIONES PRINCIPALES MEJORADAS
// ==========================================

function obtenerResumenPrecios() {
  const preciosRecientes = precios.filter(p => p.fecha === preciosConfig.currentDate);
  const preciosAnteriores = precios.filter(p => p.fecha !== preciosConfig.currentDate);
  
  const actual = preciosRecientes.length > 0 
    ? preciosRecientes.reduce((sum, p) => sum + p.valor, 0) / preciosRecientes.length 
    : 12.50;
  
  const anterior = preciosAnteriores.length > 0 
    ? preciosAnteriores.reduce((sum, p) => sum + p.valor, 0) / preciosAnteriores.length 
    : 11.75;
  
  const cambio = actual - anterior;
  const porcentaje = anterior > 0 ? (cambio / anterior) * 100 : 0;
  
  const resumenBase = {
    actual: actual,
    cambio: cambio,
    porcentaje: porcentaje,
    hoy: actual,
    promedioSemanal: 11.80,
    promedioMensual: 11.25,
    maximo: 15.00,
    minimo: 9.50,
    mercados: {
      mayorista: 11.80,
      minorista: 15.00,
      exportacion: 18.50,
      finca: 12.75
    }
  };
  
  // NUEVO: Agregar información de integración
  if (syncManagerReady && datosIntegracion.gastosIntegrados) {
    resumenBase.integracion = {
      costoPorKg: datosIntegracion.costosActuales.costoPorKg,
      margenesCalculados: datosIntegracion.margenesCalculados,
      alertasRentabilidad: datosIntegracion.alertasRentabilidad,
      sincronizado: true
    };
  }
  
  return resumenBase;
}

async function registrarPrecio(datos) {
  try {
    const nuevoPrecio = {
      id: generatePrecioId(),
      fecha: datos.fecha,
      mercado: datos.mercado,
      valor: datos.valor,
      fuente: datos.fuente || 'Manual',
      observaciones: datos.observaciones || '',
      cambio: calcularCambioPrecio(datos.valor, datos.mercado),
      tendencia: determinarTendencia(datos.valor, datos.mercado),
      createdAt: new Date().toISOString(),
      // NUEVO: Datos de integración
      costoPorKg: datosIntegracion.costosActuales.costoPorKg || 0,
      margenCalculado: 0,
      rentabilidadValidada: false
    };
    
    // NUEVO: Calcular margen si hay datos de gastos
    if (datosIntegracion.gastosIntegrados) {
      const costoPorKg = datosIntegracion.costosActuales.costoPorKg;
      nuevoPrecio.margenCalculado = costoPorKg > 0 ? ((datos.valor - costoPorKg) / datos.valor) * 100 : 0;
      nuevoPrecio.rentabilidadValidada = true;
    }
    
    precios.unshift(nuevoPrecio);
    
    // Actualizar mercado
    const mercado = mercados.get(datos.mercado);
    if (mercado) {
      mercado.ultimoPrecio = datos.valor;
      mercado.ultimaActualizacion = datos.fecha;
      mercado.historial.push({
        fecha: datos.fecha,
        precio: datos.valor,
        margen: nuevoPrecio.margenCalculado
      });
    }
    
    // Guardar offline si está disponible
    if (offlineAvailable) {
      const offlineMgr = window.offlineManager || offlineManager;
      if (offlineMgr) {
        await offlineMgr.saveData('precios_historicos', nuevoPrecio.id, nuevoPrecio);
      }
    }
    
    // NUEVO: Recalcular márgenes y generar alertas
    await calculateRealMargins();
    await generateAlertasIntegradas();
    
    // NUEVO: Notificar al sistema de sincronización
    if (syncManagerReady && window.rentabilidadManager) {
      window.rentabilidadManager.onPriceChange?.(nuevoPrecio);
    }
    
    console.log('✅ Precio registrado e integrado correctamente');
    dispatchSystemEvent('precioCreated', { precio: nuevoPrecio });
    
    return nuevoPrecio;
    
  } catch (error) {
    console.error('❌ Error registrando precio:', error);
    throw error;
  }
}

// ==========================================
// NUEVAS FUNCIONES DE VALIDACIÓN INTEGRADA
// ==========================================

async function validarPrecioIntegrado(precio, cantidad, mercado) {
  try {
    const validacion = {
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
    
    const costoPorKg = datosIntegracion.costosActuales.costoPorKg;
    const ingresoTotal = precio * cantidad;
    const costoTotal = costoPorKg * cantidad;
    const ganancia = ingresoTotal - costoTotal;
    const margen = ingresoTotal > 0 ? (ganancia / ingresoTotal) * 100 : 0;
    
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
        mensaje: `Precio por debajo del costo. Pérdida: Q${Math.abs(ganancia).toFixed(2)}`
      });
    }
    
    // Validaciones de mercado
    const mercadoConfig = mercadosConfig[mercado];
    if (mercadoConfig) {
      if (margen < mercadoConfig.margenMinimo) {
        validacion.alertas.push({
          tipo: 'advertencia',
          mensaje: `Margen por debajo del mínimo recomendado (${mercadoConfig.margenMinimo}%)`
        });
        
        const precioRecomendado = costoPorKg / (1 - mercadoConfig.margenMinimo / 100);
        validacion.recomendaciones.push({
          tipo: 'precio_minimo',
          mensaje: `Precio mínimo recomendado: Q${precioRecomendado.toFixed(2)}/kg`,
          valor: precioRecomendado
        });
      }
      
      if (margen >= mercadoConfig.margenOptimo) {
        validacion.alertas.push({
          tipo: 'excelente',
          mensaje: `Margen óptimo para mercado ${mercadoConfig.name}`
        });
      }
    }
    
    // Comparación con precios de mercado
    const resumenPrecios = obtenerResumenPrecios();
    const precioMercado = resumenPrecios.mercados[mercado];
    
    if (precioMercado && precio < precioMercado * 0.9) {
      validacion.alertas.push({
        tipo: 'oportunidad',
        mensaje: `Precio 10% por debajo del mercado. Considerar ajuste a Q${precioMercado.toFixed(2)}`
      });
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
// ALERTAS Y ANÁLISIS AVANZADO
// ==========================================

async function generateAlertasIntegradas() {
  try {
    const alertasIntegradas = [];
    
    if (!datosIntegracion.gastosIntegrados) {
      alertasIntegradas.push({
        id: 'NO_INTEGRATION',
        tipo: 'info',
        titulo: 'Sistema No Integrado',
        mensaje: 'Conectar con sistema de gastos para análisis completo',
        icono: 'fa-link',
        accion: 'Integrar'
      });
    } else {
      // Alertas basadas en márgenes reales
      Object.entries(datosIntegracion.margenesCalculados).forEach(([mercado, datos]) => {
        if (datos.margen < 0) {
          alertasIntegradas.push({
            id: `MARGIN_NEGATIVE_${mercado}`,
            tipo: 'critica',
            titulo: `Pérdida en ${mercado}`,
            mensaje: `Precio actual genera pérdida de Q${Math.abs(datos.gananciaKg).toFixed(2)}/kg`,
            icono: 'fa-exclamation-circle',
            accion: 'Ajustar Precio'
          });
        } else if (datos.margen < 10) {
          alertasIntegradas.push({
            id: `MARGIN_LOW_${mercado}`,
            tipo: 'advertencia',
            titulo: `Margen Bajo en ${mercado}`,
            mensaje: `Margen actual: ${datos.margen.toFixed(1)}%. ${datos.recomendacion}`,
            icono: 'fa-exclamation-triangle',
            accion: 'Revisar Estrategia'
          });
        } else if (datos.margen > 30) {
          alertasIntegradas.push({
            id: `MARGIN_EXCELLENT_${mercado}`,
            tipo: 'excelente',
            titulo: `Margen Excelente en ${mercado}`,
            mensaje: `Margen actual: ${datos.margen.toFixed(1)}%. ¡Excelente rentabilidad!`,
            icono: 'fa-star',
            accion: 'Mantener'
          });
        }
      });
      
      // Alerta de costo por kg alto
      const costoPorKg = datosIntegracion.costosActuales.costoPorKg;
      if (costoPorKg > 10) {
        alertasIntegradas.push({
          id: 'HIGH_COST_PER_KG',
          tipo: 'advertencia',
          titulo: 'Costo Por Kg Elevado',
          mensaje: `Costo actual: Q${costoPorKg.toFixed(2)}/kg. Revisar eficiencia operativa`,
          icono: 'fa-chart-line',
          accion: 'Optimizar Costos'
        });
      }
    }
    
    datosIntegracion.alertasRentabilidad = alertasIntegradas;
    alertasPrecios = [...alertasEjemplo, ...alertasIntegradas];
    
    console.log(`🚨 ${alertasIntegradas.length} alertas integradas generadas`);
    
  } catch (error) {
    console.error('❌ Error generando alertas integradas:', error);
  }
}

async function generarPrediccionesConDatos() {
  try {
    const prediccionesAvanzadas = [...prediccionesEjemplo];
    
    if (datosIntegracion.gastosIntegrados) {
      const costoPorKg = datosIntegracion.costosActuales.costoPorKg;
      
      // Predicción basada en costos
      prediccionesAvanzadas.push({
        id: 'PRED_COST_BASED',
        periodo: 'Precio Mínimo Rentable',
        fecha: 'Basado en costos actuales',
        precio: costoPorKg * 1.2, // 20% de margen mínimo
        confianza: 95,
        color: '#dc2626',
        tipo: 'costo_minimo'
      });
      
      // Predicción de precio óptimo
      prediccionesAvanzadas.push({
        id: 'PRED_OPTIMAL',
        periodo: 'Precio Óptimo',
        fecha: 'Basado en análisis integrado',
        precio: costoPorKg * 1.35, // 35% de margen óptimo
        confianza: 88,
        color: '#059669',
        tipo: 'optimo'
      });
    }
    
    return prediccionesAvanzadas;
    
  } catch (error) {
    console.error('❌ Error generando predicciones:', error);
    return prediccionesEjemplo;
  }
}

// ==========================================
// FUNCIONES DE ANÁLISIS MEJORADAS
// ==========================================

async function obtenerAnalisisCompleto() {
  try {
    const resumenPrecios = obtenerResumenPrecios();
    const alertas = await generarAlertas();
    const predicciones = await generarPrediccionesConDatos();
    
    const analisis = {
      fecha: new Date().toISOString(),
      resumenPrecios: resumenPrecios,
      alertas: alertas,
      predicciones: predicciones,
      integracion: datosIntegracion,
      recomendaciones: []
    };
    
    // Generar recomendaciones estratégicas
    if (datosIntegracion.gastosIntegrados) {
      analisis.recomendaciones = generateStrategicRecommendations();
    }
    
    return analisis;
    
  } catch (error) {
    console.error('❌ Error obteniendo análisis completo:', error);
    return null;
  }
}

function generateStrategicRecommendations() {
  const recomendaciones = [];
  
  // Análisis de márgenes por mercado
  Object.entries(datosIntegracion.margenesCalculados).forEach(([mercado, datos]) => {
    if (datos.esOptimo) {
      recomendaciones.push({
        prioridad: 'alta',
        categoria: 'estrategia',
        titulo: `Enfocar ventas en ${mercado}`,
        descripcion: `Margen óptimo de ${datos.margen.toFixed(1)}%. Maximizar ventas en este canal.`
      });
    } else if (!datos.cumpleMinimo) {
      recomendaciones.push({
        prioridad: 'critica',
        categoria: 'precio',
        titulo: `Ajustar precio en ${mercado}`,
        descripcion: `Margen insuficiente. Aumentar precio o reducir costos.`
      });
    }
  });
  
  // Recomendación de optimización de costos
  const costoPorKg = datosIntegracion.costosActuales.costoPorKg;
  if (costoPorKg > 8) {
    recomendaciones.push({
      prioridad: 'media',
      categoria: 'costos',
      titulo: 'Optimizar estructura de costos',
      descripcion: `Costo de Q${costoPorKg.toFixed(2)}/kg es elevado. Revisar eficiencias operativas.`
    });
  }
  
  return recomendaciones;
}

// ==========================================
// MANTENER FUNCIONES EXISTENTES Y MEJORAR
// ==========================================

// ... [mantener todas las funciones existentes como loadSampleData, etc.] ...

function loadSampleData() {
  try {
    // Datos de ejemplo MEJORADOS con integración
    const preciosEjemplo = [
      {
        id: 'PRECIO_001',
        fecha: '2025-01-08',
        mercado: 'mayorista',
        valor: 11.80,
        fuente: 'Mercado La Terminal',
        observaciones: 'Precio estable',
        cambio: 4.4,
        tendencia: 'up',
        // NUEVO: Datos de integración
        costoPorKg: 8.50,
        margenCalculado: 27.97,
        rentabilidadValidada: true
      },
      {
        id: 'PRECIO_002',
        fecha: '2025-01-08',
        mercado: 'minorista',
        valor: 15.00,
        fuente: 'Supermercados',
        observaciones: 'Demanda alta',
        cambio: 1.7,
        tendencia: 'up',
        costoPorKg: 8.50,
        margenCalculado: 43.33,
        rentabilidadValidada: true
      },
      // ... resto de datos de ejemplo con campos de integración
    ];
    
    precios = [...preciosEjemplo];
    alertasPrecios = [...alertasEjemplo];
    predicciones = [...prediccionesEjemplo];
    
    console.log(`📊 Datos integrados cargados: ${precios.length} precios`);
    
  } catch (error) {
    console.error('❌ Error cargando datos de ejemplo:', error);
  }
}

// ... [mantener resto de funciones existentes] ...

// Datos de ejemplo (mantenidos del original)
const preciosEjemplo = [
  {
    id: 'PRECIO_001',
    fecha: '2025-01-08',
    mercado: 'mayorista',
    valor: 11.80,
    fuente: 'Mercado La Terminal',
    observaciones: 'Precio estable',
    cambio: 4.4,
    tendencia: 'up'
  },
  {
    id: 'PRECIO_002',
    fecha: '2025-01-08',
    mercado: 'minorista',
    valor: 15.00,
    fuente: 'Supermercados',
    observaciones: 'Demanda alta',
    cambio: 1.7,
    tendencia: 'up'
  },
  {
    id: 'PRECIO_003',
    fecha: '2025-01-08',
    mercado: 'exportacion',
    valor: 18.50,
    fuente: 'Exportadora Maya',
    observaciones: 'Precio premium',
    cambio: 0,
    tendencia: 'stable'
  },
  {
    id: 'PRECIO_004',
    fecha: '2025-01-08',
    mercado: 'finca',
    valor: 12.75,
    fuente: 'Precio Interno',
    observaciones: 'Ajustado a mercado',
    cambio: 2.0,
    tendencia: 'up'
  },
  {
    id: 'PRECIO_005',
    fecha: '2025-01-07',
    mercado: 'mayorista',
    valor: 11.30,
    fuente: 'Mercado Central',
    observaciones: 'Precio anterior',
    cambio: -2.1,
    tendencia: 'down'
  }
];

const alertasEjemplo = [
  {
    id: 'ALERT_001',
    tipo: 'oportunidad',
    titulo: 'Oportunidad de Venta',
    mensaje: 'Los precios han subido 6.4% esta semana. Buen momento para vender.',
    icono: 'fa-arrow-up',
    accion: 'Ver Análisis'
  },
  {
    id: 'ALERT_002',
    tipo: 'advertencia',
    titulo: 'Volatilidad Alta',
    mensaje: 'El mercado mayorista muestra alta volatilidad. Monitorear de cerca.',
    icono: 'fa-exclamation-triangle',
    accion: 'Ver Detalles'
  },
  {
    id: 'ALERT_003',
    tipo: 'critica',
    titulo: 'Precio Bajo Competencia',
    mensaje: 'Nuestro precio está 8% por debajo de la competencia en exportación.',
    icono: 'fa-exclamation-circle',
    accion: 'Ajustar Precio'
  }
];

const prediccionesEjemplo = [
  {
    id: 'PRED_001',
    periodo: 'Próxima Semana',
    fecha: '15 - 22 Enero',
    precio: 13.25,
    confianza: 85,
    color: '#22c55e'
  },
  {
    id: 'PRED_002',
    periodo: 'Próximo Mes',
    fecha: 'Febrero 2025',
    precio: 14.50,
    confianza: 72,
    color: '#f59e0b'
  },
  {
    id: 'PRED_003',
    periodo: 'Trimestre',
    fecha: 'Q1 2025',
    precio: 13.80,
    confianza: 68,
    color: '#3b82f6'
  }
];

// ==========================================
// FUNCIONES EXISTENTES MANTENIDAS
// ==========================================

function initializeMercados() {
  try {
    mercados.clear();
    
    Object.entries(mercadosConfig).forEach(([id, config]) => {
      mercados.set(id, {
        id: id,
        ...config,
        ultimoPrecio: 0,
        ultimaActualizacion: null,
        historial: []
      });
    });
    
    console.log(`📈 ${mercados.size} mercados inicializados`);
    
  } catch (error) {
    console.error('❌ Error inicializando mercados:', error);
  }
}

// ... [resto de funciones existentes] ...

function calcularCambioPrecio(valor, mercado) {
  const preciosAnteriores = precios.filter(p => p.mercado === mercado);
  if (preciosAnteriores.length === 0) return 0;
  
  const ultimoPrecio = preciosAnteriores[0].valor;
  return ultimoPrecio > 0 ? ((valor - ultimoPrecio) / ultimoPrecio) * 100 : 0;
}

function determinarTendencia(valor, mercado) {
  const cambio = calcularCambioPrecio(valor, mercado);
  
  if (cambio > 2) return 'up';
  if (cambio < -2) return 'down';
  return 'stable';
}

// ==========================================
// EXPORTACIÓN MEJORADA
// ==========================================

// Manager global de precios MEJORADO
window.preciosManager = {
  // Estado
  getStatus: () => ({
    initialized: systemInitialized,
    offlineAvailable: offlineAvailable,
    preciosCount: precios.length,
    mercadosCount: mercados.size,
    integrated: syncManagerReady,
    integrationData: datosIntegracion
  }),
  
  // Datos principales MEJORADOS
  obtenerResumenPrecios: obtenerResumenPrecios,
  obtenerHistorialFiltrado: obtenerHistorialFiltrado,
  obtenerDatosGraficos: obtenerDatosGraficos,
  
  // NUEVA: Análisis completo integrado
  obtenerAnalisisCompleto: obtenerAnalisisCompleto,
  
  // Gestión de precios MEJORADA
  registrarPrecio: registrarPrecio,
  actualizarPreciosMercado: actualizarPreciosMercado,
  aplicarFiltros: aplicarFiltros,
  
  // NUEVAS: Funciones de validación integrada
  validarPrecioIntegrado: validarPrecioIntegrado,
  syncWithExpenseSystem: syncWithExpenseSystem,
  calculateRealMargins: calculateRealMargins,
  
  // Análisis y alertas MEJORADAS
  generarAlertas: () => alertasPrecios,
  generarPrediccionesIA: generarPrediccionesConDatos,
  generateAlertasIntegradas: generateAlertasIntegradas,
  
  // Funciones avanzadas
  mostrarPrediccionDetallada: mostrarPrediccionDetallada,
  optimizarMomentoVenta: optimizarMomentoVenta,
  exportarAnalisis: exportarAnalisis,
  
  // Datos directos
  precios: precios,
  mercados: mercados,
  alertas: alertasPrecios,
  predicciones: predicciones,
  datosIntegracion: datosIntegracion
};

// Funciones globales de conveniencia
window.validarPrecioIntegrado = validarPrecioIntegrado;
window.obtenerAnalisisCompleto = obtenerAnalisisCompleto;

// ... [resto de funciones de utilidad existentes] ...

function generatePrecioId() {
  return 'PRECIO_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function dispatchSystemEvent(eventType, data) {
  window.dispatchEvent(new CustomEvent(eventType, {
    detail: {
      ...data,
      timestamp: Date.now(),
      source: 'preciosManager'
    }
  }));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ'
  }).format(amount);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializePreciosSystem();
});

console.log('💲 Sistema de gestión de precios INTEGRADO cargado');

export default window.preciosManager;