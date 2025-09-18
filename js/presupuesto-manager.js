/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE PRESUPUESTOS
   Sistema completo de gestión de presupuestos
   ======================================== */

// ===========================================
// VARIABLES GLOBALES DE PRESUPUESTOS
// ===========================================

let presupuestos = new Map();
let alertasPresupuesto = new Map();
let sistemapresupuestoInicializado = false;

const presupuestoConfig = {
  monedaPredeterminada: 'GTQ',
  periodosPredeterminados: ['mensual', 'trimestral', 'anual'],
  tiposAlertas: ['75%', '90%', '100%'],
  categoriasPresupuesto: {
    'mano-obra': { limite: 6000, alertas: true, color: '#ef4444' },
    'insumos': { limite: 3750, alertas: true, color: '#f59e0b' },
    'transporte': { limite: 2250, alertas: true, color: '#3b82f6' },
    'servicios': { limite: 1500, alertas: true, color: '#22c55e' },
    'mantenimiento': { limite: 1500, alertas: true, color: '#8b5cf6' }
  },
  limiteGeneral: 15000
};

// ===========================================
// FUNCIONES DE GESTIÓN DE PRESUPUESTOS
// ===========================================

async function mostrarGestionPresupuesto() {
  console.log('Abriendo gestión de presupuestos...');
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div class="modal-content" style="
      background: white;
      border-radius: 20px;
      width: 95%;
      max-width: 1000px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    ">
      <div class="modal-header" style="
        padding: 2rem;
        border-bottom: 2px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border-radius: 20px 20px 0 0;
      ">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 1rem;">
          <i class="fas fa-chart-pie" style="font-size: 1.5rem;"></i>
          Gestión de Presupuestos
        </h2>
        <button class="btn-close" onclick="cerrarModal()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          font-size: 1.8rem;
          cursor: pointer;
          color: white;
          padding: 0.5rem;
          border-radius: 8px;
        ">&times;</button>
      </div>
      
      <div class="modal-body" style="padding: 2rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          
          <!-- Panel Izquierdo - Configuración -->
          <div>
            <h3 style="margin-bottom: 1.5rem; color: #1e293b; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-cog" style="color: #3b82f6;"></i>
              Configuración General
            </h3>
            
            <div style="background: #f8fafc; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                  Presupuesto Total Mensual
                </label>
                <div style="display: flex; align-items: center; gap: 1rem;">
                  <input type="number" id="presupuestoTotal" style="
                    flex: 1;
                    padding: 0.75rem;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 1.1rem;
                    font-weight: 600;
                  " value="${presupuestoConfig.limiteGeneral}" step="100" min="0">
                  <span style="font-weight: 600; color: #6b7280;">GTQ</span>
                </div>
              </div>
              
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                  Período de Revisión
                </label>
                <select id="periodoRevision" style="
                  width: 100%;
                  padding: 0.75rem;
                  border: 2px solid #e5e7eb;
                  border-radius: 8px;
                  font-size: 1rem;
                ">
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 1rem; font-weight: 600; color: #374151;">
                  Configurar Alertas
                </label>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="alerta75" checked style="transform: scale(1.2);">
                    <span>75% del presupuesto</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="alerta90" checked style="transform: scale(1.2);">
                    <span>90% del presupuesto</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="alerta100" checked style="transform: scale(1.2);">
                    <span>Presupuesto superado</span>
                  </label>
                </div>
              </div>
              
              <button id="guardarConfigPresupuesto" style="
                width: 100%;
                padding: 1rem;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s ease;
              " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <i class="fas fa-save" style="margin-right: 0.5rem;"></i>
                Guardar Configuración
              </button>
            </div>
            
            <!-- Historial de Presupuestos -->
            <h3 style="margin-bottom: 1rem; color: #1e293b; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-history" style="color: #8b5cf6;"></i>
              Historial Reciente
            </h3>
            
            <div id="historialPresupuestos" style="
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              max-height: 200px;
              overflow-y: auto;
            ">
              <div style="padding: 1rem; text-align: center; color: #6b7280;">
                Cargando historial...
              </div>
            </div>
          </div>
          
          <!-- Panel Derecho - Presupuestos por Categoría -->
          <div>
            <h3 style="margin-bottom: 1.5rem; color: #1e293b; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-tags" style="color: #f59e0b;"></i>
              Presupuesto por Categoría
            </h3>
            
            <div id="categoriasPresupuesto" style="display: grid; gap: 1rem;">
              <!-- Se llenará dinámicamente -->
            </div>
            
            <!-- Resumen Visual -->
            <div style="margin-top: 2rem; background: #f8fafc; border-radius: 12px; padding: 1.5rem;">
              <h4 style="margin-bottom: 1rem; color: #374151;">Estado Actual del Presupuesto</h4>
              <div id="resumenPresupuesto">
                <div style="margin-bottom: 1rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-weight: 600;">Usado:</span>
                    <span id="montoUsado" style="font-weight: 600; color: #dc2626;">Q 0</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-weight: 600;">Disponible:</span>
                    <span id="montoDisponible" style="font-weight: 600; color: #16a34a;">Q 15,000</span>
                  </div>
                  <div style="width: 100%; height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden; margin-top: 1rem;">
                    <div id="barraProgreso" style="
                      height: 100%;
                      background: linear-gradient(90deg, #22c55e 0%, #f59e0b 70%, #dc2626 100%);
                      width: 0%;
                      transition: width 0.5s ease;
                    "></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer" style="
        padding: 1.5rem 2rem;
        border-top: 2px solid #f1f5f9;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        background: #f8fafc;
        border-radius: 0 0 20px 20px;
      ">
        <button type="button" onclick="exportarPresupuesto()" style="
          padding: 0.75rem 1.5rem;
          border: 2px solid #3b82f6;
          background: white;
          color: #3b82f6;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">
          <i class="fas fa-download" style="margin-right: 0.5rem;"></i>
          Exportar
        </button>
        <button type="button" onclick="reiniciarPresupuesto()" style="
          padding: 0.75rem 1.5rem;
          border: 2px solid #f59e0b;
          background: white;
          color: #f59e0b;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">
          <i class="fas fa-redo" style="margin-right: 0.5rem;"></i>
          Reiniciar
        </button>
        <button type="button" onclick="cerrarModal()" style="
          padding: 0.75rem 1.5rem;
          border: 2px solid #6b7280;
          background: white;
          color: #6b7280;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">Cerrar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Cargar datos y configurar eventos
  await cargarDatosPresupuesto();
  configurarEventosPresupuesto();
  
  // Cerrar modal con ESC
  const closeWithEsc = (e) => {
    if (e.key === 'Escape') {
      cerrarModal();
      document.removeEventListener('keydown', closeWithEsc);
    }
  };
  document.addEventListener('keydown', closeWithEsc);

  // Cerrar modal al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarModal();
    }
  });
}

