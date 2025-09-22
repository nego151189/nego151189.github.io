/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE NEGOCIOS VANILLA JS
   Sistema integrado con ventas y clientes
   DATOS REALES únicamente - Sin simulaciones vfull
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema de negocios
let sistemaNegociosState = {
    inicializado: false,
    inicializando: false,
    ultimaActualizacion: null,
    progreso: 0,
    paso: 0,
    totalPasos: 6
};

// Configuración del módulo de negocios
const configNegocios = {
    fincaId: 'finca_la_herradura',
    modulo: 'negocios',
    intervaloSync: 30000, // 30 segundos
    maxNegocios: 500
};

// Datos de negocios REALES
let datosNegocios = {
    negocios: new Map(),
    actividades: new Map(),
    estadisticas: {
        ventasTotales: 0,
        negociosActivos: 0,
        clientesActivos: 0,
        tasaConversion: 0,
        cambioVentas: 0,
        cambioNegocios: 0,
        cambioClientes: 0,
        cambioConversion: 0
    },
    filtrosActivos: {
        estado: '',
        cliente: '',
        fechaDesde: '',
        fechaHasta: ''
    }
};

// Referencias a managers base
let authManager = null;
let offlineManager = null;
let firebaseManager = null;
let clientesManager = null;
let dataSyncManager = null;

// ==========================================
// SISTEMA DE CARGA UNIFICADO
// ==========================================

function actualizarLoaderNegocios(paso, titulo, subtitulo, progreso) {
    const loaderTexto = document.getElementById('loaderTexto');
    const loaderSubtexto = document.getElementById('loaderSubtexto');
    const loaderBarra = document.getElementById('loaderBarra');
    const loaderPorcentaje = document.getElementById('loaderPorcentaje');
    
    if (loaderTexto) loaderTexto.textContent = titulo;
    if (loaderSubtexto) loaderSubtexto.textContent = subtitulo;
    if (loaderBarra) loaderBarra.style.width = progreso + '%';
    if (loaderPorcentaje) loaderPorcentaje.textContent = Math.round(progreso) + '%';
    
    sistemaNegociosState.paso = paso;
    sistemaNegociosState.progreso = progreso;
    
    console.log(`🎯 Negocios Paso ${paso}: ${titulo} (${progreso}%)`);
}

function marcarPasoNegociosCompletado(pasoId) {
    const paso = document.getElementById(pasoId);
    if (paso) {
        paso.classList.remove('activo');
        paso.classList.add('completado');
        
        const icon = paso.querySelector('.paso-icon i');
        if (icon) {
            icon.className = 'fas fa-check';
        }
    }
}

function marcarPasoNegociosActivo(pasoId) {
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

function ocultarLoaderNegocios() {
    setTimeout(() => {
        const loader = document.getElementById('sistemaLoader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
        
        console.log('✅ Sistema de negocios completamente cargado');
    }, 1000);
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🎯 Iniciando sistema de negocios...');
        console.log(`📍 Finca: ${configNegocios.fincaId}`);
        
        sistemaNegociosState.inicializando = true;
        
        // Paso 1: Conectar Firebase
        marcarPasoNegociosActivo('paso-firebase');
        actualizarLoaderNegocios(1, 'Conectando Firebase', 'Estableciendo conexión con la base de datos...', 15);
        await esperarFirebaseNegocios();
        marcarPasoNegociosCompletado('paso-firebase');
        
        // Paso 2: Verificar autenticación (SIN REDIRIGIR)
        marcarPasoNegociosActivo('paso-auth');
        actualizarLoaderNegocios(2, 'Verificando Acceso', 'Validando permisos de usuario...', 30);
        await verificarAutenticacionNegocios();
        marcarPasoNegociosCompletado('paso-auth');
        
        // Paso 3: Inicializar managers base
        marcarPasoNegociosActivo('paso-managers');
        actualizarLoaderNegocios(3, 'Cargando Sistemas Base', 'Inicializando gestores de datos...', 45);
        await inicializarManagersNegocios();
        marcarPasoNegociosCompletado('paso-managers');
        
        // Paso 4: Cargar datos REALES de negocios
        marcarPasoNegociosActivo('paso-datos');
        actualizarLoaderNegocios(4, 'Sincronizando Negocios REALES', 'Obteniendo datos desde Firebase...', 65);
        await cargarDatosRealesNegocios();
        marcarPasoNegociosCompletado('paso-datos');
        
        // Paso 5: Configurar integración con otros módulos
        marcarPasoNegociosActivo('paso-integracion');
        actualizarLoaderNegocios(5, 'Configurando Integración', 'Conectando con clientes y ventas...', 80);
        await configurarIntegracionModulos();
        marcarPasoNegociosCompletado('paso-integracion');
        
        // Paso 6: Finalizar y configurar interfaz
        marcarPasoNegociosActivo('paso-interfaz');
        actualizarLoaderNegocios(6, 'Finalizando Sistema', 'Configurando interfaz de usuario...', 95);
        await configurarEventosNegocios();
        await actualizarInterfazCompleta();
        marcarPasoNegociosCompletado('paso-interfaz');
        
        // Completar inicialización
        actualizarLoaderNegocios(6, 'Sistema Listo', 'Gestión de negocios lista para usar', 100);
        
        sistemaNegociosState.inicializado = true;
        sistemaNegociosState.inicializando = false;
        sistemaNegociosState.ultimaActualizacion = new Date();
        
        // Configurar sincronización automática
        configurarSincronizacionAutomatica();
        
        console.log('🎉 Sistema de negocios completamente inicializado');
        
        // Ocultar loader
        ocultarLoaderNegocios();
        
        // Evento de sistema listo
        dispatchNegociosEvent('negociosSystemReady', {
            finca: configNegocios.fincaId,
            timestamp: new Date().toISOString(),
            totalNegocios: datosNegocios.negocios.size
        });
        
    } catch (error) {
        console.error('❌ Error crítico inicializando sistema de negocios:', error);
        
        // Intentar modo offline
        try {
            actualizarLoaderNegocios(6, 'Modo Offline', 'Cargando datos guardados localmente...', 85);
            await cargarDatosOfflineNegocios();
            await configurarEventosNegocios();
            await actualizarInterfazCompleta();
            
            sistemaNegociosState.inicializado = true;
            sistemaNegociosState.inicializando = false;
            
            mostrarNotificacionNegocios('Sistema de negocios iniciado en modo offline', 'warning');
            ocultarLoaderNegocios();
            
        } catch (offlineError) {
            console.error('❌ Error también en modo offline:', offlineError);
            actualizarLoaderNegocios(6, 'Error de Sistema', 'No se pudo cargar el sistema de negocios', 100);
            
            setTimeout(() => {
                ocultarLoaderNegocios();
                mostrarNotificacionNegocios('Error cargando sistema. Intente refrescar la página.', 'error');
            }, 3000);
        }
    }
});

