/* ========================================
   FINCA LA HERRADURA - SISTEMA DE AUTENTICACIÓN
   Sistema integrado con Firebase y gestión offline v2
   ======================================== */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.userPermissions = {};
    this.isOffline = !navigator.onLine;
    this.offlineData = this.loadOfflineData();
    
    // Referencias a Firebase
    this.auth = null;
    this.db = null;
    
    // Estado de autenticación
    this.isAuthenticated = false;
    this.isInitialized = false;
    
    // Configurar listeners de conexión
    this.setupConnectionListeners();
    
    // Esperar Firebase y luego inicializar
    this.waitForFirebase().then(() => {
      this.init();
    }).catch(error => {
      console.error('Error esperando Firebase:', error);
      this.initOfflineMode();
    });
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  async waitForFirebase() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50;
      let attempts = 0;
      
      const checkFirebase = () => {
        attempts++;
        
        if (window.firebase && window.auth && window.db) {
          this.auth = window.auth;
          this.db = window.db;
          console.log('✅ Firebase disponible para Auth');
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(checkFirebase, 100);
        } else {
          reject(new Error('Firebase timeout - continuando en modo offline'));
        }
      };
      
      checkFirebase();
    });
  }

  async init() {
    try {
      console.log('🔐 Inicializando sistema de autenticación...');
      
      if (this.auth) {
        // Configurar listener de estado de auth
        this.auth.onAuthStateChanged(async (user) => {
          await this.handleAuthStateChange(user);
        });
        
        // Configurar persistencia
        await this.setupPersistence();
      }
      
      this.isInitialized = true;
      console.log('✅ Sistema de autenticación inicializado');
      
    } catch (error) {
      console.error('❌ Error inicializando autenticación:', error);
      this.initOfflineMode();
    }
  }

  initOfflineMode() {
    console.log('📱 Inicializando modo offline para autenticación');
    
    // Intentar restaurar sesión offline
    if (this.offlineData.user) {
      this.handleOfflineLogin();
    }
    
    this.isInitialized = true;
  }

  setupConnectionListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  async setupPersistence() {
    if (!this.auth) return;
    
    try {
      // Usar persistencia local por defecto
      await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (error) {
      console.warn('No se pudo configurar persistencia:', error);
    }
  }

  // ==========================================
  // GESTIÓN DE ESTADO DE AUTENTICACIÓN
  // ==========================================

  async handleAuthStateChange(user) {
    try {
      if (user) {
        await this.handleUserLogin(user);
      } else {
        this.handleUserLogout();
      }
    } catch (error) {
      console.error('Error manejando cambio de estado:', error);
    }
  }

  async handleUserLogin(user) {
    try {
      console.log('👤 Usuario autenticado:', user.email || user.uid);
      
      this.currentUser = user;
      this.isAuthenticated = true;
      
      // Cargar datos del usuario desde Firestore
      if (this.db && !this.isOffline) {
        await this.loadUserData(user.uid);
      } else {
        // Usar datos offline si están disponibles
        this.loadOfflineUserData();
      }
      
      // Actualizar último acceso
      await this.updateLastAccess(user.uid);
      
      // Guardar datos offline
      this.saveUserDataOffline({
        uid: user.uid,
        email: user.email || 'usuario-anonimo',
        role: this.userRole || 'trabajador',
        name: this.getUserDisplayName(),
        lastLogin: new Date().toISOString(),
        isAnonymous: user.isAnonymous
      });
      
      // Notificar login exitoso
      this.broadcastAuthUpdate('login', {
        user: this.currentUser,
        role: this.userRole,
        permissions: this.userPermissions
      });
      
      // Redirigir si es necesario
      this.handleLoginRedirect();
      
    } catch (error) {
      console.error('Error en handleUserLogin:', error);
      
      // Si falla, intentar modo offline
      if (this.isOffline && this.offlineData.user) {
        this.handleOfflineLogin();
      } else {
        this.showError('Error al cargar datos del usuario');
      }
    }
  }

  async loadUserData(userId) {
    try {
      const userDoc = await this.db.collection('usuarios').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        this.userRole = userData.rol || userData.role || 'trabajador';
        this.userPermissions = userData.permisos || userData.permissions || this.getDefaultPermissions();
        
        console.log('📋 Datos de usuario cargados:', {
          role: this.userRole,
          permissions: Object.keys(this.userPermissions).length
        });
        
      } else {
        // Usuario no existe, crear con permisos básicos
        console.log('🆕 Creando usuario con permisos básicos');
        await this.createBasicUser(userId);
      }
      
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
      // Usar valores por defecto
      this.userRole = 'trabajador';
      this.userPermissions = this.getDefaultPermissions();
    }
  }

  async createBasicUser(userId) {
    try {
      const userEmail = this.currentUser.email || `usuario-${userId.substring(0, 8)}@fincalaherradura.local`;
      const userName = this.currentUser.displayName || 
                       (this.currentUser.email ? this.currentUser.email.split('@')[0] : `Usuario-${userId.substring(0, 8)}`);
      
      const newUserData = {
        nombre: userName,
        email: userEmail,
        rol: 'trabajador',
        telefono: '',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        activo: true,
        primerLogin: true,
        esAnonimo: this.currentUser.isAnonymous,
        permisos: this.getDefaultPermissions(),
        fincaId: 'finca_la_herradura'
      };
      
      await this.db.collection('usuarios').doc(userId).set(newUserData);
      
      this.userRole = 'trabajador';
      this.userPermissions = this.getDefaultPermissions();
      
      console.log('✅ Usuario básico creado');
      
    } catch (error) {
      console.error('Error creando usuario básico:', error);
      // Continuar con valores por defecto
      this.userRole = 'trabajador';
      this.userPermissions = this.getDefaultPermissions();
    }
  }

  loadOfflineUserData() {
    if (this.offlineData.user) {
      this.userRole = this.offlineData.user.role || 'trabajador';
      this.userPermissions = this.offlineData.user.permissions || this.getDefaultPermissions();
    } else {
      this.userRole = 'trabajador';
      this.userPermissions = this.getDefaultPermissions();
    }
  }

  handleUserLogout() {
    console.log('👋 Usuario cerró sesión');
    
    this.currentUser = null;
    this.userRole = null;
    this.userPermissions = {};
    this.isAuthenticated = false;
    
    // Limpiar datos offline (opcional)
    if (!this.shouldRememberUser()) {
      this.clearOfflineData();
    }
    
    // Notificar logout
    this.broadcastAuthUpdate('logout');
    
    // Redirigir a login si es necesario
    this.handleLogoutRedirect();
  }

  handleOfflineLogin() {
    if (!this.offlineData.user) return;
    
    console.log('📱 Restaurando sesión offline');
    
    this.isAuthenticated = true;
    this.userRole = this.offlineData.user.role;
    this.userPermissions = this.offlineData.user.permissions || this.getDefaultPermissions();
    
    // Simular usuario offline
    this.currentUser = {
      uid: this.offlineData.user.uid,
      email: this.offlineData.user.email,
      isAnonymous: this.offlineData.user.isAnonymous || false,
      offline: true
    };
    
    this.broadcastAuthUpdate('offline_login', {
      user: this.currentUser,
      role: this.userRole
    });
  }

  // ==========================================
  // MÉTODOS PÚBLICOS DE AUTENTICACIÓN
  // ==========================================

  async login(email, password, rememberMe = false) {
    try {
      this.showLoading(true);
      
      // Validaciones básicas
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }
      
      if (!this.validateEmail(email)) {
        throw new Error('Formato de email inválido');
      }
      
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      
      // Si no hay conexión, intentar login offline
      if (this.isOffline) {
        return this.tryOfflineLogin(email, password);
      }
      
      if (!this.auth) {
        throw new Error('Sistema de autenticación no disponible');
      }
      
      // Intentar login con Firebase
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      
      // Guardar preferencias
      if (rememberMe) {
        this.saveCredentials(email);
      }
      
      // Registrar intento exitoso
      await this.logLoginAttempt(userCredential.user.uid, true);
      
      this.showSuccess('Inicio de sesión exitoso');
      return { success: true, user: userCredential.user };
      
    } catch (error) {
      console.error('Error en login:', error);
      
      let errorMessage = this.getErrorMessage(error);
      
      // Intentar login offline como fallback
      if (error.code === 'auth/network-request-failed' || this.isOffline) {
        const offlineResult = this.tryOfflineLogin(email, password);
        if (offlineResult.success) {
          return offlineResult;
        }
        errorMessage = 'Sin conexión y credenciales offline no válidas';
      }
      
      // Registrar intento fallido
      await this.logLoginAttempt(null, false, errorMessage);
      
      this.showError(errorMessage);
      throw new Error(errorMessage);
      
    } finally {
      this.showLoading(false);
    }
  }

  async logout() {
    try {
      this.showLoading(true);
      
      // Registrar logout si hay usuario
      if (this.currentUser && !this.isOffline) {
        await this.updateLastLogout(this.currentUser.uid);
      }
      
      // Cerrar sesión en Firebase
      if (this.auth && this.currentUser && !this.currentUser.offline) {
        await this.auth.signOut();
      } else {
        // Logout offline
        this.handleUserLogout();
      }
      
      this.showSuccess('Sesión cerrada correctamente');
      return { success: true };
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.showError('Error al cerrar sesión');
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  async signUpAnonymously() {
    try {
      if (!this.auth) {
        throw new Error('Autenticación no disponible');
      }
      
      const userCredential = await this.auth.signInAnonymously();
      console.log('👤 Usuario anónimo creado');
      
      return { success: true, user: userCredential.user };
      
    } catch (error) {
      console.error('Error creando usuario anónimo:', error);
      throw error;
    }
  }

  // ==========================================
  // GESTIÓN DE PERMISOS
  // ==========================================

  hasPermission(permission) {
    // Los administradores tienen todos los permisos
    if (this.userRole === 'administrador') {
      return true;
    }
    
    // Verificar permiso específico
    return this.userPermissions[permission] === true;
  }

  getUserRole() {
    return this.userRole;
  }

  getUserPermissions() {
    return { ...this.userPermissions };
  }

  isAdmin() {
    return this.userRole === 'administrador';
  }

  isWorker() {
    return this.userRole === 'trabajador';
  }

  getDefaultPermissions() {
    return {
      arboles: true,
      produccion: true,
      riego: true,
      clima: true,
      recordatorios: true,
      tratamientos: false,
      gastos: false,
      ventas: false,
      usuarios: false
    };
  }

  // ==========================================
  // GESTIÓN DE USUARIOS (Solo Admin)
  // ==========================================

  async createWorker(workerData) {
    if (!this.isAdmin()) {
      throw new Error('Solo los administradores pueden crear trabajadores');
    }
    
    if (!this.auth || !this.db) {
      throw new Error('Servicios no disponibles');
    }
    
    try {
      this.showLoading(true);
      
      // Crear usuario en Firebase Auth
      const tempPassword = this.generateTemporaryPassword();
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        workerData.email, 
        tempPassword
      );
      
      const userId = userCredential.user.uid;
      
      // Crear documento en Firestore
      const userData = {
        nombre: workerData.nombre,
        email: workerData.email,
        rol: 'trabajador',
        telefono: workerData.telefono || '',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        creadoPor: this.currentUser.uid,
        activo: true,
        primerLogin: true,
        passwordTemporal: tempPassword,
        permisos: workerData.permisos || this.getDefaultPermissions(),
        fincaId: 'finca_la_herradura'
      };
      
      await this.db.collection('usuarios').doc(userId).set(userData);
      
      this.showSuccess(`Trabajador ${workerData.nombre} creado exitosamente`);
      
      return {
        success: true,
        userId: userId,
        temporalPassword: tempPassword
      };
      
    } catch (error) {
      console.error('Error creando trabajador:', error);
      this.showError('Error al crear trabajador: ' + error.message);
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  async updateWorkerPermissions(workerId, permissions) {
    if (!this.isAdmin()) {
      throw new Error('Solo los administradores pueden modificar permisos');
    }
    
    if (!this.db) {
      throw new Error('Base de datos no disponible');
    }
    
    try {
      await this.db.collection('usuarios').doc(workerId).update({
        permisos: permissions,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
        actualizadoPor: this.currentUser.uid
      });
      
      this.showSuccess('Permisos actualizados correctamente');
      return { success: true };
      
    } catch (error) {
      console.error('Error actualizando permisos:', error);
      this.showError('Error actualizando permisos');
      throw error;
    }
  }

  // ==========================================
  // GESTIÓN OFFLINE Y CONEXIÓN
  // ==========================================

  handleOnline() {
    console.log('🌐 Conexión restaurada');
    this.isOffline = false;
    this.showInfo('Conexión restaurada. Sincronizando datos...');
    
    // Intentar sincronizar datos pendientes
    this.syncOfflineData();
    
    this.broadcastAuthUpdate('connection_restored');
  }

  handleOffline() {
    console.log('📱 Modo offline activado');
    this.isOffline = true;
    this.showInfo('Modo offline activado. Los datos se sincronizarán cuando vuelva la conexión.');
    
    this.broadcastAuthUpdate('connection_lost');
  }

  tryOfflineLogin(email, password) {
    const offlineUser = this.offlineData.user;
    
    if (offlineUser && offlineUser.email === email) {
      // En producción, aquí validarías la contraseña de forma segura
      // Por ahora, permitir si coincide el email
      
      this.handleOfflineLogin();
      this.showInfo('Acceso offline - Funcionalidad limitada');
      
      return {
        success: true,
        user: this.currentUser,
        offline: true
      };
    }
    
    return {
      success: false,
      error: 'Credenciales offline no válidas'
    };
  }

  async syncOfflineData() {
    // Implementar sincronización de datos pendientes
    if (window.offlineManager) {
      try {
        await window.offlineManager.syncPendingData();
        console.log('✅ Datos sincronizados correctamente');
      } catch (error) {
        console.error('Error sincronizando datos:', error);
      }
    }
  }

  shouldRememberUser() {
    return localStorage.getItem('finca_remember_user') === 'true';
  }

  // ==========================================
  // PERSISTENCIA Y ALMACENAMIENTO
  // ==========================================

  saveUserDataOffline(userData) {
    this.offlineData.user = userData;
    this.offlineData.lastUpdate = Date.now();
    localStorage.setItem('finca_offline_data', JSON.stringify(this.offlineData));
  }

  loadOfflineData() {
    try {
      const saved = localStorage.getItem('finca_offline_data');
      return saved ? JSON.parse(saved) : { user: null, pendingSync: [] };
    } catch (error) {
      console.warn('Error cargando datos offline:', error);
      return { user: null, pendingSync: [] };
    }
  }

  clearOfflineData() {
    localStorage.removeItem('finca_offline_data');
    localStorage.removeItem('finca_remembered_email');
    localStorage.removeItem('finca_remember_user');
    this.offlineData = { user: null, pendingSync: [] };
  }

  saveCredentials(email) {
    localStorage.setItem('finca_remembered_email', email);
    localStorage.setItem('finca_remember_user', 'true');
  }

  getRememberedEmail() {
    return localStorage.getItem('finca_remembered_email') || '';
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generateTemporaryPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '123'; // Asegurar que cumpla requisitos mínimos
  }

  getUserDisplayName() {
    if (!this.currentUser) return 'Usuario';
    
    return this.currentUser.displayName || 
           (this.currentUser.email ? this.currentUser.email.split('@')[0] : 'Usuario');
  }

  getErrorMessage(error) {
    const errorMessages = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuario deshabilitado',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      'auth/weak-password': 'La contraseña es muy débil',
      'auth/email-already-in-use': 'El email ya está en uso'
    };
    
    return errorMessages[error.code] || error.message;
  }

  // ==========================================
  // LOGGING Y AUDITORÍA
  // ==========================================

  async updateLastAccess(userId) {
    if (!this.db || this.isOffline) return;
    
    try {
      await this.db.collection('usuarios').doc(userId).update({
        ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp(),
        dispositivoAcceso: navigator.userAgent,
        ipAcceso: await this.getUserIP()
      });
    } catch (error) {
      console.warn('Error actualizando último acceso:', error);
    }
  }

  async updateLastLogout(userId) {
    if (!this.db || this.isOffline) return;
    
    try {
      await this.db.collection('usuarios').doc(userId).update({
        ultimoLogout: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.warn('Error actualizando logout:', error);
    }
  }

  async logLoginAttempt(userId, success, error = null) {
    try {
      const logData = {
        userId: userId,
        email: this.currentUser?.email || 'unknown',
        success: success,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: await this.getUserIP(),
        error: error,
        offline: this.isOffline
      };
      
      // Guardar en almacenamiento local para sync posterior
      if (window.offlineManager) {
        await window.offlineManager.saveData('loginLogs', Date.now().toString(), logData);
      }
      
      // Si hay conexión, intentar sync inmediato
      if (!this.isOffline && this.db) {
        await this.db.collection('loginLogs').add(logData);
      }
      
    } catch (error) {
      console.warn('Error logging login attempt:', error);
    }
  }

  async getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json', { 
        timeout: 5000 
      });
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  // ==========================================
  // NAVEGACIÓN Y REDIRECCIÓN - CORREGIDO
  // ==========================================

  handleLoginRedirect() {
    // Redirigir según el rol del usuario
    const targetPage = this.getTargetPageForRole();
    const currentPage = window.location.pathname;
    
    // Solo redirigir si estamos en login.html
    if (currentPage.includes('login.html') && targetPage !== currentPage) {
      setTimeout(() => {
        window.location.href = targetPage;
      }, 1000);
    }
  }

  handleLogoutRedirect() {
    // CORRECCIÓN: Incluir clima.html en páginas protegidas
    const currentPage = window.location.pathname;
    const protectedPages = [
      '/clima.html',      // AGREGADO
      '/produccion.html', 
      '/gastos.html', 
      '/ventas.html', 
      '/usuarios.html',
      '/tratamientos.html',
      '/recordatorios.html'
    ];
    
    // NO redirigir desde index.html o dashboard
    if (currentPage.includes('index.html') || 
        currentPage === '/' || 
        currentPage.includes('dashboard')) {
      return; // No hacer nada, permitir acceso al dashboard
    }
    
    // Solo redirigir desde páginas protegidas
    if (protectedPages.some(page => currentPage.includes(page))) {
      console.log('Redirigiendo a login desde página protegida:', currentPage);
      window.location.href = '/login.html';
    }
  }

  getTargetPageForRole() {
    switch (this.userRole) {
      case 'administrador':
        return '/index.html';
      case 'trabajador':
        return '/produccion.html';
      default:
        return '/index.html';
    }
  }

  // ==========================================
  // INTERFAZ DE USUARIO
  // ==========================================

  showLoading(show) {
    const event = new CustomEvent('authLoading', {
      detail: { loading: show }
    });
    window.dispatchEvent(event);
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showInfo(message) {
    this.showMessage(message, 'info');
  }

  showMessage(message, type) {
    const event = new CustomEvent('authMessage', {
      detail: { message, type, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
    
    // También loggear en consola
    console.log(`[AUTH-${type.toUpperCase()}] ${message}`);
  }

  // ==========================================
  // COMUNICACIÓN
  // ==========================================

  broadcastAuthUpdate(action, data = {}) {
    const event = new CustomEvent('authUpdate', {
      detail: {
        action,
        data,
        timestamp: Date.now(),
        user: this.currentUser,
        role: this.userRole,
        permissions: this.userPermissions,
        isAuthenticated: this.isAuthenticated
      }
    });
    window.dispatchEvent(event);
  }

  // ==========================================
  // API PÚBLICA
  // ==========================================

  getCurrentUser() {
    return this.currentUser;
  }

  getAuthState() {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.currentUser,
      role: this.userRole,
      permissions: this.userPermissions,
      isOffline: this.isOffline,
      isInitialized: this.isInitialized
    };
  }

  async waitForAuth() {
    return new Promise((resolve) => {
      if (this.isInitialized) {
        resolve(this.getAuthState());
        return;
      }
      
      const checkInit = () => {
        if (this.isInitialized) {
          resolve(this.getAuthState());
        } else {
          setTimeout(checkInit, 100);
        }
      };
      
      checkInit();
    });
  }
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

let authManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  authManager = new AuthManager();
  window.authManager = authManager;
  
  console.log('🔐 Sistema de autenticación disponible globalmente');
});

// Exportar para otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}
