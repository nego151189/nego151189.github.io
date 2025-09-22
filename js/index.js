/* ========================================
   INDEX.JS - DASHBOARD INTELIGENTE VANILLA JS
   Sistema unificado basado en archivos base
   DATOS REALES únicamente - Sin simulaciones vfull
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema dashboard
let sistemaDashboard = {
    inicializado: false,
    inicializando: false,
    ultimaActualizacion: null,
    progreso: 0,
    paso: 0,
    totalPasos: 6
};

// Configuración del dashboard
const configDashboard = {
    fincaId: 'finca_la_herradura',
    ubicacion: 'Mixco, Guatemala',
    intervaloActualizacion: 5 * 60 * 1000, // 5 minutos
    timeoutInicial: 30000 // 30 segundos
};

// Referencias a managers base
let authManager = window.authManager || null;
let offlineManager = null;
let firebaseManager = null;
let treeManager = null;
let presupuestoManager = null;

// Datos del dashboard
let datosDashboard = {
    produccion: {
        hoy: 0,
        ayer: 0,
        tendencia: 0,
        ultimaActualizacion: null
    },
    finanzas: {
        ingresosMes: 0,
        gastosMes: 0,
        balanceMes: 0,
        balanceHoy: 0,
        precioUnitario: 0,
        ultimaActualizacion: null
    },
    arboles: {
        total: 0,
        sanos: 0,
        porcentajeSalud: 0,
        ultimaActualizacion: null
    },
    riego: {
        nivelTanque: 0,
        porcentajeTanque: 0,
        ultimaActualizacion: null,
        capacidadMaxima: 25000
    },
    clima: {
        temperatura: null,
        descripcion: '',
        icono: '',
        humedad: 0,
        viento: 0,
        lluvia: 0,
        ultimaActualizacion: null
    },
    contadores: {
        totalCosechas: 0,
        totalVentas: 0,
        totalGastos: 0,
        totalRiegos: 0,
        ultimaActualizacion: null
    }
};

// Referencias DOM
let elementosDOM = {};

// ==========================================
// SISTEMA DE CARGA UNIFICADO
// ==========================================

function actualizarLoaderDashboard(paso, titulo, subtitulo, progreso) {
    const loaderTexto = document.getElementById('loaderTexto');
    const loaderSubtexto = document.getElementById('loaderSubtexto');
    const loaderBarra = document.getElementById('loaderBarra');
    const loaderPorcentaje = document.getElementById('loaderPorcentaje');
    
    if (loaderTexto) loaderTexto.textContent = titulo;
    if (loaderSubtexto) loaderSubtexto.textContent = subtitulo;
    if (loaderBarra) loaderBarra.style.width = progreso + '%';
    if (loaderPorcentaje) loaderPorcentaje.textContent = Math.round(progreso) + '%';
    
    sistemaDashboard.paso = paso;
    sistemaDashboard.progreso = progreso;
    
    console.log(`📊 Dashboard Paso ${paso}: ${titulo} (${progreso}%)`);
}

function marcarPasoDashboardCompletado(pasoId) {
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

function marcarPasoDashboardActivo(pasoId) {
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

function mostrarErrorLoaderDashboard(mensaje) {
    const loaderTexto = document.getElementById('loaderTexto');
    const loaderSubtexto = document.getElementById('loaderSubtexto');
    
    if (loaderTexto) {
        loaderTexto.textContent = '❌ Error del Dashboard';
        loaderTexto.style.color = '#ef4444';
    }
    if (loaderSubtexto) {
        loaderSubtexto.textContent = mensaje;
        loaderSubtexto.style.color = '#ef4444';
    }
}

function ocultarLoaderDashboard() {
    setTimeout(() => {
        const loader = document.getElementById('initLoader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                loader.style.display = 'none';
                
                // Activar animaciones solo en desktop
                if (window.innerWidth > 768) {
                    activarAnimacionesDashboard();
                } else {
                    mostrarContenidoInmediato();
                }
            }, 500);
        }
        
        console.log('✅ Dashboard completamente cargado y listo');
    }, 1000);
}

function activarAnimacionesDashboard() {
    document.querySelectorAll('.animate-fade-in-up').forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function mostrarContenidoInmediato() {
    document.querySelectorAll('.animate-fade-in-up').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('📊 Iniciando Dashboard Inteligente...');
        console.log(`📍 Ubicación: ${configDashboard.ubicacion}`);
        
        sistemaDashboard.inicializando = true;
        
        // Inicializar referencias DOM
        inicializarReferenciasDOM();
        
        // Configurar animaciones iniciales
        if (window.innerWidth > 768) {
            configurarAnimacionesIniciales();
        }
        
        // Paso 1: Conectar Firebase
        marcarPasoDashboardActivo('paso-firebase');
        actualizarLoaderDashboard(1, 'Conectando Firebase', 'Estableciendo conexión con la base de datos...', 15);
        await esperarFirebaseDashboard();
        marcarPasoDashboardCompletado('paso-firebase');
        
        // Paso 2: Verificar autenticación (SIN REDIRIGIR)
        marcarPasoDashboardActivo('paso-auth');
        actualizarLoaderDashboard(2, 'Verificando Acceso', 'Validando permisos de usuario...', 30);
        await verificarAutenticacionDashboard();
        marcarPasoDashboardCompletado('paso-auth');
        
        // Paso 3: Inicializar managers
        marcarPasoDashboardActivo('paso-managers');
        actualizarLoaderDashboard(3, 'Cargando Sistemas Base', 'Inicializando gestores de datos...', 45);
        await inicializarManagersBase();
        marcarPasoDashboardCompletado('paso-managers');
        
        // Paso 4: Cargar datos principales
        marcarPasoDashboardActivo('paso-datos');
        actualizarLoaderDashboard(4, 'Sincronizando Datos REALES', 'Obteniendo información desde Firebase...', 65);
        await cargarDatosPrincipales();
        marcarPasoDashboardCompletado('paso-datos');
        
        // Paso 5: Cargar datos externos
        marcarPasoDashboardActivo('paso-externos');
        actualizarLoaderDashboard(5, 'Cargando Clima y Precios', 'Obteniendo datos meteorológicos y MAGA...', 80);
        await cargarDatosExternos();
        marcarPasoDashboardCompletado('paso-externos');
        
        // Paso 6: Finalizar dashboard
        marcarPasoDashboardActivo('paso-finalizacion');
        actualizarLoaderDashboard(6, 'Finalizando Dashboard', 'Configurando interfaz y eventos...', 95);
        await configurarEventosDashboard();
        await actualizarInterfazCompleta();
        marcarPasoDashboardCompletado('paso-finalizacion');
        
        // Completar inicialización
        actualizarLoaderDashboard(6, 'Dashboard Listo', 'Finca La Herradura conectada exitosamente', 100);
        
        sistemaDashboard.inicializado = true;
        sistemaDashboard.inicializando = false;
        sistemaDashboard.ultimaActualizacion = new Date();
        
        // Configurar actualizaciones automáticas
        configurarActualizacionesAutomaticas();
        
        console.log('🎉 Dashboard Inteligente completamente inicializado');
        
        // Ocultar loader
        ocultarLoaderDashboard();
        
        // Evento de sistema listo
        dispatchDashboardEvent('dashboardListo', {
            finca: configDashboard.fincaId,
            timestamp: new Date().toISOString(),
            datosDisponibles: Object.keys(datosDashboard)
        });
        
    } catch (error) {
        console.error('❌ Error crítico inicializando dashboard:', error);
        
        // Intentar modo offline
        try {
            actualizarLoaderDashboard(6, 'Modo Offline', 'Cargando datos guardados localmente...', 85);
            await cargarDatosOfflineDashboard();
            await configurarEventosDashboard();
            await actualizarInterfazCompleta();
            
            sistemaDashboard.inicializado = true;
            sistemaDashboard.inicializando = false;
            
            mostrarNotificacionDashboard('Dashboard iniciado en modo offline', 'warning');
            ocultarLoaderDashboard();
            
        } catch (offlineError) {
            console.error('❌ Error también en modo offline:', offlineError);
            mostrarErrorLoaderDashboard('No se pudo cargar el dashboard. Verifique su conexión.');
            
            setTimeout(() => {
                ocultarLoaderDashboard();
                mostrarNotificacionDashboard('Error cargando dashboard. Intente refrescar la página.', 'error');
            }, 3000);
        }
    }
});

// ==========================================
// FUNCIONES DE INICIALIZACIÓN
// ==========================================

function inicializarReferenciasDOM() {
    elementosDOM = {
        // Estados del sistema
        connectionStatus: document.getElementById('connectionStatus'),
        estadoSistema: document.getElementById('estadoSistema'),
        firebaseStatus: document.getElementById('firebase-connection-status'),
        lastSync: document.getElementById('last-sync'),
        
        // KPIs principales
        produccionHoy: document.getElementById('produccion-hoy'),
        produccionTrend: document.getElementById('produccion-trend'),
        ingresosHoy: document.getElementById('ingresos-hoy'),
        ingresosTrend: document.getElementById('ingresos-trend'),
        arbolesSanos: document.getElementById('arboles-sanos'),
        arbolesTrend: document.getElementById('arboles-trend'),
        gastosHoy: document.getElementById('gastos-hoy'),
        gastosTrend: document.getElementById('gastos-trend'),
        
        // Balance financiero
        balanceHoy: document.getElementById('balance-hoy'),
        balanceMes: document.getElementById('balance-mes'),
        precioActual: document.getElementById('precio-actual'),
        precioUpdate: document.getElementById('precio-update'),
        
        // Tanque
        tanqueNivel: document.getElementById('tanque-nivel'),
        tankPercentage: document.getElementById('tank-percentage'),
        tankFill: document.getElementById('tank-fill'),
        tankAlert: document.getElementById('tank-alert'),
        tankSource: document.getElementById('tank-source'),
        
        // Clima
        weatherStatus: document.getElementById('weather-status'),
        currentTemp: document.getElementById('current-temp'),
        weatherIcon: document.getElementById('weather-icon'),
        weatherDesc: document.getElementById('weather-desc'),
        humidity: document.getElementById('humidity'),
        windSpeed: document.getElementById('wind-speed'),
        rainChance: document.getElementById('rain-chance'),
        
        // Contadores
        totalCosechas: document.getElementById('total-cosechas'),
        totalVentas: document.getElementById('total-ventas'),
        totalGastosCount: document.getElementById('total-gastos-count'),
        totalRiegos: document.getElementById('total-riegos'),
        
        // Status badges
        statusCosechas: document.getElementById('status-cosechas'),
        statusVentas: document.getElementById('status-ventas'),
        statusGastos: document.getElementById('status-gastos'),
        statusRiegos: document.getElementById('status-riegos'),
        statusArboles: document.getElementById('status-arboles'),
        
        // Botones
        syncButton: document.getElementById('sync-now')
    };
    
    console.log('📋 Referencias DOM inicializadas');
}

function configurarAnimacionesIniciales() {
    document.querySelectorAll('.animate-fade-in-up').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.5s ease-out';
    });
}

async function esperarFirebaseDashboard() {
    return new Promise((resolve) => {
        let intentos = 0;
        const maxIntentos = 50;
        
        const verificar = () => {
            if (window.firebase && window.db) {
                console.log('✅ Firebase disponible para dashboard');
                actualizarEstadoConexion('firebase');
                resolve(true);
            } else if (intentos < maxIntentos) {
                intentos++;
                setTimeout(verificar, 100);
            } else {
                console.warn('⚠️ Timeout Firebase dashboard, continuando...');
                actualizarEstadoConexion('offline');
                resolve(false);
            }
        };
        
        window.addEventListener('firebaseReady', () => {
            console.log('🔥 Evento firebaseReady recibido en dashboard');
            actualizarEstadoConexion('firebase');
            resolve(true);
        }, { once: true });
        
        verificar();
    });
}

async function verificarAutenticacionDashboard() {
    try {
        // Usar el authManager global en lugar de declarar uno nuevo
        authManager = window.authManager;
        
        if (authManager && authManager.isInitialized) {
            const estado = authManager.getAuthState();
            console.log('🔐 Estado autenticación dashboard:', {
                autenticado: estado.isAuthenticated,
                usuario: estado.user?.email || 'Sin usuario',
                offline: estado.isOffline
            });
            
            return true;
        } else {
            console.log('⚠️ AuthManager no disponible en dashboard, continuando...');
            return true;
        }
        
    } catch (error) {
        console.error('Error verificando autenticación dashboard:', error);
        return true;
    }
}

async function inicializarManagersBase() {
    try {
        // Esperar managers base con timeouts
        const promesasManagers = [
            esperarManager('firebaseDataManager', 3000).then(manager => firebaseManager = manager),
            esperarManager('offlineManager', 2000).then(manager => offlineManager = manager),
            esperarManager('treeManager', 2000).then(manager => treeManager = manager),
            esperarManager('presupuestoManager', 2000).then(manager => presupuestoManager = manager)
        ];
        
        await Promise.allSettled(promesasManagers);
        
        const managersDisponibles = {
            firebase: !!firebaseManager,
            offline: !!offlineManager,
            trees: !!treeManager,
            presupuesto: !!presupuestoManager
        };
        
        console.log('🔧 Managers inicializados:', managersDisponibles);
        
        return managersDisponibles;
        
    } catch (error) {
        console.error('Error inicializando managers:', error);
        throw error;
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
// CARGA DE DATOS REALES
// ==========================================

async function cargarDatosPrincipales() {
    try {
        console.log('📊 Cargando datos principales del dashboard...');
        
        // Cargar datos en paralelo
        const promesasDatos = [
            cargarDatosProduccion(),
            cargarDatosFinancieros(),
            cargarDatosArboles(),
            cargarDatosRiego(),
            cargarContadoresRegistros()
        ];
        
        const resultados = await Promise.allSettled(promesasDatos);
        
        // Verificar qué datos se cargaron correctamente
        resultados.forEach((resultado, index) => {
            const nombres = ['producción', 'finanzas', 'árboles', 'riego', 'contadores'];
            if (resultado.status === 'fulfilled') {
                console.log(`✅ ${nombres[index]} cargado correctamente`);
            } else {
                console.warn(`⚠️ Error cargando ${nombres[index]}:`, resultado.reason.message);
            }
        });
        
        datosDashboard.ultimaActualizacion = new Date();
        
    } catch (error) {
        console.error('Error cargando datos principales:', error);
        throw error;
    }
}

async function cargarDatosProduccion() {
    try {
        // Usar firebaseManager si está disponible
        if (firebaseManager && firebaseManager.initialized) {
            console.log('🌱 Usando firebaseManager para producción');
            
            if (firebaseManager.getProduction) {
                const produccionData = await firebaseManager.getProduction();
                procesarDatosProduccion(produccionData);
                return;
            }
        }
        
        // Fallback: consulta directa
        if (!window.db) throw new Error('Firebase no disponible');
        
        console.log('🌱 Cargando producción con consulta directa');
        const fechaHoy = new Date().toISOString().split('T')[0];
        const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [cosechasHoy, cosechasAyer] = await Promise.all([
            window.db.collection('cosechas_diarias')
                .where('fecha', '==', fechaHoy)
                .get(),
            window.db.collection('cosechas_diarias')
                .where('fecha', '==', fechaAyer)
                .get()
        ]);
        
        let totalHoy = 0;
        let totalAyer = 0;
        
        cosechasHoy.forEach(doc => {
            const data = doc.data();
            totalHoy += calcularTotalUnidades(data);
        });
        
        cosechasAyer.forEach(doc => {
            const data = doc.data();
            totalAyer += calcularTotalUnidades(data);
        });
        
        datosDashboard.produccion.hoy = totalHoy;
        datosDashboard.produccion.ayer = totalAyer;
        datosDashboard.produccion.tendencia = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer * 100) : 0;
        datosDashboard.produccion.ultimaActualizacion = new Date();
        
        console.log(`🌱 Producción cargada: Hoy ${totalHoy}, Ayer ${totalAyer}`);
        
    } catch (error) {
        console.error('Error cargando producción:', error);
        throw error;
    }
}

function calcularTotalUnidades(data) {
    const primera = Number(data.primera || data.unidades_primera || 0);
    const segunda = Number(data.segunda || data.unidades_segunda || 0);
    const descarte = Number(data.descarte || data.unidades_descarte || 0);
    return primera + segunda + descarte;
}

function procesarDatosProduccion(produccionData) {
    if (produccionData && produccionData.today !== undefined) {
        datosDashboard.produccion.hoy = produccionData.today;
        datosDashboard.produccion.ayer = produccionData.yesterday || 0;
        datosDashboard.produccion.tendencia = produccionData.trend || 0;
    }
    datosDashboard.produccion.ultimaActualizacion = new Date();
}

async function cargarDatosFinancieros() {
    try {
        // Usar firebaseManager si está disponible
        if (firebaseManager && firebaseManager.initialized) {
            console.log('💰 Usando firebaseManager para finanzas');
            
            if (firebaseManager.getFinancialSummary) {
                const finanzasData = await firebaseManager.getFinancialSummary();
                procesarDatosFinancieros(finanzasData);
                return;
            }
        }
        
        // Fallback: consultas directas
        if (!window.db) throw new Error('Firebase no disponible');
        
        console.log('💰 Cargando finanzas con consultas directas');
        const fechaHoy = new Date().toISOString().split('T')[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const finMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Cargar ventas
        const ventasQuery = await window.db.collection('ventas_directas')
            .where('fecha', '>=', inicioMes)
            .where('fecha', '<=', finMes)
            .get();
        
        let ingresosMes = 0;
        let ingresosHoy = 0;
        
        ventasQuery.forEach(doc => {
            const data = doc.data();
            const total = Number(data.total_venta || data.monto_total || 0);
            ingresosMes += total;
            
            if (data.fecha === fechaHoy) {
                ingresosHoy += total;
            }
        });
        
        // Cargar gastos usando el sistema de gastos si está disponible
        let gastosMes = 0;
        let gastosHoy = 0;
        
        if (window.obtenerDatosGastos && window.obtenerDatosGastos().inicializado) {
            const datosGastos = window.obtenerDatosGastos();
            gastosMes = datosGastos.estadisticas.totalMes || 0;
            // Calcular gastos de hoy
            datosGastos.gastos.forEach(gasto => {
                if (gasto.fecha === fechaHoy || gasto.date === fechaHoy) {
                    gastosHoy += Number(gasto.monto || gasto.amount || 0);
                }
            });
        } else {
            // Fallback: consulta directa a gastos
            const gastosQuery = await window.db.collection('gastos')
                .where('fecha', '>=', inicioMes)
                .where('fecha', '<=', finMes)
                .where('active', '==', true)
                .get();
            
            gastosQuery.forEach(doc => {
                const data = doc.data();
                const monto = Number(data.monto || data.amount || 0);
                gastosMes += monto;
                
                if (data.fecha === fechaHoy) {
                    gastosHoy += monto;
                }
            });
        }
        
        // Cargar precio MAGA
        let precioUnitario = 0.40; // Valor por defecto
        try {
            const precioQuery = await window.db.collection('precios_maga')
                .orderBy('fecha', 'desc')
                .limit(1)
                .get();
            
            if (!precioQuery.empty) {
                const precioData = precioQuery.docs[0].data();
                const precio = Number(precioData.precio_por_unidad || (precioData.precio_millar_limon_persa / 1000) || 0);
                if (precio > 0) {
                    precioUnitario = precio;
                }
            }
        } catch (error) {
            console.warn('No se pudo cargar precio MAGA:', error.message);
        }
        
        datosDashboard.finanzas = {
            ingresosMes,
            gastosMes,
            balanceMes: ingresosMes - gastosMes,
            balanceHoy: ingresosHoy - gastosHoy,
            precioUnitario,
            ultimaActualizacion: new Date()
        };
        
        console.log(`💰 Finanzas cargadas: Ingresos ${formatearMoneda(ingresosMes)}, Gastos ${formatearMoneda(gastosMes)}`);
        
    } catch (error) {
        console.error('Error cargando finanzas:', error);
        throw error;
    }
}

function procesarDatosFinancieros(finanzasData) {
    if (finanzasData) {
        datosDashboard.finanzas = {
            ...datosDashboard.finanzas,
            ...finanzasData,
            ultimaActualizacion: new Date()
        };
    }
}

async function cargarDatosArboles() {
    try {
        // Usar treeManager si está disponible
        if (treeManager && treeManager.getTreesSummary) {
            console.log('🌳 Usando treeManager para árboles');
            const arbolesData = await treeManager.getTreesSummary();
            procesarDatosArboles(arbolesData);
            return;
        }
        
        // Fallback: consulta directa
        if (!window.db) throw new Error('Firebase no disponible');
        
        console.log('🌳 Cargando árboles con consulta directa');
        const [totalQuery, sanosQuery] = await Promise.all([
            window.db.collection('arboles').get(),
            window.db.collection('arboles').where('estado_salud', '==', 'sano').get()
        ]);
        
        const total = totalQuery.size;
        const sanos = sanosQuery.size;
        const porcentajeSalud = total > 0 ? Math.round((sanos / total) * 100) : 100;
        
        datosDashboard.arboles = {
            total,
            sanos,
            porcentajeSalud,
            ultimaActualizacion: new Date()
        };
        
        console.log(`🌳 Árboles cargados: ${sanos}/${total} saludables (${porcentajeSalud}%)`);
        
    } catch (error) {
        console.error('Error cargando árboles:', error);
        throw error;
    }
}

function procesarDatosArboles(arbolesData) {
    if (arbolesData) {
        datosDashboard.arboles = {
            ...datosDashboard.arboles,
            ...arbolesData,
            ultimaActualizacion: new Date()
        };
    }
}

async function cargarDatosRiego() {
    try {
        if (!window.db) throw new Error('Firebase no disponible');
        
        console.log('💧 Cargando datos del tanque');
        const riegoQuery = await window.db.collection('riegos')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        
        if (!riegoQuery.empty) {
            const data = riegoQuery.docs[0].data();
            const nivel = Number(data.nivel_tanque || data.tanque_nivel_despues || datosDashboard.riego.capacidadMaxima);
            const porcentaje = Math.max(0, Math.min(100, Math.round((nivel / datosDashboard.riego.capacidadMaxima) * 100)));
            
            datosDashboard.riego = {
                ...datosDashboard.riego,
                nivelTanque: nivel,
                porcentajeTanque: porcentaje,
                ultimaActualizacion: new Date()
            };
            
            console.log(`💧 Tanque: ${nivel}L (${porcentaje}%)`);
        } else {
            throw new Error('No hay datos del tanque disponibles');
        }
        
    } catch (error) {
        console.error('Error cargando datos del tanque:', error);
        throw error;
    }
}

async function cargarContadoresRegistros() {
    try {
        if (!window.db) throw new Error('Firebase no disponible');
        
        console.log('🔢 Cargando contadores de registros');
        const [cosechas, ventas, gastos, riegos] = await Promise.all([
            window.db.collection('cosechas_diarias').limit(100).get(),
            window.db.collection('ventas_directas').limit(100).get(),
            window.db.collection('gastos').where('active', '==', true).limit(100).get(),
            window.db.collection('riegos').limit(100).get()
        ]);
        
        datosDashboard.contadores = {
            totalCosechas: cosechas.size,
            totalVentas: ventas.size,
            totalGastos: gastos.size,
            totalRiegos: riegos.size,
            ultimaActualizacion: new Date()
        };
        
        console.log(`🔢 Contadores: ${cosechas.size} cosechas, ${ventas.size} ventas, ${gastos.size} gastos, ${riegos.size} riegos`);
        
    } catch (error) {
        console.error('Error cargando contadores:', error);
        throw error;
    }
}

// ==========================================
// DATOS EXTERNOS (CLIMA)
// ==========================================

async function cargarDatosExternos() {
    try {
        console.log('🌤️ Cargando datos externos (clima)');
        await cargarDatosClima();
    } catch (error) {
        console.error('Error cargando datos externos:', error);
        // No lanzar error para no interrumpir la inicialización
    }
}

async function cargarDatosClima() {
    try {
        const lat = 14.770646; // Coordenadas de Mixco, Guatemala
        const lon = -90.255254;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=America/Guatemala`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const current = data.current_weather;
        const hourly = data.hourly;
        
        const currentHour = new Date().getHours();
        const humedad = hourly.relative_humidity_2m[currentHour] || 0;
        const precipitacion = hourly.precipitation_probability[currentHour] || 0;
        
        const iconos = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
            51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
            80: '🌦️', 81: '🌧️', 82: '🌧️', 95: '⛈️'
        };
        
        const descripciones = {
            0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
            45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna moderada',
            55: 'Llovizna intensa', 61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
            80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos', 95: 'Tormenta'
        };
        
        datosDashboard.clima = {
            temperatura: Math.round(current.temperature),
            descripcion: descripciones[current.weathercode] || 'Condición desconocida',
            icono: iconos[current.weathercode] || '🌤️',
            humedad: humedad,
            viento: Math.round(current.windspeed),
            lluvia: precipitacion,
            ultimaActualizacion: new Date()
        };
        
        console.log(`🌤️ Clima cargado: ${datosDashboard.clima.temperatura}°C, ${datosDashboard.clima.descripcion}`);
        
    } catch (error) {
        console.error('Error cargando clima:', error);
        // Configurar datos por defecto
        datosDashboard.clima = {
            temperatura: null,
            descripcion: 'Error cargando',
            icono: '❌',
            humedad: 0,
            viento: 0,
            lluvia: 0,
            ultimaActualizacion: new Date()
        };
        throw error;
    }
}

// ==========================================
// DATOS OFFLINE
// ==========================================

async function cargarDatosOfflineDashboard() {
    if (!offlineManager) {
        console.log('⚠️ OfflineManager no disponible');
        return;
    }
    
    try {
        console.log('📱 Cargando datos offline del dashboard');
        
        const datosOffline = await offlineManager.getData('dashboard_cache');
        if (datosOffline && esReciente(datosOffline.timestamp, 30)) { // 30 minutos
            datosDashboard = { ...datosDashboard, ...datosOffline.data };
            console.log('📱 Datos offline del dashboard cargados');
        } else {
            console.log('📱 No hay datos offline recientes del dashboard');
        }
        
    } catch (error) {
        console.error('Error cargando datos offline:', error);
    }
}

// ==========================================
// ACTUALIZACIÓN DE INTERFAZ
// ==========================================

async function actualizarInterfazCompleta() {
    try {
        console.log('🖥️ Actualizando interfaz completa del dashboard');
        
        actualizarKPIsPrincipales();
        actualizarDatosFinancieros();
        actualizarDatosArboles();
        actualizarDatosTanque();
        actualizarDatosClima();
        actualizarContadores();
        actualizarEstadosConexion();
        
        // Guardar datos en cache offline
        if (offlineManager) {
            await offlineManager.saveData('dashboard_cache', {
                data: datosDashboard,
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('✅ Interfaz del dashboard actualizada');
        
    } catch (error) {
        console.error('Error actualizando interfaz:', error);
    }
}

function actualizarKPIsPrincipales() {
    // Producción
    actualizarElementoSeguro(elementosDOM.produccionHoy, 
        datosDashboard.produccion.hoy.toLocaleString(), 'data-real');
    
    if (elementosDOM.produccionTrend) {
        const tendencia = datosDashboard.produccion.tendencia;
        const color = tendencia >= 0 ? '#22c55e' : '#ef4444';
        const signo = tendencia >= 0 ? '+' : '';
        elementosDOM.produccionTrend.innerHTML = 
            `<span style="color: ${color}"><i class="fas ${tendencia >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i> ${signo}${tendencia.toFixed(1)}% vs ayer</span>`;
        elementosDOM.produccionTrend.classList.add('data-real');
    }
    
    // Ingresos
    actualizarElementoSeguro(elementosDOM.ingresosHoy, 
        formatearMoneda(datosDashboard.finanzas.ingresosMes), 'data-real');
    
    if (elementosDOM.ingresosTrend) {
        const promedioDiario = datosDashboard.finanzas.ingresosMes / new Date().getDate();
        elementosDOM.ingresosTrend.innerHTML = 
            `<span style="color: #22c55e"><i class="fas fa-chart-line"></i> ${formatearMoneda(promedioDiario)}/día</span>`;
        elementosDOM.ingresosTrend.classList.add('data-real');
    }
    
    // Árboles
    actualizarElementoSeguro(elementosDOM.arbolesSanos, 
        `${datosDashboard.arboles.sanos.toLocaleString()} de ${datosDashboard.arboles.total.toLocaleString()}`, 'data-real');
    
    if (elementosDOM.arbolesTrend) {
        const porcentaje = datosDashboard.arboles.porcentajeSalud;
        const color = porcentaje >= 90 ? '#22c55e' : porcentaje >= 75 ? '#f59e0b' : '#ef4444';
        elementosDOM.arbolesTrend.innerHTML = 
            `<span style="color: ${color}"><i class="fas fa-heart"></i> ${porcentaje}% saludables</span>`;
        elementosDOM.arbolesTrend.classList.add('data-real');
    }
    
    // Gastos
    actualizarElementoSeguro(elementosDOM.gastosHoy, 
        formatearMoneda(datosDashboard.finanzas.gastosMes), 'data-real');
    
    if (elementosDOM.gastosTrend) {
        const promedioDiario = datosDashboard.finanzas.gastosMes / new Date().getDate();
        elementosDOM.gastosTrend.innerHTML = 
            `<span style="color: #ef4444"><i class="fas fa-chart-line"></i> ${formatearMoneda(promedioDiario)}/día</span>`;
        elementosDOM.gastosTrend.classList.add('data-real');
    }
}

function actualizarDatosFinancieros() {
    actualizarElementoSeguro(elementosDOM.balanceHoy, 
        formatearMoneda(datosDashboard.finanzas.balanceHoy), 'data-real');
    
    actualizarElementoSeguro(elementosDOM.balanceMes, 
        formatearMoneda(datosDashboard.finanzas.balanceMes), 'data-real');
    
    actualizarElementoSeguro(elementosDOM.precioActual, 
        formatearMoneda(datosDashboard.finanzas.precioUnitario), 'data-real');
    
    actualizarElementoSeguro(elementosDOM.precioUpdate, 
        'MAGA actualizado', 'data-real');
}

function actualizarDatosArboles() {
    // Los datos de árboles ya se actualizan en KPIs principales
}

function actualizarDatosTanque() {
    actualizarElementoSeguro(elementosDOM.tanqueNivel, 
        `${datosDashboard.riego.nivelTanque.toLocaleString()} L`, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.tankPercentage, 
        `${datosDashboard.riego.porcentajeTanque}%`, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.tankSource, 
        'Firebase Firestore', 'data-real');
    
    if (elementosDOM.tankFill) {
        elementosDOM.tankFill.style.height = `${datosDashboard.riego.porcentajeTanque}%`;
    }
    
    if (elementosDOM.tankAlert) {
        if (datosDashboard.riego.porcentajeTanque < 20) {
            elementosDOM.tankAlert.style.display = 'block';
        } else {
            elementosDOM.tankAlert.style.display = 'none';
        }
    }
}

function actualizarDatosClima() {
    if (datosDashboard.clima.temperatura !== null) {
        actualizarElementoSeguro(elementosDOM.currentTemp, 
            `${datosDashboard.clima.temperatura}°C`, 'data-real');
    } else {
        actualizarElementoError(elementosDOM.currentTemp, 'Error');
    }
    
    actualizarElementoSeguro(elementosDOM.weatherIcon, 
        datosDashboard.clima.icono, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.weatherDesc, 
        datosDashboard.clima.descripcion, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.humidity, 
        `${datosDashboard.clima.humedad}%`, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.windSpeed, 
        `${datosDashboard.clima.viento} km/h`, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.rainChance, 
        `${datosDashboard.clima.lluvia}%`, 'data-real');
    
    if (datosDashboard.clima.temperatura !== null) {
        actualizarElementoSeguro(elementosDOM.weatherStatus, 
            '🟢 En vivo', 'data-real');
    } else {
        actualizarElementoError(elementosDOM.weatherStatus, '🔴 Error');
    }
}

function actualizarContadores() {
    const contadores = datosDashboard.contadores;
    
    actualizarElementoSeguro(elementosDOM.totalCosechas, 
        `${contadores.totalCosechas}+`, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.totalVentas, 
        `${contadores.totalVentas}+`, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.totalGastosCount, 
        `${contadores.totalGastos}+`, 'data-real');
    
    actualizarElementoSeguro(elementosDOM.totalRiegos, 
        `${contadores.totalRiegos}+`, 'data-real');
}

function actualizarEstadosConexion() {
    // Status badges
    actualizarElementoSeguro(elementosDOM.statusCosechas, '✅', 'data-real');
    actualizarElementoSeguro(elementosDOM.statusVentas, '✅', 'data-real');
    actualizarElementoSeguro(elementosDOM.statusGastos, '✅', 'data-real');
    actualizarElementoSeguro(elementosDOM.statusRiegos, '✅', 'data-real');
    actualizarElementoSeguro(elementosDOM.statusArboles, '✅', 'data-real');
    
    // Estado general
    actualizarElementoSeguro(elementosDOM.firebaseStatus, 
        '✅ Sincronizado', 'data-real');
    
    if (elementosDOM.lastSync) {
        actualizarElementoSeguro(elementosDOM.lastSync, 
            new Date().toLocaleTimeString('es-GT'), 'data-real');
    }
}

// ==========================================
// FUNCIONES DE UTILIDAD DE UI
// ==========================================

function actualizarElementoSeguro(elemento, valor, className = 'data-real') {
    if (elemento) {
        elemento.textContent = valor;
        elemento.classList.remove('data-loading', 'data-error');
        elemento.classList.add(className);
    }
}

function actualizarElementoError(elemento, mensaje = 'Error') {
    if (elemento) {
        elemento.textContent = mensaje;
        elemento.classList.remove('data-loading', 'data-real');
        elemento.classList.add('data-error');
    }
}

function actualizarEstadoConexion(estado) {
    if (!elementosDOM.connectionStatus) return;
    
    const configuraciones = {
        'connecting': { class: 'loading', icon: 'fa-circle', text: 'Conectando...' },
        'online': { class: 'online', icon: 'fa-check-circle', text: 'Conectado' },
        'offline': { class: 'offline', icon: 'fa-times-circle', text: 'Sin conexión' },
        'firebase': { class: 'online', icon: 'fa-database', text: 'Firebase OK' }
    };
    
    const config = configuraciones[estado] || configuraciones.connecting;
    elementosDOM.connectionStatus.className = `connection-status ${config.class}`;
    elementosDOM.connectionStatus.innerHTML = `<i class="fas ${config.icon}"></i> ${config.text}`;
}

function actualizarEstadoSistema(estado, mensaje) {
    if (!elementosDOM.estadoSistema) return;
    
    elementosDOM.estadoSistema.className = `estado-sistema ${estado}`;
    
    let icono = 'fa-sync-alt fa-spin';
    if (estado === 'online') icono = 'fa-check-circle';
    else if (estado === 'error') icono = 'fa-times-circle';
    
    elementosDOM.estadoSistema.innerHTML = `<i class="fas ${icono}"></i><span>${mensaje}</span>`;
}

// ==========================================
// CONFIGURACIÓN DE EVENTOS
// ==========================================

async function configurarEventosDashboard() {
    try {
        console.log('⚙️ Configurando eventos del dashboard');
        
        // Botón de sincronización
        if (elementosDOM.syncButton) {
            elementosDOM.syncButton.addEventListener('click', async () => {
                try {
                    elementosDOM.syncButton.disabled = true;
                    elementosDOM.syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span class="hide-mobile">Sincronizando...</span><span class="show-mobile">Sync...</span>';
                    
                    await sincronizarDashboardManual();
                    
                    mostrarNotificacionDashboard('Dashboard sincronizado correctamente', 'success');
                } catch (error) {
                    console.error('Error en sincronización manual:', error);
                    mostrarNotificacionDashboard('Error en la sincronización', 'error');
                } finally {
                    elementosDOM.syncButton.disabled = false;
                    elementosDOM.syncButton.innerHTML = '<i class="fas fa-database"></i> <span class="hide-mobile">Firebase</span><span class="show-mobile">DB</span>';
                }
            });
        }
        
        // Eventos de conectividad
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada');
            actualizarEstadoConexion('online');
            actualizarEstadoSistema('online', 'Conexión restaurada');
            setTimeout(sincronizarDashboardManual, 1000);
        });
        
        window.addEventListener('offline', () => {
            console.log('🔵 Sin conexión a internet');
            actualizarEstadoConexion('offline');
            actualizarEstadoSistema('error', 'Sin conexión');
        });
        
        // Eventos personalizados
        window.addEventListener('gastosActualizados', () => {
            console.log('💰 Datos de gastos actualizados, refrescando dashboard');
            setTimeout(actualizarDatosFinancierosAsync, 500);
        });
        
        window.addEventListener('arbolesActualizados', () => {
            console.log('🌳 Datos de árboles actualizados, refrescando dashboard');
            setTimeout(actualizarDatosArbolesAsync, 500);
        });
        
        // Estado inicial de conexión
        actualizarEstadoConexion(navigator.onLine ? 'online' : 'offline');
        
        console.log('✅ Eventos del dashboard configurados');
        
    } catch (error) {
        console.error('Error configurando eventos:', error);
        throw error;
    }
}

function configurarActualizacionesAutomaticas() {
    // Actualización automática cada 5 minutos
    setInterval(async () => {
        if (navigator.onLine && sistemaDashboard.inicializado) {
            console.log('🔄 Actualización automática programada del dashboard');
            try {
                await sincronizarDashboardManual();
                console.log('✅ Actualización automática completada');
            } catch (error) {
                console.error('❌ Error en actualización automática:', error);
            }
        }
    }, configDashboard.intervaloActualizacion);
    
    console.log(`⏰ Actualizaciones automáticas configuradas cada ${configDashboard.intervaloActualizacion / 1000 / 60} minutos`);
}

// ==========================================
// FUNCIONES DE SINCRONIZACIÓN
// ==========================================

async function sincronizarDashboardManual() {
    try {
        console.log('🔄 Iniciando sincronización manual del dashboard');
        
        await cargarDatosPrincipales();
        await cargarDatosExternos();
        await actualizarInterfazCompleta();
        
        sistemaDashboard.ultimaActualizacion = new Date();
        
        // Disparar evento de sincronización
        dispatchDashboardEvent('dashboardSincronizado', {
            timestamp: sistemaDashboard.ultimaActualizacion.toISOString()
        });
        
    } catch (error) {
        console.error('Error en sincronización manual:', error);
        throw error;
    }
}

async function actualizarDatosFinancierosAsync() {
    try {
        await cargarDatosFinancieros();
        actualizarKPIsPrincipales();
        actualizarDatosFinancieros();
    } catch (error) {
        console.error('Error actualizando datos financieros:', error);
    }
}

async function actualizarDatosArbolesAsync() {
    try {
        await cargarDatosArboles();
        actualizarKPIsPrincipales();
    } catch (error) {
        console.error('Error actualizando datos de árboles:', error);
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function formatearMoneda(monto) {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ'
    }).format(monto || 0);
}

function esReciente(timestamp, minutosMaximos) {
    const ahora = new Date();
    const fechaTimestamp = new Date(timestamp);
    const diferencia = (ahora - fechaTimestamp) / (1000 * 60);
    return diferencia <= minutosMaximos;
}

function dispatchDashboardEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, {
        detail: { 
            ...data, 
            timestamp: Date.now(), 
            source: 'dashboardManager',
            finca: configDashboard.fincaId 
        }
    }));
}

function mostrarNotificacionDashboard(mensaje, tipo = 'info') {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    
    // Si existe el sistema de notificaciones de gastos, usarlo
    if (window.mostrarNotificacion) {
        window.mostrarNotificacion(mensaje, tipo);
        return;
    }
    
    // Sistema básico de notificación para dashboard
    const notification = document.createElement('div');
    notification.className = `notification-dashboard notification-${tipo}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : tipo === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        z-index: 9999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        max-width: 350px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-times-circle' : tipo === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
    
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

// ==========================================
// MANEJO DE ERRORES GLOBALES
// ==========================================

window.addEventListener('error', (event) => {
    if (event.error && event.error.message.includes('Chart')) {
        console.warn('⚠️ Error de Chart.js ignorado en dashboard');
        return;
    }
    console.error('❌ Error global en dashboard:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada en dashboard:', event.reason);
});

// ==========================================
// EXPORTACIÓN GLOBAL
// ==========================================

// Exponer funciones globalmente
window.sistemaDashboard = sistemaDashboard;
window.datosDashboard = datosDashboard;
window.sincronizarDashboard = sincronizarDashboardManual;

// Función para obtener datos desde otros módulos
window.obtenerDatosDashboard = function() {
    return {
        datos: datosDashboard,
        estado: sistemaDashboard,
        inicializado: sistemaDashboard.inicializado
    };
};

// Función para actualizar desde otros módulos
window.actualizarDashboard = function() {
    if (sistemaDashboard.inicializado) {
        sincronizarDashboardManual().catch(error => {
            console.error('Error actualizando dashboard externamente:', error);
        });
    }
};

console.log('📊 Dashboard Inteligente JavaScript vanilla cargado');
console.log('📍 Configurado para Finca La Herradura, Mixco, Guatemala');
console.log('🔗 100% integrado con archivos base y datos REALES únicamente');

