/* ========================================
   FINCA LA HERRADURA - TREE MANAGER
   Gestor completo de árboles con Firebase Firestore
   Convertido a funciones JavaScript
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let treesMap = new Map();
let sectorsMap = new Map();
let isTreeManagerInitialized = false;
let firebaseDb = null;
let firebaseAuth = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================

async function waitForFirebaseTreeManager() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 50;
        let attempts = 0;
        
        const checkFirebase = () => {
            attempts++;
            
            if (window.firebase && window.db && window.auth) {
                firebaseDb = window.db;
                firebaseAuth = window.auth;
                console.log('Firebase disponible para TreeManager');
                resolve();
            } else if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                reject(new Error('Firebase timeout'));
            }
        };
        
        checkFirebase();
    });
}

async function initializeTreeManager() {
    try {
        console.log('Inicializando TreeManager...');
        
        // Cargar sectores y árboles
        await loadSectorsTreeManager();
        await loadAllTreesFromFirebase();
        
        isTreeManagerInitialized = true;
        console.log('TreeManager inicializado correctamente');
        
    } catch (error) {
        console.error('Error inicializando TreeManager:', error);
        isTreeManagerInitialized = false;
    }
}

// ==========================================
// GESTIÓN DE SECTORES
// ==========================================

async function loadSectorsTreeManager() {
    try {
        // Intentar cargar desde Firebase primero
        if (firebaseDb) {
            const snapshot = await firebaseDb.collection('sectores')
                .where('active', '==', true)
                .get();
            
            snapshot.forEach(doc => {
                const sectorData = {
                    id: doc.id,
                    ...doc.data(),
                    firebaseRef: doc.ref
                };
                sectorsMap.set(doc.id, sectorData);
            });
            
            console.log(`${sectorsMap.size} sectores cargados desde Firebase`);
        }
        
        // Si no hay sectores en Firebase, cargar desde localStorage
        if (sectorsMap.size === 0) {
            loadSectorsFromLocalStorageTreeManager();
        }
        
    } catch (error) {
        console.error('Error cargando sectores:', error);
        loadSectorsFromLocalStorageTreeManager();
    }
}

function loadSectorsFromLocalStorageTreeManager() {
    try {
        const savedSectors = localStorage.getItem('finca_sectores');
        if (savedSectors) {
            const sectorsData = JSON.parse(savedSectors);
            sectorsData.forEach(sector => {
                sectorsMap.set(sector.id, sector);
            });
            console.log(`${sectorsMap.size} sectores cargados desde localStorage`);
        } else {
            createDefaultSectorsTreeManager();
        }
    } catch (error) {
        console.error('Error cargando sectores desde localStorage:', error);
        createDefaultSectorsTreeManager();
    }
}

function createDefaultSectorsTreeManager() {
    const defaultSectors = [
        {
            id: 'SECTOR_NORTE',
            name: 'Sector Norte',
            coordinates: {
                center: [14.6359, -90.5069],
                bounds: [[14.6354, -90.5074], [14.6364, -90.5064]]
            },
            capacity: 100,
            currentTrees: 0,
            soilType: 'Franco arcilloso',
            irrigationSystem: 'Goteo',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'SECTOR_SUR',
            name: 'Sector Sur',
            coordinates: {
                center: [14.6339, -90.5069],
                bounds: [[14.6334, -90.5074], [14.6344, -90.5064]]
            },
            capacity: 100,
            currentTrees: 0,
            soilType: 'Franco arenoso',
            irrigationSystem: 'Aspersión',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'SECTOR_ESTE',
            name: 'Sector Este',
            coordinates: {
                center: [14.6349, -90.5059],
                bounds: [[14.6344, -90.5064], [14.6354, -90.5054]]
            },
            capacity: 100,
            currentTrees: 0,
            soilType: 'Arcilloso',
            irrigationSystem: 'Manual',
            active: true,
            createdAt: new Date().toISOString()
        }
    ];

    defaultSectors.forEach(sector => sectorsMap.set(sector.id, sector));
    saveSectorsToLocalStorageTreeManager();
}

function saveSectorsToLocalStorageTreeManager() {
    try {
        const sectorsArray = Array.from(sectorsMap.values());
        localStorage.setItem('finca_sectores', JSON.stringify(sectorsArray));
    } catch (error) {
        console.error('Error guardando sectores:', error);
    }
}

// ==========================================
// MÉTODOS PARA INTEGRACIÓN CON PRODUCCIÓN
// ==========================================

function getSectoresParaFormulario() {
    return Array.from(sectorsMap.values()).map(sector => ({
        value: sector.id,
        label: sector.name,
        type: 'block',
        data: sector
    }));
}

function getArbolesParaFormulario() {
    const arboles = Array.from(treesMap.values())
        .filter(tree => tree.active)
        .map(tree => ({
            value: tree.id,
            label: `Árbol ${tree.correlative || tree.id.split('_').pop() || tree.id} - ${tree.blockId || 'Sin sector'}`,
            type: 'tree',
            data: tree
        }));

    // Agregar sectores como opciones también
    const sectores = Array.from(sectorsMap.values()).map(sector => ({
        value: sector.id,
        label: `${sector.name} (Sector completo)`,
        type: 'block',
        data: sector
    }));

    return [...arboles, ...sectores];
}

function obtenerListaCompleta() {
    const items = [];
    
    // Agregar árboles
    Array.from(treesMap.values())
        .filter(tree => tree.active)
        .forEach(tree => {
            items.push({
                id: tree.id,
                label: `Árbol ${tree.correlative || tree.id.split('_').pop() || tree.id}`,
                type: 'tree',
                blockId: tree.blockId,
                data: tree
            });
        });

    // Agregar sectores
    Array.from(sectorsMap.values())
        .filter(sector => sector.active !== false)
        .forEach(sector => {
            items.push({
                id: sector.id,
                label: sector.name,
                type: 'block',
                data: sector
            });
        });

    return items;
}

function getProductionSummary() {
    const trees = Array.from(treesMap.values()).filter(tree => tree.active);
    
    const totalProduction = trees.reduce((sum, tree) => {
        return sum + (tree.production?.currentSeason || 0);
    }, 0);

    const totalTrees = trees.length;
    const averagePerTree = totalTrees > 0 ? totalProduction / totalTrees : 0;

    return {
        totalProduction: Math.round(totalProduction * 100) / 100,
        totalTrees,
        averagePerTree: Math.round(averagePerTree * 100) / 100
    };
}

// ==========================================
// OPERACIONES DE SECTORES
// ==========================================

async function createSectorTreeManager(sectorData) {
    try {
        const now = firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString();
        const currentUser = firebaseAuth?.currentUser;
        
        const newSector = {
            name: sectorData.name,
            capacity: sectorData.capacity || 100,
            soilType: sectorData.soilType,
            irrigationSystem: sectorData.irrigationSystem,
            coordinates: sectorData.coordinates,
            currentTrees: 0,
            active: true,
            createdAt: now,
            updatedAt: now,
            createdBy: currentUser?.uid || 'anonymous',
            fincaId: 'finca_la_herradura'
        };

        let savedSector;
        
        if (firebaseDb) {
            // Guardar en Firebase
            const docRef = await firebaseDb.collection('sectores').add(newSector);
            savedSector = {
                id: docRef.id,
                ...newSector,
                firebaseRef: docRef
            };
        } else {
            // Guardar solo localmente
            const sectorId = `SECTOR_${Date.now().toString(36).toUpperCase()}`;
            savedSector = {
                id: sectorId,
                ...newSector
            };
        }

        sectorsMap.set(savedSector.id, savedSector);
        saveSectorsToLocalStorageTreeManager();
        
        console.log('Sector creado:', savedSector.id);
        
        // Notificar actualización
        window.dispatchEvent(new CustomEvent('sectorUpdate', {
            detail: { action: 'create', sector: savedSector }
        }));
        
        return savedSector;
        
    } catch (error) {
        console.error('Error creando sector:', error);
        throw error;
    }
}

async function updateSectorTreeManager(sectorId, updates) {
    try {
        const currentSector = sectorsMap.get(sectorId);
        if (!currentSector) throw new Error('Sector no encontrado');

        const updateData = {
            ...updates,
            updatedAt: firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString(),
            updatedBy: firebaseAuth?.currentUser?.uid || 'anonymous'
        };

        if (firebaseDb && currentSector.firebaseRef) {
            await currentSector.firebaseRef.update(updateData);
        }

        const updatedSector = { ...currentSector, ...updateData };
        sectorsMap.set(sectorId, updatedSector);
        saveSectorsToLocalStorageTreeManager();
        
        // Notificar actualización
        window.dispatchEvent(new CustomEvent('sectorUpdate', {
            detail: { action: 'update', sector: updatedSector }
        }));
        
        return updatedSector;
        
    } catch (error) {
        console.error('Error actualizando sector:', error);
        throw error;
    }
}

async function deleteSectorTreeManager(sectorId, reason = 'Eliminado por usuario') {
    try {
        const currentSector = sectorsMap.get(sectorId);
        if (!currentSector) throw new Error('Sector no encontrado');

        // Verificar si hay árboles en el sector
        const treesInSector = Array.from(treesMap.values())
            .filter(tree => tree.active && tree.blockId === sectorId);
        
        if (treesInSector.length > 0) {
            throw new Error('No se puede eliminar un sector que tiene árboles');
        }

        if (firebaseDb && currentSector.firebaseRef) {
            await currentSector.firebaseRef.update({
                active: false,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deletedBy: firebaseAuth?.currentUser?.uid || 'anonymous',
                deleteReason: reason
            });
        }

        sectorsMap.delete(sectorId);
        saveSectorsToLocalStorageTreeManager();
        
        console.log('Sector eliminado:', sectorId);
        
        // Notificar eliminación
        window.dispatchEvent(new CustomEvent('sectorUpdate', {
            detail: { action: 'delete', sectorId: sectorId }
        }));
        
    } catch (error) {
        console.error('Error eliminando sector:', error);
        throw error;
    }
}

function getAllSectorsTreeManager() {
    return Array.from(sectorsMap.values()).filter(sector => sector.active !== false);
}

function getSectorTreeManager(sectorId) {
    return sectorsMap.get(sectorId);
}

// ==========================================
// CARGAR DATOS DESDE FIREBASE
// ==========================================

async function loadAllTreesFromFirebase() {
    try {
        if (!firebaseDb) {
            console.warn('Firebase no disponible, usando datos locales');
            return;
        }
        
        const snapshot = await firebaseDb.collection('arboles')
            .where('active', '==', true)
            .get();
        
        treesMap.clear();
        
        snapshot.forEach(doc => {
            const treeData = {
                id: doc.id,
                ...doc.data(),
                firebaseRef: doc.ref
            };
            treesMap.set(doc.id, treeData);
        });
        
        console.log(`${treesMap.size} árboles cargados desde Firebase`);
        
    } catch (error) {
        console.error('Error cargando árboles:', error);
        throw error;
    }
}

// ==========================================
// OPERACIONES CRUD DE ÁRBOLES
// ==========================================

async function createTreeFirebase(treeData) {
    try {
        if (!firebaseDb) throw new Error('Firebase no disponible');
        
        // Preparar datos para Firebase
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const currentUser = firebaseAuth?.currentUser;
        
        const newTree = {
            // NUEVO: Incluir correlativo si está presente
            correlative: treeData.correlative || null,
            
            // Datos básicos
            variety: treeData.variety,
            blockId: treeData.blockId,
            plantingDate: treeData.plantingDate,
            
            // Ubicación GPS
            location: {
                latitude: treeData.latitude,
                longitude: treeData.longitude,
                elevation: treeData.elevation || null
            },
            
            // Medidas
            measurements: {
                height: treeData.height || 0,
                diameter: treeData.diameter || 0,
                canopyWidth: treeData.canopyWidth || 0
            },
            
            // Salud
            health: {
                overall: treeData.health?.overall || 100,
                leaves: treeData.health?.leaves || 100,
                trunk: treeData.health?.trunk || 100,
                lastInspection: now
            },
            
            // Producción (inicializar en 0)
            production: {
                currentSeason: 0,
                totalLifetime: 0,
                averageYield: 0,
                lastHarvest: null
            },
            
            // Metadatos
            notes: treeData.notes || '',
            active: true,
            createdAt: now,
            updatedAt: now,
            createdBy: currentUser?.uid || 'anonymous',
            fincaId: 'finca_la_herradura'
        };
        
        // Calcular edad basada en fecha de plantación
        if (newTree.plantingDate) {
            const plantDate = new Date(newTree.plantingDate);
            const now = new Date();
            newTree.age = Math.floor((now - plantDate) / (365.25 * 24 * 60 * 60 * 1000));
        }
        
        // Guardar en Firebase
        const docRef = await firebaseDb.collection('arboles').add(newTree);
        
        // Actualizar caché local
        const savedTree = {
            id: docRef.id,
            ...newTree,
            firebaseRef: docRef
        };
        
        treesMap.set(docRef.id, savedTree);
        
        // Actualizar contador de árboles en el sector
        if (savedTree.blockId) {
            await updateTreeCountInSectorTreeManager(savedTree.blockId, 1);
        }
        
        // Guardar offline para sincronización
        if (window.offlineManager) {
            await window.offlineManager.saveData('arboles', docRef.id, savedTree);
        }
        
        console.log('Árbol creado:', docRef.id);
        
        // Notificar actualización
        window.dispatchEvent(new CustomEvent('treeUpdate', {
            detail: { action: 'create', tree: savedTree }
        }));
        
        return savedTree;
        
    } catch (error) {
        console.error('Error creando árbol:', error);
        throw error;
    }
}

async function updateTreeFirebase(treeId, updates) {
    try {
        if (!firebaseDb) throw new Error('Firebase no disponible');
        
        const treeRef = firebaseDb.collection('arboles').doc(treeId);
        const currentUser = firebaseAuth?.currentUser;
        
        const updateData = {
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser?.uid || 'anonymous'
        };
        
        // Actualizar en Firebase
        await treeRef.update(updateData);
        
        // Actualizar caché local
        const currentTree = treesMap.get(treeId);
        if (currentTree) {
            const updatedTree = { ...currentTree, ...updateData };
            treesMap.set(treeId, updatedTree);
            
            // Guardar offline
            if (window.offlineManager) {
                await window.offlineManager.saveData('arboles', treeId, updatedTree);
            }
            
            // Notificar actualización
            window.dispatchEvent(new CustomEvent('treeUpdate', {
                detail: { action: 'update', tree: updatedTree }
            }));
            
            return updatedTree;
        }
        
    } catch (error) {
        console.error('Error actualizando árbol:', error);
        throw error;
    }
}

async function deleteTreeFirebase(treeId, reason = 'Eliminado por usuario') {
    try {
        if (!firebaseDb) throw new Error('Firebase no disponible');
        
        const currentUser = firebaseAuth?.currentUser;
        const tree = treesMap.get(treeId);
        
        // Soft delete - marcar como inactivo
        await firebaseDb.collection('arboles').doc(treeId).update({
            active: false,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: currentUser?.uid || 'anonymous',
            deleteReason: reason
        });
        
        // Actualizar contador de árboles en el sector
        if (tree?.blockId) {
            await updateTreeCountInSectorTreeManager(tree.blockId, -1);
        }
        
        // Remover del caché local
        treesMap.delete(treeId);
        
        // Limpiar offline storage
        if (window.offlineManager) {
            await window.offlineManager.deleteData('arboles', treeId);
        }
        
        console.log('Árbol eliminado (soft delete):', treeId);
        
        // Notificar eliminación
        window.dispatchEvent(new CustomEvent('treeUpdate', {
            detail: { action: 'delete', treeId: treeId }
        }));
        
    } catch (error) {
        console.error('Error eliminando árbol:', error);
        throw error;
    }
}

// ==========================================
// MÉTODOS AUXILIARES
// ==========================================

async function updateTreeCountInSectorTreeManager(sectorId, increment) {
    try {
        const sector = sectorsMap.get(sectorId);
        if (sector) {
            const newCount = Math.max(0, (sector.currentTrees || 0) + increment);
            await updateSectorTreeManager(sectorId, { currentTrees: newCount });
        }
    } catch (error) {
        console.error('Error actualizando contador de árboles:', error);
    }
}

// ==========================================
// CONSULTAS
// ==========================================

async function getAllTreesTreeManager(filters = {}) {
    try {
        let trees = Array.from(treesMap.values());
        
        // Aplicar filtros
        if (filters.blockId) {
            trees = trees.filter(tree => tree.blockId === filters.blockId);
        }
        
        if (filters.ageMin) {
            trees = trees.filter(tree => (tree.age || 0) >= filters.ageMin);
        }
        
        if (filters.ageMax) {
            trees = trees.filter(tree => (tree.age || 0) <= filters.ageMax);
        }
        
        if (filters.healthMin) {
            trees = trees.filter(tree => (tree.health?.overall || 0) >= filters.healthMin);
        }
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            trees = trees.filter(tree => 
                tree.id.toLowerCase().includes(searchLower) ||
                (tree.notes && tree.notes.toLowerCase().includes(searchLower)) ||
                (tree.blockId && tree.blockId.toLowerCase().includes(searchLower)) ||
                (tree.correlative && tree.correlative.includes(filters.search))
            );
        }
        
        return trees;
        
    } catch (error) {
        console.error('Error obteniendo árboles:', error);
        return [];
    }
}

async function getTreeTreeManager(treeId) {
    try {
        // Intentar obtener del caché local primero
        const cachedTree = treesMap.get(treeId);
        if (cachedTree) {
            return cachedTree;
        }
        
        // Si no está en caché, obtener de Firebase
        if (firebaseDb) {
            const doc = await firebaseDb.collection('arboles').doc(treeId).get();
            if (doc.exists) {
                const treeData = {
                    id: doc.id,
                    ...doc.data(),
                    firebaseRef: doc.ref
                };
                
                // Agregar al caché
                treesMap.set(treeId, treeData);
                
                return treeData;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Error obteniendo árbol:', error);
        return null;
    }
}

async function getTreesByBlockTreeManager(blockId) {
    return getAllTreesTreeManager({ blockId });
}

// ==========================================
// ESTADÍSTICAS
// ==========================================

async function getStatisticsTreeManager() {
    try {
        const trees = Array.from(treesMap.values());
        
        const stats = {
            totalTrees: trees.length,
            healthyTrees: 0,
            sickTrees: 0,
            treatmentTrees: 0,
            totalProduction: 0,
            productiveTrees: 0,
            averageAge: 0,
            averageHealth: 0,
            averageProduction: 0,
            byBlock: {},
            byVariety: {}
        };
        
        let totalAge = 0;
        let totalHealth = 0;
        
        trees.forEach(tree => {
            const health = tree.health?.overall || 0;
            const production = tree.production?.currentSeason || 0;
            const age = tree.age || 0;
            
            // Clasificar por salud
            if (health >= 80) {
                stats.healthyTrees++;
            } else if (health >= 60) {
                stats.treatmentTrees++;
            } else {
                stats.sickTrees++;
            }
            
            // Producción
            stats.totalProduction += production;
            if (production > 0) {
                stats.productiveTrees++;
            }
            
            // Promedios
            totalAge += age;
            totalHealth += health;
            
            // Por bloque
            if (!stats.byBlock[tree.blockId]) {
                stats.byBlock[tree.blockId] = {
                    count: 0,
                    healthy: 0,
                    sick: 0,
                    production: 0
                };
            }
            stats.byBlock[tree.blockId].count++;
            stats.byBlock[tree.blockId].production += production;
            
            if (health >= 80) {
                stats.byBlock[tree.blockId].healthy++;
            } else if (health < 60) {
                stats.byBlock[tree.blockId].sick++;
            }
            
            // Por variedad
            if (!stats.byVariety[tree.variety]) {
                stats.byVariety[tree.variety] = { count: 0, production: 0 };
            }
            stats.byVariety[tree.variety].count++;
            stats.byVariety[tree.variety].production += production;
        });
        
        // Calcular promedios
        if (trees.length > 0) {
            stats.averageAge = Math.round(totalAge / trees.length);
            stats.averageHealth = Math.round(totalHealth / trees.length);
            stats.averageProduction = Math.round(stats.totalProduction / trees.length);
        }
        
        return stats;
        
    } catch (error) {
        console.error('Error calculando estadísticas:', error);
        return {
            totalTrees: 0,
            healthyTrees: 0,
            sickTrees: 0,
            treatmentTrees: 0,
            totalProduction: 0,
            productiveTrees: 0,
            averageProduction: 0
        };
    }
}

// ==========================================
// VALIDACIONES
// ==========================================

function validateTreeDataTreeManager(treeData) {
    const errors = [];
    
    // Validaciones obligatorias
    if (!treeData.variety) {
        errors.push('La variedad es obligatoria');
    }
    
    if (!treeData.blockId) {
        errors.push('El sector es obligatorio');
    }
    
    if (!treeData.plantingDate) {
        errors.push('La fecha de plantación es obligatoria');
    }
    
    if (!treeData.latitude || !treeData.longitude) {
        errors.push('Las coordenadas GPS son obligatorias');
    }
    
    // Validar coordenadas GPS
    if (treeData.latitude && treeData.longitude) {
        if (Math.abs(treeData.latitude) > 90) {
            errors.push('Latitud inválida');
        }
        
        if (Math.abs(treeData.longitude) > 180) {
            errors.push('Longitud inválida');
        }
        
        // Validar que esté en Guatemala aproximadamente
        if (treeData.latitude < 13.5 || treeData.latitude > 18.0 ||
            treeData.longitude < -92.5 || treeData.longitude > -88.0) {
            errors.push('Las coordenadas parecen estar fuera de Guatemala');
        }
    }
    
    // Validar medidas
    if (treeData.height && treeData.height < 0) {
        errors.push('La altura no puede ser negativa');
    }
    
    if (treeData.diameter && treeData.diameter < 0) {
        errors.push('El diámetro no puede ser negativo');
    }
    
    // Validar salud
    if (treeData.health?.overall !== undefined) {
        if (treeData.health.overall < 0 || treeData.health.overall > 100) {
            errors.push('El porcentaje de salud debe estar entre 0 y 100');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function validateSectorDataTreeManager(sectorData) {
    const errors = [];
    
    // Validaciones obligatorias
    if (!sectorData.name) {
        errors.push('El nombre del sector es obligatorio');
    }
    
    if (!sectorData.capacity || sectorData.capacity <= 0) {
        errors.push('La capacidad debe ser mayor a 0');
    }
    
    if (!sectorData.coordinates || !sectorData.coordinates.center) {
        errors.push('Las coordenadas del centro son obligatorias');
    }
    
    // Validar coordenadas si están presentes
    if (sectorData.coordinates?.center) {
        const [lat, lng] = sectorData.coordinates.center;
        
        if (Math.abs(lat) > 90) {
            errors.push('Latitud inválida');
        }
        
        if (Math.abs(lng) > 180) {
            errors.push('Longitud inválida');
        }
        
        // Validar que esté en Guatemala aproximadamente
        if (lat < 13.5 || lat > 18.0 || lng < -92.5 || lng > -88.0) {
            errors.push('Las coordenadas parecen estar fuera de Guatemala');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ==========================================
// UTILIDADES
// ==========================================

function calculateAgeTreeManager(plantingDate) {
    if (!plantingDate) return 0;
    
    const plantDate = new Date(plantingDate);
    const now = new Date();
    
    return Math.floor((now - plantDate) / (365.25 * 24 * 60 * 60 * 1000));
}

function generateTreeNumberTreeManager() {
    const existingNumbers = Array.from(treesMap.values())
        .map(tree => {
            // NUEVO: Priorizar correlativo sobre ID
            if (tree.correlative) {
                return parseInt(tree.correlative);
            }
            const match = tree.id.match(/\d+$/);
            return match ? parseInt(match[0]) : 0;
        });
    
    const maxNumber = Math.max(0, ...existingNumbers);
    return (maxNumber + 1).toString().padStart(5, '0'); // CAMBIADO: 5 dígitos
}

// Método para exportar datos
async function exportDataTreeManager() {
    const data = {
        trees: Array.from(treesMap.values()),
        sectors: Array.from(sectorsMap.values()),
        statistics: await getStatisticsTreeManager(),
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    return data;
}

// Método para importar datos
async function importDataTreeManager(data) {
    try {
        if (data.trees) {
            data.trees.forEach(tree => {
                treesMap.set(tree.id, tree);
            });
        }
        
        if (data.sectors) {
            data.sectors.forEach(sector => {
                sectorsMap.set(sector.id, sector);
            });
            saveSectorsToLocalStorageTreeManager();
        }
        
        console.log('Datos importados correctamente');
        
        // Notificar actualización masiva
        window.dispatchEvent(new CustomEvent('treeUpdate', {
            detail: { action: 'import', count: data.trees?.length || 0 }
        }));
        
        window.dispatchEvent(new CustomEvent('sectorUpdate', {
            detail: { action: 'import', count: data.sectors?.length || 0 }
        }));
        
    } catch (error) {
        console.error('Error importando datos:', error);
        throw error;
    }
}

// ==========================================
// OBJETO TREEMANAGER PARA COMPATIBILIDAD
// ==========================================

const treeManager = {
    // Propiedades de estado
    get trees() { return treesMap; },
    get sectors() { return sectorsMap; },
    get isInitialized() { return isTreeManagerInitialized; },
    
    // Métodos principales
    init: initializeTreeManager,
    
    // Gestión de árboles
    createTree: createTreeFirebase,
    updateTree: updateTreeFirebase,
    deleteTree: deleteTreeFirebase,
    getTree: getTreeTreeManager,
    getAllTrees: getAllTreesTreeManager,
    getTreesByBlock: getTreesByBlockTreeManager,
    
    // Gestión de sectores
    createSector: createSectorTreeManager,
    updateSector: updateSectorTreeManager,
    deleteSector: deleteSectorTreeManager,
    getSector: getSectorTreeManager,
    getAllSectors: getAllSectorsTreeManager,
    
    // Estadísticas y consultas
    getStatistics: getStatisticsTreeManager,
    
    // Validaciones
    validateTreeData: validateTreeDataTreeManager,
    validateSectorData: validateSectorDataTreeManager,
    
    // Utilidades
    calculateAge: calculateAgeTreeManager,
    generateTreeNumber: generateTreeNumberTreeManager,
    exportData: exportDataTreeManager,
    importData: importDataTreeManager,
    
    // Métodos para integración
    getSectoresParaFormulario,
    getArbolesParaFormulario,
    obtenerListaCompleta,
    getProductionSummary
};

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForFirebaseTreeManager();
        await initializeTreeManager();
        
        // Hacer disponible globalmente
        window.treeManager = treeManager;
        
        console.log('TreeManager disponible globalmente');
    } catch (error) {
        console.error('Error inicializando TreeManager:', error);
    }
});

// Exportar para otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        treeManager,
        initializeTreeManager,
        // ... exportar todas las funciones individuales si es necesario
    };
}