async function cargarDatosPresupuesto() {
  try {
    // Generar categorías de presupuesto dinámicamente
    const categoriasContainer = document.getElementById('categoriasPresupuesto');
    if (categoriasContainer) {
      const categoriasHTML = Object.entries(presupuestoConfig.categoriasPresupuesto).map(([id, config]) => {
        const gastoActual = calcularGastoCategoria(id);
        const porcentaje = config.limite > 0 ? (gastoActual / config.limite) * 100 : 0;
        const estadoColor = porcentaje >= 100 ? '#dc2626' : porcentaje >= 90 ? '#f59e0b' : porcentaje >= 75 ? '#f59e0b' : '#22c55e';
        
        return `
          <div style="
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 1rem;
            background: white;
            transition: all 0.3s ease;
          " onmouseover="this.style.borderColor='${config.color}'; this.style.transform='translateY(-2px)'" 
             onmouseout="this.style.borderColor='#e5e7eb'; this.style.transform='translateY(0)'">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: ${config.color};
                "></div>
                <span style="font-weight: 600; text-transform: capitalize;">${id.replace('-', ' ')}</span>
              </div>
              <div style="
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                background: ${estadoColor}20;
                color: ${estadoColor};
                font-size: 0.75rem;
                font-weight: 600;
              ">
                ${porcentaje.toFixed(1)}%
              </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                Límite Mensual (GTQ)
              </label>
              <input type="number" id="limite_${id}" value="${config.limite}" min="0" step="50" style="
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.875rem;
              ">
            </div>
            
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.875rem;">
                <span>Gastado: Q ${gastoActual.toLocaleString()}</span>
                <span>Límite: Q ${config.limite.toLocaleString()}</span>
              </div>
              <div style="width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                <div style="
                  height: 100%;
                  background: ${estadoColor};
                  width: ${Math.min(porcentaje, 100)}%;
                  transition: width 0.5s ease;
                "></div>
              </div>
            </div>
            
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer;">
              <input type="checkbox" id="alertas_${id}" ${config.alertas ? 'checked' : ''} style="transform: scale(1.1);">
              Alertas automáticas
            </label>
          </div>
        `;
      }).join('');
      
      categoriasContainer.innerHTML = categoriasHTML;
    }
    
    // Actualizar resumen
    await actualizarResumenPresupuesto();
    
  } catch (error) {
    console.error('Error cargando datos de presupuesto:', error);
    mostrarNotificacion('Error al cargar datos del presupuesto', 'error');
  }
}

