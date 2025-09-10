/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRECIOS
   Sistema de monitoreo y análisis de precios con funciones
   ======================================== */

// Import de offline.js
import offlineManager from './offline.js';

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let systemInitialized = false;
let offlineAvailable = false;

// Datos en memoria
let precios = [];
let mercados = new Map();
let alertasPrecios = [];
let predicciones = [];

// Configuración base
const preciosConfig = {
  fincaId: 'finca_la_herradura',
  currency: 'GTQ',
  baseCurrency: 'USD',
  currentDate: new Date().toISOString().split('T')[0]
};

// Configuración de mercados
const mercadosConfig = {
  'mayorista': {
    name: 'Mercado Mayorista',
    type: 'mayorista',
    weight: 0.4,
    location: 'Guatemala City',
    active: true,
    color: '#ef4444'
  },
  'minorista': {
    name: 'Mercado Minorista',
    type: 'minorista',
    weight: 0.3,
    location: 'Guatemala City',
    active: true,
    color: '#3b82f6'
  },
  'exportacion': {
    name: 'Mercado Exportación',
    type: 'exportacion',
    weight: 0.2,
    location: 'Puerto Quetzal',
    active: true,
    color: '#8b5cf6'
  },
  'finca': {
    name: 'Precio Finca',
    type: 'finca',
    weight: 0.1,
    location: 'Finca La Herradura',
    active: true,
    color: '#22c55e'
  }
};

// Tipos de cambio
let exchangeRates = new Map([
  ['USD', 7.85],
  ['EUR', 8.50],
  ['MXN', 0.45]
]);

// Datos de ejemplo para demostración
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
// FUNCIONES DE INICIALIZACIÓN
// ==========================================

function initializePreciosSystem() {
  try {
    console.log('💲 Inicializando sistema de gestión de precios...');
    
    // Cargar datos de ejemplo
    loadSampleData();
    
    // Inicializar mercados
    initializeMercados();
    
    // Sistema inicializado
    systemInitialized = true;
    console.log('✅ Sistema de precios inicializado correctamente');
    
    // Notificar inicialización
    dispatchSystemEvent('preciosManagerReady', {
      preciosCount: precios.length,
      mercadosCount: mercados.size,
      mode: 'demo'
    });
    
  } catch (error) {
    console.error('❌ Error en inicialización de precios:', error);
  }
}

function loadSampleData() {
  try {
    precios = [...preciosEjemplo];
    alertasPrecios = [...alertasEjemplo];
    predicciones = [...prediccionesEjemplo];
    
    console.log(`📊 Datos cargados: ${precios.length} precios, ${alertasPrecios.length} alertas`);
    
  } catch (error) {
    console.error('❌ Error cargando datos de ejemplo:', error);
  }
}

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

// ==========================================
// FUNCIONES PRINCIPALES DE PRECIOS
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
  
  return {
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
      createdAt: new Date().toISOString()
    };
    
    precios.unshift(nuevoPrecio);
    
    // Actualizar mercado
    const mercado = mercados.get(datos.mercado);
    if (mercado) {
      mercado.ultimoPrecio = datos.valor;
      mercado.ultimaActualizacion = datos.fecha;
      mercado.historial.push({
        fecha: datos.fecha,
        precio: datos.valor
      });
    }
    
    // Guardar offline si está disponible
    if (offlineAvailable) {
      const offlineMgr = window.offlineManager || offlineManager;
      if (offlineMgr) {
        await offlineMgr.saveData('precios_historicos', nuevoPrecio.id, nuevoPrecio);
      }
    }
    
    console.log('✅ Precio registrado correctamente');
    dispatchSystemEvent('precioCreated', { precio: nuevoPrecio });
    
    return nuevoPrecio;
    
  } catch (error) {
    console.error('❌ Error registrando precio:', error);
    throw error;
  }
}

async function actualizarPreciosMercado() {
  try {
    console.log('📊 Actualizando precios de mercado...');
    
    // Simular actualización de precios
    const nuevosPrecios = [
      {
        fecha: preciosConfig.currentDate,
        mercado: 'mayorista',
        valor: 11.80 + (Math.random() - 0.5),
        fuente: 'Actualización Automática'
      },
      {
        fecha: preciosConfig.currentDate,
        mercado: 'minorista',
        valor: 15.00 + (Math.random() - 0.5) * 2,
        fuente: 'Actualización Automática'
      }
    ];
    
    for (const precioData of nuevosPrecios) {
      await registrarPrecio(precioData);
    }
    
    console.log('✅ Precios actualizados correctamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error actualizando precios:', error);
    throw error;
  }
}

