/* ========================================
   FINCA LA HERRADURA - CONTROL DE GASTOS
   Sistema funcional completo - VERSIÓN CORREGIDA
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
  
  // Crear modal dinámico
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div class="modal-content" style="
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    ">
      <div class="modal-header" style="
        padding: 1.5rem;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 style="margin: 0; color: #333;">
          <i class="fas fa-plus" style="margin-right: 0.5rem; color: #ef4444;"></i>
          Nuevo Gasto
        </h3>
        <button class="btn-close" onclick="cerrarModal()" style="
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0.5rem;
        ">&times;</button>
      </div>
      
      <div class="modal-body" style="padding: 1.5rem;">
        <form id="formNuevoGasto">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Fecha</label>
              <input type="date" id="modalFecha" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Categoría</label>
              <select id="modalCategoria" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " required>
                <option value="">Seleccionar categoría...</option>
                ${Object.entries(expenseCategories).map(([id, cat]) => 
                  `<option value="${id}">${cat.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <div style="margin-bottom: 1rem; grid-column: 1 / -1;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Concepto</label>
              <input type="text" id="modalConcepto" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " placeholder="Descripción del gasto" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Monto (Q)</label>
              <input type="number" id="modalMonto" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " step="0.01" min="0" placeholder="0.00" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Estado</label>
              <select id="modalEstado" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " required>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Método de Pago</label>
              <select id="modalMetodoPago" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              ">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            
          </div>
        </form>
      </div>
      
      <div class="modal-footer" style="
        padding: 1.5rem;
        border-top: 1px solid #e5e5e5;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
      ">
        <button type="button" onclick="cerrarModal()" style="
          padding: 0.75rem 1.5rem;
          border: 2px solid #e5e5e5;
          background: white;
          color: #666;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        ">Cancelar</button>
        <button type="button" onclick="guardarGastoModal()" style="
          padding: 0.75rem 1.5rem;
          border: none;
          background: #ef4444;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
        ">
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
    
    // Crear gasto
    createExpense(datos).then(() => {
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
    const reporte = {
      fecha_generacion: now.toISOString(),
      finca: 'La Herradura',
      periodo: 'Mensual',
      resumen_financiero: {
        total_mes: statistics.totalMonth,
        total_año: statistics.totalYear,
        total_gastos: expenses.size,
        costo_por_kg: statistics.costPerKg
      },
      gastos_detallados: getAllExpenses(),
      categorias: Object.fromEntries(categories),
      estadisticas_por_categoria: statistics.categoriesBreakdown,
      metadatos: {
        generado_por: getCurrentUserId(),
        version_sistema: '1.0',
        timestamp: now.getTime()
      }
    };
    
    // Crear archivo JSON
    const dataStr = JSON.stringify(reporte, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Crear link de descarga
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_gastos_${now.toISOString().split('T')[0]}.json`;
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
          filtros.dateFrom = now.toISOString().split('T')[0];
          filtros.dateTo = now.toISOString().split('T')[0];
          break;
        case 'semana':
          const semanaAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtros.dateFrom = semanaAtras.toISOString().split('T')[0];
          filtros.dateTo = now.toISOString().split('T')[0];
          break;
        case 'mes':
          filtros.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          filtros.dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          break;
        case 'trimestre':
          const trimestre = Math.floor(now.getMonth() / 3);
          filtros.dateFrom = new Date(now.getFullYear(), trimestre * 3, 1).toISOString().split('T')[0];
          filtros.dateTo = new Date(now.getFullYear(), (trimestre + 1) * 3, 0).toISOString().split('T')[0];
          break;
        case 'ano':
          filtros.dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          filtros.dateTo = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
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
      mostrarNotificacion('Gestión de presupuesto próximamente disponible', 'info');
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
    modal.parentNode.removeChild(modal);
  }
}

function guardarGastoModal() {
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
    
    // Crear gasto
    createExpense(datos).then(() => {
      // Cerrar modal
      cerrarModal();
      
      // Mostrar éxito
      mostrarNotificacion(`Gasto de ${formatCurrency(datos.monto)} registrado correctamente`, 'success');
    }).catch(error => {
      console.error('Error guardando gasto desde modal:', error);
      mostrarNotificacion('Error al registrar el gasto: ' + error.message, 'error');
    });
    
  } catch (error) {
    console.error('Error guardando gasto desde modal:', error);
    mostrarNotificacion('Error al registrar el gasto: ' + error.message, 'error');
  }
}

function editarGasto(id) {
  const expense = expenses.get(id);
  if (!expense) {
    mostrarNotificacion('Gasto no encontrado', 'error');
    return;
  }
  
  console.log('Editando gasto:', expense);
  
  // Crear modal de edición
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div class="modal-content" style="
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    ">
      <div class="modal-header" style="
        padding: 1.5rem;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 style="margin: 0; color: #333;">
          <i class="fas fa-edit" style="margin-right: 0.5rem; color: #3b82f6;"></i>
          Editar Gasto
        </h3>
        <button class="btn-close" onclick="cerrarModal()" style="
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0.5rem;
        ">&times;</button>
      </div>
      
      <div class="modal-body" style="padding: 1.5rem;">
        <form id="formEditarGasto">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Fecha</label>
              <input type="date" id="editFecha" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " value="${expense.date}" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Categoría</label>
              <select id="editCategoria" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " required>
                ${Object.entries(expenseCategories).map(([catId, cat]) => 
                  `<option value="${catId}" ${catId === expense.category ? 'selected' : ''}>${cat.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <div style="margin-bottom: 1rem; grid-column: 1 / -1;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Concepto</label>
              <input type="text" id="editConcepto" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " value="${expense.description}" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Monto (Q)</label>
              <input type="number" id="editMonto" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " step="0.01" min="0" value="${expense.amount}" required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Estado</label>
              <select id="editEstado" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 1rem;
              " required>
                <option value="pagado" ${expense.status === 'pagado' ? 'selected' : ''}>Pagado</option>
                <option value="pendiente" ${expense.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              </select>
            </div>
            
          </div>
        </form>
      </div>
      
      <div class="modal-footer" style="
        padding: 1.5rem;
        border-top: 1px solid #e5e5e5;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
      ">
        <button type="button" onclick="cerrarModal()" style="
          padding: 0.75rem 1.5rem;
          border: 2px solid #e5e5e5;
          background: white;
          color: #666;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        ">Cancelar</button>
        <button type="button" onclick="actualizarGasto('${id}')" style="
          padding: 0.75rem 1.5rem;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
        ">
          <i class="fas fa-save" style="margin-right: 0.5rem;"></i>
          Actualizar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus en el primer campo
  setTimeout(() => {
    const firstInput = document.getElementById('editConcepto');
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

function actualizarGasto(id) {
  try {
    const expense = expenses.get(id);
    if (!expense) {
      mostrarNotificacion('Gasto no encontrado', 'error');
      return;
    }

    const datos = {
      fecha: document.getElementById('editFecha')?.value,
      categoria: document.getElementById('editCategoria')?.value,
      concepto: document.getElementById('editConcepto')?.value,
      monto: parseFloat(document.getElementById('editMonto')?.value),
      estado: document.getElementById('editEstado')?.value
    };

    // Validaciones
    if (!datos.categoria) {
      mostrarNotificacion('Seleccione una categoría', 'error');
      return;
    }
    
    if (!datos.concepto || !datos.concepto.trim()) {
      mostrarNotificacion('Ingrese un concepto', 'error');
      return;
    }
    
    if (!datos.monto || datos.monto <= 0) {
      mostrarNotificacion('Ingrese un monto válido', 'error');
      return;
    }

    // Actualizar el gasto
    expense.date = datos.fecha;
    expense.category = datos.categoria;
    expense.description = datos.concepto;
    expense.amount = datos.monto;
    expense.status = datos.estado;
    expense.updatedAt = new Date().toISOString();

    expenses.set(id, expense);

    // Recalcular estadísticas
    calculateStatistics();

    // Cerrar modal
    cerrarModal();

    mostrarNotificacion('Gasto actualizado correctamente', 'success');

  } catch (error) {
    console.error('Error actualizando gasto:', error);
    mostrarNotificacion('Error al actualizar el gasto: ' + error.message, 'error');
  }
}

function eliminarGasto(id) {
  if (!confirm('¿Está seguro de que desea eliminar este gasto?')) {
    return;
  }
  
  try {
    deleteExpense(id).then(() => {
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
// GESTIÓN DE GASTOS
// ===========================================

async function createExpense(expenseData) {
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
    
    console.log('Gasto creado exitosamente:', expense);
    dispatchSystemEvent('expenseCreated', { expense });
    
    return expense;
  } catch (error) {
    console.error('Error creando gasto:', error);
    throw error;
  }
}

async function deleteExpense(id) {
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
    console.error('Error eliminando gasto:', error);
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
  if (filters.dateFrom) {
    expenseList = expenseList.filter(expense => expense.date >= filters.dateFrom);
  }
  if (filters.dateTo) {
    expenseList = expenseList.filter(expense => expense.date <= filters.dateTo);
  }
  
  return expenseList.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ===========================================
// ESTADÍSTICAS Y UI
// ===========================================

async function calculateStatistics() {
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
    
    statistics.categoriesBreakdown[categoryId] = {
      total,
      count: categoryExpenses.length,
      percentage: statistics.totalMonth > 0 ? (total / statistics.totalMonth) * 100 : 0,
      category: category.name
    };
  });
  
  // Actualizar UI
  updateFinancialUI();
}

function updateFinancialUI() {
  try {
    // Actualizar resumen financiero
    const gastosDelMes = document.getElementById('gastosDelMes');
    if (gastosDelMes) {
      gastosDelMes.textContent = formatCurrency(statistics.totalMonth);
    }
    
    const presupuestoMensual = document.getElementById('presupuestoMensual');
    if (presupuestoMensual) {
      presupuestoMensual.textContent = 'Q 15,000';
    }
    
    const gastoProyectado = document.getElementById('gastoProyectado');
    if (gastoProyectado) {
      const proyeccion = statistics.totalMonth * 1.5;
      gastoProyectado.textContent = formatCurrency(proyeccion);
    }
    
    const diferenciapresupuesto = document.getElementById('diferenciapresupuesto');
    if (diferenciapresupuesto) {
      const diferencia = 15000 - statistics.totalMonth;
      diferenciapresupuesto.textContent = formatCurrency(diferencia);
    }
    
    const porcentajeUsado = document.getElementById('porcentajeUsado');
    const progressPresupuesto = document.getElementById('progressPresupuesto');
    if (porcentajeUsado && progressPresupuesto) {
      const porcentaje = Math.min((statistics.totalMonth / 15000) * 100, 100);
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
  const container = document.getElementById('listaCategoriasGastos');
  if (!container) return;
  
  const categoriesHTML = Object.entries(statistics.categoriesBreakdown).map(([id, data]) => {
    const category = categories.get(id);
    if (!category) return '';
    
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
    const category = categories.get(expense.category);
    return `
      <tr>
        <td>${formatearFecha(expense.date)}</td>
        <td><span class="categoria-badge ${expense.category}">${category?.name || expense.category}</span></td>
        <td>${expense.description}</td>
        <td>${formatCurrency(expense.amount)}</td>
        <td><span class="estado-badge ${expense.status}">${expense.status}</span></td>
        <td style="white-space: nowrap;">
          <button class="btn btn-sm btn-primary" onclick="editarGasto('${expense.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="eliminarGasto('${expense.id}')" title="Eliminar" style="margin-left: 0.5rem;">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  tbody.innerHTML = tableHTML;
}

// ===========================================
// INICIALIZACIÓN
// ===========================================

async function initializeExpenseSystem() {
  try {
    console.log('Inicializando sistema de gastos...');
    
    await initializeCategories();
    await loadSampleData();
    await calculateStatistics();
    
    systemInitialized = true;
    console.log('Sistema de gastos inicializado correctamente');
    
    dispatchSystemEvent('expenseManagerReady', {
      expenseCount: expenses.size
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

async function loadSampleData() {
  const currentDate = new Date();
  const sampleExpenses = [
    {
      id: 'EXP_001',
      amount: 1200,
      category: 'mano-obra',
      description: 'Jornales de cosecha',
      date: currentDate.toISOString().split('T')[0],
      status: 'pagado',
      paymentMethod: 'efectivo',
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      active: true,
      createdAt: currentDate.toISOString(),
      userId: getCurrentUserId()
    },
    {
      id: 'EXP_002',
      amount: 850,
      category: 'insumos',
      description: 'Fertilizantes NPK',
      date: new Date(currentDate.getTime() - 86400000).toISOString().split('T')[0],
      status: 'pendiente',
      paymentMethod: 'transferencia',
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      active: true,
      createdAt: new Date(currentDate.getTime() - 86400000).toISOString(),
      userId: getCurrentUserId()
    },
    {
      id: 'EXP_003',
      amount: 320,
      category: 'transporte',
      description: 'Combustible',
      date: new Date(currentDate.getTime() - 172800000).toISOString().split('T')[0],
      status: 'pagado',
      paymentMethod: 'tarjeta',
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      active: true,
      createdAt: new Date(currentDate.getTime() - 172800000).toISOString(),
      userId: getCurrentUserId()
    }
  ];

  sampleExpenses.forEach(expense => {
    expenses.set(expense.id, expense);
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
  
  // Crear notificación visual
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : tipo === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 400px;
    font-size: 0.9rem;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Agregar keyframes para la animación
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
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
  
  notification.textContent = mensaje;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-in';
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
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  });
}

function getFinancialSummary(period = 'month') {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0,0,0,0));
      endDate = new Date(now.setHours(23,59,59,999));
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  
  const periodExpenses = getAllExpenses({
    dateFrom: startDate.toISOString().split('T')[0],
    dateTo: endDate.toISOString().split('T')[0]
  });
  
  const total = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  return {
    period,
    total,
    count: periodExpenses.length,
    expenses: periodExpenses,
    statistics
  };
}

// ===========================================
// EXPORTACIÓN GLOBAL
// ===========================================

// Manager global
const expenseManager = {
  isInitialized: () => systemInitialized,
  createExpense,
  deleteExpense,
  getAllExpenses,
  getFinancialSummary,
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

console.log('Sistema de gastos completamente funcional cargado');

// Suprimir warning específico de Firebase
const originalWarn = console.warn;
console.warn = function(...args) {
  const message = args.join(' ');
  if (message.includes('enableIndexedDbPersistence') && message.includes('deprecated')) {
    return;
  }
  originalWarn.apply(console, args);
};