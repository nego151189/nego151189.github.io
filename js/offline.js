/* ========================================
   FINCA LA HERRADURA - SISTEMA OFFLINE CORREGIDO
   Sin errors que interfieran con Firebase Auth
   ======================================== */

class OfflineManager {
    constructor() {
        this.isInitialized = false;
        this.db = null;
        this.dbName = 'FincaLaHerradura';
        this.dbVersion = 3;
        this.collections = new Map();
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        this.storageQuota = null;
    }

    async init() {
        try {
            console.log('Inicializando sistema offline...');
            
            // Configurar listeners de conectividad
            this.setupConnectivityListeners();
            
            // Solicitar almacenamiento persistente
            await this.requestPersistentStorage();
            
            // Verificar espacio disponible
            await this.checkStorageQuota();
            
            // Inicializar IndexedDB
            await this.initIndexedDB();
            
            // NO registrar Service Worker automáticamente para evitar conflictos
            // await this.setupServiceWorker();
            
            // Vincular managers
            this.linkManagers();
            
            this.isInitialized = true;
            console.log('Sistema offline inicializado correctamente');
            
            return true;
            
        } catch (error) {
            console.error('Error inicializando sistema offline:', error);
            return false;
        }
    }

    async requestPersistentStorage() {
        try {
            if ('storage' in navigator && 'persist' in navigator.storage) {
                const granted = await navigator.storage.persist();
                console.log('Almacenamiento persistente:', granted);
                return granted;
            }
            return false;
        } catch (error) {
            console.warn('Error solicitando almacenamiento persistente:', error);
            return false;
        }
    }

    async checkStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                this.storageQuota = estimate;
                
