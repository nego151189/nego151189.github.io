/* ========================================
   FINCA LA HERRADURA - SERVICE WORKER CORREGIDO
   Sin referencias a 'window' y optimizado
   ======================================== */

const CACHE_NAME = 'finca-herradura-v3';
const OFFLINE_URL = '/offline.html';

// Archivos esenciales para cache
const ESSENTIAL_FILES = [
    '/',
    '/index.html',
    '/arboles.html',
    '/produccion.html',
    '/css/main.css',
    '/css/style.css',
    '/js/firebase-config.js',
    '/js/offline.js',
    '/js/auth.js',
    '/js/finca-navigation.js',
    '/js/tree-manager.js',
    '/js/produccion.js',
    '/manifest.json',
    OFFLINE_URL
];

// Archivos de dependencias externas
const EXTERNAL_FILES = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// ==========================================
// INSTALACIÓN DEL SERVICE WORKER
// ==========================================

self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Service Worker: Cacheando archivos esenciales...');
                
                // Cachear archivos esenciales
                const essentialPromise = cache.addAll(ESSENTIAL_FILES.map(url => {
                    return new Request(url, { cache: 'reload' });
                })).catch(error => {
                    console.warn('⚠️ Error cacheando archivos esenciales:', error);
                });
                
                // Cachear archivos externos (no críticos)
                const externalPromise = cache.addAll(EXTERNAL_FILES).catch(error => {
                    console.warn('⚠️ Error cacheando archivos externos:', error);
                });
                
                return Promise.allSettled([essentialPromise, externalPromise]);
            })
            .then(() => {
                console.log('✅ Service Worker: Instalación completada');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Service Worker: Error en instalación:', error);
            })
    );
});

// ==========================================
// ACTIVACIÓN DEL SERVICE WORKER
// ==========================================

self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activando...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                // Eliminar caches antiguos
                const deletePromises = cacheNames
                    .filter(cacheName => {
                        return cacheName !== CACHE_NAME && 
                               cacheName.startsWith('finca-herradura-');
                    })
                    .map(cacheName => {
                        console.log('🗑️ Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    });
                
                return Promise.all(deletePromises);
            })
            .then(() => {
                console.log('✅ Service Worker: Activado y tomando control');
                return self.clients.claim();
            })
            .catch(error => {
                console.error('❌ Service Worker: Error en activación:', error);
            })
    );
});

// ==========================================
// INTERCEPTAR REQUESTS (FETCH)
// ==========================================

self.addEventListener('fetch', event => {
    // Solo interceptar requests HTTP/HTTPS
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    // Estrategia diferente según el tipo de request
    if (event.request.url.includes('/api/') || 
        event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase')) {
        // Para APIs: Network First
        event.respondWith(networkFirst(event.request));
    } else if (event.request.destination === 'image') {
        // Para imágenes: Cache First
        event.respondWith(cacheFirst(event.request));
    } else {
        // Para todo lo demás: Stale While Revalidate
        event.respondWith(staleWhileRevalidate(event.request));
    }
});

// ==========================================
// ESTRATEGIAS DE CACHE
// ==========================================

// Network First - Intenta red primero, luego cache
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('📡 Network failed, usando cache para:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Si no hay cache y es una página, mostrar offline
        if (request.destination === 'document') {
            return caches.match(OFFLINE_URL);
        }
        
        throw error;
    }
}

// Cache First - Busca en cache primero, luego red
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('⚠️ Request failed:', request.url, error);
        throw error;
    }
}

// Stale While Revalidate - Retorna cache pero actualiza en background
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Buscar en red en background
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.log('📡 Background fetch failed:', request.url);
        return null;
    });
    
    // Retornar cache inmediatamente si existe
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Si no hay cache, esperar la red
    try {
        return await fetchPromise;
    } catch (error) {
        // Si es una página y falla todo, mostrar offline
        if (request.destination === 'document') {
            return cache.match(OFFLINE_URL);
        }
        throw error;
    }
}

// ==========================================
// MENSAJES DESDE LA APLICACIÓN
// ==========================================

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('📨 Service Worker: Recibido SKIP_WAITING');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            cached_files: ESSENTIAL_FILES.length
        });
    }
});

// ==========================================
// MANEJO DE ERRORES GLOBALES
// ==========================================

self.addEventListener('error', event => {
    console.error('❌ Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Service Worker Unhandled Rejection:', event.reason);
    event.preventDefault();
});

// ==========================================
// BACKGROUND SYNC (OPCIONAL)
// ==========================================

self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('🔄 Service Worker: Background sync triggered');
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Aquí puedes implementar sync de datos offline
        console.log('🔄 Ejecutando sincronización en background...');
        
        // Ejemplo: sincronizar datos pendientes
        const pendingData = await getStoredPendingData();
        if (pendingData.length > 0) {
            console.log(`📤 Sincronizando ${pendingData.length} elementos pendientes`);
            // Implementar lógica de sync
        }
        
    } catch (error) {
        console.error('❌ Error en background sync:', error);
    }
}

async function getStoredPendingData() {
    // Placeholder para obtener datos pendientes de IndexedDB
    return [];
}

console.log('🔧 Service Worker cargado correctamente - Versión:', CACHE_NAME);
