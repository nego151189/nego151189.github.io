/* ========================================
   FINCA LA HERRADURA - SISTEMA OFFLINE
   Sistema offline integrado con Firebase y otros módulos
   ======================================== */

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isInitialized = false;
    this.syncQueue = [];
    this.pendingOperations = new Map();
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.maxRetries = 3;
    this.syncInterval = 30000; // 30 segundos
    this.compressionEnabled = true;
    
    // Configuración de almacenamiento
    this.storageQuota = 50 * 1024 * 1024; // 50MB
    this.cachePrefix = 'finca_';
    this.dataPrefix = 'finca_data_';
    
    // Referencias a otros managers
    this.authManager = null;
    this.db = null;
    
    // Tipos de datos a cachear
    this.cacheableTypes = [
      'arboles', 'produccion', 'gastos', 'ventas', 
      'riego', 'tratamientos', 'recordatorios', 'usuarios',
      'clientes', 'facturas', 'pagos'
    ];
    
    // Estado de conectividad
    this.connectionQuality = 'unknown';
    this.lastConnectionTest = null;
    
    this.init();
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  async init() {
    try {
      console.log('💾 Inicializando sistema offline...');
      
      // Configurar eventos de conexión
      this.setupConnectionListeners();
      
      // Configurar almacenamiento persistente
      await this.setupPersistentStorage();
      
      // Inicializar IndexedDB
      await this.initIndexedDB();
      
      // Cargar queue de sincronización
      await this.loadSyncQueue();
      
      // Configurar Service Worker
      await this.setupServiceWorker();
      
      // Esperar a que otros managers estén disponibles
      await this.waitForManagers();
      
      // Iniciar monitoreo automático
      this.startAutoSync();
      this.startConnectionMonitoring();
      
      // Limpiar datos antiguos
      await this.cleanupOldData();
      
      this.isInitialized = true;
      console.log('✅ Sistema offline inicializado correctamente');
      
      // Notificar inicialización
      this.broadcastEvent('offline_initialized', {
        isOnline: this.isOnline,
        pendingOperations: this.syncQueue.length
      });
      
    } catch (error) {
      console.error('❌ Error inicializando sistema offline:', error);
      // Continuar con funcionalidad limitada
      this.isInitialized = true;
    }
  }

  async waitForManagers() {
    return new Promise((resolve) => {
      const checkManagers = () => {
        if (window.authManager && window.db) {
          this.authManager = window.authManager;
          this.db = window.db;
          console.log('🔗 Managers vinculados al sistema offline');
          resolve();
        } else {
          setTimeout(checkManagers, 100);
        }
      };
      
      checkManagers();
      
      // Timeout para no bloquear indefinidamente
      setTimeout(resolve, 5000);
    });
  }

  setupConnectionListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Detectar cambios de conectividad más precisos
    this.startConnectionMonitoring();
  }

  async setupPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        console.log('📦 Almacenamiento persistente:', persistent);
        
        if (!persistent) {
          console.warn('⚠️ No se pudo obtener almacenamiento persistente');
        }
      } catch (error) {
        console.warn('⚠️ Error configurando almacenamiento persistente:', error);
      }
    }
    
    // Verificar cuota disponible
    await this.checkStorageQuota();
  }

  async setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('⚙️ Service Worker registrado:', registration.scope);
        
        // Configurar comunicación con SW
        this.setupServiceWorkerCommunication(registration);
        
      } catch (error) {
        console.warn('⚠️ Error registrando Service Worker:', error);
      }
    }
  }

  setupServiceWorkerCommunication(registration) {
    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });
    
    // Notificar al SW sobre actualizaciones de datos
    this.sendMessageToSW = (message) => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message);
      }
    };
  }

  // ==========================================
  // GESTIÓN DE CONECTIVIDAD
  // ==========================================

  handleOnline() {
    console.log('🌐 Conexión restaurada');
    this.isOnline = true;
    this.connectionQuality = 'unknown';
    
    // Mostrar notificación
    this.showConnectionStatus('online');
    
    // Test de calidad de conexión
    this.testConnectionQuality();
    
    // Sincronizar datos pendientes después de un delay
    setTimeout(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.syncPendingData();
      }
    }, 1000);
    
    // Notificar a otros módulos
    this.broadcastConnectivityChange(true);
  }

  handleOffline() {
    console.log('📱 Modo offline activado');
    this.isOnline = false;
    this.connectionQuality = 'offline';
    
    // Mostrar notificación
    this.showConnectionStatus('offline');
    
    // Notificar a otros módulos
    this.broadcastConnectivityChange(false);
  }

  startConnectionMonitoring() {
    // Verificar conectividad real cada 30 segundos
    setInterval(async () => {
      const actuallyOnline = await this.checkRealConnectivity();
      
      if (actuallyOnline !== this.isOnline) {
        this.isOnline = actuallyOnline;
        if (actuallyOnline) {
          this.handleOnline();
        } else {
          this.handleOffline();
        }
      }
      
      // Actualizar calidad de conexión si estamos online
      if (this.isOnline) {
        await this.testConnectionQuality();
      }
    }, 30000);
  }

  async checkRealConnectivity() {
    try {
      // Intentar conexión con Firebase
      if (this.db) {
        await this.db.collection('_connectivity_test').doc('test').get();
        return true;
      }
      
      // Fallback: ping a servidor confiable
      const response = await fetch('https://www.google.com/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async testConnectionQuality() {
    const startTime = Date.now();
    
    try {
      await this.checkRealConnectivity();
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 1000) {
        this.connectionQuality = 'good';
      } else if (responseTime < 3000) {
        this.connectionQuality = 'fair';
      } else {
        this.connectionQuality = 'poor';
      }
      
      this.lastConnectionTest = Date.now();
      
    } catch (error) {
      this.connectionQuality = 'offline';
    }
    
    console.log('📶 Calidad de conexión:', this.connectionQuality);
  }

  broadcastConnectivityChange(isOnline) {
    window.dispatchEvent(new CustomEvent('connectivityChange', {
      detail: { 
        isOnline, 
        quality: this.connectionQuality,
        timestamp: Date.now()
      }
    }));
  }

  // ==========================================
  // ALMACENAMIENTO DE DATOS
  // ==========================================

  async saveData(type, id, data, options = {}) {
    try {
      if (!this.cacheableTypes.includes(type)) {
        console.warn(`Tipo ${type} no es cacheable`);
        return false;
      }
      
      const key = `${this.dataPrefix}${type}_${id}`;
      const timestamp = Date.now();
      
      const dataToStore = {
        data: this.compressionEnabled ? await this.compressData(data) : data,
        timestamp,
        compressed: this.compressionEnabled,
        version: options.version || 1,
        userId: this.getCurrentUserId(),
        synced: this.isOnline && !options.forceOffline,
        type: type,
        id: id,
        ...options.metadata
      };
      
      // Guardar en IndexedDB preferentemente
      await this.saveToIndexedDB('offlineData', key, dataToStore);
      
      // Fallback a localStorage si falla IndexedDB
      try {
        localStorage.setItem(key, JSON.stringify(dataToStore));
      } catch (lsError) {
        console.warn('Error guardando en localStorage:', lsError);
      }
      
      // Si estamos offline o forzamos offline, agregar a queue de sync
      if (!this.isOnline || options.forceOffline) {
        await this.addToSyncQueue('save', type, id, data, options);
      } else if (this.db) {
        // Intentar sync inmediato si estamos online
        try {
          await this.syncDataItem({ type, id, data, operation: 'save' });
        } catch (syncError) {
          console.warn('Sync inmediato falló, agregando a queue:', syncError);
          await this.addToSyncQueue('save', type, id, data, options);
        }
      }
      
      console.log(`💾 Datos guardados offline: ${type}/${id}`);
      return true;
      
    } catch (error) {
      console.error('Error guardando datos offline:', error);
      throw error;
    }
  }

  async loadData(type, id) {
    try {
      const key = `${this.dataPrefix}${type}_${id}`;
      
      // Intentar cargar desde IndexedDB primero
      let stored = await this.loadFromIndexedDB('offlineData', key);
      
      // Fallback a localStorage
      if (!stored) {
        const localData = localStorage.getItem(key);
        if (localData) {
          stored = JSON.parse(localData);
        }
      }
      
      if (!stored) return null;
      
      // Descomprimir si es necesario
      const data = stored.compressed 
        ? await this.decompressData(stored.data)
        : stored.data;
      
      return {
        ...stored,
        data
      };
      
    } catch (error) {
      console.error('Error cargando datos offline:', error);
      return null;
    }
  }

  async deleteData(type, id) {
    try {
      const key = `${this.dataPrefix}${type}_${id}`;
      
      // Eliminar de IndexedDB
      await this.deleteFromIndexedDB('offlineData', key);
      
      // Eliminar de localStorage
      localStorage.removeItem(key);
      
      // Si estamos offline, agregar eliminación a queue
      if (!this.isOnline) {
        await this.addToSyncQueue('delete', type, id);
      } else if (this.db) {
        // Sync inmediato si estamos online
        try {
          await this.syncDataItem({ type, id, operation: 'delete' });
        } catch (syncError) {
          await this.addToSyncQueue('delete', type, id);
        }
      }
      
      console.log(`🗑️ Datos eliminados offline: ${type}/${id}`);
      return true;
      
    } catch (error) {
      console.error('Error eliminando datos offline:', error);
      throw error;
    }
  }

  async getAllData(type) {
    try {
      const prefix = `${this.dataPrefix}${type}_`;
      const results = [];
      
      // Obtener desde IndexedDB
      const indexedResults = await this.getAllFromIndexedDB('offlineData', prefix);
      results.push(...indexedResults);
      
      // Complementar con localStorage si es necesario
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const id = key.replace(prefix, '');
          
          // Solo agregar si no está ya en results
          if (!results.find(r => r.id === id)) {
            const data = await this.loadData(type, id);
            if (data) {
              results.push({ id, ...data });
            }
          }
        }
      }
      
      return results.sort((a, b) => b.timestamp - a.timestamp);
      
    } catch (error) {
      console.error('Error obteniendo todos los datos:', error);
      return [];
    }
  }

  // ==========================================
  // INDEXEDDB
  // ==========================================

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FincaHerraduraDB', 2);
      
      request.onerror = () => {
        console.warn('Error inicializando IndexedDB:', request.error);
        resolve(null); // Continuar sin IndexedDB
      };
      
      request.onsuccess = () => {
        this.idb = request.result;
        console.log('📚 IndexedDB inicializado correctamente');
        resolve(this.idb);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear stores necesarios
        const stores = [
          'offlineData', 'syncQueue', 'userPreferences', 
          'cachedResources', 'loginLogs', 'errorLogs'
        ];
        
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            
            // Crear índices útiles
            if (storeName === 'offlineData') {
              store.createIndex('type', 'type');
              store.createIndex('timestamp', 'timestamp');
              store.createIndex('synced', 'synced');
            }
          }
        });
      };
    });
  }

  async saveToIndexedDB(storeName, key, data) {
    if (!this.idb) return false;
    
    return new Promise((resolve, reject) => {
      const transaction = this.idb.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put({
        id: key,
        ...data,
        savedAt: Date.now()
      });
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn('Error guardando en IndexedDB:', request.error);
        resolve(false);
      };
    });
  }

  async loadFromIndexedDB(storeName, key) {
    if (!this.idb) return null;
    
    return new Promise((resolve) => {
      const transaction = this.idb.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result : null);
      };
      
      request.onerror = () => {
        console.warn('Error cargando desde IndexedDB:', request.error);
        resolve(null);
      };
    });
  }

  async deleteFromIndexedDB(storeName, key) {
    if (!this.idb) return false;
    
    return new Promise((resolve) => {
      const transaction = this.idb.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn('Error eliminando de IndexedDB:', request.error);
        resolve(false);
      };
    });
  }

  async getAllFromIndexedDB(storeName, prefix = null) {
    if (!this.idb) return [];
    
    return new Promise((resolve) => {
      const transaction = this.idb.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result || [];
        
        if (prefix) {
          results = results.filter(item => item.id && item.id.startsWith(prefix));
        }
        
        resolve(results);
      };
      
      request.onerror = () => {
        console.warn('Error obteniendo todos desde IndexedDB:', request.error);
        resolve([]);
      };
    });
  }

  // ==========================================
  // QUEUE DE SINCRONIZACIÓN
  // ==========================================

  async addToSyncQueue(operation, type, id, data = null, options = {}) {
    const queueItem = {
      id: this.generateUniqueId(),
      operation,
      type,
      itemId: id,
      data,
      options,
      timestamp: Date.now(),
      retries: 0,
      userId: this.getCurrentUserId(),
      priority: options.priority || 'normal'
    };
    
    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();
    
    console.log(`📋 Operación agregada a queue: ${operation} ${type}/${id}`);
    
    // Notificar actualización de queue
    this.broadcastEvent('sync_queue_updated', {
      queueLength: this.syncQueue.length,
      operation: operation
    });
  }

  async syncPendingData() {
    if (this.syncInProgress || !this.isOnline || !this.db) {
      return { success: false, message: 'Sync no disponible' };
    }
    
    if (this.syncQueue.length === 0) {
      return { success: true, message: 'No hay datos pendientes' };
    }
    
    console.log('🔄 Iniciando sincronización de datos pendientes...');
    this.syncInProgress = true;
    this.showSyncStatus(true);
    
    try {
      const totalItems = this.syncQueue.length;
      let syncedItems = 0;
      let failedItems = 0;
      const failedOperations = [];
      
      // Procesar queue en lotes para evitar sobrecarga
      const batchSize = this.getBatchSize();
      
      while (this.syncQueue.length > 0) {
        const batch = this.syncQueue.splice(0, batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (item) => {
            try {
              await this.syncDataItem(item);
              syncedItems++;
              this.updateSyncProgress(syncedItems, totalItems);
              return { success: true, item };
            } catch (error) {
              console.error('Error sincronizando item:', error);
              
              // Reintentar si no se han agotado los intentos
              if (item.retries < this.maxRetries) {
                item.retries++;
                item.lastError = error.message;
                item.nextRetry = Date.now() + (1000 * Math.pow(2, item.retries)); // Backoff exponencial
                this.syncQueue.push(item);
                
                return { success: false, item, error, retry: true };
              } else {
                failedItems++;
                failedOperations.push({ item, error: error.message });
                
                // Guardar en log de errores
                await this.logError('sync_failed', error, item);
                
                return { success: false, item, error, retry: false };
              }
            }
          })
        );
        
        // Pequeña pausa entre lotes para no sobrecargar
        if (this.syncQueue.length > 0) {
          await this.sleep(100);
        }
      }
      
      this.lastSyncTime = Date.now();
      await this.saveSyncQueue();
      
      const result = {
        success: failedItems === 0,
        syncedItems,
        failedItems,
        totalItems,
        failedOperations
      };
      
      console.log(`✅ Sincronización completada:`, result);
      this.showSyncComplete(syncedItems, failedItems);
      
      // Notificar resultado
      this.broadcastEvent('sync_completed', result);
      
      return result;
      
    } catch (error) {
      console.error('Error en sincronización:', error);
      this.showSyncError(error);
      
      const result = {
        success: false,
        error: error.message,
        syncedItems: 0,
        failedItems: this.syncQueue.length
      };
      
      this.broadcastEvent('sync_failed', result);
      return result;
      
    } finally {
      this.syncInProgress = false;
      this.showSyncStatus(false);
    }
  }

  async syncDataItem(item) {
    const { operation, type, itemId, data } = item;
    
    if (!this.db) {
      throw new Error('Base de datos no disponible');
    }
    
    // Obtener colección apropiada
    const collection = this.getCollectionName(type);
    
    try {
      switch (operation) {
        case 'save':
        case 'create':
          await this.syncCreateOperation(collection, itemId, data, item.options);
          break;
          
        case 'update':
          await this.syncUpdateOperation(collection, itemId, data, item.options);
          break;
          
        case 'delete':
          await this.syncDeleteOperation(collection, itemId, item.options);
          break;
          
        default:
          throw new Error(`Operación desconocida: ${operation}`);
      }
      
      // Marcar como sincronizado en almacenamiento local
      await this.markAsSynced(type, itemId);
      
    } catch (error) {
      console.error(`Error sincronizando ${operation} ${type}/${itemId}:`, error);
      throw error;
    }
  }

  async syncCreateOperation(collection, id, data, options) {
    const docData = {
      ...data,
      syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Agregar metadatos del usuario si están disponibles
    if (this.authManager?.currentUser) {
      docData.createdBy = this.authManager.currentUser.uid;
      docData.fincaId = 'finca_la_herradura';
    }
    
    await this.db.collection(collection).doc(id).set(docData, { merge: true });
  }

  async syncUpdateOperation(collection, id, data, options) {
    const docData = {
      ...data,
      syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (this.authManager?.currentUser) {
      docData.updatedBy = this.authManager.currentUser.uid;
    }
    
    await this.db.collection(collection).doc(id).update(docData);
  }

  async syncDeleteOperation(collection, id, options) {
    await this.db.collection(collection).doc(id).delete();
  }

  getCollectionName(type) {
    const collectionMap = {
      'arboles': 'arboles',
      'produccion': 'cosechas_diarias',
      'ventas': 'ventas_directas',
      'gastos': 'gastos',
      'clientes': 'clientes',
      'tratamientos': 'tratamientos',
      'riego': 'riegos',
      'recordatorios': 'recordatorios',
      'usuarios': 'usuarios'
    };
    
    return collectionMap[type] || type;
  }

  getBatchSize() {
    // Ajustar tamaño del lote según la calidad de conexión
    switch (this.connectionQuality) {
      case 'good': return 10;
      case 'fair': return 5;
      case 'poor': return 2;
      default: return 3;
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  getCurrentUserId() {
    return this.authManager?.currentUser?.uid || 'anonymous';
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentUsed = quota > 0 ? (used / quota) * 100 : 0;
        
        console.log(`📊 Almacenamiento: ${Math.round(used / 1024 / 1024)}MB usados de ${Math.round(quota / 1024 / 1024)}MB (${percentUsed.toFixed(1)}%)`);
        
        // Alertar si se está quedando sin espacio
        if (percentUsed > 80) {
          console.warn('⚠️ Espacio de almacenamiento bajo');
          this.broadcastEvent('storage_low', { used, quota, percentUsed });
        }
        
        return { used, quota, percentUsed };
      } catch (error) {
        console.warn('No se pudo verificar cuota de almacenamiento:', error);
        return null;
      }
    }
    
    return null;
  }

  async cleanupOldData() {
    try {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
      let cleanedItems = 0;
      
      // Limpiar localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        
        if (key && (key.startsWith(this.cachePrefix) || key.startsWith(this.dataPrefix))) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            
            if (data.timestamp && (now - data.timestamp) > maxAge) {
              localStorage.removeItem(key);
              cleanedItems++;
            }
          } catch {
            // Eliminar items corruptos
            localStorage.removeItem(key);
            cleanedItems++;
          }
        }
      }
      
      // Limpiar IndexedDB
      if (this.idb) {
        await this.cleanupIndexedDB(maxAge);
      }
      
      if (cleanedItems > 0) {
        console.log(`🧹 Limpieza completada: ${cleanedItems} items eliminados`);
      }
      
    } catch (error) {
      console.error('Error en limpieza de datos:', error);
    }
  }

  async cleanupIndexedDB(maxAge) {
    // Implementar limpieza de IndexedDB
    const stores = ['offlineData', 'cachedResources', 'loginLogs', 'errorLogs'];
    
    for (const storeName of stores) {
      try {
        const allData = await this.getAllFromIndexedDB(storeName);
        const now = Date.now();
        
        for (const item of allData) {
          if (item.timestamp && (now - item.timestamp) > maxAge) {
            await this.deleteFromIndexedDB(storeName, item.id);
          }
        }
      } catch (error) {
        console.warn(`Error limpiando store ${storeName}:`, error);
      }
    }
  }

  // ==========================================
  // COMPRESIÓN
  // ==========================================

  async compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      
      // Usar CompressionStream si está disponible
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(jsonString));
        writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        // Convertir a array para JSON serialization
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return Array.from(compressed);
      } else {
        // Fallback: simple encoding
        return btoa(unescape(encodeURIComponent(jsonString)));
      }
    } catch (error) {
      console.warn('Error comprimiendo datos, guardando sin comprimir:', error);
      return data;
    }
  }

  async decompressData(compressedData) {
    try {
      if (Array.isArray(compressedData)) {
        // Datos comprimidos con CompressionStream
        if ('DecompressionStream' in window) {
          const stream = new DecompressionStream('gzip');
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          
          writer.write(new Uint8Array(compressedData));
          writer.close();
          
          const chunks = [];
          let done = false;
          
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) chunks.push(value);
          }
          
          const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          
          for (const chunk of chunks) {
            decompressed.set(chunk, offset);
            offset += chunk.length;
          }
          
          const jsonString = new TextDecoder().decode(decompressed);
          return JSON.parse(jsonString);
        }
      } else if (typeof compressedData === 'string') {
        // Fallback: simple decoding
        const jsonString = decodeURIComponent(escape(atob(compressedData)));
        return JSON.parse(jsonString);
      }
      
      // Si no se puede descomprimir, asumir que no está comprimido
      return compressedData;
      
    } catch (error) {
      console.warn('Error descomprimiendo datos:', error);
      return compressedData;
    }
  }

  // ==========================================
  // PERSISTENCIA DE QUEUE
  // ==========================================

  async saveSyncQueue() {
    try {
      // Guardar en IndexedDB preferentemente
      if (this.idb) {
        await this.saveToIndexedDB('syncQueue', 'main', {
          queue: this.syncQueue,
          lastSyncTime: this.lastSyncTime,
          savedAt: Date.now()
        });
      }
      
      // Fallback a localStorage
      localStorage.setItem('finca_sync_queue', JSON.stringify({
        queue: this.syncQueue,
        lastSyncTime: this.lastSyncTime
      }));
      
    } catch (error) {
      console.error('Error guardando queue de sincronización:', error);
    }
  }

  async loadSyncQueue() {
    try {
      let queueData = null;
      
      // Intentar cargar desde IndexedDB
      if (this.idb) {
        queueData = await this.loadFromIndexedDB('syncQueue', 'main');
      }
      
      // Fallback a localStorage
      if (!queueData) {
        const saved = localStorage.getItem('finca_sync_queue');
        queueData = saved ? JSON.parse(saved) : null;
      }
      
      if (queueData) {
        this.syncQueue = queueData.queue || [];
        this.lastSyncTime = queueData.lastSyncTime;
        console.log(`📋 Queue de sincronización cargada: ${this.syncQueue.length} items`);
      } else {
        this.syncQueue = [];
      }
      
    } catch (error) {
      console.error('Error cargando queue de sincronización:', error);
      this.syncQueue = [];
    }
  }

  async markAsSynced(type, id) {
    const key = `${this.dataPrefix}${type}_${id}`;
    
    // Actualizar en IndexedDB
    const stored = await this.loadFromIndexedDB('offlineData', key);
    if (stored) {
      stored.synced = true;
      stored.syncedAt = Date.now();
      await this.saveToIndexedDB('offlineData', key, stored);
    }
    
    // Actualizar en localStorage
    const localData = localStorage.getItem(key);
    if (localData) {
      const data = JSON.parse(localData);
      data.synced = true;
      data.syncedAt = Date.now();
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // ==========================================
  // LOGGING Y ERRORES
  // ==========================================

  async logError(type, error, context = {}) {
    const errorLog = {
      id: this.generateUniqueId(),
      type: type,
      message: error.message || error,
      stack: error.stack,
      context: context,
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent,
      isOnline: this.isOnline
    };
    
    try {
      if (this.idb) {
        await this.saveToIndexedDB('errorLogs', errorLog.id, errorLog);
      }
      
      console.error(`[${type}] Error logged:`, error);
    } catch (logError) {
      console.error('Error guardando log de error:', logError);
    }
  }

  // ==========================================
  // AUTOMATIZACIÓN
  // ==========================================

  startAutoSync() {
    // Sincronizar cada cierto intervalo si hay datos pendientes
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.syncInProgress) {
        console.log('⏰ Auto-sincronización iniciada');
        this.syncPendingData();
      }
    }, this.syncInterval);
    
    // Sync al recuperar conexión (con delay)
    window.addEventListener('online', () => {
      setTimeout(() => {
        if (this.syncQueue.length > 0) {
          this.syncPendingData();
        }
      }, 2000);
    });
  }

  // ==========================================
  // INTERFAZ DE USUARIO
  // ==========================================

  showConnectionStatus(status) {
    this.broadcastEvent('connection_status_change', { 
      status, 
      isOnline: status === 'online',
      quality: this.connectionQuality
    });
    
    // Mostrar notificación visual
    this.showNotification(
      status === 'online' ? '🌐 Conectado' : '📱 Sin conexión',
      status === 'online' ? 'success' : 'warning'
    );
  }

  showSyncStatus(syncing) {
    this.broadcastEvent('sync_status_change', { syncing });
  }

  updateSyncProgress(completed, total) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    this.broadcastEvent('sync_progress', { 
      completed, 
      total, 
      percentage: Math.round(percentage)
    });
  }

  showSyncComplete(successful, failed) {
    const message = failed > 0 
      ? `⚠️ Sincronización: ${successful} exitosos, ${failed} fallidos`
      : `✅ Sincronización completada: ${successful} items`;
    
    this.showNotification(message, failed > 0 ? 'warning' : 'success');
  }

  showSyncError(error) {
    this.showNotification('❌ Error en sincronización', 'error');
    this.logError('sync_error', error);
  }

  showNotification(message, type = 'info') {
    this.broadcastEvent('notification', { message, type, timestamp: Date.now() });
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // ==========================================
  // COMUNICACIÓN
  // ==========================================

  broadcastEvent(eventType, data = {}) {
    window.dispatchEvent(new CustomEvent('offlineUpdate', {
      detail: { 
        eventType, 
        data, 
        timestamp: Date.now(),
        isOnline: this.isOnline,
        queueLength: this.syncQueue.length
      }
    }));
  }

  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache actualizado por Service Worker');
        break;
      case 'BACKGROUND_SYNC':
        console.log('Sincronización en segundo plano completada');
        this.loadSyncQueue(); // Recargar queue por si cambió
        break;
      case 'STORAGE_QUOTA_EXCEEDED':
        this.showNotification('Almacenamiento lleno, limpiando datos antiguos', 'warning');
        this.cleanupOldData();
        break;
      default:
        console.log('Mensaje del Service Worker:', event.data);
    }
  }

  // ==========================================
  // API PÚBLICA
  // ==========================================

  getStatus() {
    return {
      isOnline: this.isOnline,
      connectionQuality: this.connectionQuality,
      pendingOperations: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      isInitialized: this.isInitialized
    };
  }

  getPendingCount() {
    return this.syncQueue.length;
  }

  async forcSync() {
    if (!this.isOnline) {
      throw new Error('Sin conexión para sincronizar');
    }
    
    return await this.syncPendingData();
  }

  async clearAllData() {
    // Limpiar localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(this.cachePrefix) || key.startsWith(this.dataPrefix))) {
        localStorage.removeItem(key);
      }
    }
    
    // Limpiar IndexedDB
    if (this.idb) {
      const stores = ['offlineData', 'syncQueue', 'cachedResources'];
      for (const storeName of stores) {
        const allData = await this.getAllFromIndexedDB(storeName);
        for (const item of allData) {
          await this.deleteFromIndexedDB(storeName, item.id);
        }
      }
    }
    
    // Limpiar queue
    this.syncQueue = [];
    await this.saveSyncQueue();
    
    console.log('🧹 Todos los datos offline eliminados');
    this.broadcastEvent('data_cleared');
  }
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

let offlineManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  offlineManager = new OfflineManager();
  window.offlineManager = offlineManager;
  window.offline = offlineManager; // Alias
  
  console.log('💾 Sistema offline disponible globalmente');
});

// CRÍTICO: Export default para ES6 modules
export default offlineManager;

// Exportar para otros módulos (mantener para compatibilidad)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineManager;
}

// Función para detectar problemas específicos de Firestore
function checkFirestoreHealth() {
    if (!window.db) return;
    
    // Test simple de conectividad
    const testCollection = window.db.collection('_health_check');
    
    testCollection.limit(1).get()
        .then(() => {
            console.log('✅ Firestore conectado correctamente');
        })
        .catch(error => {
            console.error('❌ Problema de conectividad Firestore:', error);
            
            if (error.message.includes('QUIC')) {
                console.log('🔧 Reintentando con configuración alternativa...');
                window.location.reload(); // Forzar reconfiguración
            }
        });
}



// Ejecutar verificación cada 30 segundos
setInterval(checkFirestoreHealth, 30000);
