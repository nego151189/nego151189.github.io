/* ========================================
   FINCA LA HERRADURA - CONFIGURACIÓN FIREBASE
   Configuración optimizada para producción
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
const maxAttempts = 3; // Reducido para evitar bucles infinitos

// Referencias globales
let firebaseApp = null;
let auth = null;
let db = null;
let storage = null;

/**
 * Inicializa Firebase de manera robusta
 */
function initializeFirebase() {
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
      
      // Configurar Firestore
      await configureFirestore();
      
      // Configurar Auth
      configureAuth();
      
      // Hacer disponibles globalmente
      window.firebase = firebase;
      window.firebaseApp = firebaseApp;
      window.auth = auth;
      window.db = db;
      window.storage = storage;
      
      firebaseInitialized = true;
      console.log('✅ Firebase configurado correctamente');
      
      // Disparar evento
      window.dispatchEvent(new CustomEvent('firebaseReady', {
        detail: { app: firebaseApp, auth, db, storage }
      }));
      
      resolve({ app: firebaseApp, auth, db, storage });
      
    } catch (error) {
      console.error('❌ Error configurando Firebase:', error);
      initializationAttempts++;
      
      if (initializationAttempts < maxAttempts) {
        console.log(`🔄 Reintentando (${initializationAttempts}/${maxAttempts})`);
        initializationPromise = null;
        
        setTimeout(() => {
          resolve(initializeFirebase());
        }, 2000 * initializationAttempts);
      } else {
        console.error('💥 Máximo de intentos alcanzado');
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
 * Configura Firestore con persistencia offline
 */
async function configureFirestore() {
  if (!db) {
    console.warn('⚠️ Firestore no disponible para configurar');
    return;
  }

  try {
    // Limpiar almacenamiento previo para evitar conflictos
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases();
        for (const database of databases) {
          if (database.name && database.name.includes('firestore')) {
            indexedDB.deleteDatabase(database.name);
          }
        }
      } catch (e) {
        console.warn('No se pudieron limpiar bases de datos previas:', e);
      }
    }

    // Configurar persistencia offline
    await db.enablePersistence({
      synchronizeTabs: false // Evita conflictos entre tabs
    });
    
    console.log('💾 Persistencia offline habilitada');
    
  } catch (error) {
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Persistencia no habilitada - múltiples tabs abiertos');
    } else if (error.code === 'unimplemented') {
      console.warn('⚠️ Persistencia no soportada en este navegador');
    } else {
      console.warn('⚠️ Error en persistencia:', error);
    }
  }
}

/**
 * Configura Firebase Auth
 */
function configureAuth() {
  if (!auth) return;
  
  try {
    auth.languageCode = 'es';
    
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => console.log('🔐 Persistencia de auth configurada'))
      .catch(error => console.warn('⚠️ Error configurando persistencia auth:', error));
      
  } catch (error) {
    console.warn('⚠️ Error configurando auth:', error);
  }
}

/**
 * Utilidades para Firestore
 */
const FirestoreUtils = {
  async withRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Intento ${attempt} fallido:`, error.message);
        
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  },

  timestampToDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  },

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

  async updateDocument(collection, docId, data) {
    if (!db) throw new Error('Firestore no disponible');
    
    return await this.withRetry(async () => {
      await db.collection(collection).doc(docId).update({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  },

  async getDocuments(collection, filters = [], orderBy = null, limit = null) {
    if (!db) throw new Error('Firestore no disponible');
    
    return await this.withRetry(async () => {
      let query = db.collection(collection);
      
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
      
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction || 'desc');
      }
      
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
 * Test de conectividad con Firebase
 */
async function testFirebaseConnection() {
  try {
    if (!db) {
      console.warn('⚠️ Firestore no disponible para test');
      return false;
    }

    // Test simple de conectividad
    await db.collection('_system').doc('health_check').get();
    console.log('✅ Conectividad Firebase confirmada');
    return true;
  } catch (error) {
    console.error('❌ Test de conectividad falló:', error);
    
    if (error.code === 'permission-denied') {
      console.error('🚫 Revisa las reglas de Firestore');
    } else if (error.code === 'unavailable') {
      console.error('📶 Firebase no disponible');
    }
    
    return false;
  }
}

/**
 * Función para reinicializar Firebase
 */
async function reinitializeFirebase() {
  console.log('🔄 Reinicializando Firebase...');
  firebaseInitialized = false;
  initializationPromise = null;
  initializationAttempts = 0;
  
  return await initializeFirebase();
}

/**
 * Exposición global de utilidades
 */
window.FirebaseConfig = {
  initialize: initializeFirebase,
  reinitialize: reinitializeFirebase,
  test: testFirebaseConnection,
  utils: {
    firestore: FirestoreUtils
  },
  getStatus: () => ({
    initialized: firebaseInitialized,
    services: {
      app: !!window.firebaseApp,
      auth: !!window.auth,
      firestore: !!window.db,
      storage: !!window.storage
    },
    attempts: initializationAttempts
  })
};

/**
 * Inicialización automática
 */
function autoInitialize() {
  const initWhenReady = () => {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      initializeFirebase()
        .then(() => console.log('🎉 Firebase inicializado exitosamente'))
        .catch((error) => {
          console.error('💥 Error en inicialización:', error);
          if (initializationAttempts < maxAttempts) {
            console.log('⏰ Reintentando en 5 segundos...');
            setTimeout(autoInitialize, 5000);
          }
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

// Manejo de eventos de conectividad
window.addEventListener('online', () => {
  console.log('🌐 Conexión restaurada');
  if (db) {
    db.disableNetwork().then(() => db.enableNetwork())
      .then(() => console.log('✅ Firestore reconectado'))
      .catch(error => console.warn('⚠️ Error reconectando:', error));
  }
});

window.addEventListener('offline', () => {
  console.log('📱 Modo offline - usando cache local');
});

// Suprimir errores conocidos de mapa
const originalConsoleError = console.error;
console.error = function(...args) {
  const errorMsg = args.join(' ');
  
  // Filtrar errores de mapas que no afectan funcionalidad
  if (errorMsg.includes('mapbox') || 
      errorMsg.includes('403') || 
      errorMsg.includes('already been started')) {
    return;
  }
  
  originalConsoleError.apply(console, args);
};

// Inicializar automáticamente
console.log('🚀 Iniciando Firebase...');
autoInitialize();