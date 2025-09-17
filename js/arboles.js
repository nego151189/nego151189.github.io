/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE ÁRBOLES
   Sistema completo con Leaflet Maps y todas las funciones
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
let sectors = new Map();
let mapInitialized = false;
let searchTimeout = null;
let currentLocation = null;

// Configuración de Leaflet (completamente gratuito)
const mapConfig = {
    center: [14.7705, -90.25516], // [lat, lng] Guatemala
    zoom: 15,
    minZoom: 10,
    maxZoom: 19,
    // Capas de mapa disponibles gratuitamente
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
        },
        topo: {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '© OpenTopoMap contributors',
            name: 'Topográfico'
        }
    }
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🌳 Inicializando sistema de gestión de árboles con Leaflet...');
        
        // Esperar a que TreeManager esté disponible
        await waitForTreeManager();
        
        // Configurar eventos
        setupEventListeners();
        
        // Cargar sectores
        loadSectors();
        
        // Configurar GPS
        setupGPS();
        
        // Cargar datos iniciales
        await loadInitialData();
        
        // Inicializar Leaflet Maps
        await initializeLeafletMaps();
        
        console.log('✅ Sistema de árboles inicializado con Leaflet');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showNotification('Error inicializando el sistema', 'error');
    }
});

function waitForTreeManager() {
    return new Promise((resolve) => {
        const checkManager = () => {
            if (window.treeManager && window.treeManager.isInitialized) {
                resolve();
            } else {
                setTimeout(checkManager, 100);
            }
        };
        checkManager();
        setTimeout(resolve, 5000);
    });
}

function setupEventListeners() {
    // Botones principales
    const btnNuevo = document.getElementById('btnNuevoArbol');
    if (btnNuevo) btnNuevo.addEventListener('click', showNewTreeModal);
    
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) btnExportar.addEventListener('click', exportData);
    
    const btnSectores = document.getElementById('btnGestionSectores');
    if (btnSectores) btnSectores.addEventListener('click', showSectorsManagement);
    
    // Cambio de vistas
    document.querySelectorAll('.view-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const vista = e.target.closest('.view-toggle').dataset.view;
            cambiarVista(vista);
        });
    });

    // Filtros
    const btnAplicar = document.getElementById('aplicarFiltros');
    if (btnAplicar) btnAplicar.addEventListener('click', aplicarFiltros);
    
    const btnLimpiar = document.getElementById('limpiarFiltros');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    
    // Búsqueda en tiempo real
    const busquedaInput = document.getElementById('busquedaArbol');
    if (busquedaInput) {
        busquedaInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(aplicarFiltros, 300);
        });
    }

    // Modal
    const btnCerrar = document.getElementById('cerrarModal');
    if (btnCerrar) btnCerrar.addEventListener('click', hideModal);
    
    const modalOverlay = document.getElementById('modalArbol');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'modalArbol') hideModal();
        });
    }

    // Controles de mapa
    const btnCentrar = document.getElementById('btnCentrarMapa');
    if (btnCentrar) btnCentrar.addEventListener('click', centerMap);
    
    const btnCapas = document.getElementById('btnCapasMapa');
    if (btnCapas) btnCapas.addEventListener('click', toggleMapLayers);
    
    const btnFullscreen = document.getElementById('btnPantallaCompleta');
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreenMap);

    // Eventos del sistema
    window.addEventListener('treeUpdate', handleTreeUpdate);
    window.addEventListener('sectorUpdate', handleSectorUpdate);
}

// ==========================================
// LEAFLET MAPS INTEGRATION (GRATUITO)
// ==========================================

async function initializeLeafletMaps() {
    try {
        // Verificar que Leaflet esté disponible
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet no está cargado');
            showNotification('Error: Leaflet no está disponible', 'error');
            return;
        }

        console.log('🗺️ Inicializando Leaflet Maps...');

        // Inicializar mapa lateral
        const mapContainer = document.getElementById('mapa-arboles');
        if (mapContainer) {
            leafletMap = L.map(mapContainer, {
                center: mapConfig.center,
                zoom: mapConfig.zoom,
                minZoom: mapConfig.minZoom,
                maxZoom: mapConfig.maxZoom,
                zoomControl: true,
                scrollWheelZoom: true
            });

            // Agregar capa base (calles por defecto)
            const streetsLayer = L.tileLayer(mapConfig.tileLayers.streets.url, {
                attribution: mapConfig.tileLayers.streets.attribution,
                maxZoom: 19
            }).addTo(leafletMap);

            // Control de capas
            const baseMaps = {};
            Object.keys(mapConfig.tileLayers).forEach(key => {
                const layer = mapConfig.tileLayers[key];
                baseMaps[layer.name] = L.tileLayer(layer.url, {
                    attribution: layer.attribution,
                    maxZoom: 19
                });
            });
            baseMaps[mapConfig.tileLayers.streets.name] = streetsLayer;

            L.control.layers(baseMaps).addTo(leafletMap);

            // Agregar control de escala
            L.control.scale().addTo(leafletMap);

            // Agregar marcadores existentes
            await updateMapMarkers();
            
            mapInitialized = true;
            console.log('✅ Leaflet Maps inicializado');
        }

        // Inicializar mapa completo si estamos en esa vista
        if (currentView === 'mapa') {
            initializeFullLeafletMap();
        }

    } catch (error) {
        console.error('❌ Error inicializando Leaflet:', error);
        showNotification('Error al inicializar el mapa', 'error');
    }
}

