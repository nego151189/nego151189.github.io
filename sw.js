/* ========================================
   SERVICE WORKER MÍNIMO - SIN INTERFERENCIAS
   Solo maneja instalación básica
   ======================================== */

const CACHE_NAME = 'finca-herradura-minimal-v1';

// Instalación básica sin cachear archivos problemáticos
self.addEventListener('install', event => {
    console.log('Service Worker: Instalación básica');
    self.skipWaiting();
});

// Activación básica
self.addEventListener('activate', event => {
    console.log('Service Worker: Activación básica');
    event.waitUntil(self.clients.claim());
});

// NO interceptar fetch requests - dejar que todo pase directo
self.addEventListener('fetch', event => {
    // No hacer nada - dejar que las requests pasen normalmente
    return;
});

console.log('Service Worker mínimo cargado - Sin interferencias');
