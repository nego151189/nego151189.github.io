/* ========================================
   FINCA LA HERRADURA - INTEGRACIÓN FIREBASE
   Sistema completo con datos reales - SIN datos simulados
   ======================================== */

// ===========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ===========================================

const firebaseDataManager = {
  initialized: false,
  collections: {
    expenses: 'gastos_finca',
    budgets: 'presupuestos_finca',
    categories: 'categorias_finca',
    settings: 'configuracion_finca'
  }
};

// ===========================================
// GESTIÓN DE GASTOS CON FIREBASE
// ===========================================

async function createExpenseFirebase(expenseData) {
  try {
    console.log('Creando gasto en Firebase...', expenseData);
    
    if (!window.db) {
      throw new Error('Firebase no está inicializado');
    }
    
    const currentDate = new Date();
    const expense = {
      amount: parseFloat(expenseData.amount || expenseData.monto),
      category: expenseData.category || expenseData.categoria,
      description: expenseData.description || expenseData.concepto,
      date: expenseData.date || expenseData.fecha || currentDate.toISOString().split('T')[0],
      status: expenseData.status || expenseData.estado || 'pagado',
      paymentMethod: expenseData.paymentMethod || 'efectivo',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      month: new Date(expenseData.date || expenseData.fecha || currentDate).getMonth(),
      year: new Date(expenseData.date || expenseData.fecha || currentDate).getFullYear(),
      active: true,
      userId: getCurrentUserId(),
      fincaId: 'finca_la_herradura'
    };
    
    const docRef = await window.db.collection(firebaseDataManager.collections.expenses).add(expense);
    expense.id = docRef.id;
    
    console.log('Gasto creado en Firebase con ID:', docRef.id);
    
    // Actualizar mapa local
    if (window.expenses) {
      window.expenses.set(docRef.id, expense);
    }
    
    // Recalcular estadísticas
    await calculateStatisticsFromFirebase();
    
    // Disparar evento
    window.dispatchEvent(new CustomEvent('expenseCreated', {
      detail: { expense, source: 'firebase' }
    }));
    
    return expense;
    
  } catch (error) {
    console.error('Error creando gasto en Firebase:', error);
    throw new Error(`Error al guardar gasto: ${error.message}`);
  }
}

async function updateExpenseFirebase(expenseId, updateData) {
  try {
    console.log('Actualizando gasto en Firebase...', expenseId, updateData);
    
    if (!window.db || !expenseId) {
      throw new Error('Firebase no inicializado o ID inválido');
    }
    
    const updateObj = {
      ...updateData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await window.db.collection(firebaseDataManager.collections.expenses)
      .doc(expenseId)
      .update(updateObj);
    
    console.log('Gasto actualizado en Firebase');
    
    // Actualizar mapa local
    if (window.expenses && window.expenses.has(expenseId)) {
      const existingExpense = window.expenses.get(expenseId);
      const updatedExpense = { ...existingExpense, ...updateData };
      window.expenses.set(expenseId, updatedExpense);
    }
    
    // Recalcular estadísticas
    await calculateStatisticsFromFirebase();
    
    window.dispatchEvent(new CustomEvent('expenseUpdated', {
      detail: { expenseId, updateData, source: 'firebase' }
    }));
    
    return true;
    
  } catch (error) {
    console.error('Error actualizando gasto en Firebase:', error);
    throw new Error(`Error al actualizar gasto: ${error.message}`);
  }
}

async function deleteExpenseFirebase(expenseId) {
  try {
    console.log('Eliminando gasto en Firebase...', expenseId);
    
    if (!window.db || !expenseId) {
      throw new Error('Firebase no inicializado o ID inválido');
    }
    
    // Marcar como inactivo en lugar de eliminar (soft delete)
    await window.db.collection(firebaseDataManager.collections.expenses)
      .doc(expenseId)
      .update({
        active: false,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    
    console.log('Gasto marcado como eliminado en Firebase');
    
    // Actualizar mapa local
    if (window.expenses && window.expenses.has(expenseId)) {
      const expense = window.expenses.get(expenseId);
      expense.active = false;
      expense.deletedAt = new Date().toISOString();
      window.expenses.set(expenseId, expense);
    }
    
    // Recalcular estadísticas
    await calculateStatisticsFromFirebase();
    
    window.dispatchEvent(new CustomEvent('expenseDeleted', {
      detail: { expenseId, source: 'firebase' }
    }));
    
    return true;
    
  } catch (error) {
    console.error('Error eliminando gasto en Firebase:', error);
    throw new Error(`Error al eliminar gasto: ${error.message}`);
  }
}

async function loadExpensesFromFirebase(filters = {}) {
  try {
    console.log('Cargando gastos desde Firebase...', filters);
    
    if (!window.db) {
      throw new Error('Firebase no está inicializado');
    }
    
    let query = window.db.collection(firebaseDataManager.collections.expenses)
      .where('fincaId', '==', 'finca_la_herradura')
      .where('active', '==', true);
    
    // Aplicar filtros
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.startDate && filters.endDate) {
      query = query.where('date', '>=', filters.startDate)
        .where('date', '<=', filters.endDate);
    }
    
    // Ordenar por fecha
    query = query.orderBy('createdAt', 'desc');
    
    // Limitar resultados si se especifica
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const snapshot = await query.get();
    const expenses = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const expense = {
        id: doc.id,
        ...data,
        // Convertir timestamps de Firebase a fechas
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
      };
      expenses.push(expense);
    });
    
    console.log(`Cargados ${expenses.length} gastos desde Firebase`);
    
    // Actualizar mapa local
    if (window.expenses) {
      window.expenses.clear();
      expenses.forEach(expense => {
        window.expenses.set(expense.id, expense);
      });
    }
    
    return expenses;
    
  } catch (error) {
    console.error('Error cargando gastos desde Firebase:', error);
    throw new Error(`Error al cargar gastos: ${error.message}`);
  }
}

