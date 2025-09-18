/* ========================================
   FINCA LA HERRADURA - CONTROL DE GASTOS
   Sistema completamente funcional con Firebase y Presupuestos
   ======================================== */

// ===========================================
// VARIABLES GLOBALES
// ===========================================

const fincaConfig = {
  fincaId: 'finca_la_herradura',
  currency: 'GTQ',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear()
};

let expenses = new Map();
let categories = new Map();
let systemInitialized = false;

let statistics = {
  totalMonth: 0,
  totalYear: 0,
  totalLifetime: 0,
  categoriesBreakdown: {},
  monthlyTrend: [],
  costPerKg: 0
};

const expenseCategories = {
  'mano-obra': {
    name: 'Mano de Obra',
    color: '#ef4444',
    icon: 'fa-users',
    budgetPercentage: 40
  },
  'insumos': {
    name: 'Insumos',
    color: '#f59e0b',
    icon: 'fa-seedling',
    budgetPercentage: 25
  },
  'transporte': {
    name: 'Transporte',
    color: '#3b82f6',
    icon: 'fa-truck',
    budgetPercentage: 15
  },
  'servicios': {
    name: 'Servicios',
    color: '#22c55e',
    icon: 'fa-tools',
    budgetPercentage: 10
  },
  'mantenimiento': {
    name: 'Mantenimiento',
    color: '#8b5cf6',
    icon: 'fa-wrench',
    budgetPercentage: 10
  }
};

// ===========================================
// FUNCIONES PRINCIPALES DE INTERFAZ
// ===========================================

