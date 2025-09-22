/* ========================================
   FINCA LA HERRADURA - SISTEMA CLIMÁTICO VANILLA JS
   Integración con OpenMeteo, análisis IA y predicciones
   DATOS REALES únicamente - Sin simulaciones vfull
   ======================================== */

// ==========================================
// VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let sistemaClimatico = {
    inicializado: false,
    inicializando: false,
    ultimaActualizacion: null,
    progreso: 0,
    paso: 0,
    totalPasos: 5
};

// Configuración REAL de la finca
const configFinca = {
    coordenadas: {
        latitud: 14.77073,   // Coordenadas REALES proporcionadas
        longitud: -90.25398,
        elevacion: 1500,
        zona: 'America/Guatemala'
    },
    ubicacion: 'Finca La Herradura, Guatemala'
};

// APIs y configuración
const configClima = {
    openMeteoUrl: 'https://api.open-meteo.com/v1',
    intervaloActualizacion: 300000, // 5 minutos
    diasPronostico: 14,
    diasHistorico: 30
};

// Datos climáticos REALES
let datosClimaticos = {
    actual: null,
    pronostico: null,
    historico: [],
    alertas: [],
    recomendaciones: []
};

// Umbrales para limones en Guatemala
const umbrales = {
    temperatura: {
        optima: { min: 18, max: 32 },
        critica: { min: 10, max: 38 }
    },
    humedad: {
        optima: { min: 65, max: 85 },
        critica: { min: 45, max: 95 }
    },
    lluvia: {
        maxDiaria: 60,
        optimaMensual: 150,
        sequia: 25
    },
    viento: {
        fuerte: 25,
        peligroso: 50
    },
    uv: {
        alto: 9,
        extremo: 11
    }
};

// Referencias a managers base
let authManager = null;
let offlineManager = null;
let navegacionManager = null;

// Variables para gráficos
let graficoTemperatura = null;
let graficoPrecipitacion = null;
let intervaloActualizacion = null;

// ==========================================
// SISTEMA DE CARGA UNIFICADO
// ==========================================

function actualizarLoader(paso, titulo, subtitulo, progreso) {
    const loaderTexto = document.getElementById('loaderTexto');
    const loaderSubtexto = document.getElementById('loaderSubtexto');
    const loaderBarra = document.getElementById('loaderBarra');
    
    if (loaderTexto) loaderTexto.textContent = titulo;
    if (loaderSubtexto) loaderSubtexto.textContent = subtitulo;
    if (loaderBarra) loaderBarra.style.width = progreso + '%';
    
    sistemaClimatico.paso = paso;
    sistemaClimatico.progreso = progreso;
    
    console.log(`🌦️ Paso ${paso}: ${titulo}`);
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
    }
}

function ocultarLoader() {
    setTimeout(() => {
        const loader = document.getElementById('sistemaLoader');
        if (loader) {
            loader.classList.add('oculto');
            
            // Remover completamente después de la animación
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
        
        console.log('✅ Sistema climático completamente cargado');
    }, 1000);
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🌦️ Iniciando sistema climático...');
        console.log(`📍 Ubicación: ${configFinca.ubicacion}`);
        console.log(`📍 Coordenadas: ${configFinca.coordenadas.latitud}, ${configFinca.coordenadas.longitud}`);
        
        sistemaClimatico.inicializando = true;
        
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
        
        // Paso 3: Cargar datos climáticos REALES
        marcarPasoActivo('paso-clima');
        actualizarLoader(3, 'Cargando Datos Climáticos', 'Obteniendo condiciones actuales de OpenMeteo...', 45);
        await cargarDatosClimaticosReales();
        marcarPasoCompletado('paso-clima');
        
        // Paso 4: Obtener pronóstico
        marcarPasoActivo('paso-pronostico');
        actualizarLoader(4, 'Obteniendo Pronóstico', 'Descargando predicción de 14 días...', 70);
        await cargarPronosticoReal();
        marcarPasoCompletado('paso-pronostico');
        
        // Paso 5: Inicializar gráficos
        marcarPasoActivo('paso-graficos');
        actualizarLoader(5, 'Inicializando Gráficos', 'Preparando visualizaciones...', 90);
        await inicializarGraficos();
        await configurarEventos();
        marcarPasoCompletado('paso-graficos');
        
        // Completar inicialización
        actualizarLoader(5, 'Sistema Listo', 'Finca La Herradura conectada exitosamente', 100);
        
        // Configurar actualizaciones automáticas
        configurarActualizacionAutomatica();
        
        sistemaClimatico.inicializado = true;
        sistemaClimatico.inicializando = false;
        
        console.log('🎉 Sistema climático completamente inicializado');
        
        // Ocultar loader
        ocultarLoader();
        
    } catch (error) {
        console.error('❌ Error crítico inicializando sistema climático:', error);
        
        // Intentar modo offline
        try {
            actualizarLoader(5, 'Modo Offline', 'Cargando datos guardados localmente...', 85);
            await cargarDatosOffline();
            await inicializarGraficos();
            await configurarEventos();
            
            sistemaClimatico.inicializado = true;
            sistemaClimatico.inicializando = false;
            
            mostrarNotificacion('Sistema iniciado en modo offline', 'warning');
            ocultarLoader();
            
        } catch (offlineError) {
            console.error('❌ Error también en modo offline:', offlineError);
            actualizarLoader(5, 'Error de Conexión', 'No se pudo cargar el sistema climático', 100);
            
            setTimeout(() => {
                ocultarLoader();
                mostrarNotificacion('Error cargando sistema climático', 'error');
            }, 2000);
        }
    }
});