// ===========================================
// ESTADÍSTICAS CON DATOS REALES
// ===========================================

async function calculateStatisticsFromFirebase() {
  try {
    console.log('Calculando estadísticas desde Firebase...');
    
    if (!window.db) {
      console.warn('Firebase no disponible para estadísticas');
      return;
    }
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Obtener gastos del mes actual
    const monthlyQuery = await window.db.collection(firebaseDataManager.collections.expenses)
      .where('fincaId', '==', 'finca_la_herradura')
      .where('active', '==', true)
      .where('month', '==', currentMonth)
      .where('year', '==', currentYear)
      .get();
    
    // Obtener gastos del año actual
    const yearlyQuery = await window.db.collection(firebaseDataManager.collections.expenses)
      .where('fincaId', '==', 'finca_la_herradura')
      .where('active', '==', true)
      .where('year', '==', currentYear)
      .get();
    
    let monthlyTotal = 0;
    let yearlyTotal = 0;
    const categoriesBreakdown = {};
    
    // Procesar gastos mensuales
    monthlyQuery.forEach(doc => {
      const expense = doc.data();
      monthlyTotal += expense.amount || 0;
      
      if (!categoriesBreakdown[expense.category]) {
        categoriesBreakdown[expense.category] = {
          total: 0,
          count: 0,
          category: expense.category
        };
      }
      categoriesBreakdown[expense.category].total += expense.amount || 0;
      categoriesBreakdown[expense.category].count += 1;
    });
    
    // Procesar gastos anuales
    yearlyQuery.forEach(doc => {
      const expense = doc.data();
      yearlyTotal += expense.amount || 0;
    });
    
    // Calcular porcentajes
    Object.keys(categoriesBreakdown).forEach(categoryId => {
      categoriesBreakdown[categoryId].percentage = monthlyTotal > 0 
        ? (categoriesBreakdown[categoryId].total / monthlyTotal) * 100 
        : 0;
    });
    
    // Actualizar estadísticas globales
    if (window.statistics) {
      window.statistics.totalMonth = monthlyTotal;
      window.statistics.totalYear = yearlyTotal;
      window.statistics.categoriesBreakdown = categoriesBreakdown;
    } else {
      window.statistics = {
        totalMonth: monthlyTotal,
        totalYear: yearlyTotal,
        totalLifetime: yearlyTotal, // Por ahora igual al anual
        categoriesBreakdown,
        monthlyTrend: [],
        costPerKg: 0
      };
    }
    
    console.log('Estadísticas calculadas:', window.statistics);
    
    // Actualizar UI
    updateFinancialUIWithRealData();
    
    return window.statistics;
    
  } catch (error) {
    console.error('Error calculando estadísticas desde Firebase:', error);
    return null;
  }
}

