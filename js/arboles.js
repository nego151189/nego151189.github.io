/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE ÁRBOLES CORREGIDA
   Integración completa con sistemas base + Leaflet Maps vfull
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let currentView = 'grid';
let selectedTrees = new Set();
let currentFilters = {};
let leafletMap = null;
let fullLeafletMap = null;
let mapMarkers = new Map();
let mapInitialized = false;
let searchTimeout = null;
let currentLocation = null;
let isInitialized = false;

// Configuración de Leaflet Maps
const mapConfig = {
    center: [14.6349, -90.5069], // Coordenadas reales de Guatemala
    zoom: 15,
    minZoom: 10,
    maxZoom: 19,
    tileLayers: {
        streets: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            name: 'Calles'
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '© Esri',
            name: 'Satélite'
        }
    }
};

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🌳 Inicializando sistema de gestión de árboles integrado...');
        
        // Esperar a que los sistemas base estén listos
        await waitForCoreSystems();
        
        // Configurar eventos
        setupEventListeners();
        
        // Configurar GPS
        setupGPS();
        
        // Cargar datos usando TreeManager
        await loadDataFromTreeManager();
        
        // Inicializar Leaflet Maps
        await initializeLeafletMaps();
        
        // Generar insights
        generateAIInsights();
        
        isInitialized = true;
        console.log('✅ Sistema de árboles inicializado correctamente');
        
    } catch (error) {
        console.error('⚠️ Error inicializando:', error);
        showNotification('Error inicializando el sistema: ' + error.message, 'error');
        
        // Modo degradado
        setupFallbackMode();
    }
});

async function waitForCoreSystems() {
    console.log('⏳ Esperando sistemas base...');
    
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 100; // 10 segundos máximo
        
        const checkSystems = () => {
            attempts++;
            
            // Verificar que al menos TreeManager esté disponible
            const hasTreeManager = window.treeManager && window.treeManager.isInitialized;
            const hasAuth = window.authManager || window.firebase?.auth;
            const hasOffline = window.offlineManager;
            
            console.log(`🔍 Verificando sistemas (${attempts}/${maxAttempts}):`, {
                treeManager: hasTreeManager,
                auth: !!hasAuth,
                offline: !!hasOffline
            });
            
            if (hasTreeManager || attempts >= maxAttempts) {
                console.log('✅ Sistemas base listos o timeout alcanzado');
                resolve();
                return;
            }
            
            setTimeout(checkSystems, 100);
        };
        
        checkSystems();
    });
}

function setupEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    // Botones principales
    const btnNuevo = document.getElementById('btnNuevoArbol');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', showNewTreeModal);
    }
    
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', exportTreeData);
    }
    
    const btnSectores = document.getElementById('btnGestionSectores');
    if (btnSectores) {
        btnSectores.addEventListener('click', showSectorsManagement);
    }
    
    // Cambio de vistas
    document.querySelectorAll('.view-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const vista = e.target.closest('.view-toggle').dataset.view;
            cambiarVista(vista);
        });
    });

    // Filtros
    const btnAplicar = document.getElementById('aplicarFiltros');
    if (btnAplicar) {
        btnAplicar.addEventListener('click', aplicarFiltros);
    }
    
    const btnLimpiar = document.getElementById('limpiarFiltros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
    
    // Búsqueda en tiempo real con debounce
    const busquedaInput = document.getElementById('busquedaArbol');
    if (busquedaInput) {
        busquedaInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(aplicarFiltros, 300);
        });
    }

    // Modal
    const btnCerrar = document.getElementById('cerrarModal');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', hideModal);
    }
    
    const modalOverlay = document.getElementById('modalArbol');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'modalArbol') hideModal();
        });
    }

    // Controles de mapa
    const btnCentrar = document.getElementById('btnCentrarMapa');
    if (btnCentrar) {
        btnCentrar.addEventListener('click', centerMap);
    }
    
    const btnCapas = document.getElementById('btnCapasMapa');
    if (btnCapas) {
        btnCapas.addEventListener('click', toggleMapLayers);
    }
    
    const btnFullscreen = document.getElementById('btnPantallaCompleta');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', toggleFullscreenMap);
    }

    // Eventos del sistema
    window.addEventListener('treeManagerReady', handleTreeManagerReady);
    window.addEventListener('treeCreated', handleTreeUpdate);
    window.addEventListener('treeUpdated', handleTreeUpdate);
    window.addEventListener('treeDeleted', handleTreeUpdate);
    
    // Eventos responsive
    window.addEventListener('resize', debounce(handleResize, 250));
    
    // Touch events para móviles
    if ('ontouchstart' in window) {
        setupTouchEvents();
    }
}