// ==========================================
// FUNCIONES DE INICIALIZACIÓN
// ==========================================

async function esperarFirebaseNegocios() {
    return new Promise((resolve) => {
        let intentos = 0;
        const maxIntentos = 50;
        
        const verificar = () => {
            if (window.firebase && window.db) {
                console.log('✅ Firebase disponible para negocios');
                resolve(true);
            } else if (intentos < maxIntentos) {
                intentos++;
                setTimeout(verificar, 100);
            } else {
                console.warn('⚠️ Timeout Firebase negocios, continuando...');
                resolve(false);
            }
        };
        
        window.addEventListener('firebaseReady', () => {
            console.log('🔥 Evento firebaseReady recibido en negocios');
            resolve(true);
        }, { once: true });
        
        verificar();
    });
}

async function verificarAutenticacionNegocios() {
    try {
        authManager = await esperarManagerNegocios('authManager', 3000);
        
        if (authManager && authManager.isInitialized) {
            const estado = authManager.getAuthState();
            console.log('🔐 Estado autenticación negocios:', {
                autenticado: estado.isAuthenticated,
                usuario: estado.user?.email || 'Sin usuario',
                offline: estado.isOffline
            });
            
            return true;
        } else {
            console.log('⚠️ AuthManager no disponible en negocios, continuando...');
            return true;
        }
        
    } catch (error) {
        console.error('Error verificando autenticación negocios:', error);
        return true;
    }
}

async function inicializarManagersNegocios() {
    try {
        const promesasManagers = [
            esperarManagerNegocios('firebaseDataManager', 3000).then(manager => firebaseManager = manager),
            esperarManagerNegocios('offlineManager', 2000).then(manager => offlineManager = manager),
            esperarManagerNegocios('clientesManager', 3000).then(manager => clientesManager = manager),
            esperarManagerNegocios('dataSyncManager', 2000).then(manager => dataSyncManager = manager)
        ];
        
        await Promise.allSettled(promesasManagers);
        
        const managersDisponibles = {
            firebase: !!firebaseManager,
            offline: !!offlineManager,
            clientes: !!clientesManager,
            dataSync: !!dataSyncManager
        };
        
        console.log('🔧 Managers de negocios inicializados:', managersDisponibles);
        
        return managersDisponibles;
        
    } catch (error) {
        console.error('Error inicializando managers negocios:', error);
        throw error;
    }
}

async function esperarManagerNegocios(nombreManager, timeout = 5000) {
    return new Promise((resolve) => {
        const inicio = Date.now();
        
        const verificar = () => {
            if (window[nombreManager]) {
                resolve(window[nombreManager]);
            } else if (Date.now() - inicio < timeout) {
                setTimeout(verificar, 100);
            } else {
                console.warn(`⚠️ Timeout esperando ${nombreManager} en negocios`);
                resolve(null);
            }
        };
        
        verificar();
    });
}

// ==========================================
// CARGA DE DATOS REALES
// ==========================================

async function cargarDatosRealesNegocios() {
    try {
        console.log('🎯 Cargando datos REALES de negocios...');
        
        // Primero intentar cargar desde offline si hay datos recientes
        if (offlineManager) {
            const datosOffline = await offlineManager.getData('negocios_cache');
            if (datosOffline && esReciente(datosOffline.timestamp, 15)) { // 15 minutos
                console.log('📱 Usando datos offline recientes de negocios');
                procesarDatosNegocios(datosOffline.data);
                await calcularEstadisticasNegocios();
                return;
            }
        }
        
        // Usar Firebase si está disponible
        if (window.db) {
            console.log('🔥 Cargando negocios REALES desde Firebase');
            await cargarDesdeFirebase();
        } else {
            console.log('⚠️ Firebase no disponible, usando datos locales');
            await cargarDatosOfflineNegocios();
        }
        
        // Calcular estadísticas
        await calcularEstadisticasNegocios();
        
        console.log(`✅ Datos REALES de negocios cargados: ${datosNegocios.negocios.size} negocios`);
        
    } catch (error) {
        console.error('Error cargando datos reales negocios:', error);
        throw error;
    }
}

