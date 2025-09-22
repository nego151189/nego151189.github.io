/* ========================================
   FINCA LA HERRADURA - SISTEMA DE GASTOS VANILLA JS
   Control financiero y gestión de presupuestos
   DATOS REALES únicamente - Sin simulaciones v full
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let sistemaGastos = {
    inicializado: false,
    inicializando: false,
    ultimaActualizacion: null,
    progreso: 0,
    paso: 0,
    totalPasos: 5
};

// Configuración REAL de la finca
const configFinca = {
    fincaId: 'finca_la_herradura',
    moneda: 'GTQ',
    mesActual: new Date().getMonth(),
    anoActual: new Date().getFullYear()
};

// Datos de gastos REALES
let datosGastos = {
    gastos: new Map(),
    categorias: new Map(),
    estadisticas: {
        totalMes: 0,
        totalAno: 0,
        totalVida: 0,
        desgloseCategorias: {},
        tendenciaMensual: [],
        costoPorKg: 0
    }
};

// Categorías de gastos
const categoriasGastos = {
    'mano-obra': {
        nombre: 'Mano de Obra',
        color: '#ef4444',
        icono: 'fa-users',
        porcentajePresupuesto: 40
    },
    'insumos': {
        nombre: 'Insumos',
        color: '#f59e0b',
        icono: 'fa-seedling',
        porcentajePresupuesto: 25
    },
    'transporte': {
        nombre: 'Transporte',
        color: '#3b82f6',
        icono: 'fa-truck',
        porcentajePresupuesto: 15
    },
    'servicios': {
        nombre: 'Servicios',
        color: '#22c55e',
        icono: 'fa-tools',
        porcentajePresupuesto: 10
    },
    'mantenimiento': {
        nombre: 'Mantenimiento',
        color: '#8b5cf6',
        icono: 'fa-wrench',
        porcentajePresupuesto: 10
    }
};

// Referencias a managers base
let authManager = null;
let offlineManager = null;
let firebaseManager = null;
let presupuestoManager = null;
let treeManager = null;

// Variables para gráficos
let graficoEvolucion = null;
let graficoCategorias = null;

// ==========================================
// SISTEMA DE CARGA UNIFICADO MEJORADO
// ==========================================

function actualizarLoader(paso, titulo, subtitulo, progreso) {
    const loaderTexto = document.getElementById('loaderTexto');
    const loaderSubtexto = document.getElementById('loaderSubtexto');
    const loaderBarra = document.getElementById('loaderBarra');
    const loaderPorcentaje = document.getElementById('loaderPorcentaje');
    
    if (loaderTexto) loaderTexto.textContent = titulo;
    if (loaderSubtexto) loaderSubtexto.textContent = subtitulo;
    if (loaderBarra) loaderBarra.style.width = progreso + '%';
    if (loaderPorcentaje) loaderPorcentaje.textContent = Math.round(progreso) + '%';
    
    sistemaGastos.paso = paso;
    sistemaGastos.progreso = progreso;
    
    console.log(`💰 Paso ${paso}: ${titulo} (${progreso}%)`);
}

function marcarPasoCompletado(pasoId) {
    const paso = document.getElementById(pasoId);
    if (paso) {
        paso.classList.remove('activo');
        paso.classList.add('completado');
        
        const icon = paso.querySelector('.paso-icon i');
        if (icon) {
            icon.className = 'fas fa-check';
        }
        
        const texto = paso.querySelector('.paso-texto');
        if (texto) {
            texto.style.color = '#22c55e';
        }
    }
}

function marcarPasoActivo(pasoId) {
    // Limpiar pasos anteriores
    document.querySelectorAll('.paso-item').forEach(item => {
        item.classList.remove('activo');
    });
    
    const paso = document.getElementById(pasoId);
    if (paso) {
        paso.classList.add('activo');
        
        const icon = paso.querySelector('.paso-icon i');
        if (icon) {
            icon.className = 'fas fa-spinner fa-spin';
        }
    }
}

function mostrarErrorLoader(mensaje) {
    const loaderTexto = document.getElementById('loaderTexto');
    const loaderSubtexto = document.getElementById('loaderSubtexto');
    
    if (loaderTexto) {
        loaderTexto.textContent = '❌ Error de Sistema';
        loaderTexto.style.color = '#ef4444';
    }
    if (loaderSubtexto) {
        loaderSubtexto.textContent = mensaje;
        loaderSubtexto.style.color = '#ef4444';
    }
}

function ocultarLoader() {
    setTimeout(() => {
        const loader = document.getElementById('sistemaLoader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'translateY(-20px)';
            
            // Remover completamente después de la animación
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
        
        console.log('✅ Sistema de gastos completamente cargado');
    }, 1000);
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL MEJORADA
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('💰 Iniciando sistema de gastos...');
        console.log(`📍 Finca: ${configFinca.fincaId}`);
        
        sistemaGastos.inicializando = true;
        
        // Paso 1: Conectar Firebase
        marcarPasoActivo('paso-firebase');
        actualizarLoader(1, 'Conectando Firebase', 'Estableciendo conexión con la base de datos...', 10);
        await esperarFirebase();
        marcarPasoCompletado('paso-firebase');
        
        // Paso 2: Verificar autenticación (SIN REDIRIGIR)
        marcarPasoActivo('paso-auth');
        actualizarLoader(2, 'Verificando Autenticación', 'Validando acceso al sistema...', 25);
        await verificarAutenticacionSinRedirigir();
        marcarPasoCompletado('paso-auth');
        
        // Paso 3: Cargar sistema de gastos
        marcarPasoActivo('paso-gastos');
        actualizarLoader(3, 'Cargando Sistema de Gastos', 'Inicializando categorías y configuración...', 45);
        await inicializarSistemaGastos();
        marcarPasoCompletado('paso-gastos');
        
        // Paso 4: Inicializar presupuestos
        marcarPasoActivo('paso-presupuestos');
        actualizarLoader(4, 'Inicializando Presupuestos', 'Configurando límites y alertas...', 70);
        await inicializarPresupuestos();
        marcarPasoCompletado('paso-presupuestos');
        
        // Paso 5: Cargar datos REALES
        marcarPasoActivo('paso-datos');
        actualizarLoader(5, 'Sincronizando Datos REALES', 'Obteniendo información desde Firebase...', 90);
        await cargarDatosReales();
        await configurarEventos();
        marcarPasoCompletado('paso-datos');
        
        // Completar inicialización
        actualizarLoader(5, 'Sistema Listo', 'Finca La Herradura conectada exitosamente', 100);
        
        // Inicializar gráficos después de un momento
        setTimeout(inicializarGraficos, 800);
        
        // Configurar responsive listeners
        configurarResponsive();
        
        sistemaGastos.inicializado = true;
        sistemaGastos.inicializando = false;
        sistemaGastos.ultimaActualizacion = new Date();
        
        console.log('🎉 Sistema de gastos completamente inicializado');
        
        // Ocultar loader
        ocultarLoader();
        
        // Evento de sistema listo
        dispatchSystemEvent('sistemaGastosListo', {
            finca: configFinca.fincaId,
            totalGastos: datosGastos.gastos.size,
            firebase: !!firebaseManager
        });
        
    } catch (error) {
        console.error('❌ Error crítico inicializando sistema de gastos:', error);
        
        // Intentar modo offline
        try {
            actualizarLoader(5, 'Modo Offline', 'Cargando datos guardados localmente...', 85);
            await cargarDatosOffline();
            await configurarEventos();
            setTimeout(inicializarGraficos, 500);
            
            sistemaGastos.inicializado = true;
            sistemaGastos.inicializando = false;
            
            mostrarNotificacion('Sistema iniciado en modo offline', 'warning');
            ocultarLoader();
            
        } catch (offlineError) {
            console.error('❌ Error también en modo offline:', offlineError);
            mostrarErrorLoader('No se pudo cargar el sistema de gastos');
            
            setTimeout(() => {
                ocultarLoader();
                mostrarNotificacion('Error cargando sistema de gastos. Intente refrescar la página.', 'error');
            }, 3000);
        }
    }
});

// ==========================================
// FUNCIONES DE ESPERA Y VERIFICACIÓN MEJORADAS
// ==========================================

async function esperarFirebase() {
    return new Promise((resolve) => {
        let intentos = 0;
        const maxIntentos = 50;
        
        const verificar = () => {
            if (window.firebase && window.db) {
                console.log('✅ Firebase disponible');
                resolve(true);
            } else if (intentos < maxIntentos) {
                intentos++;
                setTimeout(verificar, 100);
            } else {
                console.warn('⚠️ Timeout Firebase, continuando...');
                resolve(false);
            }
        };
        
        // También escuchar evento firebaseReady
        window.addEventListener('firebaseReady', () => {
            console.log('🔥 Evento firebaseReady recibido');
            resolve(true);
        }, { once: true });
        
        verificar();
    });
}

async function verificarAutenticacionSinRedirigir() {
    try {
        // Esperar auth manager con timeout más largo
        authManager = await esperarManager('authManager', 5000);
        
        if (authManager && authManager.isInitialized) {
            const estado = authManager.getAuthState();
            console.log('🔐 Estado autenticación:', {
                autenticado: estado.isAuthenticated,
                usuario: estado.user?.email || 'Sin usuario',
                offline: estado.isOffline
            });
            
            // IMPORTANTE: NO redirigir, solo log
            return true;
        } else {
            console.log('⚠️ AuthManager no disponible, continuando sin autenticación...');
            return true;
        }
        
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        return true; // Continuar siempre
    }
}

async function esperarManager(nombreManager, timeout = 5000) {
    return new Promise((resolve) => {
        const inicio = Date.now();
        
        const verificar = () => {
            if (window[nombreManager]) {
                resolve(window[nombreManager]);
            } else if (Date.now() - inicio < timeout) {
                setTimeout(verificar, 100);
            } else {
                console.warn(`⚠️ Timeout esperando ${nombreManager}`);
                resolve(null);
            }
        };
        
        verificar();
    });
}

// ==========================================
// INICIALIZACIÓN DE SISTEMAS MEJORADA
// ==========================================

async function inicializarSistemaGastos() {
    try {
        // Inicializar categorías
        datosGastos.categorias.clear();
        Object.entries(categoriasGastos).forEach(([id, categoria]) => {
            datosGastos.categorias.set(id, {
                id,
                ...categoria,
                totalGastos: 0,
                activa: true
            });
        });
        
        // Obtener referencias a managers base
        firebaseManager = window.firebaseDataManager || window.firebaseIntegration || null;
        offlineManager = await esperarManager('offlineManager', 2000);
        treeManager = await esperarManager('treeManager', 2000);
        
        // Configurar integración con tree manager para costos por árbol
        if (treeManager) {
            console.log('🌳 Tree Manager disponible para cálculo de costos por árbol');
        }
        
        console.log('💰 Sistema de gastos configurado');
        
    } catch (error) {
        console.error('Error inicializando sistema de gastos:', error);
        throw error;
    }
}

async function inicializarPresupuestos() {
    try {
        presupuestoManager = await esperarManager('presupuestoManager', 3000);
        
        if (presupuestoManager) {
            console.log('📊 Sistema de presupuestos disponible');
            
            // Configurar alertas automáticas
            configurarAlertasPresupuesto();
        } else {
            console.log('⚠️ Sistema de presupuestos no disponible');
            
            // Crear configuración básica de presupuesto
            crearConfiguracionBasicaPresupuesto();
        }
        
    } catch (error) {
        console.error('Error inicializando presupuestos:', error);
    }
}

function crearConfiguracionBasicaPresupuesto() {
    // Configuración básica si no hay presupuestoManager
    window.configuracionPresupuesto = {
        limiteGeneral: 15000, // GTQ
        alertas: {
            nivel1: 70, // %
            nivel2: 85, // %
            nivel3: 95  // %
        },
        categorias: Object.fromEntries(
            Object.entries(categoriasGastos).map(([id, cat]) => [
                id, 
                { limite: 15000 * (cat.porcentajePresupuesto / 100) }
            ])
        )
    };
    
    console.log('📊 Configuración básica de presupuesto creada');
}

function configurarAlertasPresupuesto() {
    // Configurar alertas automáticas basadas en presupuestos
    if (!presupuestoManager) return;
    
    const verificarAlertas = () => {
        const limite = presupuestoManager.configuracion?.limiteGeneral || 15000;
        const porcentajeUsado = (datosGastos.estadisticas.totalMes / limite) * 100;
        
        if (porcentajeUsado >= 95) {
            mostrarAlertaPresupuesto('crítica', porcentajeUsado);
        } else if (porcentajeUsado >= 85) {
            mostrarAlertaPresupuesto('alta', porcentajeUsado);
        } else if (porcentajeUsado >= 70) {
            mostrarAlertaPresupuesto('media', porcentajeUsado);
        }
    };
    
    // Verificar alertas cada vez que se actualicen las estadísticas
    window.addEventListener('gastosActualizados', verificarAlertas);
}

function mostrarAlertaPresupuesto(nivel, porcentaje) {
    const mensajes = {
        crítica: `⚠️ CRÍTICO: Has usado el ${porcentaje.toFixed(1)}% de tu presupuesto mensual`,
        alta: `🚨 ALERTA: Has usado el ${porcentaje.toFixed(1)}% de tu presupuesto mensual`,
        media: `⚡ AVISO: Has usado el ${porcentaje.toFixed(1)}% de tu presupuesto mensual`
    };
    
    const tipos = {
        crítica: 'error',
        alta: 'warning',
        media: 'warning'
    };
    
    mostrarNotificacion(mensajes[nivel], tipos[nivel]);
}

// ==========================================
// CARGA DE DATOS REALES MEJORADA
// ==========================================

async function cargarDatosReales() {
    try {
        let datosObtenidos = false;
        
        // Primero intentar cargar datos recientes de offline
        if (offlineManager) {
            const datosOffline = await offlineManager.getData('gastos_recientes');
            if (datosOffline && esReciente(datosOffline.timestamp, 10)) { // 10 minutos
                console.log('📱 Usando datos de gastos offline recientes');
                procesarDatosGastos(datosOffline.data);
                datosObtenidos = true;
            }
        }
        
        // Si no hay datos offline recientes, cargar desde Firebase
        if (!datosObtenidos && firebaseManager) {
            if (firebaseManager.initialized) {
                console.log('🔥 Cargando datos REALES desde Firebase');
                const gastos = await firebaseManager.getAllExpenses();
                procesarDatosGastos(gastos);
                datosObtenidos = true;
                
                // Guardar offline para próxima vez
                if (offlineManager) {
                    await offlineManager.saveData('gastos_recientes', {
                        data: gastos,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        // Fallback: datos locales guardados anteriormente
        if (!datosObtenidos) {
            console.log('⚠️ Firebase no disponible, intentando datos locales');
            await cargarDatosOffline();
            datosObtenidos = true;
        }
        
        // Calcular estadísticas con los datos obtenidos
        await calcularEstadisticas();
        
        // Actualizar interfaz
        actualizarInterfazFinanciera();
        
        console.log(`💰 Datos REALES de gastos cargados: ${datosGastos.gastos.size} registros`);
        
        // Disparar evento de datos cargados
        dispatchSystemEvent('gastosActualizados', {
            totalGastos: datosGastos.gastos.size,
            fuente: firebaseManager?.initialized ? 'firebase' : 'offline'
        });
        
    } catch (error) {
        console.error('Error cargando datos reales:', error);
        throw error;
    }
}

async function cargarDatosOffline() {
    if (!offlineManager) {
        console.log('⚠️ OfflineManager no disponible');
        return;
    }
    
    const datosOffline = await offlineManager.getData('gastos_recientes');
    if (datosOffline) {
        procesarDatosGastos(datosOffline.data || []);
        await calcularEstadisticas();
        actualizarInterfazFinanciera();
        console.log('📱 Datos offline cargados correctamente');
    } else {
        console.log('📱 No hay datos offline disponibles');
        // Crear datos iniciales vacíos
        datosGastos.gastos.clear();
        await calcularEstadisticas();
        actualizarInterfazFinanciera();
    }
}

function procesarDatosGastos(gastosArray) {
    datosGastos.gastos.clear();
    
    if (Array.isArray(gastosArray)) {
        gastosArray.forEach(gasto => {
            if (gasto && gasto.id && gasto.active !== false) {
                // Normalizar estructura del gasto
                const gastoNormalizado = {
                    id: gasto.id,
                    amount: parseFloat(gasto.amount || gasto.monto || 0),
                    category: gasto.category || gasto.categoria,
                    description: gasto.description || gasto.concepto,
                    date: gasto.date || gasto.fecha,
                    status: gasto.status || gasto.estado || 'pagado',
                    paymentMethod: gasto.paymentMethod || 'efectivo',
                    createdAt: gasto.createdAt || new Date().toISOString(),
                    month: gasto.month ?? new Date(gasto.date || gasto.fecha).getMonth(),
                    year: gasto.year ?? new Date(gasto.date || gasto.fecha).getFullYear(),
                    active: gasto.active !== false,
                    userId: gasto.userId || 'unknown'
                };
                
                datosGastos.gastos.set(gasto.id, gastoNormalizado);
            }
        });
    }
    
    console.log(`📊 ${datosGastos.gastos.size} gastos procesados y normalizados`);
}

// ==========================================
// GESTIÓN DE GASTOS MEJORADA
// ==========================================

async function crearGastoConFirebase(datosGasto) {
    try {
        console.log('💰 Creando gasto:', datosGasto);
        
        // Validar datos antes de crear
        const errores = validarDatosGasto(datosGasto);
        if (errores.length > 0) {
            throw new Error(`Datos inválidos: ${errores.join(', ')}`);
        }
        
        let gastoCreado;
        
        // Si Firebase está disponible, usar Firebase
        if (firebaseManager && firebaseManager.initialized) {
            gastoCreado = await firebaseManager.createExpense(datosGasto);
            console.log('🔥 Gasto creado en Firebase');
        } else {
            // Fallback: usar sistema local
            gastoCreado = await crearGastoLocal(datosGasto);
            
            // Intentar sincronizar más tarde si hay cola offline
            if (offlineManager) {
                await offlineManager.queueAction('crear_gasto', datosGasto);
            }
        }
        
        // Recalcular estadísticas
        await calcularEstadisticas();
        
        // Actualizar interfaz
        actualizarInterfazFinanciera();
        
        // Disparar evento
        dispatchSystemEvent('gastoCreado', { 
            gasto: gastoCreado,
            totalGastos: datosGastos.gastos.size 
        });
        
        return gastoCreado;
        
    } catch (error) {
        console.error('Error creando gasto:', error);
        throw error;
    }
}

function validarDatosGasto(datos) {
    const errores = [];
    
    if (!datos.monto && !datos.amount) {
        errores.push('El monto es obligatorio');
    } else {
        const monto = parseFloat(datos.monto || datos.amount);
        if (isNaN(monto) || monto <= 0) {
            errores.push('El monto debe ser un número mayor a 0');
        }
    }
    
    if (!datos.categoria && !datos.category) {
        errores.push('La categoría es obligatoria');
    }
    
    if (!datos.concepto && !datos.description) {
        errores.push('El concepto es obligatorio');
    }
    
    if (!datos.fecha && !datos.date) {
        errores.push('La fecha es obligatoria');
    }
    
    return errores;
}

async function crearGastoLocal(datosGasto) {
    try {
        const id = generarIdGasto();
        const fechaActual = new Date();
        const fechaGasto = new Date(datosGasto.fecha || datosGasto.date || fechaActual);
        
        const gasto = {
            id,
            amount: parseFloat(datosGasto.monto || datosGasto.amount),
            category: datosGasto.categoria || datosGasto.category,
            description: datosGasto.concepto || datosGasto.description,
            date: fechaGasto.toISOString().split('T')[0],
            status: datosGasto.estado || datosGasto.status || 'pagado',
            paymentMethod: datosGasto.metodoPago || datosGasto.paymentMethod || 'efectivo',
            createdAt: fechaActual.toISOString(),
            month: fechaGasto.getMonth(),
            year: fechaGasto.getFullYear(),
            active: true,
            userId: obtenerUsuarioActual(),
            local: true // Marcador para gastos creados localmente
        };
        
        datosGastos.gastos.set(id, gasto);
        
        // Guardar en localStorage como backup
        await guardarGastosLocalmente();
        
        console.log('💰 Gasto creado localmente:', gasto);
        
        return gasto;
    } catch (error) {
        console.error('Error creando gasto local:', error);
        throw error;
    }
}

async function guardarGastosLocalmente() {
    try {
        if (offlineManager) {
            const gastosArray = Array.from(datosGastos.gastos.values());
            await offlineManager.saveData('gastos_backup', {
                data: gastosArray,
                timestamp: new Date().toISOString(),
                version: '2.0'
            });
        }
    } catch (error) {
        console.error('Error guardando gastos localmente:', error);
    }
}

function obtenerTodosLosGastos(filtros = {}) {
    let listaGastos = Array.from(datosGastos.gastos.values()).filter(gasto => gasto.active);
    
    if (filtros.category) {
        listaGastos = listaGastos.filter(gasto => gasto.category === filtros.category);
    }
    if (filtros.status) {
        listaGastos = listaGastos.filter(gasto => gasto.status === filtros.status);
    }
    if (filtros.startDate) {
        listaGastos = listaGastos.filter(gasto => gasto.date >= filtros.startDate);
    }
    if (filtros.endDate) {
        listaGastos = listaGastos.filter(gasto => gasto.date <= filtros.endDate);
    }
    if (filtros.searchTerm) {
        const term = filtros.searchTerm.toLowerCase();
        listaGastos = listaGastos.filter(gasto => 
            gasto.description.toLowerCase().includes(term) ||
            gasto.category.toLowerCase().includes(term)
        );
    }
    
    return listaGastos.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ==========================================
// ESTADÍSTICAS Y ANÁLISIS MEJORADO
// ==========================================

async function calcularEstadisticas() {
    try {
        // Si Firebase está disponible y tiene función de estadísticas, usarla
        if (firebaseManager && firebaseManager.initialized && firebaseManager.calculateStatistics) {
            const stats = await firebaseManager.calculateStatistics();
            if (stats) {
                datosGastos.estadisticas = { ...datosGastos.estadisticas, ...stats };
                return datosGastos.estadisticas;
            }
        }
        
        // Fallback: cálculos locales mejorados
        const gastosActivos = Array.from(datosGastos.gastos.values()).filter(gasto => gasto.active);
        const fechaActual = new Date();
        const mesActual = fechaActual.getMonth();
        const anoActual = fechaActual.getFullYear();
        
        // Gastos del mes actual
        const gastosMensuales = gastosActivos.filter(gasto => 
            gasto.month === mesActual && gasto.year === anoActual
        );
        
        // Gastos del año actual
        const gastosAnuales = gastosActivos.filter(gasto => gasto.year === anoActual);
        
        // Totales
        datosGastos.estadisticas.totalMes = gastosMensuales.reduce((suma, gasto) => suma + gasto.amount, 0);
        datosGastos.estadisticas.totalAno = gastosAnuales.reduce((suma, gasto) => suma + gasto.amount, 0);
        datosGastos.estadisticas.totalVida = gastosActivos.reduce((suma, gasto) => suma + gasto.amount, 0);
        
        // Desglose por categorías del mes actual
        datosGastos.estadisticas.desgloseCategorias = {};
        datosGastos.categorias.forEach((categoria, categoriaId) => {
            const gastosCategoria = gastosMensuales.filter(gasto => gasto.category === categoriaId);
            const total = gastosCategoria.reduce((suma, gasto) => suma + gasto.amount, 0);
            
            if (total > 0) {
                datosGastos.estadisticas.desgloseCategorias[categoriaId] = {
                    total,
                    count: gastosCategoria.length,
                    percentage: datosGastos.estadisticas.totalMes > 0 ? (total / datosGastos.estadisticas.totalMes) * 100 : 0,
                    category: categoria.nombre,
                    promedioPorGasto: total / gastosCategoria.length
                };
            }
        });
        
        // Tendencia mensual (últimos 6 meses)
        datosGastos.estadisticas.tendenciaMensual = calcularTendenciaMensual(gastosActivos, 6);
        
        // Costo por kg (si hay datos de producción)
        await calcularCostoPorKg();
        
        // Estadísticas adicionales
        calcularEstadisticasAdicionales(gastosActivos);
        
        return datosGastos.estadisticas;
        
    } catch (error) {
        console.error('Error calculando estadísticas:', error);
        return datosGastos.estadisticas;
    }
}

function calcularTendenciaMensual(gastos, numeroMeses) {
    const tendencia = [];
    const fechaActual = new Date();
    
    for (let i = numeroMeses - 1; i >= 0; i--) {
        const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        
        const gastosMes = gastos.filter(gasto => 
            gasto.month === mes && gasto.year === año
        );
        
        const total = gastosMes.reduce((suma, gasto) => suma + gasto.amount, 0);
        
        tendencia.push({
            mes: fecha.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' }),
            total,
            cantidad: gastosMes.length
        });
    }
    
    return tendencia;
}

async function calcularCostoPorKg() {
    try {
        // Intentar obtener datos de producción desde treeManager
        if (treeManager && treeManager.getProduccionMensual) {
            const produccionMes = await treeManager.getProduccionMensual();
            if (produccionMes > 0) {
                datosGastos.estadisticas.costoPorKg = datosGastos.estadisticas.totalMes / produccionMes;
                console.log(`📊 Costo por kg calculado: ${formatearMoneda(datosGastos.estadisticas.costoPorKg)}`);
            }
        }
    } catch (error) {
        console.error('Error calculando costo por kg:', error);
    }
}

function calcularEstadisticasAdicionales(gastos) {
    const fechaActual = new Date();
    
    // Promedio diario del mes
    const diasDelMes = fechaActual.getDate();
    datosGastos.estadisticas.promedioDiario = datosGastos.estadisticas.totalMes / diasDelMes;
    
    // Proyección mensual
    const diasEnElMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
    datosGastos.estadisticas.proyeccionMensual = datosGastos.estadisticas.promedioDiario * diasEnElMes;
    
    // Gasto más alto y más bajo del mes
    const gastosMes = gastos.filter(gasto => 
        gasto.month === fechaActual.getMonth() && 
        gasto.year === fechaActual.getFullYear()
    );
    
    if (gastosMes.length > 0) {
        datosGastos.estadisticas.gastoMasAlto = Math.max(...gastosMes.map(g => g.amount));
        datosGastos.estadisticas.gastoMasBajo = Math.min(...gastosMes.map(g => g.amount));
    }
}

// ==========================================
// ACTUALIZACIÓN DE INTERFAZ MEJORADA
// ==========================================

function actualizarInterfazFinanciera() {
    try {
        // Si hay sistema Firebase, delegar actualización
        if (firebaseManager && typeof firebaseManager.updateFinancialUIWithRealData === 'function') {
            firebaseManager.updateFinancialUIWithRealData();
            actualizarElementosAdicionales();
            return;
        }
        
        // Actualización local completa
        actualizarResumenFinanciero();
        actualizarEstadoPresupuesto();
        actualizarCategoriasUI();
        actualizarTablaGastos();
        actualizarTendencias();
        
        console.log('🖥️ Interfaz financiera actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando UI:', error);
        mostrarNotificacion('Error actualizando la interfaz', 'error');
    }
}

function actualizarResumenFinanciero() {
    const elementos = [
        { id: 'gastosDelMes', valor: datosGastos.estadisticas.totalMes },
        { id: 'gastosDelAno', valor: datosGastos.estadisticas.totalAno },
        { id: 'totalGastos', valor: datosGastos.gastos.size },
        { id: 'promedioDiario', valor: datosGastos.estadisticas.promedioDiario },
        { id: 'proyeccionMensual', valor: datosGastos.estadisticas.proyeccionMensual }
    ];
    
    elementos.forEach(({ id, valor }) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (id === 'totalGastos') {
                elemento.textContent = valor || 0;
            } else {
                elemento.textContent = formatearMoneda(valor || 0);
            }
        }
    });
    
    // Actualizar información de presupuesto
    const presupuestoMensual = document.getElementById('presupuestoMensual');
    if (presupuestoMensual) {
        const limite = obtenerLimitePresupuesto();
        presupuestoMensual.textContent = formatearMoneda(limite);
    }
    
    const diferenciapresupuesto = document.getElementById('diferenciapresupuesto');
    if (diferenciapresupuesto) {
        const limite = obtenerLimitePresupuesto();
        const diferencia = limite - datosGastos.estadisticas.totalMes;
        diferenciapresupuesto.textContent = formatearMoneda(Math.max(0, diferencia));
        
        // Cambiar color según la diferencia
        if (diferencia <= 0) {
            diferenciapresupuesto.style.color = '#ef4444';
        } else if (diferencia < limite * 0.1) {
            diferenciapresupuesto.style.color = '#f59e0b';
        } else {
            diferenciapresupuesto.style.color = '#22c55e';
        }
    }
}

function obtenerLimitePresupuesto() {
    if (presupuestoManager?.configuracion?.limiteGeneral) {
        return presupuestoManager.configuracion.limiteGeneral;
    }
    if (window.configuracionPresupuesto?.limiteGeneral) {
        return window.configuracionPresupuesto.limiteGeneral;
    }
    return 15000; // Valor por defecto
}

function actualizarEstadoPresupuesto() {
    const limite = obtenerLimitePresupuesto();
    const porcentaje = Math.min((datosGastos.estadisticas.totalMes / limite) * 100, 100);
    
    // Actualizar barra de progreso
    const porcentajeUsado = document.getElementById('porcentajeUsado');
    const progressPresupuesto = document.getElementById('progressPresupuesto');
    
    if (porcentajeUsado && progressPresupuesto) {
        porcentajeUsado.textContent = `${porcentaje.toFixed(1)}%`;
        progressPresupuesto.style.width = `${porcentaje}%`;
        
        // Cambiar color de la barra según el porcentaje
        if (porcentaje >= 95) {
            progressPresupuesto.style.background = '#ef4444';
        } else if (porcentaje >= 85) {
            progressPresupuesto.style.background = '#f59e0b';
        } else if (porcentaje >= 70) {
            progressPresupuesto.style.background = '#eab308';
        } else {
            progressPresupuesto.style.background = '#22c55e';
        }
    }
    
    // Actualizar estado textual
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

function actualizarElementosAdicionales() {
    // Actualizar costo por kg si está disponible
    const costoPorKg = document.getElementById('costoPorKg');
    if (costoPorKg && datosGastos.estadisticas.costoPorKg > 0) {
        costoPorKg.textContent = formatearMoneda(datosGastos.estadisticas.costoPorKg);
    }
    
    // Actualizar contador de gastos pendientes
    const gastosPendientes = Array.from(datosGastos.gastos.values())
        .filter(gasto => gasto.active && gasto.status === 'pendiente').length;
    
    const elementoPendientes = document.getElementById('gastosPendientes');
    if (elementoPendientes) {
        elementoPendientes.textContent = gastosPendientes;
        
        // Resaltar si hay muchos pendientes
        if (gastosPendientes > 5) {
            elementoPendientes.style.color = '#ef4444';
            elementoPendientes.style.fontWeight = 'bold';
        } else {
            elementoPendientes.style.color = '';
            elementoPendientes.style.fontWeight = '';
        }
    }
}

// ... (continúo con el resto del código en la siguiente parte)

// ==========================================
// RESPONSIVE Y EVENTOS MEJORADOS
// ==========================================

function configurarResponsive() {
    // Escuchar cambios de tamaño de ventana
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Redimensionar gráficos
            if (graficoEvolucion) graficoEvolucion.resize();
            if (graficoCategorias) graficoCategorias.resize();
            
            // Ajustar tablas responsivas
            ajustarTablasResponsive();
            
            console.log('📱 Vista ajustada para:', window.innerWidth + 'px');
        }, 250);
    });
    
    // Configurar navegación touch para móviles
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        configurarNavegacionTouch();
    }
}

function ajustarTablasResponsive() {
    const tablas = document.querySelectorAll('.tabla-gastos');
    tablas.forEach(tabla => {
        if (window.innerWidth < 768) {
            tabla.classList.add('tabla-mobile');
        } else {
            tabla.classList.remove('tabla-mobile');
        }
    });
}

function configurarNavegacionTouch() {
    // Agregar soporte para swipe en cards de categorías
    const categoriasContainer = document.getElementById('listaCategoriasGastos');
    if (categoriasContainer && window.innerWidth < 768) {
        let startX = 0;
        let scrollLeft = 0;
        
        categoriasContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX;
            scrollLeft = categoriasContainer.scrollLeft;
        });
        
        categoriasContainer.addEventListener('touchmove', (e) => {
            if (!startX) return;
            const x = e.touches[0].pageX;
            const walk = (x - startX) * 2;
            categoriasContainer.scrollLeft = scrollLeft - walk;
        });
        
        categoriasContainer.addEventListener('touchend', () => {
            startX = 0;
        });
    }
}

// ==========================================
// FUNCIONES DE INTERFAZ COMPLETAS
// ==========================================

function actualizarCategoriasUI() {
    const container = document.getElementById('listaCategoriasGastos');
    if (!container) return;
    
    if (!datosGastos.estadisticas.desgloseCategorias || Object.keys(datosGastos.estadisticas.desgloseCategorias).length === 0) {
        container.innerHTML = `
            <div class="categoria-vacia">
                <i class="fas fa-tags" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5; color: var(--text-secondary);"></i>
                <p style="color: var(--text-secondary); margin: 0;">No hay gastos registrados este mes</p>
            </div>
        `;
        return;
    }
    
    const categoriesHTML = Object.entries(datosGastos.estadisticas.desgloseCategorias)
        .sort((a, b) => b[1].total - a[1].total) // Ordenar por monto descendente
        .map(([id, data]) => {
            const categoria = datosGastos.categorias.get(id) || categoriasGastos[id] || { 
                nombre: id, 
                color: '#6b7280', 
                icono: 'fa-tag' 
            };
            
            return `
                <div class="categoria-item ${id}" onclick="filtrarPorCategoria('${id}')">
                    <div class="categoria-info">
                        <div class="categoria-icon" style="background: ${categoria.color};">
                            <i class="fas ${categoria.icono}"></i>
                        </div>
                        <div class="categoria-detalles">
                            <div class="categoria-nombre">${categoria.nombre}</div>
                            <div class="categoria-meta">${data.count} gastos • Promedio: ${formatearMoneda(data.promedioPorGasto || 0)}</div>
                        </div>
                    </div>
                    <div class="categoria-datos">
                        <div class="categoria-monto">${formatearMoneda(data.total)}</div>
                        <div class="categoria-porcentaje">${data.percentage.toFixed(1)}%</div>
                        <div class="categoria-barra">
                            <div class="categoria-progreso" style="width: ${data.percentage}%; background: ${categoria.color};"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    
    container.innerHTML = categoriesHTML;
}

function filtrarPorCategoria(categoriaId) {
    const filtroCategoria = document.getElementById('filtroCategoria');
    if (filtroCategoria) {
        filtroCategoria.value = categoriaId;
        aplicarFiltros();
        mostrarNotificacion(`Filtrando por ${categoriasGastos[categoriaId]?.nombre || categoriaId}`, 'info');
    }
}

function actualizarTablaGastos() {
    const gastosRecientes = obtenerTodosLosGastos().slice(0, 20); // Mostrar últimos 20
    actualizarTablaConDatos(gastosRecientes);
}

function actualizarTablaConDatos(gastosArray) {
    const tbody = document.getElementById('tablaGastosBody');
    if (!tbody) return;
    
    if (gastosArray.length === 0) {
        tbody.innerHTML = `
            <tr class="fila-vacia">
                <td colspan="6">
                    <div class="tabla-vacia">
                        <i class="fas fa-receipt" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5; color: var(--text-secondary);"></i>
                        <p style="color: var(--text-secondary); margin: 0;">No hay gastos que mostrar</p>
                        <button class="btn btn-primary btn-sm" onclick="mostrarFormularioGasto()" style="margin-top: 1rem;">
                            <i class="fas fa-plus"></i> Crear primer gasto
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const tableHTML = gastosArray.map((gasto, index) => {
        const categoria = datosGastos.categorias.get(gasto.category) || categoriasGastos[gasto.category] || { 
            nombre: gasto.category, 
            color: '#6b7280' 
        };
        
        const fechaFormateada = formatearFecha(gasto.date);
        const esRecienteGasto = esGastoReciente(gasto.createdAt);
        
        return `
            <tr class="fila-gasto ${esRecienteGasto ? 'reciente' : ''}" data-gasto-id="${gasto.id}">
                <td class="columna-fecha">
                    <div class="fecha-container">
                        <span class="fecha-principal">${fechaFormateada}</span>
                        ${esRecienteGasto ? '<span class="badge-nuevo">Nuevo</span>' : ''}
                    </div>
                </td>
                <td class="columna-categoria">
                    <span class="categoria-badge" style="background: ${categoria.color};">
                        <i class="fas ${categoriasGastos[gasto.category]?.icono || 'fa-tag'}"></i>
                        ${categoria.nombre}
                    </span>
                </td>
                <td class="columna-concepto">
                    <div class="concepto-container">
                        <span class="concepto-principal">${gasto.description}</span>
                        ${gasto.local ? '<small class="texto-local">Local</small>' : ''}
                    </div>
                </td>
                <td class="columna-monto">
                    <span class="monto-principal">${formatearMoneda(gasto.amount)}</span>
                </td>
                <td class="columna-estado">
                    <span class="estado-badge ${gasto.status}">
                        <i class="fas ${gasto.status === 'pagado' ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${gasto.status}
                    </span>
                </td>
                <td class="columna-acciones">
                    <div class="acciones-grupo">
                        <button class="btn-accion btn-editar" onclick="editarGasto('${gasto.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-accion btn-eliminar" onclick="eliminarGasto('${gasto.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = tableHTML;
    
    // Agregar animación de entrada para filas nuevas
    setTimeout(() => {
        const filasRecientes = tbody.querySelectorAll('.fila-gasto.reciente');
        filasRecientes.forEach((fila, index) => {
            setTimeout(() => {
                fila.style.animation = 'slideInFromRight 0.3s ease-out';
            }, index * 50);
        });
    }, 100);
}

function esGastoReciente(fechaCreacion) {
    if (!fechaCreacion) return false;
    const ahora = new Date();
    const fechaGasto = new Date(fechaCreacion);
    const diferencia = (ahora - fechaGasto) / (1000 * 60); // en minutos
    return diferencia <= 30; // Últimos 30 minutos
}

function actualizarTendencias() {
    const tendenciaContainer = document.getElementById('tendenciaMensual');
    if (!tendenciaContainer || !datosGastos.estadisticas.tendenciaMensual) return;
    
    const tendencias = datosGastos.estadisticas.tendenciaMensual;
    const tendenciaHTML = tendencias.map((item, index) => {
        const anteriorTotal = index > 0 ? tendencias[index - 1].total : 0;
        const cambio = anteriorTotal > 0 ? ((item.total - anteriorTotal) / anteriorTotal) * 100 : 0;
        const esPositivo = cambio > 0;
        const esNeutral = Math.abs(cambio) < 5;
        
        return `
            <div class="tendencia-item">
                <div class="tendencia-mes">${item.mes}</div>
                <div class="tendencia-monto">${formatearMoneda(item.total)}</div>
                <div class="tendencia-cambio ${esNeutral ? 'neutro' : esPositivo ? 'negativo' : 'positivo'}">
                    <i class="fas ${esNeutral ? 'fa-minus' : esPositivo ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    ${Math.abs(cambio).toFixed(1)}%
                </div>
                <div class="tendencia-gastos">${item.cantidad} gastos</div>
            </div>
        `;
    }).join('');
    
    tendenciaContainer.innerHTML = tendenciaHTML;
}

// ==========================================
// GRÁFICOS COMPLETOS Y MEJORADOS
// ==========================================

async function inicializarGraficos() {
    try {
        if (!window.Chart) {
            console.warn('Chart.js no está disponible');
            return;
        }

        // Configuración global responsive
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#374151';

        await Promise.all([
            inicializarGraficoEvolucion(),
            inicializarGraficoCategorias(),
            inicializarGraficoComparativo()
        ]);
        
        console.log('📊 Todos los gráficos inicializados correctamente');
    } catch (error) {
        console.error('❌ Error inicializando gráficos:', error);
    }
}

async function inicializarGraficoEvolucion() {
    const ctx = document.getElementById('graficoEvolucion');
    if (!ctx) return;
    
    const gradiente = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradiente.addColorStop(0, 'rgba(220, 38, 38, 0.2)');
    gradiente.addColorStop(1, 'rgba(220, 38, 38, 0.05)');
    
    graficoEvolucion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Gastos Acumulados (GTQ)',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: gradiente,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#dc2626',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 3,
                pointRadius: window.innerWidth > 768 ? 6 : 4,
                pointHoverRadius: window.innerWidth > 768 ? 8 : 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: window.innerWidth > 640,
                    position: 'top',
                    labels: { 
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: window.innerWidth > 768 ? 14 : 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#dc2626',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Gastos: ${formatearMoneda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatearMonedaCorta(value);
                        },
                        font: {
                            size: window.innerWidth > 768 ? 12 : 10
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        font: {
                            size: window.innerWidth > 768 ? 12 : 10
                        }
                    }
                }
            }
        }
    });
    
    await actualizarGraficoEvolucion();
}

async function inicializarGraficoCategorias() {
    const ctx = document.getElementById('graficoCategorias');
    if (!ctx) return;
    
    graficoCategorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sin datos'],
            datasets: [{
                data: [1],
                backgroundColor: ['#e5e7eb'],
                borderWidth: 0,
                cutout: '60%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: window.innerWidth > 768 ? 'right' : 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: window.innerWidth > 768 ? 20 : 10,
                        font: {
                            size: window.innerWidth > 768 ? 12 : 10
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const dataset = data.datasets[0];
                                    const value = dataset.data[i];
                                    const total = dataset.data.reduce((sum, val) => sum + val, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: dataset.backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${formatearMoneda(context.parsed)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    await actualizarGraficoCategorias();
}

async function inicializarGraficoComparativo() {
    const ctx = document.getElementById('graficoComparativo');
    if (!ctx) return;
    
    const graficoComparativo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datosGastos.estadisticas.tendenciaMensual.map(t => t.mes),
            datasets: [{
                label: 'Gastos Mensuales (GTQ)',
                data: datosGastos.estadisticas.tendenciaMensual.map(t => t.total),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            return `Gastos: ${formatearMoneda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatearMonedaCorta(value);
                        }
                    }
                }
            }
        }
    });
    
    // Guardar referencia
    window.graficoComparativo = graficoComparativo;
}

async function actualizarGraficoEvolucion() {
    if (!graficoEvolucion) return;
    
    const gastos = obtenerTodosLosGastos();
    const datos30Dias = obtenerDatosUltimos30Dias(gastos);
    
    graficoEvolucion.data.labels = datos30Dias.labels;
    graficoEvolucion.data.datasets[0].data = datos30Dias.acumulados;
    graficoEvolucion.update('none');
}

async function actualizarGraficoCategorias() {
    if (!graficoCategorias) return;
    
    const desglose = datosGastos.estadisticas.desgloseCategorias;
    
    if (!desglose || Object.keys(desglose).length === 0) {
        graficoCategorias.data.labels = ['Sin datos'];
        graficoCategorias.data.datasets[0].data = [1];
        graficoCategorias.data.datasets[0].backgroundColor = ['#e5e7eb'];
        graficoCategorias.update('none');
        return;
    }
    
    const sortedData = Object.entries(desglose)
        .sort((a, b) => b[1].total - a[1].total);
    
    const labels = sortedData.map(([id]) => {
        const categoria = datosGastos.categorias.get(id) || categoriasGastos[id];
        return categoria ? categoria.nombre : id;
    });
    
    const datos = sortedData.map(([, data]) => data.total);
    const colores = sortedData.map(([id]) => {
        const categoria = datosGastos.categorias.get(id) || categoriasGastos[id];
        return categoria ? categoria.color : '#6b7280';
    });
    
    graficoCategorias.data.labels = labels;
    graficoCategorias.data.datasets[0].data = datos;
    graficoCategorias.data.datasets[0].backgroundColor = colores;
    graficoCategorias.update('none');
}

function obtenerDatosUltimos30Dias(gastos) {
    const hoy = new Date();
    const labels = [];
    const acumulados = [];
    let acumulado = 0;
    
    // Crear array de los últimos 30 días
    for (let i = 29; i >= 0; i--) {
        const fecha = new Date(hoy.getTime() - (i * 24 * 60 * 60 * 1000));
        const fechaStr = fecha.toISOString().split('T')[0];
        
        // Buscar gastos de este día
        const gastosDelDia = gastos.filter(gasto => gasto.date === fechaStr);
        const totalDia = gastosDelDia.reduce((suma, gasto) => suma + gasto.amount, 0);
        acumulado += totalDia;
        
        // Agregar punto cada 5 días para evitar saturar el gráfico
        if (i % 5 === 0 || i === 0) {
            if (i === 0) {
                labels.push('Hoy');
            } else if (i <= 7) {
                labels.push(`${i}d`);
            } else {
                labels.push(`${i}d`);
            }
            acumulados.push(acumulado);
        }
    }
    
    return { labels, acumulados };
}

// ==========================================
// EVENTOS Y FORMULARIOS COMPLETOS
// ==========================================

async function configurarEventos() {
    try {
        // Configurar fecha por defecto
        const fechaInput = document.getElementById('fechaGasto');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }

        // Botones principales
        configurarBotonesPrincipales();
        
        // Filtros
        configurarFiltros();
        
        // Formularios
        configurarFormularios();
        
        // Atajos de teclado
        configurarAtajosTeclado();
        
        // Eventos personalizados del sistema
        configurarEventosPersonalizados();
        
        console.log('✅ Todos los eventos configurados correctamente');
        
    } catch (error) {
        console.error('Error configurando eventos:', error);
    }
}

function configurarBotonesPrincipales() {
    const botones = [
        { id: 'btnNuevoGasto', accion: mostrarFormularioGasto },
        { id: 'btnPresupuestos', accion: () => accionRapida('presupuesto') },
        { id: 'btnExportar', accion: exportarReporte },
        { id: 'btnGuardarGasto', accion: guardarGastoRapido },
        { id: 'accionNuevoGasto', accion: mostrarFormularioGasto },
        { id: 'accionPresupuesto', accion: () => accionRapida('presupuesto') },
        { id: 'accionReporte', accion: exportarReporte },
        { id: 'accionSincronizar', accion: () => window.location.reload() }
    ];
    
    botones.forEach(({ id, accion }) => {
        const boton = document.getElementById(id);
        if (boton) {
            boton.addEventListener('click', (e) => {
                e.preventDefault();
                accion();
            });
        }
    });
}

function configurarFiltros() {
    const filtros = [
        { id: 'btnAplicarFiltros', accion: aplicarFiltros },
        { id: 'btnLimpiarFiltros', accion: limpiarFiltros }
    ];
    
    filtros.forEach(({ id, accion }) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('click', accion);
        }
    });
    
    // Auto-aplicar filtros al cambiar selects
    const selectsFiltros = ['filtroPeriodo', 'filtroCategoria', 'filtroEstado'];
    selectsFiltros.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                // Aplicar filtros con debounce
                clearTimeout(select.filterTimeout);
                select.filterTimeout = setTimeout(aplicarFiltros, 300);
            });
        }
    });
}

function configurarFormularios() {
    // Eventos de formulario rápido
    const camposFormularioRapido = ['categoriaGasto', 'conceptoGasto', 'montoGasto'];
    camposFormularioRapido.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    guardarGastoRapido();
                }
            });
            
            // Validaciones en tiempo real
            input.addEventListener('input', validarCampoTiempoReal);
        }
    });
    
    // Validación especial para el campo de monto
    const montoInput = document.getElementById('montoGasto');
    if (montoInput) {
        montoInput.addEventListener('input', (e) => {
            // Solo permitir números y punto decimal
            let valor = e.target.value.replace(/[^0-9.]/g, '');
            
            // Evitar múltiples puntos decimales
            const partes = valor.split('.');
            if (partes.length > 2) {
                valor = partes[0] + '.' + partes.slice(1).join('');
            }
            
            e.target.value = valor;
            validarCampoTiempoReal(e);
        });
    }
}

function validarCampoTiempoReal(e) {
    const campo = e.target;
    const valor = campo.value.trim();
    
    // Remover clases de validación previas
    campo.classList.remove('campo-valido', 'campo-invalido');
    
    let esValido = true;
    
    switch (campo.id) {
        case 'categoriaGasto':
            esValido = valor !== '';
            break;
        case 'conceptoGasto':
            esValido = valor.length >= 3;
            break;
        case 'montoGasto':
            const monto = parseFloat(valor);
            esValido = !isNaN(monto) && monto > 0;
            break;
    }
    
    // Aplicar clase de validación
    campo.classList.add(esValido ? 'campo-valido' : 'campo-invalido');
    
    // Habilitar/deshabilitar botón guardar
    verificarFormularioCompleto();
}

function verificarFormularioCompleto() {
    const btnGuardar = document.getElementById('btnGuardarGasto');
    if (!btnGuardar) return;
    
    const camposRequeridos = ['categoriaGasto', 'conceptoGasto', 'montoGasto'];
    const todosValidos = camposRequeridos.every(id => {
        const campo = document.getElementById(id);
        return campo && campo.classList.contains('campo-valido');
    });
    
    btnGuardar.disabled = !todosValidos;
    btnGuardar.classList.toggle('btn-disabled', !todosValidos);
}

function configurarAtajosTeclado() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: Nuevo gasto
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            mostrarFormularioGasto();
        }
        
        // Ctrl/Cmd + E: Exportar
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportarReporte();
        }
        
        // Ctrl/Cmd + F: Focus en búsqueda (si existe)
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            const searchInput = document.getElementById('busquedaGastos');
            if (searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        }
        
        // F5: Refrescar datos
        if (e.key === 'F5') {
            e.preventDefault();
            refrescarDatos();
        }
    });
}

function configurarEventosPersonalizados() {
    // Escuchar eventos de otros sistemas
    window.addEventListener('presupuestoActualizado', (e) => {
        console.log('💰 Presupuesto actualizado, recalculando...');
        calcularEstadisticas().then(() => {
            actualizarInterfazFinanciera();
        });
    });
    
    window.addEventListener('arbolesActualizados', (e) => {
        console.log('🌳 Árboles actualizados, recalculando costo por kg...');
        calcularCostoPorKg().then(() => {
            actualizarInterfazFinanciera();
        });
    });
    
    window.addEventListener('offline', () => {
        mostrarNotificacion('Modo offline activado', 'warning');
    });
    
    window.addEventListener('online', () => {
        mostrarNotificacion('Conexión restablecida', 'success');
        refrescarDatos();
    });
}

async function refrescarDatos() {
    try {
        mostrarNotificacion('Actualizando datos...', 'info');
        
        await cargarDatosReales();
        
        // Actualizar gráficos
        if (graficoEvolucion) await actualizarGraficoEvolucion();
        if (graficoCategorias) await actualizarGraficoCategorias();
        
        mostrarNotificacion('Datos actualizados correctamente', 'success');
        
    } catch (error) {
        console.error('Error refrescando datos:', error);
        mostrarNotificacion('Error al actualizar datos', 'error');
    }
}

// ==========================================
// FUNCIONES DE INTERFAZ DE USUARIO AVANZADAS
// ==========================================

function mostrarFormularioGasto() {
    console.log('📝 Abriendo formulario de nuevo gasto...');
    
    // Verificar si ya hay un modal abierto
    if (document.querySelector('.modal-overlay')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = generarHTMLFormularioGasto();
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    
    // Configurar eventos del modal
    configurarEventosModal(modal);
    
    // Focus en el primer campo después de la animación
    setTimeout(() => {
        const firstInput = modal.querySelector('#modalCategoria');
        if (firstInput) firstInput.focus();
    }, 100);
}

function generarHTMLFormularioGasto() {
    const categoriasOptions = Object.entries(categoriasGastos)
        .map(([id, cat]) => `<option value="${id}">${cat.nombre}</option>`)
        .join('');
    
    return `
        <div class="modal-content formulario-gasto-modal">
            <div class="modal-header">
                <h2><i class="fas fa-plus-circle"></i> Nuevo Gasto</h2>
                <button class="btn-close" onclick="cerrarModal()" title="Cerrar (ESC)">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="formNuevoGasto" class="formulario-gasto">
                    <div class="formulario-grid">
                        
                        <div class="campo-grupo">
                            <label for="modalFecha" class="campo-label">
                                <i class="fas fa-calendar-alt"></i>
                                Fecha del Gasto
                            </label>
                            <input type="date" id="modalFecha" class="form-input" 
                                   value="${new Date().toISOString().split('T')[0]}" required>
                            <div class="campo-ayuda">Fecha en que se realizó el gasto</div>
                        </div>
                        
                        <div class="campo-grupo">
                            <label for="modalCategoria" class="campo-label">
                                <i class="fas fa-tags"></i>
                                Categoría *
                            </label>
                            <select id="modalCategoria" class="form-input" required>
                                <option value="">Seleccionar categoría...</option>
                                ${categoriasOptions}
                            </select>
                            <div class="campo-ayuda">Tipo de gasto para mejor organización</div>
                        </div>
                        
                        <div class="campo-grupo campo-full">
                            <label for="modalConcepto" class="campo-label">
                                <i class="fas fa-file-text"></i>
                                Concepto / Descripción *
                            </label>
                            <input type="text" id="modalConcepto" class="form-input" 
                                   placeholder="Ej: Fertilizante para sector A, Pago jornaleros cosecha..." 
                                   maxlength="200" required>
                            <div class="campo-ayuda">Descripción detallada del gasto (máx. 200 caracteres)</div>
                        </div>
                        
                        <div class="campo-grupo">
                            <label for="modalMonto" class="campo-label">
                                <i class="fas fa-dollar-sign"></i>
                                Monto (GTQ) *
                            </label>
                            <input type="number" id="modalMonto" class="form-input" 
                                   step="0.01" min="0.01" placeholder="0.00" required>
                            <div class="campo-ayuda">Cantidad gastada en quetzales</div>
                        </div>
                        
                        <div class="campo-grupo">
                            <label for="modalEstado" class="campo-label">
                                <i class="fas fa-check-circle"></i>
                                Estado del Pago
                            </label>
                            <select id="modalEstado" class="form-input" required>
                                <option value="pagado">✅ Pagado</option>
                                <option value="pendiente">⏳ Pendiente</option>
                            </select>
                            <div class="campo-ayuda">Si ya se pagó o está pendiente</div>
                        </div>
                        
                        <div class="campo-grupo">
                            <label for="modalMetodoPago" class="campo-label">
                                <i class="fas fa-credit-card"></i>
                                Método de Pago
                            </label>
                            <select id="modalMetodoPago" class="form-input">
                                <option value="efectivo">💵 Efectivo</option>
                                <option value="transferencia">🏦 Transferencia</option>
                                <option value="cheque">📝 Cheque</option>
                                <option value="tarjeta">💳 Tarjeta</option>
                            </select>
                            <div class="campo-ayuda">Forma de pago utilizada</div>
                        </div>
                        
                    </div>
                    
                    <div class="resumen-gasto" id="resumenGasto" style="display: none;">
                        <h4><i class="fas fa-info-circle"></i> Resumen del Gasto</h4>
                        <div id="resumenContenido"></div>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer">
                <button type="button" onclick="cerrarModal()" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="button" onclick="guardarGastoModal()" class="btn btn-primary" id="btnGuardarModal">
                    <i class="fas fa-save"></i> Guardar Gasto
                </button>
            </div>
        </div>
    `;
}

function configurarEventosModal(modal) {
    // Cerrar con ESC
    const closeWithEsc = (e) => {
        if (e.key === 'Escape') {
            cerrarModal();
            document.removeEventListener('keydown', closeWithEsc);
        }
    };
    document.addEventListener('keydown', closeWithEsc);

    // Cerrar al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    });
    
    // Validación en tiempo real en el modal
    const campos = ['modalCategoria', 'modalConcepto', 'modalMonto'];
    campos.forEach(id => {
        const campo = modal.querySelector(`#${id}`);
        if (campo) {
            campo.addEventListener('input', validarFormularioModal);
            campo.addEventListener('blur', validarFormularioModal);
        }
    });
    
    // Actualizar resumen automáticamente
    campos.forEach(id => {
        const campo = modal.querySelector(`#${id}`);
        if (campo) {
            campo.addEventListener('input', actualizarResumenModal);
        }
    });
}

function validarFormularioModal() {
    const categoria = document.getElementById('modalCategoria')?.value;
    const concepto = document.getElementById('modalConcepto')?.value.trim();
    const monto = parseFloat(document.getElementById('modalMonto')?.value);
    
    const btnGuardar = document.getElementById('btnGuardarModal');
    if (!btnGuardar) return;
    
    const esValido = categoria && concepto.length >= 3 && !isNaN(monto) && monto > 0;
    
    btnGuardar.disabled = !esValido;
    btnGuardar.classList.toggle('btn-disabled', !esValido);
}

function actualizarResumenModal() {
    const categoria = document.getElementById('modalCategoria')?.value;
    const concepto = document.getElementById('modalConcepto')?.value.trim();
    const monto = parseFloat(document.getElementById('modalMonto')?.value);
    const estado = document.getElementById('modalEstado')?.value;
    
    const resumen = document.getElementById('resumenGasto');
    const contenido = document.getElementById('resumenContenido');
    
    if (!categoria || !concepto || isNaN(monto) || monto <= 0) {
        if (resumen) resumen.style.display = 'none';
        return;
    }
    
    const categoriaInfo = categoriasGastos[categoria];
    const limite = obtenerLimitePresupuesto();
    const porcentajeDelLimite = (monto / limite) * 100;
    
    if (resumen && contenido) {
        resumen.style.display = 'block';
        contenido.innerHTML = `
            <div class="resumen-item">
                <strong>Categoría:</strong> ${categoriaInfo?.nombre || categoria}
            </div>
            <div class="resumen-item">
                <strong>Monto:</strong> ${formatearMoneda(monto)}
                <span class="resumen-meta">(${porcentajeDelLimite.toFixed(1)}% del presupuesto)</span>
            </div>
            <div class="resumen-item">
                <strong>Estado:</strong> 
                <span class="estado-badge ${estado}">${estado}</span>
            </div>
            ${porcentajeDelLimite > 10 ? `
                <div class="resumen-alerta">
                    <i class="fas fa-exclamation-triangle"></i>
                    Este gasto representa más del 10% de tu presupuesto mensual
                </div>
            ` : ''}
        `;
    }
}

// ==========================================
// FUNCIONES DE CIERRE Y UTILIDADES FINALES
// ==========================================

function cerrarModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal && modal.parentNode) {
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        document.body.style.overflow = ''; // Restaurar scroll del body
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 200);
    }
}

async function guardarGastoModal() {
    console.log('💰 Guardando gasto desde modal...');
    
    const btnGuardar = document.getElementById('btnGuardarModal');
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }
    
    try {
        const datos = {
            fecha: document.getElementById('modalFecha')?.value,
            categoria: document.getElementById('modalCategoria')?.value,
            concepto: document.getElementById('modalConcepto')?.value.trim(),
            monto: parseFloat(document.getElementById('modalMonto')?.value),
            estado: document.getElementById('modalEstado')?.value || 'pagado',
            metodoPago: document.getElementById('modalMetodoPago')?.value || 'efectivo'
        };
        
        // Validaciones finales
        const errores = validarDatosGasto(datos);
        if (errores.length > 0) {
            throw new Error(errores.join(', '));
        }
        
        // Crear gasto
        const gastoCreado = await crearGastoConFirebase(datos);
        
        // Actualizar estadísticas e interfaz
        await calcularEstadisticas();
        actualizarInterfazFinanciera();
        
        // Actualizar gráficos
        if (graficoEvolucion) await actualizarGraficoEvolucion();
        if (graficoCategorias) await actualizarGraficoCategorias();
        
        // Cerrar modal
        cerrarModal();
        
        // Mostrar éxito
        mostrarNotificacion(`💰 Gasto de ${formatearMoneda(datos.monto)} registrado correctamente`, 'success');
        
        console.log('✅ Gasto guardado exitosamente:', gastoCreado);
        
    } catch (error) {
        console.error('Error guardando gasto desde modal:', error);
        mostrarNotificacion(`Error al registrar el gasto: ${error.message}`, 'error');
        
        // Restaurar botón
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Gasto';
        }
    }
}

// Funciones adicionales necesarias...
function formatearMonedaCorta(valor) {
    if (valor >= 1000000) {
        return `Q${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
        return `Q${(valor / 1000).toFixed(1)}K`;
    }
    return `Q${valor.toFixed(0)}`;
}

function generarIdGasto() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `GASTO_${timestamp}_${random}`.toUpperCase();
}

function obtenerUsuarioActual() {
    return authManager?.currentUser?.uid || 'usuario_anonimo';
}

function dispatchSystemEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, {
        detail: { ...data, timestamp: Date.now(), source: 'gastosManager' }
    }));
}

function formatearMoneda(amount) {
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

function esReciente(timestamp, minutosMaximos) {
    const ahora = new Date();
    const fechaTimestamp = new Date(timestamp);
    const diferencia = (ahora - fechaTimestamp) / (1000 * 60);
    return diferencia <= minutosMaximos;
}

// ==========================================
// FUNCIONES FALTANTES DE INTERFAZ
// ==========================================

async function guardarGastoRapido() {
    console.log('💰 Guardando gasto rápido...');
    
    const btnGuardar = document.getElementById('btnGuardarGasto');
    if (btnGuardar) {
        btnGuardar.disabled = true;
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        try {
            const datos = {
                fecha: document.getElementById('fechaGasto')?.value,
                categoria: document.getElementById('categoriaGasto')?.value,
                concepto: document.getElementById('conceptoGasto')?.value,
                monto: parseFloat(document.getElementById('montoGasto')?.value),
                estado: document.getElementById('estadoGasto')?.value || 'pagado'
            };
            
            const errores = validarDatosGasto(datos);
            if (errores.length > 0) {
                throw new Error(errores.join(', '));
            }
            
            await crearGastoConFirebase(datos);
            
            await calcularEstadisticas();
            actualizarInterfazFinanciera();
            
            if (graficoEvolucion) await actualizarGraficoEvolucion();
            if (graficoCategorias) await actualizarGraficoCategorias();
            
            // Limpiar formulario
            ['fechaGasto', 'categoriaGasto', 'conceptoGasto', 'montoGasto', 'estadoGasto'].forEach(id => {
                const campo = document.getElementById(id);
                if (campo) {
                    if (id === 'fechaGasto') {
                        campo.value = new Date().toISOString().split('T')[0];
                    } else if (id === 'estadoGasto') {
                        campo.value = 'pagado';
                    } else {
                        campo.value = '';
                    }
                    campo.classList.remove('campo-valido', 'campo-invalido');
                }
            });
            
            mostrarNotificacion(`💰 Gasto de ${formatearMoneda(datos.monto)} registrado correctamente`, 'success');
            
            setTimeout(() => {
                const firstInput = document.getElementById('categoriaGasto');
                if (firstInput) firstInput.focus();
            }, 100);
            
        } catch (error) {
            console.error('Error guardando gasto rápido:', error);
            mostrarNotificacion(`Error: ${error.message}`, 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = textoOriginal;
        }
    }
}

function exportarReporte() {
    console.log('📊 Generando reporte de gastos...');
    
    try {
        const now = new Date();
        const gastos = obtenerTodosLosGastos();
        
        const reporte = {
            fecha_generacion: now.toISOString(),
            finca: 'La Herradura',
            periodo: 'Completo',
            resumen_financiero: {
                total_mes: datosGastos.estadisticas.totalMes,
                total_año: datosGastos.estadisticas.totalAno,
                total_gastos: gastos.length,
                costo_promedio: gastos.length > 0 ? datosGastos.estadisticas.totalMes / gastos.length : 0,
                costo_por_kg: datosGastos.estadisticas.costoPorKg || 0
            },
            gastos_detallados: gastos,
            categorias: Object.fromEntries(datosGastos.categorias),
            estadisticas_por_categoria: datosGastos.estadisticas.desgloseCategorias,
            tendencia_mensual: datosGastos.estadisticas.tendenciaMensual,
            presupuesto: presupuestoManager?.configuracion || window.configuracionPresupuesto || null,
            metadatos: {
                generado_por: obtenerUsuarioActual(),
                version_sistema: '2.0',
                timestamp: now.getTime(),
                con_firebase: !!firebaseManager?.initialized,
                modo_offline: !navigator.onLine
            }
        };
        
        // Crear archivo JSON
        const dataStr = JSON.stringify(reporte, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Crear link de descarga
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_gastos_finca_la_herradura_${now.toISOString().split('T')[0]}.json`;
        link.style.display = 'none';
        
        // Trigger descarga
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        mostrarNotificacion('📊 Reporte exportado correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando reporte:', error);
        mostrarNotificacion(`Error al exportar: ${error.message}`, 'error');
    }
}

function aplicarFiltros() {
    console.log('🔍 Aplicando filtros de gastos...');
    
    try {
        const filtros = {};
        
        // Obtener valores de filtros
        const periodo = document.getElementById('filtroPeriodo')?.value;
        const categoria = document.getElementById('filtroCategoria')?.value;
        const estado = document.getElementById('filtroEstado')?.value;
        const busqueda = document.getElementById('busquedaGastos')?.value?.trim();
        
        if (categoria) filtros.category = categoria;
        if (estado) filtros.status = estado;
        if (busqueda) filtros.searchTerm = busqueda;
        
        // Aplicar filtro de período
        if (periodo && periodo !== 'todos') {
            const now = new Date();
            const rangos = {
                hoy: {
                    start: now.toISOString().split('T')[0],
                    end: now.toISOString().split('T')[0]
                },
                semana: {
                    start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: now.toISOString().split('T')[0]
                },
                mes: {
                    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
                    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
                },
                trimestre: {
                    start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0],
                    end: new Date(now.getFullYear(), (Math.floor(now.getMonth() / 3) + 1) * 3, 0).toISOString().split('T')[0]
                },
                ano: {
                    start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
                    end: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
                }
            };
            
            if (rangos[periodo]) {
                filtros.startDate = rangos[periodo].start;
                filtros.endDate = rangos[periodo].end;
            }
        }
        
        const gastosFiltrados = obtenerTodosLosGastos(filtros);
        actualizarTablaConDatos(gastosFiltrados);
        
        const totalFiltrado = gastosFiltrados.reduce((sum, gasto) => sum + gasto.amount, 0);
        mostrarNotificacion(`🔍 ${gastosFiltrados.length} gastos encontrados (${formatearMoneda(totalFiltrado)})`, 'info');
        
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        mostrarNotificacion(`Error en filtros: ${error.message}`, 'error');
    }
}

function limpiarFiltros() {
    console.log('🧹 Limpiando filtros de gastos...');
    
    const filtros = ['filtroPeriodo', 'filtroCategoria', 'filtroEstado', 'busquedaGastos'];
    filtros.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (id === 'filtroPeriodo') {
                elemento.value = 'mes';
            } else {
                elemento.value = '';
            }
        }
    });
    
    actualizarTablaGastos();
    mostrarNotificacion('🧹 Filtros limpiados', 'info');
}

function accionRapida(accion) {
    console.log('⚡ Ejecutando acción rápida:', accion);
    
    switch(accion) {
        case 'nuevo-gasto':
            mostrarFormularioGasto();
            break;
        case 'presupuesto':
            if (presupuestoManager?.mostrarGestion) {
                presupuestoManager.mostrarGestion();
            } else {
                mostrarNotificacion('Sistema de presupuestos cargando...', 'info');
            }
            break;
        case 'reporte':
            exportarReporte();
            break;
        default:
            mostrarNotificacion(`Acción "${accion}" no implementada`, 'warning');
    }
}

function editarGasto(id) {
    mostrarNotificacion('🔧 Función de edición próximamente disponible', 'info');
}

function eliminarGasto(id) {
    if (!confirm('¿Está seguro de que desea eliminar este gasto?')) return;
    
    try {
        const gasto = datosGastos.gastos.get(id);
        if (gasto) {
            gasto.active = false;
            gasto.deletedAt = new Date().toISOString();
            
            calcularEstadisticas().then(() => {
                actualizarInterfazFinanciera();
                if (graficoEvolucion) actualizarGraficoEvolucion();
                if (graficoCategorias) actualizarGraficoCategorias();
                mostrarNotificacion('🗑️ Gasto eliminado correctamente', 'success');
            });
        }
    } catch (error) {
        console.error('Error eliminando gasto:', error);
        mostrarNotificacion(`Error al eliminar: ${error.message}`, 'error');
    }
}

// ==========================================
// SISTEMA DE NOTIFICACIONES MEJORADO
// ==========================================

function mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="${iconMap[tipo] || iconMap.info}"></i>
            </div>
            <div class="notification-message">${mensaje}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Contenedor de notificaciones
    let container = document.getElementById('notificaciones-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificaciones-container';
        container.className = 'notificaciones-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
        notification.classList.add('notification-visible');
    }, 10);
    
    // Auto-remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('notification-visible');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, duracion);
}

// ==========================================
// EXPORTACIÓN GLOBAL FINAL
// ==========================================

// Exponer funciones globalmente
window.sistemaGastos = sistemaGastos;
window.datosGastos = datosGastos;
window.mostrarFormularioGasto = mostrarFormularioGasto;
window.guardarGastoRapido = guardarGastoRapido;
window.guardarGastoModal = guardarGastoModal;
window.exportarReporte = exportarReporte;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.accionRapida = accionRapida;
window.cerrarModal = cerrarModal;
window.editarGasto = editarGasto;
window.eliminarGasto = eliminarGasto;
window.filtrarPorCategoria = filtrarPorCategoria;

// Función API para otros módulos
window.obtenerDatosGastos = function() {
    return {
        gastos: Array.from(datosGastos.gastos.values()),
        categorias: Object.fromEntries(datosGastos.categorias),
        estadisticas: datosGastos.estadisticas,
        inicializado: sistemaGastos.inicializado
    };
};

// Función para actualizar desde otros módulos
window.actualizarGastos = () => {
    calcularEstadisticas().then(() => {
        actualizarInterfazFinanciera();
        if (graficoEvolucion) actualizarGraficoEvolucion();
        if (graficoCategorias) actualizarGraficoCategorias();
    });
};

// Manejo de errores globales
window.addEventListener('error', (event) => {
    if (event.error && event.error.message.includes('Chart')) {
        console.warn('⚠️ Error de Chart.js ignorado');
        return;
    }
    console.error('❌ Error global en gastos:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada en gastos:', event.reason);
});

console.log('💰 Sistema de gastos JavaScript vanilla COMPLETO cargado');
console.log('📍 Optimizado para Finca La Herradura, Guatemala');
console.log('🔗 100% integrado con archivos base, responsive y datos REALES únicamente');