function setupTouchEvents() {
    // Mejorar experiencia táctil en móviles
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('.arbol-card')) {
            e.target.closest('.arbol-card').style.transform = 'scale(0.98)';
        }
    });
    
    document.addEventListener('touchend', (e) => {
        if (e.target.closest('.arbol-card')) {
            setTimeout(() => {
                if (e.target.closest('.arbol-card')) {
                    e.target.closest('.arbol-card').style.transform = '';
                }
            }, 150);
        }
    });
}

// ==========================================
// INTEGRACIÓN CON TREE-MANAGER
// ==========================================

async function loadDataFromTreeManager() {
    try {
        console.log('📊 Cargando datos desde TreeManager...');
        
        if (!window.treeManager) {
            throw new Error('TreeManager no disponible');
        }
        
        // Cargar sectores desde TreeManager
        await loadSectorsFromTreeManager();
        
        // Cargar estadísticas
        await updateStatisticsFromTreeManager();
        
        // Renderizar árboles
        await renderTreesFromTreeManager();
        
        // Poblar selectores de filtros
        populateFilterSelectors();
        
        console.log('✅ Datos cargados desde TreeManager');
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        showNotification('Error cargando datos del sistema', 'error');
        
        // Fallback al modo offline si está disponible
        await tryLoadFromOfflineManager();
    }
}

async function loadSectorsFromTreeManager() {
    try {
        const sectors = await window.treeManager.getAllSectors();
        console.log(`📦 Sectores cargados: ${sectors.length}`);
        
        // Si no hay sectores, crear algunos básicos
        if (sectors.length === 0) {
            await createDefaultSectorsIfNeeded();
        }
        
    } catch (error) {
        console.error('Error cargando sectores:', error);
        await createDefaultSectorsIfNeeded();
    }
}

async function createDefaultSectorsIfNeeded() {
    if (!window.treeManager?.createSector) {
        console.warn('No se puede crear sectores sin TreeManager');
        return;
    }
    
    try {
        const defaultSectors = [
            {
                name: 'Sector Norte',
                area: 1000,
                description: 'Sector principal norte de la finca',
                coordinates: {
                    latitude: 14.6359,
                    longitude: -90.5069
                }
            },
            {
                name: 'Sector Sur', 
                area: 800,
                description: 'Sector sur con sistema de riego',
                coordinates: {
                    latitude: 14.6339,
                    longitude: -90.5069
                }
            }
        ];
        
        for (const sectorData of defaultSectors) {
            await window.treeManager.createSector(sectorData);
        }
        
        console.log('✅ Sectores por defecto creados');
        
    } catch (error) {
        console.error('Error creando sectores por defecto:', error);
    }
}

async function tryLoadFromOfflineManager() {
    if (!window.offlineManager) {
        console.warn('OfflineManager no disponible');
        return;
    }
    
    try {
        console.log('💾 Intentando cargar desde OfflineManager...');
        
        const offlineData = await window.offlineManager.getAllData('arboles');
        if (offlineData.length > 0) {
            console.log(`📱 Cargados ${offlineData.length} árboles desde offline`);
            // Procesar datos offline
            await renderOfflineData(offlineData);
        }
        
    } catch (error) {
        console.error('Error cargando datos offline:', error);
    }
}

