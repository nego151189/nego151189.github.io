// sw.js - Service Worker Inteligente Finca La Herradura
const CACHE_NAME = 'finca-herradura-v1.2.0';
const DATA_CACHE_NAME = 'finca-herradura-data-v1.0.0';
const STATIC_CACHE_NAME = 'finca-herradura-static-v1.0.0';

// Archivos estáticos a cachear
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/arboles.html',
  '/clima.html',
  '/produccion.html',
  '/gastos.html',
  '/ventas.html',
  '/precios.html',
  '/recordatorios.html',
  '/negocios.html',
  '/tratamientos.html',
  '/css/main.css',
  '/css/style.css',
  '/js/index.js',
  '/js/auth.js',
  '/js/nav.js',
  '/js/offline.js',
  '/js/clima.js',
  '/js/arboles.js',
  '/js/produccion.js',
  '/js/gastos.js',
  '/js/ventas.js',
  '/js/precios.js',
  '/js/riegos.js',
  '/js/tratamientos.js',
  '/js/recordatorios.js',
  '/js/negocios.js',
  '/js/firebase-config.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// URLs de APIs externas que requieren estrategia especial
const API_URLS = [
  'https://api.open-meteo.com',
  'https://firestore.googleapis.com',
  'https://firebase.googleapis.com'
];

// Configuración de estrategias de cache
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  API: 'network-first',
  DATA: 'network-first-cache-fallback',
  IMAGES: 'cache-first'
};

// ==================== INSTALACIÓN DEL SERVICE WORKER ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache de archivos estáticos
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      
      // Configuración inicial
      initializeServiceWorker()
    ])
  );
  
  // Activar inmediatamente el SW
  self.skipWaiting();
});

// ==================== ACTIVACIÓN DEL SERVICE WORKER ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      cleanupOldCaches(),
      
      // Reclamar control de todas las páginas
      self.clients.claim(),
      
      // Configurar sincronización en background
      setupBackgroundSync()
    ])
  );
});

// ==================== INTERCEPTOR DE REQUESTS ====================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip requests no HTTP/HTTPS
  if (!request.url.startsWith('http')) return;
  
  // CORRECCIÓN: Skip métodos que no se pueden cachear
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    // Para métodos no-GET, usar fetch directo sin cache
    event.respondWith(fetch(request));
    return;
  }
  
  // Estrategia basada en el tipo de recurso (solo para GET)
  if (isStaticFile(url)) {
    event.respondWith(handleStaticFile(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isFirebaseRequest(url)) {
    event.respondWith(handleFirebaseRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// ==================== MANEJO DE NOTIFICACIONES PUSH ====================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'Finca La Herradura',
        body: event.data.text() || 'Nueva notificación',
        icon: '/icons/icon-192x192.png'
      };
    }
  }
  
  const notificationOptions = {
    body: notificationData.body || 'Nueva notificación de la finca',
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: notificationData.tag || 'general',
    data: notificationData.data || {},
    actions: getNotificationActions(notificationData.type),
    vibrate: [200, 100, 200],
    requireInteraction: notificationData.priority === 'high',
    silent: notificationData.priority === 'low',
    timestamp: Date.now(),
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Finca La Herradura',
      notificationOptions
    )
  );
});

// ==================== MANEJO DE CLICKS EN NOTIFICACIONES ====================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  event.waitUntil(
    handleNotificationClick(action, data)
  );
});

// ==================== SINCRONIZACIÓN EN BACKGROUND ====================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  } else if (event.tag === 'sync-images') {
    event.waitUntil(syncImages());
  } else if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

// ==================== BACKGROUND FETCH ====================
self.addEventListener('backgroundfetch', (event) => {
  if (event.tag === 'weather-update') {
    event.waitUntil(handleWeatherUpdate(event));
  } else if (event.tag === 'data-export') {
    event.waitUntil(handleDataExport(event));
  }
});

// ==================== FUNCIONES DE MANEJO DE CACHE ====================
async function handleStaticFile(request) {
  try {
    // Cache first para archivos estáticos
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no está en cache, buscar en red y cachear
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] Error handling static file:', error);
    return await getOfflineFallback(request);
  }
}

