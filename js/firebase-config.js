/* ========================================
   FIREBASE CONFIG LIMPIO Y FUNCIONAL
   Configuracion corregida sin caracteres corruptos
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
        console.log('Firebase ya inicializado');
        return getFirebaseServices();
    }

    if (FirebaseState.initializing) {
        console.log('Firebase inicializandose...');
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

    console.log(`Iniciando Firebase (intento ${FirebaseState.attempts})`);

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

        // Inicializar servicios
        FirebaseState.auth = firebase.auth();
        FirebaseState.db = firebase.firestore();
        FirebaseState.storage = firebase.storage();

        // Configurar persistencia
        await configureFirestore();
        configureAuth();

        // Exponer globalmente
        window.firebase = firebase;
        window.firebaseApp = FirebaseState.app;
        window.auth = FirebaseState.auth;
        window.db = FirebaseState.db;
        window.storage = FirebaseState.storage;

        FirebaseState.initialized = true;
        FirebaseState.initializing = false;

        console.log('Firebase inicializado correctamente');

        // Disparar evento
        window.dispatchEvent(new CustomEvent('firebaseReady', {
            detail: getFirebaseServices()
        }));

        return getFirebaseServices();

    } catch (error) {
        console.error('Error en Firebase:', error);
        FirebaseState.initializing = false;

        if (FirebaseState.attempts < FirebaseState.maxAttempts) {
            console.log('Reintentando en 2 segundos...');
            setTimeout(() => {
                initializeFirebase();
            }, 2000);
        } else {
            console.error('Maximo de intentos alcanzado');
            window.dispatchEvent(new CustomEvent('firebaseError', {
                detail: { error: error.message }
            }));
        }

        throw error;
    }
}

function getFirebaseServices() {
    return {
        app: FirebaseState.app,
        auth: FirebaseState.auth,
        db: FirebaseState.db,
        storage: FirebaseState.storage
    };
}

async function configureFirestore() {
    if (!FirebaseState.db) return;

    try {
        await FirebaseState.db.enablePersistence({
            synchronizeTabs: false
        });
        console.log('Persistencia Firestore habilitada');
    } catch (error) {
        if (error.code === 'failed-precondition') {
            console.warn('Persistencia no habilitada - multiples tabs');
        } else if (error.code === 'unimplemented') {
            console.warn('Persistencia no soportada');
        } else {
            console.warn('Error en persistencia:', error.message);
        }
    }
}

function configureAuth() {
    if (!FirebaseState.auth) return;

    try {
        FirebaseState.auth.languageCode = 'es';
        FirebaseState.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('Auth configurado correctamente');
    } catch (error) {
        console.warn('Error configurando auth:', error);
    }
}

// API global simplificada
window.FirebaseConfig = {
    initialize: initializeFirebase,
    getServices: getFirebaseServices,
    get initialized() { return FirebaseState.initialized; },
    get status() { 
        return {
            initialized: FirebaseState.initialized,
            initializing: FirebaseState.initializing,
            attempts: FirebaseState.attempts
        };
    }
};

// Auto-inicializacion
function autoInit() {
    const startInit = () => {
        if (typeof firebase !== 'undefined') {
            initializeFirebase().catch(error => {
                console.error('Error critico en inicializacion:', error);
            });
        } else {
            setTimeout(startInit, 200);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInit);
    } else {
        startInit();
    }
}

// Listeners de conectividad
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('Conexion restaurada');
        if (FirebaseState.db) {
            FirebaseState.db.disableNetwork()
                .then(() => FirebaseState.db.enableNetwork())
                .catch(error => console.warn('Error reconectando:', error));
        }
    });

    window.addEventListener('offline', () => {
        console.log('Modo offline');
    });
}

console.log('Firebase config limpio cargado');
autoInit();
