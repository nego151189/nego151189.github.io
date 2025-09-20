/* ========================================
   SERVICE WORKER LIMPIO - SIN INTERFERENCIAS
   Versión que NO interfiere con Firebase Auth
   ======================================== */

const CACHE_NAME = 'finca-clean-v1';

// INSTALACIÓN - Solo registra, no cachea nada problemático
self.addEventListener('install', event => {
    console.log('SW: Instalación limpia');
    self.skipWaiting();
});

// ACTIVACIÓN - Solo limpia caches antiguos
self.addEventListener('activate', event => {
    console.log('SW: Activación limpia');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Eliminando cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// FETCH - NO INTERCEPTAR NADA relacionado con Firebase
self.addEventListener('fetch', event => {
    const url = event.request.url;
    
    // NO tocar NADA de Firebase/Google
    if (url.includes('firebase') || 
        url.includes('googleapis.com') || 
        url.includes('gstatic.com') ||
        url.includes('identitytoolkit') ||
        url.includes('securetoken') ||
        url.includes('accounts.google.com') ||
        event.request.method !== 'GET') {
        // Dejar pasar directo sin interferir
        return;
    }
    
    // Solo cachear recursos estáticos básicos
    if (url.includes('.css') || url.includes('.js') || url.includes('.html')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(fetchResponse => {
                    if (fetchResponse.ok) {
                        const responseClone = fetchResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return fetchResponse;
                });
            })
        );
    }
});

console.log('SW limpio cargado - Sin interferencias con auth');
