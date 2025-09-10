/* ========================================
   FINCA LA HERRADURA - CONFIGURACIÓN FIREBASE
   Configuración centralizada y robusta de Firebase
   ======================================== */

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDm_DenNbuG-zLS-8tupO8BZEpfo5z3MY8",
  authDomain: "fincalaherradura-c5229.firebaseapp.com",
  projectId: "fincalaherradura-c5229",
  storageBucket: "fincalaherradura-c5229.firebasestorage.app",
  messagingSenderId: "453253173599",
  appId: "1:453253173599:web:f5f31e55fc1a93e7f5a6ea"
};

// Estado de inicialización
let firebaseInitialized = false;
let initializationPromise = null;
let initializationAttempts = 0;
const maxAttempts = 5;

// Referencias globales
let firebaseApp = null;
let auth = null;
let db = null;
let storage = null;

/**
 * Inicializa Firebase de manera robusta
 */
function initializeFirebase() {
  // Si ya se está inicializando, retornar la promesa existente
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('🔥 Inicializando Firebase...', { attempt: initializationAttempts + 1 });
      
      // Verificar que Firebase esté cargado
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK no está cargado');
      }
      
      // Verificar que las funciones necesarias estén disponibles
      if (typeof firebase.initializeApp !== 'function') {
        throw new Error('Firebase no está completamente cargado');
      }
      
      // Inicializar app solo si no existe
      if (firebase.apps.length === 0) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        console.log('📱 Nueva app Firebase inicializada');
      } else {
        firebaseApp = firebase.apps[0];
        console.log('📱 Usando app Firebase existente');
      }
      
      // Inicializar servicios
      auth = firebase.auth();
      db = firebase.firestore();
      storage = firebase.storage();
      
      // Configurar Firestore SOLO si no está ya configurado
      await configureFirestore();
      
      // Configurar Auth
      configureAuth();
      
      // Hacer disponibles globalmente
      window.firebase = firebase;
      window.firebaseApp = firebaseApp;
      window.auth = auth;
      window.db = db;
      window.storage = storage;
      
      // Marcar como inicializado
      firebaseInitialized = true;
      
      console.log('✅ Firebase configurado correctamente');
      console.log('📊 Servicios disponibles:', {
        app: !!firebaseApp,
        auth: !!auth,
        firestore: !!db,
        storage: !!storage
      });
      
      // Disparar evento para notificar que Firebase está listo
      window.dispatchEvent(new CustomEvent('firebaseReady', {
        detail: {
          app: firebaseApp,
          auth: auth,
          db: db,
          storage: storage
        }
      }));
      
      resolve({
        app: firebaseApp,
        auth: auth,
        db: db,
        storage: storage
      });
      
    } catch (error) {
      console.error('❌ Error configurando Firebase:', error);
      initializationAttempts++;
      
      // Reintentar si no hemos alcanzado el máximo
      if (initializationAttempts < maxAttempts) {
        console.log(`🔄 Reintentando inicialización (${initializationAttempts}/${maxAttempts})`);
        initializationPromise = null; // Reset para permitir reintentos
        
        setTimeout(() => {
          resolve(initializeFirebase());
        }, 1000 * initializationAttempts); // Delay progresivo
      } else {
        console.error('💥 Máximo de intentos alcanzado. Firebase no disponible.');
        
        // Disparar evento de error
        window.dispatchEvent(new CustomEvent('firebaseError', {
          detail: { error: error.message, attempts: initializationAttempts }
        }));
        
        reject(error);
      }
    }
  });
  
  return initializationPromise;
}

/**
 * Configura Firestore con opciones optimizadas
 */
async function configureFirestore() {
    if (!db) return;
    
    try {
        // SOLO configurar si Firestore no ha sido usado aún
        if (!db._delegate._settings) {
            console.log('🔧 Configurando Firestore antes del primer uso...');
            
            const settings = {
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                experimentalForceLongPolling: true,
                merge: true
            };
            
            db.settings(settings);
            console.log('✅ Settings de Firestore aplicados');
        } else {
            console.log('ℹ️ Firestore ya configurado previamente');
        }
        
        // Habilitar persistencia offline
        await db.enablePersistence({
            synchronizeTabs: true
        });
        console.log('💾 Persistencia offline habilitada');
        
    } catch (error) {
        if (error.code === 'failed-precondition') {
            console.warn('⚠️ Persistencia no habilitada - múltiples tabs abiertos');
        } else if (error.code === 'unimplemented') {
            console.warn('⚠️ Persistencia no soportada por el navegador');
        } else if (error.message?.includes('already been started')) {
            console.log('ℹ️ Firestore ya está configurado - continuando normalmente');
        } else {
            console.warn('⚠️ Error habilitando persistencia:', error);
        }
    }
}

