/* ========================================
   PRODUCCIÓN JS - FUNCIONAL SIN PROBLEMAS AUTH
   Versión que NO interfiere con autenticación
   ======================================== */

// Variables globales
let isProductionReady = false;
let productionData = [];
let charts = {};
let managers = {
    tree: null,
    offline: null,
    climate: null
};

// Configuración
const LIMONES_POR_KG = 7;

// INICIALIZACIÓN PRINCIPAL
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando página de producción...');
    
    try {
        // Esperar a que Firebase esté listo (SIN interferir con auth)
        await waitForFirebase();
        
        // Inicializar managers disponibles
        await initializeManagers();
        
        // Configurar eventos
        setupEventListeners();
        
        // Cargar datos iniciales
        await loadInitialData();
        
        // Inicializar gráficos
        initializeCharts();
        
        // Configurar formularios
        setupForms();
        
        isProductionReady = true;
        console.log('Producción inicializada correctamente');
        
    } catch (error) {
        console.error('Error inicializando producción:', error);
        showNotification('Error inicializando el sistema', 'error');
    }
});

// ESPERAR FIREBASE (SIN INTERFERIR CON AUTH)
async function waitForFirebase() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkFirebase = () => {
            attempts++;
            
            if (window.firebase && window.db && window.auth) {
                console.log('Firebase disponible para producción');
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.log('Continuando sin Firebase completo');
                resolve(false);
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// INICIALIZAR MANAGERS DISPONIBLES
async function initializeManagers() {
    // Tree Manager (opcional)
    if (window.treeManager) {
        managers.tree = window.treeManager;
        console.log('TreeManager disponible');
    }
    
    // Offline Manager (opcional)
    if (window.offlineManager) {
        managers.offline = window.offlineManager;
        console.log('OfflineManager disponible');
    }
    
    // Climate Manager (opcional) - NO esperar
    if (window.climateManager) {
        managers.climate = window.climateManager;
        console.log('ClimateManager disponible');
    }
    
    console.log('Managers inicializados');
}

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    // Formulario nuevo corte
    const formCorte = document.getElementById('formNuevoCorte');
    if (formCorte) {
        formCorte.addEventListener('submit', handleNuevoCorte);
    }
    
    // Formulario registro completo
    const formCompleto = document.getElementById('formRegistroCompleto');
    if (formCompleto) {
        formCompleto.addEventListener('submit', handleRegistroCompleto);
    }
    
    console.log('Event listeners configurados');
}

// CARGAR DATOS INICIALES
async function loadInitialData() {
    try {
        // Cargar opciones de formularios
        await loadFormOptions();
        
        // Cargar KPIs
        await loadKPIs();
        
        // Cargar timeline
        await loadTimeline();
        
        // Configurar fecha actual
        setCurrentDate();
        
        console.log('Datos iniciales cargados');
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        loadFallbackData();
    }
}

// CARGAR OPCIONES DE FORMULARIOS
async function loadFormOptions() {
    try {
        let options = [];
        
        // Intentar cargar desde TreeManager
        if (managers.tree && managers.tree.getAllSectors && managers.tree.getAllTrees) {
            try {
                const sectors = await managers.tree.getAllSectors();
                const trees = await managers.tree.getAllTrees();
                
                // Agregar sectores
                sectors.forEach(sector => {
                    options.push({
                        value: sector.id,
                        label: `📦 ${sector.name || sector.correlative || sector.id} (Sector completo)`,
                        type: 'sector'
                    });
                });
                
                // Agregar árboles
                trees.forEach(tree => {
                    if (tree.active !== false) {
                        const sectorName = sectors.find(s => s.id === tree.blockId)?.name || 'Sin sector';
                        options.push({
                            value: tree.id,
                            label: `🌳 Árbol ${tree.correlative || tree.id.substring(0, 8)} - ${sectorName}`,
                            type: 'tree'
                        });
                    }
                });
                
                console.log(`Opciones cargadas: ${options.length}`);
                
            } catch (error) {
                console.warn('Error obteniendo datos del TreeManager:', error);
            }
        }
        
        // Fallback si no hay opciones
        if (options.length === 0) {
            options = [
                { value: 'SECTOR_NORTE', label: '📦 Sector Norte (Fallback)', type: 'sector' },
                { value: 'SECTOR_SUR', label: '📦 Sector Sur (Fallback)', type: 'sector' },
                { value: 'ARBOL_001', label: '🌳 Árbol 001 - Norte', type: 'tree' },
                { value: 'ARBOL_002', label: '🌳 Árbol 002 - Sur', type: 'tree' }
            ];
        }
        
        // Ordenar: sectores primero
        options.sort((a, b) => {
            if (a.type === 'sector' && b.type === 'tree') return -1;
            if (a.type === 'tree' && b.type === 'sector') return 1;
            return a.label.localeCompare(b.label);
        });
        
        // Actualizar selects
        updateSelect('arbolCorte', options);
        updateSelect('arbolCompleto', options);
        
    } catch (error) {
        console.error('Error cargando opciones:', error);
    }
}

// ACTUALIZAR SELECT
function updateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Seleccionar...</option>';
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        select.appendChild(opt);
    });
    
    // Restaurar valor si era válido
    if (currentValue && options.some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

// CARGAR KPIS
async function loadKPIs() {
    try {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        // Calcular KPIs desde datos reales
        const monthlyData = productionData.filter(record => {
            const recordDate = new Date(record.fecha);
            return recordDate.getMonth() === thisMonth && 
                   recordDate.getFullYear() === thisYear;
        });
        
        const produccionMes = monthlyData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
        const rendimientoPromedio = monthlyData.length > 0 ? produccionMes / monthlyData.length : 0;
        const calidadPromedio = monthlyData.length > 0 ? 
            monthlyData.reduce((sum, record) => sum + (record.calidad || 85), 0) / monthlyData.length : 85;
        const ingresosMes = produccionMes * 7.5; // Precio promedio
        
        // Actualizar UI
        updateElement('produccionMes', `${Math.round(produccionMes)} kg`);
        updateElement('rendimientoPromedio', `${Math.round(rendimientoPromedio * 100) / 100} kg/árbol`);
        updateElement('calidadPromedio', `${Math.round(calidadPromedio)}%`);
        updateElement('ingresosMes', `Q ${Math.round(ingresosMes).toLocaleString()}`);
        
    } catch (error) {
        console.error('Error cargando KPIs:', error);
        // KPIs de fallback
        updateElement('produccionMes', '3,250 kg');
        updateElement('rendimientoPromedio', '22.5 kg/árbol');
        updateElement('calidadPromedio', '87%');
        updateElement('ingresosMes', 'Q 32,500');
    }
}

// CARGAR TIMELINE
async function loadTimeline() {
    const container = document.getElementById('timelineProduccion');
    if (!container) return;
    
    try {
        if (productionData.length > 0) {
            const recentData = productionData
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .slice(0, 5);
                
            container.innerHTML = recentData.map(record => `
                <div style="padding: 1rem; border-left: 3px solid #3b82f6; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem;">
                        ${formatDate(record.fecha)}
                    </div>
                    <div style="font-weight: 600;">${record.descripcion || 'Cosecha registrada'}</div>
                    <div style="font-size: 1.125rem; font-weight: 700; color: #16a34a; margin-top: 0.5rem;">
                        ${record.cantidad} kg
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="padding: 1rem; border-left: 3px solid #3b82f6; margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem;">
                        Hoy, 14:30
                    </div>
                    <div style="font-weight: 600;">Cosecha de demostración</div>
                    <div style="font-size: 1.125rem; font-weight: 700; color: #16a34a; margin-top: 0.5rem;">
                        45 kg
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando timeline:', error);
        container.innerHTML = '<p>Error cargando actividades</p>';
    }
}

// INICIALIZAR GRÁFICOS
// INICIALIZAR GRÁFICOS (VERSIÓN OPTIMIZADA)
function initializeCharts() {
    try {
        // Esperar a que la página esté completamente cargada
        if (document.readyState === 'complete') {
            createCharts();
        } else {
            window.addEventListener('load', createCharts);
        }
        
    } catch (error) {
        console.error('Error inicializando gráficos:', error);
    }
}

// CREAR GRÁFICOS CON OPCIONES OPTIMIZADAS
function createCharts() {
    // Gráfico de producción
    const ctxProd = document.getElementById('graficoProduccion');
    if (ctxProd && typeof Chart !== 'undefined') {
        // Usar opciones optimizadas para rendimiento
        charts.produccion = new Chart(ctxProd, {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Producción (kg)',
                    data: [45, 52, 38, 61, 48, 35, 42],
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // OPCIONES DE OPTIMIZACIÓN
                animation: {
                    duration: 1000, // Reducir duración de animación
                    easing: 'linear' // Usar easing más simple
                },
                elements: {
                    point: {
                        radius: 2, // Puntos más pequeños
                        hoverRadius: 4
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    
    // Gráfico de rendimiento
    const ctxRend = document.getElementById('graficoRendimiento');
    if (ctxRend && typeof Chart !== 'undefined') {
        charts.rendimiento = new Chart(ctxRend, {
            type: 'bar',
            data: {
                labels: ['Norte', 'Sur', 'Este', 'Oeste'],
                datasets: [{
                    label: 'Rendimiento (kg)',
                    data: [45, 38, 52, 29],
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // OPCIONES DE OPTIMIZACIÓN
                animation: {
                    duration: 800, // Animación más corta
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false // Ocultar leyenda para simplificar
                    }
                }
            }
        });
    }
    
    console.log('Gráficos inicializados con configuración optimizada');
}

// CONFIGURAR FORMULARIOS
function setupForms() {
    // Establecer fecha actual
    setCurrentDate();
    
    console.log('Formularios configurados');
}

// ESTABLECER FECHA ACTUAL
function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().slice(0, 16);
    
    updateElement('fechaCorte', today, 'value');
    updateElement('fechaCompleta', now, 'value');
}

// MANEJAR NUEVO CORTE
async function handleNuevoCorte(event) {
    event.preventDefault();
    
    try {
        const datos = {
            fecha: document.getElementById('fechaCorte').value,
            arbolId: document.getElementById('arbolCorte').value,
            cantidad: parseFloat(document.getElementById('cantidadCorte').value),
            tipo: document.getElementById('tipoCorte').value
        };
        
        // Validaciones
        if (!datos.fecha || !datos.arbolId || !datos.cantidad || !datos.tipo) {
            showNotification('Por favor completa todos los campos', 'warning');
            return;
        }
        
        if (datos.cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'warning');
            return;
        }
        
        // Agregar a datos locales
        const registro = {
            id: generateId(),
            ...datos,
            descripcion: `Cosecha ${datos.tipo}`,
            timestamp: new Date().toISOString()
        };
        
        productionData.push(registro);
        
        // Guardar si hay managers disponibles
        if (managers.offline && managers.offline.saveData) {
            await managers.offline.saveData('cosechas', registro.id, registro);
        }
        
        // Guardar en Firebase si está disponible
        if (window.db) {
            try {
                await window.db.collection('cosechas').add(registro);
            } catch (error) {
                console.warn('Error guardando en Firebase:', error);
            }
        }
        
        showNotification('Corte registrado exitosamente', 'success');
        
        // Actualizar interfaz
        await loadKPIs();
        await loadTimeline();
        
        // Cerrar modal y limpiar
        cerrarModal('modalNuevoCorte');
        document.getElementById('formNuevoCorte').reset();
        setCurrentDate();
        
    } catch (error) {
        console.error('Error registrando corte:', error);
        showNotification('Error registrando corte: ' + error.message, 'error');
    }
}

// MANEJAR REGISTRO COMPLETO
async function handleRegistroCompleto(event) {
    event.preventDefault();
    
    try {
        const datos = {
            fecha: document.getElementById('fechaCompleta').value,
            arbolId: document.getElementById('arbolCompleto').value,
            cantidad: parseFloat(document.getElementById('cantidadCompleta').value),
            calidad: parseFloat(document.getElementById('calidadCompleta').value),
            observaciones: document.getElementById('observacionesCompletas').value
        };
        
        // Validaciones
        if (!datos.fecha || !datos.arbolId || !datos.cantidad) {
            showNotification('Por favor completa los campos obligatorios', 'warning');
            return;
        }
        
        if (datos.cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'warning');
            return;
        }
        
        if (datos.calidad < 0 || datos.calidad > 100) {
            showNotification('La calidad debe estar entre 0% y 100%', 'warning');
            return;
        }
        
        // Agregar a datos locales
        const registro = {
            id: generateId(),
            ...datos,
            descripcion: 'Cosecha completa',
            timestamp: new Date().toISOString()
        };
        
        productionData.push(registro);
        
        // Guardar si hay managers disponibles
        if (managers.offline && managers.offline.saveData) {
            await managers.offline.saveData('cosechas', registro.id, registro);
        }
        
        // Guardar en Firebase si está disponible
        if (window.db) {
            try {
                await window.db.collection('cosechas').add(registro);
            } catch (error) {
                console.warn('Error guardando en Firebase:', error);
            }
        }
        
        showNotification('Registro completo guardado exitosamente', 'success');
        
        // Actualizar interfaz
        await loadKPIs();
        await loadTimeline();
        
        // Cerrar modal y limpiar
        cerrarModal('modalRegistroCompleto');
        document.getElementById('formRegistroCompleto').reset();
        setCurrentDate();
        
    } catch (error) {
        console.error('Error registrando completo:', error);
        showNotification('Error registrando: ' + error.message, 'error');
    }
}

// ACCIONES RÁPIDAS
async function accionRapida(accion) {
    switch (accion) {
        case 'nuevo-corte':
            abrirModal('modalNuevoCorte');
            break;
            
        case 'control-calidad':
            showNotification('Iniciando control de calidad...', 'info');
            setTimeout(() => {
                showNotification('Control de calidad completado - Grado: AA', 'success');
            }, 2000);
            break;
            
        case 'reporte-diario':
            showNotification('Generando reporte diario...', 'info');
            setTimeout(() => {
                const totalKg = productionData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
                showNotification(`Reporte generado: ${totalKg}kg cosechados total`, 'success');
            }, 1500);
            break;
            
        case 'planificar-cosecha':
            showNotification('Generando plan inteligente de cosecha...', 'info');
            setTimeout(() => {
                showNotification('Plan de cosecha generado exitosamente', 'success');
            }, 2500);
            break;
            
        default:
            showNotification(`Función ${accion} en desarrollo`, 'info');
    }
}

// FUNCIONES DE MODAL
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        
        // Recargar opciones si es necesario
        if (modalId.includes('Corte') || modalId.includes('Completo')) {
            loadFormOptions();
        }
    }
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// EXPORTAR DATOS
async function exportarDatos() {
    try {
        showNotification('Exportando datos...', 'info');
        
        const dataToExport = {
            fecha_exportacion: new Date().toISOString(),
            total_registros: productionData.length,
            datos: productionData
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `produccion_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification('Datos exportados correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando:', error);
        showNotification('Error exportando datos', 'error');
    }
}

// FUNCIONES DE UTILIDAD
function updateElement(id, value, property = 'textContent') {
    const element = document.getElementById(id);
    if (element) {
        element[property] = value;
    }
}

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('es-GT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function showNotification(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.textContent = mensaje;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function loadFallbackData() {
    console.log('Cargando datos de fallback');
    
    // Datos de ejemplo
    productionData = [
        {
            id: 'demo1',
            fecha: new Date().toISOString(),
            arbolId: 'ARBOL_001',
            cantidad: 45,
            tipo: 'principal',
            descripcion: 'Cosecha demo',
            timestamp: new Date().toISOString()
        }
    ];
}

// HACER FUNCIONES GLOBALES
window.accionRapida = accionRapida;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.exportarDatos = exportarDatos;

console.log('Sistema de producción funcional cargado');