function configurarEventosPresupuesto() {
  // Evento para guardar configuración
  const btnGuardar = document.getElementById('guardarConfigPresupuesto');
  if (btnGuardar) {
    btnGuardar.addEventListener('click', guardarConfiguracionPresupuesto);
  }
  
  // Eventos para cambios en tiempo real
  const presupuestoTotal = document.getElementById('presupuestoTotal');
  if (presupuestoTotal) {
    presupuestoTotal.addEventListener('input', (e) => {
      presupuestoConfig.limiteGeneral = parseFloat(e.target.value) || 0;
      actualizarResumenPresupuesto();
    });
  }
}

async function guardarConfiguracionPresupuesto() {
  try {
    // Obtener valores del formulario
    const presupuestoTotal = parseFloat(document.getElementById('presupuestoTotal')?.value) || 0;
    const periodo = document.getElementById('periodoRevision')?.value || 'mensual';
    
    // Actualizar configuración global
    presupuestoConfig.limiteGeneral = presupuestoTotal;
    presupuestoConfig.periodoActual = periodo;
    
    // Actualizar límites por categoría
    Object.keys(presupuestoConfig.categoriasPresupuesto).forEach(categoryId => {
      const limiteInput = document.getElementById(`limite_${categoryId}`);
      const alertasInput = document.getElementById(`alertas_${categoryId}`);
      
      if (limiteInput) {
        presupuestoConfig.categoriasPresupuesto[categoryId].limite = parseFloat(limiteInput.value) || 0;
      }
      if (alertasInput) {
        presupuestoConfig.categoriasPresupuesto[categoryId].alertas = alertasInput.checked;
      }
    });
    
    // Guardar alertas globales
    presupuestoConfig.alertas = {
      75: document.getElementById('alerta75')?.checked || false,
      90: document.getElementById('alerta90')?.checked || false,
      100: document.getElementById('alerta100')?.checked || false
    };
    
    // Guardar en localStorage/Firebase (simulado por ahora)
    if (typeof(Storage) !== "undefined") {
      localStorage.setItem('presupuestoConfig', JSON.stringify(presupuestoConfig));
    }
    
    // Actualizar UI
    await actualizarResumenPresupuesto();
    
    mostrarNotificacion('Configuración de presupuesto guardada correctamente', 'success');
    
    // Actualizar la UI principal también
    if (window.expenseManager && typeof window.expenseManager.calculateStatistics === 'function') {
      await window.expenseManager.calculateStatistics();
    }
    
  } catch (error) {
    console.error('Error guardando configuración:', error);
    mostrarNotificacion('Error al guardar la configuración: ' + error.message, 'error');
  }
}

async function actualizarResumenPresupuesto() {
  try {
    // Calcular gastos totales del mes actual
    const gastosTotales = calcularGastosTotalesMes();
    const limiteTotal = presupuestoConfig.limiteGeneral;
    const disponible = Math.max(0, limiteTotal - gastosTotales);
    const porcentajeUsado = limiteTotal > 0 ? (gastosTotales / limiteTotal) * 100 : 0;
    
    // Actualizar elementos del DOM
    const montoUsadoEl = document.getElementById('montoUsado');
    const montoDisponibleEl = document.getElementById('montoDisponible');
    const barraProgresoEl = document.getElementById('barraProgreso');
    
    if (montoUsadoEl) {
      montoUsadoEl.textContent = `Q ${gastosTotales.toLocaleString()}`;
      montoUsadoEl.style.color = porcentajeUsado >= 90 ? '#dc2626' : porcentajeUsado >= 75 ? '#f59e0b' : '#374151';
    }
    
    if (montoDisponibleEl) {
      montoDisponibleEl.textContent = `Q ${disponible.toLocaleString()}`;
      montoDisponibleEl.style.color = disponible <= 0 ? '#dc2626' : '#16a34a';
    }
    
    if (barraProgresoEl) {
      barraProgresoEl.style.width = `${Math.min(porcentajeUsado, 100)}%`;
      
      // Cambiar color según porcentaje
      let colorBarra;
      if (porcentajeUsado >= 100) {
        colorBarra = '#dc2626';
      } else if (porcentajeUsado >= 90) {
        colorBarra = 'linear-gradient(90deg, #f59e0b 0%, #dc2626 100%)';
      } else if (porcentajeUsado >= 75) {
        colorBarra = 'linear-gradient(90deg, #22c55e 0%, #f59e0b 100%)';
      } else {
        colorBarra = '#22c55e';
      }
      barraProgresoEl.style.background = colorBarra;
    }
    
    // Verificar alertas
    verificarAlertasPresupuesto(porcentajeUsado, gastosTotales, limiteTotal);
    
  } catch (error) {
    console.error('Error actualizando resumen de presupuesto:', error);
  }
}

