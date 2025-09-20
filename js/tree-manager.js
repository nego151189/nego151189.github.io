/* ========================================
   FINCA LA HERRADURA - TREE MANAGER COMPLETO
   Sistema integrado con producción y correlativos
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let isTreeManagerInitialized = false;
let trees = new Map();
let sectors = new Map();
let currentTreeId = null;
let currentSectorId = null;
let treeCorrelativeCounter = 1;
let sectorCorrelativeCounter = 1;

// Cache para formularios
let sectorsCache = [];
let treesCache = [];
let lastCacheUpdate = null;
const CACHE_DURATION = 30000; // 30 segundos

// Configuración de correlativos
const CORRELATIVE_CONFIG = {
    tree: {
        prefix: '',
        length: 5,
        startFrom: 1
    },
    sector: {
        prefix: 'S',
        length: 4,
        startFrom: 1
    }
};

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

async function initializeTreeManager() {
    if (isTreeManagerInitialized) {
        console.log('⚠️ TreeManager ya inicializado');
        return getTreeManagerAPI();
    }

    try {
        console.log('🌳 Inicializando TreeManager...');
        
        // Esperar Firebase
        await waitForFirebase();
        
        // Cargar datos existentes
        await loadExistingData();
        
        // Inicializar contadores de correlativos
        await initializeCorrelativeCounters();
        
        isTreeManagerInitialized = true;
        
        console.log('✅ TreeManager inicializado correctamente');
        
        // Disparar evento para que producción se entere
        window.dispatchEvent(new CustomEvent('treeManagerReady', {
            detail: getTreeManagerAPI()
        }));
        
        return getTreeManagerAPI();
        
    } catch (error) {
        console.error('❌ Error inicializando TreeManager:', error);
        throw error;
    }
}

async function waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.db && window.auth) {
            console.log('✅ Firebase disponible');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Firebase no disponible después de 5 segundos');
}

// ==========================================
// CARGA DE DATOS
// ==========================================

async function loadExistingData() {
    try {
        // Cargar sectores
        await loadSectors();
        
        // Cargar árboles
        await loadTrees();
        
        console.log(`📊 Datos cargados: ${sectors.size} sectores, ${trees.size} árboles`);
        
    } catch (error) {
        console.warn('⚠️ Error cargando datos, usando localStorage como fallback:', error);
        await loadFromLocalStorage();
    }
}

async function loadSectors() {
    try {
        const snapshot = await window.db.collection('sectores').get();
        
        snapshot.forEach(doc => {
            const sectorData = { id: doc.id, ...doc.data() };
            sectors.set(doc.id, sectorData);
        });
        
        console.log(`📦 ${sectors.size} sectores cargados desde Firebase`);
        
    } catch (error) {
        console.warn('⚠️ Error cargando sectores desde Firebase:', error);
        throw error;
    }
}

async function loadTrees() {
    try {
        const snapshot = await window.db.collection('arboles').get();
        
        snapshot.forEach(doc => {
            const treeData = { id: doc.id, ...doc.data() };
            trees.set(doc.id, treeData);
        });
        
        console.log(`🌳 ${trees.size} árboles cargados desde Firebase`);
        
    } catch (error) {
        console.warn('⚠️ Error cargando árboles desde Firebase:', error);
        throw error;
    }
}

async function loadFromLocalStorage() {
    try {
        const storedSectors = localStorage.getItem('finca_sectores');
        const storedTrees = localStorage.getItem('finca_arboles');
        
        if (storedSectors) {
            const sectorsData = JSON.parse(storedSectors);
            sectorsData.forEach(sector => sectors.set(sector.id, sector));
        }
        
        if (storedTrees) {
            const treesData = JSON.parse(storedTrees);
            treesData.forEach(tree => trees.set(tree.id, tree));
        }
        
        console.log(`💾 Datos cargados desde localStorage: ${sectors.size} sectores, ${trees.size} árboles`);
        
    } catch (error) {
        console.warn('⚠️ Error cargando desde localStorage:', error);
    }
}

// ==========================================
// GESTIÓN DE CORRELATIVOS
// ==========================================

async function initializeCorrelativeCounters() {
    try {
        // Encontrar el correlativo más alto para árboles
        let maxTreeCorrelative = 0;
        trees.forEach(tree => {
            if (tree.correlative) {
                const num = parseInt(tree.correlative);
                if (!isNaN(num) && num > maxTreeCorrelative) {
                    maxTreeCorrelative = num;
                }
            }
        });
        
        // Encontrar el correlativo más alto para sectores
        let maxSectorCorrelative = 0;
        sectors.forEach(sector => {
            if (sector.correlative) {
                const num = parseInt(sector.correlative.replace('S', ''));
                if (!isNaN(num) && num > maxSectorCorrelative) {
                    maxSectorCorrelative = num;
                }
            }
        });
        
        treeCorrelativeCounter = maxTreeCorrelative + 1;
        sectorCorrelativeCounter = maxSectorCorrelative + 1;
        
        console.log(`🔢 Contadores inicializados - Árboles: ${treeCorrelativeCounter}, Sectores: ${sectorCorrelativeCounter}`);
        
    } catch (error) {
        console.warn('⚠️ Error inicializando contadores:', error);
        treeCorrelativeCounter = 1;
        sectorCorrelativeCounter = 1;
    }
}

function generateTreeCorrelative() {
    const correlative = treeCorrelativeCounter.toString().padStart(CORRELATIVE_CONFIG.tree.length, '0');
    treeCorrelativeCounter++;
    return correlative;
}

function generateSectorCorrelative() {
    const correlative = CORRELATIVE_CONFIG.sector.prefix + 
                       sectorCorrelativeCounter.toString().padStart(CORRELATIVE_CONFIG.sector.length, '0');
    sectorCorrelativeCounter++;
    return correlative;
}

// ==========================================
// GESTIÓN DE SECTORES
// ==========================================

async function createSector(sectorData) {
    try {
        const sectorId = generateUniqueId();
        const correlative = generateSectorCorrelative();
        
        const newSector = {
            id: sectorId,
            correlative: correlative,
            name: sectorData.name,
            area: sectorData.area || 0,
            description: sectorData.description || '',
            coordinates: sectorData.coordinates || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true
        };
        
        // Guardar en Firebase
        await window.db.collection('sectores').doc(sectorId).set(newSector);
        
        // Guardar en memoria
        sectors.set(sectorId, newSector);
        
        // Guardar en localStorage como respaldo
        await saveToLocalStorage();
        
        // Invalidar cache
        invalidateCache();
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('sectorCreated', {
            detail: newSector
        }));
        
        console.log(`✅ Sector creado: ${correlative} - ${newSector.name}`);
        
        return newSector;
        
    } catch (error) {
        console.error('❌ Error creando sector:', error);
        throw error;
    }
}

async function updateSector(sectorId, updates) {
    try {
        const existingSector = sectors.get(sectorId);
        if (!existingSector) {
            throw new Error(`Sector ${sectorId} no encontrado`);
        }
        
        const updatedSector = {
            ...existingSector,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Actualizar en Firebase
        await window.db.collection('sectores').doc(sectorId).update(updates);
        
        // Actualizar en memoria
        sectors.set(sectorId, updatedSector);
        
        // Guardar en localStorage
        await saveToLocalStorage();
        
        // Invalidar cache
        invalidateCache();
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('sectorUpdated', {
            detail: updatedSector
        }));
        
        console.log(`✅ Sector actualizado: ${updatedSector.correlative}`);
        
        return updatedSector;
        
    } catch (error) {
        console.error('❌ Error actualizando sector:', error);
        throw error;
    }
}

async function deleteSector(sectorId) {
    try {
        const sector = sectors.get(sectorId);
        if (!sector) {
            throw new Error(`Sector ${sectorId} no encontrado`);
        }
        
        // Verificar si hay árboles en este sector
        const treesInSector = Array.from(trees.values()).filter(tree => tree.blockId === sectorId);
        if (treesInSector.length > 0) {
            throw new Error(`No se puede eliminar el sector ${sector.correlative}. Contiene ${treesInSector.length} árbol(es)`);
        }
        
        // Marcar como inactivo en lugar de eliminar
        await updateSector(sectorId, { active: false });
        
        console.log(`✅ Sector desactivado: ${sector.correlative}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error eliminando sector:', error);
        throw error;
    }
}

// ==========================================
// GESTIÓN DE ÁRBOLES
// ==========================================

async function createTree(treeData) {
    try {
        const treeId = generateUniqueId();
        const correlative = generateTreeCorrelative();
        
        const newTree = {
            id: treeId,
            correlative: correlative,
            blockId: treeData.blockId,
            variety: treeData.variety || 'Desconocida',
            plantingDate: treeData.plantingDate || new Date().toISOString(),
            health: treeData.health || 100,
            productivity: treeData.productivity || 0,
            coordinates: treeData.coordinates || null,
            notes: treeData.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true,
            // Datos de producción
            totalProduction: 0,
            lastHarvest: null,
            averageYield: 0
        };
        
        // Guardar en Firebase
        await window.db.collection('arboles').doc(treeId).set(newTree);
        
        // Guardar en memoria
        trees.set(treeId, newTree);
        
        // Guardar en localStorage
        await saveToLocalStorage();
        
        // Invalidar cache
        invalidateCache();
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('treeCreated', {
            detail: newTree
        }));
        
        console.log(`✅ Árbol creado: ${correlative} en sector ${newTree.blockId}`);
        
        return newTree;
        
    } catch (error) {
        console.error('❌ Error creando árbol:', error);
        throw error;
    }
}

async function updateTree(treeId, updates) {
    try {
        const existingTree = trees.get(treeId);
        if (!existingTree) {
            throw new Error(`Árbol ${treeId} no encontrado`);
        }
        
        const updatedTree = {
            ...existingTree,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Actualizar en Firebase
        await window.db.collection('arboles').doc(treeId).update(updates);
        
        // Actualizar en memoria
        trees.set(treeId, updatedTree);
        
        // Guardar en localStorage
        await saveToLocalStorage();
        
        // Invalidar cache
        invalidateCache();
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('treeUpdated', {
            detail: updatedTree
        }));
        
        console.log(`✅ Árbol actualizado: ${updatedTree.correlative}`);
        
        return updatedTree;
        
    } catch (error) {
        console.error('❌ Error actualizando árbol:', error);
        throw error;
    }
}

async function deleteTree(treeId) {
    try {
        const tree = trees.get(treeId);
        if (!tree) {
            throw new Error(`Árbol ${treeId} no encontrado`);
        }
        
        // Marcar como inactivo
        await updateTree(treeId, { active: false });
        
        console.log(`✅ Árbol desactivado: ${tree.correlative}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error eliminando árbol:', error);
        throw error;
    }
}

// ==========================================
// FUNCIONES PARA FORMULARIOS (INTEGRACIÓN CON PRODUCCIÓN)
// ==========================================

async function getSectoresParaFormulario() {
    try {
        // Usar cache si está válido
        if (isCacheValid() && sectorsCache.length > 0) {
            return sectorsCache;
        }
        
        const activeSectors = Array.from(sectors.values())
            .filter(sector => sector.active !== false)
            .map(sector => ({
                value: sector.id,
                label: `📦 ${sector.correlative} - ${sector.name}`,
                type: 'sector',
                correlative: sector.correlative,
                name: sector.name
            }))
            .sort((a, b) => a.correlative.localeCompare(b.correlative));
        
        // Actualizar cache
        sectorsCache = activeSectors;
        lastCacheUpdate = Date.now();
        
        return activeSectors;
        
    } catch (error) {
        console.error('❌ Error obteniendo sectores para formulario:', error);
        return getFallbackSectors();
    }
}

async function getArbolesParaFormulario() {
    try {
        // Usar cache si está válido
        if (isCacheValid() && treesCache.length > 0) {
            return treesCache;
        }
        
        const activeTrees = Array.from(trees.values())
            .filter(tree => tree.active !== false)
            .map(tree => {
                const sector = sectors.get(tree.blockId);
                const sectorName = sector ? sector.name : 'Sin sector';
                
                return {
                    value: tree.id,
                    label: `🌳 ${tree.correlative} - ${sectorName}`,
                    type: 'tree',
                    correlative: tree.correlative,
                    blockId: tree.blockId,
                    sectorName: sectorName
                };
            })
            .sort((a, b) => a.correlative.localeCompare(b.correlative));
        
        // Actualizar cache
        treesCache = activeTrees;
        lastCacheUpdate = Date.now();
        
        return activeTrees;
        
    } catch (error) {
        console.error('❌ Error obteniendo árboles para formulario:', error);
        return getFallbackTrees();
    }
}

async function obtenerListaCompleta() {
    try {
        const sectorsForForm = await getSectoresParaFormulario();
        const treesForForm = await getArbolesParaFormulario();
        
        // Combinar sectores y árboles
        const opciones = [...sectorsForForm, ...treesForForm];
        
        return {
            sectores: sectorsForForm,
            arboles: treesForForm,
            opciones: opciones,
            resumen: {
                totalSectores: sectorsForForm.length,
                totalArboles: treesForForm.length,
                totalOpciones: opciones.length
            }
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo lista completa:', error);
        return {
            sectores: getFallbackSectors(),
            arboles: getFallbackTrees(),
            opciones: [...getFallbackSectors(), ...getFallbackTrees()],
            resumen: { totalSectores: 0, totalArboles: 0, totalOpciones: 0 }
        };
    }
}

// ==========================================
// CACHE Y PERFORMANCE
// ==========================================

function isCacheValid() {
    return lastCacheUpdate && (Date.now() - lastCacheUpdate) < CACHE_DURATION;
}

function invalidateCache() {
    sectorsCache = [];
    treesCache = [];
    lastCacheUpdate = null;
    
    // Notificar a producción que debe recargar
    window.dispatchEvent(new CustomEvent('treeDataUpdated', {
        detail: { type: 'cache_invalidated' }
    }));
}

// ==========================================
// PERSISTENCIA
// ==========================================

async function saveToLocalStorage() {
    try {
        const sectorsArray = Array.from(sectors.values());
        const treesArray = Array.from(trees.values());
        
        localStorage.setItem('finca_sectores', JSON.stringify(sectorsArray));
        localStorage.setItem('finca_arboles', JSON.stringify(treesArray));
        localStorage.setItem('finca_tree_correlative_counter', treeCorrelativeCounter.toString());
        localStorage.setItem('finca_sector_correlative_counter', sectorCorrelativeCounter.toString());
        
    } catch (error) {
        console.warn('⚠️ Error guardando en localStorage:', error);
    }
}

// ==========================================
// FUNCIONES DE CONSULTA
// ==========================================

function getAllSectors() {
    return Array.from(sectors.values()).filter(sector => sector.active !== false);
}

function getAllTrees() {
    return Array.from(trees.values()).filter(tree => tree.active !== false);
}

function getSector(sectorId) {
    return sectors.get(sectorId) || null;
}

function getTree(treeId) {
    return trees.get(treeId) || null;
}

function getTreesBySector(sectorId) {
    return Array.from(trees.values()).filter(tree => 
        tree.blockId === sectorId && tree.active !== false
    );
}

async function getStatistics() {
    return {
        totalSectors: sectors.size,
        totalTrees: trees.size,
        activeSectors: getAllSectors().length,
        activeTrees: getAllTrees().length,
        averageTreesPerSector: getAllSectors().length > 0 ? 
            getAllTrees().length / getAllSectors().length : 0,
        lastUpdate: new Date().toISOString()
    };
}

// ==========================================
// FUNCIONES DE FALLBACK
// ==========================================

function getFallbackSectors() {
    return [
        { value: 'SECTOR_NORTE', label: '📦 S0001 - Sector Norte (Fallback)', type: 'sector' },
        { value: 'SECTOR_SUR', label: '📦 S0002 - Sector Sur (Fallback)', type: 'sector' }
    ];
}

function getFallbackTrees() {
    return [
        { value: 'TREE_001', label: '🌳 00001 - Norte (Fallback)', type: 'tree' },
        { value: 'TREE_002', label: '🌳 00002 - Sur (Fallback)', type: 'tree' }
    ];
}

// ==========================================
// UTILIDADES
// ==========================================

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ==========================================
// API PRINCIPAL
// ==========================================

function getTreeManagerAPI() {
    return {
        // Inicialización
        isInitialized: isTreeManagerInitialized,
        
        // Sectores
        createSector,
        updateSector,
        deleteSector,
        getSector,
        getAllSectors,
        
        // Árboles
        createTree,
        updateTree,
        deleteTree,
        getTree,
        getAllTrees,
        getTreesBySector,
        
        // Para formularios (integración con producción)
        getSectoresParaFormulario,
        getArbolesParaFormulario,
        obtenerListaCompleta,
        
        // Estadísticas
        getStatistics,
        
        // Utilidades
        invalidateCache,
        saveToLocalStorage
    };
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

let treeManager = null;

async function initializeGlobalTreeManager() {
    if (treeManager) {
        console.log('⚠️ TreeManager ya existe globalmente');
        return treeManager;
    }
    
    try {
        treeManager = await initializeTreeManager();
        
        // Hacer disponible globalmente
        window.treeManager = treeManager;
        
        console.log('✅ TreeManager disponible globalmente');
        
        return treeManager;
        
    } catch (error) {
        console.error('❌ Error inicializando TreeManager global:', error);
        
        // Crear fallback básico
        treeManager = {
            isInitialized: false,
            getAllSectors: () => getFallbackSectors(),
            getAllTrees: () => getFallbackTrees(),
            obtenerListaCompleta: async () => ({
                sectores: getFallbackSectors(),
                arboles: getFallbackTrees(),
                opciones: [...getFallbackSectors(), ...getFallbackTrees()]
            })
        };
        
        window.treeManager = treeManager;
        return treeManager;
    }
}

// Auto-inicialización
if (typeof window !== 'undefined') {
    const autoInitTreeManager = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initializeGlobalTreeManager, 500);
            });
        } else {
            setTimeout(initializeGlobalTreeManager, 500);
        }
    };
    
    autoInitTreeManager();
}

// Exportar para uso externo
window.initializeGlobalTreeManager = initializeGlobalTreeManager;

console.log('🌳 TreeManager completo cargado');
