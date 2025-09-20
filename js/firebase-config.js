/* ========================================
   FINCA LA HERRADURA - FIREBASE CONFIG OPTIMIZADO
   Configuración corregida y optimizada
   ======================================== */

// ==========================================
// CONFIGURACIÓN PRINCIPAL
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyAQhQOK0sN7xtGNjcJP8hkOaBPFwF6X_34",
    authDomain: "fincalaherradura-c5229.firebaseapp.com",
    projectId: "fincalaherradura-c5229",
    storageBucket: "fincalaherradura-c5229.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012"
};

// Variables globales
let db = null;
let auth = null;
let storage = null;
let app = null;
let isFirebaseInitialized = false;

// ==========================================
// INICIALIZACIÓN PRINCIPAL MEJORADA
// ==========================================

async function initializeFirebase(retryCount = 0, maxRetries = 3) {
    const attemptNumber = retryCount + 1;
    console.log(`🚀 Iniciando Firebase... (intento ${attemptNumber})`);
    
    try {
        // Verificar si ya está inicializado
        if (isFirebaseInitialized && app && db && auth) {
            console.log('✅ Firebase ya inicializado anteriormente');
            return true;
        }
        
        // Limpiar apps existentes para evitar conflictos
        const existingApps = firebase.apps || [];
        if (existingApps.length > 0) {
            console.log('🧹 Limpiando apps Firebase existentes...');
            await Promise.all(existingApps.map(app => app.delete()));
        }
        
        // Inicializar nueva app
        app = firebase.initializeApp(firebaseConfig);
        console.log('📱 Nueva app Firebase inicializada');
        
        // Configurar servicios
        await configureFirebaseServices();
        
        // Configurar persistencia con manejo de errores mejorado
        await setupPersistence();
        
        // Configurar auth con reintentos
        await setupAuth();
        
        // Marcar como inicializado
        isFirebaseInitialized = true;
        
        console.log('✅ Firebase configurado correctamente');
        
        // Disparar evento global
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('firebaseReady', {
                detail: { db, auth, storage, app }
            }));
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error inicializando Firebase (intento ${attemptNumber}):`, error);
        
        // Reintentar si no se han agotado los intentos
        if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
            console.log(`⏳ Reintentando en ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return initializeFirebase(retryCount + 1, maxRetries);
        }
        
        console.error('❌ Firebase falló después de todos los reintentos');
        setupFallbackMode();
        return false;
    }
}

// ==========================================
// CONFIGURACIÓN DE SERVICIOS
// ==========================================

async function configureFirebaseServices() {
    // Firestore con configuración básica que funciona
    db = firebase.firestore();
    
    // Configuración simple sin cambios arriesgados
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        experimentalForceLongPolling: false,
        merge: true
    });
    
    // Auth
    auth = firebase.auth();
    
    // Storage
    storage = firebase.storage();
    
    console.log('🔧 Servicios Firebase configurados');
}

// ==========================================
// CONFIGURACIÓN DE PERSISTENCIA SIMPLIFICADA
// ==========================================

async function setupPersistence() {
    try {
        // Usar método que sabemos que funciona
        await db.enablePersistence({
            synchronizeTabs: true
        });
        
        console.log('💾 Persistencia offline habilitada');
        
    } catch (error) {
        if (error.code === 'failed-precondition') {
            console.warn('⚠️ Persistencia falló: múltiples pestañas abiertas');
        } else if (error.code === 'unimplemented') {
            console.warn('⚠️ Persistencia no soportada en este navegador');
        } else {
            console.warn('⚠️ Error configurando persistencia:', error);
        }
        
        // Continuar sin persistencia
    }
}

// ==========================================
// CONFIGURACIÓN DE AUTENTICACIÓN
// ==========================================

async function setupAuth() {
    try {
        // Configurar persistencia de autenticación
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('🔐 Persistencia de auth configurada');
        
        // Configurar listeners de conexión
        setupConnectionListeners();
        
    } catch (error) {
        console.warn('⚠️ Error configurando auth:', error);
    }
}

// ==========================================
// LISTENERS DE CONEXIÓN
// ==========================================