function updateFinancialUIWithRealData() {
  try {
    if (!window.statistics) return;
    
    // Actualizar elementos del resumen financiero
    const gastosDelMes = document.getElementById('gastosDelMes');
    if (gastosDelMes) {
      gastosDelMes.textContent = formatCurrency(window.statistics.totalMonth);
    }
    
    const gastoProyectado = document.getElementById('gastoProyectado');
    if (gastoProyectado) {
      const diasTranscurridos = new Date().getDate();
      const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const proyeccion = (window.statistics.totalMonth / diasTranscurridos) * diasMes;
      gastoProyectado.textContent = formatCurrency(proyeccion);
    }
    
    const diferenciapresupuesto = document.getElementById('diferenciapresupuesto');
    if (diferenciapresupuesto) {
      const presupuestoMensual = 15000; // Obtener del sistema de presupuestos
      const diferencia = presupuestoMensual - window.statistics.totalMonth;
      diferenciapresupuesto.textContent = formatCurrency(Math.max(0, diferencia));
    }
    
    // Actualizar progreso de presupuesto
    const porcentajeUsado = document.getElementById('porcentajeUsado');
    const progressPresupuesto = document.getElementById('progressPresupuesto');
    if (porcentajeUsado && progressPresupuesto) {
      const presupuestoMensual = 15000;
      const porcentaje = Math.min((window.statistics.totalMonth / presupuestoMensual) * 100, 100);
      porcentajeUsado.textContent = `${porcentaje.toFixed(1)}%`;
      progressPresupuesto.style.width = `${porcentaje}%`;
      
      // Actualizar color según porcentaje
      if (porcentaje >= 100) {
        progressPresupuesto.style.background = '#dc2626';
      } else if (porcentaje >= 90) {
        progressPresupuesto.style.background = 'linear-gradient(90deg, #f59e0b 0%, #dc2626 100%)';
      } else if (porcentaje >= 75) {
        progressPresupuesto.style.background = 'linear-gradient(90deg, #22c55e 0%, #f59e0b 100%)';
      } else {
        progressPresupuesto.style.background = '#22c55e';
      }
    }
    
    // Actualizar estado del presupuesto
    updateBudgetStatus();
    
    // Actualizar categorías
    updateCategoriesWithRealData();
    
    // Actualizar tabla
    updateExpensesTableWithRealData();
    
  } catch (error) {
    console.error('Error actualizando UI con datos reales:', error);
  }
}

