/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE VENTAS
   Sistema completo de ventas, clientes y comercialización
   Integrado con Firebase y sistema offline
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
    
    // Trigger show animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Auto hide
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.hide(id);
      }, duration);
      
      // Update timeout in notifications array
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
    
    // Clear timeout if exists
    if (timeout) {
      clearTimeout(timeout);
    }
    
    // Hide animation
    element.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      // Remove from array
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

// Agregar estilos si no existen
if (!document.querySelector('#notification-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'notification-styles';
  styleElement.innerHTML = notificationStyles;
  document.head.appendChild(styleElement);
}

// ==========================================
// CLASE PRINCIPAL DE VENTAS
// ==========================================

class VentasManager {
  constructor() {
    // Configuración base
    this.fincaId = 'finca_la_herradura';
    this.currency = 'GTQ';
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    
    // Referencias a Firebase
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    
    // Datos en memoria
    this.ventas = new Map();
    this.clientes = new Map();
    this.facturas = new Map();
    this.pagos = new Map();
    
    // Filtros actuales
    this.filtrosActivos = {
      periodo: 'mes',
      cliente: '',
      estado: '',
      metodoPago: ''
    };
    
    // Estadísticas
    this.estadisticas = {
      ingresosDelMes: 0,
      cantidadVendida: 0,
      precioPromedio: 0,
      margenGanancia: 0,
      tendencia: 0
    };
    
    // Configuración ML (simplificada para demo)
    this.mlConfig = {
      prediccionesActivas: true,
      confianzaMinima: 0.7
    };
    
    this.init();
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  async init() {
    try {
      console.log('💰 Inicializando sistema de ventas...');
      
      // Esperar a que Firebase esté disponible
      await this.waitForFirebase();
      
      // Configurar autenticación
      await this.setupAuth();
      
      // Cargar datos iniciales
      await this.cargarDatos();
      
      console.log('✅ Sistema de ventas inicializado');
      
    } catch (error) {
      console.error('⚠ Error inicializando sistema de ventas:', error);
      // Continuar en modo offline
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
      
      // Timeout después de 10 segundos
      setTimeout(() => reject(new Error('Firebase timeout')), 10000);
    });
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

  initOfflineMode() {
    console.log('📱 Inicializando modo offline para ventas');
    this.loadOfflineData();
  }

  // ==========================================
  // CARGA DE DATOS
  // ==========================================

  async cargarDatos() {
    try {
      // Intentar cargar desde Firebase primero
      if (this.db && this.currentUser) {
        await this.loadFromFirebase();
      } else {
        // Cargar desde almacenamiento local
        await this.loadOfflineData();
      }
      
      // Calcular estadísticas
      this.calcularEstadisticas();
      
    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
      await this.loadOfflineData();
    }
  }

// MÉTODO CORREGIDO PARA CARGAR DESDE FIREBASE
  async loadFromFirebase() {
 console.log('🔥 EJECUTANDO MÉTODO CORREGIDO'); // Agrega esta línea
  if (!this.db) return;
  
  try {
    console.log('Cargando ventas desde Firebase...');
      
      // CONSULTA SIMPLE para ventas - Solo filtrar por usuarioId
      const ventasSnapshot = await this.db.collection('ventas')
        .where('usuarioId', '==', this.currentUser.uid)
        .limit(100)
        .get();
      
      // Filtrar y ordenar en memoria (más eficiente que crear índices)
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
      
      // Filtrar por fechas en memoria
      const inicioMes = this.getStartOfMonth();
      const finMes = this.getEndOfMonth();
      
      const ventasFiltradas = ventasArray
        .filter(venta => venta.fecha >= inicioMes && venta.fecha <= finMes)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      // Guardar en Map
      ventasFiltradas.forEach(venta => {
        this.ventas.set(venta.id, venta);
      });
      
      console.log(`Ventas cargadas: ${ventasFiltradas.length}`);
      
      // CONSULTA SIMPLE para clientes - Solo filtrar por usuarioId
      const clientesSnapshot = await this.db.collection('clientes')
        .where('usuarioId', '==', this.currentUser.uid)
        .limit(50)
        .get();
      
      // Ordenar en memoria
      const clientesArray = [];
      clientesSnapshot.forEach(doc => {
        const data = doc.data();
        clientesArray.push({
          id: doc.id,
          nombre: data.nombre || data.name,
          contacto: data.telefono || data.phone || data.email,
          direccion: data.direccion || '',
          totalCompras: 0,
          ultimaCompra: null,
          fechaUltimaCompra: null
        });
      });
      
      // Ordenar por nombre en memoria
      clientesArray.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      // Guardar en Map
      clientesArray.forEach(cliente => {
        this.clientes.set(cliente.id, cliente);
      });
      
      console.log(`Clientes cargados: ${clientesArray.length}`);
      console.log(`Total datos cargados: ${this.ventas.size} ventas, ${this.clientes.size} clientes`);
      
    } catch (error) {
      console.error('Error cargando desde Firebase:', error);
      // Mostrar notificación específica
      if (window.notificationManager) {
        window.notificationManager.warning('Error conectando con Firebase. Usando datos locales.', 5000);
      }
      throw error;
    }
  }

  // MÉTODO ALTERNATIVO - Si quieres cargar TODAS las ventas del usuario
  async loadAllVentasFromFirebase() {
    if (!this.db) return;
    
    try {
      console.log('Cargando TODAS las ventas del usuario...');
      
      // Consulta simple sin ordenamiento complejo
      const ventasSnapshot = await this.db.collection('ventas')
        .where('usuarioId', '==', this.currentUser.uid)
        .get(); // Sin limit para obtener todas
      
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
      
      // Ordenar todas las ventas por fecha (más recientes primero)
      ventasArray.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      // Guardar en Map
      ventasArray.forEach(venta => {
        this.ventas.set(venta.id, venta);
      });
      
      console.log(`Total ventas históricas cargadas: ${ventasArray.length}`);
      
    } catch (error) {
      console.error('Error cargando todas las ventas:', error);
      throw error;
    }
  }

  // CARGAR VENTAS CON PAGINACIÓN (Alternativa eficiente)
  async loadVentasPaginadas(limit = 50, startAfter = null) {
    if (!this.db) return;
    
    try {
      let query = this.db.collection('ventas')
        .where('usuarioId', '==', this.currentUser.uid)
        .orderBy('fechaCreacion', 'desc') // Usar timestamp de creación
        .limit(limit);
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      const ventas = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        ventas.push({
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
      
      // Guardar en Map
      ventas.forEach(venta => {
        this.ventas.set(venta.id, venta);
      });
      
      return {
        ventas,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limit
      };
      
    } catch (error) {
      console.error('Error cargando ventas paginadas:', error);
      throw error;
    }
  }

  // ACTUALIZAR MÉTODO DE CARGA PRINCIPAL
  async cargarDatos() {
    try {
      console.log('Iniciando carga de datos...');
      
      // Intentar cargar desde Firebase primero
      if (this.db && this.currentUser) {
        try {
          await this.loadFromFirebase();
          if (window.notificationManager) {
            window.notificationManager.success('Datos cargados desde Firebase', 3000);
          } 
        } catch (firebaseError) {
          console.warn('Error con Firebase, intentando datos locales:', firebaseError);
          await this.loadOfflineData();
          if (window.notificationManager) {
            window.notificationManager.info('Usando datos locales', 3000);
          }
        }
      } else {
        // Cargar desde almacenamiento local
        await this.loadOfflineData();
        if (window.notificationManager) {
          window.notificationManager.info('Trabajando en modo offline', 3000);
        }
      }
      
      // Calcular estadísticas
      this.calcularEstadisticas();
      
      console.log('Datos cargados correctamente');
      
    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
      // Fallback final - generar datos de ejemplo
      this.generarDatosEjemplo();
      if (window.notificationManager) {
        window.notificationManager.warning('Usando datos de ejemplo', 4000);
      }
    }
  }

  // MÉTODO MEJORADO PARA GUARDAR VENTAS
  async registrarVenta(datos) {
    try {
      const ventaId = this.generateId();
      const fechaActual = new Date();
      
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
        fechaCreacion: fechaActual.toISOString(), // Para ordenamiento
        fechaModificacion: fechaActual.toISOString(),
        usuarioId: this.currentUser?.uid
      };
      
      // Guardar en memoria primero
      this.ventas.set(ventaId, venta);
      
      // Guardar offline
      if (window.offlineManager) {
        await window.offlineManager.saveData('ventas', ventaId, venta);
      } else {
        this.saveToLocalStorage();
      }
      
      // Intentar sincronizar con Firebase (sin bloquear)
      if (this.db && this.currentUser) {
        this.sincronizarVentaConFirebase(ventaId, venta).catch(error => {
          console.warn('Error sincronizando con Firebase:', error);
          if (window.notificationManager) {
            window.notificationManager.info('Venta guardada localmente. Se sincronizará automáticamente.', 3000);
          }
        });
      }
      
      // Recalcular estadísticas
      this.calcularEstadisticas();
      
      // Notificar actualización
      this.broadcastUpdate('venta_creada', venta);
      
      if (window.notificationManager) {
        window.notificationManager.success('Venta registrada correctamente', 3000);
      }
      
      return venta;
      
    } catch (error) {
      console.error('Error registrando venta:', error);
      if (window.notificationManager) {
        window.notificationManager.error('Error al registrar la venta', 5000);
      }
      throw error;
    }
  }

  // MÉTODO PARA SINCRONIZACIÓN ASÍNCRONA
  async sincronizarVentaConFirebase(ventaId, venta) {
    try {
      await this.db.collection('ventas').doc(ventaId).set({
        fecha: venta.fecha,
        cliente: venta.cliente,
        cantidad: venta.cantidad,
        precioKg: venta.precioKg,
        total: venta.total,
        metodoPago: venta.metodoPago,
        estado: venta.estado,
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

  async loadOfflineData() {
    try {
      // Usar offlineManager si está disponible
      if (window.offlineManager) {
        const ventasData = await window.offlineManager.getAllData('ventas');
        ventasData.forEach(item => {
          this.ventas.set(item.id, item.data);
        });
        
        const clientesData = await window.offlineManager.getAllData('clientes');
        clientesData.forEach(item => {
          this.clientes.set(item.id, item.data);
        });
      } else {
        // Cargar desde localStorage directamente
        this.loadFromLocalStorage();
      }
      
      // Generar datos de ejemplo si no hay datos
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
      
      const clientesLS = localStorage.getItem('finca_clientes');
      if (clientesLS) {
        const clientes = JSON.parse(clientesLS);
        clientes.forEach(cliente => {
          this.clientes.set(cliente.id, cliente);
        });
      }
    } catch (error) {
      console.error('Error cargando desde localStorage:', error);
    }
  }

  // ==========================================
  // GESTIÓN DE VENTAS
  // ==========================================

  async registrarVenta(datos) {
    try {
      const ventaId = this.generateId();
      const fechaActual = new Date().toISOString();
      
      const venta = {
        id: ventaId,
        fecha: datos.fecha || new Date().toISOString().split('T')[0],
        clienteId: datos.clienteId,
        cliente: await this.getNombreCliente(datos.clienteId),
        cantidad: Number(datos.cantidad),
        precioKg: Number(datos.precioKg),
        total: Number(datos.cantidad) * Number(datos.precioKg),
        metodoPago: datos.metodoPago || 'efectivo',
        estado: 'completada',
        createdAt: fechaActual,
        updatedAt: fechaActual
      };
      
      // Guardar en memoria
      this.ventas.set(ventaId, venta);
      
      // Guardar offline
      if (window.offlineManager) {
        await window.offlineManager.saveData('ventas', ventaId, venta);
      } else {
        this.saveToLocalStorage();
      }
      
      // Intentar sincronizar con Firebase
      if (this.db && this.currentUser) {
        try {
          await this.db.collection('ventas').doc(ventaId).set({
            fecha: venta.fecha,
            cliente: venta.cliente,
            cantidad: venta.cantidad,
            precioKg: venta.precioKg,
            total: venta.total,
            metodoPago: venta.metodoPago,
            estado: venta.estado,
            fincaId: this.fincaId,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            usuarioId: this.currentUser.uid
          });
          window.notificationManager?.success('Venta guardada en la nube');
        } catch (fbError) {
          console.warn('Error sincronizando con Firebase:', fbError);
          window.notificationManager?.warning('Venta guardada localmente, se sincronizará cuando haya conexión');
        }
      }
      
      // Recalcular estadísticas
      this.calcularEstadisticas();
      
      // Notificar actualización
      this.broadcastUpdate('venta_creada', venta);
      
      return venta;
      
    } catch (error) {
      console.error('Error registrando venta:', error);
      window.notificationManager?.error('Error al registrar la venta');
      throw error;
    }
  }

  async registrarVentaDetallada(datos) {
    try {
      const ventaId = this.generateId();
      const fechaActual = new Date().toISOString();
      
      const venta = {
        id: ventaId,
        fecha: datos.fecha,
        clienteId: datos.clienteId,
        cliente: await this.getNombreCliente(datos.clienteId),
        cantidad: Number(datos.cantidad),
        precioKg: Number(datos.precioKg),
        descuento: Number(datos.descuento) || 0,
        transporte: Number(datos.transporte) || 0,
        total: Number(datos.total),
        metodoPago: datos.metodoPago,
        fechaPago: datos.fechaPago,
        referencia: datos.referencia,
        direccionEntrega: datos.direccionEntrega,
        observaciones: datos.observaciones,
        estado: 'completada',
        createdAt: fechaActual,
        updatedAt: fechaActual
      };
      
      // Guardar
      this.ventas.set(ventaId, venta);
      
      if (window.offlineManager) {
        await window.offlineManager.saveData('ventas', ventaId, venta);
      } else {
        this.saveToLocalStorage();
      }
      
      // Recalcular
      this.calcularEstadisticas();
      this.broadcastUpdate('venta_detallada_creada', venta);
      
      return venta;
      
    } catch (error) {
      console.error('Error registrando venta detallada:', error);
      window.notificationManager?.error('Error al registrar la venta detallada');
      throw error;
    }
  }

  async actualizarVenta(ventaId, datos) {
    try {
      const ventaExistente = this.ventas.get(ventaId);
      if (!ventaExistente) {
        throw new Error('Venta no encontrada');
      }

      const ventaActualizada = {
        ...ventaExistente,
        ...datos,
        updatedAt: new Date().toISOString()
      };

      // Actualizar en memoria
      this.ventas.set(ventaId, ventaActualizada);

      // Guardar offline
      if (window.offlineManager) {
        await window.offlineManager.saveData('ventas', ventaId, ventaActualizada);
      } else {
        this.saveToLocalStorage();
      }

      // Intentar sincronizar con Firebase
      if (this.db && this.currentUser) {
        try {
          await this.db.collection('ventas').doc(ventaId).update({
            ...datos,
            fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
          });
          window.notificationManager?.success('Venta actualizada correctamente');
        } catch (fbError) {
          console.warn('Error sincronizando actualización:', fbError);
          window.notificationManager?.warning('Venta actualizada localmente');
        }
      }

      // Recalcular estadísticas
      this.calcularEstadisticas();
      
      // Notificar actualización
      this.broadcastUpdate('venta_actualizada', ventaActualizada);

      return ventaActualizada;

    } catch (error) {
      console.error('Error actualizando venta:', error);
      window.notificationManager?.error('Error al actualizar la venta');
      throw error;
    }
  }

  async eliminarVenta(ventaId) {
    try {
      const venta = this.ventas.get(ventaId);
      if (!venta) {
        throw new Error('Venta no encontrada');
      }

      // Eliminar de memoria
      this.ventas.delete(ventaId);

      // Eliminar offline
      if (window.offlineManager) {
        await window.offlineManager.deleteData('ventas', ventaId);
      } else {
        this.saveToLocalStorage();
      }

      // Intentar eliminar de Firebase
      if (this.db && this.currentUser) {
        try {
          await this.db.collection('ventas').doc(ventaId).delete();
          window.notificationManager?.success('Venta eliminada correctamente');
        } catch (fbError) {
          console.warn('Error eliminando de Firebase:', fbError);
          window.notificationManager?.warning('Venta eliminada localmente');
        }
      }

      // Recalcular estadísticas
      this.calcularEstadisticas();
      
      // Notificar eliminación
      this.broadcastUpdate('venta_eliminada', { id: ventaId });

      return true;

    } catch (error) {
      console.error('Error eliminando venta:', error);
      window.notificationManager?.error('Error al eliminar la venta');
      throw error;
    }
  }

  // ==========================================
  // CÁLCULOS Y ESTADÍSTICAS
  // ==========================================

  calcularEstadisticas() {
    const ventasDelMes = this.getVentasDelMes();
    
    this.estadisticas.ingresosDelMes = ventasDelMes.reduce((sum, v) => sum + v.total, 0);
    this.estadisticas.cantidadVendida = ventasDelMes.reduce((sum, v) => sum + v.cantidad, 0);
    this.estadisticas.precioPromedio = ventasDelMes.length > 0 
      ? ventasDelMes.reduce((sum, v) => sum + v.precioKg, 0) / ventasDelMes.length
      : 0;
    
    // Calcular tendencia (comparar con mes anterior)
    const ventasMesAnterior = this.getVentasMesAnterior();
    const ingresosMesAnterior = ventasMesAnterior.reduce((sum, v) => sum + v.total, 0);
    
    if (ingresosMesAnterior > 0) {
      this.estadisticas.tendencia = ((this.estadisticas.ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100;
    } else {
      this.estadisticas.tendencia = this.estadisticas.ingresosDelMes > 0 ? 100 : 0;
    }
    
    // Margen estimado (simplificado)
    this.estadisticas.margenGanancia = 35; // Placeholder
  }

  calcularMetricas() {
    this.calcularEstadisticas();
    return {
      ingresosDelMes: this.estadisticas.ingresosDelMes,
      cantidadVendida: this.estadisticas.cantidadVendida,
      precioPromedio: this.estadisticas.precioPromedio,
      margenGanancia: this.estadisticas.margenGanancia,
      tendencia: this.estadisticas.tendencia
    };
  }

  // ==========================================
  // OBTENCIÓN DE DATOS
  // ==========================================

  getVentasDelMes() {
    const inicio = this.getStartOfMonth();
    const fin = this.getEndOfMonth();
    
    return Array.from(this.ventas.values()).filter(venta => {
      const fechaVenta = venta.fecha;
      return fechaVenta >= inicio && fechaVenta <= fin;
    });
  }

  getVentasMesAnterior() {
    const inicioMesAnterior = this.getStartOfPreviousMonth();
    const finMesAnterior = this.getEndOfPreviousMonth();
    
    return Array.from(this.ventas.values()).filter(venta => {
      const fechaVenta = venta.fecha;
      return fechaVenta >= inicioMesAnterior && fechaVenta <= finMesAnterior;
    });
  }

  obtenerVentasFiltradas() {
    let ventas = Array.from(this.ventas.values());
    
    // Aplicar filtros
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
    const ahora = new Date();
    let fechaInicio;
    
    switch (this.filtrosActivos.periodo) {
      case 'hoy':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString().split('T')[0];
        break;
      case 'semana':
        fechaInicio = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'mes':
        fechaInicio = this.getStartOfMonth();
        break;
      case 'trimestre':
        fechaInicio = new Date(ahora.getFullYear(), Math.floor(ahora.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
        break;
      case 'ano':
        fechaInicio = new Date(ahora.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        fechaInicio = this.getStartOfMonth();
    }
    
    ventas = ventas.filter(v => v.fecha >= fechaInicio);
    
    return ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  obtenerClientesRecientes() {
    const ventasRecientes = Array.from(this.ventas.values())
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 10);
    
    const clientesMap = new Map();
    
    ventasRecientes.forEach(venta => {
      if (!clientesMap.has(venta.clienteId)) {
        const cliente = this.clientes.get(venta.clienteId) || {
          nombre: venta.cliente,
          totalCompras: 0
        };
        
        clientesMap.set(venta.clienteId, {
          id: venta.clienteId,
          nombre: cliente.nombre || venta.cliente,
          totalCompras: this.calcularTotalComprasCliente(venta.clienteId),
          ultimaCompra: venta.cantidad + ' kg',
          fechaUltimaCompra: venta.fecha
        });
      }
    });
    
    return Array.from(clientesMap.values()).slice(0, 5);
  }

  obtenerListaClientes() {
    return Array.from(this.clientes.values()).map(cliente => ({
      id: cliente.id,
      nombre: cliente.nombre
    }));
  }

  obtenerCliente(clienteId) {
    return this.clientes.get(clienteId);
  }

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================

  async getNombreCliente(clienteId) {
    const cliente = this.clientes.get(clienteId);
    return cliente ? cliente.nombre : 'Cliente desconocido';
  }

  calcularTotalComprasCliente(clienteId) {
    return Array.from(this.ventas.values())
      .filter(v => v.clienteId === clienteId)
      .reduce((sum, v) => sum + v.total, 0);
  }

  aplicarFiltros(filtros) {
    this.filtrosActivos = { ...this.filtrosActivos, ...filtros };
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
      localStorage.setItem('finca_clientes', JSON.stringify(Array.from(this.clientes.values())));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  // ==========================================
  // FUNCIONES AVANZADAS
  // ==========================================

  async identificarOportunidades() {
    // Simulación de identificación de oportunidades
    return [
      {
        titulo: 'Cliente frecuente sin pedido reciente',
        descripcion: 'Juan Pérez no ha realizado pedidos en 2 semanas',
        valorPotencial: 1500,
        icono: 'fa-user-clock'
      },
      {
        titulo: 'Precio por debajo del mercado',
        descripcion: 'Aumentar precio en 10% mantendría competitividad',
        valorPotencial: 800,
        icono: 'fa-chart-line'
      },
      {
        titulo: 'Demanda alta calidad premium',
        descripcion: 'Oportunidad de venta de limones AAA',
        valorPotencial: 2200,
        icono: 'fa-star'
      }
    ];
  }

  async generarPrediccionesIA() {
    // Simulación de predicciones ML
    return [
      {
        titulo: 'Ingresos próximo mes',
        valor: 'Q 45,200',
        confianza: 85,
        descripcion: 'Basado en tendencia actual',
        color: '#22c55e'
      },
      {
        titulo: 'Mejor día para vender',
        valor: 'Viernes',
        confianza: 78,
        descripcion: 'Análisis de patrones históricos',
        color: '#3b82f6'
      },
      {
        titulo: 'Cliente más rentable',
        valor: 'Supermercado Central',
        confianza: 92,
        descripcion: 'Mayor volumen y frecuencia',
        color: '#f59e0b'
      }
    ];
  }

  async obtenerDatosGraficos(periodo) {
    const ventas = this.obtenerVentasPorPeriodo(periodo);
    
    return {
      ventas: {
        labels: this.generarLabelsGrafico(periodo),
        data: this.generarDatosVentasGrafico(ventas, periodo)
      },
      clientes: {
        labels: this.obtenerTopClientes().map(c => c.nombre),
        data: this.obtenerTopClientes().map(c => c.total)
      }
    };
  }

  obtenerVentasPorPeriodo(periodo) {
    // Implementación simplificada
    return Array.from(this.ventas.values());
  }

  generarLabelsGrafico(periodo) {
    const labels = [];
    const ahora = new Date();
    
    if (periodo === 'semana') {
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
        labels.push(fecha.toLocaleDateString('es', { weekday: 'short' }));
      }
    } else if (periodo === 'mes') {
      for (let i = 29; i >= 0; i -= 5) {
        const fecha = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
        labels.push(fecha.getDate().toString());
      }
    }
    
    return labels;
  }

  generarDatosVentasGrafico(ventas, periodo) {
    // Simulación de datos para el gráfico
    const datos = [];
    const numPuntos = periodo === 'semana' ? 7 : 6;
    
    for (let i = 0; i < numPuntos; i++) {
      datos.push(Math.random() * 5000 + 2000);
    }
    
    return datos;
  }

  obtenerTopClientes() {
    const clientesVentas = new Map();
    
    Array.from(this.ventas.values()).forEach(venta => {
      if (!clientesVentas.has(venta.clienteId)) {
        clientesVentas.set(venta.clienteId, {
          nombre: venta.cliente,
          total: 0
        });
      }
      clientesVentas.get(venta.clienteId).total += venta.total;
    });
    
    return Array.from(clientesVentas.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  // ==========================================
  // FUNCIONES DE EXPORTACIÓN
  // ==========================================

  exportarVentas() {
    try {
      const ventas = this.obtenerVentasFiltradas();
      const csv = this.convertirACSV(ventas);
      this.descargarArchivo(csv, 'ventas-export.csv', 'text/csv');
      window.notificationManager?.success('Ventas exportadas correctamente');
    } catch (error) {
      console.error('Error exportando ventas:', error);
      window.notificationManager?.error('Error al exportar ventas');
    }
  }

  convertirACSV(ventas) {
    const headers = ['Fecha', 'Cliente', 'Cantidad (kg)', 'Precio/kg', 'Total', 'Método Pago', 'Estado'];
    const rows = ventas.map(venta => [
      venta.fecha,
      venta.cliente,
      venta.cantidad,
      venta.precioKg,
      venta.total,
      venta.metodoPago,
      venta.estado
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  descargarArchivo(contenido, nombreArchivo, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generarFactura() {
    // Implementación básica de facturación
    console.log('Generando factura...');
    window.notificationManager?.info('Función de facturación en desarrollo');
  }

  generarReporte() {
    try {
      const reporte = this.crearReporteVentas();
      this.descargarArchivo(reporte, 'reporte-ventas.html', 'text/html');
      window.notificationManager?.success('Reporte generado correctamente');
    } catch (error) {
      console.error('Error generando reporte:', error);
      window.notificationManager?.error('Error al generar reporte');
    }
  }

  crearReporteVentas() {
    const metricas = this.calcularMetricas();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Ventas - Finca La Herradura</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Ventas</h1>
          <p>Finca La Herradura - ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="metric">Ingresos del Mes: Q ${metricas.ingresosDelMes.toLocaleString()}</div>
        <div class="metric">Cantidad Vendida: ${metricas.cantidadVendida.toLocaleString()} kg</div>
        <div class="metric">Precio Promedio: Q ${metricas.precioPromedio.toFixed(2)}</div>
        <div class="metric">Margen de Ganancia: ${metricas.margenGanancia}%</div>
      </body>
      </html>
    `;
  }

  // ==========================================
  // DATOS DE EJEMPLO
  // ==========================================

  generarDatosEjemplo() {
    console.log('Generando datos de ejemplo...');
    
    // Generar clientes de ejemplo
    const clientesEjemplo = [
      { id: 'cli1', nombre: 'Supermercado Central', contacto: '2234-5678', direccion: 'Guatemala' },
      { id: 'cli2', nombre: 'Frutas del Valle', contacto: '2345-6789', direccion: 'Antigua Guatemala' },
      { id: 'cli3', nombre: 'Mercado San Juan', contacto: '2456-7890', direccion: 'Mixco' },
      { id: 'cli4', nombre: 'Distribuidora López', contacto: '2567-8901', direccion: 'Villa Nueva' },
      { id: 'cli5', nombre: 'Exportadora Maya', contacto: '2678-9012', direccion: 'Puerto Quetzal' }
    ];
    
    clientesEjemplo.forEach(cliente => {
      this.clientes.set(cliente.id, cliente);
    });
    
    // Generar ventas de ejemplo
    for (let i = 0; i < 20; i++) {
      const cliente = clientesEjemplo[Math.floor(Math.random() * clientesEjemplo.length)];
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
        estado: 'completada'
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
  }
}

// ==========================================
// FUNCIONES GLOBALES PARA VENTAS.HTML
// ==========================================

// Función global para mostrar notificaciones (compatibilidad)
function mostrarNotificacion(mensaje, tipo = 'info') {
  if (window.notificationManager) {
    window.notificationManager.show(mensaje, tipo);
  } else {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
  }
}

// Función para actualizar métricas
function actualizarMetricas() {
  if (window.ventasManager) {
    const metricas = window.ventasManager.calcularMetricas();
    
    // Actualizar elementos del DOM
    const elementos = {
      'ingresosDelMes': `Q ${metricas.ingresosDelMes.toLocaleString()}`,
      'cantidadVendida': `${metricas.cantidadVendida.toLocaleString()} kg`,
      'precioPromedio': `Q ${metricas.precioPromedio.toFixed(2)}`,
      'margenGanancia': `${metricas.margenGanancia}%`
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.textContent = valor;
      }
    });
  }
}

// ==========================================
// INICIALIZACIÓN
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
  
  console.log('💰 Sistema de ventas disponible globalmente');
  
  // Hacer funciones disponibles globalmente para compatibilidad
  window.mostrarNotificacion = mostrarNotificacion;
  window.actualizarMetricas = actualizarMetricas;
});

// Exportar para otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VentasManager, NotificationManager };
}