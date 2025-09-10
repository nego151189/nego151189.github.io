/* ========================================
   FINCA LA HERRADURA - CONTROL DE GASTOS
   Sistema completo de gestión financiera con funciones
   ======================================== */

// Import de offline.js
import offlineManager from './offline.js';

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Configuración base
const fincaConfig = {
  fincaId: 'finca_la_herradura',
  currency: 'GTQ',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear()
};

// Datos en memoria
let expenses = new Map();
let categories = new Map();
let budgets = new Map();
let costCenters = new Map();
let suppliers = new Map();

// Estado del sistema
let systemInitialized = false;
let offlineAvailable = false;

// Estadísticas
let statistics = {
  totalMonth: 0,
  totalYear: 0,
  totalLifetime: 0,
  categoriesBreakdown: {},
  monthlyTrend: [],
  budgetUtilization: 0,
  costPerKg: 0,
  profitMargin: 0
};

// Configuración de categorías
const expenseCategories = {
  'mano_obra': {
    name: 'Mano de Obra',
    subcategories: ['salarios', 'bonificaciones', 'prestaciones', 'horas_extra'],
    budgetPercentage: 40,
    color: '#3498db'
  },
  'insumos': {
    name: 'Insumos Agrícolas',
    subcategories: ['fertilizantes', 'pesticidas', 'semillas', 'herramientas'],
    budgetPercentage: 25,
    color: '#2ecc71'
  },
  'transporte': {
    name: 'Transporte',
    subcategories: ['combustible', 'mantenimiento_vehiculos', 'fletes', 'logistica'],
    budgetPercentage: 15,
    color: '#f39c12'
  },
  'servicios': {
    name: 'Servicios',
    subcategories: ['electricidad', 'agua', 'telecomunicaciones', 'seguros'],
    budgetPercentage: 8,
    color: '#9b59b6'
  },
  'infraestructura': {
    name: 'Infraestructura',
    subcategories: ['mantenimiento', 'construccion', 'equipos', 'reparaciones'],
    budgetPercentage: 7,
    color: '#e74c3c'
  },
  'administrativo': {
    name: 'Gastos Administrativos',
    subcategories: ['papeleria', 'contabilidad', 'legal', 'bancos'],
    budgetPercentage: 5,
    color: '#34495e'
  }
};

// ==========================================
// FUNCIONES DE INICIALIZACIÓN
// ==========================================

async function initializeExpenseSystem() {
  try {
    console.log('💰 Inicializando sistema de control de gastos...');
    
    // Esperar a que OfflineManager esté disponible
    await waitForOfflineManager();
    
    // Proceder con la inicialización
    if (offlineAvailable) {
      await initWithOffline();
    } else {
      await initWithoutOffline();
    }
    
    systemInitialized = true;
    console.log('✅ Sistema de gastos inicializado correctamente');
    
    // Notificar inicialización exitosa
    dispatchSystemEvent('expenseManagerReady', {
      expenseCount: expenses.size,
      mode: offlineAvailable ? 'online' : 'demo'
    });
    
  } catch (error) {
    console.error('❌ Error en inicialización de gastos:', error);
    await initWithoutOffline();
  }
}

async function waitForOfflineManager() {
  return new Promise((resolve) => {
    const maxWait = 10000;
    const checkInterval = 100;
    let elapsed = 0;

    const check = () => {
      if (window.offlineManager || offlineManager) {
        console.log('✅ OfflineManager disponible para ExpenseManager');
        offlineAvailable = true;
        resolve();
      } else if (elapsed < maxWait) {
        elapsed += checkInterval;
        setTimeout(check, checkInterval);
      } else {
        console.warn('⚠️ Timeout esperando OfflineManager, continuando sin persistencia');
        offlineAvailable = false;
        resolve();
      }
    };

    check();
  });
}

async function initWithOffline() {
  try {
    console.log('🔄 Inicializando con sistema offline...');
    
    // Cargar datos offline
    await loadOfflineData();
    
    // Inicializar categorías
    await initializeCategories();
    
    // Calcular estadísticas
    await calculateStatistics();
    
    console.log(`✅ Sistema offline inicializado: ${expenses.size} gastos registrados`);
    
  } catch (error) {
    console.error('❌ Error inicializando con offline:', error);
    await initWithoutOffline();
  }
}

