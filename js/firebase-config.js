/* ========================================
   FIREBASE CONFIG OPTIMIZADO - FINCA LA HERRADURA
   Reemplaza tu firebase-config.js con este archivo
   Evita inicializaciones duplicadas y maneja errores
   ======================================== */

// ===========================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ===========================================

const firebaseConfig = {
  apiKey: "AIzaSyDm_DenNbuG-zLS-8tupO8BZEpfo5z3MY8",
  authDomain: "fincalaherradura-c5229.firebaseapp.com",
  projectId: "fincalaherradura-c5229",
  storageBucket: "fincalaherradura-c5229.firebasestorage.app",
  messagingSenderId: "453253173599",
  appId: "1:453253173599:web:f5f31e55fc1a93e7f5a6ea"
};

// Estado de inicialización singleton
const FirebaseManager = {
  initialized: false,
  initializing: false,
  initPromise: null,
  attempts: 0,
  maxAttempts: 3,
  app: null,
  auth: null,
  db: null,
  storage: null,
  
  // Callbacks para eventos
  onReady: [],
  onError: []
};

// ===========================================
// FUNCIONES DE INICIALIZACIÓN
// ===========================================

/**
 * Inicializa Firebase una sola vez
 */
async function initializeFirebase() {
  // Si ya está inicializado, devolver referencias existentes
  if (FirebaseManager.initialized) {
    return {
      app: FirebaseManager.app,
      auth: FirebaseManager.auth,
      db: FirebaseManager.db,
      storage: FirebaseManager.storage
    };
  }

  // Si está en proceso de inicialización, esperar a que termine
  if (FirebaseManager.initializing && FirebaseManager.initPromise) {
    return FirebaseManager.initPromise;
  }

  // Marcar como inicializando
  FirebaseManager.initializing = true;
  FirebaseManager.attempts++;

  console.log(`🚀 Iniciando Firebase... (intento ${FirebaseManager.attempts})`);

  FirebaseManager.initPromise = new Promise(async (resolve, reject) => {
    try {
      // Verificar que Firebase SDK esté disponible
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK no está cargado');
      }

      // Inicializar la app de Firebase
      if (firebase.apps.length === 0) {
        FirebaseManager.app = firebase.initializeApp(firebaseConfig);
        console.log('📱 Nueva app Firebase inicializada');
      } else {
        FirebaseManager.app = firebase.apps[0];
        console.log('📱 Usando app Firebase existente');
      }

      // Inicializar servicios
      FirebaseManager.auth = firebase.auth();
      FirebaseManager.db = firebase.firestore();
      FirebaseManager.storage = firebase.storage();

      // Configurar Firestore
      await configureFirestore();

      // Configurar Auth
      configureAuth();

      // Exponer globalmente
      window.firebase = firebase;
      window.firebaseApp = FirebaseManager.app;
      window.auth = FirebaseManager.auth;
      window.db = FirebaseManager.db;
      window.storage = FirebaseManager.storage;

      // Marcar como inicializado
      FirebaseManager.initialized = true;
      FirebaseManager.initializing = false;

      console.log('✅ Firebase configurado correctamente');

      // Ejecutar callbacks de éxito
      FirebaseManager.onReady.forEach(callback => {
        try {
          callback(FirebaseManager);
        } catch (error) {
          console.error('Error en callback onReady:', error);
        }
      });

      // Disparar evento global
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firebaseReady', {
          detail: {
            app: FirebaseManager.app,
            auth: FirebaseManager.auth,
            db: FirebaseManager.db,
            storage: FirebaseManager.storage
          }
        }));
      }

      resolve({
        app: FirebaseManager.app,
        auth: FirebaseManager.auth,
        db: FirebaseManager.db,
        storage: FirebaseManager.storage
      });

    } catch (error) {
      console.error('❌ Error configurando Firebase:', error);
      
      FirebaseManager.initializing = false;

      // Ejecutar callbacks de error
      FirebaseManager.onError.forEach(callback => {
        try {
          callback(error);
        } catch (err) {
          console.error('Error en callback onError:', err);
        }
      });

      // Reintentar si no se alcanzó el máximo
      if (FirebaseManager.attempts < FirebaseManager.maxAttempts) {
        console.log(`🔄 Reintentando en 2 segundos (${FirebaseManager.attempts}/${FirebaseManager.maxAttempts})`);
        
        setTimeout(() => {
          FirebaseManager.initPromise = null;
          resolve(initializeFirebase());
        }, 2000);
      } else {
        console.error('💥 Máximo de intentos alcanzado');
        
        // Disparar evento de error
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('firebaseError', {
            detail: { error: error.message, attempts: FirebaseManager.attempts }
          }));
        }
        
        reject(error);
      }
    }
  });

  return FirebaseManager.initPromise;
}

/**
 * Configura Firestore con persistencia offline
 */
async function configureFirestore() {
  if (!FirebaseManager.db) {
    console.warn('⚠️ Firestore no disponible para configurar');
    return;
  }

  try {
    // Intentar habilitar persistencia
    await FirebaseManager.db.enablePersistence({
      synchronizeTabs: false
    });
    console.log('💾 Persistencia offline habilitada');
  } catch (error) {
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Persistencia no habilitada - múltiples tabs abiertos');
    } else if (error.code === 'unimplemented') {
      console.warn('⚠️ Persistencia no soportada en este navegador');
    } else {
      console.warn('⚠️ Error en persistencia:', error.message);
    }
  }
}