function obtenerHistorialFiltrado(filtros = {}) {
  let preciosFiltrados = [...precios];
  
  if (filtros.mercado) {
    preciosFiltrados = preciosFiltrados.filter(p => p.mercado === filtros.mercado);
  }
  
  if (filtros.fechaInicio) {
    preciosFiltrados = preciosFiltrados.filter(p => p.fecha >= filtros.fechaInicio);
  }
  
  if (filtros.fechaFin) {
    preciosFiltrados = preciosFiltrados.filter(p => p.fecha <= filtros.fechaFin);
  }
  
  return preciosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

async function obtenerDatosGraficos(periodo) {
  try {
    const datos = {
      evolucion: {
        labels: [],
        data: []
      },
      mercados: []
    };
    
    // Datos de evolución según período
    switch (periodo) {
      case 'semana':
        datos.evolucion.labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        datos.evolucion.data = [11.20, 11.50, 11.80, 12.10, 12.50, 12.30, 12.75];
        break;
      case 'mes':
        datos.evolucion.labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
        datos.evolucion.data = [10.80, 11.25, 11.80, 12.50];
        break;
      case 'trimestre':
        datos.evolucion.labels = ['Oct', 'Nov', 'Dic', 'Ene'];
        datos.evolucion.data = [9.50, 10.20, 11.80, 12.50];
        break;
      case 'ano':
        datos.evolucion.labels = ['Q1', 'Q2', 'Q3', 'Q4'];
        datos.evolucion.data = [8.50, 9.80, 11.20, 12.50];
        break;
    }
    
    // Datos comparativos de mercados
    datos.mercados = [11.80, 15.00, 18.50, 12.75];
    
    return datos;
    
  } catch (error) {
    console.error('❌ Error obteniendo datos de gráficos:', error);
    return null;
  }
}

async function generarAlertas() {
  try {
    return alertasPrecios;
  } catch (error) {
    console.error('❌ Error generando alertas:', error);
    return [];
  }
}

async function generarPrediccionesIA() {
  try {
    return predicciones;
  } catch (error) {
    console.error('❌ Error generando predicciones:', error);
    return [];
  }
}

function aplicarFiltros(filtros) {
  console.log('🔍 Aplicando filtros:', filtros);
  // Los filtros se aplicarán en obtenerHistorialFiltrado
}

// ==========================================
// FUNCIONES DE ANÁLISIS
// ==========================================

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
// FUNCIONES AVANZADAS
// ==========================================

function mostrarPrediccionDetallada() {
  console.log('🔮 Mostrando predicción detallada...');
  if (window.notificationManager) {
    window.notificationManager.info('Análisis predictivo avanzado en desarrollo');
  }
}

function optimizarMomentoVenta() {
  console.log('🎯 Optimizando momento de venta...');
  if (window.notificationManager) {
    window.notificationManager.info('Optimización de ventas: Precio actual favorable para venta');
  }
}

function exportarAnalisis() {
  try {
    console.log('📊 Exportando análisis de precios...');
    
    const analisis = {
      fecha: new Date().toISOString(),
      resumen: obtenerResumenPrecios(),
      precios: precios,
      alertas: alertasPrecios,
      predicciones: predicciones,
      mercados: Array.from(mercados.values())
    };
    
    const dataStr = JSON.stringify(analisis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis_precios_${preciosConfig.currentDate}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    if (window.notificationManager) {
      window.notificationManager.success('Análisis exportado correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error exportando análisis:', error);
    if (window.notificationManager) {
      window.notificationManager.error('Error exportando análisis');
    }
  }
}

// ==========================================
// UTILIDADES
// ==========================================

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

function getSystemStatus() {
  return {
    initialized: systemInitialized,
    offlineAvailable: offlineAvailable,
    preciosCount: precios.length,
    mercadosCount: mercados.size
  };
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializePreciosSystem();
});

// Manager global de precios
window.preciosManager = {
  // Estado
  getStatus: getSystemStatus,
  
  // Datos principales
  obtenerResumenPrecios: obtenerResumenPrecios,
  obtenerHistorialFiltrado: obtenerHistorialFiltrado,
  obtenerDatosGraficos: obtenerDatosGraficos,
  
  // Gestión de precios
  registrarPrecio: registrarPrecio,
  actualizarPreciosMercado: actualizarPreciosMercado,
  aplicarFiltros: aplicarFiltros,
  
  // Análisis y alertas
  generarAlertas: generarAlertas,
  generarPrediccionesIA: generarPrediccionesIA,
  
  // Funciones avanzadas
  mostrarPrediccionDetallada: mostrarPrediccionDetallada,
  optimizarMomentoVenta: optimizarMomentoVenta,
  exportarAnalisis: exportarAnalisis,
  
  // Datos directos
  precios: precios,
  mercados: mercados,
  alertas: alertasPrecios,
  predicciones: predicciones
};

console.log('💲 Sistema de gestión de precios con funciones cargado');

// Export por defecto para módulos ES6
export default window.preciosManager;