async function initWithoutOffline() {
  try {
    console.log('📝 Inicializando sistema en modo sin persistencia');
    
    // Inicializar categorías por defecto
    await initializeCategories();
    
    // Cargar datos de ejemplo
    await loadSampleData();
    
    // Calcular estadísticas
    await calculateStatistics();
    
    console.log('✅ Sistema inicializado en modo demo');
    
  } catch (error) {
    console.error('❌ Error en inicialización básica:', error);
  }
}

// ==========================================
// FUNCIONES DE INICIALIZACIÓN DE DATOS
// ==========================================

async function initializeCategories() {
  try {
    console.log('📂 Inicializando categorías de gastos...');
    
    // Limpiar categorías existentes
    categories.clear();
    
    // Agregar categorías predefinidas
    Object.entries(expenseCategories).forEach(([id, category]) => {
      categories.set(id, {
        id: id,
        name: category.name,
        subcategories: category.subcategories || [],
        budgetPercentage: category.budgetPercentage || 0,
        color: category.color || '#666666',
        totalExpenses: 0,
        monthlyExpenses: 0,
        active: true,
        createdAt: new Date().toISOString()
      });
    });
    
    console.log(`✅ ${categories.size} categorías inicializadas`);
    
  } catch (error) {
    console.error('❌ Error inicializando categorías:', error);
    throw error;
  }
}

async function loadSampleData() {
  try {
    console.log('📄 Cargando datos de ejemplo...');
    
    const sampleExpenses = [
      {
        id: 'EXP_SAMPLE_001',
        amount: 1200,
        category: 'mano_obra',
        description: 'Jornales de cosecha',
        date: '2024-01-15',
        status: 'pagado',
        createdAt: new Date().toISOString(),
        month: 0,
        year: 2024,
        active: true,
        userId: getCurrentUserId(),
        paymentMethod: 'efectivo'
      },
      {
        id: 'EXP_SAMPLE_002',
        amount: 850,
        category: 'insumos',
        description: 'Fertilizantes NPK',
        date: '2024-01-14',
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        month: 0,
        year: 2024,
        active: true,
        userId: getCurrentUserId(),
        paymentMethod: 'transferencia'
      },
      {
        id: 'EXP_SAMPLE_003',
        amount: 320,
        category: 'transporte',
        description: 'Combustible para vehículos',
        date: '2024-01-13',
        status: 'pagado',
        createdAt: new Date().toISOString(),
        month: 0,
        year: 2024,
        active: true,
        userId: getCurrentUserId(),
        paymentMethod: 'tarjeta'
      },
      {
        id: 'EXP_SAMPLE_004',
        amount: 450,
        category: 'servicios',
        description: 'Factura eléctrica',
        date: '2024-01-12',
        status: 'pagado',
        createdAt: new Date().toISOString(),
        month: 0,
        year: 2024,
        active: true,
        userId: getCurrentUserId(),
        paymentMethod: 'transferencia'
      },
      {
        id: 'EXP_SAMPLE_005',
        amount: 750,
        category: 'infraestructura',
        description: 'Reparación de sistema de riego',
        date: '2024-01-11',
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        month: 0,
        year: 2024,
        active: true,
        userId: getCurrentUserId(),
        paymentMethod: 'cheque'
      }
    ];

    sampleExpenses.forEach(expense => {
      expenses.set(expense.id, expense);
    });
    
    console.log(`✅ ${sampleExpenses.length} gastos de ejemplo cargados`);
    
  } catch (error) {
    console.error('❌ Error cargando datos de ejemplo:', error);
    throw error;
  }
}

async function loadOfflineData() {
  try {
    const offlineMgr = window.offlineManager || offlineManager;
    if (!offlineMgr) {
      console.warn('⚠️ OfflineManager no disponible');
      return;
    }
    
    // Cargar gastos
    const expensesData = await offlineMgr.getAllData('gastos');
    expensesData.forEach(expenseData => {
      expenses.set(expenseData.id, expenseData.data);
    });
    
    // Cargar presupuestos
    const budgetsData = await offlineMgr.getAllData('presupuestos');
    budgetsData.forEach(budgetData => {
      budgets.set(budgetData.id, budgetData.data);
    });
    
    console.log(`📱 Datos financieros cargados offline: ${expenses.size} gastos`);
    
  } catch (error) {
    console.error('❌ Error cargando datos offline:', error);
    throw error;
  }
}