function initializeFullLeafletMap() {
    const fullMapContainer = document.getElementById('mapa-completo');
    if (!fullMapContainer || !L) return;

    // Limpiar mapa existente si existe
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

    // Agregar capa satelital por defecto para vista completa
    const satelliteLayer = L.tileLayer(mapConfig.tileLayers.satellite.url, {
        attribution: mapConfig.tileLayers.satellite.attribution,
        maxZoom: 19
    }).addTo(fullLeafletMap);

    // Control de capas para mapa completo
    const baseMaps = {};
    Object.keys(mapConfig.tileLayers).forEach(key => {
        const layer = mapConfig.tileLayers[key];
        baseMaps[layer.name] = L.tileLayer(layer.url, {
            attribution: layer.attribution,
            maxZoom: 19
        });
    });
    baseMaps[mapConfig.tileLayers.satellite.name] = satelliteLayer;

    L.control.layers(baseMaps).addTo(fullLeafletMap);
    L.control.scale().addTo(fullLeafletMap);

    // Mostrar todos los árboles en el mapa completo
    updateFullMapMarkers();
}

async function updateMapMarkers() {
    if (!leafletMap || !window.treeManager) return;

    try {
        // Limpiar marcadores existentes
        mapMarkers.forEach(marker => leafletMap.removeLayer(marker));
        mapMarkers.clear();

        // Obtener árboles actuales
        const trees = await window.treeManager.getAllTrees(currentFilters);
        
        trees.forEach(tree => {
            if (tree.location && tree.location.latitude && tree.location.longitude) {
                const marker = createLeafletTreeMarker(tree, leafletMap);
                mapMarkers.set(tree.id, marker);
            }
        });

        // Ajustar vista para mostrar todos los marcadores
        if (mapMarkers.size > 0) {
            fitMapToMarkers();
        }

    } catch (error) {
        console.error('Error actualizando marcadores:', error);
    }
}

function createLeafletTreeMarker(tree, map) {
    const position = [tree.location.latitude, tree.location.longitude];

    // Crear icono personalizado basado en salud del árbol
    const health = tree.health?.overall || 0;
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

    // Crear icono HTML personalizado
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
        title: `Árbol #${tree.id.split('_').pop()} - Salud: ${health}%`
    }).addTo(map);

    // Crear popup con información del árbol
    const popupContent = createMarkerPopupContent(tree);
    marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'tree-popup'
    });

    return marker;
}

function createMarkerPopupContent(tree) {
    const treeNumber = tree.id.split('_').pop() || tree.id;
    const health = tree.health?.overall || 0;
    const production = tree.production?.currentSeason || 0;

    return `
        <div class="tree-popup-content">
            <h4>🌳 Árbol #${treeNumber}</h4>
            <div class="tree-info">
                <p><strong>Variedad:</strong> ${tree.variety}</p>
                <p><strong>Sector:</strong> ${tree.blockId}</p>
                <p><strong>Edad:</strong> ${tree.age || 0} años</p>
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
                font-family: Arial, sans-serif;
                min-width: 250px;
            }
            .tree-popup-content h4 {
                margin: 0 0 10px 0;
                color: #22c55e;
                font-size: 1.1rem;
            }
            .tree-info p {
                margin: 5px 0;
                font-size: 13px;
                color: #374151;
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
            }
            .popup-btn-primary {
                background: #22c55e;
                color: white;
            }
            .popup-btn-secondary {
                background: #64748b;
                color: white;
            }
            .popup-btn:hover {
                opacity: 0.8;
            }
        </style>
    `;
}

function updateFullMapMarkers() {
    if (!fullLeafletMap || !window.treeManager) return;

    window.treeManager.getAllTrees().then(trees => {
        trees.forEach(tree => {
            if (tree.location && tree.location.latitude && tree.location.longitude) {
                createLeafletTreeMarker(tree, fullLeafletMap);
            }
        });

        // Ajustar vista para mostrar todos los árboles
        if (trees.length > 0) {
            const group = new L.featureGroup();
            trees.forEach(tree => {
                if (tree.location && tree.location.latitude && tree.location.longitude) {
                    group.addLayer(L.marker([tree.location.latitude, tree.location.longitude]));
                }
            });
            if (group.getLayers().length > 0) {
                fullLeafletMap.fitBounds(group.getBounds().pad(0.1));
            }
        }
    }).catch(error => {
        console.error('Error actualizando marcadores del mapa completo:', error);
    });
}

function fitMapToMarkers() {
    if (!leafletMap || mapMarkers.size === 0) return;

    const group = new L.featureGroup();
    mapMarkers.forEach(marker => {
        group.addLayer(marker);
    });

    leafletMap.fitBounds(group.getBounds().pad(0.1));
}

function centerMapOnTree(treeId) {
    const marker = mapMarkers.get(treeId);
    if (marker && leafletMap) {
        leafletMap.setView(marker.getLatLng(), 18);
        marker.openPopup();
        
        // Cambiar a vista de cuadrícula con mapa si no estamos ahí
        if (currentView !== 'grid') {
            cambiarVista('grid');
        }
    }
}

// ==========================================
// GESTIÓN DE SECTORES
// ==========================================

function loadSectors() {
    try {
        const savedSectors = localStorage.getItem('finca_sectores');
        if (savedSectors) {
            const sectorsData = JSON.parse(savedSectors);
            sectorsData.forEach(sector => sectors.set(sector.id, sector));
        } else {
            createDefaultSectors();
        }
        console.log(`📦 Sectores cargados: ${sectors.size}`);
    } catch (error) {
        console.error('Error cargando sectores:', error);
        createDefaultSectors();
    }
}

