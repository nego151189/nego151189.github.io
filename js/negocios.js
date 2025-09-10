/* ========================================
   FINCA LA HERRADURA - SISTEMA DE NEGOCIOS
   Sistema de gestión de negocios con funciones
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let systemInitialized = false;
let offlineAvailable = false;

// Datos en memoria
let negocios = [];
let clientes = [];
let contratos = [];
let actividades = [];
let metricas = {
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

// Datos de ejemplo para demostración
const negociosEjemplo = [
  {
    id: 'NEG_001',
    nombre: 'Suministro Aguacates Premium',
    cliente: 'Exportadora Maya',
    clienteId: 'CLI_001',
    valor: 85000,
    estado: 'negociacion',
    fechaCierre: '2024-03-15',
    probabilidad: 75,
    progreso: 65,
    descripcion: 'Contrato anual para suministro de aguacates premium para exportación',
    contacto: 'María González',
    diasDesdeCreacion: 15,
    productos: 'Aguacates Hass Premium, calibre 16-20',
    notas: 'Cliente interesado en certificación orgánica'
  },
  {
    id: 'NEG_002',
    nombre: 'Venta Directa Mercado Local',
    cliente: 'Supermercados Paiz',
    clienteId: 'CLI_002',
    valor: 45000,
    estado: 'propuesta',
    fechaCierre: '2024-02-28',
    probabilidad: 60,
    progreso: 40,
    descripcion: 'Suministro semanal a cadena de supermercados',
    contacto: 'Carlos Ruiz',
    diasDesdeCreacion: 8,
    productos: 'Aguacates variados, empaque retail',
    notas: 'Requieren entrega puntual los lunes'
  },
  {
    id: 'NEG_003',
    nombre: 'Contrato Procesadora',
    cliente: 'Alimentos La Pradera',
    clienteId: 'CLI_003',
    valor: 120000,
    estado: 'cerrado',
    fechaCierre: '2024-01-30',
    probabilidad: 100,
    progreso: 100,
    descripcion: 'Suministro para producción de guacamole industrial',
    contacto: 'Ana López',
    diasDesdeCreacion: 45,
    productos: 'Aguacates grado industrial, segunda calidad',
    notas: 'Contrato firmado, entregas programadas'
  }
];

const clientesEjemplo = [
  {
    id: 'CLI_001',
    nombre: 'María González',
    empresa: 'Exportadora Maya',
    valorTotal: 150000,
    telefono: '+502 2345-6789',
    email: 'maria@exportadoramaya.com'
  },
  {
    id: 'CLI_002',
    nombre: 'Carlos Ruiz',
    empresa: 'Supermercados Paiz',
    valorTotal: 85000,
    telefono: '+502 3456-7890',
    email: 'carlos@paiz.com.gt'
  },
  {
    id: 'CLI_003',
    nombre: 'Ana López',
    empresa: 'Alimentos La Pradera',
    valorTotal: 200000,
    telefono: '+502 4567-8901',
    email: 'ana@lapradera.com'
  }
];

const actividadesEjemplo = [
  {
    id: 'ACT_001',
    tipo: 'llamada',
    descripcion: 'Llamada de seguimiento con Exportadora Maya',
    tiempoRelativo: 'hace 2 horas',
    fecha: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: 'ACT_002',
    tipo: 'email',
    descripcion: 'Envío de propuesta a Supermercados Paiz',
    tiempoRelativo: 'hace 1 día',
    fecha: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: 'ACT_003',
    tipo: 'reunion',
    descripcion: 'Reunión presencial con Alimentos La Pradera',
    tiempoRelativo: 'hace 3 días',
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'ACT_004',
    tipo: 'propuesta',
    descripcion: 'Presentación de nueva línea de productos',
    tiempoRelativo: 'hace 1 semana',
    fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
];

// ==========================================
// FUNCIONES DE INICIALIZACIÓN
// ==========================================

function initializeNegociosSystem() {
  try {
    console.log('💼 Inicializando sistema de negocios...');
    
    // Cargar datos de ejemplo
    loadSampleData();
    
    // Sistema inicializado
    systemInitialized = true;
    console.log('✅ Sistema de negocios inicializado correctamente');
    
    // Notificar inicialización
    dispatchSystemEvent('negociosManagerReady', {
      negociosCount: negocios.length,
      clientesCount: clientes.length,
      mode: 'demo'
    });
    
  } catch (error) {
    console.error('❌ Error en inicialización de negocios:', error);
  }
}

function loadSampleData() {
  try {
    negocios = [...negociosEjemplo];
    clientes = [...clientesEjemplo];
    actividades = [...actividadesEjemplo];
    
    console.log(`📊 Datos cargados: ${negocios.length} negocios, ${clientes.length} clientes`);
    
  } catch (error) {
    console.error('❌ Error cargando datos de ejemplo:', error);
  }
}

// ==========================================
// FUNCIONES PRINCIPALES DE NEGOCIOS
// ==========================================

function obtenerMetricas() {
  return metricas;
}

function obtenerNegociosFiltrados(filtros = {}) {
  let negociosFiltrados = [...negocios];
  
  if (filtros.estado) {
    negociosFiltrados = negociosFiltrados.filter(n => n.estado === filtros.estado);
  }
  
  if (filtros.cliente) {
    negociosFiltrados = negociosFiltrados.filter(n => n.clienteId === filtros.cliente);
  }
  
  if (filtros.valorMin) {
    negociosFiltrados = negociosFiltrados.filter(n => n.valor >= filtros.valorMin);
  }
  
  return negociosFiltrados;
}

function obtenerPipelineVisual() {
  const pipeline = [
    {
      clase: 'prospectos',
      nombre: 'Prospectos',
      descripcion: 'Clientes potenciales',
      cantidad: negocios.filter(n => n.estado === 'prospecto').length,
      valor: negocios.filter(n => n.estado === 'prospecto').reduce((sum, n) => sum + n.valor, 0),
      color: '#3b82f6',
      icono: 'fa-eye'
    },
    {
      clase: 'calificados',
      nombre: 'Calificados',
      descripcion: 'Oportunidades válidas',
      cantidad: negocios.filter(n => n.estado === 'calificado').length,
      valor: negocios.filter(n => n.estado === 'calificado').reduce((sum, n) => sum + n.valor, 0),
      color: '#8b5cf6',
      icono: 'fa-filter'
    },
    {
      clase: 'propuestas',
      nombre: 'Propuestas',
      descripcion: 'Propuestas enviadas',
      cantidad: negocios.filter(n => n.estado === 'propuesta').length,
      valor: negocios.filter(n => n.estado === 'propuesta').reduce((sum, n) => sum + n.valor, 0),
      color: '#f59e0b',
      icono: 'fa-file-alt'
    },
    {
      clase: 'negociacion',
      nombre: 'Negociación',
      descripcion: 'En negociación',
      cantidad: negocios.filter(n => n.estado === 'negociacion').length,
      valor: negocios.filter(n => n.estado === 'negociacion').reduce((sum, n) => sum + n.valor, 0),
      color: '#ef4444',
      icono: 'fa-handshake'
    },
    {
      clase: 'cerrados',
      nombre: 'Cerrados',
      descripcion: 'Negocios ganados',
      cantidad: negocios.filter(n => n.estado === 'cerrado').length,
      valor: negocios.filter(n => n.estado === 'cerrado').reduce((sum, n) => sum + n.valor, 0),
      color: '#22c55e',
      icono: 'fa-check-circle'
    }
  ];
  
  return pipeline;
}

function obtenerClientesRecientes() {
  return clientes.slice(0, 5);
}

function obtenerActividadesRecientes() {
  return actividades.slice(0, 5);
}

function obtenerListaClientes() {
  return clientes;
}

function obtenerNegocio(id) {
  return negocios.find(n => n.id === id);
}

function obtenerContactosCliente(clienteId) {
  const cliente = clientes.find(c => c.id === clienteId);
  if (!cliente) return [];
  
  return [
    {
      nombre: cliente.nombre,
      cargo: 'Gerente de Compras',
      email: cliente.email,
      telefono: cliente.telefono
    }
  ];
}

// ==========================================
// FUNCIONES DE GESTIÓN DE DATOS
// ==========================================

function guardarNegocio(datos) {
  return new Promise((resolve) => {
    try {
      if (datos.id) {
        // Actualizar existente
        const index = negocios.findIndex(n => n.id === datos.id);
        if (index !== -1) {
          negocios[index] = { ...negocios[index], ...datos };
        }
      } else {
        // Crear nuevo
        const nuevoNegocio = {
          id: generateId(),
          ...datos,
          fechaCreacion: new Date().toISOString(),
          diasDesdeCreacion: 0,
          progreso: 25
        };
        negocios.push(nuevoNegocio);
      }
      
      console.log('✅ Negocio guardado correctamente');
      resolve();
      
    } catch (error) {
      console.error('❌ Error guardando negocio:', error);
      throw error;
    }
  });
}

function avanzarEtapa(id) {
  return new Promise((resolve) => {
    try {
      const negocio = negocios.find(n => n.id === id);
      if (!negocio) {
        throw new Error('Negocio no encontrado');
      }
      
      const estados = ['prospecto', 'calificado', 'propuesta', 'negociacion', 'cerrado'];
      const currentIndex = estados.indexOf(negocio.estado);
      
      if (currentIndex < estados.length - 1) {
        negocio.estado = estados[currentIndex + 1];
        negocio.progreso = Math.min(100, negocio.progreso + 25);
        
        if (negocio.estado === 'cerrado') {
          negocio.probabilidad = 100;
          negocio.progreso = 100;
        }
      }
      
      console.log(`✅ Etapa avanzada: ${negocio.nombre} -> ${negocio.estado}`);
      resolve();
      
    } catch (error) {
      console.error('❌ Error avanzando etapa:', error);
      throw error;
    }
  });
}

function aplicarFiltros(filtros) {
  console.log('🔍 Aplicando filtros:', filtros);
  // Los filtros se aplicarán en obtenerNegociosFiltrados
}

// ==========================================
// FUNCIONES DE ANÁLISIS Y REPORTES
// ==========================================

function obtenerDatosVentasMes() {
  return {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    data: [85000, 92000, 78000, 105000, 98000, 125500]
  };
}

function obtenerDistribucionEstados() {
  const estados = negocios.reduce((acc, negocio) => {
    acc[negocio.estado] = (acc[negocio.estado] || 0) + 1;
    return acc;
  }, {});
  
  return {
    labels: Object.keys(estados).map(estado => 
      estado.charAt(0).toUpperCase() + estado.slice(1)
    ),
    data: Object.values(estados)
  };
}

// ==========================================
// FUNCIONES DE INTERFAZ
// ==========================================

function mostrarModalActividad(id) {
  console.log(`📝 Mostrar modal de actividad para negocio ${id}`);
  if (window.notificationManager) {
    window.notificationManager.info('Función de actividades en desarrollo');
  }
}

function mostrarDetalle(id) {
  const negocio = obtenerNegocio(id);
  if (negocio) {
    console.log(`👁️ Mostrar detalle del negocio: ${negocio.nombre}`);
    if (window.notificationManager) {
      window.notificationManager.info(`Detalle: ${negocio.nombre} - Q${negocio.valor.toLocaleString()}`);
    }
  }
}

function mostrarDetalleCliente(id) {
  const cliente = clientes.find(c => c.id === id);
  if (cliente) {
    console.log(`👤 Mostrar detalle del cliente: ${cliente.nombre}`);
    if (window.notificationManager) {
      window.notificationManager.info(`Cliente: ${cliente.nombre} - ${cliente.empresa}`);
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

function generateId() {
  return 'NEG_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function dispatchSystemEvent(eventType, data) {
  window.dispatchEvent(new CustomEvent(eventType, {
    detail: {
      ...data,
      timestamp: Date.now(),
      source: 'negociosManager'
    }
  }));
}

function getSystemStatus() {
  return {
    initialized: systemInitialized,
    offlineAvailable: offlineAvailable,
    negociosCount: negocios.length,
    clientesCount: clientes.length
  };
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializeNegociosSystem();
});

// Manager global de negocios
window.negociosManager = {
  // Estado
  getStatus: getSystemStatus,
  
  // Datos principales
  obtenerMetricas: obtenerMetricas,
  obtenerNegociosFiltrados: obtenerNegociosFiltrados,
  obtenerPipelineVisual: obtenerPipelineVisual,
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
  
  // Datos directos
  negocios: negocios,
  clientes: clientes,
  actividades: actividades
};

console.log('💼 Sistema de negocios cargado correctamente');