function setupConnectionListeners() {
    if (!db) return;
    
    try {
        // Listener para estado de conexión
        const connectionRef = db.collection('_connection').doc('status');
        
        const unsubscribe = connectionRef.onSnapshot(
            (doc) => {
                if (doc.metadata.fromCache) {
                    console.log('📱 Firestore: Modo offline');
                    dispatchConnectionEvent('offline');
                } else {
                    console.log('🌐 Firestore: Conectado online');
                    dispatchConnectionEvent('online');
                }
            },
            (error) => {
                console.warn('⚠️ Error en listener de conexión:', error);
                dispatchConnectionEvent('error');
            }
        );
        
        // Limpiar listener cuando se descarga la página
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                unsubscribe();
            });
        }
        
    } catch (error) {
        console.warn('⚠️ Error configurando listeners:', error);
    }
}

function dispatchConnectionEvent(status) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firebaseConnectionChange', {
            detail: { status }
        }));
    }
}

// ==========================================
// MODO FALLBACK
// ==========================================

function setupFallbackMode() {
    console.log('🔄 Configurando modo fallback...');
    
    // Crear objetos mock para evitar errores
    db = {
        collection: () => ({
            doc: () => ({
                get: () => Promise.resolve({ exists: false, data: () => null }),
                set: () => Promise.resolve(),
                update: () => Promise.resolve(),
                delete: () => Promise.resolve(),
                onSnapshot: () => () => {}
            }),
            get: () => Promise.resolve({ empty: true, docs: [] }),
            add: () => Promise.resolve({ id: 'mock-id' }),
            where: () => ({ get: () => Promise.resolve({ empty: true, docs: [] }) })
        }),
        settings: () => {},
        enablePersistence: () => Promise.resolve()
    };
    
    auth = {
        currentUser: null,
        onAuthStateChanged: (callback) => {
            setTimeout(() => callback(null), 100);
            return () => {};
        },
        signInWithEmailAndPassword: () => Promise.reject(new Error('Modo offline')),
        signOut: () => Promise.resolve(),
        setPersistence: () => Promise.resolve()
    };
    
    storage = {
        ref: () => ({
            put: () => Promise.reject(new Error('Modo offline')),
            getDownloadURL: () => Promise.reject(new Error('Modo offline'))
        })
    };
    
    console.log('🔄 Modo fallback configurado');
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

function isOnline() {
    return navigator.onLine && isFirebaseInitialized;
}

function getFirebaseServices() {
    return { db, auth, storage, app };
}

async function checkFirebaseHealth() {
    if (!db || !isFirebaseInitialized) {
        return { status: 'offline', message: 'Firebase no inicializado' };
    }
    
    try {
        // Test simple de conectividad
        await db.collection('_health').doc('check').get();
        return { status: 'online', message: 'Firebase funcionando correctamente' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

async function initWhenReady() {
    if (typeof window === 'undefined') return;
    
    // Esperar a que Firebase esté disponible
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts && typeof firebase === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK no disponible');
        setupFallbackMode();
        return;
    }
    
    // Inicializar Firebase
    const success = await initializeFirebase();
    
    if (success) {
        console.log('🎉 Firebase inicializado exitosamente');
        
        // Hacer servicios disponibles globalmente
        window.db = db;
        window.auth = auth;
        window.storage = storage;
        window.app = app;
        window.firebase = firebase;
        
        // Funciones de utilidad globales
        window.isFirebaseOnline = isOnline;
        window.getFirebaseServices = getFirebaseServices;
        window.checkFirebaseHealth = checkFirebaseHealth;
        
    } else {
        console.error('❌ Firebase falló, usando modo fallback');
    }
}

// Auto-inicialización
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }
}

// ==========================================
// LISTENERS DE CONECTIVIDAD
// ==========================================

if (typeof window !== 'undefined') {
    // Listener para cambios de conectividad de red
    window.addEventListener('online', () => {
        console.log('🌐 Red online detectada');
        if (!isFirebaseInitialized) {
            initializeFirebase();
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('📱 Red offline detectada');
    });
}

console.log('🚀 Configuración Firebase optimizada cargada');
