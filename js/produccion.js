/* ========================================
   PRODUCCIÓN JS - SIN CHART.JS - SOLO DATOS REALES
   Versión que elimina Chart.js para evitar RAF issues
   ======================================== */

// Variables globales
let isProductionReady = false;
let productionData = [];
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
        
        // Cargar datos REALES únicamente
        await loadRealDataOnly();
        
        // Configurar formularios
        setupForms();
        
        // Crear gráficos CSS (sin Chart.js)
        setTimeout(() => createCSSCharts(), 1000);
        
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
    if (window.treeManager) {
        managers.tree = window.treeManager;
        console.log('TreeManager disponible');
    }
    
    if (window.offlineManager) {
        managers.offline = window.offlineManager;
        console.log('OfflineManager disponible');
    }
    
    if (window.climateManager) {
        managers.climate = window.climateManager;
        console.log('ClimateManager disponible');
    }
    
    console.log('Managers inicializados');
}

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    const formCorte = document.getElementById('formNuevoCorte');
    if (formCorte) {
        formCorte.addEventListener('submit', handleNuevoCorte);
    }
    
    const formCompleto = document.getElementById('formRegistroCompleto');
    if (formCompleto) {
        formCompleto.addEventListener('submit', handleRegistroCompleto);
    }
    
    console.log('Event listeners configurados');
}

// CARGAR SOLO DATOS REALES
async function loadRealDataOnly() {
    try {
        await loadProductionDataFromFirebase();
        await loadFormOptionsFromDatabase();
        await loadRealKPIs();
        await loadRealTimeline();
        setCurrentDate();
        
        console.log('Datos REALES cargados exitosamente');
        
    } catch (error) {
        console.error('Error cargando datos reales:', error);
        showEmptyStates();
    }
}