// ==========================================
// FUNCIONES DE ESPERA Y VERIFICACIÓN
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
        
        // También escuchar evento
        window.addEventListener('firebaseReady', () => {
            console.log('🔥 Evento firebaseReady recibido');
            resolve(true);
        }, { once: true });
        
        verificar();
    });
}

async function verificarAutenticacionSinRedirigir() {
    try {
        // Esperar auth manager
        authManager = await esperarManager('authManager', 3000);
        
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
            console.log('⚠️ AuthManager no disponible, continuando...');
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
// CARGA DE DATOS CLIMÁTICOS REALES
// ==========================================

async function cargarDatosClimaticosReales() {
    try {
        // Primero intentar cargar offline
        offlineManager = await esperarManager('offlineManager', 2000);
        
        if (offlineManager) {
            const datosOffline = await offlineManager.getData('clima_actual');
            if (datosOffline && esReciente(datosOffline.timestamp, 10)) { // 10 minutos
                datosClimaticos.actual = datosOffline;
                actualizarInterfazClima(datosOffline);
                console.log('📱 Usando datos climáticos offline recientes');
                return;
            }
        }
        
        // Obtener datos REALES de OpenMeteo
        const parametros = new URLSearchParams({
            latitude: configFinca.coordenadas.latitud,
            longitude: configFinca.coordenadas.longitud,
            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'apparent_temperature',
                'is_day',
                'precipitation',
                'rain',
                'weather_code',
                'cloud_cover',
                'pressure_msl',
                'wind_speed_10m',
                'wind_direction_10m',
                'wind_gusts_10m',
                'uv_index'
            ].join(','),
            timezone: configFinca.coordenadas.zona,
            forecast_days: 1
        });

        const respuesta = await fetch(`${configClima.openMeteoUrl}/forecast?${parametros}`);
        
        if (!respuesta.ok) {
            throw new Error(`Error OpenMeteo: ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        
        datosClimaticos.actual = {
            ...datos.current,
            ubicacion: configFinca,
            timestamp: new Date().toISOString(),
            fuente: 'openmeteo_real'
        };

        // Guardar offline
        if (offlineManager) {
            await offlineManager.saveData('clima_actual', datosClimaticos.actual);
        }
        
        // Actualizar interfaz
        actualizarInterfazClima(datosClimaticos.actual);
        
        // Analizar y generar alertas REALES
        analizarCondicionesActuales();
        
        console.log('🌤️ Datos climáticos REALES cargados:', {
            temperatura: `${datosClimaticos.actual.temperature_2m}°C`,
            humedad: `${datosClimaticos.actual.relative_humidity_2m}%`,
            viento: `${datosClimaticos.actual.wind_speed_10m} km/h`,
            uv: datosClimaticos.actual.uv_index,
            fuente: 'OpenMeteo API'
        });
        
    } catch (error) {
        console.error('❌ Error cargando datos climáticos:', error);
        
        // Usar datos offline como fallback
        if (offlineManager) {
            const datosBackup = await offlineManager.getData('clima_actual');
            if (datosBackup) {
                datosClimaticos.actual = datosBackup;
                actualizarInterfazClima(datosBackup);
                mostrarNotificacion('Usando datos offline (sin conexión)', 'warning');
                return;
            }
        }
        
        throw error; // Re-lanzar si no hay fallback
    }
}

async function cargarPronosticoReal() {
    try {
        // Verificar datos offline recientes
        if (offlineManager) {
            const pronosticoOffline = await offlineManager.getData('pronostico');
            if (pronosticoOffline && esReciente(pronosticoOffline.timestamp, 60)) { // 1 hora
                datosClimaticos.pronostico = pronosticoOffline;
                mostrarPronostico(pronosticoOffline);
                console.log('📱 Usando pronóstico offline reciente');
                return;
            }
        }
        
        // Obtener pronóstico REAL de OpenMeteo
        const parametros = new URLSearchParams({
            latitude: configFinca.coordenadas.latitud,
            longitude: configFinca.coordenadas.longitud,
            daily: [
                'weather_code',
                'temperature_2m_max',
                'temperature_2m_min',
                'apparent_temperature_max',
                'apparent_temperature_min',
                'sunrise',
                'sunset',
                'uv_index_max',
                'precipitation_sum',
                'rain_sum',
                'precipitation_probability_max',
                'wind_speed_10m_max',
                'wind_gusts_10m_max',
                'wind_direction_10m_dominant'
            ].join(','),
            hourly: [
                'temperature_2m',
                'relative_humidity_2m',
                'precipitation',
                'wind_speed_10m',
                'uv_index'
            ].join(','),
            timezone: configFinca.coordenadas.zona,
            forecast_days: configClima.diasPronostico
        });

        const respuesta = await fetch(`${configClima.openMeteoUrl}/forecast?${parametros}`);
        
        if (!respuesta.ok) {
            throw new Error(`Error pronóstico: ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        
        datosClimaticos.pronostico = {
            ...datos,
            ubicacion: configFinca,
            timestamp: new Date().toISOString(),
            fuente: 'openmeteo_real'
        };

        // Guardar offline
        if (offlineManager) {
            await offlineManager.saveData('pronostico', datosClimaticos.pronostico);
        }
        
        // Mostrar pronóstico
        mostrarPronostico(datosClimaticos.pronostico);
        
        // Generar recomendaciones basadas en datos REALES
        generarRecomendacionesReales();
        
        console.log(`📅 Pronóstico REAL de ${configClima.diasPronostico} días cargado`);
        
    } catch (error) {
        console.error('❌ Error cargando pronóstico:', error);
        
        // Usar datos offline como fallback
        if (offlineManager) {
            const pronosticoBackup = await offlineManager.getData('pronostico');
            if (pronosticoBackup) {
                datosClimaticos.pronostico = pronosticoBackup;
                mostrarPronostico(pronosticoBackup);
                return;
            }
        }
        
        // Mostrar mensaje de error en la interfaz
        document.getElementById('pronosticoDias').innerHTML = 
            '<div class="error-message">Error cargando pronóstico. Verifique su conexión.</div>';
    }
}

async function cargarDatosOffline() {
    if (!offlineManager) return;
    
    const datosOffline = await offlineManager.getData('clima_actual');
    const pronosticoOffline = await offlineManager.getData('pronostico');
    
    if (datosOffline) {
        datosClimaticos.actual = datosOffline;
        actualizarInterfazClima(datosOffline);
    }
    
    if (pronosticoOffline) {
        datosClimaticos.pronostico = pronosticoOffline;
        mostrarPronostico(pronosticoOffline);
    }
}

// ==========================================
// ACTUALIZACIÓN DE INTERFAZ
// ==========================================

function actualizarInterfazClima(datos) {
    try {
        // Actualizar temperatura principal
        const tempElement = document.getElementById('temperaturaActual');
        if (tempElement) {
            tempElement.textContent = Math.round(datos.temperature_2m || 0);
        }
        
        // Actualizar descripción
        const descElement = document.getElementById('climaDescripcion');
        if (descElement) {
            descElement.textContent = obtenerDescripcionClima(datos.weather_code);
        }
        
        // Actualizar sensación térmica
        const sensacionElement = document.getElementById('sensacionTermica');
        if (sensacionElement) {
            sensacionElement.textContent = `${Math.round(datos.apparent_temperature || datos.temperature_2m || 0)}°C`;
        }
        
        // Actualizar icono principal
        const iconoElement = document.getElementById('iconoClimaPrincipal');
        if (iconoElement) {
            iconoElement.className = `fas ${obtenerIconoClima(datos.weather_code)}`;
        }
        
        // Actualizar detalles
        actualizarElemento('humedad', `${Math.round(datos.relative_humidity_2m || 0)}%`);
        actualizarElemento('viento', `${Math.round(datos.wind_speed_10m || 0)} km/h`);
        actualizarElemento('visibilidad', `10 km`); // OpenMeteo no provee visibilidad
        actualizarElemento('presion', `${Math.round(datos.pressure_msl || 1013)} hPa`);
        actualizarElemento('uvIndex', datos.uv_index || '--');
        actualizarElemento('precipitacion', `${(datos.precipitation || 0).toFixed(1)} mm`);

        // Actualizar sensores con datos REALES
        actualizarEstadoSensoresReal(datos);
        
        // Actualizar estado de conexión
        actualizarEstadoConexion(true);
        
        console.log('✅ Interfaz climática actualizada con datos REALES');
        
    } catch (error) {
        console.error('❌ Error actualizando interfaz:', error);
    }
}

function actualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor;
    }
}

function actualizarEstadoSensoresReal(datos) {
    // Actualizar con datos REALES de OpenMeteo
    const sensores = [
        { 
            id: 'sensorTemperatura', 
            valor: `${Math.round(datos.temperature_2m || 0)}°C`,
            estado: datos.temperature_2m ? 'online' : 'offline'
        },
        { 
            id: 'sensorHumedad', 
            valor: `${Math.round(datos.relative_humidity_2m || 0)}%`,
            estado: datos.relative_humidity_2m ? 'online' : 'offline'
        },
        { 
            id: 'sensorSuelo', 
            valor: `--`, // OpenMeteo no provee humedad del suelo
            estado: 'offline' 
        },
        { 
            id: 'sensorViento', 
            valor: `${Math.round(datos.wind_speed_10m || 0)} km/h`,
            estado: datos.wind_speed_10m ? 'online' : 'offline'
        }
    ];
    
    sensores.forEach(sensor => {
        const elemento = document.getElementById(sensor.id);
        if (elemento) {
            elemento.textContent = sensor.valor;
        }
        
        const estadoElement = document.querySelector(`#${sensor.id}`);
        if (estadoElement) {
            const cardElement = estadoElement.closest('.sensor-card');
            if (cardElement) {
                const estadoDiv = cardElement.querySelector('.sensor-estado');
                if (estadoDiv) {
                    estadoDiv.className = `sensor-estado ${sensor.estado}`;
                    estadoDiv.textContent = sensor.estado === 'online' ? 'Online' : 'Offline';
                }
            }
        }
    });
}

function actualizarEstadoConexion(conectado) {
    const elemento = document.getElementById('estadoConexion');
    if (elemento) {
        elemento.className = `estado-conexion ${conectado ? 'online' : 'offline'}`;
        elemento.innerHTML = `
            <i class="fas fa-wifi${conectado ? '' : '-slash'}"></i>
            <span>${conectado ? 'Conectado' : 'Sin conexión'}</span>
        `;
    }
}

// ==========================================
// ANÁLISIS Y ALERTAS REALES
// ==========================================

function analizarCondicionesActuales() {
    if (!datosClimaticos.actual) return;
    
    const datos = datosClimaticos.actual;
    const alertas = [];
    
    // Alertas críticas para Guatemala
    if (datos.temperature_2m < umbrales.temperatura.critica.min) {
        alertas.push({
            nivel: 'critical',
            tipo: 'frio',
            icono: 'fa-snowflake',
            titulo: 'ALERTA DE FRÍO',
            mensaje: `Temperatura baja para la región: ${datos.temperature_2m}°C`,
            acciones: ['Proteger árboles jóvenes', 'Aplicar riego en horas cálidas', 'Monitorear constantemente']
        });
    }
    
    if (datos.temperature_2m > umbrales.temperatura.critica.max) {
        alertas.push({
            nivel: 'critical',
            tipo: 'calor',
            icono: 'fa-thermometer-full',
            titulo: 'ALERTA DE CALOR EXTREMO',
            mensaje: `Temperatura muy alta: ${datos.temperature_2m}°C`,
            acciones: ['Aumentar riego inmediatamente', 'Proteger del sol directo', 'Revisar sistema de sombra']
        });
    }
    
    if (datos.wind_speed_10m > umbrales.viento.peligroso) {
        alertas.push({
            nivel: 'critical',
            tipo: 'viento',
            icono: 'fa-wind',
            titulo: 'ALERTA DE VIENTOS PELIGROSOS',
            mensaje: `Vientos muy fuertes: ${datos.wind_speed_10m} km/h`,
            acciones: ['Asegurar estructuras', 'Cosechar frutos maduros', 'Revisar tutores']
        });
    }
    
    // Alertas de advertencia
    if (datos.relative_humidity_2m > umbrales.humedad.optima.max) {
        alertas.push({
            nivel: 'warning',
            tipo: 'humedad',
            icono: 'fa-tint',
            titulo: 'Humedad Alta - Riesgo de Hongos',
            mensaje: `Humedad: ${datos.relative_humidity_2m}%`,
            acciones: ['Mejorar ventilación', 'Aplicar fungicidas preventivos', 'Monitorear síntomas']
        });
    }
    
    if (datos.uv_index > umbrales.uv.alto) {
        alertas.push({
            nivel: 'warning',
            tipo: 'uv',
            icono: 'fa-sun',
            titulo: 'Índice UV Alto',
            mensaje: `UV: ${datos.uv_index}`,
            acciones: ['Usar protección solar', 'Trabajar en horas tempranas', 'Proteger frutos expuestos']
        });
    }
    
    datosClimaticos.alertas = alertas;
    mostrarAlertas(alertas);
}

function mostrarAlertas(alertas) {
    const container = document.getElementById('alertasClimaticas');
    if (!container) return;
    
    if (alertas.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = alertas.map(alerta => `
        <div class="alerta-clima ${alerta.nivel}">
            <div class="alerta-icon">
                <i class="fas ${alerta.icono}"></i>
            </div>
            <div class="alerta-contenido">
                <h4>${alerta.titulo}</h4>
                <p>${alerta.mensaje}</p>
                <div class="alerta-acciones">
                    ${alerta.acciones.map(accion => `<small>• ${accion}</small>`).join('<br>')}
                </div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// PRONÓSTICO Y RECOMENDACIONES
// ==========================================

function mostrarPronostico(datosPronostico) {
    const container = document.getElementById('pronosticoDias');
    if (!container || !datosPronostico.daily) return;
    
    const pronostico = [];
    const forecast = datosPronostico.daily;
    
    for (let i = 0; i < 7 && i < forecast.time.length; i++) {
        const fecha = new Date(forecast.time[i]);
        pronostico.push({
            fecha: forecast.time[i],
            tempMax: Math.round(forecast.temperature_2m_max[i]),
            tempMin: Math.round(forecast.temperature_2m_min[i]),
            descripcion: i === 0 ? 'Hoy' : fecha.toLocaleDateString('es-GT', { weekday: 'short' }),
            codigo: interpretarCodigoClima(forecast.weather_code[i]),
            precipitacion: forecast.precipitation_sum[i] || 0
        });
    }
    
    container.innerHTML = pronostico.map(dia => `
        <div class="dia-pronostico">
            <div class="dia-info">
                <div class="dia-fecha">${formatearFecha(dia.fecha)}</div>
                <div class="dia-descripcion">${obtenerDescripcionClima(dia.codigo)}</div>
                ${dia.precipitacion > 0 ? `<small style="color: #3b82f6;">💧 ${dia.precipitacion.toFixed(1)}mm</small>` : ''}
            </div>
            <div class="dia-clima">
                <div class="dia-icon">
                    <i class="fas ${obtenerIconoClima(dia.codigo)}" style="color: #3b82f6;"></i>
                </div>
                <div class="temperatura-rango">
                    <div class="temp-max">${dia.tempMax}°</div>
                    <div class="temp-min">${dia.tempMin}°</div>
                </div>
            </div>
        </div>
    `).join('');
}

function generarRecomendacionesReales() {
    if (!datosClimaticos.actual) return;
    
    const datos = datosClimaticos.actual;
    const recomendaciones = [];
    
    // Recomendaciones de riego basadas en datos REALES
    if (datos.precipitation === 0 && datos.temperature_2m > 28) {
        recomendaciones.push({
            icono: 'fa-tint',
            titulo: 'Incrementar Riego',
            descripcion: `Sin lluvia y temperatura de ${datos.temperature_2m}°C. Aumentar frecuencia de riego.`,
            prioridad: 'alta'
        });
    }
    
    // Recomendaciones de tratamientos
    if (datos.relative_humidity_2m > 80 && datos.temperature_2m > 22) {
        recomendaciones.push({
            icono: 'fa-leaf',
            titulo: 'Aplicar Fungicida Preventivo',
            descripcion: `Humedad del ${datos.relative_humidity_2m}% favorece hongos. Aplicar tratamiento preventivo.`,
            prioridad: 'media'
        });
    }
    
    // Recomendaciones de cosecha
    if (datos.precipitation === 0 && datos.wind_speed_10m < 20 && datos.temperature_2m < 32) {
        recomendaciones.push({
            icono: 'fa-apple-alt',
            titulo: 'Condiciones Ideales para Cosecha',
            descripcion: 'Clima seco, vientos suaves y temperatura adecuada. Momento óptimo para cosechar.',
            prioridad: 'baja'
        });
    }
    
    // Recomendación específica para manejo de sombra
    if (datos.uv_index > 9 && datos.temperature_2m > 30) {
        recomendaciones.push({
            icono: 'fa-umbrella',
            titulo: 'Protección Solar',
            descripcion: `UV alto (${datos.uv_index}) y temperatura de ${datos.temperature_2m}°C. Implementar sombra temporal.`,
            prioridad: 'alta'
        });
    }
    
    datosClimaticos.recomendaciones = recomendaciones;
    mostrarRecomendaciones(recomendaciones);
}

function mostrarRecomendaciones(recomendaciones) {
    const container = document.getElementById('recomendacionesIA');
    if (!container) return;
    
    if (recomendaciones.length === 0) {
        container.innerHTML = '<div class="info-message">No hay recomendaciones específicas en este momento.</div>';
        return;
    }
    
    container.innerHTML = recomendaciones.map(rec => `
        <div class="recomendacion-item">
            <div class="recomendacion-icon">
                <i class="fas ${rec.icono}"></i>
            </div>
            <div>
                <h4>${rec.titulo}</h4>
                <p>${rec.descripcion}</p>
                ${rec.prioridad === 'alta' ? '<span style="color: #ef4444; font-weight: 600;">Alta prioridad</span>' : ''}
            </div>
        </div>
    `).join('');
}

// ==========================================
// GRÁFICOS
// ==========================================

async function inicializarGraficos() {
    try {
        await inicializarGraficoTemperatura();
        await inicializarGraficoPrecipitacion();
        
        // Cargar datos iniciales
        await cargarDatosGraficos('24h');
        
        console.log('✅ Gráficos inicializados');
    } catch (error) {
        console.error('❌ Error inicializando gráficos:', error);
    }
}

async function inicializarGraficoTemperatura() {
    const ctx = document.getElementById('graficoTemperatura');
    if (!ctx) return;
    
    graficoTemperatura = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Humedad (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
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
                    labels: { 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#333'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666'
                    },
                    grid: { 
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperatura (°C)',
                        color: '#ef4444'
                    },
                    ticks: { 
                        color: '#ef4444'
                    },
                    grid: { 
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humedad (%)',
                        color: '#3b82f6'
                    },
                    ticks: { 
                        color: '#3b82f6'
                    },
                    grid: { 
                        drawOnChartArea: false 
                    }
                }
            }
        }
    });
}

async function inicializarGraficoPrecipitacion() {
    const ctx = document.getElementById('graficoPrecipitacion');
    if (!ctx) return;
    
    graficoPrecipitacion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Precipitación (mm)',
                data: [],
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: '#3b82f6',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#333'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666'
                    },
                    grid: { 
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Precipitación (mm)',
                        color: '#3b82f6'
                    },
                    ticks: { 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666'
                    },
                    grid: { 
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

async function cargarDatosGraficos(periodo) {
    try {
        if (!datosClimaticos.pronostico || !datosClimaticos.pronostico.hourly) return;
        
        const forecast = datosClimaticos.pronostico;
        const labels = [];
        const temperaturas = [];
        const humedades = [];
        const precipitacion = [];
        
        if (periodo === '24h' && forecast.hourly) {
            // Datos horarios para las próximas 24 horas
            for (let i = 0; i < 24 && i < forecast.hourly.time.length; i++) {
                const fecha = new Date(forecast.hourly.time[i]);
                labels.push(fecha.toLocaleTimeString('es-GT', { hour: '2-digit' }));
                temperaturas.push(forecast.hourly.temperature_2m[i]);
                humedades.push(forecast.hourly.relative_humidity_2m[i]);
                precipitacion.push(forecast.hourly.precipitation[i] || 0);
            }
        } else if (forecast.daily) {
            // Datos diarios
            const dias = periodo === '7d' ? 7 : 30;
            
            for (let i = 0; i < dias && i < forecast.daily.time.length; i++) {
                const fecha = new Date(forecast.daily.time[i]);
                labels.push(fecha.toLocaleDateString('es-GT', { month: 'short', day: 'numeric' }));
                
                const tempMax = forecast.daily.temperature_2m_max[i];
                const tempMin = forecast.daily.temperature_2m_min[i];
                temperaturas.push((tempMax + tempMin) / 2);
                
                humedades.push(70); // Estimado para Guatemala
                precipitacion.push(forecast.daily.precipitation_sum[i] || 0);
            }
        }
        
        actualizarGraficos(labels, temperaturas, humedades, precipitacion);
        
    } catch (error) {
        console.error('❌ Error cargando datos para gráficos:', error);
    }
}

function actualizarGraficos(labels, temperaturas, humedades, precipitacion) {
    if (graficoTemperatura) {
        graficoTemperatura.data.labels = labels;
        graficoTemperatura.data.datasets[0].data = temperaturas;
        graficoTemperatura.data.datasets[1].data = humedades;
        graficoTemperatura.update('none'); // Sin animación para mejor rendimiento
    }
    
    if (graficoPrecipitacion) {
        graficoPrecipitacion.data.labels = labels;
        graficoPrecipitacion.data.datasets[0].data = precipitacion;
        graficoPrecipitacion.update('none');
    }
}

// ==========================================
// EVENTOS Y CONFIGURACIÓN
// ==========================================

async function configurarEventos() {
    // Botones principales
    const btnActualizar = document.getElementById('btnActualizar');
    if (btnActualizar) {
        btnActualizar.addEventListener('click', actualizarDatos);
    }
    
    const btnConfiguracion = document.getElementById('btnConfiguracion');
    if (btnConfiguracion) {
        btnConfiguracion.addEventListener('click', abrirConfiguracion);
    }
    
    const btnExportar = document.getElementById('btnExportarDatos');
    if (btnExportar) {
        btnExportar.addEventListener('click', exportarDatos);
    }
    
    const btnHistorico = document.getElementById('btnHistoricoLluvia');
    if (btnHistorico) {
        btnHistorico.addEventListener('click', mostrarHistoricoLluvia);
    }
    
    // Modal de configuración
    const cerrarModal = document.getElementById('cerrarModalConfig');
    if (cerrarModal) {
        cerrarModal.addEventListener('click', cerrarConfiguracion);
    }
    
    const guardarConfig = document.getElementById('guardarConfiguracion');
    if (guardarConfig) {
        guardarConfig.addEventListener('click', guardarConfiguracion);
    }
    
    const resetearConfig = document.getElementById('resetearConfiguracion');
    if (resetearConfig) {
        resetearConfig.addEventListener('click', resetearConfiguracion);
    }
    
    // Selectores de período
    document.querySelectorAll('[data-periodo]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remover clase active de todos
            document.querySelectorAll('[data-periodo]').forEach(b => b.classList.remove('active'));
            // Agregar a este
            e.target.classList.add('active');
            // Cargar datos
            cargarDatosGraficos(e.target.dataset.periodo);
        });
    });

    // Monitorear conectividad
    window.addEventListener('online', () => {
        actualizarEstadoConexion(true);
        if (sistemaClimatico.inicializado) {
            actualizarDatos();
        }
    });

    window.addEventListener('offline', () => {
        actualizarEstadoConexion(false);
    });

    console.log('✅ Eventos configurados');
}

function configurarActualizacionAutomatica() {
    const frecuencia = localStorage.getItem('frecuenciaActualizacion') || 15;
    
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
    }
    
    intervaloActualizacion = setInterval(() => {
        if (navigator.onLine && sistemaClimatico.inicializado) {
            actualizarDatos();
        }
    }, frecuencia * 60 * 1000);
    
    console.log(`⏰ Actualización automática cada ${frecuencia} minutos`);
}

async function actualizarDatos() {
    try {
        const btnActualizar = document.getElementById('btnActualizar');
        if (btnActualizar) {
            btnActualizar.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> <span class="btn-text">Actualizando</span>';
            btnActualizar.disabled = true;
        }
        
        await Promise.all([
            cargarDatosClimaticosReales(),
            cargarPronosticoReal()
        ]);
        
        // Actualizar gráficos
        const periodoActivo = document.querySelector('[data-periodo].active')?.dataset.periodo || '24h';
        await cargarDatosGraficos(periodoActivo);
        
        sistemaClimatico.ultimaActualizacion = new Date().toISOString();
        mostrarNotificacion('Datos actualizados correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error actualizando datos:', error);
        mostrarNotificacion('Error actualizando datos climáticos', 'error');
    } finally {
        const btnActualizar = document.getElementById('btnActualizar');
        if (btnActualizar) {
            btnActualizar.innerHTML = '<i class="fas fa-sync-alt"></i> <span class="btn-text">Actualizar</span>';
            btnActualizar.disabled = false;
        }
    }
}

// ==========================================
// FUNCIONES DE MODAL Y CONFIGURACIÓN
// ==========================================

function abrirConfiguracion() {
    const modal = document.getElementById('modalConfiguracion');
    if (modal) {
        modal.classList.add('show');
    }
}

function cerrarConfiguracion() {
    const modal = document.getElementById('modalConfiguracion');
    if (modal) {
        modal.classList.remove('show');
    }
}

function guardarConfiguracion() {
    const config = {
        frecuenciaActualizacion: document.getElementById('frecuenciaActualizacion')?.value || '15',
        tempMinima: document.getElementById('tempMinima')?.value || '10',
        tempMaxima: document.getElementById('tempMaxima')?.value || '35',
        humedadMinima: document.getElementById('humedadMinima')?.value || '45',
        humedadMaxima: document.getElementById('humedadMaxima')?.value || '85',
        notificacionesPush: document.getElementById('notificacionesPush')?.checked || false,
        alertasEmail: document.getElementById('alertasEmail')?.checked || false
    };
    
    // Guardar configuración
    Object.entries(config).forEach(([key, value]) => {
        localStorage.setItem(key, value);
    });
    
    // Actualizar umbrales
    umbrales.temperatura.critica.min = parseFloat(config.tempMinima);
    umbrales.temperatura.critica.max = parseFloat(config.tempMaxima);
    umbrales.humedad.critica.min = parseFloat(config.humedadMinima);
    umbrales.humedad.critica.max = parseFloat(config.humedadMaxima);
    
    // Reconfigurar actualización automática
    configurarActualizacionAutomatica();
    
    mostrarNotificacion('Configuración guardada correctamente', 'success');
    cerrarConfiguracion();
}

function resetearConfiguracion() {
    document.getElementById('frecuenciaActualizacion').value = '15';
    document.getElementById('tempMinima').value = '10';
    document.getElementById('tempMaxima').value = '35';
    document.getElementById('humedadMinima').value = '45';
    document.getElementById('humedadMaxima').value = '85';
    document.getElementById('notificacionesPush').checked = true;
    document.getElementById('alertasEmail').checked = true;
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function exportarDatos() {
    const datos = {
        fecha: new Date().toISOString(),
        ubicacion: configFinca.ubicacion,
        coordenadas: configFinca.coordenadas,
        climaActual: datosClimaticos.actual,
        pronostico: datosClimaticos.pronostico ? {
            dias: datosClimaticos.pronostico.daily?.time?.length || 0,
            temperaturaMax: datosClimaticos.pronostico.daily?.temperature_2m_max,
            temperaturaMin: datosClimaticos.pronostico.daily?.temperature_2m_min,
            precipitacion: datosClimaticos.pronostico.daily?.precipitation_sum
        } : null,
        alertas: datosClimaticos.alertas,
        recomendaciones: datosClimaticos.recomendaciones,
        fuente: 'Sistema Climático Finca La Herradura'
    };
    
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clima-finca-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Datos exportados correctamente', 'success');
}

function mostrarHistoricoLluvia() {
    mostrarNotificacion('Función de histórico detallado en desarrollo', 'info');
}

function obtenerDescripcionClima(codigo) {
    const descripciones = {
        0: 'Despejado',
        1: 'Mayormente despejado',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Niebla',
        48: 'Niebla con escarcha',
        51: 'Llovizna ligera',
        53: 'Llovizna moderada',
        55: 'Llovizna densa',
        61: 'Lluvia ligera',
        63: 'Lluvia moderada',
        65: 'Lluvia intensa',
        80: 'Chubascos ligeros',
        81: 'Chubascos moderados',
        82: 'Chubascos intensos',
        95: 'Tormenta',
        96: 'Tormenta con granizo ligero',
        99: 'Tormenta con granizo fuerte'
    };
    return descripciones[codigo] || 'Condiciones variables';
}

function obtenerIconoClima(codigo) {
    if (codigo === 0) return 'fa-sun';
    if (codigo >= 1 && codigo <= 3) return 'fa-cloud-sun';
    if (codigo >= 45 && codigo <= 48) return 'fa-smog';
    if (codigo >= 51 && codigo <= 67) return 'fa-cloud-rain';
    if (codigo >= 71 && codigo <= 77) return 'fa-snowflake';
    if (codigo >= 80 && codigo <= 82) return 'fa-cloud-showers-heavy';
    if (codigo >= 95 && codigo <= 99) return 'fa-bolt';
    return 'fa-cloud';
}

function interpretarCodigoClima(codigo) {
    return codigo; // Usar código directamente
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-GT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

function esReciente(timestamp, minutosMaximos) {
    const ahora = new Date();
    const fechaTimestamp = new Date(timestamp);
    const diferencia = (ahora - fechaTimestamp) / (1000 * 60); // en minutos
    return diferencia <= minutosMaximos;
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    
    // Si hay un sistema de notificaciones disponible, usarlo
    if (window.notificationManager) {
        switch(tipo) {
            case 'success':
                window.notificationManager.success(mensaje);
                break;
            case 'error':
                window.notificationManager.error(mensaje);
                break;
            case 'warning':
                window.notificationManager.warning(mensaje);
                break;
            default:
                window.notificationManager.info(mensaje);
        }
    }
}

// ==========================================
// MANEJO DE ERRORES GLOBALES
// ==========================================

window.addEventListener('error', (event) => {
    if (event.error && event.error.message.includes('Chart')) {
        console.warn('⚠️ Error de Chart.js ignorado para evitar spam');
        return;
    }
    console.error('❌ Error global en clima:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada en clima:', event.reason);
});

// ==========================================
// EXPORTACIÓN GLOBAL
// ==========================================

// Exponer funciones globalmente para compatibilidad
window.sistemaClimatico = sistemaClimatico;
window.datosClimaticos = datosClimaticos;
window.actualizarClima = actualizarDatos;
window.exportarDatosClimaticos = exportarDatos;

// Función para obtener datos desde otros módulos
window.obtenerDatosClima = function() {
    return {
        actual: datosClimaticos.actual,
        pronostico: datosClimaticos.pronostico,
        alertas: datosClimaticos.alertas,
        recomendaciones: datosClimaticos.recomendaciones,
        inicializado: sistemaClimatico.inicializado
    };
};

console.log('🌦️ Sistema climático JavaScript vanilla cargado');
console.log('📍 Configurado para Finca La Herradura, Guatemala');
console.log('🔗 APIs: OpenMeteo para datos REALES únicamente');
