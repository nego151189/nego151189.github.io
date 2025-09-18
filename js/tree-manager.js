// ========================================
// TREE MANAGER - VERSION INTEGRADA CON TU SISTEMA EXISTENTE
// Finca La Herradura - Compatible con arboles.js
// ========================================

// Variables globales mejoradas - Compatible con tu estructura existente
let sectoresCargados = [];
let arbolesCargados = [];
let db = null;
let auth = null;
let treeManagerInicializado = false;
let treesMap = new Map();
let sectorsMap = new Map();

// Función de inicialización mejorada que se sincroniza con tu arboles.js
async function initializeTreeManager() {
    console.log('🌳 Iniciando TreeManager integrado...');
    
    try {
        // Esperar a que Firebase esté disponible (compatible con tu configuración)
        await waitForFirebaseTreeManager();
        
        // Cargar sectores desde tu estructura existente
        await cargarSectoresDesdeArboles();
        
        // Cargar árboles desde Firebase
        await cargarArbolesDesdeFirebase();
        
        // Sincronizar con las estructuras existentes
        sincronizarConEstructuraExistente();
        
        treeManagerInicializado = true;
        
        // Notificar que TreeManager está listo (compatible con tus eventos)
        window.dispatchEvent(new CustomEvent('treeManagerReady', {
            detail: {
                sectores: sectoresCargados,
                arboles: arbolesCargados
            }
        }));
        
        console.log('✅ TreeManager integrado inicializado');
        console.log(`📦 Sectores disponibles: ${sectoresCargados.length}`);
        console.log(`🌳 Árboles disponibles: ${arbolesCargados.length}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error inicializando TreeManager:', error);
        
        // Cargar datos de respaldo usando tu estructura
        await cargarDatosDeRespaldoExistente();
        treeManagerInicializado = true;
        
        window.dispatchEvent(new CustomEvent('treeManagerReady', {
            detail: {
                sectores: sectoresCargados,
                arboles: arbolesCargados
            }
        }));
        
        return false;
    }
}

// Esperar a Firebase (compatible con tu firebase-config.js)
function waitForFirebaseTreeManager() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkFirebase = () => {
            attempts++;
            
            // Verificar múltiples formas de acceso a Firebase
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                db = firebase.firestore();
                auth = firebase.auth ? firebase.auth() : null;
                console.log('✅ Firebase disponible para TreeManager');
                resolve(true);
            } else if (window.firebase && window.firebase.firestore) {
                db = window.firebase.firestore();
                auth = window.firebase.auth ? window.firebase.auth() : null;
                resolve(true);
            } else if (window.db) {
                db = window.db;
                auth = window.auth;
                resolve(true);
            } else if (attempts >= maxAttempts) {
                console.warn('⚠️ Firebase no disponible después de 10 segundos');
                resolve(false);
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        
        checkFirebase();
    });
}

// Cargar sectores usando tu lógica existente de arboles.js
async function cargarSectoresDesdeArboles() {
    try {
        console.log('📦 Cargando sectores desde estructura existente...');
        
        // Intentar cargar desde Firebase primero
        if (db) {
            try {
                const snapshot = await db.collection('sectores').get();
                
                snapshot.docs.forEach(doc => {
                    const sector = {
                        id: doc.id,
                        ...doc.data(),
                        fechaCreacion: doc.data().fechaCreacion?.toDate(),
                        fechaActualizacion: doc.data().fechaActualizacion?.toDate()
                    };
                    sectorsMap.set(doc.id, sector);
                });
                
                if (sectorsMap.size > 0) {
                    console.log(`✅ ${sectorsMap.size} sectores cargados desde Firebase`);
                }
            } catch (error) {
                console.warn('⚠️ Error cargando sectores desde Firebase:', error);
            }
        }
        
        // Si no hay sectores en Firebase, cargar desde localStorage (tu método existente)
        if (sectorsMap.size === 0) {
            const savedSectors = localStorage.getItem('finca_sectores');
            if (savedSectors) {
                const sectorsData = JSON.parse(savedSectors);
                sectorsData.forEach(sector => {
                    sectorsMap.set(sector.id, sector);
                });
                console.log(`✅ ${sectorsMap.size} sectores cargados desde localStorage`);
            } else {
                // Usar sectores por defecto compatibles con tu estructura
                crearSectoresPorDefecto();
            }
        }
        
        // Convertir a formato que esperan tratamientos/riegos
        sectoresCargados = Array.from(sectorsMap.values()).map(sector => ({
            id: sector.id,
            nombre: sector.name || sector.nombre,
            codigo: sector.id,
            area: sector.area || 0,
            estado: sector.active !== false ? 'activo' : 'inactivo',
            capacidad: sector.capacity || 100,
            arbolesActuales: sector.currentTrees || 0,
            tipoSuelo: sector.soilType,
            sistemaRiego: sector.irrigationSystem,
            coordenadas: sector.coordinates,
            fechaCreacion: sector.createdAt
        }));
        
    } catch (error) {
        console.error('❌ Error cargando sectores:', error);
        crearSectoresPorDefecto();
    }
}

// Crear sectores por defecto usando tu estructura
function crearSectoresPorDefecto() {
    const sectoresDefecto = [
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
    
    sectoresDefecto.forEach(sector => sectorsMap.set(sector.id, sector));
    
    // Guardar en localStorage usando tu método
    try {
        localStorage.setItem('finca_sectores', JSON.stringify(sectoresDefecto));
    } catch (error) {
        console.error('Error guardando sectores por defecto:', error);
    }
    
    // Convertir a formato esperado
    sectoresCargados = sectoresDefecto.map(sector => ({
        id: sector.id,
        nombre: sector.name,
        codigo: sector.id,
        area: 0,
        estado: 'activo',
        capacidad: sector.capacity,
        arbolesActuales: sector.currentTrees,
        tipoSuelo: sector.soilType,
        sistemaRiego: sector.irrigationSystem,
        coordenadas: sector.coordinates,
        fechaCreacion: sector.createdAt
    }));
    
    console.log(`✅ ${sectoresCargados.length} sectores por defecto creados`);
}

// Cargar árboles desde Firebase
async function cargarArbolesDesdeFirebase() {
    try {
        if (!db) {
            console.warn('⚠️ Firebase no disponible para árboles');
            return;
        }
        
        const snapshot = await db.collection('arboles')
            .where('active', '==', true)
            .get();
        
        treesMap.clear();
        
        snapshot.forEach(doc => {
            const treeData = {
                id: doc.id,
                ...doc.data(),
                firebaseRef: doc.ref,
                fechaCreacion: doc.data().createdAt?.toDate(),
                fechaActualizacion: doc.data().updatedAt?.toDate()
            };
            treesMap.set(doc.id, treeData);
        });
        
        // Convertir a formato que esperan tratamientos/riegos
        arbolesCargados = Array.from(treesMap.values()).map(tree => ({
            id: tree.id,
            codigo: tree.correlative || tree.id.split('_').pop() || tree.id,
            sectorId: tree.blockId,
            sector: tree.blockId,
            sectorNombre: obtenerNombreSector(tree.blockId),
            variedad: tree.variety,
            estado: tree.health?.overall >= 80 ? 'saludable' : tree.health?.overall >= 60 ? 'tratamiento' : 'enfermo',
            edad: tree.age || 0,
            ubicacion: tree.location,
            salud: tree.health?.overall || 0,
            produccion: tree.production?.currentSeason || 0,
            fechaPlantacion: tree.plantingDate,
            notas: tree.notes
        }));
        
        console.log(`✅ ${arbolesCargados.length} árboles cargados desde Firebase`);
        
    } catch (error) {
        console.error('❌ Error cargando árboles desde Firebase:', error);
        arbolesCargados = [];
    }
}

// Sincronizar con estructuras existentes
function sincronizarConEstructuraExistente() {
    // Hacer disponible globalmente el mapa de sectores (compatible con arboles.js)
    if (typeof window !== 'undefined') {
        window.sectors = sectorsMap;
        
        // Actualizar selectores si existen (compatibilidad con arboles.js)
        if (typeof window.populateFilterSelectors === 'function') {
            setTimeout(() => {
                try {
                    window.populateFilterSelectors();
                } catch (error) {
                    console.warn('No se pudo actualizar selectores:', error);
                }
            }, 100);
        }
    }
}

function obtenerNombreSector(sectorId) {
    const sector = sectorsMap.get(sectorId);
    return sector ? sector.name : sectorId || 'Sin sector';
}

// ==================== MÉTODOS DE INTEGRACIÓN MEJORADOS ====================

// Método principal para obtener sectores (formato esperado por tratamientos/riegos)
function getSectoresParaFormulario() {
    return Promise.resolve(sectoresCargados.map(sector => ({
        id: sector.id,
        nombre: sector.nombre,
        codigo: sector.codigo,
        capacidad: sector.capacidad,
        estado: sector.estado
    })));
}

// Método principal para obtener árboles (formato esperado por tratamientos/riegos)
function getArbolesParaFormulario() {
    return Promise.resolve(arbolesCargados.map(arbol => ({
        id: arbol.id,
        codigo: arbol.codigo,
        sectorId: arbol.sectorId,
        sector: arbol.sectorNombre,
        variedad: arbol.variedad,
        estado: arbol.estado
    })));
}

// Método para obtener sector por ID
function getSectorById(sectorId) {
    return sectoresCargados.find(sector => sector.id === sectorId);
}

// Método para obtener árboles de un sector
function getArbolesPorSector(sectorId) {
    return arbolesCargados.filter(arbol => arbol.sectorId === sectorId);
}

// Método para contar árboles por sector
function contarArbolesPorSector(sectorId) {
    return getArbolesPorSector(sectorId).length;
}

// Método para compatibilidad con producción
function getProductionSummary() {
    return {
        totalSectores: sectoresCargados.length,
        totalArboles: arbolesCargados.length,
        sectoresActivos: sectoresCargados.filter(s => s.estado === 'activo').length,
        arbolesProductivos: arbolesCargados.filter(a => a.estado === 'saludable').length
    };
}

// Método para obtener lista completa
function obtenerListaCompleta() {
    return {
        sectores: sectoresCargados,
        arboles: arbolesCargados,
        resumen: getProductionSummary()
    };
}

// Actualizar datos (recargar desde Firebase y localStorage)
async function actualizarDatos() {
    console.log('🔄 Actualizando datos del TreeManager...');
    
    await cargarSectoresDesdeArboles();
    await cargarArbolesDesdeFirebase();
    sincronizarConEstructuraExistente();
    
    // Notificar actualización
    window.dispatchEvent(new CustomEvent('treeDataUpdated', {
        detail: {
            sectores: sectoresCargados,
            arboles: arbolesCargados
        }
    }));
    
    console.log('✅ Datos actualizados correctamente');
}

// ==================== MÉTODOS CRUD COMPATIBLES ====================

// Agregar nuevo sector (compatible con tu estructura)
async function agregarSector(sectorData) {
    try {
        const nuevoSector = {
            id: sectorData.id || `SECTOR_${Date.now().toString(36).toUpperCase()}`,
            name: sectorData.nombre || sectorData.name,
            capacity: sectorData.capacidad || sectorData.capacity || 100,
            soilType: sectorData.tipoSuelo || sectorData.soilType,
            irrigationSystem: sectorData.sistemaRiego || sectorData.irrigationSystem,
            coordinates: sectorData.coordenadas || sectorData.coordinates,
            currentTrees: 0,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Guardar en Firebase si está disponible
        if (db) {
            const docRef = await db.collection('sectores').add(nuevoSector);
            nuevoSector.id = docRef.id;
        }
        
        // Agregar a mapas locales
        sectorsMap.set(nuevoSector.id, nuevoSector);
        
        // Convertir y agregar a lista
        const sectorFormateado = {
            id: nuevoSector.id,
            nombre: nuevoSector.name,
            codigo: nuevoSector.id,
            area: 0,
            estado: 'activo',
            capacidad: nuevoSector.capacity,
            arbolesActuales: 0,
            tipoSuelo: nuevoSector.soilType,
            sistemaRiego: nuevoSector.irrigationSystem,
            coordenadas: nuevoSector.coordinates,
            fechaCreacion: nuevoSector.createdAt
        };
        
        sectoresCargados.push(sectorFormateado);
        
        // Guardar en localStorage
        const sectoresArray = Array.from(sectorsMap.values());
        localStorage.setItem('finca_sectores', JSON.stringify(sectoresArray));
        
        // Notificar cambio
        window.dispatchEvent(new CustomEvent('sectorAdded', {
            detail: { sector: sectorFormateado }
        }));
        
        console.log('✅ Sector agregado:', nuevoSector.id);
        return sectorFormateado;
        
    } catch (error) {
        console.error('❌ Error agregando sector:', error);
        throw error;
    }
}

// Agregar nuevo árbol (compatible con tu estructura)
async function agregarArbol(arbolData) {
    try {
        const nuevoArbol = {
            id: arbolData.id || `ARBOL_${Date.now().toString(36).toUpperCase()}`,
            correlative: arbolData.correlativo || arbolData.correlative,
            variety: arbolData.variedad || arbolData.variety,
            blockId: arbolData.sectorId || arbolData.blockId,
            plantingDate: arbolData.fechaPlantacion || arbolData.plantingDate,
            location: arbolData.ubicacion || arbolData.location || {
                latitude: arbolData.latitude,
                longitude: arbolData.longitude
            },
            measurements: {
                height: arbolData.altura || 0,
                diameter: arbolData.diametro || 0
            },
            health: {
                overall: arbolData.salud || 100
            },
            production: {
                currentSeason: arbolData.produccion || 0
            },
            notes: arbolData.notas || '',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Calcular edad
        if (nuevoArbol.plantingDate) {
            const plantDate = new Date(nuevoArbol.plantingDate);
            const now = new Date();
            nuevoArbol.age = Math.floor((now - plantDate) / (365.25 * 24 * 60 * 60 * 1000));
        }
        
        // Guardar en Firebase si está disponible
        if (db) {
            const docRef = await db.collection('arboles').add(nuevoArbol);
            nuevoArbol.id = docRef.id;
        }
        
        // Agregar a mapas locales
        treesMap.set(nuevoArbol.id, nuevoArbol);
        
        // Convertir y agregar a lista
        const arbolFormateado = {
            id: nuevoArbol.id,
            codigo: nuevoArbol.correlative || nuevoArbol.id.split('_').pop(),
            sectorId: nuevoArbol.blockId,
            sector: nuevoArbol.blockId,
            sectorNombre: obtenerNombreSector(nuevoArbol.blockId),
            variedad: nuevoArbol.variety,
            estado: nuevoArbol.health.overall >= 80 ? 'saludable' : 'tratamiento',
            edad: nuevoArbol.age || 0,
            ubicacion: nuevoArbol.location,
            salud: nuevoArbol.health.overall,
            produccion: nuevoArbol.production.currentSeason,
            fechaPlantacion: nuevoArbol.plantingDate,
            notas: nuevoArbol.notes
        };
        
        arbolesCargados.push(arbolFormateado);
        
        // Notificar cambio
        window.dispatchEvent(new CustomEvent('treeAdded', {
            detail: { arbol: arbolFormateado }
        }));
        
        console.log('✅ Árbol agregado:', nuevoArbol.id);
        return arbolFormateado;
        
    } catch (error) {
        console.error('❌ Error agregando árbol:', error);
        throw error;
    }
}

// ==================== MÉTODOS DE DEBUGGING ====================

function debugTreeManager() {
    console.log('=== TREE MANAGER DEBUG ===');
    console.log('Inicializado:', treeManagerInicializado);
    console.log('Sectores cargados:', sectoresCargados.length);
    console.log('Árboles cargados:', arbolesCargados.length);
    console.log('Sectores:', sectoresCargados);
    console.log('Árboles:', arbolesCargados);
    console.log('SectorsMap size:', sectorsMap.size);
    console.log('TreesMap size:', treesMap.size);
    console.log('========================');
    
    return {
        inicializado: treeManagerInicializado,
        sectores: sectoresCargados,
        arboles: arbolesCargados,
        sectorsMap: Array.from(sectorsMap.values()),
        treesMap: Array.from(treesMap.values())
    };
}

// Forzar recarga completa
async function forzarRecarga() {
    console.log('🔄 Forzando recarga completa del TreeManager...');
    
    treeManagerInicializado = false;
    sectoresCargados = [];
    arbolesCargados = [];
    sectorsMap.clear();
    treesMap.clear();
    
    await initializeTreeManager();
    
    console.log('✅ Recarga completa finalizada');
}

// Cargar datos de respaldo usando tu estructura existente
async function cargarDatosDeRespaldoExistente() {
    console.log('⚠️ Cargando datos de respaldo...');
    
    crearSectoresPorDefecto();
    
    // Crear algunos árboles de ejemplo usando tu estructura
    const arbolesEjemplo = [
        {
            id: 'arbol-001',
            codigo: 'A-001',
            sectorId: 'SECTOR_NORTE',
            sector: 'SECTOR_NORTE',
            sectorNombre: 'Sector Norte',
            variedad: 'Lima Persa',
            estado: 'saludable',
            edad: 3,
            ubicacion: { latitude: 14.6359, longitude: -90.5069 },
            salud: 90,
            produccion: 25,
            fechaPlantacion: new Date(2021, 0, 15).toISOString(),
            notas: 'Árbol ejemplo'
        }
    ];
    
    arbolesCargados = arbolesEjemplo;
    
    console.log('✅ Datos de respaldo cargados');
}

// ==================== EXPOSICIÓN GLOBAL MEJORADA ====================

// Crear objeto treeManager compatible con tu estructura existente
const treeManager = {
    // Estado
    inicializado: () => treeManagerInicializado,
    get isInitialized() { return treeManagerInicializado; },
    
    // Datos principales (compatibilidad con tratamientos/riegos)
    getSectoresParaFormulario,
    getArbolesParaFormulario,
    getSectorById,
    getArbolesPorSector,
    contarArbolesPorSector,
    
    // Compatibilidad con módulos existentes
    getProductionSummary,
    obtenerListaCompleta,
    
    // Gestión de datos
    actualizarDatos,
    agregarSector,
    agregarArbol,
    
    // Debugging y utilidades
    debug: debugTreeManager,
    forzarRecarga,
    
    // Acceso directo a datos (solo lectura)
    get sectores() { return sectoresCargados; },
    get arboles() { return arbolesCargados; },
    
    // Mapas internos (para compatibilidad con arboles.js)
    get trees() { return treesMap; },
    get sectors() { return sectorsMap; },
    
    // Métodos de tu estructura existente
    getAllTrees: () => Promise.resolve(Array.from(treesMap.values())),
    getTree: (id) => Promise.resolve(treesMap.get(id)),
    getAllSectors: () => Promise.resolve(Array.from(sectorsMap.values())),
    getSector: (id) => Promise.resolve(sectorsMap.get(id)),
    
    // Métodos de estadísticas básicas
    getStatistics: async () => {
        const stats = {
            totalTrees: arbolesCargados.length,
            healthyTrees: arbolesCargados.filter(a => a.estado === 'saludable').length,
            sickTrees: arbolesCargados.filter(a => a.estado === 'enfermo').length,
            treatmentTrees: arbolesCargados.filter(a => a.estado === 'tratamiento').length,
            averageProduction: arbolesCargados.length > 0 
                ? arbolesCargados.reduce((sum, a) => sum + a.produccion, 0) / arbolesCargados.length 
                : 0
        };
        return stats;
    }
};

// ==================== AUTO-INICIALIZACIÓN MEJORADA ====================

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            await initializeTreeManager();
            window.treeManager = treeManager;
            console.log('✅ TreeManager disponible globalmente');
        }, 500); // Dar tiempo a que se carguen otros scripts
    });
} else {
    // El DOM ya está listo
    setTimeout(async () => {
        await initializeTreeManager();
        window.treeManager = treeManager;
        console.log('✅ TreeManager disponible globalmente');
    }, 500);
}

// También intentar inicializar cuando Firebase esté disponible
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if (!treeManagerInicializado) {
            setTimeout(async () => {
                await initializeTreeManager();
                if (!window.treeManager) {
                    window.treeManager = treeManager;
                }
            }, 1000);
        }
    });
}

console.log('🌳 TreeManager integrado cargado - Versión compatible con sistema existente');