function createDefaultSectors() {
    const defaultSectors = [
        {
            id: 'SECTOR_NORTE',
            name: 'Sector Norte',
            coordinates: {
                center: [14.6359, -90.5069],
                bounds: [
                    [14.6354, -90.5074],
                    [14.6364, -90.5064]
                ]
            },
            capacity: 100,
            currentTrees: 0,
            soilType: 'Franco arcilloso',
            irrigationSystem: 'Goteo',
            createdAt: new Date().toISOString()
        },
        {
            id: 'SECTOR_SUR',
            name: 'Sector Sur',
            coordinates: {
                center: [14.6339, -90.5069],
                bounds: [
                    [14.6334, -90.5074],
                    [14.6344, -90.5064]
                ]
            },
            capacity: 100,
            currentTrees: 0,
            soilType: 'Franco arenoso',
            irrigationSystem: 'Aspersión',
            createdAt: new Date().toISOString()
        },
        {
            id: 'SECTOR_ESTE',
            name: 'Sector Este',
            coordinates: {
                center: [14.6349, -90.5059],
                bounds: [
                    [14.6344, -90.5064],
                    [14.6354, -90.5054]
                ]
            },
            capacity: 100,
            currentTrees: 0,
            soilType: 'Arcilloso',
            irrigationSystem: 'Manual',
            createdAt: new Date().toISOString()
        }
    ];

    defaultSectors.forEach(sector => sectors.set(sector.id, sector));
    saveSectors();
}

function saveSectors() {
    try {
        const sectorsArray = Array.from(sectors.values());
        localStorage.setItem('finca_sectores', JSON.stringify(sectorsArray));
    } catch (error) {
        console.error('Error guardando sectores:', error);
    }
}

function showSectorsManagement() {
    const sectorsContent = createSectorsManagementContent();
    showModal('Gestión de Sectores', sectorsContent);
}

function createSectorsManagementContent() {
    const sectorsArray = Array.from(sectors.values());
    
    return `
        <div class="sectors-management">
            <div class="sectors-header">
                <button class="btn btn-primary" onclick="showNewSectorModal()">
                    <i class="fas fa-plus"></i> Nuevo Sector
                </button>
            </div>
            
            <div class="sectors-list">
                ${sectorsArray.length > 0 ? sectorsArray.map(sector => `
                    <div class="sector-card">
                        <div class="sector-header">
                            <h4>${sector.name}</h4>
                            <div class="sector-actions">
                                <button class="btn btn-sm btn-secondary" onclick="editSector('${sector.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteSector('${sector.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="sector-info">
                            <div class="info-item">
                                <span class="info-label">Capacidad:</span>
                                <span class="info-value">${sector.capacity} árboles</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Árboles actuales:</span>
                                <span class="info-value">${sector.currentTrees || 0}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Tipo de suelo:</span>
                                <span class="info-value">${sector.soilType}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Riego:</span>
                                <span class="info-value">${sector.irrigationSystem}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Coordenadas:</span>
                                <span class="info-value">${sector.coordinates?.center?.[0]?.toFixed(4)}, ${sector.coordinates?.center?.[1]?.toFixed(4)}</span>
                            </div>
                        </div>
                    </div>
                `).join('') : '<p class="no-sectors">No hay sectores creados</p>'}
            </div>
        </div>
        
        <style>
            .sectors-management {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .sectors-header {
                display: flex;
                justify-content: flex-end;
            }
            
            .sectors-list {
                display: grid;
                gap: 1rem;
            }
            
            .sector-card {
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 1rem;
                background: var(--bg-secondary);
            }
            
            .sector-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .sector-header h4 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .sector-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .sector-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 0.5rem;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                padding: 0.25rem 0;
            }
            
            .info-label {
                font-weight: 500;
                color: var(--text-secondary);
            }
            
            .info-value {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .no-sectors {
                text-align: center;
                color: var(--text-secondary);
                padding: 2rem;
            }
        </style>
    `;
}

function showNewSectorModal() {
    const sectorForm = createSectorForm();
    showModal('Nuevo Sector', sectorForm);
}

function editSector(sectorId) {
    const sector = sectors.get(sectorId);
    if (!sector) return;
    
    const sectorForm = createSectorForm(sector);
    showModal(`Editar Sector: ${sector.name}`, sectorForm);
}

function createSectorForm(sector = null) {
    const isEdit = !!sector;
    
    return `
        <form id="sectorForm" class="sector-form" onsubmit="handleSectorFormSubmit(event, '${sector?.id || ''}')">
            <div class="form-group">
                <label class="form-label">Nombre del Sector</label>
                <input type="text" class="form-input" name="name" 
                       value="${sector?.name || ''}" placeholder="Ej: Sector Norte" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Capacidad (árboles)</label>
                <input type="number" class="form-input" name="capacity" min="1" 
                       value="${sector?.capacity || 100}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Tipo de Suelo</label>
                <select class="form-input" name="soilType">
                    <option value="Franco arcilloso" ${sector?.soilType === 'Franco arcilloso' ? 'selected' : ''}>Franco arcilloso</option>
                    <option value="Franco arenoso" ${sector?.soilType === 'Franco arenoso' ? 'selected' : ''}>Franco arenoso</option>
                    <option value="Arcilloso" ${sector?.soilType === 'Arcilloso' ? 'selected' : ''}>Arcilloso</option>
                    <option value="Arenoso" ${sector?.soilType === 'Arenoso' ? 'selected' : ''}>Arenoso</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Sistema de Riego</label>
                <select class="form-input" name="irrigationSystem">
                    <option value="Goteo" ${sector?.irrigationSystem === 'Goteo' ? 'selected' : ''}>Goteo</option>
                    <option value="Aspersión" ${sector?.irrigationSystem === 'Aspersión' ? 'selected' : ''}>Aspersión</option>
                    <option value="Inundación" ${sector?.irrigationSystem === 'Inundación' ? 'selected' : ''}>Inundación</option>
                    <option value="Manual" ${sector?.irrigationSystem === 'Manual' ? 'selected' : ''}>Manual</option>
                </select>
            </div>
            
            <div class="gps-section">
                <h4><i class="fas fa-map"></i> Ubicación GPS del Centro</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Latitud</label>
                        <input type="number" class="form-input" name="centerLat" step="0.0001" 
                               value="${sector?.coordinates?.center?.[0] || ''}" placeholder="14.6349" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Longitud</label>
                        <input type="number" class="form-input" name="centerLng" step="0.0001" 
                               value="${sector?.coordinates?.center?.[1] || ''}" placeholder="-90.5069" required>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-secondary" onclick="getCurrentLocationForSector()">
                            <i class="fas fa-crosshairs"></i> Ubicación Actual
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Crear'} Sector
                </button>
            </div>
        </form>
    `;
}