                const usedMB = Math.round(estimate.usage / 1024 / 1024);
                const totalMB = Math.round(estimate.quota / 1024 / 1024);
                const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);
                
                console.log(`Almacenamiento: ${usedMB}MB usados de ${totalMB}MB (${percentUsed}%)`);
                
                if (percentUsed > 80) {
                    console.warn('Advertencia: Almacenamiento casi lleno');
                }
                
                return estimate;
            }
            return null;
        } catch (error) {
            console.warn('Error verificando cuota de almacenamiento:', error);
            return null;
        }
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Error abriendo IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB inicializado correctamente');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Limpiar stores existentes si hay cambio de versión
                const existingStores = Array.from(db.objectStoreNames);
                existingStores.forEach(storeName => {
                    if (db.objectStoreNames.contains(storeName)) {
                        db.deleteObjectStore(storeName);
                    }
                });
                
                // Crear stores necesarios
                const stores = [
                    'sectores',
                    'arboles', 
                    'cosechas',
                    'produccion_diaria',
                    'quality_controls',
                    'harvest_plans',
                    'treatments',
                    'riegos',
                    'usuarios',
                    'configuracion',
                    'sync_queue'
                ];
                
                stores.forEach(storeName => {
                    const store = db.createObjectStore(storeName, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // Índices útiles
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('updated_at', 'updated_at', { unique: false });
                    
                    if (storeName === 'arboles') {
                        store.createIndex('blockId', 'blockId', { unique: false });
                        store.createIndex('correlative', 'correlative', { unique: false });
                    }
                    
                    if (storeName === 'cosechas') {
                        store.createIndex('arbolId', 'arbolId', { unique: false });
                        store.createIndex('fecha', 'fecha', { unique: false });
                    }
                });
                
                console.log('Estructura IndexedDB actualizada');
            };
        });
    }

    // ✅ FUNCIÓN CORREGIDA - Sin comentario que rompe la sintaxis
    async setupServiceWorker() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none'
                });
                
                console.log('Service Worker registrado correctamente');
                
                // Escuchar actualizaciones
                registration.addEventListener('updatefound', () => {
                    console.log('Nueva versión del Service Worker disponible');
                });
                
                return registration;
            }
        } catch (error) {
            console.warn('Error registrando Service Worker:', error);
        }
    }

    setupConnectivityListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Conexión restaurada');
            this.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Conexión perdida');
        });
        
        // Verificar calidad de conexión
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                const quality = this.getConnectionQuality();
                console.log('Calidad de conexión:', quality);
            });
        }
    }

    getConnectionQuality() {
        if (!navigator.onLine) return 'offline';
        
        if ('connection' in navigator) {
            const conn = navigator.connection;
            const effectiveType = conn.effectiveType;
            
            switch (effectiveType) {
                case 'slow-2g':
                case '2g':
                    return 'poor';
                case '3g':
                    return 'good';
                case '4g':
                    return 'excellent';
                default:
                    return 'unknown';
            }
        }
        
        return 'good';
    }

    linkManagers() {
        // Hacer disponible para otros managers
        if (typeof window !== 'undefined') {
            window.offlineManager = this;
        }
        console.log('Managers vinculados al sistema offline');
    }

    // ==========================================
    // OPERACIONES CRUD
    // ==========================================

    async saveData(collection, id, data) {
        try {
            if (!this.db) {
                throw new Error('IndexedDB no inicializado');
            }
            
            const timestamp = new Date().toISOString();
            const record = {
                id,
                data: {
                    ...data,
                    updated_at: timestamp,
                    synced: this.isOnline
                },
                timestamp,
                collection
            };
            
            const transaction = this.db.transaction([collection], 'readwrite');
            const store = transaction.objectStore(collection);
            
            await new Promise((resolve, reject) => {
                const request = store.put(record);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            // Agregar a cola de sincronización si estamos offline
            if (!this.isOnline) {
                await this.addToSyncQueue('save', collection, id, data);
            }
            
            return record;
            
        } catch (error) {
            console.error('Error guardando datos:', error);
            throw error;
        }
    }

    async loadData(collection, id) {
        try {
            if (!this.db) {
                throw new Error('IndexedDB no inicializado');
            }
            
            const transaction = this.db.transaction([collection], 'readonly');
            const store = transaction.objectStore(collection);
            
            const result = await new Promise((resolve, reject) => {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return result ? result.data : null;
            
        } catch (error) {
            console.error('Error cargando datos:', error);
            return null;
        }
    }

    async getAllData(collection) {
        try {
            if (!this.db) {
                throw new Error('IndexedDB no inicializado');
            }
            
            const transaction = this.db.transaction([collection], 'readonly');
            const store = transaction.objectStore(collection);
            
            const results = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return results.map(record => ({
                id: record.id,
                data: record.data,
                timestamp: record.timestamp
            }));
            
        } catch (error) {
            console.error('Error obteniendo todos los datos:', error);
            return [];
        }
    }

    async deleteData(collection, id) {
        try {
            if (!this.db) {
                throw new Error('IndexedDB no inicializado');
            }
            
            const transaction = this.db.transaction([collection], 'readwrite');
            const store = transaction.objectStore(collection);
            
            await new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            // Agregar a cola de sincronización
            if (!this.isOnline) {
                await this.addToSyncQueue('delete', collection, id);
            }
            
        } catch (error) {
            console.error('Error eliminando datos:', error);
            throw error;
        }
    }

    // ==========================================
    // COLA DE SINCRONIZACIÓN
    // ==========================================

    async addToSyncQueue(operation, collection, id, data = null) {
        try {
            const syncItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2),
                operation,
                collection,
                recordId: id,
                data,
                timestamp: new Date().toISOString(),
                attempts: 0,
                maxAttempts: 3
            };
            
            await this.saveData('sync_queue', syncItem.id, syncItem);
            this.syncQueue.push(syncItem);
            
        } catch (error) {
            console.error('Error agregando a cola de sync:', error);
        }
    }

    async processSyncQueue() {
        try {
            const queueItems = await this.getAllData('sync_queue');
            
            for (const item of queueItems) {
                try {
                    await this.syncItem(item.data);
                    await this.deleteData('sync_queue', item.id);
                } catch (error) {
                    console.warn('Error sincronizando item:', error);
                    
                    // Incrementar intentos
                    const attempts = item.data.attempts + 1;
                    if (attempts >= item.data.maxAttempts) {
                        console.error('Item descartado después de max intentos:', item);
                        await this.deleteData('sync_queue', item.id);
                    } else {
                        item.data.attempts = attempts;
                        await this.saveData('sync_queue', item.id, item.data);
                    }
                }
            }
            
        } catch (error) {
            console.error('Error procesando cola de sync:', error);
        }
    }

    async syncItem(item) {
        // Implementar sincronización con Firebase cuando esté disponible
        if (typeof window !== 'undefined' && window.db) {
            const { operation, collection, recordId, data } = item;
            
            switch (operation) {
                case 'save':
                    await window.db.collection(collection).doc(recordId).set(data);
                    break;
                case 'delete':
                    await window.db.collection(collection).doc(recordId).delete();
                    break;
            }
        }
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    async clearAllData() {
        try {
            if (!this.db) return;
            
            const storeNames = Array.from(this.db.objectStoreNames);
            const transaction = this.db.transaction(storeNames, 'readwrite');
            
            const promises = storeNames.map(storeName => {
                return new Promise((resolve, reject) => {
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });
            
            await Promise.all(promises);
            console.log('Todos los datos offline eliminados');
            
        } catch (error) {
            console.error('Error limpiando datos:', error);
        }
    }

    getStats() {
        return {
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            syncQueueSize: this.syncQueue.length,
            storageQuota: this.storageQuota,
            connectionQuality: this.getConnectionQuality()
        };
    }
}

// ==========================================
// INICIALIZACIÓN GLOBAL MEJORADA
// ==========================================

let offlineManager = null;

async function initializeOfflineManager() {
    if (offlineManager) {
        console.log('OfflineManager ya inicializado');
        return offlineManager;
    }
    
    try {
        offlineManager = new OfflineManager();
        const success = await offlineManager.init();
        
        if (success) {
            console.log('Sistema offline disponible globalmente');
            
            // Disparar evento
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('offlineManagerReady', {
                    detail: offlineManager
                }));
            }
        }
        
        return offlineManager;
        
    } catch (error) {
        console.error('Error inicializando OfflineManager:', error);
        return null;
    }
}

// ✅ INICIALIZACIÓN MEJORADA - Esperar Firebase primero
if (typeof window !== 'undefined') {
    const autoInit = () => {
        // Esperar a que Firebase esté completamente listo
        const waitForFirebase = () => {
            if (window.firebase && window.auth && window.db) {
                console.log('Firebase listo, inicializando OfflineManager...');
                setTimeout(initializeOfflineManager, 100); // Pequeño delay para seguridad
            } else {
                setTimeout(waitForFirebase, 100);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForFirebase);
        } else {
            waitForFirebase();
        }
    };
    
    autoInit();
}

// Escuchar eventos de Firebase sin interferir
if (typeof window !== 'undefined') {
    window.addEventListener('firebaseReady', () => {
        console.log('Firebase listo para sincronización');
        if (offlineManager) {
            offlineManager.processSyncQueue();
        }
    });
}

console.log('Sistema offline corregido cargado');