/**
 * Configura Firebase Auth
 */
function configureAuth() {
  if (!auth) return;
  
  try {
    // Configurar idioma
    auth.languageCode = 'es';
    
    // Configurar persistencia por defecto
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        console.log('🔐 Persistencia de auth configurada');
      })
      .catch(error => {
        console.warn('⚠️ Error configurando persistencia de auth:', error);
      });
      
  } catch (error) {
    console.warn('⚠️ Error configurando auth:', error);
  }
}

/**
 * Verifica el estado de Firebase
 */
function getFirebaseStatus() {
  return {
    initialized: firebaseInitialized,
    services: {
      app: !!window.firebaseApp,
      auth: !!window.auth,
      firestore: !!window.db,
      storage: !!window.storage
    },
    attempts: initializationAttempts
  };
}

/**
 * Fuerza la reinicialización de Firebase
 */
async function reinitializeFirebase() {
  console.log('🔄 Forzando reinicialización de Firebase...');
  firebaseInitialized = false;
  initializationPromise = null;
  initializationAttempts = 0;
  
  return await initializeFirebase();
}

/**
 * Maneja errores de Firebase de manera centralizada
 */
function handleFirebaseError(error, context = 'unknown') {
  console.error(`Firebase Error [${context}]:`, error);
  
  // Mapear errores comunes
  const errorMessages = {
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    'permission-denied': 'No tienes permisos para esta operación.',
    'unavailable': 'Servicio temporalmente no disponible.',
    'cancelled': 'Operación cancelada.',
    'deadline-exceeded': 'Tiempo de espera agotado.'
  };
  
  const userMessage = errorMessages[error.code] || 'Error inesperado';
  
  // Disparar evento de error para manejo centralizado
  window.dispatchEvent(new CustomEvent('firebaseErrorHandled', {
    detail: {
      error: error,
      context: context,
      userMessage: userMessage,
      timestamp: new Date().toISOString()
    }
  }));
  
  return userMessage;
}

/**
 * Utlidades para operaciones Firestore comunes
 */
const FirestoreUtils = {
  /**
   * Ejecuta una operación con retry automático
   */
  async withRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Intento ${attempt} fallido:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Delay progresivo
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  },

  /**
   * Convierte timestamp de Firestore a fecha
   */
  timestampToDate(timestamp) {
    if (!timestamp) return null;
    
    if (timestamp.toDate) {
      return timestamp.toDate();
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    return new Date(timestamp);
  },

  /**
   * Crea un documento con ID automático
   */
  async addDocument(collection, data) {
    if (!db) throw new Error('Firestore no disponible');
    
    return await this.withRetry(async () => {
      const docRef = await db.collection(collection).add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef;
    });
  },

  /**
   * Actualiza un documento
   */
  async updateDocument(collection, docId, data) {
    if (!db) throw new Error('Firestore no disponible');
    
    return await this.withRetry(async () => {
      await db.collection(collection).doc(docId).update({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  },

  /**
   * Obtiene documentos con filtros
   */
  async getDocuments(collection, filters = [], orderBy = null, limit = null) {
    if (!db) throw new Error('Firestore no disponible');
    
    return await this.withRetry(async () => {
      let query = db.collection(collection);
      
      // Aplicar filtros
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
      
      // Aplicar ordenamiento
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction || 'desc');
      }
      
      // Aplicar límite
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    });
  }
};

/**
 * Utilidades para Storage
 */
const StorageUtils = {
  /**
   * Sube un archivo
   */
  async uploadFile(path, file, metadata = {}) {
    if (!storage) throw new Error('Storage no disponible');
    
    const storageRef = storage.ref(path);
    const uploadTask = storageRef.put(file, {
      contentType: file.type,
      ...metadata
    });
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          window.dispatchEvent(new CustomEvent('fileUploadProgress', {
            detail: { progress, snapshot }
          }));
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          resolve({
            downloadURL,
            fullPath: uploadTask.snapshot.ref.fullPath,
            name: uploadTask.snapshot.ref.name
          });
        }
      );
    });
  },

  /**
   * Elimina un archivo
   */
  async deleteFile(path) {
    if (!storage) throw new Error('Storage no disponible');
    
    const storageRef = storage.ref(path);
    await storageRef.delete();
  }
};

