/* ========================================
   FIREBASE CONFIG ESTABLE - SIN PROBLEMAS
   Configuración que mantiene la autenticación
   ======================================== */

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
let isFirebaseReady = false;

// INICIALIZACIÓN SIMPLE Y ESTABLE
async function initializeFirebase() {
    try {
        console.log('Iniciando Firebase de forma estable...');
        
        // Verificar si ya está inicializado
        if (isFirebaseReady) {
            console.log('Firebase ya está listo');
            return true;
        }
        
        // Inicializar app
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.apps[0];
        }
        
        // Servicios básicos
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        
        // Configuración básica sin experimentales
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        
        // Persistencia básica (opcional)
        try {
            await db.enablePersistence({ synchronizeTabs: false });
            console.log('Persistencia habilitada');
        } catch (error) {
            console.log('Persistencia omitida:', error.code);
        }
        
        // Auth persistence
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        isFirebaseReady = true;
        
        // Hacer disponible globalmente
        window.db = db;
        window.auth = auth;
        window.storage = storage;
        window.app = app;
        window.firebase = firebase;
        
        console.log('Firebase inicializado correctamente');
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('firebaseReady'));
        
        return true;
        
    } catch (error) {
        console.error('Error inicializando Firebase:', error);
        return false;
    }
}

// VERIFICAR AUTENTICACIÓN
function checkAuth() {
    return new Promise((resolve) => {
        if (!auth) {
            resolve(null);
            return;
        }
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
        
        // Timeout de 5 segundos
        setTimeout(() => {
            unsubscribe();
            resolve(auth.currentUser);
        }, 5000);
    });
}

// AUTO-INICIALIZACIÓN
function autoInit() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK no cargado');
        return;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFirebase);
    } else {
        initializeFirebase();
    }
}

// Ejecutar cuando esté listo
if (typeof window !== 'undefined') {
    autoInit();
}

// Funciones globales
window.initializeFirebase = initializeFirebase;
window.checkAuth = checkAuth;

console.log('Firebase config estable cargado');