// ==========================================
// FUNCIONES DE GESTIÓN DE GASTOS
// ==========================================

async function createExpense(expenseData) {
  try {
    // Validar datos
    if (!expenseData || !expenseData.amount || !expenseData.category) {
      throw new Error('Datos de gasto incompletos');
    }
    
    // Generar ID único
    const id = generateExpenseId();
    
    // Crear objeto de gasto
    const expense = {
      id: id,
      amount: parseFloat(expenseData.amount),
      category: expenseData.category,
      description: expenseData.description || '',
      date: expenseData.date || new Date().toISOString().split('T')[0],
      status: expenseData.status || 'pendiente',
      paymentMethod: expenseData.paymentMethod || 'efectivo',
      supplier: expenseData.supplier || '',
      receiptNumber: expenseData.receiptNumber || '',
      notes: expenseData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      active: true,
      userId: getCurrentUserId(),
      fincaId: fincaConfig.fincaId
    };
    
    // Guardar en memoria
    expenses.set(id, expense);
    
    // Guardar offline si está disponible
    if (offlineAvailable) {
      const offlineMgr = window.offlineManager || offlineManager;
      if (offlineMgr) {
        await offlineMgr.saveData('gastos', id, expense);
      }
    }
    
    // Recalcular estadísticas
    await calculateStatistics();
    
    console.log(`✅ Gasto creado: ${id}`);
    dispatchSystemEvent('expenseCreated', { expense });
    
    return expense;
    
  } catch (error) {
    console.error('❌ Error creando gasto:', error);
    throw error;
  }
}

async function updateExpense(id, updateData) {
  try {
    const expense = expenses.get(id);
    if (!expense) {
      throw new Error(`Gasto no encontrado: ${id}`);
    }
    
    // Actualizar datos
    const updatedExpense = {
      ...expense,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Guardar en memoria
    expenses.set(id, updatedExpense);
    
    // Guardar offline si está disponible
    if (offlineAvailable) {
      const offlineMgr = window.offlineManager || offlineManager;
      if (offlineMgr) {
        await offlineMgr.saveData('gastos', id, updatedExpense);
      }
    }
    
    // Recalcular estadísticas
    await calculateStatistics();
    
    console.log(`✅ Gasto actualizado: ${id}`);
    dispatchSystemEvent('expenseUpdated', { expense: updatedExpense });
    
    return updatedExpense;
    
  } catch (error) {
    console.error('❌ Error actualizando gasto:', error);
    throw error;
  }
}

async function deleteExpense(id) {
  try {
    const expense = expenses.get(id);
    if (!expense) {
      throw new Error(`Gasto no encontrado: ${id}`);
    }
    
    // Marcar como inactivo en lugar de eliminar
    expense.active = false;
    expense.deletedAt = new Date().toISOString();
    
    // Guardar en memoria
    expenses.set(id, expense);
    
    // Guardar offline si está disponible
    if (offlineAvailable) {
      const offlineMgr = window.offlineManager || offlineManager;
      if (offlineMgr) {
        await offlineMgr.saveData('gastos', id, expense);
      }
    }
    
    // Recalcular estadísticas
    await calculateStatistics();
    
    console.log(`✅ Gasto eliminado: ${id}`);
    dispatchSystemEvent('expenseDeleted', { expenseId: id });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error eliminando gasto:', error);
    throw error;
  }
}

function getExpense(id) {
  return expenses.get(id) || null;
}

function getAllExpenses(filters = {}) {
  try {
    let expenseList = Array.from(expenses.values()).filter(expense => expense.active);
    
    // Aplicar filtros
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
    
    if (filters.month !== undefined) {
      expenseList = expenseList.filter(expense => expense.month === filters.month);
    }
    
    if (filters.year) {
      expenseList = expenseList.filter(expense => expense.year === filters.year);
    }
    
    // Ordenar por fecha (más reciente primero)
    expenseList.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return expenseList;
    
  } catch (error) {
    console.error('❌ Error obteniendo gastos:', error);
    return [];
  }
}

// ==========================================
// FUNCIONES DE ESTADÍSTICAS
// ==========================================

async function calculateStatistics() {
  try {
    console.log('📊 Calculando estadísticas financieras...');
    
    const activeExpenses = Array.from(expenses.values()).filter(expense => expense.active);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Gastos del mes actual
    const monthlyExpenses = activeExpenses.filter(expense => 
      expense.month === currentMonth && expense.year === currentYear
    );
    
    // Gastos del año actual
    const yearlyExpenses = activeExpenses.filter(expense => 
      expense.year === currentYear
    );
    
    // Calcular totales
    statistics.totalMonth = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    statistics.totalYear = yearlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    statistics.totalLifetime = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Breakdown por categorías
    statistics.categoriesBreakdown = {};
    categories.forEach((category, categoryId) => {
      const categoryExpenses = monthlyExpenses.filter(expense => expense.category === categoryId);
      const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      statistics.categoriesBreakdown[categoryId] = {
        total: total,
        count: categoryExpenses.length,
        percentage: statistics.totalMonth > 0 ? (total / statistics.totalMonth) * 100 : 0,
        category: category.name
      };
    });
    
    // Tendencia mensual (últimos 6 meses)
    statistics.monthlyTrend = calculateMonthlyTrend(activeExpenses);
    
    console.log('✅ Estadísticas calculadas:', statistics);
    dispatchSystemEvent('statisticsUpdated', statistics);
    
  } catch (error) {
    console.error('❌ Error calculando estadísticas:', error);
  }
}

function calculateMonthlyTrend(expenses) {
  const trend = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    const monthExpenses = expenses.filter(expense => 
      expense.month === targetMonth && expense.year === targetYear
    );
    
    const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    trend.push({
      month: targetMonth,
      year: targetYear,
      total: total,
      count: monthExpenses.length,
      label: targetDate.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' })
    });
  }
  
  return trend;
}