function calcularGastosTotalesMes() {
  try {
    if (window.expenseManager && window.expenseManager.statistics) {
      return window.expenseManager.statistics.totalMonth || 0;
    }
    
    // Fallback: calcular desde los gastos directamente
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    if (window.expenseManager && window.expenseManager.expenses) {
      let total = 0;
      window.expenseManager.expenses.forEach(expense => {
        if (expense.active && expense.month === currentMonth && expense.year === currentYear) {
          total += expense.amount || 0;
        }
      });
      return total;
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculando gastos totales:', error);
    return 0;
  }
}

function calcularGastoCategoria(categoryId) {
  try {
    if (window.expenseManager && window.expenseManager.statistics && window.expenseManager.statistics.categoriesBreakdown) {
      const categoryData = window.expenseManager.statistics.categoriesBreakdown[categoryId];
      return categoryData ? categoryData.total || 0 : 0;
    }
    
    // Fallback
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    if (window.expenseManager && window.expenseManager.expenses) {
      let total = 0;
      window.expenseManager.expenses.forEach(expense => {
        if (expense.active && expense.category === categoryId && 
            expense.month === currentMonth && expense.year === currentYear) {
          total += expense.amount || 0;
        }
      });
      return total;
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculando gasto por categoría:', error);
    return 0;
  }
}

function verificarAlertasPresupuesto(porcentaje, gastoActual, limite) {
  if (!presupuestoConfig.alertas) return;
  
  const ahora = Date.now();
  const keyAlerta = `alerta_${new Date().getMonth()}_${new Date().getFullYear()}`;
  
  // Evitar spam de alertas (una vez cada 4 horas)
  const ultimaAlerta = alertasPresupuesto.get(keyAlerta) || 0;
  if (ahora - ultimaAlerta < 4 * 60 * 60 * 1000) return;
  
  let mensajeAlerta = '';
  let tipoAlerta = 'warning';
  
  if (porcentaje >= 100 && presupuestoConfig.alertas[100]) {
    mensajeAlerta = `⚠️ PRESUPUESTO SUPERADO: Has gastado Q ${gastoActual.toLocaleString()} de Q ${limite.toLocaleString()} (${porcentaje.toFixed(1)}%)`;
    tipoAlerta = 'error';
  } else if (porcentaje >= 90 && presupuestoConfig.alertas[90]) {
    mensajeAlerta = `🚨 ALERTA: Has usado el ${porcentaje.toFixed(1)}% de tu presupuesto mensual (Q ${gastoActual.toLocaleString()} de Q ${limite.toLocaleString()})`;
    tipoAlerta = 'warning';
  } else if (porcentaje >= 75 && presupuestoConfig.alertas[75]) {
    mensajeAlerta = `📊 AVISO: Has usado el ${porcentaje.toFixed(1)}% de tu presupuesto mensual. Quedan Q ${(limite - gastoActual).toLocaleString()}`;
    tipoAlerta = 'info';
  }
  
  if (mensajeAlerta) {
    mostrarNotificacion(mensajeAlerta, tipoAlerta);
    alertasPresupuesto.set(keyAlerta, ahora);
  }
}

async function exportarPresupuesto() {
  try {
    const resumenPresupuesto = {
      fecha_generacion: new Date().toISOString(),
      periodo: presupuestoConfig.periodoActual || 'mensual',
      configuracion: {
        limite_general: presupuestoConfig.limiteGeneral,
        categorias: presupuestoConfig.categoriasPresupuesto,
        alertas: presupuestoConfig.alertas
      },
      estado_actual: {
        gastos_totales: calcularGastosTotalesMes(),
        disponible: presupuestoConfig.limiteGeneral - calcularGastosTotalesMes(),
        porcentaje_usado: (calcularGastosTotalesMes() / presupuestoConfig.limiteGeneral) * 100,
        gastos_por_categoria: Object.keys(presupuestoConfig.categoriasPresupuesto).reduce((acc, cat) => {
          acc[cat] = {
            gastado: calcularGastoCategoria(cat),
            limite: presupuestoConfig.categoriasPresupuesto[cat].limite,
            disponible: presupuestoConfig.categoriasPresupuesto[cat].limite - calcularGastoCategoria(cat)
          };
          return acc;
        }, {})
      },
      metadatos: {
        finca: 'La Herradura',
        moneda: 'GTQ',
        generado_por: 'Sistema de Gestión',
        version: '1.0'
      }
    };
    
    const dataStr = JSON.stringify(resumenPresupuesto, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presupuesto_${new Date().toISOString().split('T')[0]}.json`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Presupuesto exportado correctamente', 'success');
    
  } catch (error) {
    console.error('Error exportando presupuesto:', error);
    mostrarNotificacion('Error al exportar el presupuesto: ' + error.message, 'error');
  }
}

function reiniciarPresupuesto() {
  if (!confirm('¿Está seguro de que desea reiniciar la configuración del presupuesto? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    // Restaurar configuración predeterminada
    presupuestoConfig.limiteGeneral = 15000;
    presupuestoConfig.categoriasPresupuesto = {
      'mano-obra': { limite: 6000, alertas: true, color: '#ef4444' },
      'insumos': { limite: 3750, alertas: true, color: '#f59e0b' },
      'transporte': { limite: 2250, alertas: true, color: '#3b82f6' },
      'servicios': { limite: 1500, alertas: true, color: '#22c55e' },
      'mantenimiento': { limite: 1500, alertas: true, color: '#8b5cf6' }
    };
    presupuestoConfig.alertas = { 75: true, 90: true, 100: true };
    
    // Limpiar localStorage
    if (typeof(Storage) !== "undefined") {
      localStorage.removeItem('presupuestoConfig');
    }
    
    // Recargar datos
    cargarDatosPresupuesto();
    
    mostrarNotificacion('Configuración de presupuesto reiniciada', 'success');
    
  } catch (error) {
    console.error('Error reiniciando presupuesto:', error);
    mostrarNotificacion('Error al reiniciar el presupuesto: ' + error.message, 'error');
  }
}

// ===========================================
// INICIALIZACIÓN DEL SISTEMA DE PRESUPUESTOS
// ===========================================

async function inicializarSistemaPresupuestos() {
  try {
    console.log('Inicializando sistema de presupuestos...');
    
    // Cargar configuración guardada
    if (typeof(Storage) !== "undefined") {
      const configGuardada = localStorage.getItem('presupuestoConfig');
      if (configGuardada) {
        const configParsed = JSON.parse(configGuardada);
        Object.assign(presupuestoConfig, configParsed);
      }
    }
    
    sistemapresupuestoInicializado = true;
    console.log('Sistema de presupuestos inicializado correctamente');
    
    // Verificar alertas al inicializar
    setTimeout(() => {
      const porcentaje = (calcularGastosTotalesMes() / presupuestoConfig.limiteGeneral) * 100;
      verificarAlertasPresupuesto(porcentaje, calcularGastosTotalesMes(), presupuestoConfig.limiteGeneral);
    }, 2000);
    
  } catch (error) {
    console.error('Error inicializando sistema de presupuestos:', error);
    sistemapresupuestoInicializado = true; // Continuar aunque haya error
  }
}

// ===========================================
// EXPORTACIÓN GLOBAL
// ===========================================

window.presupuestoManager = {
  mostrarGestion: mostrarGestionPresupuesto,
  exportar: exportarPresupuesto,
  reiniciar: reiniciarPresupuesto,
  configuracion: presupuestoConfig,
  inicializado: () => sistemapresupuestoInicializado
};

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarSistemaPresupuestos);
} else {
  setTimeout(inicializarSistemaPresupuestos, 500);
}