async function handleAPIRequest(request) {
  try {
    // Network first para APIs
    const networkResponse = await fetch(request);
    
    // CORRECCIÓN: Solo cachear requests GET con respuesta exitosa
    if (networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(DATA_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] Network failed for API request:', error);
    
    // Fallback a cache SOLO para requests GET
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Si no hay cache o no es GET, retornar datos simulados para APIs críticas
    return await getOfflineAPIResponse(request);
  }
}

async function handleImageRequest(request) {
  try {
    // Cache first para imágenes
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Retornar imagen placeholder
    return await getPlaceholderImage();
  }
}

async function handleFirebaseRequest(request) {
  try {
    // Para Firebase, siempre usar red (no cachear)
    const networkResponse = await fetch(request);
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] Firebase request failed:', error);
    
    // Para requests de Firebase offline, no intentar cache
    if (request.url.includes('firestore')) {
      return new Response(JSON.stringify({
        error: 'offline',
        message: 'Firestore no disponible sin conexión'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

async function handleDynamicRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Fallback para páginas HTML
    if (request.destination === 'document') {
      const cachedResponse = await caches.match('/index.html');
      return cachedResponse || await getOfflinePage();
    }
    
    throw error;
  }
}

// ==================== FUNCIONES DE UTILIDAD ====================
function isStaticFile(url) {
  return STATIC_FILES.some(file => url.pathname.endsWith(file)) ||
         url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/);
}

function isAPIRequest(url) {
  return API_URLS.some(apiUrl => url.href.startsWith(apiUrl)) ||
         url.pathname.startsWith('/api/');
}

function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/);
}

function isFirebaseRequest(url) {
  return url.hostname.includes('firebase') || 
         url.hostname.includes('firestore') ||
         url.hostname.includes('googleapis.com');
}

// CORRECCIÓN: Función auxiliar para verificar si se puede cachear
function canBeCached(request) {
  return request.method === 'GET' && 
         !request.url.includes('firestore') && 
         !request.url.includes('firebase');
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName !== CACHE_NAME && 
          cacheName !== DATA_CACHE_NAME && 
          cacheName !== STATIC_CACHE_NAME) {
        console.log('[SW] Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

async function initializeServiceWorker() {
  // Configuración inicial del SW
  await setDefaultNotificationOptions();
  await setupIndexedDB();
  await preloadCriticalData();
}

async function setupBackgroundSync() {
  // Registrar tareas de sincronización
  try {
    await self.registration.sync.register('sync-data');
    console.log('[SW] Background sync registered');
  } catch (error) {
    console.error('[SW] Background sync registration failed:', error);
  }
}

// ==================== FUNCIONES DE NOTIFICACIONES ====================
function getNotificationActions(type) {
  const actions = {
    'recordatorio': [
      { action: 'complete', title: '✓ Completar', icon: '/icons/check.png' },
      { action: 'postpone', title: '⏰ Posponer', icon: '/icons/clock.png' }
    ],
    'alerta': [
      { action: 'view', title: '👁️ Ver detalles', icon: '/icons/eye.png' },
      { action: 'dismiss', title: '✕ Descartar', icon: '/icons/close.png' }
    ],
    'produccion': [
      { action: 'register', title: '📝 Registrar', icon: '/icons/edit.png' },
      { action: 'view', title: '📊 Ver estadísticas', icon: '/icons/chart.png' }
    ],
    'clima': [
      { action: 'view', title: '🌤️ Ver clima', icon: '/icons/weather.png' },
      { action: 'alerts', title: '⚠️ Ver alertas', icon: '/icons/warning.png' }
    ]
  };
  
  return actions[type] || [
    { action: 'view', title: 'Ver detalles', icon: '/icons/eye.png' }
  ];
}

async function handleNotificationClick(action, data) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  let targetUrl = '/index.html';
  
  // Determinar URL objetivo basado en la acción
  switch (action) {
    case 'complete':
      targetUrl = `/recordatorios.html?complete=${data.recordatorioId}`;
      break;
    case 'postpone':
      targetUrl = `/recordatorios.html?postpone=${data.recordatorioId}`;
      break;
    case 'view':
      targetUrl = data.url || '/index.html';
      break;
    case 'register':
      targetUrl = `/produccion.html?action=new`;
      break;
    default:
      targetUrl = data.url || '/index.html';
  }
  
  // Buscar ventana existente o abrir nueva
  for (const client of clients) {
    if (client.url.includes(new URL(targetUrl).pathname)) {
      await client.focus();
      client.postMessage({
        action: 'notification-action',
        data: { action, ...data }
      });
      return;
    }
  }
  
  // Abrir nueva ventana
  await self.clients.openWindow(targetUrl);
}

// ==================== SINCRONIZACIÓN OFFLINE ====================
async function syncOfflineData() {
  console.log('[SW] Starting offline data sync...');
  
  try {
    // Obtener datos pendientes de IndexedDB
    const pendingData = await getPendingDataFromIndexedDB();
    
    for (const item of pendingData) {
      try {
        await syncDataItem(item);
        await markDataAsSynced(item.id);
      } catch (error) {
        console.error('[SW] Error syncing item:', item.id, error);
      }
    }
    
    console.log('[SW] Offline data sync completed');
    
    // Notificar a las páginas abiertas
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'sync-complete',
        data: { synced: pendingData.length }
      });
    });
    
  } catch (error) {
    console.error('[SW] Offline data sync failed:', error);
  }
}

