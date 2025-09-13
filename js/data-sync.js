/* ========================================
   FINCA LA HERRADURA - SINCRONIZACIÓN DE DATOS
   Sistema central de integración entre módulos
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let syncInitialized = false;
let moduleStatus = new Map();
let dataValidationErrors = [];
let syncQueue = [];

// Configuración de sincronización
const syncConfig = {
  autoSync: true,
  syncInterval: 30000, // 30 segundos
  maxRetries: 3,
  validateOnSync: true
};

// ==========================================
// GESTOR CENTRAL DE CLIENTES
// ==========================================

class ClientesManager {
  constructor() {
    this.clientes = new Map();
    this.clientesByName = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('👥 Inicializando gestor central de clientes...');
      
      // Cargar clientes desde diferentes módulos
      await this.sincronizarClientesExistentes();
      
      this.initialized = true;
      console.log(`✅ ClientesManager inicializado: ${this.clientes.size} clientes`);
      
    } catch (error) {
      console.error('❌ Error inicializando ClientesManager:', error);
    }
  }

  async sincronizarClientesExistentes() {
    const clientesUnificados = new Map();
    
    // Obtener clientes de ventas si existe el módulo
    if (window.ventasManager) {
      const clientesVentas = window.ventasManager.obtenerClientes?.() || [];
      clientesVentas.forEach(cliente => {
        const clienteNormalizado = this.normalizarCliente(cliente, 'ventas');
        clientesUnificados.set(clienteNormalizado.id, clienteNormalizado);
      });
    }
    
    // Obtener clientes de negocios si existe el módulo
    if (window.negociosManager) {
      const clientesNegocios = window.negociosManager.obtenerClientes?.() || [];
      clientesNegocios.forEach(cliente => {
        const clienteNormalizado = this.normalizarCliente(cliente, 'negocios');
        
        // Buscar si ya existe por nombre
        const existente = this.buscarClientePorNombre(clienteNormalizado.nombre, clientesUnificados);
        if (existente) {
          // Fusionar información
          this.fusionarClientes(existente, clienteNormalizado);
        } else {
          clientesUnificados.set(clienteNormalizado.id, clienteNormalizado);
        }
      });
    }
    
    this.clientes = clientesUnificados;
    this.actualizarIndicePorNombre();
  }

  normalizarCliente(cliente, origen) {
    return {
      id: cliente.id || this.generateClienteId(),
      nombre: cliente.nombre?.trim() || '',
      empresa: cliente.empresa || cliente.nombre || '',
      telefono: cliente.telefono || cliente.contacto || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      origen: origen,
      totalVentas: cliente.totalVentas || 0,
      totalNegocios: cliente.totalNegocios || 0,
      fechaRegistro: cliente.fechaRegistro || new Date().toISOString(),
      activo: cliente.activo !== false
    };
  }

  buscarClientePorNombre(nombre, clientesMap) {
    const nombreNormalizado = nombre.toLowerCase().trim();
    for (const cliente of clientesMap.values()) {
      if (cliente.nombre.toLowerCase().trim() === nombreNormalizado) {
        return cliente;
      }
    }
    return null;
  }

  fusionarClientes(clienteBase, clienteNuevo) {
    // Fusionar información de ambos clientes
    clienteBase.empresa = clienteBase.empresa || clienteNuevo.empresa;
    clienteBase.telefono = clienteBase.telefono || clienteNuevo.telefono;
    clienteBase.email = clienteBase.email || clienteNuevo.email;
    clienteBase.direccion = clienteBase.direccion || clienteNuevo.direccion;
    clienteBase.totalVentas += clienteNuevo.totalVentas || 0;
    clienteBase.totalNegocios += clienteNuevo.totalNegocios || 0;
    
    if (!clienteBase.origen.includes(clienteNuevo.origen)) {
      clienteBase.origen += ',' + clienteNuevo.origen;
    }
  }

  actualizarIndicePorNombre() {
    this.clientesByName.clear();
    this.clientes.forEach(cliente => {
      const nombreKey = cliente.nombre.toLowerCase().trim();
      this.clientesByName.set(nombreKey, cliente.id);
    });
  }

  async crearCliente(datos) {
    try {
      const id = this.generateClienteId();
      const cliente = this.normalizarCliente({
        ...datos,
        id: id
      }, 'manual');
      
      this.clientes.set(id, cliente);
      this.actualizarIndicePorNombre();
      
      // Sincronizar con otros módulos
      await this.propagarClienteAModulos(cliente);
      
      console.log(`✅ Cliente creado: ${cliente.nombre}`);
      dispatchSystemEvent('clienteCreated', { cliente });
      
      return cliente;
      
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      throw error;
    }
  }

  async propagarClienteAModulos(cliente) {
    // Propagar a ventas
    if (window.ventasManager && window.ventasManager.actualizarCliente) {
      await window.ventasManager.actualizarCliente(cliente);
    }
    
    // Propagar a negocios
    if (window.negociosManager && window.negociosManager.actualizarCliente) {
      await window.negociosManager.actualizarCliente(cliente);
    }
  }

  obtenerTodos() {
    return Array.from(this.clientes.values()).filter(c => c.activo);
  }

  buscarPorId(id) {
    return this.clientes.get(id) || null;
  }

  buscarPorNombre(nombre) {
    const nombreKey = nombre.toLowerCase().trim();
    const clienteId = this.clientesByName.get(nombreKey);
    return clienteId ? this.clientes.get(clienteId) : null;
  }

  generateClienteId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `CLI_${timestamp}_${random}`.toUpperCase();
  }
}

// ==========================================
// INTEGRACIÓN PRECIOS-GASTOS
// ==========================================

class RentabilidadManager {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('💰 Inicializando gestor de rentabilidad...');
      this.initialized = true;
      console.log('✅ RentabilidadManager inicializado');
    } catch (error) {
      console.error('❌ Error inicializando RentabilidadManager:', error);
    }
  }

  calcularCostoPorKg() {
    try {
      if (!window.expenseManager) {
        console.warn('⚠️ ExpenseManager no disponible');
        return 0;
      }
      
      // Obtener gastos del mes actual
      const gastosDelMes = window.expenseManager.getFinancialSummary('month');
      const totalGastos = gastosDelMes.total || 0;
      
      // Estimar producción mensual (debería venir de módulo de producción)
      const produccionEstimada = this.obtenerProduccionEstimada();
      
      const costoPorKg = produccionEstimada > 0 ? totalGastos / produccionEstimada : 0;
      
      console.log(`📊 Costo por kg calculado: Q${costoPorKg.toFixed(2)}`);
      return costoPorKg;
      
    } catch (error) {
      console.error('❌ Error calculando costo por kg:', error);
      return 0;
    }
  }

  obtenerProduccionEstimada() {
    // Por ahora usar valor estimado, luego integrar con módulo de producción
    return 1000; // kg por mes
  }

  calcularMargenReal(venta) {
    try {
      const costoPorKg = this.calcularCostoPorKg();
      const costoTotal = venta.cantidad * costoPorKg;
      const ingresoTotal = venta.total || (venta.cantidad * venta.precioKg);
      
      const ganancia = ingresoTotal - costoTotal;
      const margen = ingresoTotal > 0 ? (ganancia / ingresoTotal) * 100 : 0;
      
      return {
        costoTotal: costoTotal,
        ingresoTotal: ingresoTotal,
        ganancia: ganancia,
        margen: margen,
        costoPorKg: costoPorKg,
        rentable: ganancia > 0
      };
      
    } catch (error) {
      console.error('❌ Error calculando margen real:', error);
      return null;
    }
  }

  validarPrecioVenta(precioIngresado, cantidad) {
    try {
      if (!window.preciosManager) {
        return { valido: true, mensaje: 'Sistema de precios no disponible' };
      }
      
      const resumenPrecios = window.preciosManager.obtenerResumenPrecios();
      const precioMercado = resumenPrecios.mercados?.finca || resumenPrecios.actual || 0;
      const costoPorKg = this.calcularCostoPorKg();
      
      // Validaciones
      const validaciones = [];
      
      // Precio muy bajo comparado con mercado
      if (precioIngresado < precioMercado * 0.8) {
        validaciones.push({
          tipo: 'advertencia',
          mensaje: `Precio 20% por debajo del mercado (Q${precioMercado.toFixed(2)})`,
          sugerencia: precioMercado
        });
      }
      
      // Precio por debajo del costo
      if (precioIngresado < costoPorKg * 1.1) {
        validaciones.push({
          tipo: 'critica',
          mensaje: `Precio muy cerca del costo (Q${costoPorKg.toFixed(2)}/kg)`,
          sugerencia: costoPorKg * 1.2
        });
      }
      
      // Precio excelente
      if (precioIngresado > precioMercado * 1.1) {
        validaciones.push({
          tipo: 'excelente',
          mensaje: `Precio por encima del mercado - excelente margen`,
          sugerencia: null
        });
      }
      
      return {
        valido: validaciones.filter(v => v.tipo === 'critica').length === 0,
        validaciones: validaciones,
        precioMercado: precioMercado,
        costoPorKg: costoPorKg
      };
      
    } catch (error) {
      console.error('❌ Error validando precio:', error);
      return { valido: true, mensaje: 'Error en validación' };
    }
  }

  generarReporteRentabilidad() {
    try {
      const costoPorKg = this.calcularCostoPorKg();
      const resumenPrecios = window.preciosManager?.obtenerResumenPrecios() || {};
      const gastosDelMes = window.expenseManager?.getFinancialSummary('month') || {};
      
      return {
        fecha: new Date().toISOString(),
        costoPorKg: costoPorKg,
        preciosActuales: resumenPrecios.mercados || {},
        gastosPorCategoria: gastosDelMes.byCategory || {},
        totalGastos: gastosDelMes.total || 0,
        margenEstimado: this.calcularMargenEstimado(resumenPrecios.actual, costoPorKg)
      };
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      return null;
    }
  }

  calcularMargenEstimado(precioVenta, costoPorKg) {
    if (!precioVenta || !costoPorKg) return 0;
    return ((precioVenta - costoPorKg) / precioVenta) * 100;
  }
}

// ==========================================
// VALIDADOR DE COHERENCIA
// ==========================================

class DataValidator {
  constructor() {
    this.errores = [];
  }

  async validarCoherenciaGeneral() {
    try {
      console.log('🔍 Validando coherencia de datos...');
      this.errores = [];
      
      // Validar clientes
      await this.validarClientes();
      
      // Validar precios vs ventas
      await this.validarPreciosVentas();
      
      // Validar gastos vs rentabilidad
      await this.validarGastosRentabilidad();
      
      console.log(`✅ Validación completa: ${this.errores.length} errores encontrados`);
      
      dispatchSystemEvent('validacionCompleta', {
        errores: this.errores,
        esValido: this.errores.length === 0
      });
      
      return {
        valido: this.errores.length === 0,
        errores: this.errores
      };
      
    } catch (error) {
      console.error('❌ Error en validación:', error);
      return { valido: false, errores: ['Error interno de validación'] };
    }
  }

  async validarClientes() {
    if (!window.clientesManager) return;
    
    const clientesVentas = window.ventasManager?.obtenerClientes?.() || [];
    const clientesNegocios = window.negociosManager?.obtenerClientes?.() || [];
    const clientesCentrales = window.clientesManager.obtenerTodos();
    
    // Buscar duplicados por nombre
    const nombresDuplicados = new Map();
    [...clientesVentas, ...clientesNegocios].forEach(cliente => {
      const nombre = cliente.nombre.toLowerCase().trim();
      if (!nombresDuplicados.has(nombre)) {
        nombresDuplicados.set(nombre, []);
      }
      nombresDuplicados.get(nombre).push(cliente);
    });
    
    nombresDuplicados.forEach((clientes, nombre) => {
      if (clientes.length > 1) {
        const ids = clientes.map(c => c.id).filter((id, index, arr) => arr.indexOf(id) !== index);
        if (ids.length > 0) {
          this.errores.push({
            tipo: 'cliente_duplicado',
            mensaje: `Cliente "${nombre}" con IDs diferentes`,
            datos: clientes
          });
        }
      }
    });
  }

  async validarPreciosVentas() {
    if (!window.preciosManager || !window.ventasManager) return;
    
    const resumenPrecios = window.preciosManager.obtenerResumenPrecios();
    const ventasRecientes = window.ventasManager.obtenerVentas?.({ limite: 10 }) || [];
    
    ventasRecientes.forEach(venta => {
      if (venta.precioKg && resumenPrecios.actual) {
        const diferencia = Math.abs(venta.precioKg - resumenPrecios.actual) / resumenPrecios.actual;
        
        if (diferencia > 0.2) { // Más de 20% de diferencia
          this.errores.push({
            tipo: 'precio_inconsistente',
            mensaje: `Venta con precio muy diferente al mercado`,
            datos: {
              ventaId: venta.id,
              precioVenta: venta.precioKg,
              precioMercado: resumenPrecios.actual,
              diferencia: (diferencia * 100).toFixed(1) + '%'
            }
          });
        }
      }
    });
  }

  async validarGastosRentabilidad() {
    if (!window.expenseManager || !window.rentabilidadManager) return;
    
    const gastosDelMes = window.expenseManager.getFinancialSummary('month');
    const costoPorKg = window.rentabilidadManager.calcularCostoPorKg();
    
    if (gastosDelMes.total > 0 && costoPorKg === 0) {
      this.errores.push({
        tipo: 'calculo_incorrecto',
        mensaje: 'Hay gastos registrados pero el costo por kg es 0',
        datos: { gastosTotal: gastosDelMes.total }
      });
    }
  }
}

// ==========================================
// GESTOR PRINCIPAL DE SINCRONIZACIÓN
// ==========================================

class DataSyncManager {
  constructor() {
    this.clientesManager = new ClientesManager();
    this.rentabilidadManager = new RentabilidadManager();
    this.validator = new DataValidator();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔄 Inicializando sistema de sincronización...');
      
      // Esperar a que los módulos base estén listos
      await this.waitForCoreModules();
      
      // Inicializar componentes
      await this.clientesManager.initialize();
      await this.rentabilidadManager.initialize();
      
      // Configurar eventos de sincronización
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('✅ Sistema de sincronización inicializado');
      
      dispatchSystemEvent('dataSyncReady', {
        components: ['clientesManager', 'rentabilidadManager', 'validator']
      });
      
    } catch (error) {
      console.error('❌ Error inicializando sincronización:', error);
    }
  }

  async waitForCoreModules() {
    const maxWait = 10000;
    const checkInterval = 500;
    let elapsed = 0;
    
    return new Promise((resolve) => {
      const check = () => {
        const modulesReady = Boolean(
          window.expenseManager || 
          window.preciosManager
        );
        
        if (modulesReady || elapsed >= maxWait) {
          console.log('📦 Módulos core disponibles para sincronización');
          resolve();
        } else {
          elapsed += checkInterval;
          setTimeout(check, checkInterval);
        }
      };
      
      check();
    });
  }

  setupEventListeners() {
    // Escuchar creación de ventas para validar precios
    window.addEventListener('ventaCreated', async (event) => {
      const venta = event.detail.venta;
      if (this.rentabilidadManager.initialized) {
        const validacion = this.rentabilidadManager.validarPrecioVenta(venta.precioKg, venta.cantidad);
        if (!validacion.valido && window.notificationManager) {
          window.notificationManager.warning('Precio de venta requiere atención');
        }
      }
    });
    
    // Escuchar cambios en precios para actualizar validaciones
    window.addEventListener('precioCreated', async (event) => {
      console.log('💱 Precio actualizado, recalculando validaciones...');
    });
    
    // Escuchar cambios en gastos para actualizar costos
    window.addEventListener('expenseCreated', async (event) => {
      console.log('💰 Gasto registrado, recalculando costos...');
    });
  }

  async sincronizarTodo() {
    try {
      console.log('🔄 Sincronizando todos los módulos...');
      
      if (this.clientesManager.initialized) {
        await this.clientesManager.sincronizarClientesExistentes();
      }
      
      // Validar coherencia después de sincronizar
      const resultado = await this.validator.validarCoherenciaGeneral();
      
      console.log('✅ Sincronización completa');
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return { valido: false, errores: ['Error de sincronización'] };
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      components: {
        clientesManager: this.clientesManager.initialized,
        rentabilidadManager: this.rentabilidadManager.initialized,
        validator: Boolean(this.validator)
      },
      errores: this.validator.errores.length
    };
  }
}

// ==========================================
// UTILIDADES
// ==========================================

function dispatchSystemEvent(eventType, data) {
  window.dispatchEvent(new CustomEvent(eventType, {
    detail: {
      ...data,
      timestamp: Date.now(),
      source: 'dataSyncManager'
    }
  }));
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Crear instancia global
const dataSyncManager = new DataSyncManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  // Esperar un poco para que otros módulos se carguen
  setTimeout(async () => {
    await dataSyncManager.initialize();
  }, 1000);
});

// Exponer managers globalmente
window.dataSyncManager = dataSyncManager;
window.clientesManager = dataSyncManager.clientesManager;
window.rentabilidadManager = dataSyncManager.rentabilidadManager;

// Funciones de conveniencia globales
window.validarCoherenciaGeneral = () => dataSyncManager.validator.validarCoherenciaGeneral();
window.sincronizarTodo = () => dataSyncManager.sincronizarTodo();

console.log('🔄 Sistema de sincronización de datos cargado');

export default dataSyncManager;