/**
 * Configura Firebase Auth
 */
function configureAuth() {
  if (!FirebaseManager.auth) return;

  try {
    FirebaseManager.auth.languageCode = 'es';
    
    FirebaseManager.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => console.log('🔐 Persistencia de auth configurada'))
      .catch(error => console.warn('⚠️ Error configurando persistencia auth:', error));
  } catch (error) {
    console.warn('⚠️ Error configurando auth:', error);
  }
}

// ===========================================
// UTILIDADES Y HELPERS
// ===========================================

/**
 * Test de conectividad con Firebase
 */
async function testFirebaseConnection() {
  try {
    if (!FirebaseManager.db) {
      console.warn('⚠️ Firestore no disponible para test');
      return false;
    }

    // Test simple de conectividad
    await FirebaseManager.db.collection('_health').doc('check').get();
    console.log('✅ Conectividad Firebase confirmada');
    return true;
  } catch (error) {
    console.error('❌ Test de conectividad falló:', error.message);
    
    // Información específica del error
    if (error.code === 'permission-denied') {
      console.error('🚫 Revisa las reglas de Firestore - permisos denegados');
    } else if (error.code === 'unavailable') {
      console.error('🔶 Firebase no disponible - verifica conexión');
    }
    
    return false;
  }
}

/**
 * Reinicializa Firebase completamente
 */
async function reinitializeFirebase() {
  console.log('🔄 Reinicializando Firebase...');
  
  // Resetear estado
  FirebaseManager.initialized = false;
  FirebaseManager.initializing = false;
  FirebaseManager.initPromise = null;
  FirebaseManager.attempts = 0;
  
  return await initializeFirebase();
}

/**
 * Registra callback para cuando Firebase esté listo
 */
function onFirebaseReady(callback) {
  if (FirebaseManager.initialized) {
    callback(FirebaseManager);
  } else {
    FirebaseManager.onReady.push(callback);
  }
}

/**
 * Registra callback para errores de Firebase
 */
function onFirebaseError(callback) {
  FirebaseManager.onError.push(callback);
}

// ===========================================
// API GLOBAL
// ===========================================

window.FirebaseConfig = {
  initialize: initializeFirebase,
  reinitialize: reinitializeFirebase,
  test: testFirebaseConnection,
  onReady: onFirebaseReady,
  onError: onFirebaseError,
  
  // Getters para acceso seguro
  get initialized() { return FirebaseManager.initialized; },
  get app() { return FirebaseManager.app; },
  get auth() { return FirebaseManager.auth; },
  get db() { return FirebaseManager.db; },
  get storage() { return FirebaseManager.storage; },
  
  getStatus: () => ({
    initialized: FirebaseManager.initialized,
    initializing: FirebaseManager.initializing,
    attempts: FirebaseManager.attempts,
    services: {
      app: !!FirebaseManager.app,
      auth: !!FirebaseManager.auth,
      firestore: !!FirebaseManager.db,
      storage: !!FirebaseManager.storage
    }
  })
};

// ===========================================
// AUTO-INICIALIZACIÓN INTELIGENTE
// ===========================================

function autoInitialize() {
  // Solo auto-inicializar una vez
  if (FirebaseManager.initialized || FirebaseManager.initializing) {
    return;
  }

  const initWhenReady = () => {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      initializeFirebase()
        .then(() => {
          console.log('🎉 Firebase inicializado exitosamente');
        })
        .catch((error) => {
          console.error('💥 Error crítico en inicialización:', error.message);
        });
    } else {
      console.log('⏳ Esperando Firebase SDK...');
      setTimeout(initWhenReady, 200);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  } else {
    initWhenReady();
  }
}

// ===========================================
// MANEJO DE CONECTIVIDAD
// ===========================================

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión restaurada');
    if (FirebaseManager.db) {
      FirebaseManager.db.disableNetwork()
        .then(() => FirebaseManager.db.enableNetwork())
        .then(() => console.log('✅ Firestore reconectado'))
        .catch(error => console.warn('⚠️ Error reconectando:', error));
    }
  });

  window.addEventListener('offline', () => {
    console.log('📱 Modo offline - usando cache local');
  });
}

// ===========================================
// SUPRESIÓN DE ERRORES DE CONSOLA IRRELEVANTES
// ===========================================

const originalConsoleError = console.error;
console.error = function(...args) {
  const errorMsg = args.join(' ');
  
  // Filtrar errores conocidos que no afectan funcionalidad
  const ignoredErrors = [
    'mapbox',
    'already been started',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured'
  ];
  
  if (ignoredErrors.some(ignored => errorMsg.includes(ignored))) {
    return;
  }
  
  originalConsoleError.apply(console, args);
};

// ===========================================
// INICIALIZACIÓN AUTOMÁTICA
// ===========================================

console.log('🚀 Configuración Firebase optimizada cargada');
autoInitialize();