function mostrarFormularioGasto() {
  console.log('Abriendo formulario de nuevo gasto...');
  
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
      width: 90%;
      max-width: 600px;
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
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        color: white;
        border-radius: 20px 20px 0 0;
      ">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 1rem;">
          <i class="fas fa-plus" style="font-size: 1.5rem;"></i>
          Nuevo Gasto
        </h2>
        <button class="btn-close" onclick="cerrarModal()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          font-size: 1.8rem;
          cursor: pointer;
          color: white;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
           onmouseout="this.style.background='rgba(255,255,255,0.2)'">&times;</button>
      </div>
      
      <div class="modal-body" style="padding: 2rem;">
        <form id="formNuevoGasto">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151; font-size: 0.95rem;">
                <i class="fas fa-calendar-alt" style="margin-right: 0.5rem; color: #6b7280;"></i>
                Fecha
              </label>
              <input type="date" id="modalFecha" style="
                width: 100%;
                padding: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
              " value="${new Date().toISOString().split('T')[0]}" 
                 onfocus="this.style.borderColor='#dc2626'; this.style.boxShadow='0 0 0 3px rgba(220, 38, 38, 0.1)'"
                 onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151; font-size: 0.95rem;">
                <i class="fas fa-tags" style="margin-right: 0.5rem; color: #6b7280;"></i>
                Categoría
              </label>
              <select id="modalCategoria" style="
                width: 100%;
                padding: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                background: white;
                cursor: pointer;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
              " onfocus="this.style.borderColor='#dc2626'; this.style.boxShadow='0 0 0 3px rgba(220, 38, 38, 0.1)'"
                 onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'" required>
                <option value="">Seleccionar categoría...</option>
                ${Object.entries(expenseCategories).map(([id, cat]) => 
                  `<option value="${id}">
                    ${cat.name}
                  </option>`
                ).join('')}
              </select>
            </div>
            
            <div style="margin-bottom: 1rem; grid-column: 1 / -1;">
              <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151; font-size: 0.95rem;">
                <i class="fas fa-file-text" style="margin-right: 0.5rem; color: #6b7280;"></i>
                Concepto
              </label>
              <input type="text" id="modalConcepto" style="
                width: 100%;
                padding: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
              " placeholder="Descripción detallada del gasto" 
                 onfocus="this.style.borderColor='#dc2626'; this.style.boxShadow='0 0 0 3px rgba(220, 38, 38, 0.1)'"
                 onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151; font-size: 0.95rem;">
                <i class="fas fa-dollar-sign" style="margin-right: 0.5rem; color: #6b7280;"></i>
                Monto (GTQ)
              </label>
              <input type="number" id="modalMonto" style="
                width: 100%;
                padding: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1.1rem;
                font-weight: 600;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
              " step="0.01" min="0" placeholder="0.00" 
                 onfocus="this.style.borderColor='#dc2626'; this.style.boxShadow='0 0 0 3px rgba(220, 38, 38, 0.1)'"
                 onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151; font-size: 0.95rem;">
                <i class="fas fa-check-circle" style="margin-right: 0.5rem; color: #6b7280;"></i>
                Estado
              </label>
              <select id="modalEstado" style="
                width: 100%;
                padding: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                background: white;
                cursor: pointer;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
              " onfocus="this.style.borderColor='#dc2626'; this.style.boxShadow='0 0 0 3px rgba(220, 38, 38, 0.1)'"
                 onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'" required>
                <option value="pagado">✅ Pagado</option>
                <option value="pendiente">⏳ Pendiente</option>
              </select>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151; font-size: 0.95rem;">
                <i class="fas fa-credit-card" style="margin-right: 0.5rem; color: #6b7280;"></i>
                Método de Pago
              </label>
              <select id="modalMetodoPago" style="
                width: 100%;
                padding: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 1rem;
                background: white;
                cursor: pointer;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
              " onfocus="this.style.borderColor='#dc2626'; this.style.boxShadow='0 0 0 3px rgba(220, 38, 38, 0.1)'"
                 onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none'">
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="tarjeta">💳 Tarjeta</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </div>
            
          </div>
        </form>
      </div>
      
      <div class="modal-footer" style="
        padding: 2rem;
        border-top: 2px solid #f1f5f9;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        background: #f8fafc;
        border-radius: 0 0 20px 20px;
      ">
        <button type="button" onclick="cerrarModal()" style="
          padding: 1rem 2rem;
          border: 2px solid #6b7280;
          background: white;
          color: #6b7280;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#6b7280'; this.style.color='white'"
           onmouseout="this.style.background='white'; this.style.color='#6b7280'">
          <i class="fas fa-times" style="margin-right: 0.5rem;"></i>
          Cancelar
        </button>
        <button type="button" onclick="guardarGastoModal()" style="
          padding: 1rem 2rem;
          border: none;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(220, 38, 38, 0.3)'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <i class="fas fa-save" style="margin-right: 0.5rem;"></i>
          Guardar Gasto
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus en el primer campo
  setTimeout(() => {
    const firstInput = document.getElementById('modalCategoria');
    if (firstInput) firstInput.focus();
  }, 100);

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

function guardarGastoRapido() {
  console.log('Guardando gasto rápido...');
  
  try {
    // Obtener datos del formulario rápido
    const fechaInput = document.getElementById('fechaGasto');
    const categoriaInput = document.getElementById('categoriaGasto');
    const conceptoInput = document.getElementById('conceptoGasto');
    const montoInput = document.getElementById('montoGasto');
    const estadoInput = document.getElementById('estadoGasto');
    
    if (!fechaInput || !categoriaInput || !conceptoInput || !montoInput || !estadoInput) {
      mostrarNotificacion('No se pudieron encontrar todos los campos del formulario', 'error');
      return;
    }
    
    const datos = {
      fecha: fechaInput.value,
      categoria: categoriaInput.value,
      concepto: conceptoInput.value,
      monto: parseFloat(montoInput.value),
      estado: estadoInput.value
    };
    
    console.log('Datos del formulario:', datos);
    
    // Validaciones
    if (!datos.categoria) {
      mostrarNotificacion('Seleccione una categoría', 'error');
      categoriaInput.focus();
      return;
    }
    
    if (!datos.concepto.trim()) {
      mostrarNotificacion('Ingrese un concepto para el gasto', 'error');
      conceptoInput.focus();
      return;
    }
    
    if (!datos.monto || datos.monto <= 0) {
      mostrarNotificacion('Ingrese un monto válido mayor a 0', 'error');
      montoInput.focus();
      return;
    }
    
    // Crear gasto usando Firebase
    createExpenseWithFirebase(datos).then(() => {
      // Limpiar formulario
      fechaInput.value = new Date().toISOString().split('T')[0];
      categoriaInput.value = '';
      conceptoInput.value = '';
      montoInput.value = '';
      estadoInput.value = 'pagado';
      
      // Mostrar éxito
      mostrarNotificacion(`Gasto de ${formatCurrency(datos.monto)} registrado correctamente`, 'success');
      
      // Enfocar en el primer campo para siguiente entrada
      setTimeout(() => categoriaInput.focus(), 100);
    }).catch(error => {
      console.error('Error guardando gasto rápido:', error);
      mostrarNotificacion('Error al registrar el gasto: ' + error.message, 'error');
    });
    
  } catch (error) {
    console.error('Error guardando gasto rápido:', error);
    mostrarNotificacion('Error al registrar el gasto: ' + error.message, 'error');
  }
}

function exportarReporte() {
  console.log('Exportando reporte...');
  
  try {
    const now = new Date();
    const gastos = getAllExpenses();
    
    const reporte = {
      fecha_generacion: now.toISOString(),
      finca: 'La Herradura',
      periodo: 'Completo',
      resumen_financiero: {
        total_mes: statistics.totalMonth,
        total_año: statistics.totalYear,
        total_gastos: gastos.length,
        costo_promedio: gastos.length > 0 ? statistics.totalMonth / gastos.length : 0
      },
      gastos_detallados: gastos,
      categorias: Object.fromEntries(categories),
      estadisticas_por_categoria: statistics.categoriesBreakdown,
      presupuesto: window.presupuestoManager ? window.presupuestoManager.configuracion : null,
      metadatos: {
        generado_por: getCurrentUserId(),
        version_sistema: '2.0',
        timestamp: now.getTime(),
        con_firebase: window.firebaseDataManager?.initialized || false
      }
    };
    
    // Crear archivo JSON
    const dataStr = JSON.stringify(reporte, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Crear link de descarga
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_gastos_completo_${now.toISOString().split('T')[0]}.json`;
    link.style.display = 'none';
    
    // Trigger descarga
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Reporte exportado correctamente', 'success');
    
  } catch (error) {
    console.error('Error exportando reporte:', error);
    mostrarNotificacion('Error al exportar el reporte: ' + error.message, 'error');
  }
}

function aplicarFiltros() {
  console.log('Aplicando filtros...');
  
  try {
    const periodoSelect = document.getElementById('filtroPeriodo');
    const categoriaSelect = document.getElementById('filtroCategoria');
    const estadoSelect = document.getElementById('filtroEstado');
    
    const periodo = periodoSelect ? periodoSelect.value : 'mes';
    const categoria = categoriaSelect ? categoriaSelect.value : '';
    const estado = estadoSelect ? estadoSelect.value : '';
    
    console.log('Filtros:', { periodo, categoria, estado });
    
    const filtros = {};
    
    if (categoria) filtros.category = categoria;
    if (estado) filtros.status = estado;
    
    // Aplicar filtro de período
    if (periodo) {
      const now = new Date();
      switch (periodo) {
        case 'hoy':
          filtros.startDate = now.toISOString().split('T')[0];
          filtros.endDate = now.toISOString().split('T')[0];
          break;
        case 'semana':
          const semanaAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtros.startDate = semanaAtras.toISOString().split('T')[0];
          filtros.endDate = now.toISOString().split('T')[0];
          break;
        case 'mes':
          filtros.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          filtros.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          break;
        case 'trimestre':
          const trimestre = Math.floor(now.getMonth() / 3);
          filtros.startDate = new Date(now.getFullYear(), trimestre * 3, 1).toISOString().split('T')[0];
          filtros.endDate = new Date(now.getFullYear(), (trimestre + 1) * 3, 0).toISOString().split('T')[0];
          break;
        case 'ano':
          filtros.startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          filtros.endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
          break;
      }
    }
    
    // Obtener gastos filtrados
    const gastosFiltrados = getAllExpenses(filtros);
    
    // Actualizar tabla
    updateExpensesTableWithData(gastosFiltrados);
    
    mostrarNotificacion(`Filtros aplicados: ${gastosFiltrados.length} gastos encontrados`, 'info');
    
  } catch (error) {
    console.error('Error aplicando filtros:', error);
    mostrarNotificacion('Error al aplicar filtros: ' + error.message, 'error');
  }
}

function limpiarFiltros() {
  console.log('Limpiando filtros...');
  
  try {
    const filtroPeriodo = document.getElementById('filtroPeriodo');
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroEstado = document.getElementById('filtroEstado');
    
    if (filtroPeriodo) filtroPeriodo.value = 'mes';
    if (filtroCategoria) filtroCategoria.value = '';
    if (filtroEstado) filtroEstado.value = '';
    
    // Actualizar tabla con todos los gastos
    updateExpensesTable();
    
    mostrarNotificacion('Filtros limpiados', 'info');
    
  } catch (error) {
    console.error('Error limpiando filtros:', error);
    mostrarNotificacion('Error al limpiar filtros: ' + error.message, 'error');
  }
}

function accionRapida(accion) {
  console.log('Acción rápida:', accion);
  
  switch(accion) {
    case 'nuevo-gasto':
      mostrarFormularioGasto();
      break;
    case 'presupuesto':
      if (window.presupuestoManager && window.presupuestoManager.mostrarGestion) {
        window.presupuestoManager.mostrarGestion();
      } else {
        mostrarNotificacion('Sistema de presupuestos cargando...', 'info');
        setTimeout(() => accionRapida('presupuesto'), 1000);
      }
      break;
    case 'reporte':
      exportarReporte();
      break;
    default:
      mostrarNotificacion(`Acción "${accion}" no implementada`, 'info');
  }
}

// ===========================================
// FUNCIONES GLOBALES PARA MODALES
// ===========================================

function cerrarModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal && modal.parentNode) {
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 200);
  }
}

async function guardarGastoModal() {
  console.log('Guardando gasto desde modal...');
  
  try {
    const datos = {
      fecha: document.getElementById('modalFecha')?.value,
      categoria: document.getElementById('modalCategoria')?.value,
      concepto: document.getElementById('modalConcepto')?.value,
      monto: parseFloat(document.getElementById('modalMonto')?.value),
      estado: document.getElementById('modalEstado')?.value,
      paymentMethod: document.getElementById('modalMetodoPago')?.value
    };
    
    console.log('Datos del modal:', datos);
    
    // Validaciones
    if (!datos.categoria) {
      mostrarNotificacion('Seleccione una categoría', 'error');
      document.getElementById('modalCategoria')?.focus();
      return;
    }
    
    if (!datos.concepto || !datos.concepto.trim()) {
      mostrarNotificacion('Ingrese un concepto', 'error');
      document.getElementById('modalConcepto')?.focus();
      return;
    }
    
    if (!datos.monto || datos.monto <= 0) {
      mostrarNotificacion('Ingrese un monto válido', 'error');
      document.getElementById('modalMonto')?.focus();
      return;
    }
    
    // Crear gasto usando Firebase
    await createExpenseWithFirebase(datos);
    
    // Cerrar modal
    cerrarModal();
    
    // Mostrar éxito
    mostrarNotificacion(`Gasto de ${formatCurrency(datos.monto)} registrado correctamente`, 'success');
    
  } catch (error) {
    console.error('Error guardando gasto desde modal:', error);
    mostrarNotificacion('Error al registrar el gasto: ' + error.message, 'error');
  }
}

// ===========================================
// GESTIÓN DE GASTOS CON FIREBASE
// ===========================================

async function createExpenseWithFirebase(expenseData) {
  try {
    // Si Firebase está disponible, usar Firebase
    if (window.firebaseDataManager && window.firebaseDataManager.initialized) {
      return await window.firebaseDataManager.createExpense(expenseData);
    }
    
    // Fallback: usar sistema local
    return await createExpenseLocal(expenseData);
    
  } catch (error) {
    console.error('Error creando gasto:', error);
    throw error;
  }
}

async function createExpenseLocal(expenseData) {
  try {
    const id = generateExpenseId();
    const currentDate = new Date();
    
    const expense = {
      id,
      amount: parseFloat(expenseData.amount || expenseData.monto),
      category: expenseData.category || expenseData.categoria,
      description: expenseData.description || expenseData.concepto,
      date: expenseData.date || expenseData.fecha || currentDate.toISOString().split('T')[0],
      status: expenseData.status || expenseData.estado || 'pagado',
      paymentMethod: expenseData.paymentMethod || 'efectivo',
      createdAt: currentDate.toISOString(),
      month: new Date(expenseData.date || expenseData.fecha || currentDate).getMonth(),
      year: new Date(expenseData.date || expenseData.fecha || currentDate).getFullYear(),
      active: true,
      userId: getCurrentUserId()
    };
    
    expenses.set(id, expense);
    await calculateStatistics();
    
    console.log('Gasto creado localmente:', expense);
    dispatchSystemEvent('expenseCreated', { expense });
    
    return expense;
  } catch (error) {
    console.error('Error creando gasto local:', error);
    throw error;
  }
}

async function deleteExpenseLocal(id) {
  try {
    const expense = expenses.get(id);
    if (!expense) throw new Error('Gasto no encontrado');
    
    expense.active = false;
    expense.deletedAt = new Date().toISOString();
    
    expenses.set(id, expense);
    await calculateStatistics();
    
    dispatchSystemEvent('expenseDeleted', { expenseId: id });
    return true;
  } catch (error) {
    console.error('Error eliminando gasto local:', error);
    throw error;
  }
}

function getAllExpenses(filters = {}) {
  let expenseList = Array.from(expenses.values()).filter(expense => expense.active);
  
  if (filters.category) {
    expenseList = expenseList.filter(expense => expense.category === filters.category);
  }
  if (filters.status) {
    expenseList = expenseList.filter(expense => expense.status === filters.status);
  }
  if (filters.startDate) {
    expenseList = expenseList.filter(expense => expense.date >= filters.startDate);
  }
  if (filters.endDate) {
    expenseList = expenseList.filter(expense => expense.date <= filters.endDate);
  }
  
  return expenseList.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ===========================================
// ESTADÍSTICAS Y UI
// ===========================================

async function calculateStatistics() {
  // Si Firebase está disponible, usar cálculos de Firebase
  if (window.firebaseDataManager && window.firebaseDataManager.initialized) {
    return await window.firebaseDataManager.calculateStatistics();
  }
  
  // Fallback: cálculos locales
  const activeExpenses = Array.from(expenses.values()).filter(expense => expense.active);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = activeExpenses.filter(expense => 
    expense.month === currentMonth && expense.year === currentYear
  );
  
  statistics.totalMonth = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  statistics.totalYear = activeExpenses.filter(expense => expense.year === currentYear)
    .reduce((sum, expense) => sum + expense.amount, 0);
  statistics.totalLifetime = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Breakdown por categorías
  statistics.categoriesBreakdown = {};
  categories.forEach((category, categoryId) => {
    const categoryExpenses = monthlyExpenses.filter(expense => expense.category === categoryId);
    const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    if (total > 0) {
      statistics.categoriesBreakdown[categoryId] = {
        total,
        count: categoryExpenses.length,
        percentage: statistics.totalMonth > 0 ? (total / statistics.totalMonth) * 100 : 0,
        category: category.name
      };
    }
  });
  
  // Actualizar UI
  updateFinancialUI();
  
  return statistics;
}

function updateFinancialUI() {
  try {
    // Si hay sistema Firebase, usar su función de UI
    if (window.firebaseDataManager && typeof window.updateFinancialUIWithRealData === 'function') {
      window.updateFinancialUIWithRealData();
      return;
    }
    
    // Actualizar elementos del resumen financiero
    const gastosDelMes = document.getElementById('gastosDelMes');
    if (gastosDelMes) {
      gastosDelMes.textContent = formatCurrency(statistics.totalMonth);
    }
    
    const presupuestoMensual = document.getElementById('presupuestoMensual');
    if (presupuestoMensual) {
      const limite = window.presupuestoManager?.configuracion?.limiteGeneral || 15000;
      presupuestoMensual.textContent = formatCurrency(limite);
    }
    
    const gastoProyectado = document.getElementById('gastoProyectado');
    if (gastoProyectado) {
      const diasTranscurridos = new Date().getDate();
      const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const proyeccion = (statistics.totalMonth / diasTranscurridos) * diasMes;
      gastoProyectado.textContent = formatCurrency(proyeccion);
    }
    
    const diferenciapresupuesto = document.getElementById('diferenciapresupuesto');
    if (diferenciapresupuesto) {
      const limite = window.presupuestoManager?.configuracion?.limiteGeneral || 15000;
      const diferencia = limite - statistics.totalMonth;
      diferenciapresupuesto.textContent = formatCurrency(Math.max(0, diferencia));
    }
    
    const porcentajeUsado = document.getElementById('porcentajeUsado');
    const progressPresupuesto = document.getElementById('progressPresupuesto');
    if (porcentajeUsado && progressPresupuesto) {
      const limite = window.presupuestoManager?.configuracion?.limiteGeneral || 15000;
      const porcentaje = Math.min((statistics.totalMonth / limite) * 100, 100);
      porcentajeUsado.textContent = `${porcentaje.toFixed(1)}%`;
      progressPresupuesto.style.width = `${porcentaje}%`;
      
      // Actualizar estado del presupuesto
      const estadoPresupuesto = document.getElementById('estadoPresupuesto');
      if (estadoPresupuesto) {
        estadoPresupuesto.className = 'estado-presupuesto';
        if (porcentaje < 70) {
          estadoPresupuesto.classList.add('normal');
          estadoPresupuesto.innerHTML = '<i class="fas fa-check-circle"></i><span>Dentro del presupuesto</span>';
        } else if (porcentaje < 90) {
          estadoPresupuesto.classList.add('alerta');
          estadoPresupuesto.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Acercándose al límite</span>';
        } else {
          estadoPresupuesto.classList.add('critico');
          estadoPresupuesto.innerHTML = '<i class="fas fa-times-circle"></i><span>Presupuesto superado</span>';
        }
      }
    }
    
    // Actualizar categorías
    updateCategoriesUI();
    
    // Actualizar tabla
    updateExpensesTable();
    
  } catch (error) {
    console.error('Error actualizando UI:', error);
  }
}

function updateCategoriesUI() {
  // Si hay sistema Firebase, usar su función
  if (window.updateCategoriesWithRealData && typeof window.updateCategoriesWithRealData === 'function') {
    window.updateCategoriesWithRealData();
    return;
  }
  
  const container = document.getElementById('listaCategoriasGastos');
  if (!container) return;
  
  if (!statistics.categoriesBreakdown || Object.keys(statistics.categoriesBreakdown).length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <i class="fas fa-tags" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <br>
        No hay gastos registrados este mes
      </div>
    `;
    return;
  }
  
  const categoriesHTML = Object.entries(statistics.categoriesBreakdown).map(([id, data]) => {
    const category = categories.get(id) || expenseCategories[id] || { name: id, color: '#6b7280', icon: 'fa-tag' };
    
    return `
      <div class="categoria-item ${id}">
        <div class="categoria-info">
          <div class="categoria-icon" style="background: ${category.color};">
            <i class="fas ${category.icon}"></i>
          </div>
          <div>
            <div style="font-weight: 600; color: var(--text-primary);">${category.name}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">${data.count} gastos</div>
          </div>
        </div>
        <div class="categoria-datos">
          <div class="categoria-monto">${formatCurrency(data.total)}</div>
          <div class="categoria-porcentaje">${data.percentage.toFixed(1)}%</div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = categoriesHTML;
}

function updateExpensesTable() {
  const recentExpenses = getAllExpenses().slice(0, 10);
  updateExpensesTableWithData(recentExpenses);
}

function updateExpensesTableWithData(expensesData) {
  // Si hay sistema Firebase, usar su función
  if (window.updateExpensesTableWithRealData && typeof window.updateExpensesTableWithRealData === 'function') {
    window.updateExpensesTableWithRealData();
    return;
  }
  
  const tbody = document.getElementById('tablaGastosBody');
  if (!tbody) return;
  
  if (expensesData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <i class="fas fa-receipt" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <br>
          No hay gastos registrados
        </td>
      </tr>
    `;
    return;
  }
  
  const tableHTML = expensesData.map(expense => {
    const category = categories.get(expense.category) || expenseCategories[expense.category] || { name: expense.category };
    return `
      <tr>
        <td>${formatearFecha(expense.date)}</td>
        <td><span class="categoria-badge ${expense.category}">${category.name}</span></td>
        <td>${expense.description}</td>
        <td>${formatCurrency(expense.amount)}</td>
        <td><span class="estado-badge ${expense.status}">${expense.status}</span></td>
        <td style="white-space: nowrap;">
          <button class="btn btn-sm btn-primary" onclick="editarGastoSistema('${expense.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="eliminarGastoSistema('${expense.id}')" title="Eliminar" style="margin-left: 0.5rem;">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  tbody.innerHTML = tableHTML;
}

// ===========================================
// FUNCIONES DE EDICIÓN Y ELIMINACIÓN
// ===========================================

function editarGastoSistema(id) {
  // Si Firebase está disponible, usar función Firebase
  if (window.editarGastoFirebase && typeof window.editarGastoFirebase === 'function') {
    window.editarGastoFirebase(id);
    return;
  }
  
  // Usar función local
  editarGastoLocal(id);
}

function eliminarGastoSistema(id) {
  // Si Firebase está disponible, usar función Firebase
  if (window.eliminarGastoFirebase && typeof window.eliminarGastoFirebase === 'function') {
    window.eliminarGastoFirebase(id);
    return;
  }
  
  // Usar función local
  eliminarGastoLocal(id);
}

function editarGastoLocal(id) {
  mostrarNotificacion('Función de edición local próximamente disponible', 'info');
}

function eliminarGastoLocal(id) {
  if (!confirm('¿Está seguro de que desea eliminar este gasto?')) {
    return;
  }
  
  try {
    deleteExpenseLocal(id).then(() => {
      mostrarNotificacion('Gasto eliminado correctamente', 'success');
    }).catch(error => {
      console.error('Error eliminando gasto:', error);
      mostrarNotificacion('Error al eliminar el gasto: ' + error.message, 'error');
    });
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    mostrarNotificacion('Error al eliminar el gasto: ' + error.message, 'error');
  }
}

// ===========================================
// INICIALIZACIÓN
// ===========================================

async function initializeExpenseSystem() {
  try {
    console.log('Inicializando sistema de gastos...');
    
    await initializeCategories();
    
    // NO cargar datos de muestra - solo datos reales
    console.log('Sistema configurado para usar solo datos reales');
    
    await calculateStatistics();
    
    systemInitialized = true;
    console.log('Sistema de gastos inicializado correctamente');
    
    dispatchSystemEvent('expenseManagerReady', {
      expenseCount: expenses.size,
      usingFirebase: window.firebaseDataManager?.initialized || false
    });
    
  } catch (error) {
    console.error('Error inicializando gastos:', error);
    systemInitialized = true;
  }
}

async function initializeCategories() {
  categories.clear();
  Object.entries(expenseCategories).forEach(([id, category]) => {
    categories.set(id, {
      id,
      ...category,
      totalExpenses: 0,
      active: true
    });
  });
}

// ===========================================
// UTILIDADES
// ===========================================

function generateExpenseId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 6);
  return `EXP_${timestamp}_${random}`.toUpperCase();
}

function getCurrentUserId() {
  return window.authManager?.currentUser?.uid || 'anonymous_user';
}

function dispatchSystemEvent(eventType, data) {
  window.dispatchEvent(new CustomEvent(eventType, {
    detail: { ...data, timestamp: Date.now(), source: 'expenseManager' }
  }));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ'
  }).format(amount || 0);
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  console.log(`${tipo.toUpperCase()}: ${mensaje}`);
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : tipo === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    max-width: 400px;
    font-size: 0.9rem;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
    cursor: pointer;
  `;
  
  // Agregar icono según tipo
  const iconMap = {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <i class="${iconMap[tipo] || iconMap.info}" style="font-size: 1.1rem;"></i>
      <span>${mensaje}</span>
    </div>
  `;
  
  // Agregar keyframes para la animación si no existen
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
  
  // Click to dismiss
  notification.addEventListener('click', () => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  });
}

// ===========================================
// EXPORTACIÓN GLOBAL
// ===========================================

const expenseManager = {
  isInitialized: () => systemInitialized,
  createExpense: createExpenseWithFirebase,
  deleteExpense: deleteExpenseLocal,
  getAllExpenses,
  calculateStatistics,
  formatCurrency,
  get expenses() { return expenses; },
  get categories() { return categories; },
  get statistics() { return statistics; }
};

window.expenseManager = expenseManager;
window.gastosManager = expenseManager;

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExpenseSystem);
} else {
  setTimeout(initializeExpenseSystem, 100);
}

console.log('Sistema de gastos actualizado - SOLO DATOS REALES');

// Suprimir warning específico de Firebase
const originalWarn = console.warn;
console.warn = function(...args) {
  const message = args.join(' ');
  if (message.includes('enableIndexedDbPersistence') && message.includes('deprecated')) {
    return;
  }
  originalWarn.apply(console, args);
};