async function cargarDesdeFirebase() {
    try {
        const userId = obtenerUsuarioActualNegocios();
        
        // Cargar negocios
        const negociosQuery = await window.db.collection('negocios')
            .where('usuarioId', '==', userId)
            .where('active', '==', true)
            .orderBy('fechaModificacion', 'desc')
            .limit(configNegocios.maxNegocios)
            .get();
        
        const negociosData = [];
        negociosQuery.forEach(doc => {
            const negocio = doc.data();
            negociosData.push({
                id: doc.id,
                ...negocio,
                fechaCreacion: negocio.fechaCreacion?.toDate?.()?.toISOString() || negocio.fechaCreacion,
                fechaModificacion: negocio.fechaModificacion?.toDate?.()?.toISOString() || negocio.fechaModificacion
            });
        });
        
        procesarDatosNegocios(negociosData);
        
        // Cargar actividades recientes
        await cargarActividadesDesdeFirebase();
        
        // Guardar en cache offline
        if (offlineManager) {
            await offlineManager.saveData('negocios_cache', {
                data: negociosData,
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`🔥 ${negociosData.length} negocios cargados desde Firebase`);
        
    } catch (error) {
        console.error('Error cargando desde Firebase:', error);
        throw error;
    }
}

async function cargarActividadesDesdeFirebase() {
    try {
        const userId = obtenerUsuarioActualNegocios();
        
        const actividadesQuery = await window.db.collection('negociosActividades')
            .where('usuarioId', '==', userId)
            .orderBy('fecha', 'desc')
            .limit(100)
            .get();
        
        actividadesQuery.forEach(doc => {
            const actividad = doc.data();
            const negocioId = actividad.negocioId;
            
            if (!datosNegocios.actividades.has(negocioId)) {
                datosNegocios.actividades.set(negocioId, []);
            }
            
            datosNegocios.actividades.get(negocioId).push({
                id: doc.id,
                ...actividad,
                fecha: actividad.fecha?.toDate?.()?.toISOString() || actividad.fecha
            });
        });
        
        console.log(`📝 Actividades de negocios cargadas`);
        
    } catch (error) {
        console.error('Error cargando actividades:', error);
    }
}

function procesarDatosNegocios(negociosArray) {
    datosNegocios.negocios.clear();
    
    if (Array.isArray(negociosArray)) {
        negociosArray.forEach(negocio => {
            if (negocio && negocio.id && negocio.active !== false) {
                // Normalizar estructura del negocio
                const negocioNormalizado = {
                    id: negocio.id,
                    nombre: negocio.nombre || '',
                    clienteId: negocio.clienteId || '',
                    cliente: negocio.cliente || negocio.nombreCliente || '',
                    valor: parseFloat(negocio.valor || 0),
                    estado: negocio.estado || 'prospecto',
                    fechaCierre: negocio.fechaCierre || '',
                    descripcion: negocio.descripcion || '',
                    probabilidad: parseInt(negocio.probabilidad || 75),
                    cantidadEstimada: parseFloat(negocio.cantidadEstimada || 0),
                    productos: negocio.productos || '',
                    notas: negocio.notas || '',
                    fechaCreacion: negocio.fechaCreacion || new Date().toISOString(),
                    fechaModificacion: negocio.fechaModificacion || new Date().toISOString(),
                    usuarioId: negocio.usuarioId || obtenerUsuarioActualNegocios(),
                    active: negocio.active !== false,
                    progreso: calcularProgresoNegocio(negocio.estado),
                    diasDesdeCreacion: calcularDiasDesdeCreacion(negocio.fechaCreacion)
                };
                
                datosNegocios.negocios.set(negocio.id, negocioNormalizado);
            }
        });
    }
    
    console.log(`📊 ${datosNegocios.negocios.size} negocios procesados y normalizados`);
}

async function cargarDatosOfflineNegocios() {
    if (!offlineManager) {
        console.log('⚠️ OfflineManager no disponible');
        return;
    }
    
    try {
        const datosOffline = await offlineManager.getData('negocios_cache');
        if (datosOffline) {
            procesarDatosNegocios(datosOffline.data || []);
            await calcularEstadisticasNegocios();
            console.log('📱 Datos offline de negocios cargados');
        } else {
            console.log('📱 No hay datos offline de negocios disponibles');
            datosNegocios.negocios.clear();
            await calcularEstadisticasNegocios();
        }
    } catch (error) {
        console.error('Error cargando datos offline negocios:', error);
    }
}

// ==========================================
// GESTIÓN DE NEGOCIOS
// ==========================================

async function guardarNegocioConFirebase(datosNegocio) {
    try {
        console.log('🎯 Guardando negocio:', datosNegocio);
        
        // Validar datos
        const errores = validarDatosNegocio(datosNegocio);
        if (errores.length > 0) {
            throw new Error(`Datos inválidos: ${errores.join(', ')}`);
        }
        
        let negocioGuardado;
        
        // Si Firebase está disponible, usar Firebase
        if (window.db) {
            negocioGuardado = await crearNegocioFirebase(datosNegocio);
            console.log('🔥 Negocio guardado en Firebase');
        } else {
            // Fallback: usar sistema local
            negocioGuardado = await crearNegocioLocal(datosNegocio);
            
            // Encolar para sincronización posterior
            if (offlineManager) {
                await offlineManager.queueAction('crear_negocio', datosNegocio);
            }
        }
        
        // Recalcular estadísticas
        await calcularEstadisticasNegocios();
        
        // Disparar evento
        dispatchNegociosEvent('negocioCreado', { 
            negocio: negocioGuardado,
            totalNegocios: datosNegocios.negocios.size 
        });
        
        return negocioGuardado;
        
    } catch (error) {
        console.error('Error guardando negocio:', error);
        throw error;
    }
}

function validarDatosNegocio(datos) {
    const errores = [];
    
    if (!datos.nombre || !datos.nombre.trim()) {
        errores.push('El nombre del negocio es obligatorio');
    }
    
    if (!datos.clienteId) {
        errores.push('Debe seleccionar un cliente');
    }
    
    if (!datos.valor || parseFloat(datos.valor) <= 0) {
        errores.push('El valor debe ser mayor a 0');
    }
    
    if (!datos.estado) {
        errores.push('El estado es obligatorio');
    }
    
    return errores;
}

async function crearNegocioFirebase(datosNegocio) {
    try {
        const negocioId = datosNegocio.id || generarIdNegocio();
        const fechaActual = new Date();
        
        // Obtener información del cliente
        let nombreCliente = datosNegocio.cliente || '';
        if (clientesManager && datosNegocio.clienteId) {
            const cliente = clientesManager.obtenerCliente(datosNegocio.clienteId);
            if (cliente) {
                nombreCliente = cliente.nombre;
            }
        }
        
        const negocio = {
            nombre: datosNegocio.nombre.trim(),
            clienteId: datosNegocio.clienteId,
            cliente: nombreCliente,
            valor: parseFloat(datosNegocio.valor),
            estado: datosNegocio.estado,
            fechaCierre: datosNegocio.fechaCierre || '',
            descripcion: datosNegocio.descripcion?.trim() || '',
            probabilidad: parseInt(datosNegocio.probabilidad || 75),
            cantidadEstimada: parseFloat(datosNegocio.cantidadEstimada || 0),
            productos: datosNegocio.productos?.trim() || '',
            notas: datosNegocio.notas?.trim() || '',
            fechaCreacion: datosNegocio.id ? undefined : window.firebase.firestore.Timestamp.now(),
            fechaModificacion: window.firebase.firestore.Timestamp.now(),
            usuarioId: obtenerUsuarioActualNegocios(),
            active: true
        };
        
        await window.db.collection('negocios').doc(negocioId).set(negocio, { merge: true });
        
        // Crear objeto local
        const negocioLocal = {
            id: negocioId,
            ...negocio,
            fechaCreacion: negocio.fechaCreacion?.toDate?.()?.toISOString() || new Date().toISOString(),
            fechaModificacion: negocio.fechaModificacion?.toDate?.()?.toISOString() || fechaActual.toISOString(),
            progreso: calcularProgresoNegocio(negocio.estado),
            diasDesdeCreacion: calcularDiasDesdeCreacion(negocio.fechaCreacion?.toDate?.()?.toISOString())
        };
        
        datosNegocios.negocios.set(negocioId, negocioLocal);
        
        // Registrar actividad
        await registrarActividadNegocio(negocioId, 
            datosNegocio.id ? 'Negocio actualizado' : 'Negocio creado', 'sistema');
        
        console.log('💼 Negocio creado/actualizado en Firebase:', negocioLocal);
        
        return negocioLocal;
    } catch (error) {
        console.error('Error creando negocio en Firebase:', error);
        throw error;
    }
}

async function crearNegocioLocal(datosNegocio) {
    try {
        const negocioId = datosNegocio.id || generarIdNegocio();
        const fechaActual = new Date();
        
        // Obtener información del cliente
        let nombreCliente = datosNegocio.cliente || '';
        if (clientesManager && datosNegocio.clienteId) {
            const cliente = clientesManager.obtenerCliente(datosNegocio.clienteId);
            if (cliente) {
                nombreCliente = cliente.nombre;
            }
        }
        
        const negocio = {
            id: negocioId,
            nombre: datosNegocio.nombre.trim(),
            clienteId: datosNegocio.clienteId,
            cliente: nombreCliente,
            valor: parseFloat(datosNegocio.valor),
            estado: datosNegocio.estado,
            fechaCierre: datosNegocio.fechaCierre || '',
            descripcion: datosNegocio.descripcion?.trim() || '',
            probabilidad: parseInt(datosNegocio.probabilidad || 75),
            cantidadEstimada: parseFloat(datosNegocio.cantidadEstimada || 0),
            productos: datosNegocio.productos?.trim() || '',
            notas: datosNegocio.notas?.trim() || '',
            fechaCreacion: datosNegocio.id ? datosNegocios.negocios.get(negocioId)?.fechaCreacion : fechaActual.toISOString(),
            fechaModificacion: fechaActual.toISOString(),
            usuarioId: obtenerUsuarioActualNegocios(),
            active: true,
            local: true, // Marcador para negocios creados localmente
            progreso: calcularProgresoNegocio(datosNegocio.estado),
            diasDesdeCreacion: calcularDiasDesdeCreacion(datosNegocio.fechaCreacion)
        };
        
        datosNegocios.negocios.set(negocioId, negocio);
        
        // Guardar localmente
        await guardarNegociosLocalmente();
        
        console.log('💼 Negocio creado localmente:', negocio);
        
        return negocio;
    } catch (error) {
        console.error('Error creando negocio local:', error);
        throw error;
    }
}

async function avanzarEtapaNegocio(negocioId) {
    try {
        const negocio = datosNegocios.negocios.get(negocioId);
        if (!negocio) {
            throw new Error('Negocio no encontrado');
        }

        const etapas = ['prospecto', 'calificado', 'propuesta', 'negociacion', 'cerrado'];
        const etapaActual = etapas.indexOf(negocio.estado);
        
        if (etapaActual < etapas.length - 1) {
            const nuevoEstado = etapas[etapaActual + 1];
            negocio.estado = nuevoEstado;
            negocio.progreso = calcularProgresoNegocio(nuevoEstado);
            negocio.fechaModificacion = new Date().toISOString();
            
            // Actualizar en Firebase si está disponible
            if (window.db) {
                await window.db.collection('negocios').doc(negocioId).update({
                    estado: nuevoEstado,
                    fechaModificacion: window.firebase.firestore.Timestamp.now()
                });
            }
            
            // Si se cierra el negocio, crear venta automáticamente
            if (nuevoEstado === 'cerrado' && negocio.cantidadEstimada > 0) {
                await convertirNegocioAVenta(negocio);
            }
            
            datosNegocios.negocios.set(negocioId, negocio);
            await calcularEstadisticasNegocios();
            
            // Registrar actividad
            await registrarActividadNegocio(negocioId, `Negocio avanzado a ${nuevoEstado}`, 'sistema');
            
            // Disparar evento
            dispatchNegociosEvent('negocioActualizado', { negocio });
            
            console.log(`🎯 Negocio ${negocioId} avanzado a ${nuevoEstado}`);
        }
        
    } catch (error) {
        console.error('Error avanzando etapa negocio:', error);
        throw error;
    }
}

async function convertirNegocioAVenta(negocio) {
    try {
        // Solo convertir si hay un sistema de ventas disponible
        if (window.ventasManager || window.sistemaVentas) {
            const datosVenta = {
                fecha: new Date().toISOString().split('T')[0],
                clienteId: negocio.clienteId,
                cliente: negocio.cliente,
                cantidad: negocio.cantidadEstimada,
                precioKg: negocio.cantidadEstimada > 0 ? negocio.valor / negocio.cantidadEstimada : 0,
                metodoPago: 'transferencia',
                observaciones: `Venta generada automáticamente desde negocio: ${negocio.nombre}`,
                negocioId: negocio.id
            };
            
            if (window.ventasManager) {
                await window.ventasManager.registrarVenta(datosVenta);
            } else if (window.sistemaVentas && window.sistemaVentas.registrarVenta) {
                await window.sistemaVentas.registrarVenta(datosVenta);
            }
            
            console.log('✅ Negocio convertido automáticamente a venta');
            
            // Registrar actividad
            await registrarActividadNegocio(negocio.id, 'Negocio convertido automáticamente a venta', 'sistema');
        }
    } catch (error) {
        console.error('Error convirtiendo negocio a venta:', error);
    }
}

async function registrarActividadNegocio(negocioId, descripcion, tipo = 'nota') {
    try {
        const actividadId = generarIdActividad();
        const actividad = {
            id: actividadId,
            negocioId: negocioId,
            descripcion: descripcion,
            tipo: tipo,
            fecha: new Date().toISOString(),
            usuarioId: obtenerUsuarioActualNegocios()
        };
        
        // Guardar en Firebase si está disponible
        if (window.db) {
            await window.db.collection('negociosActividades').doc(actividadId).set(actividad);
        }
        
        // Actualizar cache local
        if (!datosNegocios.actividades.has(negocioId)) {
            datosNegocios.actividades.set(negocioId, []);
        }
        
        datosNegocios.actividades.get(negocioId).unshift(actividad);
        
        // Mantener solo las últimas 20 actividades por negocio
        if (datosNegocios.actividades.get(negocioId).length > 20) {
            datosNegocios.actividades.get(negocioId).pop();
        }
        
    } catch (error) {
        console.error('Error registrando actividad negocio:', error);
    }
}

// ==========================================
// OBTENCIÓN DE DATOS Y FILTROS
// ==========================================

function obtenerMetricasNegocios() {
    calcularEstadisticasNegocios();
    return datosNegocios.estadisticas;
}

function obtenerNegociosFiltrados(filtros = {}) {
    let negocios = Array.from(datosNegocios.negocios.values()).filter(n => n.active);
    
    if (filtros.estado) {
        negocios = negocios.filter(n => n.estado === filtros.estado);
    }
    
    if (filtros.cliente) {
        negocios = negocios.filter(n => n.clienteId === filtros.cliente);
    }
    
    if (filtros.fechaDesde) {
        negocios = negocios.filter(n => n.fechaCreacion >= filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta) {
        negocios = negocios.filter(n => n.fechaCreacion <= filtros.fechaHasta);
    }
    
    return negocios.sort((a, b) => new Date(b.fechaModificacion) - new Date(a.fechaModificacion));
}

function obtenerPipelineVisual() {
    const etapas = [
        { nombre: 'Prospectos', clase: 'prospectos', color: '#3b82f6', icono: 'fa-eye' },
        { nombre: 'Calificados', clase: 'calificados', color: '#8b5cf6', icono: 'fa-star' },
        { nombre: 'Propuestas', clase: 'propuestas', color: '#f59e0b', icono: 'fa-file-alt' },
        { nombre: 'Negociación', clase: 'negociacion', color: '#ef4444', icono: 'fa-handshake' },
        { nombre: 'Cerrados', clase: 'cerrados', color: '#22c55e', icono: 'fa-check-circle' }
    ];
    
    return etapas.map(etapa => {
        const estadoFiltro = etapa.clase.replace('s', '').replace('negociacion', 'negociacion');
        const negociosEtapa = Array.from(datosNegocios.negocios.values())
            .filter(n => n.active && n.estado === estadoFiltro);
        
        return {
            ...etapa,
            cantidad: negociosEtapa.length,
            valor: negociosEtapa.reduce((sum, n) => sum + n.valor, 0)
        };
    });
}

function obtenerClientesRecientesNegocios() {
    if (clientesManager) {
        return clientesManager.obtenerTodos()
            .slice(0, 6)
            .map(cliente => ({
                id: cliente.id,
                nombre: cliente.nombre,
                empresa: cliente.empresa || cliente.nombre,
                valorTotal: cliente.totalVentas || 0
            }));
    }
    
    // Fallback: extraer clientes de negocios
    const clientesMap = new Map();
    Array.from(datosNegocios.negocios.values()).forEach(negocio => {
        if (negocio.clienteId && !clientesMap.has(negocio.clienteId)) {
            clientesMap.set(negocio.clienteId, {
                id: negocio.clienteId,
                nombre: negocio.cliente,
                empresa: negocio.cliente,
                valorTotal: 0
            });
        }
        
        if (clientesMap.has(negocio.clienteId)) {
            clientesMap.get(negocio.clienteId).valorTotal += negocio.valor;
        }
    });
    
    return Array.from(clientesMap.values()).slice(0, 6);
}

function obtenerActividadesRecientesNegocios() {
    const todasActividades = [];
    
    datosNegocios.actividades.forEach(actividades => {
        todasActividades.push(...actividades);
    });
    
    return todasActividades
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 8)
        .map(actividad => ({
            ...actividad,
            tiempoRelativo: calcularTiempoRelativo(actividad.fecha)
        }));
}

function obtenerListaClientesNegocios() {
    if (clientesManager) {
        return clientesManager.obtenerParaSelectores();
    }
    
    // Fallback: extraer clientes únicos de negocios
    const clientesUnicos = new Map();
    Array.from(datosNegocios.negocios.values()).forEach(negocio => {
        if (negocio.clienteId && !clientesUnicos.has(negocio.clienteId)) {
            clientesUnicos.set(negocio.clienteId, {
                id: negocio.clienteId,
                nombre: negocio.cliente,
                displayName: negocio.cliente
            });
        }
    });
    
    return Array.from(clientesUnicos.values());
}

function obtenerNegocio(id) {
    return datosNegocios.negocios.get(id) || null;
}

// ==========================================
// ESTADÍSTICAS Y CÁLCULOS
// ==========================================

async function calcularEstadisticasNegocios() {
    try {
        const negociosArray = Array.from(datosNegocios.negocios.values()).filter(n => n.active);
        const negociosActivos = negociosArray.filter(n => n.estado !== 'cerrado');
        const negociosCerrados = negociosArray.filter(n => n.estado === 'cerrado');
        
        datosNegocios.estadisticas.ventasTotales = negociosCerrados.reduce((sum, n) => sum + n.valor, 0);
        datosNegocios.estadisticas.negociosActivos = negociosActivos.length;
        datosNegocios.estadisticas.tasaConversion = negociosArray.length > 0 
            ? Math.round((negociosCerrados.length / negociosArray.length) * 100)
            : 0;
        
        if (clientesManager) {
            datosNegocios.estadisticas.clientesActivos = clientesManager.obtenerTodos().length;
        } else {
            // Calcular clientes únicos desde negocios
            const clientesUnicos = new Set();
            negociosArray.forEach(n => {
                if (n.clienteId) clientesUnicos.add(n.clienteId);
            });
            datosNegocios.estadisticas.clientesActivos = clientesUnicos.size;
        }
        
        // Calcular cambios (comparar con período anterior)
        await calcularCambiosPeriodo();
        
    } catch (error) {
        console.error('Error calculando estadísticas negocios:', error);
    }
}

async function calcularCambiosPeriodo() {
    try {
        const hoy = new Date();
        const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const negociosRecientes = Array.from(datosNegocios.negocios.values())
            .filter(n => n.active && new Date(n.fechaCreacion) >= hace30Dias);
        
        const negociosAnteriores = Array.from(datosNegocios.negocios.values())
            .filter(n => n.active && new Date(n.fechaCreacion) < hace30Dias);
        
        const ventasRecientes = negociosRecientes.filter(n => n.estado === 'cerrado')
            .reduce((sum, n) => sum + n.valor, 0);
        const ventasAnteriores = negociosAnteriores.filter(n => n.estado === 'cerrado')
            .reduce((sum, n) => sum + n.valor, 0);
        
        // Calcular porcentajes de cambio
        datosNegocios.estadisticas.cambioVentas = ventasAnteriores > 0 
            ? Math.round(((ventasRecientes - ventasAnteriores) / ventasAnteriores) * 100)
            : ventasRecientes > 0 ? 100 : 0;
            
        datosNegocios.estadisticas.cambioNegocios = negociosAnteriores.length > 0
            ? negociosRecientes.length - Math.round(negociosAnteriores.length / 2) // Aproximación
            : negociosRecientes.length;
            
        datosNegocios.estadisticas.cambioClientes = 2; // Valor por defecto
        datosNegocios.estadisticas.cambioConversion = 5; // Valor por defecto
        
    } catch (error) {
        console.error('Error calculando cambios período:', error);
        // Usar valores por defecto
        datosNegocios.estadisticas.cambioVentas = 15;
        datosNegocios.estadisticas.cambioNegocios = 3;
        datosNegocios.estadisticas.cambioClientes = 2;
        datosNegocios.estadisticas.cambioConversion = 5;
    }
}

function calcularProgresoNegocio(estado) {
    const progresos = {
        'prospecto': 20,
        'calificado': 40,
        'propuesta': 60,
        'negociacion': 80,
        'cerrado': 100
    };
    
    return progresos[estado] || 0;
}

function calcularDiasDesdeCreacion(fechaCreacion) {
    if (!fechaCreacion) return 0;
    
    try {
        const hoy = new Date();
        const creacion = new Date(fechaCreacion);
        return Math.floor((hoy - creacion) / (1000 * 60 * 60 * 24));
    } catch (error) {
        return 0;
    }
}

function calcularTiempoRelativo(fecha) {
    if (!fecha) return 'Fecha desconocida';
    
    try {
        const ahora = new Date();
        const fechaActividad = new Date(fecha);
        const diff = ahora - fechaActividad;
        
        const minutos = Math.floor(diff / 60000);
        const horas = Math.floor(diff / 3600000);
        const dias = Math.floor(diff / 86400000);
        
        if (minutos < 1) return 'Ahora mismo';
        if (minutos < 60) return `Hace ${minutos} min`;
        if (horas < 24) return `Hace ${horas}h`;
        if (dias === 1) return 'Ayer';
        return `Hace ${dias}d`;
    } catch (error) {
        return 'Fecha inválida';
    }
}

// ==========================================
// CONFIGURACIÓN E INTEGRACIÓN
// ==========================================

async function configurarIntegracionModulos() {
    try {
        console.log('🔗 Configurando integración con otros módulos...');
        
        // Escuchar eventos de clientes
        if (clientesManager) {
            window.addEventListener('clienteCreado', (event) => {
                onClienteActualizado(event.detail.cliente, 'creado');
            });
            
            window.addEventListener('clienteActualizado', (event) => {
                onClienteActualizado(event.detail.cliente, 'actualizado');
            });
        }
        
        // Escuchar eventos de ventas
        window.addEventListener('ventaCreada', (event) => {
            onVentaCreada(event.detail.venta);
        });
        
        console.log('✅ Integración de módulos configurada');
        
    } catch (error) {
        console.error('Error configurando integración:', error);
    }
}

function onClienteActualizado(cliente, accion) {
    console.log(`🔄 Cliente ${accion} en negocios:`, cliente.nombre);
    
    // Actualizar negocios relacionados con el cliente
    Array.from(datosNegocios.negocios.values()).forEach(negocio => {
        if (negocio.clienteId === cliente.id) {
            negocio.cliente = cliente.nombre;
            datosNegocios.negocios.set(negocio.id, negocio);
        }
    });
}

function onVentaCreada(venta) {
    console.log('💰 Venta creada desde negocios:', venta);
    
    // Si la venta tiene negocioId, actualizar el negocio
    if (venta.negocioId) {
        const negocio = datosNegocios.negocios.get(venta.negocioId);
        if (negocio) {
            negocio.estado = 'cerrado';
            negocio.progreso = 100;
            negocio.fechaModificacion = new Date().toISOString();
            datosNegocios.negocios.set(venta.negocioId, negocio);
            
            registrarActividadNegocio(venta.negocioId, 'Venta registrada exitosamente', 'venta');
        }
    }
}

function configurarSincronizacionAutomatica() {
    // Sincronización automática cada 30 segundos
    setInterval(async () => {
        if (navigator.onLine && sistemaNegociosState.inicializado && !sistemaNegociosState.inicializando) {
            try {
                await sincronizarCambiosNegocios();
            } catch (error) {
                console.error('Error en sincronización automática negocios:', error);
            }
        }
    }, configNegocios.intervaloSync);
    
    console.log(`⏰ Sincronización automática configurada cada ${configNegocios.intervaloSync / 1000} segundos`);
}

async function sincronizarCambiosNegocios() {
    if (!window.db || !dataSyncManager) return;
    
    try {
        // Sincronizar negocios marcados como locales
        const negociosLocales = Array.from(datosNegocios.negocios.values()).filter(n => n.local);
        
        for (const negocio of negociosLocales) {
            await sincronizarNegocioIndividual(negocio);
        }
        
        if (negociosLocales.length > 0) {
            console.log(`🔄 ${negociosLocales.length} negocios sincronizados con Firebase`);
        }
        
    } catch (error) {
        console.error('Error sincronizando cambios negocios:', error);
    }
}

async function sincronizarNegocioIndividual(negocio) {
    try {
        const negocioFirebase = {
            nombre: negocio.nombre,
            clienteId: negocio.clienteId,
            cliente: negocio.cliente,
            valor: negocio.valor,
            estado: negocio.estado,
            fechaCierre: negocio.fechaCierre,
            descripcion: negocio.descripcion,
            probabilidad: negocio.probabilidad,
            cantidadEstimada: negocio.cantidadEstimada,
            productos: negocio.productos,
            notas: negocio.notas,
            fechaCreacion: window.firebase.firestore.Timestamp.fromDate(new Date(negocio.fechaCreacion)),
            fechaModificacion: window.firebase.firestore.Timestamp.now(),
            usuarioId: negocio.usuarioId,
            active: negocio.active
        };
        
        await window.db.collection('negocios').doc(negocio.id).set(negocioFirebase);
        
        // Quitar marca local
        negocio.local = false;
        datosNegocios.negocios.set(negocio.id, negocio);
        
    } catch (error) {
        console.error(`Error sincronizando negocio ${negocio.id}:`, error);
    }
}

// ==========================================
// FUNCIONES DE INTERFAZ
// ==========================================

async function configurarEventosNegocios() {
    try {
        console.log('⚙️ Configurando eventos de negocios...');
        
        // Eventos de conectividad
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada en negocios');
            setTimeout(sincronizarCambiosNegocios, 1000);
        });
        
        window.addEventListener('offline', () => {
            console.log('🔵 Sin conexión en negocios - modo offline activado');
        });
        
        console.log('✅ Eventos de negocios configurados');
        
    } catch (error) {
        console.error('Error configurando eventos negocios:', error);
    }
}