function getFinancialSummary(period = 'month') {
  try {
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
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
    const count = periodExpenses.length;
    
    const byCategory = {};
    periodExpenses.forEach(expense => {
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = {
          total: 0,
          count: 0,
          category: categories.get(expense.category)?.name || expense.category
        };
      }
      byCategory[expense.category].total += expense.amount;
      byCategory[expense.category].count += 1;
    });
    
    const byStatus = {};
    periodExpenses.forEach(expense => {
      if (!byStatus[expense.status]) {
        byStatus[expense.status] = { total: 0, count: 0 };
      }
      byStatus[expense.status].total += expense.amount;
      byStatus[expense.status].count += 1;
    });
    
    return {
      period: period,
      total: total,
      count: count,
      average: count > 0 ? total / count : 0,
      byCategory: byCategory,
      byStatus: byStatus,
      expenses: periodExpenses,
      statistics: statistics
    };
    
  } catch (error) {
    console.error('❌ Error generando resumen financiero:', error);
    return null;
  }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function generateExpenseId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `EXP_${timestamp}_${random}`.toUpperCase();
}

function getCurrentUserId() {
  if (window.authManager && window.authManager.currentUser) {
    return window.authManager.currentUser.uid;
  }
  return 'anonymous_user';
}

function dispatchSystemEvent(eventType, data) {
  window.dispatchEvent(new CustomEvent(eventType, {
    detail: {
      ...data,
      timestamp: Date.now(),
      source: 'expenseManager'
    }
  }));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ'
  }).format(amount);
}

function getSystemStatus() {
  return {
    initialized: systemInitialized,
    offlineAvailable: offlineAvailable,
    expenseCount: expenses.size,
    categoryCount: categories.size,
    statistics: statistics
  };
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initializeExpenseSystem();
});

// Funciones globales
window.expenseManager = {
  // Estado
  getStatus: getSystemStatus,
  
  // Gestión de gastos
  createExpense: createExpense,
  updateExpense: updateExpense,
  deleteExpense: deleteExpense,
  getExpense: getExpense,
  getAllExpenses: getAllExpenses,
  
  // Estadísticas y reportes
  getFinancialSummary: getFinancialSummary,
  calculateStatistics: calculateStatistics,
  
  // Utilidades
  formatCurrency: formatCurrency,
  
  // Datos
  expenses: expenses,
  categories: categories,
  statistics: statistics
};

// Alias para compatibilidad
window.gastosManager = window.expenseManager;

// Funciones de conveniencia globales
window.createExpense = createExpense;
window.updateExpense = updateExpense;
window.getExpense = getExpense;
window.getAllExpenses = getAllExpenses;
window.getFinancialSummary = getFinancialSummary;

console.log('💰 Sistema de control de gastos con funciones cargado');

// Export por defecto para módulos ES6
export default window.expenseManager;