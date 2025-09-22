/* ========================================
   FIREBASE CONFIG CORREGIDO - SIN STORAGE
   Configuracion sin firebase.storage para evitar errores v1
   ======================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDm_DenNbuG-zLS-8tupO8BZEpfo5z3MY8",
    authDomain: "fincalaherradura-c5229.firebaseapp.com",
    projectId: "fincalaherradura-c5229",
    storageBucket: "fincalaherradura-c5229.firebasestorage.app",
    messagingSenderId: "453253173599",
    appId: "1:453253173599:web:f5f31e55fc1a93e7f5a6ea"
};

// Estado global simplificado
const FirebaseState = {
    initialized: false,
    initializing: false,
    app: null,
    auth: null,
    db: null,
    storage: null,
    attempts: 0,
    maxAttempts: 3
};

// Inicializacion principal
async function initializeFirebase() {
    if (FirebaseState.initialized) {
        console.log('✅ Firebase ya inicializado');
        return getFirebaseServices();
    }

    if (FirebaseState.initializing) {
        console.log('⏳ Firebase inicializandose...');
        return new Promise((resolve) => {
            const checkReady = () => {
                if (FirebaseState.initialized) {
                    resolve(getFirebaseServices());
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    FirebaseState.initializing = true;
    FirebaseState.attempts++;

    console.log(`🔄 Iniciando Firebase (intento ${FirebaseState.attempts})`);

    try {
        // Verificar SDK
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK no disponible');
        }

        // Inicializar app
        if (firebase.apps.length === 0) {
            FirebaseState.app = firebase.initializeApp(firebaseConfig);
        } else {
            FirebaseState.app = firebase.apps[0];
        }

        // Inicializar servicios básicos (sin storage por ahora)
        FirebaseState.auth = firebase.auth();
        FirebaseState.db = firebase.firestore();
        
        // Intentar storage solo si está disponible
        try {
            if (firebase.storage && typeof firebase.storage === 'function') {
                FirebaseState.storage = firebase.storage();
                console.log('✅ Firebase Storage inicializado');
            } else {
                console.log('⚠️ Firebase Storage no disponible, continuando sin él');
                FirebaseState.storage = null;
            }
        } catch (storageError) {
            console.warn('⚠️ Error inicializando Storage, continuando sin él:', storageError.message);
            FirebaseState.storage = null;
        }

        // Configurar persistencia
        await configureFirestore();
        configureAuth();

        // Exponer globalmente
        window.firebase = firebase;
        window.firebaseApp = FirebaseState.app;
        window.auth = FirebaseState.auth;
        window.db = FirebaseState.db;
        if (FirebaseState.storage) {
            window.storage = FirebaseState.storage;
        }

        FirebaseState.initialized = true;
        FirebaseState.initializing = false;

        console.log('✅ Firebase inicializado correctamente');
        console.log(`📊 Servicios disponibles: Auth ✅, Firestore ✅, Storage ${FirebaseState.storage ? '✅' : '❌'}`);

        // Disparar evento
        window.dispatchEvent(new CustomEvent('firebaseReady', {
            detail: getFirebaseServices()
        }));

        return getFirebaseServices();

    } catch (error) {
        console.error('❌ Error en Firebase:', error);
        FirebaseState.initializing = false;

        if (FirebaseState.attempts < FirebaseState.maxAttempts) {
            console.log(`🔄 Reintentando en 2 segundos... (${FirebaseState.attempts}/${FirebaseState.maxAttempts})`);
            setTimeout(() => {
                initializeFirebase();
            }, 2000);
        } else {
            console.error('❌ Máximo de intentos alcanzado para Firebase');
            
            // Crear servicios mock para continuar sin Firebase
            createMockServices();
            
            window.dispatchEvent(new CustomEvent('firebaseError', {
                detail: { error: error.message, hasMockServices: true }
            }));
        }

        throw error;
    }
}

function createMockServices() {
    console.log('🔧 Creando servicios mock para continuar sin Firebase...');
    
    // Mock básico para Firestore
    const mockDB = {
        collection: (name) => ({
            doc: (id) => ({
                set: (data) => Promise.resolve(),
                update: (data) => Promise.resolve(),
                get: () => Promise.resolve({ exists: false, data: () => null })
            }),
            add: (data) => Promise.resolve({ id: 'mock-' + Date.now() }),
            get: () => Promise.resolve({ docs: [], empty: true }),
            orderBy: () => mockDB.collection(name),
            where: () => mockDB.collection(name),
            limit: () => mockDB.collection(name)
        })
    };

    // Mock básico para Auth
    const mockAuth = {
        currentUser: null,
        onAuthStateChanged: (callback) => {
            setTimeout(() => callback(null), 100);
            return () => {}; // unsubscribe function
        },
        signOut: () => Promise.resolve()
    };

    window.db = mockDB;
    window.auth = mockAuth;
    
    FirebaseState.db = mockDB;
    FirebaseState.auth = mockAuth;
    FirebaseState.initialized = true;
    FirebaseState.initializing = false;
    
    console.log('✅ Servicios mock creados - La aplicación puede continuar');
    
    // Disparar evento indicando que tenemos servicios mock
    window.dispatchEvent(new CustomEvent('firebaseReady', {
        detail: { ...getFirebaseServices(), isMock: true }
    }));
}

function getFirebaseServices() {
    return {
        app: FirebaseState.app,
        auth: FirebaseState.auth,
        db: FirebaseState.db,
        storage: FirebaseState.storage,
        initialized: FirebaseState.initialized,
        isMock: !FirebaseState.app // Indica si son servicios mock
    };
}

async function configureFirestore() {
    if (!FirebaseState.db || !FirebaseState.db.enablePersistence) return;

    try {
        await FirebaseState.db.enablePersistence({
            synchronizeTabs: false
        });
        console.log('✅ Persistencia Firestore habilitada');
    } catch (error) {
        if (error.code === 'failed-precondition') {
            console.warn('⚠️ Persistencia no habilitada - múltiples tabs abiertos');
        } else if (error.code === 'unimplemented') {
            console.warn('⚠️ Persistencia no soportada en este navegador');
        } else {
            console.warn('⚠️ Error configurando persistencia:', error.message);
        }
    }
}

function configureAuth() {
    if (!FirebaseState.auth || !FirebaseState.auth.languageCode) return;

    try {
        FirebaseState.auth.languageCode = 'es';
        if (FirebaseState.auth.setPersistence && firebase.auth.Auth.Persistence) {
            FirebaseState.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        }
        console.log('✅ Auth configurado correctamente');
    } catch (error) {
        console.warn('⚠️ Error configurando auth:', error.message);
    }
}

// API global simplificada y mejorada
window.FirebaseConfig = {
    initialize: initializeFirebase,
    getServices: getFirebaseServices,
    get initialized() { return FirebaseState.initialized; },
    get status() { 
        return {
            initialized: FirebaseState.initialized,
            initializing: FirebaseState.initializing,
            attempts: FirebaseState.attempts,
            hasStorage: !!FirebaseState.storage,
            isMock: !FirebaseState.app
        };
    },
    // Función de utilidad para verificar disponibilidad
    isAvailable: () => FirebaseState.initialized,
    hasRealFirebase: () => FirebaseState.initialized && !!FirebaseState.app
};

// Auto-inicializacion mejorada
function autoInit() {
    const startInit = () => {
        if (typeof firebase !== 'undefined') {
            console.log('🚀 Iniciando auto-inicialización de Firebase...');
            initializeFirebase().catch(error => {
                console.error('❌ Error crítico en inicialización, creando servicios mock:', error);
                // Los servicios mock ya se crean en initializeFirebase en caso de error
            });
        } else {
            console.log('⏳ Esperando Firebase SDK...');
            setTimeout(startInit, 200);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInit);
    } else {
        startInit();
    }
}

// Listeners de conectividad mejorados
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('🌐 Conexión restaurada');
        if (FirebaseState.db && FirebaseState.db.disableNetwork && !FirebaseState.isMock) {
            FirebaseState.db.disableNetwork()
                .then(() => FirebaseState.db.enableNetwork())
                .then(() => console.log('✅ Firestore reconectado'))
                .catch(error => console.warn('⚠️ Error reconectando Firestore:', error));
        }
    });

    window.addEventListener('offline', () => {
        console.log('📴 Modo offline activado');
    });
}

console.log('🔧 Firebase config corregido cargado');
autoInit();