async function updateStatisticsFromTreeManager() {
    try {
        const stats = await window.treeManager.getStatistics();
        
        // Actualizar elementos DOM
        updateStatElement('totalSaludables', stats.activeTrees || 0);
        updateStatElement('totalEnfermos', stats.sickTrees || 0);
        updateStatElement('totalTratamiento', stats.treatmentTrees || 0);
        updateStatElement('produccionPromedio', `${stats.averageProduction || 0} kg`);
        
        console.log('📊 Estadísticas actualizadas:', stats);
        
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
        // Mostrar valores por defecto
        updateStatElement('totalSaludables', '0');
        updateStatElement('totalEnfermos', '0');
        updateStatElement('totalTratamiento', '0');
        updateStatElement('produccionPromedio', '0 kg');
    }
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

async function renderTreesFromTreeManager() {
    try {
        if (!window.treeManager) {
            throw new Error('TreeManager no disponible');
        }

        const trees = await window.treeManager.getAllTrees();
        
        if (currentView === 'grid') {
            renderGridView(trees);
        } else if (currentView === 'lista') {
            renderTableView(trees);
        }
        
        // Actualizar marcadores del mapa
        if (mapInitialized) {
            await updateMapMarkers(trees);
        }
        
        console.log(`🌳 Renderizados ${trees.length} árboles`);
        
    } catch (error) {
        console.error('Error renderizando árboles:', error);
        showNoResultsMessage('Error cargando árboles del sistema');
    }
}

// ==========================================
// RENDERIZADO DE VISTAS
// ==========================================

function renderGridView(trees) {
    const grid = document.getElementById('arbolesGrid');
    if (!grid) return;
    
    if (trees.length === 0) {
        showNoResultsMessage();
        return;
    }

    grid.innerHTML = trees.map(tree => createTreeCard(tree)).join('');
}

function createTreeCard(tree) {
    const treeNumber = tree.correlative || '00000';
    const health = tree.health?.overall || 100;
    const estadoBadge = getEstadoBadge(health);
    const blockName = getBlockName(tree.blockId);
    
    return `
        <div class="arbol-card" data-id="${tree.id}" onclick="mostrarDetalleArbol('${tree.id}')">
            <div class="arbol-numero">#${treeNumber}</div>
            ${estadoBadge}
            
            <div class="arbol-metricas">
                <div class="metrica-item">
                    <span class="metrica-valor">${calculateTreeAge(tree.plantingDate)}</span>
                    <div class="metrica-label">Años</div>
                </div>
                <div class="metrica-item">
                    <span class="metrica-valor">${tree.production?.currentSeason || 0}</span>
                    <div class="metrica-label">kg/mes</div>
                </div>
                <div class="metrica-item">
                    <span class="metrica-valor">${blockName}</span>
                    <div class="metrica-label">Sector</div>
                </div>
                <div class="metrica-item">
                    <span class="metrica-valor">${Math.round(health)}%</span>
                    <div class="metrica-label">Salud</div>
                </div>
            </div>
            
            ${tree.coordinates ? `
                <div class="arbol-ubicacion">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="gps-coords">
                        ${tree.coordinates.latitude?.toFixed(4) || '0.0000'}, 
                        ${tree.coordinates.longitude?.toFixed(4) || '0.0000'}
                    </span>
                </div>
            ` : ''}
            
            <div class="arbol-acciones">
                <button class="btn-accion btn-detalle" onclick="event.stopPropagation(); mostrarDetalleArbol('${tree.id}')" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-accion btn-editar" onclick="event.stopPropagation(); editarArbol('${tree.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-accion btn-historial" onclick="event.stopPropagation(); mostrarHistorial('${tree.id}')" title="Historial">
                    <i class="fas fa-history"></i>
                </button>
            </div>
        </div>
    `;
}

function renderTableView(trees) {
    const tbody = document.getElementById('tablaArbolesBody');
    if (!tbody) return;
    
    if (trees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 2rem;">
                    <i class="fas fa-search" style="font-size: 2rem; color: var(--medium-gray); margin-bottom: 1rem;"></i>
                    <br>
                    No se encontraron árboles
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = trees.map(tree => {
        const treeNumber = tree.correlative || '00000';
        const health = tree.health?.overall || 100;
        const blockName = getBlockName(tree.blockId);
        
        return `
            <tr onclick="mostrarDetalleArbol('${tree.id}')" style="cursor: pointer;">
                <td>#${treeNumber}</td>
                <td>${getEstadoBadge(health, true)}</td>
                <td>${blockName}</td>
                <td>${calculateTreeAge(tree.plantingDate)} años</td>
                <td class="hide-mobile">${formatDate(tree.updatedAt)}</td>
                <td class="hide-mobile">${tree.production?.currentSeason || 0} kg/mes</td>
                <td>
                    <div class="d-flex gap-sm">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); editarArbol('${tree.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); eliminarArbol('${tree.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showNoResultsMessage(customMessage = null) {
    const grid = document.getElementById('arbolesGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
            <i class="fas fa-search"></i>
            <h3>No se encontraron árboles</h3>
            <p>${customMessage || 'Ajusta los filtros o agrega nuevos árboles'}</p>
            <button class="btn btn-primary" onclick="showNewTreeModal()">
                <i class="fas fa-plus"></i> Agregar Árbol
            </button>
        </div>
    `;
}

// ==========================================
// LEAFLET MAPS INTEGRATION
// ==========================================

async function initializeLeafletMaps() {
    if (typeof L === 'undefined') {
        console.error('⚠️ Leaflet no está cargado');
        return;
    }

    try {
        console.log('🗺️ Inicializando Leaflet Maps...');

        // Inicializar mapa lateral
        await initializeSidebarMap();
        
        // Inicializar mapa completo si estamos en esa vista
        if (currentView === 'mapa') {
            await initializeFullLeafletMap();
        }
        
        mapInitialized = true;
        console.log('✅ Leaflet Maps inicializados');
        
    } catch (error) {
        console.error('⚠️ Error inicializando Leaflet:', error);
        showNotification('Error al inicializar el mapa', 'error');
    }
}

async function initializeSidebarMap() {
    const mapContainer = document.getElementById('mapa-arboles');
    if (!mapContainer) return;

    if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
    }

    leafletMap = L.map(mapContainer, {
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
        zoomControl: true,
        scrollWheelZoom: true
    });

    // Agregar capa base
    const streetsLayer = L.tileLayer(mapConfig.tileLayers.streets.url, {
        attribution: mapConfig.tileLayers.streets.attribution,
        maxZoom: 19
    }).addTo(leafletMap);

    // Control de capas
    const baseMaps = {
        'Calles': streetsLayer,
        'Satélite': L.tileLayer(mapConfig.tileLayers.satellite.url, {
            attribution: mapConfig.tileLayers.satellite.attribution,
            maxZoom: 19
        })
    };

    L.control.layers(baseMaps).addTo(leafletMap);
    L.control.scale().addTo(leafletMap);

    // Cargar marcadores de árboles
    await updateMapMarkersFromTreeManager();
}

async function initializeFullLeafletMap() {
    const fullMapContainer = document.getElementById('mapa-completo');
    if (!fullMapContainer) return;

    if (fullLeafletMap) {
        fullLeafletMap.remove();
        fullLeafletMap = null;
    }

    fullLeafletMap = L.map(fullMapContainer, {
        center: mapConfig.center,
        zoom: mapConfig.zoom - 1,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
        zoomControl: true,
        scrollWheelZoom: true
    });

    // Agregar capa satelital para vista completa
    const satelliteLayer = L.tileLayer(mapConfig.tileLayers.satellite.url, {
        attribution: mapConfig.tileLayers.satellite.attribution,
        maxZoom: 19
    }).addTo(fullLeafletMap);

    const baseMaps = {
        'Satélite': satelliteLayer,
        'Calles': L.tileLayer(mapConfig.tileLayers.streets.url, {
            attribution: mapConfig.tileLayers.streets.attribution,
            maxZoom: 19
        })
    };

    L.control.layers(baseMaps).addTo(fullLeafletMap);
    L.control.scale().addTo(fullLeafletMap);

    // Mostrar todos los árboles
    await updateFullMapMarkers();
}

async function updateMapMarkersFromTreeManager() {
    if (!leafletMap || !window.treeManager) return;

    try {
        // Limpiar marcadores existentes
        mapMarkers.forEach(marker => leafletMap.removeLayer(marker));
        mapMarkers.clear();

        // Obtener árboles desde TreeManager
        const trees = await window.treeManager.getAllTrees();
        
        trees.forEach(tree => {
            if (tree.coordinates?.latitude && tree.coordinates?.longitude) {
                const marker = createLeafletTreeMarker(tree, leafletMap);
                if (marker) {
                    mapMarkers.set(tree.id, marker);
                }
            }
        });

        // Ajustar vista si hay marcadores
        if (mapMarkers.size > 0) {
            fitMapToMarkers();
        }

        console.log(`🗺️ ${mapMarkers.size} marcadores actualizados en el mapa`);

    } catch (error) {
        console.error('Error actualizando marcadores:', error);
    }
}

function createLeafletTreeMarker(tree, map) {
    if (!tree.coordinates?.latitude || !tree.coordinates?.longitude) {
        return null;
    }

    const position = [tree.coordinates.latitude, tree.coordinates.longitude];
    const health = tree.health?.overall || 100;
    
    // Determinar color e icono basado en salud
    let iconColor, iconClass;
    if (health >= 80) {
        iconColor = '#22c55e';
        iconClass = 'fa-leaf';
    } else if (health >= 60) {
        iconColor = '#f59e0b';
        iconClass = 'fa-exclamation-triangle';
    } else {
        iconColor = '#ef4444';
        iconClass = 'fa-times-circle';
    }

    // Crear icono personalizado
    const customIcon = L.divIcon({
        html: `
            <div style="
                background: ${iconColor};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                color: white;
                font-size: 12px;
            ">
                <i class="fas ${iconClass}"></i>
            </div>
        `,
        className: 'tree-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker(position, { 
        icon: customIcon,
        title: `Árbol #${tree.correlative || '00000'} - Salud: ${health}%`
    }).addTo(map);

    // Crear popup
    const popupContent = createMarkerPopupContent(tree);
    marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'tree-popup'
    });

    return marker;
}

function createMarkerPopupContent(tree) {
    const treeNumber = tree.correlative || '00000';
    const health = tree.health?.overall || 100;
    const production = tree.production?.currentSeason || 0;
    const blockName = getBlockName(tree.blockId);

    return `
        <div class="tree-popup-content">
            <h4>🌳 Árbol #${treeNumber}</h4>
            <div class="tree-info">
                <p><strong>Variedad:</strong> ${tree.variety || 'N/A'}</p>
                <p><strong>Sector:</strong> ${blockName}</p>
                <p><strong>Edad:</strong> ${calculateTreeAge(tree.plantingDate)} años</p>
                <p><strong>Salud:</strong> ${health}%</p>
                <p><strong>Producción:</strong> ${production} kg/mes</p>
            </div>
            <div class="popup-actions">
                <button onclick="mostrarDetalleArbol('${tree.id}')" class="popup-btn popup-btn-primary">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
                <button onclick="centerMapOnTree('${tree.id}')" class="popup-btn popup-btn-secondary">
                    <i class="fas fa-crosshairs"></i> Centrar
                </button>
            </div>
        </div>
        <style>
            .tree-popup-content {
                font-family: var(--font-primary);
                min-width: 250px;
            }
            .tree-popup-content h4 {
                margin: 0 0 10px 0;
                color: var(--primary-green);
                font-size: 1.1rem;
            }
            .tree-info p {
                margin: 5px 0;
                font-size: 13px;
                color: var(--text-primary);
            }
            .popup-actions {
                margin-top: 15px;
                display: flex;
                gap: 8px;
            }
            .popup-btn {
                padding: 6px 12px;
                font-size: 11px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                flex: 1;
                justify-content: center;
                transition: var(--transition-fast);
            }
            .popup-btn-primary {
                background: var(--primary-green);
                color: white;
            }
            .popup-btn-secondary {
                background: var(--medium-gray);
                color: white;
            }
            .popup-btn:hover {
                opacity: 0.8;
            }
        </style>
    `;
}

// ==========================================
// GESTIÓN DE VISTAS Y UI
// ==========================================

function cambiarVista(vista) {
    currentView = vista;
    
    // Actualizar toggles activos
    document.querySelectorAll('.view-toggle').forEach(t => t.classList.remove('active'));
    const activeToggle = document.querySelector(`[data-view="${vista}"]`);
    if (activeToggle) activeToggle.classList.add('active');

    // Mostrar/ocultar vistas
    document.querySelectorAll('.vista-contenido').forEach(v => v.style.display = 'none');
    
    const mapaContainer = document.querySelector('.mapa-container');
    
    switch(vista) {
        case 'grid':
            const vistaGrid = document.getElementById('vistaGrid');
            if (vistaGrid) vistaGrid.style.display = 'block';
            if (mapaContainer) mapaContainer.style.display = 'block';
            break;
        case 'lista':
            const vistaLista = document.getElementById('vistaLista');
            if (vistaLista) vistaLista.style.display = 'block';
            if (mapaContainer) mapaContainer.style.display = 'none';
            renderTreesFromTreeManager();
            break;
        case 'mapa':
            const vistaMapa = document.getElementById('vistaMapa');
            if (vistaMapa) vistaMapa.style.display = 'block';
            if (mapaContainer) mapaContainer.style.display = 'none';
            setTimeout(() => initializeFullLeafletMap(), 100);
            break;
    }
}

// ==========================================
// MODALES Y FORMULARIOS INTEGRADOS
// ==========================================

function showNewTreeModal() {
    const treeForm = createTreeForm();
    showModal('Nuevo Árbol', treeForm);
}

async function mostrarDetalleArbol(treeId) {
    try {
        if (!window.treeManager) {
            showNotification('Sistema no disponible', 'error');
            return;
        }
        
        const tree = await window.treeManager.getTree(treeId);
        if (!tree) {
            showNotification('Árbol no encontrado', 'error');
            return;
        }
        
        const treeNumber = tree.correlative || '00000';
        const details = createTreeDetails(tree);
        showModal(`Árbol #${treeNumber}`, details);
        
    } catch (error) {
        console.error('Error mostrando detalles:', error);
        showNotification('Error cargando detalles del árbol', 'error');
    }
}

async function editarArbol(treeId) {
    try {
        if (!window.treeManager) {
            showNotification('Sistema no disponible', 'error');
            return;
        }
        
        const tree = await window.treeManager.getTree(treeId);
        if (!tree) {
            showNotification('Árbol no encontrado', 'error');
            return;
        }
        
        const treeNumber = tree.correlative || '00000';
        const form = createTreeForm(tree);
        showModal(`Editar Árbol #${treeNumber}`, form);
        
    } catch (error) {
        console.error('Error editando árbol:', error);
        showNotification('Error cargando datos del árbol', 'error');
    }
}

async function eliminarArbol(treeId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este árbol?')) return;
    
    try {
        if (!window.treeManager) {
            showNotification('Sistema no disponible', 'error');
            return;
        }
        
        await window.treeManager.deleteTree(treeId);
        
        showNotification('Árbol eliminado correctamente', 'success');
        await renderTreesFromTreeManager();
        await updateStatisticsFromTreeManager();
        
        // Actualizar mapa
        if (mapInitialized) {
            await updateMapMarkersFromTreeManager();
        }
        
    } catch (error) {
        console.error('Error eliminando árbol:', error);
        showNotification('Error eliminando árbol: ' + error.message, 'error');
    }
}

function createTreeForm(tree = null) {
    const isEdit = !!tree;
    
    return `
        <form id="treeForm" class="tree-form" onsubmit="handleTreeFormSubmit(event, '${tree?.id || ''}')">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Variedad *</label>
                    <select class="form-input" name="variety" required>
                        <option value="">Seleccionar variedad</option>
                        <option value="Limón Persa" ${tree?.variety === 'Limón Persa' ? 'selected' : ''}>Limón Persa</option>
                        <option value="Limón Criollo" ${tree?.variety === 'Limón Criollo' ? 'selected' : ''}>Limón Criollo</option>
                        <option value="Limón Meyer" ${tree?.variety === 'Limón Meyer' ? 'selected' : ''}>Limón Meyer</option>
                        <option value="Limón Eureka" ${tree?.variety === 'Limón Eureka' ? 'selected' : ''}>Limón Eureka</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Sector *</label>
                    <select class="form-input" name="blockId" required id="sectorSelect">
                        <option value="">Seleccionar sector</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Fecha de Plantación *</label>
                    <input type="date" class="form-input" name="plantingDate" 
                           value="${tree?.plantingDate ? new Date(tree.plantingDate).toISOString().split('T')[0] : ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Salud General (%) *</label>
                    <input type="number" class="form-input" name="health" min="0" max="100" 
                           value="${tree?.health?.overall || 100}" required>
                </div>
            </div>
            
            <div class="gps-section">
                <h4><i class="fas fa-map-marker-alt"></i> Ubicación GPS</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Latitud *</label>
                        <input type="number" class="form-input" name="latitude" step="0.000001" 
                               value="${tree?.coordinates?.latitude || ''}" placeholder="14.634900" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Longitud *</label>
                        <input type="number" class="form-input" name="longitude" step="0.000001" 
                               value="${tree?.coordinates?.longitude || ''}" placeholder="-90.506900" required>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-secondary w-mobile-full" onclick="getCurrentLocationForTree()">
                            <i class="fas fa-crosshairs"></i>
                            <span>Ubicación Actual</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Notas</label>
                <textarea class="form-input" name="notes" rows="3" placeholder="Observaciones adicionales...">${tree?.notes || ''}</textarea>
            </div>
            
            <div class="form-actions d-flex gap-md">
                <button type="button" class="btn btn-secondary flex-mobile-column" onclick="hideModal()">
                    Cancelar
                </button>
                <button type="submit" class="btn btn-primary flex-mobile-column">
                    <i class="fas fa-save"></i>
                    <span>${isEdit ? 'Actualizar' : 'Crear'} Árbol</span>
                </button>
            </div>
        </form>
    `;
}

async function handleTreeFormSubmit(event, treeId = '') {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const lat = parseFloat(formData.get('latitude'));
    const lng = parseFloat(formData.get('longitude'));
    
    // Validar coordenadas
    if (!validateGPSCoordinates(lat, lng)) {
        showNotification('Las coordenadas GPS no son válidas', 'error');
        return;
    }
    
    const treeData = {
        variety: formData.get('variety'),
        blockId: formData.get('blockId'),
        plantingDate: formData.get('plantingDate'),
        coordinates: {
            latitude: lat,
            longitude: lng
        },
        notes: formData.get('notes'),
        health: {
            overall: parseInt(formData.get('health')) || 100
        }
    };

    try {
        if (!window.treeManager) {
            throw new Error('Sistema no disponible');
        }

        if (treeId) {
            // Actualizar árbol existente
            await window.treeManager.updateTree(treeId, treeData);
        } else {
            // Crear nuevo árbol
            await window.treeManager.createTree(treeData);
        }
        
        showNotification(`Árbol ${treeId ? 'actualizado' : 'creado'} correctamente`, 'success');
        hideModal();
        
        // Recargar datos
        await renderTreesFromTreeManager();
        await updateStatisticsFromTreeManager();
        
        // Actualizar mapa
        if (mapInitialized) {
            await updateMapMarkersFromTreeManager();
        }
        
    } catch (error) {
        console.error('Error guardando árbol:', error);
        showNotification('Error guardando árbol: ' + error.message, 'error');
    }
}

// ==========================================
// UTILIDADES Y HELPERS
// ==========================================

function calculateTreeAge(plantingDate) {
    if (!plantingDate) return 0;
    
    try {
        const planted = new Date(plantingDate);
        const now = new Date();
        const diffTime = Math.abs(now - planted);
        const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
        return diffYears;
    } catch (error) {
        return 0;
    }
}

function getBlockName(blockId) {
    // Esta función debería obtener el nombre del TreeManager
    if (window.treeManager?.getSector) {
        const sector = window.treeManager.getSector(blockId);
        return sector?.name || blockId || 'N/A';
    }
    return blockId || 'N/A';
}

function getEstadoBadge(salud, textOnly = false) {
    let estado, icon, clase;
    
    if (salud >= 80) {
        estado = 'Saludable';
        icon = 'fa-seedling';
        clase = 'saludable';
    } else if (salud >= 60) {
        estado = 'Tratamiento';
        icon = 'fa-stethoscope';
        clase = 'tratamiento';
    } else {
        estado = 'Enfermo';
        icon = 'fa-exclamation-triangle';
        clase = 'enfermo';
    }
    
    if (textOnly) {
        return `<span class="status ${clase}"><i class="fas ${icon}"></i> ${estado}</span>`;
    }
    
    return `
        <div class="arbol-estado-badge ${clase}">
            <i class="fas ${icon}"></i>
            <span>${estado}</span>
        </div>
    `;
}

function validateGPSCoordinates(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    if (lat === 0 && lng === 0) return false;
    
    // Validar rango aproximado para Guatemala
    if (lat < 13.5 || lat > 18.0 || lng < -92.5 || lng > -88.0) {
        console.warn('Coordenadas fuera del rango esperado para Guatemala');
        return confirm('Las coordenadas están fuera del rango esperado para Guatemala. ¿Continuar?');
    }
    
    return true;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// FUNCIONES DE INTERFAZ
// ==========================================

function showModal(title, content) {
    const modal = document.getElementById('modalArbol');
    const modalTitle = document.getElementById('modalTitulo');
    const modalContent = document.getElementById('contenidoModal');
    
    if (modal && modalTitle && modalContent) {
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        modal.classList.add('show');
        
        // Poblar sectores si hay un selector
        setTimeout(populateSectorSelector, 100);
        
        // Prevenir scroll del body en móviles
        if (window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        }
    }
}

function hideModal() {
    const modal = document.getElementById('modalArbol');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

async function populateSectorSelector() {
    const sectorSelect = document.getElementById('sectorSelect');
    if (!sectorSelect || !window.treeManager) return;
    
    try {
        const sectors = await window.treeManager.getAllSectors();
        
        sectorSelect.innerHTML = '<option value="">Seleccionar sector</option>' +
            sectors.map(sector => 
                `<option value="${sector.id}">${sector.name}</option>`
            ).join('');
            
    } catch (error) {
        console.error('Error cargando sectores:', error);
    }
}

function populateFilterSelectors() {
    populateSectorFilter();
}

async function populateSectorFilter() {
    const bloqueSelect = document.getElementById('filtroBloque');
    if (!bloqueSelect || !window.treeManager) return;
    
    try {
        const sectors = await window.treeManager.getAllSectors();
        
        bloqueSelect.innerHTML = '<option value="">Todos los sectores</option>' +
            sectors.map(sector => 
                `<option value="${sector.id}">${sector.name}</option>`
            ).join('');
            
    } catch (error) {
        console.error('Error cargando sectores para filtros:', error);
    }
}

function showNotification(message, type = 'info') {
    // Usar el sistema de notificaciones existente si está disponible
    if (window.authManager?.showMessage) {
        window.authManager.showMessage(message, type);
        return;
    }
    
    // Fallback a notificación simple
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        box-shadow: var(--shadow-lg);
    `;
    
    // Colores según tipo
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// ==========================================
// FUNCIONES GLOBALES EXPUESTAS
// ==========================================

// Hacer funciones disponibles globalmente para onclick handlers
window.mostrarDetalleArbol = mostrarDetalleArbol;
window.editarArbol = editarArbol;
window.eliminarArbol = eliminarArbol;
window.cambiarVista = cambiarVista;
window.showNewTreeModal = showNewTreeModal;
window.handleTreeFormSubmit = handleTreeFormSubmit;
window.getCurrentLocationForTree = getCurrentLocationForTree;
window.hideModal = hideModal;
window.showModal = showModal;

// Exportar funciones principales para integración
window.arbolesManager = {
    isInitialized: () => isInitialized,
    renderTrees: renderTreesFromTreeManager,
    updateStatistics: updateStatisticsFromTreeManager,
    refreshMap: updateMapMarkersFromTreeManager,
    changeView: cambiarVista,
    showNewTree: showNewTreeModal
};

console.log('🌳 Sistema de árboles integrado cargado completamente');
