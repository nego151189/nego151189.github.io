/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE VENTAS
   Sistema integrado con clientes, precios y gastos
   ======================================== */

// ==========================================
// SISTEMA DE NOTIFICACIONES
// ==========================================

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.container = null;
    this.init();
  }

  init() {
    this.createContainer();
  }

  createContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 5000) {
    const id = Date.now().toString();
    const notification = this.createNotification(id, message, type, duration);
    
    this.notifications.push({ id, element: notification, timeout: null });
    this.container.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.hide(id);
      }, duration);
      
      const notif = this.notifications.find(n => n.id === id);
      if (notif) notif.timeout = timeout;
    }
    
    return id;
  }

  createNotification(id, message, type, duration) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.pointerEvents = 'auto';
    notification.setAttribute('data-id', id);
    
    const icon = this.getIcon(type);
    const title = this.getTitle(type);
    
    notification.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">
          <i class="fas ${icon}"></i>
          ${title}
        </div>
        <button class="notification-close" onclick="window.notificationManager.hide('${id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="notification-body">
        ${message}
      </div>
      ${duration > 0 ? `<div class="notification-progress"><div class="progress-bar" style="animation: progress ${duration}ms linear;"></div></div>` : ''}
    `;
    
    return notification;
  }

  getIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  getTitle(type) {
    const titles = {
      success: 'Éxito',
      error: 'Error',
      warning: 'Advertencia',
      info: 'Información'
    };
    return titles[type] || titles.info;
  }

  hide(id) {
    const notificationData = this.notifications.find(n => n.id === id);
    if (!notificationData) return;
    
    const { element, timeout } = notificationData;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    element.classList.remove('show');
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 300);
  }

  hideAll() {
    this.notifications.forEach(({ id }) => {
      this.hide(id);
    });
  }

  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 8000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }
}

// CSS adicional para las notificaciones
const notificationStyles = `
<style>
.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.notification-progress .progress-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  width: 100%;
  transform-origin: left;
}

@keyframes progress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

