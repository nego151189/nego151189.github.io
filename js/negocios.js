/* ========================================
   FINCA LA HERRADURA - SISTEMA DE NEGOCIOS
   Sistema integrado con gestión unificada de clientes
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let systemInitialized = false;
let offlineAvailable = false;

// Datos en memoria
let negocios = [];
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

// Datos de ejemplo vinculados con ClientesManager
const negociosEjemplo = [
  {
    id: 'NEG_001',
    nombre: 'Suministro Aguacates Premium',
    clienteId: 'CLI_001', // Vinculado con ClientesManager
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
    precioEstimado: 12.50, // Vinculado con precios
    cantidadEstimada: 6800, // kg
    margenEstimado: 35.5,
    fechaCreacion: '2024-01-15'
  },
  {
    id: 'NEG_002',
    nombre: 'Venta Directa Mercado Local',
    clienteId: 'CLI_002', // Vinculado con ClientesManager
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
    precioEstimado: 15.00, // Precio minorista
    cantidadEstimada: 3000,
    margenEstimado: 42.3,
    fechaCreacion: '2024-02-01'
  },
  {
    id: 'NEG_003',
    nombre: 'Contrato Procesadora',
    clienteId: 'CLI_003', // Vinculado con ClientesManager
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
    precioEstimado: 10.80, // Precio procesador
    cantidadEstimada: 11111,
    margenEstimado: 28.7,
    fechaCreacion: '2023-12-15'
  },
  {
    id: 'NEG_004',
    nombre: 'Distribución Regional',
    clienteId: 'CLI_004', // Vinculado con ClientesManager
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

// ==========================================
// CLASE PRINCIPAL DE NEGOCIOS
// ==========================================

class NegociosManager {
  constructor() {
    this.eventListeners = new Map();
    this.filtrosActivos = {};
    this.init();
  }

  async init() {
    try {
      console.log('💼 Inicializando sistema de negocios...');
      
      // Esperar ClientesManager
      await this.waitForClientesManager();
      
      // Cargar datos de ejemplo
      this.loadSampleData();
      
      // Configurar listeners de sincronización
      this.setupSyncListeners();
      
      // Sistema inicializado
      systemInitialized = true;
      console.log('✅ Sistema de negocios inicializado correctamente');
      
      // Notificar inicialización
      this.dispatchSystemEvent('negociosManagerReady', {
        negociosCount: negocios.length,
        mode: 'integrated'
      });
      
    } catch (error) {
      console.error('❌ Error en inicialización de negocios:', error);
    }
  }

  async waitForClientesManager() {
    return new Promise((resolve) => {
      const maxWait = 15000;
      const checkInterval = 200;
      let elapsed = 0;

      const check = () => {
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
      };

      check();
    });
  }

  setupSyncListeners() {
    // Escuchar cambios de clientes
    window.addEventListener('clienteCreated', (event) => {
      this.onClienteUpdated(event.detail.cliente, 'created');
    });

    window.addEventListener('clienteUpdated', (event) => {
      this.onClienteUpdated(event.detail.cliente, 'updated');
    });

    // Escuchar cambios de precios
    window.addEventListener('precioCreated', (event) => {
      this.onPrecioUpdated(event.detail.precio);
    });

    // Escuchar cambios de ventas
    window.addEventListener('ventaCreated', (event) => {
      this.onVentaCreated(event.detail.venta);
    });
  }

  loadSampleData() {
    try {
      negocios = [...negociosEjemplo];
      actividades = [...actividadesEjemplo];
      
      // Sincronizar datos de clientes si está disponible
      if (window.clientesManager) {
        this.sincronizarDatosClientes();
      }
      
      console.log(`📊 Datos cargados: ${negocios.length} negocios`);
      
    } catch (error) {
      console.error('❌ Error cargando datos de ejemplo:', error);
    }
  }

  sincronizarDatosClientes() {
    negocios.forEach(negocio => {
      const cliente = window.clientesManager.obtenerCliente(negocio.clienteId);
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

  obtenerMetricas() {
    // Calcular métricas dinámicas
    const negociosActivos = negocios.filter(n => 
      ['prospecto', 'calificado', 'propuesta', 'negociacion'].includes(n.estado)
    ).length;
    
    const negociosCerrados = negocios.filter(n => n.estado === 'cerrado').length;
    const totalNegocios = negocios.length;
    
    return {
      ...metricas,
      negociosActivos,
      tasaConversion: totalNegocios > 0 ? Math.round((negociosCerrados / totalNegocios) * 100) : 0,
      clientesActivos: window.clientesManager ? 
        window.clientesManager.obtenerTodos().length : metricas.clientesActivos
    };
  }

  obtenerNegociosFiltrados(filtros = {}) {
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
    
    return negociosFiltrados.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
  }

  obtenerPipelineVisual() {
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

  obtenerClientesRecientes() {
    if (!window.clientesManager) {
      return [];
    }
    
    return window.clientesManager.obtenerTodos()
      .sort((a, b) => new Date(b.ultimaCompra || 0) - new Date(a.ultimaCompra || 0))
      .slice(0, 5)
      .map(cliente => ({
        id: cliente.id,
        nombre: cliente.nombre,
        empresa: cliente.empresa,
        valorTotal: cliente.totalVentas,
        telefono: cliente.telefono,
        email: cliente.email
      }));
  }

  obtenerActividadesRecientes() {
    return actividades
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 5);
  }

  obtenerListaClientes() {
    if (!window.clientesManager) {
      return [];
    }
    
    return window.clientesManager.obtenerParaSelectores();
  }

  obtenerNegocio(id) {
    return negocios.find(n => n.id === id);
  }

  obtenerContactosCliente(clienteId) {
    if (!window.clientesManager) {
      return [];
    }
    
    const cliente = window.clientesManager.obtenerCliente(clienteId);
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

  async guardarNegocio(datos) {
    return new Promise(async (resolve, reject) => {
      try {
        // Validar cliente
        if (!window.clientesManager || !window.clientesManager.obtenerCliente(datos.clienteId)) {
          throw new Error('Cliente no válido');
        }

        // Validar precio contra mercado si está disponible
        if (window.preciosManager && datos.precioEstimado) {
          const validacionPrecio = await this.validarPrecioConMercado(datos.precioEstimado);
          if (!validacionPrecio.valido) {
            console.warn('⚠️ Precio fuera de rango de mercado:', validacionPrecio.mensaje);
          }
        }

        // Calcular margen estimado
        if (datos.precioEstimado && datos.cantidadEstimada) {
          datos.margenEstimado = await this.calcularMargenEstimado(
            datos.precioEstimado, 
            datos.cantidadEstimada
          );
        }

        if (datos.id) {
          // Actualizar existente
          const index = negocios.findIndex(n => n.id === datos.id);
          if (index !== -1) {
            negocios[index] = { 
              ...negocios[index], 
              ...datos,
              fechaModificacion: new Date().toISOString()
            };
          }
        } else {
          // Crear nuevo
          const nuevoNegocio = {
            id: this.generateId(),
            ...datos,
            fechaCreacion: new Date().toISOString(),
            diasDesdeCreacion: 0,
            progreso: this.calcularProgresoInicial(datos.estado)
          };
          negocios.push(nuevoNegocio);
        }
        
        // Notificar cambio
        this.dispatchSystemEvent('negocioGuardado', { negocio: datos });
        
        console.log('✅ Negocio guardado correctamente');
        resolve();
        
      } catch (error) {
        console.error('❌ Error guardando negocio:', error);
        reject(error);
      }
    });
  }

  async avanzarEtapa(id) {
    return new Promise(async (resolve, reject) => {
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
            
            // Actualizar métricas del cliente
            if (window.clientesManager) {
              await window.clientesManager.actualizarMetricasNegocio(
                negocio.clienteId, 
                negocio.valor, 
                'cerrado'
              );
            }
          }
        }
        
        // Registrar actividad
        this.registrarActividad({
          negocioId: id,
          clienteId: negocio.clienteId,
          tipo: 'avance_etapa',
          descripcion: `Negocio avanzado a etapa: ${negocio.estado}`,
          resultado: 'Etapa actualizada automáticamente'
        });
        
        console.log(`✅ Etapa avanzada: ${negocio.nombre} -> ${negocio.estado}`);
        resolve();
        
      } catch (error) {
        console.error('❌ Error avanzando etapa:', error);
        reject(error);
      }
    });
  }

  aplicarFiltros(filtros) {
    console.log('🔍 Aplicando filtros:', filtros);
    this.filtrosActivos = { ...this.filtrosActivos, ...filtros };
  }

  // ==========================================
  // ANÁLISIS Y VALIDACIONES
  // ==========================================

  async validarPrecioConMercado(precioEstimado) {
    if (!window.preciosManager) {
      return { valido: true, mensaje: 'Sistema de precios no disponible' };
    }

    try {
      const resumenPrecios = window.preciosManager.obtenerResumenPrecios();
      const precioMercado = resumenPrecios.actual;
      
      const diferencia = Math.abs(precioEstimado - precioMercado) / precioMercado * 100;
      
      if (diferencia > 20) {
        return {
          valido: false,
          mensaje: `Precio estimado (Q${precioEstimado}) difiere ${diferencia.toFixed(1)}% del mercado (Q${precioMercado})`
        };
      }
      
      return { valido: true, mensaje: 'Precio dentro del rango de mercado' };
      
    } catch (error) {
      console.error('❌ Error validando precio:', error);
      return { valido: true, mensaje: 'No se pudo validar precio' };
    }
  }

  async calcularMargenEstimado(precioVenta, cantidad) {
    let costoPorKg = 8.50; // Costo base por defecto
    
    // Obtener costo real si está disponible el sistema de gastos
    if (window.expenseManager || window.gastosManager) {
      try {
        const gestor = window.expenseManager || window.gastosManager;
        const resumenFinanciero = gestor.getFinancialSummary('month');
        const produccionEstimada = 1000; // kg por mes
        costoPorKg = resumenFinanciero.total / produccionEstimada;
      } catch (error) {
        console.warn('⚠️ No se pudo calcular costo real:', error);
      }
    }
    
    const costoTotal = cantidad * costoPorKg;
    const ingresoTotal = cantidad * precioVenta;
    const margen = ((ingresoTotal - costoTotal) / ingresoTotal) * 100;
    
    return Math.round(margen * 10) / 10; // Redondear a 1 decimal
  }

  calcularProgresoInicial(estado) {
    const progresos = {
      'prospecto': 10,
      'calificado': 25,
      'propuesta': 50,
      'negociacion': 75,
      'cerrado': 100
    };
    return progresos[estado] || 10;
  }

  registrarActividad(datos) {
    const actividad = {
      id: this.generateId(),
      ...datos,
      fecha: new Date(),
      tiempoRelativo: 'hace unos momentos'
    };
    
    actividades.unshift(actividad);
    
    // Mantener solo las últimas 100 actividades
    if (actividades.length > 100) {
      actividades = actividades.slice(0, 100);
    }
  }

  // ==========================================
  // ANÁLISIS Y REPORTES
  // ==========================================

  obtenerDatosVentasMes() {
    const ventasPorMes = negocios
      .filter(n => n.estado === 'cerrado')
      .reduce((acc, negocio) => {
        const fecha = new Date(negocio.fechaCreacion);
        const mes = fecha.getMonth();
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

  obtenerDistribucionEstados() {
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
  // EVENTOS DE SINCRONIZACIÓN
  // ==========================================

  onClienteUpdated(cliente, accion) {
    console.log(`🔄 Cliente ${accion}:`, cliente.nombre);
    
    // Actualizar negocios relacionados
    negocios.forEach(negocio => {
      if (negocio.clienteId === cliente.id) {
        negocio.cliente = cliente.nombre;
        negocio.empresa = cliente.empresa;
        negocio.contacto = cliente.telefono;
      }
    });
  }

  onPrecioUpdated(precio) {
    console.log('💰 Precio actualizado:', precio);
    
    // Recalcular márgenes de negocios activos
    const negociosActivos = negocios.filter(n => 
      ['prospecto', 'calificado', 'propuesta', 'negociacion'].includes(n.estado)
    );
    
    negociosActivos.forEach(async (negocio) => {
      if (negocio.precioEstimado && negocio.cantidadEstimada) {
        negocio.margenEstimado = await this.calcularMargenEstimado(
          negocio.precioEstimado,
          negocio.cantidadEstimada
        );
      }
    });
  }

  onVentaCreated(venta) {
    console.log('💵 Venta creada:', venta);
    
    // Buscar negocio relacionado y actualizarlo
    const negocioRelacionado = negocios.find(n => 
      n.clienteId === venta.clienteId && n.estado !== 'cerrado'
    );
    
    if (negocioRelacionado) {
      negocioRelacionado.estado = 'cerrado';
      negocioRelacionado.progreso = 100;
      negocioRelacionado.probabilidad = 100;
      
      this.registrarActividad({
        negocioId: negocioRelacionado.id,
        clienteId: venta.clienteId,
        tipo: 'venta_realizada',
        descripcion: `Venta realizada: ${venta.cantidad} kg por Q${venta.total}`,
        resultado: 'Negocio cerrado exitosamente'
      });
    }
  }

  // Función para sincronizar cliente (llamada desde ClientesManager)
  async sincronizarCliente(cliente, accion) {
    this.onClienteUpdated(cliente, accion);
  }

  // ==========================================
  // FUNCIONES DE INTERFAZ
  // ==========================================

  mostrarModalActividad(id) {
    console.log(`🔍 Mostrar modal de actividad para negocio ${id}`);
    if (window.notificationManager) {
      window.notificationManager.info('Función de actividades en desarrollo');
    }
  }

  mostrarDetalle(id) {
    const negocio = this.obtenerNegocio(id);
    if (negocio) {
      console.log(`👁️ Mostrar detalle del negocio: ${negocio.nombre}`);
      if (window.notificationManager) {
        window.notificationManager.info(`Detalle: ${negocio.nombre} - Q${negocio.valor.toLocaleString()}`);
      }
    }
  }

  mostrarDetalleCliente(id) {
    if (!window.clientesManager) return;
    
    const cliente = window.clientesManager.obtenerCliente(id);
    if (cliente) {
      console.log(`👤 Mostrar detalle del cliente: ${cliente.nombre}`);
      if (window.notificationManager) {
        window.notificationManager.info(`Cliente: ${cliente.nombre} - ${cliente.empresa}`);
      }
    }
  }

  mostrarModalCliente() {
    console.log('👥 Mostrar modal de nuevo cliente');
    if (window.notificationManager) {
      window.notificationManager.info('Función de nuevo cliente en desarrollo');
    }
  }

  generarReporte() {
    console.log('📊 Generar reporte de negocios');
    if (window.notificationManager) {
      window.notificationManager.info('Generando reporte de negocios...');
    }
  }

  exportarDatos() {
    console.log('💾 Exportar datos de negocios');
    if (window.notificationManager) {
      window.notificationManager.info('Exportando datos de negocios...');
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  generateId() {
    return 'NEG_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  dispatchSystemEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, {
      detail: {
        ...data,
        timestamp: Date.now(),
        source: 'negociosManager'
      }
    }));
  }

  getSystemStatus() {
    return {
      initialized: systemInitialized,
      offlineAvailable: offlineAvailable,
      negociosCount: negocios.length,
      integrations: {
        clientesManager: !!window.clientesManager,
        preciosManager: !!window.preciosManager,
        expenseManager: !!(window.expenseManager || window.gastosManager)
      }
    };
  }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Crear instancia global
let negociosManagerInstance = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  if (!negociosManagerInstance) {
    negociosManagerInstance = new NegociosManager();
    window.negociosManager = negociosManagerInstance;
    
    console.log('💼 NegociosManager disponible globalmente');
  }
});

// Manager global de negocios
window.negociosManager = {
  // Estado
  getStatus: () => negociosManagerInstance?.getSystemStatus(),
  
  // Datos principales
  obtenerMetricas: () => negociosManagerInstance?.obtenerMetricas(),
  obtenerNegociosFiltrados: (filtros) => negociosManagerInstance?.obtenerNegociosFiltrados(filtros),
  obtenerPipelineVisual: () => negociosManagerInstance?.obtenerPipelineVisual(),
  obtenerClientesRecientes: () => negociosManagerInstance?.obtenerClientesRecientes(),
  obtenerActividadesRecientes: () => negociosManagerInstance?.obtenerActividadesRecientes(),
  obtenerListaClientes: () => negociosManagerInstance?.obtenerListaClientes(),
  obtenerNegocio: (id) => negociosManagerInstance?.obtenerNegocio(id),
  obtenerContactosCliente: (clienteId) => negociosManagerInstance?.obtenerContactosCliente(clienteId),
  
  // Gestión de negocios
  guardarNegocio: (datos) => negociosManagerInstance?.guardarNegocio(datos),
  avanzarEtapa: (id) => negociosManagerInstance?.avanzarEtapa(id),
  aplicarFiltros: (filtros) => negociosManagerInstance?.aplicarFiltros(filtros),
  
  // Análisis y reportes
  obtenerDatosVentasMes: () => negociosManagerInstance?.obtenerDatosVentasMes(),
  obtenerDistribucionEstados: () => negociosManagerInstance?.obtenerDistribucionEstados(),
  
  // Interfaz
  mostrarModalActividad: (id) => negociosManagerInstance?.mostrarModalActividad(id),
  mostrarDetalle: (id) => negociosManagerInstance?.mostrarDetalle(id),
  mostrarDetalleCliente: (id) => negociosManagerInstance?.mostrarDetalleCliente(id),
  mostrarModalCliente: () => negociosManagerInstance?.mostrarModalCliente(),
  generarReporte: () => negociosManagerInstance?.generarReporte(),
  exportarDatos: () => negociosManagerInstance?.exportarDatos(),
  
  // Sincronización
  sincronizarCliente: (cliente, accion) => negociosManagerInstance?.sincronizarCliente(cliente, accion),
  
  // Datos directos
  get negocios() { return negocios; },
  get actividades() { return actividades; }
};

console.log('💼 Sistema de negocios integrado cargado correctamente');