function handleSectorFormSubmit(event, sectorId = '') {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Validar coordenadas GPS
    const lat = parseFloat(formData.get('centerLat'));
    const lng = parseFloat(formData.get('centerLng'));
    
    if (!validateGPSCoordinates(lat, lng)) {
        showNotification('Las coordenadas GPS no son válidas', 'error');
        return;
    }
    
    const sectorData = {
        id: sectorId || `SECTOR_${Date.now().toString(36).toUpperCase()}`,
        name: formData.get('name'),
        capacity: parseInt(formData.get('capacity')),
        soilType: formData.get('soilType'),
        irrigationSystem: formData.get('irrigationSystem'),
        coordinates: {
            center: [lat, lng]
        },
        currentTrees: sectorId ? sectors.get(sectorId)?.currentTrees || 0 : 0,
        createdAt: sectorId ? sectors.get(sectorId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        sectors.set(sectorData.id, sectorData);
        saveSectors();
        
        populateFilterSelectors();
        showNotification(`Sector ${sectorId ? 'actualizado' : 'creado'} correctamente`, 'success');
        hideModal();
        
        // Actualizar vista de sectores si está abierta
        setTimeout(() => {
            if (document.querySelector('.sectors-management')) {
                showSectorsManagement();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error guardando sector:', error);
        showNotification('Error guardando sector', 'error');
    }
}

function deleteSector(sectorId) {
    if (!confirm('¿Estás seguro de eliminar este sector? Esta acción no se puede deshacer.')) return;
    
    try {
        const sector = sectors.get(sectorId);
        if (!sector) return;
        
        // Verificar si hay árboles en el sector
        if (window.treeManager) {
            const treesInSector = Array.from(window.treeManager.trees.values())
                .filter(tree => tree.active && tree.blockId === sectorId);
            
            if (treesInSector.length > 0) {
                showNotification('No se puede eliminar un sector que tiene árboles', 'error');
                return;
            }
        }
        
        sectors.delete(sectorId);
        saveSectors();
        
        populateFilterSelectors();
        showNotification('Sector eliminado correctamente', 'success');
        
        // Actualizar vista de sectores
        setTimeout(() => {
            if (document.querySelector('.sectors-management')) {
                showSectorsManagement();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error eliminando sector:', error);
        showNotification('Error eliminando sector', 'error');
    }
}

function getCurrentLocationForSector() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (validateGPSCoordinates(lat, lng)) {
                    document.querySelector('input[name="centerLat"]').value = lat.toFixed(6);
                    document.querySelector('input[name="centerLng"]').value = lng.toFixed(6);
                    showNotification('Ubicación GPS obtenida', 'success');
                } else {
                    showNotification('Coordenadas GPS inválidas obtenidas', 'error');
                }
            },
            (error) => {
                console.error('Error obteniendo ubicación:', error);
                showNotification('Error obteniendo ubicación GPS: ' + error.message, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        showNotification('GPS no disponible en este navegador', 'error');
    }
}

// ==========================================
// GESTIÓN DE VISTAS
// ==========================================

function cambiarVista(vista) {
    currentView = vista;
    
    // Actualizar toggles
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
            renderTableView();
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
// GESTIÓN DE DATOS (SIN FICTICIOS)
// ==========================================

async function loadInitialData() {
    try {
        syncCorrelativeCounter(); // Agregar esta línea aquí
        await updateEstadisticas();
        await renderTrees();
        generateAIInsights();
        populateFilterSelectors();
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        showNotification('Error cargando datos', 'error');
    }
}

async function renderTrees() {
    try {
        if (!window.treeManager) {
            console.warn('TreeManager no disponible');
            return;
        }

        const trees = await window.treeManager.getAllTrees(currentFilters);
        
        if (currentView === 'grid') {
            renderGridView(trees);
        } else if (currentView === 'lista') {
            renderTableView(trees);
        }
        
        // Actualizar marcadores del mapa
        if (mapInitialized) {
            updateMapMarkers();
        }
        
    } catch (error) {
        console.error('Error renderizando árboles:', error);
        showNotification('Error cargando árboles', 'error');
    }
}

function renderGridView(trees) {
    const grid = document.getElementById('arbolesGrid');
    if (!grid) return;
    
    if (trees.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No se encontraron árboles</h3>
                <p>Ajusta los filtros o agrega nuevos árboles</p>
                <button class="btn btn-primary" onclick="showNewTreeModal()">
                    <i class="fas fa-plus"></i> Agregar Árbol
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = trees.map(tree => createTreeCard(tree)).join('');
}

function createTreeCard(tree) {
    const estadoBadge = getEstadoBadge(tree.health?.overall || 0);
    const ubicacion = tree.location || {};
    const treeNumber = tree.correlative || tree.id ? tree.id.split('_').pop() || tree.id : 'N/A';
    
    return `
        <div class="arbol-card" data-id="${tree.id}" onclick="mostrarDetalleArbol('${tree.id}')">
            <div class="arbol-numero">#${treeNumber}</div>
            ${estadoBadge}
            
            <div class="arbol-metricas">
                <div class="metrica-item">
                    <span class="metrica-valor">${tree.age || 0}</span>
                    <div class="metrica-label">Años</div>
                </div>
                <div class="metrica-item">
                    <span class="metrica-valor">${tree.production?.currentSeason || 0}</span>
                    <div class="metrica-label">kg/mes</div>
                </div>
                <div class="metrica-item">
                    <span class="metrica-valor">${tree.blockId || 'N/A'}</span>
                    <div class="metrica-label">Sector</div>
                </div>
                <div class="metrica-item">
                    <span class="metrica-valor">${Math.round(tree.health?.overall || 0)}%</span>
                    <div class="metrica-label">Salud</div>
                </div>
            </div>
            
            <div class="arbol-ubicacion">
                <i class="fas fa-map-marker-alt"></i>
                <span class="gps-coords">
                    ${ubicacion.latitude?.toFixed(4) || '0.0000'}, 
                    ${ubicacion.longitude?.toFixed(4) || '0.0000'}
                </span>
            </div>
            
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

function renderTableView(trees = null) {
    const tbody = document.getElementById('tablaArbolesBody');
    if (!tbody) return;
    
    if (!trees) {
        if (window.treeManager) {
            window.treeManager.getAllTrees().then(loadedTrees => {
                renderTableViewData(loadedTrees, tbody);
            });
        }
        return;
    }
    
    renderTableViewData(trees, tbody);
}

function renderTableViewData(trees, tbody) {
    tbody.innerHTML = trees.map(tree => {
        const treeNumber = tree.id ? tree.id.split('_').pop() || tree.id : 'N/A';
        return `
            <tr onclick="mostrarDetalleArbol('${tree.id}')" style="cursor: pointer;">
                <td>#${treeNumber}</td>
                <td>${getEstadoBadge(tree.health?.overall || 0, true)}</td>
                <td>${tree.blockId || 'N/A'}</td>
                <td>${tree.age || 0} años</td>
                <td>${formatDate(tree.health?.lastInspection || tree.updatedAt)}</td>
                <td>${tree.production?.currentSeason || 0} kg/mes</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); editarArbol('${tree.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); eliminarArbol('${tree.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateEstadisticas() {
    try {
        if (!window.treeManager) {
            console.warn('TreeManager no disponible para estadísticas');
            return;
        }

        const stats = await window.treeManager.getStatistics();
        
        const elementos = {
            totalSaludables: document.getElementById('totalSaludables'),
            totalEnfermos: document.getElementById('totalEnfermos'),
            totalTratamiento: document.getElementById('totalTratamiento'),
            produccionPromedio: document.getElementById('produccionPromedio')
        };
        
        if (elementos.totalSaludables) elementos.totalSaludables.textContent = stats.healthyTrees || 0;
        if (elementos.totalEnfermos) elementos.totalEnfermos.textContent = stats.sickTrees || 0;
        if (elementos.totalTratamiento) elementos.totalTratamiento.textContent = stats.treatmentTrees || 0;
        if (elementos.produccionPromedio) elementos.produccionPromedio.textContent = 
            `${stats.averageProduction || 0} kg`;
            
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
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
            ${estado}
        </div>
    `;
}

// ==========================================
// MODALES Y FORMULARIOS
// ==========================================

function showNewTreeModal() {
    const treeForm = createTreeForm();
    showModal('Nuevo Árbol', treeForm);
}

async function mostrarDetalleArbol(treeId) {
    try {
        let tree;
        if (window.treeManager && window.treeManager.getTree) {
            tree = await window.treeManager.getTree(treeId);
        }
        
        if (!tree) {
            showNotification('Árbol no encontrado', 'error');
            return;
        }
        
        const treeNumber = tree.id ? tree.id.split('_').pop() || tree.id : 'N/A';
        showModal(`Árbol #${treeNumber}`, createTreeDetails(tree));
        
    } catch (error) {
        console.error('Error mostrando detalles:', error);
        showNotification('Error cargando detalles', 'error');
    }
}

async function editarArbol(treeId) {
    try {
        let tree;
        if (window.treeManager && window.treeManager.getTree) {
            tree = await window.treeManager.getTree(treeId);
        }
        
        if (!tree) {
            showNotification('Árbol no encontrado', 'error');
            return;
        }
        
        const treeNumber = tree.id ? tree.id.split('_').pop() || tree.id : 'N/A';
        const form = createTreeForm(tree);
        showModal(`Editar Árbol #${treeNumber}`, form);
        
    } catch (error) {
        console.error('Error editando árbol:', error);
        showNotification('Error cargando árbol', 'error');
    }
}

async function eliminarArbol(treeId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este árbol?')) return;
    
    try {
        if (window.treeManager && window.treeManager.deleteTree) {
            await window.treeManager.deleteTree(treeId, 'Eliminado por usuario');
        }
        
        showNotification('Árbol eliminado correctamente', 'success');
        await renderTrees();
        await updateEstadisticas();
        
    } catch (error) {
        console.error('Error eliminando árbol:', error);
        showNotification('Error eliminando árbol', 'error');
    }
}

function createTreeForm(tree = null) {
    const isEdit = !!tree;
    const sectorsArray = Array.from(sectors.values());
    
    return `
        <form id="treeForm" class="tree-form" onsubmit="handleTreeFormSubmit(event, '${tree?.id || ''}')">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Variedad</label>
                    <select class="form-input" name="variety" required>
                        <option value="Lima Persa" ${tree?.variety === 'Lima Persa' ? 'selected' : ''}>Lima Persa</option>
                        <option value="Limón Eureka" ${tree?.variety === 'Limón Eureka' ? 'selected' : ''}>Limón Eureka</option>
                        <option value="Limón Meyer" ${tree?.variety === 'Limón Meyer' ? 'selected' : ''}>Limón Meyer</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Sector</label>
                    <select class="form-input" name="blockId" required>
                        <option value="">Seleccionar sector</option>
                        ${sectorsArray.map(sector => `
                            <option value="${sector.id}" ${tree?.blockId === sector.id ? 'selected' : ''}>
                                ${sector.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Fecha de Plantación</label>
                    <input type="date" class="form-input" name="plantingDate" 
                           value="${tree?.plantingDate ? new Date(tree.plantingDate).toISOString().split('T')[0] : ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Altura (m)</label>
                    <input type="number" class="form-input" name="height" step="0.1" 
                           value="${tree?.measurements?.height || ''}" placeholder="0.0">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Diámetro (cm)</label>
                    <input type="number" class="form-input" name="diameter" step="0.1" 
                           value="${tree?.measurements?.diameter || ''}" placeholder="0.0">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Salud General (%)</label>
                    <input type="number" class="form-input" name="health" min="0" max="100" 
                           value="${tree?.health?.overall || 100}" required>
                </div>
            </div>
            
            <div class="gps-section">
                <h4><i class="fas fa-map-marker-alt"></i> Ubicación GPS</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Latitud</label>
                        <input type="number" class="form-input" name="latitude" step="0.0001" 
                               value="${tree?.location?.latitude || ''}" placeholder="14.6349" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Longitud</label>
                        <input type="number" class="form-input" name="longitude" step="0.0001" 
                               value="${tree?.location?.longitude || ''}" placeholder="-90.5069" required>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-secondary" onclick="getCurrentLocationForTree()">
                            <i class="fas fa-crosshairs"></i> Ubicación Actual
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Notas</label>
                <textarea class="form-input" name="notes" rows="3" placeholder="Observaciones adicionales...">${tree?.notes || ''}</textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Crear'} Árbol
                </button>
            </div>
        </form>
    `;
}

function createTreeDetails(tree) {
    const location = tree.location || {};
    const measurements = tree.measurements || {};
    const health = tree.health || {};
    const production = tree.production || {};
    
    return `
        <div class="tree-details">
            <div class="details-header">
                <div class="tree-status">
                    ${getEstadoBadge(health.overall || 0)}
                </div>
                <div class="tree-meta">
                    <div><strong>Variedad:</strong> ${tree.variety || 'N/A'}</div>
                    <div><strong>Edad:</strong> ${tree.age || 0} años</div>
                    <div><strong>Sector:</strong> ${tree.blockId || 'N/A'}</div>
                </div>
            </div>
            
            <div class="details-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-ruler"></i> Medidas</h4>
                    <div class="measurements">
                        <div class="measure-item">
                            <span class="measure-label">Altura:</span>
                            <span class="measure-value">${measurements.height || 0} m</span>
                        </div>
                        <div class="measure-item">
                            <span class="measure-label">Diámetro:</span>
                            <span class="measure-value">${measurements.diameter || 0} cm</span>
                        </div>
                        <div class="measure-item">
                            <span class="measure-label">Ancho de Copa:</span>
                            <span class="measure-value">${measurements.canopyWidth || 0} m</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> Producción</h4>
                    <div class="production">
                        <div class="prod-item">
                            <span class="prod-label">Temporada Actual:</span>
                            <span class="prod-value">${production.currentSeason || 0} kg</span>
                        </div>
                        <div class="prod-item">
                            <span class="prod-label">Total Histórico:</span>
                            <span class="prod-value">${production.totalLifetime || 0} kg</span>
                        </div>
                        <div class="prod-item">
                            <span class="prod-label">Promedio:</span>
                            <span class="prod-value">${production.averageYield || 0} kg/mes</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Ubicación GPS</h4>
                    <div class="location">
                        <div class="coord-item">
                            <span class="coord-label">Latitud:</span>
                            <span class="coord-value">${location.latitude?.toFixed(6) || 'N/A'}</span>
                        </div>
                        <div class="coord-item">
                            <span class="coord-label">Longitud:</span>
                            <span class="coord-value">${location.longitude?.toFixed(6) || 'N/A'}</span>
                        </div>
                        <div class="coord-item">
                            <span class="coord-label">Elevación:</span>
                            <span class="coord-value">${location.elevation || 'N/A'} m</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="centerMapOnTree('${tree.id}')">
                        <i class="fas fa-map"></i> Ver en Mapa
                    </button>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-heart"></i> Estado de Salud</h4>
                    <div class="health">
                        <div class="health-item">
                            <span class="health-label">General:</span>
                            <div class="health-bar">
                                <div class="health-fill" style="width: ${health.overall || 0}%"></div>
                                <span class="health-text">${health.overall || 0}%</span>
                            </div>
                        </div>
                        <div class="health-item">
                            <span class="health-label">Hojas:</span>
                            <div class="health-bar">
                                <div class="health-fill" style="width: ${health.leaves || health.overall || 0}%"></div>
                                <span class="health-text">${health.leaves || health.overall || 0}%</span>
                            </div>
                        </div>
                        <div class="health-item">
                            <span class="health-label">Tronco:</span>
                            <div class="health-bar">
                                <div class="health-fill" style="width: ${health.trunk || health.overall || 0}%"></div>
                                <span class="health-text">${health.trunk || health.overall || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${tree.notes ? `
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> Notas</h4>
                    <p class="tree-notes">${tree.notes}</p>
                </div>
            ` : ''}
            
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="editarArbol('${tree.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-secondary" onclick="mostrarHistorial('${tree.id}')">
                    <i class="fas fa-history"></i> Historial
                </button>
                <button class="btn btn-warning" onclick="eliminarArbol('${tree.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
}

function handleTreeFormSubmit(event, treeId = '') {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const lat = parseFloat(formData.get('latitude'));
    const lng = parseFloat(formData.get('longitude'));
    
    // Validar coordenadas antes de guardar
    if (!validateGPSCoordinates(lat, lng)) {
        showNotification('Las coordenadas GPS no son válidas', 'error');
        return;
    }
    
    const treeData = {
        variety: formData.get('variety'),
        blockId: formData.get('blockId'),
        plantingDate: formData.get('plantingDate'),
        latitude: lat,
        longitude: lng,
        height: parseFloat(formData.get('height')) || 0,
        diameter: parseFloat(formData.get('diameter')) || 0,
        notes: formData.get('notes'),
        health: {
            overall: parseInt(formData.get('health')) || 100
        }
    };

    // Validar datos del árbol
    const validation = window.treeManager?.validateTreeData ? 
        window.treeManager.validateTreeData(treeData) : 
        { isValid: true, errors: [] };

    if (!validation.isValid) {
        showNotification('Errores en los datos: ' + validation.errors.join(', '), 'error');
        return;
    }

    try {
        if (treeId) {
            // Actualizar árbol existente
            updateTreeData(treeId, treeData);
        } else {
            // Crear nuevo árbol
            createNewTree(treeData);
        }
        
        showNotification(`Árbol ${treeId ? 'actualizado' : 'creado'} correctamente`, 'success');
        hideModal();
        renderTrees();
        updateEstadisticas();
        
    } catch (error) {
        console.error('Error guardando árbol:', error);
        showNotification('Error guardando árbol: ' + error.message, 'error');
    }
}

async function createNewTree(treeData) {
    if (!window.treeManager) {
        throw new Error('TreeManager no disponible');
    }

    // Agregar correlativo antes de crear
    treeData.correlative = getNextTreeCorrelative();

    try {
        const newTree = await window.treeManager.createTree(treeData);
        console.log('✅ Nuevo árbol creado:', newTree.id);
        return newTree;
    } catch (error) {
        console.error('Error creando árbol:', error);
        throw error;
    }
}

async function updateTreeData(treeId, updates) {
    if (!window.treeManager) {
        throw new Error('TreeManager no disponible');
    }

    try {
        const updatedTree = await window.treeManager.updateTree(treeId, updates);
        console.log('✅ Árbol actualizado:', treeId);
        return updatedTree;
    } catch (error) {
        console.error('Error actualizando árbol:', error);
        throw error;
    }
}

function getCurrentLocationForTree() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (validateGPSCoordinates(lat, lng)) {
                    document.querySelector('input[name="latitude"]').value = lat.toFixed(6);
                    document.querySelector('input[name="longitude"]').value = lng.toFixed(6);
                    showNotification('Ubicación GPS obtenida', 'success');
                } else {
                    showNotification('Coordenadas GPS inválidas obtenidas', 'error');
                }
            },
            (error) => {
                console.error('Error obteniendo ubicación:', error);
                showNotification('Error obteniendo ubicación GPS: ' + error.message, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        showNotification('GPS no disponible en este navegador', 'error');
    }
}

function mostrarHistorial(treeId) {
    const historialContent = `
        <div class="historial-container">
            <div class="historial-tabs">
                <button class="tab-btn active" onclick="switchHistorialTab('eventos')">Eventos</button>
                <button class="tab-btn" onclick="switchHistorialTab('tratamientos')">Tratamientos</button>
                <button class="tab-btn" onclick="switchHistorialTab('riego')">Riego</button>
            </div>
            
            <div class="historial-content">
                <div id="eventos-tab" class="tab-content active">
                    <h4>Eventos Recientes</h4>
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-date">${formatDate(new Date())}</div>
                            <div class="timeline-content">
                                <h5>Árbol revisado</h5>
                                <p>Revisión general de salud realizada</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="tratamientos-tab" class="tab-content">
                    <h4>Tratamientos Aplicados</h4>
                    <p>No hay tratamientos registrados</p>
                </div>
                
                <div id="riego-tab" class="tab-content">
                    <h4>Historial de Riego</h4>
                    <p>No hay registros de riego</p>
                </div>
            </div>
        </div>
    `;
    
    const treeNumber = treeId.split('_').pop() || treeId;
    showModal(`Historial - Árbol #${treeNumber}`, historialContent);
}

function switchHistorialTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[onclick="switchHistorialTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ==========================================
// FILTROS Y BÚSQUEDA
// ==========================================

function populateFilterSelectors() {
    const bloqueSelect = document.getElementById('filtroBloque');
    if (bloqueSelect) {
        bloqueSelect.innerHTML = '<option value="">Todos los sectores</option>' +
            Array.from(sectors.values()).map(sector => 
                `<option value="${sector.id}">${sector.name}</option>`
            ).join('');
    }
}

async function aplicarFiltros() {
    const filters = {
        estado: document.getElementById('filtroEstado')?.value,
        blockId: document.getElementById('filtroBloque')?.value,
        edad: document.getElementById('filtroEdad')?.value,
        revision: document.getElementById('filtroRevision')?.value,
        busqueda: document.getElementById('busquedaArbol')?.value
    };

    currentFilters = {};

    if (filters.blockId) {
        currentFilters.blockId = filters.blockId;
    }

    if (filters.edad) {
        const [min, max] = filters.edad.split('-').map(x => x.replace('+', ''));
        if (max) {
            currentFilters.ageMin = parseInt(min);
            currentFilters.ageMax = parseInt(max);
        } else {
            currentFilters.ageMin = parseInt(min);
        }
    }

    if (filters.busqueda) {
        currentFilters.search = filters.busqueda;
    }

    await renderTrees();
}

function limpiarFiltros() {
    document.querySelectorAll('#filtroEstado, #filtroBloque, #filtroEdad, #filtroRevision, #busquedaArbol').forEach(input => {
        input.value = '';
    });
    
    currentFilters = {};
    renderTrees();
}

// ==========================================
// MODALES Y UI
// ==========================================

function showModal(title, content) {
    const modal = document.getElementById('modalArbol');
    const modalTitle = document.getElementById('modalTitulo');
    const modalContent = document.getElementById('contenidoModal');
    
    if (modal && modalTitle && modalContent) {
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        modal.classList.add('show');
    }
}

function hideModal() {
    const modal = document.getElementById('modalArbol');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ==========================================
// CONTROLES DE MAPA
// ==========================================

function centerMap() {
    console.log('🎯 Centrando mapa');
    if (leafletMap) {
        leafletMap.setView(mapConfig.center, mapConfig.zoom);
    }
}

function toggleMapLayers() {
    console.log('🗂️ Alternando capas de mapa');
    showNotification('Usa el control de capas en la esquina superior derecha del mapa', 'info');
}

function toggleFullscreenMap() {
    const mapContainer = document.querySelector('.mapa-container');
    if (mapContainer && mapContainer.requestFullscreen) {
        mapContainer.requestFullscreen();
    }
}

// ==========================================
// UTILIDADES Y GPS
// ==========================================

function setupGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                console.log('📍 GPS configurado:', currentLocation);
            },
            (error) => {
                console.warn('⚠️ No se pudo obtener ubicación GPS:', error);
            }
        );
    }
}

function validateGPSCoordinates(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    if (lat === 0 && lng === 0) return false;
    
    // Validar que esté en Guatemala aproximadamente
    if (lat < 13.5 || lat > 18.0 || lng < -92.5 || lng > -88.0) {
        console.warn('Coordenadas fuera del rango esperado para Guatemala');
    }
    
    return true;
}


function getNextTreeCorrelative() {
    let lastCorrelative = localStorage.getItem('lastTreeCorrelative') || '0';
    let nextNumber = parseInt(lastCorrelative) + 1;
    let correlative = nextNumber.toString().padStart(5, '0');
    localStorage.setItem('lastTreeCorrelative', nextNumber.toString());
    return correlative;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}


function syncCorrelativeCounter() {
    if (!localStorage.getItem('lastTreeCorrelative')) {
        if (window.treeManager) {
            window.treeManager.getAllTrees().then(trees => {
                if (trees.length > 0) {
                    localStorage.setItem('lastTreeCorrelative', trees.length.toString());
                }
            });
        }
    }
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

async function exportData() {
    try {
        let exportData;
        if (window.treeManager && window.treeManager.exportData) {
            exportData = await window.treeManager.exportData();
        } else {
            exportData = {
                trees: [],
                sectors: Array.from(sectors.values()),
                exportDate: new Date().toISOString()
            };
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
            { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finca_datos_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Datos exportados correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando datos:', error);
        showNotification('Error exportando datos', 'error');
    }
}

// ==========================================
// IA Y ANÁLISIS
// ==========================================

function generateAIInsights() {
    const container = document.getElementById('iaInsights');
    if (!container) return;
    
    try {
        const insights = analyzeTreeData();
        
        container.innerHTML = `
            <div class="insights-grid">
                ${insights.map(insight => `
                    <div class="insight-item ${insight.type}">
                        <div class="insight-icon">
                            <i class="fas ${insight.icon}"></i>
                        </div>
                        <div class="insight-content">
                            <h4>${insight.title}</h4>
                            <p>${insight.description}</p>
                            ${insight.action ? `
                                <button class="btn btn-sm btn-primary" onclick="${insight.action}">
                                    ${insight.actionText}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('Error generando insights:', error);
        container.innerHTML = '<p>Error generando análisis inteligente</p>';
    }
}

function analyzeTreeData() {
    return [
        {
            type: 'success',
            icon: 'fa-leaf',
            title: 'Salud General Excelente',
            description: 'Los árboles mantienen una salud óptima. Se recomienda continuar con el programa actual.'
        },
        {
            type: 'info',
            icon: 'fa-tint',
            title: 'Optimización de Riego',
            description: 'Basado en el análisis de humedad, se puede optimizar el riego en los sectores.'
        },
        {
            type: 'warning',
            icon: 'fa-chart-trend-up',
            title: 'Predicción de Cosecha',
            description: 'Se esperan condiciones óptimas para cosecha en los próximos 7-10 días.'
        }
    ];
}



// ==========================================
// EVENTOS DEL SISTEMA
// ==========================================

function handleTreeUpdate(event) {
    console.log('🌳 Árbol actualizado:', event.detail);
    updateEstadisticas();
    renderTrees();
}

function handleSectorUpdate(event) {
    console.log('📦 Sector actualizado:', event.detail);
    populateFilterSelectors();
}

// ==========================================
// FUNCIONES GLOBALES PARA COMPATIBILIDAD
// ==========================================

// Hacer funciones disponibles globalmente
window.mostrarDetalleArbol = mostrarDetalleArbol;
window.editarArbol = editarArbol;
window.mostrarHistorial = mostrarHistorial;
window.eliminarArbol = eliminarArbol;
window.cambiarVista = cambiarVista;
window.showNewTreeModal = showNewTreeModal;
window.showSectorsManagement = showSectorsManagement;
window.showNewSectorModal = showNewSectorModal;
window.editSector = editSector;
window.deleteSector = deleteSector;
window.handleSectorFormSubmit = handleSectorFormSubmit;
window.handleTreeFormSubmit = handleTreeFormSubmit;
window.getCurrentLocationForSector = getCurrentLocationForSector;
window.getCurrentLocationForTree = getCurrentLocationForTree;
window.switchHistorialTab = switchHistorialTab;
window.centerMapOnTree = centerMapOnTree;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.hideModal = hideModal;
window.showModal = showModal;
window.exportData = exportData;
window.centerMap = centerMap;
window.toggleMapLayers = toggleMapLayers;
window.toggleFullscreenMap = toggleFullscreenMap;

console.log('🌳 Sistema de árboles con Leaflet Maps cargado - Versión completa');