// CARGAR DATOS DE PRODUCCIÓN DESDE FIREBASE
async function loadProductionDataFromFirebase() {
    if (!window.db) {
        console.log('Firebase no disponible, sin datos de producción');
        productionData = [];
        return;
    }
    
    try {
        const snapshot = await window.db.collection('cosechas')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        productionData = [];
        snapshot.forEach(doc => {
            productionData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Datos de producción cargados: ${productionData.length} registros`);
        
    } catch (error) {
        console.error('Error cargando datos de Firebase:', error);
        productionData = [];
    }
}

// CARGAR OPCIONES DE FORMULARIOS DESDE BASE DE DATOS
async function loadFormOptionsFromDatabase() {
    try {
        let options = [];
        
        if (managers.tree && managers.tree.getAllSectors && managers.tree.getAllTrees) {
            try {
                const sectors = await managers.tree.getAllSectors();
                const trees = await managers.tree.getAllTrees();
                
                sectors.forEach(sector => {
                    options.push({
                        value: sector.id,
                        label: `📦 ${sector.name || sector.correlative || sector.id} (Sector completo)`,
                        type: 'sector'
                    });
                });
                
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
                
                console.log(`Opciones reales cargadas: ${options.length}`);
                
            } catch (error) {
                console.warn('Error obteniendo datos del TreeManager:', error);
            }
        }
        
        if (options.length === 0) {
            console.log('No hay opciones disponibles desde la base de datos');
            showEmptyFormOptions();
            return;
        }
        
        options.sort((a, b) => {
            if (a.type === 'sector' && b.type === 'tree') return -1;
            if (a.type === 'tree' && b.type === 'sector') return 1;
            return a.label.localeCompare(b.label);
        });
        
        updateSelect('arbolCorte', options);
        updateSelect('arbolCompleto', options);
        
    } catch (error) {
        console.error('Error cargando opciones:', error);
        showEmptyFormOptions();
    }
}

// MOSTRAR ESTADO VACÍO PARA OPCIONES DE FORMULARIO
function showEmptyFormOptions() {
    const selects = ['arbolCorte', 'arbolCompleto'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">No hay árboles/sectores disponibles</option>';
            select.disabled = true;
        }
    });
}

// ACTUALIZAR SELECT
function updateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Seleccionar...</option>';
    select.disabled = false;
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        select.appendChild(opt);
    });
    
    if (currentValue && options.some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

// CARGAR KPIS REALES ÚNICAMENTE
async function loadRealKPIs() {
    try {
        if (productionData.length === 0) {
            showEmptyKPIs();
            return;
        }
        
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        const monthlyData = productionData.filter(record => {
            const recordDate = new Date(record.fecha);
            return recordDate.getMonth() === thisMonth && 
                   recordDate.getFullYear() === thisYear;
        });
        
        const produccionMes = monthlyData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
        const numRegistros = monthlyData.length;
        const rendimientoPromedio = numRegistros > 0 ? produccionMes / numRegistros : 0;
        const calidadPromedio = numRegistros > 0 ? 
            monthlyData.reduce((sum, record) => sum + (record.calidad || 0), 0) / numRegistros : 0;
        const ingresosMes = produccionMes * 7.5;
        
        updateElement('produccionMes', produccionMes > 0 ? `${Math.round(produccionMes)} kg` : '0 kg');
        updateElement('rendimientoPromedio', rendimientoPromedio > 0 ? `${Math.round(rendimientoPromedio * 100) / 100} kg/registro` : '0 kg/registro');
        updateElement('calidadPromedio', calidadPromedio > 0 ? `${Math.round(calidadPromedio)}%` : 'N/A');
        updateElement('ingresosMes', ingresosMes > 0 ? `Q ${Math.round(ingresosMes).toLocaleString()}` : 'Q 0');
        
        console.log(`KPIs calculados con ${monthlyData.length} registros del mes`);
        
    } catch (error) {
        console.error('Error cargando KPIs:', error);
        showEmptyKPIs();
    }
}

// MOSTRAR KPIS VACÍOS
function showEmptyKPIs() {
    updateElement('produccionMes', '0 kg');
    updateElement('rendimientoPromedio', '0 kg/registro');
    updateElement('calidadPromedio', 'N/A');
    updateElement('ingresosMes', 'Q 0');
}

// CARGAR TIMELINE REAL ÚNICAMENTE
async function loadRealTimeline() {
    const container = document.getElementById('timelineProduccion');
    if (!container) return;
    
    try {
        if (productionData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-seedling" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>No hay registros de producción aún</p>
                    <p style="font-size: 0.875rem;">Los registros aparecerán aquí cuando registres tu primera cosecha</p>
                </div>
            `;
            return;
        }
        
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
                ${record.calidad ? `<div style="font-size: 0.875rem; color: #6b7280;">Calidad: ${record.calidad}%</div>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando timeline:', error);
        container.innerHTML = '<p style="color: #dc2626;">Error cargando actividades</p>';
    }
}

// MOSTRAR ESTADOS VACÍOS
function showEmptyStates() {
    console.log('Mostrando estados vacíos - sin datos ficticios');
    showEmptyKPIs();
    
    const container = document.getElementById('timelineProduccion');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                <p>Sin conexión a la base de datos</p>
                <p style="font-size: 0.875rem;">Verifica tu conexión e intenta recargar la página</p>
            </div>
        `;
    }
}

// CREAR GRÁFICOS CSS (SIN CHART.JS)
function createCSSCharts() {
    try {
        createProductionChart();
        createPerformanceChart();
        console.log('Gráficos CSS creados exitosamente');
    } catch (error) {
        console.error('Error creando gráficos CSS:', error);
        showEmptyCharts();
    }
}

// CREAR GRÁFICO DE PRODUCCIÓN CON CSS
function createProductionChart() {
    const container = document.getElementById('graficoProduccion');
    if (!container) return;
    
    const parent = container.parentElement;
    if (!parent) return;
    
    if (productionData.length === 0) {
        parent.innerHTML = `
            <h3>Evolución de la Producción</h3>
            <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #6b7280; text-align: center;">
                <div>
                    <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>Sin datos para mostrar</p>
                    <p style="font-size: 0.875rem;">Registra tu primera cosecha para ver gráficos</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Preparar datos de los últimos 7 días
    const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date;
    }).reverse();
    
    const chartData = last7Days.map(date => {
        const dayData = productionData.filter(record => {
            const recordDate = new Date(record.fecha);
            return recordDate.toDateString() === date.toDateString();
        });
        
        const totalKg = dayData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
        
        return {
            label: date.toLocaleDateString('es-GT', { weekday: 'short' }),
            value: totalKg
        };
    });
    
    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    
    parent.innerHTML = `
        <h3>Evolución de la Producción</h3>
        <div style="height: 200px; display: flex; align-items: end; justify-content: space-between; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            ${chartData.map(data => `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                    <div style="
                        background: linear-gradient(to top, #16a34a, #22c55e);
                        width: 30px;
                        height: ${(data.value / maxValue) * 150}px;
                        min-height: 2px;
                        border-radius: 4px 4px 0 0;
                        position: relative;
                        margin-bottom: 8px;
                        transition: all 0.3s ease;
                    " title="${data.value} kg">
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280; text-align: center;">
                        ${data.label}
                    </div>
                    <div style="font-size: 0.625rem; color: #16a34a; font-weight: 600; text-align: center;">
                        ${data.value}kg
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// CREAR GRÁFICO DE RENDIMIENTO CON CSS
function createPerformanceChart() {
    const container = document.getElementById('graficoRendimiento');
    if (!container) return;
    
    const parent = container.parentElement;
    if (!parent) return;
    
    if (productionData.length === 0) {
        parent.innerHTML = `
            <h3>Rendimiento por Sector</h3>
            <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #6b7280; text-align: center;">
                <div>
                    <i class="fas fa-chart-bar" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>Sin datos para mostrar</p>
                    <p style="font-size: 0.875rem;">Registra tu primera cosecha para ver gráficos</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Agrupar por sector/árbol
    const sectorData = {};
    productionData.forEach(record => {
        const key = record.arbolId || 'Sin especificar';
        if (!sectorData[key]) {
            sectorData[key] = 0;
        }
        sectorData[key] += record.cantidad || 0;
    });
    
    const chartData = Object.entries(sectorData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .map(([key, value]) => ({
            label: key.length > 12 ? key.substring(0, 12) + '...' : key,
            value: value
        }));
    
    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    
    parent.innerHTML = `
        <h3>Rendimiento por Sector</h3>
        <div style="height: 200px; display: flex; align-items: end; justify-content: space-between; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            ${chartData.map((data, index) => `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1; margin: 0 4px;">
                    <div style="
                        background: linear-gradient(to top, #3b82f6, #60a5fa);
                        width: 40px;
                        height: ${(data.value / maxValue) * 150}px;
                        min-height: 5px;
                        border-radius: 4px 4px 0 0;
                        margin-bottom: 8px;
                        transition: all 0.3s ease;
                    " title="${data.value} kg">
                    </div>
                    <div style="font-size: 0.625rem; color: #6b7280; text-align: center; writing-mode: vertical-rl; text-orientation: mixed;">
                        ${data.label}
                    </div>
                    <div style="font-size: 0.625rem; color: #3b82f6; font-weight: 600; text-align: center; margin-top: 4px;">
                        ${Math.round(data.value)}kg
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// MOSTRAR GRÁFICOS VACÍOS
function showEmptyCharts() {
    const containers = ['graficoProduccion', 'graficoRendimiento'];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const parent = container.parentElement;
            if (parent) {
                parent.innerHTML = `
                    <h3>${containerId === 'graficoProduccion' ? 'Evolución de la Producción' : 'Rendimiento por Sector'}</h3>
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #6b7280; text-align: center;">
                        <div>
                            <i class="fas fa-chart-${containerId === 'graficoProduccion' ? 'line' : 'bar'}" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                            <p>Sin datos para mostrar</p>
                            <p style="font-size: 0.875rem;">Registra tu primera cosecha para ver gráficos</p>
                        </div>
                    </div>
                `;
            }
        }
    });
}

// CONFIGURAR FORMULARIOS
function setupForms() {
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
        
        if (!datos.fecha || !datos.arbolId || !datos.cantidad || !datos.tipo) {
            showNotification('Por favor completa todos los campos', 'warning');
            return;
        }
        
        if (datos.cantidad <= 0) {
            showNotification('La cantidad debe ser mayor a 0', 'warning');
            return;
        }
        
        const registro = {
            id: generateId(),
            ...datos,
            descripcion: `Cosecha ${datos.tipo}`,
            timestamp: new Date().toISOString()
        };
        
        productionData.unshift(registro);
        
        if (managers.offline && managers.offline.saveData) {
            await managers.offline.saveData('cosechas', registro.id, registro);
        }
        
        if (window.db) {
            try {
                await window.db.collection('cosechas').add(registro);
            } catch (error) {
                console.warn('Error guardando en Firebase:', error);
            }
        }
        
        showNotification('Corte registrado exitosamente', 'success');
        
        // Actualizar interfaz
        await loadRealKPIs();
        await loadRealTimeline();
        
        // Actualizar gráficos CSS
        setTimeout(() => createCSSCharts(), 100);
        
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
        
        const registro = {
            id: generateId(),
            ...datos,
            descripcion: 'Cosecha completa',
            timestamp: new Date().toISOString()
        };
        
        productionData.unshift(registro);
        
        if (managers.offline && managers.offline.saveData) {
            await managers.offline.saveData('cosechas', registro.id, registro);
        }
        
        if (window.db) {
            try {
                await window.db.collection('cosechas').add(registro);
            } catch (error) {
                console.warn('Error guardando en Firebase:', error);
            }
        }
        
        showNotification('Registro completo guardado exitosamente', 'success');
        
        // Actualizar interfaz
        await loadRealKPIs();
        await loadRealTimeline();
        
        // Actualizar gráficos CSS
        setTimeout(() => createCSSCharts(), 100);
        
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
            if (productionData.length === 0) {
                showNotification('No hay datos de producción para analizar', 'warning');
                return;
            }
            
            showNotification('Analizando datos de calidad...', 'info');
            setTimeout(() => {
                const recentData = productionData.slice(0, 10);
                const avgQuality = recentData.reduce((sum, record) => sum + (record.calidad || 0), 0) / recentData.length;
                if (avgQuality > 0) {
                    showNotification(`Calidad promedio reciente: ${Math.round(avgQuality)}%`, 'success');
                } else {
                    showNotification('No hay datos de calidad registrados', 'warning');
                }
            }, 1500);
            break;
            
        case 'reporte-diario':
            if (productionData.length === 0) {
                showNotification('No hay datos para generar reporte', 'warning');
                return;
            }
            
            showNotification('Generando reporte con datos reales...', 'info');
            setTimeout(() => {
                const today = new Date().toDateString();
                const todayData = productionData.filter(record => {
                    return new Date(record.fecha).toDateString() === today;
                });
                const totalKg = todayData.reduce((sum, record) => sum + (record.cantidad || 0), 0);
                showNotification(`Reporte: ${totalKg}kg cosechados hoy`, 'success');
            }, 1500);
            break;
            
        case 'planificar-cosecha':
            showNotification('Función de planificación en desarrollo', 'info');
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
        
        if (modalId.includes('Corte') || modalId.includes('Completo')) {
            loadFormOptionsFromDatabase();
        }
    }
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// EXPORTAR DATOS REALES
async function exportarDatos() {
    try {
        if (productionData.length === 0) {
            showNotification('No hay datos para exportar', 'warning');
            return;
        }
        
        showNotification('Exportando datos reales...', 'info');
        
        const dataToExport = {
            fecha_exportacion: new Date().toISOString(),
            total_registros: productionData.length,
            datos: productionData
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `produccion_real_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification(`${productionData.length} registros exportados correctamente`, 'success');
        
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

// HACER FUNCIONES GLOBALES
window.accionRapida = accionRapida;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.exportarDatos = exportarDatos;

console.log('Sistema de producción sin Chart.js cargado - Sin RAF issues');