async function syncDataItem(item) {
  const url = getApiUrl(item.type);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`
    },
    body: JSON.stringify(item.data)
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  return response.json();
}

// Funciones stub para sincronización adicional
async function syncImages() {
  console.log('[SW] Syncing images...');
  // Implementar sincronización de imágenes
}

async function syncReports() {
  console.log('[SW] Syncing reports...');
  // Implementar sincronización de reportes
}

async function handleWeatherUpdate(event) {
  console.log('[SW] Handling weather update...');
  // Implementar actualización de clima en background
}

async function handleDataExport(event) {
  console.log('[SW] Handling data export...');
  // Implementar exportación de datos en background
}

// ==================== FUNCIONES DE FALLBACK ====================
async function getOfflineFallback(request) {
  if (request.destination === 'document') {
    return await caches.match('/index.html');
  }
  
  return new Response('Offline - Resource not available', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

async function getOfflineAPIResponse(request) {
  // Respuestas simuladas para APIs críticas cuando no hay conexión
  const url = new URL(request.url);
  
  if (url.pathname.includes('weather')) {
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'Datos meteorológicos no disponibles sin conexión',
      cached_data: await getCachedWeatherData()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    error: 'offline',
    message: 'API no disponible sin conexión'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getPlaceholderImage() {
  // SVG placeholder para imágenes no disponibles
  const svg = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#9ca3af" text-anchor="middle" dy="0.3em">
        Imagen no disponible
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

async function getOfflinePage() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sin conexión - Finca La Herradura</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
        .container { max-width: 400px; margin: 0 auto; }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        .title { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #374151; }
        .message { color: #6b7280; margin-bottom: 2rem; }
        .btn { background: #22c55e; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1 class="title">Sin conexión a internet</h1>
        <p class="message">No puedes acceder a esta página sin conexión. Verifica tu conexión e intenta nuevamente.</p>
        <button class="btn" onclick="window.location.reload()">Reintentar</button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// ==================== FUNCIONES DE INDEXEDDB ====================
async function setupIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FincaHerraduraDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Crear stores si no existen
      const stores = ['pendingSync', 'cachedData', 'userPreferences', 'offlineQueue'];
      
      stores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      });
    };
  });
}

async function getPendingDataFromIndexedDB() {
  const db = await setupIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingSync'], 'readonly');
    const store = transaction.objectStore('pendingSync');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function markDataAsSynced(id) {
  const db = await setupIndexedDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingSync'], 'readwrite');
    const store = transaction.objectStore('pendingSync');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==================== FUNCIONES AUXILIARES ====================
function getApiUrl(type) {
  const apiUrls = {
    'arboles': '/api/arboles',
    'produccion': '/api/produccion',
    'gastos': '/api/gastos',
    'ventas': '/api/ventas',
    'tratamientos': '/api/tratamientos',
    'recordatorios': '/api/recordatorios'
  };
  
  return apiUrls[type] || '/api/data';
}

async function getAuthToken() {
  // Obtener token de autenticación para requests API
  try {
    const auth = firebase.auth();
    const user = auth.currentUser;
    return user ? await user.getIdToken() : null;
  } catch (error) {
    return null;
  }
}

async function getCachedWeatherData() {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const response = await cache.match('/api/weather');
    return response ? await response.json() : null;
  } catch (error) {
    return null;
  }
}

async function setDefaultNotificationOptions() {
  // Configurar opciones por defecto para notificaciones
  self.notificationDefaults = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: { timestamp: Date.now() }
  };
}

async function preloadCriticalData() {
  // Pre-cargar datos críticos para funcionamiento offline
  const criticalUrls = [
    '/api/dashboard-summary',
    '/api/user-preferences',
    '/api/notifications-config'
  ];
  
  const cache = await caches.open(DATA_CACHE_NAME);
  
  for (const url of criticalUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('[SW] Failed to preload:', url, error);
    }
  }
}

// ==================== MANEJO DE MENSAJES ====================
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'FORCE_SYNC':
      syncOfflineData().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map(name => caches.delete(name)));
}