.notification {
  margin-bottom: 0.5rem;
  min-width: 300px;
  max-width: 400px;
  position: relative;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.notification-close {
  background: none;
  border: none;
  color: currentColor;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.7;
  transition: opacity 0.2s;
  padding: 0.25rem;
  border-radius: 4px;
}

.notification-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.notification-body {
  font-size: 0.85rem;
  line-height: 1.4;
  opacity: 0.95;
}
</style>
`;

if (!document.querySelector('#notification-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'notification-styles';
  styleElement.innerHTML = notificationStyles;
  document.head.appendChild(styleElement);
}

// ==========================================
// CLASE PRINCIPAL DE VENTAS INTEGRADA
// ==========================================

class VentasManager {
  constructor() {
    this.fincaId = 'finca_la_herradura';
    this.currency = 'GTQ';
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    
    this.ventas = new Map();
    this.filtrosActivos = {
      periodo: 'mes',
      cliente: '',
      estado: '',
      metodoPago: ''
    };
    
    this.estadisticas = {
      ingresosDelMes: 0,
      cantidadVendida: 0,
      precioPromedio: 0,
      margenGanancia: 0,
      tendencia: 0,
      costoPromedio: 0,
      rentabilidadReal: 0
    };
    
    this.integrations = {
      clientesManager: false,
      preciosManager: false,
      gastosManager: false
    };
    
    this.init();
  }

  // ==========================================
  // INICIALIZACIÓN INTEGRADA
  // ==========================================

  async init() {
    try {
      console.log('💰 Inicializando VentasManager integrado...');
      
      await this.waitForFirebase();
      await this.waitForIntegrations();
      await this.setupAuth();
      await this.cargarDatos();
      
      this.setupSyncListeners();
      
      console.log('✅ VentasManager integrado inicializado');
      
    } catch (error) {
      console.error('⚠️ Error inicializando VentasManager:', error);
      this.initOfflineMode();
    }
  }

  async waitForFirebase() {
    return new Promise((resolve, reject) => {
      const checkFirebase = () => {
        if (window.firebase) {
          this.db = window.firebase.firestore();
          this.auth = window.firebase.auth();
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      
      checkFirebase();
      setTimeout(() => reject(new Error('Firebase timeout')), 10000);
    });
  }

  async waitForIntegrations() {
    const maxWait = 15000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // Verificar ClientesManager
      if (window.clientesManager) {
        this.integrations.clientesManager = true;
      }
      
      // Verificar PreciosManager
      if (window.preciosManager) {
        this.integrations.preciosManager = true;
      }
      
      // Verificar GastosManager
      if (window.expenseManager || window.gastosManager) {
        this.integrations.gastosManager = true;
      }
      
      // Si tenemos al menos ClientesManager, continuar
      if (this.integrations.clientesManager) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('🔗 Integraciones detectadas:', this.integrations);
  }

  async setupAuth() {
    if (this.auth) {
      this.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        if (user) {
          console.log('Usuario autenticado en ventas:', user.email);
        }
      });
    }
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

    // Escuchar cambios de gastos
    window.addEventListener('expenseCreated', (event) => {
      this.recalcularRentabilidad();
    });
  }

  initOfflineMode() {
    console.log('📱 VentasManager en modo offline');
    this.loadOfflineData();
  }

  // ==========================================
  // CARGA DE DATOS INTEGRADA
  // ==========================================

  async cargarDatos() {
    try {
      if (this.db && this.currentUser) {
        await this.loadFromFirebase();
      } else {
        await this.loadOfflineData();
      }
      
      this.calcularEstadisticas();
      
    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
      await this.loadOfflineData();
    }
  }

  async loadFromFirebase() {
    if (!this.db) return;
    
    try {
      console.log('Cargando ventas desde Firebase...');
      
      const ventasSnapshot = await this.db.collection('ventas')
        .where('usuarioId', '==', this.currentUser.uid)
        .limit(100)
        .get();
      
      const ventasArray = [];
      ventasSnapshot.forEach(doc => {
        const data = doc.data();
        ventasArray.push({
          id: doc.id,
          ...data,
          fecha: data.fecha,
          cliente: data.cliente || 'Cliente no especificado',
          cantidad: Number(data.cantidad) || 0,
          precioKg: Number(data.precioKg) || 0,
          total: Number(data.total) || 0,
          metodoPago: data.metodoPago || 'efectivo',
          estado: data.estado || 'completada'
        });
      });
      
      // Filtrar y ordenar
      const inicioMes = this.getStartOfMonth();
      const finMes = this.getEndOfMonth();
      
      const ventasFiltradas = ventasArray
        .filter(venta => venta.fecha >= inicioMes && venta.fecha <= finMes)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      ventasFiltradas.forEach(venta => {
        this.ventas.set(venta.id, venta);
      });
      
      console.log(`Ventas cargadas: ${ventasFiltradas.length}`);
      
    } catch (error) {
      console.error('Error cargando desde Firebase:', error);
      throw error;
    }
  }

  async loadOfflineData() {
    try {
      if (window.offlineManager) {
        const ventasData = await window.offlineManager.getAllData('ventas');
        ventasData.forEach(item => {
          this.ventas.set(item.id, item.data);
        });
      } else {
        this.loadFromLocalStorage();
      }
      
      if (this.ventas.size === 0) {
        this.generarDatosEjemplo();
      }
      
    } catch (error) {
      console.error('Error cargando datos offline:', error);
      this.generarDatosEjemplo();
    }
  }

  loadFromLocalStorage() {
    try {
      const ventasLS = localStorage.getItem('finca_ventas');
      if (ventasLS) {
        const ventas = JSON.parse(ventasLS);
        ventas.forEach(venta => {
          this.ventas.set(venta.id, venta);
        });
      }
    } catch (error) {
      console.error('Error cargando desde localStorage:', error);
    }
  }

  // ==========================================
  // GESTIÓN DE VENTAS CON VALIDACIONES
  // ==========================================

  async registrarVenta(datos) {
    try {
      const ventaId = this.generateId();
      const fechaActual = new Date();
      
      // Validar cliente
      if (this.integrations.clientesManager && datos.clienteId) {
        const cliente = window.clientesManager.obtenerCliente(datos.clienteId);
        if (!cliente) {
          throw new Error('Cliente no válido');
        }
        datos.cliente = cliente.nombre;
      }
      
      // Validar precio contra mercado
      if (this.integrations.preciosManager) {
        const validacionPrecio = await this.validarPrecioVenta(datos.precioKg, datos.cantidad);
        if (!validacionPrecio.valido) {
          if (window.notificationManager) {
            window.notificationManager.warning(validacionPrecio.mensaje);
          }
        }
      }
      
      const venta = {
        id: ventaId,
        fecha: datos.fecha || fechaActual.toISOString().split('T')[0],
        clienteId: datos.clienteId,
        cliente: datos.cliente || await this.getNombreCliente(datos.clienteId),
        cantidad: Number(datos.cantidad),
        precioKg: Number(datos.precioKg),
        total: Number(datos.cantidad) * Number(datos.precioKg),
        metodoPago: datos.metodoPago || 'efectivo',
        estado: 'completada',
        fechaCreacion: fechaActual.toISOString(),
        fechaModificacion: fechaActual.toISOString(),
        usuarioId: this.currentUser?.uid,
        
        // Campos calculados
        costoEstimado: 0,
        margenReal: 0,
        rentabilidad: 0
      };
      
      // Calcular rentabilidad real
      if (this.integrations.gastosManager) {
        const rentabilidad = await this.calcularRentabilidadReal(venta);
        venta.costoEstimado = rentabilidad.costoTotal;
        venta.margenReal = rentabilidad.margen;
        venta.rentabilidad = rentabilidad.ganancia;
      }
      
      this.ventas.set(ventaId, venta);
      
      // Guardar offline
      if (window.offlineManager) {
        await window.offlineManager.saveData('ventas', ventaId, venta);
      } else {
        this.saveToLocalStorage();
      }
      
      // Sincronizar con Firebase
      if (this.db && this.currentUser) {
        this.sincronizarVentaConFirebase(ventaId, venta).catch(error => {
          console.warn('Error sincronizando con Firebase:', error);
        });
      }
      
      // Actualizar métricas del cliente
      if (this.integrations.clientesManager && datos.clienteId) {
        await window.clientesManager.actualizarMetricasVenta(datos.clienteId, venta.total);
      }
      
      this.calcularEstadisticas();
      this.broadcastUpdate('venta_creada', venta);
      
      if (window.notificationManager) {
        const mensaje = `Venta registrada: ${venta.cantidad} kg a ${venta.cliente}`;
        window.notificationManager.success(mensaje);
      }
      
      return venta;
      
    } catch (error) {
      console.error('Error registrando venta:', error);
      if (window.notificationManager) {
        window.notificationManager.error('Error al registrar la venta');
      }
      throw error;
    }
  }

  async validarPrecioVenta(precioIngresado, cantidad) {
    if (!this.integrations.preciosManager) {
      return { valido: true, mensaje: 'Sistema de precios no disponible' };
    }
    
    try {
      const preciosActuales = window.preciosManager.obtenerResumenPrecios();
      const precioMercado = preciosActuales.mercados.finca || preciosActuales.actual;
      
      const diferencia = Math.abs(precioIngresado - precioMercado) / precioMercado * 100;
      
      if (precioIngresado < precioMercado * 0.8) {
        return {
          valido: false,
          mensaje: `Precio bajo: Q${precioIngresado} vs mercado Q${precioMercado.toFixed(2)}`,
          sugerencia: precioMercado
        };
      }
      
      if (diferencia > 30) {
        return {
          valido: false,
          mensaje: `Precio difiere ${diferencia.toFixed(1)}% del mercado`
        };
      }
      
      return { valido: true, mensaje: 'Precio validado contra mercado' };
      
    } catch (error) {
      console.error('Error validando precio:', error);
      return { valido: true, mensaje: 'No se pudo validar precio' };
    }
  }

  async calcularRentabilidadReal(venta) {
    if (!this.integrations.gastosManager) {
      return {
        costoTotal: 0,
        margen: 0,
        ganancia: venta.total
      };
    }
    
    try {
      const gestor = window.expenseManager || window.gastosManager;
      const gastosPorKg = await this.calcularCostoPorKg();
      
      const costoTotal = venta.cantidad * gastosPorKg;
      const ingresoTotal = venta.total;
      const ganancia = ingresoTotal - costoTotal;
      const margen = ingresoTotal > 0 ? (ganancia / ingresoTotal) * 100 : 0;
      
      return {
        costoTotal: Math.round(costoTotal * 100) / 100,
        margen: Math.round(margen * 100) / 100,
        ganancia: Math.round(ganancia * 100) / 100
      };
      
    } catch (error) {
      console.error('Error calculando rentabilidad:', error);
      return {
        costoTotal: 0,
        margen: 0,
        ganancia: venta.total
      };
    }
  }

  async calcularCostoPorKg() {
    if (!this.integrations.gastosManager) {
      return 8.50; // Costo estimado por defecto
    }
    
    try {
      const gestor = window.expenseManager || window.gastosManager;
      const gastosDelMes = gestor.getFinancialSummary ? 
        gestor.getFinancialSummary('month') : 
        { total: 25000 }; // Fallback
      
      const produccionEstimada = 1000; // kg por mes
      return gastosDelMes.total / produccionEstimada;
      
    } catch (error) {
      console.error('Error calculando costo por kg:', error);
      return 8.50;
    }
  }

  async sincronizarVentaConFirebase(ventaId, venta) {
    try {
      await this.db.collection('ventas').doc(ventaId).set({
        fecha: venta.fecha,
        clienteId: venta.clienteId,
        cliente: venta.cliente,
        cantidad: venta.cantidad,
        precioKg: venta.precioKg,
        total: venta.total,
        metodoPago: venta.metodoPago,
        estado: venta.estado,
        costoEstimado: venta.costoEstimado,
        margenReal: venta.margenReal,
        rentabilidad: venta.rentabilidad,
        fechaCreacion: firebase.firestore.Timestamp.fromDate(new Date(venta.fechaCreacion)),
        fechaModificacion: firebase.firestore.Timestamp.fromDate(new Date(venta.fechaModificacion)),
        usuarioId: venta.usuarioId
      });
      
      console.log(`Venta ${ventaId} sincronizada con Firebase`);
      
    } catch (error) {
      console.error(`Error sincronizando venta ${ventaId}:`, error);
      throw error;
    }
  }

  // ==========================================
  // CÁLCULOS Y ESTADÍSTICAS INTEGRADAS
  // ==========================================

  calcularEstadisticas() {
    const ventasActivas = Array.from(this.ventas.values()).filter(venta => venta.estado === 'completada');
    const ventasDelMes = this.getVentasDelMes();
    const ventasMesAnterior = this.getVentasMesAnterior();
    
    // Cálculos básicos
    this.estadisticas.ingresosDelMes = ventasDelMes.reduce((sum, v) => sum + v.total, 0);
    this.estadisticas.cantidadVendida = ventasDelMes.reduce((sum, v) => sum + v.cantidad, 0);
    this.estadisticas.precioPromedio = ventasDelMes.length > 0 
      ? ventasDelMes.reduce((sum, v) => sum + v.precioKg, 0) / ventasDelMes.length
      : 0;
    
    // Cálculos avanzados con integración de gastos
    if (this.integrations.gastosManager) {
      const costosReales = ventasDelMes.filter(v => v.costoEstimado > 0);
      if (costosReales.length > 0) {
        this.estadisticas.costoPromedio = costosReales.reduce((sum, v) => sum + v.costoEstimado, 0) / costosReales.length;
        this.estadisticas.margenGanancia = costosReales.reduce((sum, v) => sum + v.margenReal, 0) / costosReales.length;
        this.estadisticas.rentabilidadReal = costosReales.reduce((sum, v) => sum + v.rentabilidad, 0);
      }
    } else {
      // Estimación sin datos de gastos
      this.estadisticas.margenGanancia = 35; // Estimado
      this.estadisticas.costoPromedio = 8.50;
    }
    
    // Tendencia
    const ingresosMesAnterior = ventasMesAnterior.reduce((sum, v) => sum + v.total, 0);
    if (ingresosMesAnterior > 0) {
      this.estadisticas.tendencia = ((this.estadisticas.ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100;
    } else {
      this.estadisticas.tendencia = this.estadisticas.ingresosDelMes > 0 ? 100 : 0;
    }
  }

  calcularMetricas() {
    this.calcularEstadisticas();
    return {
      ingresosDelMes: this.estadisticas.ingresosDelMes,
      cantidadVendida: this.estadisticas.cantidadVendida,
      precioPromedio: this.estadisticas.precioPromedio,
      margenGanancia: this.estadisticas.margenGanancia,
      tendencia: this.estadisticas.tendencia,
      costoPromedio: this.estadisticas.costoPromedio,
      rentabilidadReal: this.estadisticas.rentabilidadReal
    };
  }

  async recalcularRentabilidad() {
    const ventasArray = Array.from(this.ventas.values());
    
    for (const venta of ventasArray) {
      if (venta.estado === 'completada') {
        const rentabilidad = await this.calcularRentabilidadReal(venta);
        venta.costoEstimado = rentabilidad.costoTotal;
        venta.margenReal = rentabilidad.margen;
        venta.rentabilidad = rentabilidad.ganancia;
        
        this.ventas.set(venta.id, venta);
      }
    }
    
    this.calcularEstadisticas();
    console.log('📊 Rentabilidad recalculada para todas las ventas');
  }

  // ==========================================
  // OBTENCIÓN DE DATOS INTEGRADA
  // ==========================================

  getVentasDelMes() {
    const inicio = this.getStartOfMonth();
    const fin = this.getEndOfMonth();
    
    return Array.from(this.ventas.values()).filter(venta => {
      const fechaVenta = venta.fecha;
      return fechaVenta >= inicio && fechaVenta <= fin && venta.estado === 'completada';
    });
  }

  getVentasMesAnterior() {
    const inicioMesAnterior = this.getStartOfPreviousMonth();
    const finMesAnterior = this.getEndOfPreviousMonth();
    
    return Array.from(this.ventas.values()).filter(venta => {
      const fechaVenta = venta.fecha;
      return fechaVenta >= inicioMesAnterior && fechaVenta <= finMesAnterior && venta.estado === 'completada';
    });
  }

  obtenerVentasFiltradas() {
    let ventas = Array.from(this.ventas.values());
    
    if (this.filtrosActivos.cliente) {
      ventas = ventas.filter(v => v.clienteId === this.filtrosActivos.cliente);
    }
    
    if (this.filtrosActivos.estado) {
      ventas = ventas.filter(v => v.estado === this.filtrosActivos.estado);
    }
    
    if (this.filtrosActivos.metodoPago) {
      ventas = ventas.filter(v => v.metodoPago === this.filtrosActivos.metodoPago);
    }
    
    // Filtro por período
    const fechaInicio = this.getFechaInicioPeriodo(this.filtrosActivos.periodo);
    ventas = ventas.filter(v => v.fecha >= fechaInicio);
    
    return ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  obtenerClientesRecientes() {
    if (this.integrations.clientesManager) {
      return window.clientesManager.obtenerTodos()
        .filter(cliente => cliente.totalVentas > 0)
        .sort((a, b) => new Date(b.ultimaCompra || 0) - new Date(a.ultimaCompra || 0))
        .slice(0, 5)
        .map(cliente => ({
          id: cliente.id,
          nombre: cliente.nombre,
          totalCompras: cliente.totalVentas,
          ultimaCompra: `${cliente.totalVentas > 0 ? 'Q' + cliente.totalVentas.toLocaleString() : 'Sin ventas'}`,
          fechaUltimaCompra: cliente.ultimaCompra
        }));
    }
    
    // Fallback sin ClientesManager
    const ventasRecientes = Array.from(this.ventas.values())
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 10);
    
    const clientesMap = new Map();
    
    ventasRecientes.forEach(venta => {
      if (!clientesMap.has(venta.clienteId)) {
        clientesMap.set(venta.clienteId, {
          id: venta.clienteId,
          nombre: venta.cliente,
          totalCompras: this.calcularTotalComprasCliente(venta.clienteId),
          ultimaCompra: venta.cantidad + ' kg',
          fechaUltimaCompra: venta.fecha
        });
      }
    });
    
    return Array.from(clientesMap.values()).slice(0, 5);
  }

  obtenerListaClientes() {
    if (this.integrations.clientesManager) {
      return window.clientesManager.obtenerParaSelectores();
    }
    
    // Fallback: extraer de ventas existentes
    const clientesUnicos = new Map();
    Array.from(this.ventas.values()).forEach(venta => {
      if (venta.clienteId && !clientesUnicos.has(venta.clienteId)) {
        clientesUnicos.set(venta.clienteId, {
          id: venta.clienteId,
          nombre: venta.cliente,
          displayName: venta.cliente
        });
      }
    });
    
    return Array.from(clientesUnicos.values());
  }

  obtenerCliente(clienteId) {
    if (this.integrations.clientesManager) {
      return window.clientesManager.obtenerCliente(clienteId);
    }
    
    return null;
  }

  // ==========================================
  // FUNCIONES DE EVENTOS DE SINCRONIZACIÓN
  // ==========================================

  onClienteUpdated(cliente, accion) {
    console.log(`🔄 Cliente ${accion} en ventas:`, cliente.nombre);
    
    // Actualizar ventas relacionadas
    Array.from(this.ventas.values()).forEach(venta => {
      if (venta.clienteId === cliente.id) {
        venta.cliente = cliente.nombre;
        this.ventas.set(venta.id, venta);
      }
    });
  }

  onPrecioUpdated(precio) {
    console.log('💰 Precio actualizado en ventas:', precio);
    
    // Podrías recalcular márgenes o mostrar alertas
    if (window.notificationManager) {
      window.notificationManager.info('Precios de mercado actualizados');
    }
  }

  // Función para sincronizar desde ClientesManager
  async sincronizarCliente(cliente, accion) {
    this.onClienteUpdated(cliente, accion);
  }

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================

  async getNombreCliente(clienteId) {
    if (this.integrations.clientesManager) {
      const cliente = window.clientesManager.obtenerCliente(clienteId);
      return cliente ? cliente.nombre : 'Cliente desconocido';
    }
    return 'Cliente desconocido';
  }

  calcularTotalComprasCliente(clienteId) {
    return Array.from(this.ventas.values())
      .filter(v => v.clienteId === clienteId)
      .reduce((sum, v) => sum + v.total, 0);
  }

  aplicarFiltros(filtros) {
    this.filtrosActivos = { ...this.filtrosActivos, ...filtros };
  }

  getFechaInicioPeriodo(periodo) {
    const ahora = new Date();
    
    switch (periodo) {
      case 'hoy':
        return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString().split('T')[0];
      case 'semana':
        return new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case 'mes':
        return this.getStartOfMonth();
      case 'trimestre':
        return new Date(ahora.getFullYear(), Math.floor(ahora.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
      case 'ano':
        return new Date(ahora.getFullYear(), 0, 1).toISOString().split('T')[0];
      default:
        return this.getStartOfMonth();
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  getStartOfMonth() {
    return new Date(this.currentYear, this.currentMonth, 1).toISOString().split('T')[0];
  }

  getEndOfMonth() {
    return new Date(this.currentYear, this.currentMonth + 1, 0).toISOString().split('T')[0];
  }

  getStartOfPreviousMonth() {
    return new Date(this.currentYear, this.currentMonth - 1, 1).toISOString().split('T')[0];
  }

  getEndOfPreviousMonth() {
    return new Date(this.currentYear, this.currentMonth, 0).toISOString().split('T')[0];
  }

  // ==========================================
  // PERSISTENCIA
  // ==========================================

  saveToLocalStorage() {
    try {
      localStorage.setItem('finca_ventas', JSON.stringify(Array.from(this.ventas.values())));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  // ==========================================
  // FUNCIONES AVANZADAS INTEGRADAS
  // ==========================================

  async identificarOportunidades() {
    const oportunidades = [];
    
    if (this.integrations.clientesManager) {
      const clientes = window.clientesManager.obtenerTodos();
      
      // Clientes sin compras recientes
      clientes.forEach(cliente => {
        if (cliente.ultimaCompra) {
          const ultimaCompra = new Date(cliente.ultimaCompra);
          const diasSinCompra = (new Date() - ultimaCompra) / (1000 * 60 * 60 * 24);
          
          if (diasSinCompra > 14 && cliente.totalVentas > 10000) {
            oportunidades.push({
              titulo: 'Cliente frecuente sin pedido reciente',
              descripcion: `${cliente.nombre} no ha realizado pedidos en ${Math.floor(diasSinCompra)} días`,
              valorPotencial: Math.round(cliente.totalVentas * 0.1),
              icono: 'fa-user-clock'
            });
          }
        }
      });
    }
    
    // Oportunidades de precio
    if (this.integrations.preciosManager) {
      const resumenPrecios = window.preciosManager.obtenerResumenPrecios();
      const precioActual = this.estadisticas.precioPromedio;
      
      if (precioActual < resumenPrecios.actual * 0.9) {
        oportunidades.push({
          titulo: 'Oportunidad de incremento de precio',
          descripcion: `Precio actual (Q${precioActual.toFixed(2)}) por debajo del mercado (Q${resumenPrecios.actual.toFixed(2)})`,
          valorPotencial: Math.round((resumenPrecios.actual - precioActual) * this.estadisticas.cantidadVendida),
          icono: 'fa-chart-line'
        });
      }
    }
    
    return oportunidades;
  }

  async generarPrediccionesIA() {
    const predicciones = [];
    
    // Predicción basada en tendencia
    const tendencia = this.estadisticas.tendencia;
    const ingresosActuales = this.estadisticas.ingresosDelMes;
    const proyeccionProximoMes = ingresosActuales * (1 + tendencia / 100);
    
    predicciones.push({
      titulo: 'Ingresos próximo mes',
      valor: `Q ${Math.round(proyeccionProximoMes).toLocaleString()}`,
      confianza: tendencia > 0 ? 85 : 70,
      descripcion: 'Basado en tendencia actual',
      color: tendencia > 0 ? '#22c55e' : '#f59e0b'
    });
    
    // Mejor día para vender (basado en datos históricos)
    const ventasPorDia = Array.from(this.ventas.values()).reduce((acc, venta) => {
      const dia = new Date(venta.fecha).getDay();
      acc[dia] = (acc[dia] || 0) + venta.total;
      return acc;
    }, {});
    
    const mejorDia = Object.entries(ventasPorDia).sort((a, b) => b[1] - a[1])[0];
    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    if (mejorDia) {
      predicciones.push({
        titulo: 'Mejor día para vender',
        valor: nombresDias[mejorDia[0]],
        confianza: 78,
        descripción: 'Análisis de patrones históricos',
        color: '#3b82f6'
      });
    }
    
    // Cliente más rentable
    if (this.integrations.clientesManager) {
      const clientesMasRentables = window.clientesManager.obtenerTodos()
        .sort((a, b) => b.totalVentas - a.totalVentas)[0];
      
      if (clientesMasRentables) {
        predicciones.push({
          titulo: 'Cliente más rentable',
          valor: clientesMasRentables.nombre,
          confianza: 92,
          descripcion: 'Mayor volumen y frecuencia',
          color: '#f59e0b'
        });
      }
    }
    
    return predicciones;
  }

  // ==========================================
  // DATOS DE EJEMPLO INTEGRADOS
  // ==========================================

  generarDatosEjemplo() {
    console.log('Generando datos de ejemplo integrados...');
    
    // Usar clientes del ClientesManager si está disponible
    let clientesDisponibles = [];
    if (this.integrations.clientesManager) {
      clientesDisponibles = window.clientesManager.obtenerTodos();
    } else {
      // Fallback: clientes de ejemplo
      clientesDisponibles = [
        { id: 'CLI_001', nombre: 'María González', empresa: 'Exportadora Maya' },
        { id: 'CLI_002', nombre: 'Carlos Ruiz', empresa: 'Supermercados Paiz' },
        { id: 'CLI_003', nombre: 'Ana López', empresa: 'Alimentos La Pradera' }
      ];
    }
    
    // Generar ventas de ejemplo
    for (let i = 0; i < 15; i++) {
      const cliente = clientesDisponibles[Math.floor(Math.random() * clientesDisponibles.length)];
      const cantidad = Math.random() * 500 + 50;
      const precioKg = Math.random() * 5 + 8;
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 30));
      
      const venta = {
        id: this.generateId(),
        fecha: fecha.toISOString().split('T')[0],
        clienteId: cliente.id,
        cliente: cliente.nombre,
        cantidad: Math.round(cantidad * 10) / 10,
        precioKg: Math.round(precioKg * 100) / 100,
        total: Math.round(cantidad * precioKg * 100) / 100,
        metodoPago: ['efectivo', 'transferencia', 'credito'][Math.floor(Math.random() * 3)],
        estado: 'completada',
        costoEstimado: Math.round(cantidad * 8.5 * 100) / 100,
        margenReal: Math.round(((precioKg - 8.5) / precioKg) * 100 * 100) / 100,
        rentabilidad: Math.round(cantidad * (precioKg - 8.5) * 100) / 100
      };
      
      this.ventas.set(venta.id, venta);
    }
    
    this.calcularEstadisticas();
  }

  // ==========================================
  // COMUNICACIÓN
  // ==========================================

  broadcastUpdate(evento, datos) {
    window.dispatchEvent(new CustomEvent('ventasUpdate', {
      detail: { evento, datos, timestamp: Date.now() }
    }));
    
    // También disparar evento específico
    window.dispatchEvent(new CustomEvent(evento, {
      detail: { venta: datos, timestamp: Date.now() }
    }));
  }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Crear instancias globales
let ventasManager;
let notificationManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Crear gestor de notificaciones primero
  notificationManager = new NotificationManager();
  window.notificationManager = notificationManager;
  
  // Crear gestor de ventas
  ventasManager = new VentasManager();
  window.ventasManager = ventasManager;
  
  console.log('💰 VentasManager integrado disponible globalmente');
});

// Funciones globales para compatibilidad
window.mostrarNotificacion = function(mensaje, tipo = 'info') {
  if (window.notificationManager) {
    window.notificationManager.show(mensaje, tipo);
  } else {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
  }
};

window.actualizarMetricas = function() {
  if (window.ventasManager) {
    const metricas = window.ventasManager.calcularMetricas();
    
    const elementos = {
      'ingresosDelMes': `Q ${metricas.ingresosDelMes.toLocaleString()}`,
      'cantidadVendida': `${metricas.cantidadVendida.toLocaleString()} kg`,
      'precioPromedio': `Q ${metricas.precioPromedio.toFixed(2)}`,
      'margenGanancia': `${metricas.margenGanancia.toFixed(1)}%`
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.textContent = valor;
      }
    });
  }
};

// Exportar para otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VentasManager, NotificationManager };
}