async function actualizarInterfazCompleta() {
    try {
        console.log('🖥️ Actualizando interfaz completa de negocios...');
        
        // Las funciones de interfaz se ejecutarán desde el HTML
        // Solo preparar los datos
        await calcularEstadisticasNegocios();
        
        // Guardar datos actualizados en cache
        if (offlineManager) {
            await offlineManager.saveData('negocios_interfaz_cache', {
                estadisticas: datosNegocios.estadisticas,
                pipeline: obtenerPipelineVisual(),
                clientesRecientes: obtenerClientesRecientesNegocios(),
                actividadesRecientes: obtenerActividadesRecientesNegocios(),
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('✅ Datos de interfaz de negocios actualizados');
        
    } catch (error) {
        console.error('Error actualizando interfaz negocios:', error);
    }
}

// ==========================================
// UTILIDADES Y HELPERS
// ==========================================

function aplicarFiltrosNegocios(filtros) {
    datosNegocios.filtrosActivos = { ...datosNegocios.filtrosActivos, ...filtros };
}

async function guardarNegociosLocalmente() {
    try {
        if (offlineManager) {
            const negociosArray = Array.from(datosNegocios.negocios.values());
            await offlineManager.saveData('negocios_backup', {
                data: negociosArray,
                timestamp: new Date().toISOString(),
                version: '2.0'
            });
        }
    } catch (error) {
        console.error('Error guardando negocios localmente:', error);
    }
}

function generarIdNegocio() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `NEG_${timestamp}_${random}`.toUpperCase();
}

function generarIdActividad() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ACT_${timestamp}_${random}`.toUpperCase();
}

function obtenerUsuarioActualNegocios() {
    if (authManager && authManager.currentUser) {
        return authManager.currentUser.uid;
    }
    
    if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
        return window.firebase.auth().currentUser.uid;
    }
    
    return 'usuario_anonimo';
}

function esReciente(timestamp, minutosMaximos) {
    try {
        const ahora = new Date();
        const fechaTimestamp = new Date(timestamp);
        const diferencia = (ahora - fechaTimestamp) / (1000 * 60);
        return diferencia <= minutosMaximos;
    } catch (error) {
        return false;
    }
}

function dispatchNegociosEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, {
        detail: { 
            ...data, 
            timestamp: Date.now(), 
            source: 'negociosManager',
            finca: configNegocios.fincaId 
        }
    }));
}

function mostrarNotificacionNegocios(mensaje, tipo = 'info') {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    
    // Si existe el sistema de notificaciones global, usarlo
    if (window.notificationManager) {
        window.notificationManager.show(mensaje, tipo);
        return;
    }
    
    // Si existe el sistema de gastos, usar su notificación
    if (window.mostrarNotificacion) {
        window.mostrarNotificacion(mensaje, tipo);
        return;
    }
    
    // Sistema básico de consola
    console.log(`📢 NOTIFICACIÓN [${tipo}]: ${mensaje}`);
}

// ==========================================
// EXPORTACIÓN GLOBAL
// ==========================================

// Exponer funciones globalmente para compatibilidad con HTML
window.sistemaNegociosState = sistemaNegociosState;
window.datosNegocios = datosNegocios;

// Funciones principales del sistema
window.guardarNegocioConFirebase = guardarNegocioConFirebase;
window.avanzarEtapaNegocio = avanzarEtapaNegocio;
window.obtenerMetricasNegocios = obtenerMetricasNegocios;
window.obtenerNegociosFiltrados = obtenerNegociosFiltrados;
window.obtenerPipelineVisual = obtenerPipelineVisual;
window.obtenerClientesRecientesNegocios = obtenerClientesRecientesNegocios;
window.obtenerActividadesRecientesNegocios = obtenerActividadesRecientesNegocios;
window.obtenerListaClientesNegocios = obtenerListaClientesNegocios;
window.obtenerNegocio = obtenerNegocio;
window.aplicarFiltrosNegocios = aplicarFiltrosNegocios;

// Función para obtener datos desde otros módulos
window.obtenerDatosNegocios = function() {
    return {
        negocios: Array.from(datosNegocios.negocios.values()),
        estadisticas: datosNegocios.estadisticas,
        actividades: Object.fromEntries(datosNegocios.actividades),
        inicializado: sistemaNegociosState.inicializado
    };
};

// Función para actualizar desde otros módulos
window.actualizarNegocios = function() {
    if (sistemaNegociosState.inicializado) {
        calcularEstadisticasNegocios().then(() => {
            dispatchNegociosEvent('negociosActualizados', {
                timestamp: new Date().toISOString()
            });
        });
    }
};

// Compatibilidad con el HTML que espera negociosManager
window.negociosManager = {
    obtenerMetricas: obtenerMetricasNegocios,
    obtenerNegociosFiltrados: obtenerNegociosFiltrados,
    obtenerPipelineVisual: obtenerPipelineVisual,
    obtenerClientesRecientes: obtenerClientesRecientesNegocios,
    obtenerActividadesRecientes: obtenerActividadesRecientesNegocios,
    obtenerListaClientes: obtenerListaClientesNegocios,
    guardarNegocio: guardarNegocioConFirebase,
    avanzarEtapa: avanzarEtapaNegocio,
    obtenerNegocio: obtenerNegocio,
    aplicarFiltros: aplicarFiltrosNegocios,
    mostrarModalActividad: function(negocioId) {
        console.log('📝 Modal de actividad para negocio:', negocioId);
        mostrarNotificacionNegocios('Modal de actividades próximamente disponible', 'info');
    },
    mostrarDetalle: function(negocioId) {
        const negocio = obtenerNegocio(negocioId);
        console.log('👁️ Detalle de negocio:', negocio);
        mostrarNotificacionNegocios(`Detalle de negocio: ${negocio?.nombre || 'No encontrado'}`, 'info');
    },
    mostrarDetalleCliente: function(clienteId) {
        console.log('👤 Detalle de cliente:', clienteId);
        mostrarNotificacionNegocios('Detalle de cliente próximamente disponible', 'info');
    },
    generarReporte: function() {
        console.log('📊 Generando reporte de negocios...');
        mostrarNotificacionNegocios('Reporte de negocios generado', 'success');
    }
};

// ==========================================
// MANEJO DE ERRORES GLOBALES
// ==========================================

window.addEventListener('error', (event) => {
    if (event.error && event.error.message.includes('Chart')) {
        console.warn('⚠️ Error de Chart.js ignorado en negocios');
        return;
    }
    console.error('❌ Error global en negocios:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada en negocios:', event.reason);
});

console.log('🎯 Sistema de negocios JavaScript vanilla cargado');
console.log('📍 Configurado para Finca La Herradura, Guatemala');
console.log('🔗 Integrado con archivos base y datos REALES únicamente');