function updateBudgetStatus() {
  const estadoPresupuesto = document.getElementById('estadoPresupuesto');
  if (!estadoPresupuesto || !window.statistics) return;
  
  const presupuestoMensual = 15000;
  const porcentaje = (window.statistics.totalMonth / presupuestoMensual) * 100;
  
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

function updateCategoriesWithRealData() {
  const container = document.getElementById('listaCategoriasGastos');
  if (!container || !window.statistics || !window.statistics.categoriesBreakdown) return;
  
  const expenseCategories = {
    'mano-obra': { name: 'Mano de Obra', color: '#ef4444', icon: 'fa-users' },
    'insumos': { name: 'Insumos', color: '#f59e0b', icon: 'fa-seedling' },
    'transporte': { name: 'Transporte', color: '#3b82f6', icon: 'fa-truck' },
    'servicios': { name: 'Servicios', color: '#22c55e', icon: 'fa-tools' },
    'mantenimiento': { name: 'Mantenimiento', color: '#8b5cf6', icon: 'fa-wrench' }
  };
  
  const categoriesHTML = Object.entries(window.statistics.categoriesBreakdown)
    .filter(([id, data]) => data.total > 0) // Solo mostrar categorías con gastos
    .map(([id, data]) => {
      const category = expenseCategories[id] || { name: id, color: '#6b7280', icon: 'fa-tag' };
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
  
  if (categoriesHTML) {
    container.innerHTML = categoriesHTML;
  } else {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <i class="fas fa-tags" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <br>
        No hay gastos registrados este mes
      </div>
    `;
  }
}

async function updateExpensesTableWithRealData() {
  const tbody = document.getElementById('tablaGastosBody');
  if (!tbody) return;
  
  try {
    // Cargar gastos recientes desde Firebase
    const recentExpenses = await loadExpensesFromFirebase({ limit: 20 });
    
    if (recentExpenses.length === 0) {
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
    
    const expenseCategories = {
      'mano-obra': { name: 'Mano de Obra' },
      'insumos': { name: 'Insumos' },
      'transporte': { name: 'Transporte' },
      'servicios': { name: 'Servicios' },
      'mantenimiento': { name: 'Mantenimiento' }
    };
    
    const tableHTML = recentExpenses.map(expense => {
      const category = expenseCategories[expense.category] || { name: expense.category };
      return `
        <tr>
          <td>${formatearFecha(expense.date)}</td>
          <td><span class="categoria-badge ${expense.category}">${category.name}</span></td>
          <td>${expense.description}</td>
          <td>${formatCurrency(expense.amount)}</td>
          <td><span class="estado-badge ${expense.status}">${expense.status}</span></td>
          <td style="white-space: nowrap;">
            <button class="btn btn-sm btn-primary" onclick="editarGastoFirebase('${expense.id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="eliminarGastoFirebase('${expense.id}')" title="Eliminar" style="margin-left: 0.5rem;">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    tbody.innerHTML = tableHTML;
    
  } catch (error) {
    console.error('Error actualizando tabla con datos reales:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; color: #f59e0b;"></i>
          <br>
          Error al cargar gastos: ${error.message}
        </td>
      </tr>
    `;
  }
}

// ===========================================
// FUNCIONES GLOBALES PARA LA UI
// ===========================================

async function editarGastoFirebase(expenseId) {
  try {
    if (!window.expenses || !window.expenses.has(expenseId)) {
      mostrarNotificacion('Gasto no encontrado', 'error');
      return;
    }
    
    const expense = window.expenses.get(expenseId);
    
    // Reutilizar la función de edición existente pero con Firebase
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7); display: flex; align-items: center;
      justify-content: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div class="modal-content" style="
        background: white; border-radius: 16px; width: 90%; max-width: 600px;
        max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      ">
        <div class="modal-header" style="
          padding: 1.5rem; border-bottom: 1px solid #e5e5e5;
          display: flex; justify-content: space-between; align-items: center;
        ">
          <h3 style="margin: 0; color: #333;">
            <i class="fas fa-edit" style="margin-right: 0.5rem; color: #3b82f6;"></i>
            Editar Gasto
          </h3>
          <button onclick="cerrarModal()" style="
            background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; padding: 0.5rem;
          ">&times;</button>
        </div>
        
        <div class="modal-body" style="padding: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Fecha</label>
              <input type="date" id="editFecha" value="${expense.date}" style="
                width: 100%; padding: 0.75rem; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 1rem;
              " required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Categoría</label>
              <select id="editCategoria" style="
                width: 100%; padding: 0.75rem; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 1rem;
              " required>
                <option value="mano-obra" ${expense.category === 'mano-obra' ? 'selected' : ''}>Mano de Obra</option>
                <option value="insumos" ${expense.category === 'insumos' ? 'selected' : ''}>Insumos</option>
                <option value="transporte" ${expense.category === 'transporte' ? 'selected' : ''}>Transporte</option>
                <option value="servicios" ${expense.category === 'servicios' ? 'selected' : ''}>Servicios</option>
                <option value="mantenimiento" ${expense.category === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
              </select>
            </div>
            
            <div style="margin-bottom: 1rem; grid-column: 1 / -1;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Concepto</label>
              <input type="text" id="editConcepto" value="${expense.description}" style="
                width: 100%; padding: 0.75rem; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 1rem;
              " required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Monto (Q)</label>
              <input type="number" id="editMonto" value="${expense.amount}" step="0.01" min="0" style="
                width: 100%; padding: 0.75rem; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 1rem;
              " required>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">Estado</label>
              <select id="editEstado" style="
                width: 100%; padding: 0.75rem; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 1rem;
              " required>
                <option value="pagado" ${expense.status === 'pagado' ? 'selected' : ''}>Pagado</option>
                <option value="pendiente" ${expense.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="
          padding: 1.5rem; border-top: 1px solid #e5e5e5; display: flex; gap: 1rem; justify-content: flex-end;
        ">
          <button onclick="cerrarModal()" style="
            padding: 0.75rem 1.5rem; border: 2px solid #e5e5e5; background: white; color: #666;
            border-radius: 8px; cursor: pointer; font-size: 1rem;
          ">Cancelar</button>
          <button onclick="actualizarGastoFirebase('${expenseId}')" style="
            padding: 0.75rem 1.5rem; border: none; background: #3b82f6; color: white;
            border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;
          ">
            <i class="fas fa-save" style="margin-right: 0.5rem;"></i>
            Actualizar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cerrarModal();
      }
    });
    
  } catch (error) {
    console.error('Error editando gasto:', error);
    mostrarNotificacion('Error al editar el gasto: ' + error.message, 'error');
  }
}

async function actualizarGastoFirebase(expenseId) {
  try {
    const updateData = {
      date: document.getElementById('editFecha')?.value,
      category: document.getElementById('editCategoria')?.value,
      description: document.getElementById('editConcepto')?.value,
      amount: parseFloat(document.getElementById('editMonto')?.value),
      status: document.getElementById('editEstado')?.value
    };
    
    // Validaciones
    if (!updateData.category || !updateData.description || !updateData.amount || updateData.amount <= 0) {
      mostrarNotificacion('Por favor complete todos los campos correctamente', 'error');
      return;
    }
    
    // Actualizar month y year si cambió la fecha
    if (updateData.date) {
      const newDate = new Date(updateData.date);
      updateData.month = newDate.getMonth();
      updateData.year = newDate.getFullYear();
    }
    
    await updateExpenseFirebase(expenseId, updateData);
    cerrarModal();
    mostrarNotificacion('Gasto actualizado correctamente', 'success');
    
  } catch (error) {
    console.error('Error actualizando gasto:', error);
    mostrarNotificacion('Error al actualizar el gasto: ' + error.message, 'error');
  }
}

async function eliminarGastoFirebase(expenseId) {
  if (!confirm('¿Está seguro de que desea eliminar este gasto?')) {
    return;
  }
  
  try {
    await deleteExpenseFirebase(expenseId);
    mostrarNotificacion('Gasto eliminado correctamente', 'success');
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    mostrarNotificacion('Error al eliminar el gasto: ' + error.message, 'error');
  }
}

// ===========================================
// INICIALIZACIÓN DEL SISTEMA
// ===========================================

async function initializeFirebaseDataSystem() {
  try {
    console.log('Inicializando sistema de datos Firebase...');
    
    // Esperar a que Firebase esté listo
    if (!window.db) {
      console.log('Esperando inicialización de Firebase...');
      await new Promise((resolve, reject) => {
        const checkFirebase = () => {
          if (window.db) {
            resolve();
          } else {
            setTimeout(checkFirebase, 500);
          }
        };
        checkFirebase();
        
        // Timeout después de 30 segundos
        setTimeout(() => reject(new Error('Timeout esperando Firebase')), 30000);
      });
    }
    
    // Cargar gastos iniciales
    await loadExpensesFromFirebase();
    
    // Calcular estadísticas
    await calculateStatisticsFromFirebase();
    
    firebaseDataManager.initialized = true;
    console.log('Sistema de datos Firebase inicializado correctamente');
    
    // Disparar evento
    window.dispatchEvent(new CustomEvent('firebaseDataReady', {
      detail: { timestamp: Date.now() }
    }));
    
    return true;
    
  } catch (error) {
    console.error('Error inicializando sistema de datos Firebase:', error);
    mostrarNotificacion('Error conectando con la base de datos: ' + error.message, 'error');
    firebaseDataManager.initialized = true; // Continuar sin Firebase
    return false;
  }
}

// ===========================================
// EXPORTACIÓN GLOBAL
// ===========================================

window.firebaseDataManager = {
  ...firebaseDataManager,
  createExpense: createExpenseFirebase,
  updateExpense: updateExpenseFirebase,
  deleteExpense: deleteExpenseFirebase,
  loadExpenses: loadExpensesFromFirebase,
  calculateStatistics: calculateStatisticsFromFirebase,
  initialize: initializeFirebaseDataSystem
};

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebaseDataSystem);
} else {
  setTimeout(initializeFirebaseDataSystem, 1000);
}

console.log('Sistema de integración Firebase cargado');