/**
 * Inicialización automática
 */
function autoInitialize() {
  const initWhenReady = () => {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      initializeFirebase()
        .then(() => {
          console.log('🎉 Firebase auto-inicializado exitosamente');
        })
        .catch((error) => {
          console.error('💥 Error en auto-inicialización:', error);
          
          // Programar reintento si es un error temporal
          if (initializationAttempts < maxAttempts) {
            console.log('⏰ Programando reintento en 5 segundos...');
            setTimeout(autoInitialize, 5000);
          }
        });
    } else {
      console.log('⏳ Esperando Firebase SDK...');
      setTimeout(initWhenReady, 200);
    }
  };

  // Iniciar verificación
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  } else {
    initWhenReady();
  }
}

// Exponer utilidades globalmente
window.FirebaseConfig = {
  initialize: initializeFirebase,
  reinitialize: reinitializeFirebase,
  getStatus: getFirebaseStatus,
  handleError: handleFirebaseError,
  utils: {
    firestore: FirestoreUtils,
    storage: StorageUtils
  }
};

// Listener para reinicialización manual
window.addEventListener('reinitializeFirebase', async () => {
  try {
    await reinitializeFirebase();
    console.log('✅ Firebase reinicializado manualmente');
  } catch (error) {
    console.error('❌ Error en reinicialización manual:', error);
  }
});

// Listener para debug
window.addEventListener('firebaseDebug', () => {
  console.log('🔍 Estado de Firebase:', getFirebaseStatus());
  console.log('📊 Variables globales:', {
    firebase: typeof firebase,
    firebaseApp: typeof window.firebaseApp,
    auth: typeof window.auth,
    db: typeof window.db,
    storage: typeof window.storage
  });
});

// Auto-inicialización
console.log('🚀 Iniciando configuración Firebase...');
autoInitialize();

// Manejo de errores global para Firebase
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.code && event.reason.code.startsWith('auth/')) {
    console.warn('🔥 Error de Firebase Auth no manejado:', event.reason);
    handleFirebaseError(event.reason, 'unhandled_auth_error');
    event.preventDefault();
  }
});

// Detectar cuando se pierde conexión con Firebase
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión restaurada - verificando Firebase...');
    if (db) {
      db.disableNetwork().then(() => {
        return db.enableNetwork();
      }).then(() => {
        console.log('✅ Reconexión con Firestore exitosa');
      }).catch(error => {
        console.warn('⚠️ Error reconectando con Firestore:', error);
      });
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('📱 Modo offline - Firebase usará cache local');
  });
}

// ==========================================
// CONFIGURACIÓN ANTI-ERRORES DE CONEXIÓN
// ==========================================


// Aplicar configuración después de inicializar
window.addEventListener('firebaseReady', async () => {
  
});window.addEventListener('firebaseReady', async () => {
    console.log('🎉 Firebase listo - sistema funcionando correctamente');
    // No hacer configuraciones adicionales aquí
});

// Manejo de errores más simple
const originalConsoleError = console.error;
console.error = function(...args) {
    const errorMsg = args.join(' ');
    
    // Suprimir errores conocidos de Mapbox que no afectan funcionalidad
    if (errorMsg.includes('mapbox') && (errorMsg.includes('403') || errorMsg.includes('ERR_ADDRESS_INVALID'))) {
        console.warn('📍 Mapbox error (funcionalidad limitada):', ...args);
        return;
    }
    
    // Suprimir errores de Firestore ya manejados
    if (errorMsg.includes('already been started')) {
        console.warn('🔧 Firestore ya configurado (normal)');
        return;
    }
    
    originalConsoleError.apply(console, args);
};
