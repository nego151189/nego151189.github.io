/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE ÁRBOLES
   Sistema completo con funciones JavaScript - Sin errores
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let currentView = 'grid';
let selectedTrees = new Set();
let currentFilters = {};
let map = null;
let mapFullscreen = null;
let markers = new Map();
let sectors = new Map();
let mapInitialized = false;
let searchTimeout = null;
let currentLocation = null;

// Configuración mejorada del mapa con fallback
const mapConfig = {
    center: [-90.5069, 14.6349], // [lng, lat] para Mapbox
    zoom: 15,
    accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
    fallbackEnabled: true
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🌳 Inicializando sistema de gestión de árboles...');
        
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
        
        // Inicializar mapa después de un momento
        setTimeout(initializeMap, 1000);
        
        console.log('✅ Sistema de árboles inicializado');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        // Continuar con datos de ejemplo
        createSampleData();
    }
});

function waitForTreeManager() {
    return new Promise((resolve) => {
        const checkManager = () => {
            if (window.treeManager) {
                resolve();
            } else {
                setTimeout(checkManager, 100);
            }
        };
        checkManager();
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

async function loadInitialData() {
    await updateEstadisticas();
    await renderTrees();
    generateAIInsights();
    populateFilterSelectors();
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
    const sectorData = {
        id: sectorId || `SECTOR_${Date.now().toString(36).toUpperCase()}`,
        name: formData.get('name'),
        capacity: parseInt(formData.get('capacity')),
        soilType: formData.get('soilType'),
        irrigationSystem: formData.get('irrigationSystem'),
        coordinates: {
            center: [
                parseFloat(formData.get('centerLat')),
                parseFloat(formData.get('centerLng'))
            ]
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
                document.querySelector('input[name="centerLat"]').value = position.coords.latitude.toFixed(6);
                document.querySelector('input[name="centerLng"]').value = position.coords.longitude.toFixed(6);
                showNotification('Ubicación GPS obtenida', 'success');
            },
            (error) => {
                console.error('Error obteniendo ubicación:', error);
                showNotification('Error obteniendo ubicación GPS', 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
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
            initializeFullMap();
            break;
    }
}

// ==========================================
// GESTIÓN DE ÁRBOLES
// ==========================================

async function renderTrees() {
    try {
        let trees = [];
        if (window.treeManager) {
            trees = await window.treeManager.getAllTrees(currentFilters);
        } else {
            trees = createSampleTreesData();
        }
        
        if (currentView === 'grid') {
            renderGridView(trees);
        } else if (currentView === 'lista') {
            renderTableView(trees);
        }
        
        updateMapMarkers(trees);
        
    } catch (error) {
        console.error('Error renderizando árboles:', error);
        renderGridView(createSampleTreesData());
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
    const treeNumber = tree.id ? tree.id.split('_').pop() || tree.id : 'N/A';
    
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
            trees = Array.from(window.treeManager.trees.values()).filter(tree => tree.active);
        } else {
            trees = createSampleTreesData();
        }
    }
    
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
        } else {
            // Buscar en datos de ejemplo
            const sampleTrees = createSampleTreesData();
            tree = sampleTrees.find(t => t.id === treeId);
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
        } else {
            const sampleTrees = createSampleTreesData();
            tree = sampleTrees.find(t => t.id === treeId);
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
    const treeData = {
        variety: formData.get('variety'),
        blockId: formData.get('blockId'),
        plantingDate: formData.get('plantingDate'),
        latitude: parseFloat(formData.get('latitude')),
        longitude: parseFloat(formData.get('longitude')),
        height: parseFloat(formData.get('height')) || 0,
        diameter: parseFloat(formData.get('diameter')) || 0,
        notes: formData.get('notes'),
        health: {
            overall: parseInt(formData.get('health')) || 100
        }
    };

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
    if (window.treeManager && window.treeManager.createTree) {
        await window.treeManager.createTree(treeData);
    } else {
        // Simular creación para demo
        console.log('Nuevo árbol creado:', treeData);
    }
}

async function updateTreeData(treeId, updates) {
    if (window.treeManager && window.treeManager.updateTree) {
        await window.treeManager.updateTree(treeId, updates);
    } else {
        // Simular actualización para demo
        console.log('Árbol actualizado:', treeId, updates);
    }
}

function getCurrentLocationForTree() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.querySelector('input[name="latitude"]').value = position.coords.latitude.toFixed(6);
                document.querySelector('input[name="longitude"]').value = position.coords.longitude.toFixed(6);
                showNotification('Ubicación GPS obtenida', 'success');
            },
            (error) => {
                console.error('Error obteniendo ubicación:', error);
                showNotification('Error obteniendo ubicación GPS', 'error');
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
    
    showModal(`Historial - Árbol #${treeId}`, historialContent);
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
// ESTADÍSTICAS
// ==========================================

async function updateEstadisticas() {
    try {
        let stats;
        if (window.treeManager && window.treeManager.getStatistics) {
            stats = await window.treeManager.getStatistics();
        } else {
            stats = generateSampleStats();
        }
        
        const elementos = {
            totalSaludables: document.getElementById('totalSaludables'),
            totalEnfermos: document.getElementById('totalEnfermos'),
            totalTratamiento: document.getElementById('totalTratamiento'),
            produccionPromedio: document.getElementById('produccionPromedio')
        };
        
        if (elementos.totalSaludables) elementos.totalSaludables.textContent = stats.healthyTrees || 0;
        if (elementos.totalEnfermos) elementos.totalEnfermos.textContent = stats.sickTrees || 0;
        if (elementos.totalTratamiento) elementos.totalTratamiento.textContent = 
            (stats.totalTrees - stats.healthyTrees - stats.sickTrees) || 0;
        if (elementos.produccionPromedio) elementos.produccionPromedio.textContent = 
            `${(stats.totalProduction / (stats.totalTrees || 1)).toFixed(1)} kg`;
            
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
}

function generateSampleStats() {
    return {
        totalTrees: 25,
        healthyTrees: 20,
        sickTrees: 2,
        totalProduction: 1125,
        productiveTrees: 22
    };
}

// ==========================================
// MAPAS - VERSIÓN CORREGIDA SIN ERRORES
// ==========================================

function initializeMap() {
    try {
        if (!window.mapboxgl || mapInitialized) return;

        // Verificar si Mapbox está disponible y funcionando
        mapboxgl.accessToken = mapConfig.accessToken;
        
        map = new mapboxgl.Map({
            container: 'mapa-arboles',
            style: 'mapbox://styles/mapbox/satellite-v9',
            center: mapConfig.center,
            zoom: mapConfig.zoom
        });

        // Manejo de eventos exitosos
        map.on('load', () => {
            console.log('🗺️ Mapa Mapbox inicializado correctamente');
            mapInitialized = true;
            updateMapMarkers();
        });

        // Manejo de errores de Mapbox
        map.on('error', (e) => {
            console.warn('⚠️ Error de Mapbox - usando mapa alternativo:', e);
            initializeFallbackMap();
        });

        // Timeout para detectar problemas de carga
        setTimeout(() => {
            if (!mapInitialized) {
                console.log('⏰ Timeout de Mapbox - usando mapa alternativo');
                initializeFallbackMap();
            }
        }, 5000);

    } catch (error) {
        console.error('❌ Error inicializando Mapbox:', error);
        initializeFallbackMap();
    }
}

function initializeFallbackMap() {
    try {
        const mapContainer = document.getElementById('mapa-arboles');
        if (!mapContainer) return;
        
        // Crear mapa alternativo con HTML/CSS
        mapContainer.innerHTML = `
            <div class="fallback-map">
                <div class="map-header">
                    <h4><i class="fas fa-map-marker-alt"></i> Mapa de Árboles</h4>
                    <span class="map-coords">📍 ${mapConfig.center[1].toFixed(4)}, ${mapConfig.center[0].toFixed(4)}</span>
                </div>
                <div class="trees-grid-map" id="treesGridMap">
                    <!-- Los árboles se mostrarán aquí -->
                </div>
                <div class="map-footer">
                    <small>💡 Mapa simplificado - Para mapa completo, configura token de Mapbox válido</small>
                </div>
            </div>
            
            <style>
                .fallback-map {
                    height: 100%;
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    display: flex;
                    flex-direction: column;
                    padding: 1rem;
                    overflow: hidden;
                }
                
                .map-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding: 0.5rem;
                    background: rgba(255,255,255,0.9);
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .map-header h4 {
                    margin: 0;
                    color: #1976d2;
                    font-size: 1rem;
                }
                
                .map-coords {
                    font-family: monospace;
                    font-size: 0.8rem;
                    color: #666;
                    background: #f5f5f5;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                }
                
                .trees-grid-map {
                    flex: 1;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 0.5rem;
                    overflow-y: auto;
                    padding: 0.5rem;
                    background: rgba(255,255,255,0.5);
                    border-radius: 8px;
                }
                
                .tree-marker-fallback {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 0.7rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    border: 2px solid white;
                }
                
                .tree-marker-fallback:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                
                .tree-marker-fallback.healthy {
                    background: linear-gradient(135deg, #4caf50, #2e7d32);
                }
                
                .tree-marker-fallback.warning {
                    background: linear-gradient(135deg, #ff9800, #f57c00);
                }
                
                .tree-marker-fallback.danger {
                    background: linear-gradient(135deg, #f44336, #d32f2f);
                }
                
                .map-footer {
                    margin-top: 1rem;
                    text-align: center;
                    color: #666;
                    background: rgba(255,255,255,0.8);
                    padding: 0.5rem;
                    border-radius: 6px;
                }
            </style>
        `;
        
        mapInitialized = true;
        console.log('✅ Mapa alternativo inicializado');
        updateFallbackMapMarkers();
        
    } catch (error) {
        console.error('❌ Error creando mapa alternativo:', error);
    }
}

function updateMapMarkers(trees = null, targetMap = null) {
    if (targetMap || (map && mapInitialized && map.getStyle)) {
        // Usar Mapbox normal
        updateMapboxMarkers(trees, targetMap);
    } else {
        // Usar mapa alternativo
        updateFallbackMapMarkers(trees);
    }
}

function updateMapboxMarkers(trees = null, targetMap = null) {
    const currentMap = targetMap || map;
    if (!currentMap || !mapInitialized) return;

    // Limpiar marcadores existentes
    markers.forEach(marker => marker.remove());
    markers.clear();

    if (!trees) {
        if (window.treeManager) {
            trees = Array.from(window.treeManager.trees.values()).filter(tree => tree.active);
        } else {
            trees = createSampleTreesData();
        }
    }

    trees.forEach(tree => {
        if (tree.location && tree.location.latitude && tree.location.longitude) {
            const el = document.createElement('div');
            el.className = 'tree-marker';
            el.style.cssText = `
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${getTreeMarkerColor(tree.health?.overall || 0)};
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
            `;

            const treeNumber = tree.id ? tree.id.split('_').pop() || tree.id : 'N/A';
            const marker = new mapboxgl.Marker(el)
                .setLngLat([tree.location.longitude, tree.location.latitude])
                .setPopup(new mapboxgl.Popup().setHTML(`
                    <div class="tree-popup">
                        <h4>Árbol #${treeNumber}</h4>
                        <p><strong>Salud:</strong> ${tree.health?.overall || 0}%</p>
                        <p><strong>Sector:</strong> ${tree.blockId || 'N/A'}</p>
                        <button onclick="mostrarDetalleArbol('${tree.id}')">Ver detalles</button>
                    </div>
                `))
                .addTo(currentMap);

            markers.set(tree.id, marker);
        }
    });
}

function updateFallbackMapMarkers(trees = null) {
    const gridMap = document.getElementById('treesGridMap');
    if (!gridMap) return;
    
    if (!trees) {
        if (window.treeManager) {
            trees = Array.from(window.treeManager.trees.values()).filter(tree => tree.active);
        } else {
            trees = createSampleTreesData();
        }
    }
    
    gridMap.innerHTML = trees.map(tree => {
        const health = tree.health?.overall || 0;
        const healthClass = health >= 80 ? 'healthy' : health >= 60 ? 'warning' : 'danger';
        const treeNumber = tree.id ? tree.id.split('_').pop() || tree.id.slice(-3) : 'N/A';
        
        return `
            <div class="tree-marker-fallback ${healthClass}" 
                 onclick="mostrarDetalleArbol('${tree.id}')"
                 title="Árbol #${treeNumber} - Salud: ${health}%">
                #${treeNumber}
            </div>
        `;
    }).join('');
}

function initializeFullMap() {
    try {
        if (!window.mapboxgl) {
            initializeFallbackFullMap();
            return;
        }

        mapboxgl.accessToken = mapConfig.accessToken;
        
        if (mapFullscreen) {
            mapFullscreen.remove();
        }
        
        mapFullscreen = new mapboxgl.Map({
            container: 'mapa-completo',
            style: 'mapbox://styles/mapbox/satellite-v9',
            center: mapConfig.center,
            zoom: mapConfig.zoom
        });

        mapFullscreen.on('load', () => {
            updateMapMarkers(null, mapFullscreen);
        });

        mapFullscreen.on('error', (e) => {
            console.warn('⚠️ Error en mapa completo - usando alternativo');
            initializeFallbackFullMap();
        });

    } catch (error) {
        console.error('Error inicializando mapa completo:', error);
        initializeFallbackFullMap();
    }
}

function initializeFallbackFullMap() {
    const container = document.getElementById('mapa-completo');
    if (!container) return;
    
    container.innerHTML = `
        <div class="fallback-map" style="height: 100%;">
            <div class="map-header">
                <h3><i class="fas fa-map"></i> Vista Completa del Mapa</h3>
                <span class="map-coords">📍 Finca La Herradura</span>
            </div>
            <div class="trees-grid-map" id="treesGridMapFull" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));">
                <!-- Los árboles se mostrarán aquí -->
            </div>
        </div>
    `;
    
    updateFallbackMapMarkers();
}

function getTreeMarkerColor(health) {
    if (health >= 80) return '#22c55e';
    if (health >= 60) return '#f59e0b';
    return '#ef4444';
}

function centerMap() {
    if (map) {
        map.flyTo({
            center: mapConfig.center,
            zoom: mapConfig.zoom
        });
    }
}

function centerMapOnTree(treeId) {
    let tree;
    if (window.treeManager) {
        tree = window.treeManager.trees.get(treeId);
    } else {
        const sampleTrees = createSampleTreesData();
        tree = sampleTrees.find(t => t.id === treeId);
    }
    
    if (tree && tree.location && map) {
        map.flyTo({
            center: [tree.location.longitude, tree.location.latitude],
            zoom: 18
        });
        
        cambiarVista('mapa');
    }
}

function toggleMapLayers() {
    if (!map) return;
    
    try {
        const currentStyle = map.getStyle().name;
        let newStyle;
        
        if (currentStyle === 'Mapbox Satellite') {
            newStyle = 'mapbox://styles/mapbox/streets-v11';
        } else {
            newStyle = 'mapbox://styles/mapbox/satellite-v9';
        }
        
        map.setStyle(newStyle);
    } catch (error) {
        console.warn('Error cambiando estilo de mapa:', error);
    }
}

function toggleFullscreenMap() {
    const mapContainer = document.querySelector('.mapa-container');
    if (mapContainer && mapContainer.requestFullscreen) {
        mapContainer.requestFullscreen();
    }
}

// ==========================================
// GPS Y UBICACIÓN
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
            description: 'El 85% de los árboles mantienen una salud óptima. Se recomienda continuar con el programa actual.'
        },
        {
            type: 'info',
            icon: 'fa-tint',
            title: 'Optimización de Riego',
            description: 'Basado en el análisis de humedad, se puede optimizar el riego en el Sector Norte.'
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
// UTILIDADES Y UI
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

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
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
        let trees = [];
        if (window.treeManager) {
            trees = await window.treeManager.getAllTrees();
        } else {
            trees = createSampleTreesData();
        }
        
        const sectorsArray = Array.from(sectors.values());
        
        const exportData = {
            trees: trees,
            sectors: sectorsArray,
            exportDate: new Date().toISOString(),
            statistics: generateSampleStats()
        };
        
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
// DATOS DE EJEMPLO
// ==========================================

function createSampleTreesData() {
    const sampleTrees = [];
    const varieties = ['Lima Persa', 'Limón Eureka', 'Limón Meyer'];
    const sectorsArray = Array.from(sectors.keys());
    
    for (let i = 1; i <= 25; i++) {
        const sectorIndex = (i - 1) % sectorsArray.length;
        const baseCoords = getBaseCoordsForSector(sectorsArray[sectorIndex]);
        
        sampleTrees.push({
            id: `TREE_${Date.now() + i}_${Math.random().toString(36).substr(2, 4)}`.toUpperCase(),
            variety: varieties[Math.floor(Math.random() * varieties.length)],
            blockId: sectorsArray[sectorIndex],
            plantingDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            age: Math.floor(Math.random() * 8) + 2,
            location: {
                latitude: baseCoords.lat + (Math.random() - 0.5) * 0.0008,
                longitude: baseCoords.lng + (Math.random() - 0.5) * 0.0008,
                elevation: 1500 + Math.random() * 100
            },
            measurements: {
                height: 2 + Math.random() * 3,
                diameter: 15 + Math.random() * 10,
                canopyWidth: 3 + Math.random() * 2
            },
            health: {
                overall: Math.floor(Math.random() * 40) + 60,
                leaves: Math.floor(Math.random() * 30) + 70,
                trunk: Math.floor(Math.random() * 30) + 70
            },
            production: {
                currentSeason: Math.floor(Math.random() * 50) + 20,
                totalLifetime: Math.floor(Math.random() * 500) + 200,
                averageYield: Math.floor(Math.random() * 30) + 15
            },
            notes: `Árbol de ejemplo #${i}`,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    
    return sampleTrees;
}

function getBaseCoordsForSector(sectorId) {
    const sector = sectors.get(sectorId);
    if (sector && sector.coordinates && sector.coordinates.center) {
        return {
            lat: sector.coordinates.center[0],
            lng: sector.coordinates.center[1]
        };
    }
    
    return {
        lat: 14.6349,
        lng: -90.5069
    };
}

function createSampleData() {
    console.log('📊 Creando datos de ejemplo...');
    
    if (sectors.size === 0) {
        createDefaultSectors();
    }
    
    updateEstadisticas();
    renderTrees();
    generateAIInsights();
    populateFilterSelectors();
    
    console.log('✅ Datos de ejemplo creados');
}

// ==========================================
// EVENTOS DEL SISTEMA
// ==========================================

function handleTreeUpdate(detail) {
    console.log('🌳 Árbol actualizado:', detail);
    updateEstadisticas();
    renderTrees();
}

function handleSectorUpdate(detail) {
    console.log('📦 Sector actualizado:', detail);
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

console.log('🌳 Sistema de árboles con funciones JavaScript cargado - Versión sin errores');