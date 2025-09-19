/* ========================================
   FINCA LA HERRADURA - INDEX.JS SOLO DATOS REALES
   Versión mejorada que SOLO usa datos reales de Firebase
   NO datos simulados o ficticios
   ======================================== */

(function() {
    'use strict';

    // ===========================================
    // CONFIGURACIÓN Y VARIABLES GLOBALES
    // ===========================================
    
    const TANK_CAPACITY_L = 25000;
    const FINCA_ID = 'finca_la_herradura';
    const GUATEMALA_COORDS = { lat: 14.770646, lon: -90.255254 };
    
    // Referencias a elementos del DOM
    const elements = {
        // Loader
        loader: document.getElementById('loader'),
        
        // Status indicators
        firebaseStatus: document.getElementById('firebaseStatus'),
        connectionIcon: document.getElementById('connectionIcon'),
        lastSync: document.getElementById('lastSync'),
        pendingCount: document.getElementById('pending-count'),
        syncButton: document.getElementById('sync-now'),
        
        // KPIs - Producción
        prodHoy: document.getElementById('produccion-hoy'),
        prodTrend: document.getElementById('produccion-trend'),
        prodSource: document.getElementById('prod-source'),
        
        // KPIs - Financieros
        ingresosHoy: document.getElementById('ingresos-hoy'),
        ingresosTrend: document.getElementById('ingresos-trend'),
        ingresosSource: document.getElementById('ingresos-source'),
        gastosHoy: document.getElementById('gastos-hoy'),
        gastosTrend: document.getElementById('gastos-trend'),
        gastosSource: document.getElementById('gastos-source'),
        balanceHoy: document.getElementById('balance-hoy'),
        balanceMes: document.getElementById('balance-mes'),
        
        // KPIs - Árboles
        arbolesSanos: document.getElementById('arboles-sanos'),
        arbolesTrend: document.getElementById('arboles-trend'),
        healthProgress: document.getElementById('health-progress'),
        
        // Tanque
        tankNivel: document.getElementById('tanque-nivel'),
        tankPercentage: document.getElementById('tank-percentage'),
        tankFill: document.getElementById('tank-fill'),
        tankAlert: document.getElementById('tank-alert'),
        tankTimestamp: document.getElementById('tank-timestamp'),
        
        // Precios
        precioActual: document.getElementById('precio-actual'),
        precioUpdate: document.getElementById('precio-update'),
        
        // Actividad
        trabajadoresActivos: document.getElementById('trabajadores-activos'),
        lastActivity: document.getElementById('last-activity'),
        registrosHoy: document.getElementById('registros-hoy'),
        
        // Clima
        weatherIcon: document.getElementById('weather-icon'),
        currentTemp: document.getElementById('current-temp'),
        weatherDesc: document.getElementById('weather-desc'),
        humidity: document.getElementById('humidity'),
        windSpeed: document.getElementById('wind-speed'),
        rainChance: document.getElementById('rain-chance'),
        weatherStatus: document.getElementById('weather-status'),
        
        // Resumen de datos
        totalCosechas: document.getElementById('total-cosechas'),
        totalVentas: document.getElementById('total-ventas'),
        totalGastosCount: document.getElementById('total-gastos-count'),
        totalRiegos: document.getElementById('total-riegos'),
        
        // Estado Firebase
        firebaseConnectionStatus: document.getElementById('firebase-connection-status'),
        statusCosechas: document.getElementById('status-cosechas'),
        statusVentas: document.getElementById('status-ventas'),
        statusGastos: document.getElementById('status-gastos'),
        statusRiegos: document.getElementById('status-riegos'),
        statusArboles: document.getElementById('status-arboles')
    };

    // Estado global de la aplicación
    const appState = {
        firebase: {
            initialized: false,
            connected: false,
            lastSync: null
        },
        data: {
            production: null,
            sales: null,
            expenses: null,
            trees: null,
            irrigation: null,
            weather: null
        },
        ui: {
            loading: true,
            error: null
        }
    };

    // ===========================================
    // FUNCIONES DE UTILIDAD
    // ===========================================

    function logActivity(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('es-GT');
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        
        if (window.logActivity) {
            window.logActivity(message, type);
        }
    }

    function formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return 'Q 0.00';
        return 'Q ' + amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return num.toLocaleString('es-GT');
    }

    function getDateRanges() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        return {
            today: {
                start: startOfDay.toISOString().split('T')[0],
                end: endOfDay.toISOString().split('T')[0]
            },
            month: {
                start: startOfMonth.toISOString().split('T')[0],
                end: endOfMonth.toISOString().split('T')[0]
            }
        };
    }

    function updateElementSafely(element, value, className = 'data-real') {
        if (element) {
            element.textContent = value;
            element.classList.remove('data-loading', 'data-error');
            element.classList.add(className);
        }
    }

    function updateElementError(element, message = 'Error cargando') {
        if (element) {
            element.textContent = message;
            element.classList.remove('data-loading', 'data-real');
            element.classList.add('data-error');
        }
    }

    // ===========================================
    // INICIALIZACIÓN DE FIREBASE
    // ===========================================

    async function waitForFirebase() {
        logActivity('Esperando inicialización de Firebase...', 'info');
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30; // 6 segundos máximo
            
            const checkFirebase = () => {
                attempts++;
                
                // Verificar si Firebase está disponible
                if (window.firebase && window.db && window.auth) {
                    appState.firebase.initialized = true;
                    logActivity('Firebase inicializado correctamente', 'success');
                    updateElementSafely(elements.firebaseStatus, '✅ Conectado');
                    resolve();
                    return;
                }
                
                if (attempts < maxAttempts) {
                    setTimeout(checkFirebase, 200);
                } else {
                    const error = new Error('Firebase no disponible después de 6 segundos');
                    logActivity(error.message, 'error');
                    updateElementError(elements.firebaseStatus, '❌ Desconectado');
                    reject(error);
                }
            };
            
            checkFirebase();
        });
    }

    async function testFirebaseConnection() {
        if (!window.db) {
            throw new Error('Firestore no disponible');
        }

        try {
            // Test simple de lectura
            const testQuery = await window.db.collection('_system').limit(1).get();
            appState.firebase.connected = true;
            logActivity('Conexión a Firestore verificada', 'success');
            return true;
        } catch (error) {
            appState.firebase.connected = false;
            logActivity(`Error conectando a Firestore: ${error.message}`, 'error');
            throw error;
        }
    }

    // ===========================================
    // FUNCIONES DE CARGA DE DATOS REALES
    // ===========================================

    async function loadRealProductionData() {
        if (!window.db) {
            throw new Error('Firebase no disponible para cargar producción');
        }

        logActivity('Cargando datos reales de producción...', 'info');
        const ranges = getDateRanges();
        
        try {
            // Producción de hoy
            const todayQuery = await window.db.collection('cosechas_diarias')
                .where('fecha', '>=', ranges.today.start)
                .where('fecha', '<=', ranges.today.end)
                .where('fincaId', '==', FINCA_ID)
                .get();

            let todayTotal = 0;
            let registrosHoy = 0;

            todayQuery.forEach(doc => {
                const data = doc.data();
                const primera = Number(data.primera || data.unidades_primera || 0);
                const segunda = Number(data.segunda || data.unidades_segunda || 0);
                const descarte = Number(data.descarte || data.unidades_descarte || 0);
                
                todayTotal += (primera + segunda + descarte);
                registrosHoy++;
            });

            // Producción de ayer para comparación
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const yesterdayQuery = await window.db.collection('cosechas_diarias')
                .where('fecha', '==', yesterdayStr)
                .where('fincaId', '==', FINCA_ID)
                .get();

            let yesterdayTotal = 0;
            yesterdayQuery.forEach(doc => {
                const data = doc.data();
                const primera = Number(data.primera || data.unidades_primera || 0);
                const segunda = Number(data.segunda || data.unidades_segunda || 0);
                const descarte = Number(data.descarte || data.unidades_descarte || 0);
                
                yesterdayTotal += (primera + segunda + descarte);
            });

            // Calcular tendencia real
            const trend = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100) : 0;
            const trendText = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}% vs ayer`;
            const trendColor = trend >= 0 ? '#22c55e' : '#ef4444';

            // Actualizar UI
            updateElementSafely(elements.prodHoy, formatNumber(todayTotal));
            if (elements.prodTrend) {
                elements.prodTrend.innerHTML = `<span style="color: ${trendColor}">${trendText}</span>`;
                elements.prodTrend.classList.add('data-real');
            }
            updateElementSafely(elements.prodSource, 'Firebase Firestore');
            updateElementSafely(elements.registrosHoy, formatNumber(registrosHoy));

            // Actualizar estado de colección
            updateElementSafely(elements.statusCosechas, '✅');
            
            appState.data.production = { total: todayTotal, trend, registros: registrosHoy };
            logActivity(`Producción real cargada: ${todayTotal} unidades, tendencia: ${trend.toFixed(1)}%`, 'success');

            return { total: todayTotal, trend: trendText, registros: registrosHoy };
            
        } catch (error) {
            updateElementError(elements.prodHoy, 'Error');
            updateElementError(elements.prodTrend, 'Error');
            updateElementError(elements.prodSource, 'Error Firebase');
            updateElementSafely(elements.statusCosechas, '❌');
            
            logActivity(`Error cargando producción: ${error.message}`, 'error');
            throw error;
        }
    }

    async function loadRealSalesData() {
        if (!window.db) {
            throw new Error('Firebase no disponible para cargar ventas');
        }

        logActivity('Cargando datos reales de ventas...', 'info');
        const ranges = getDateRanges();

        try {
            // Ventas del mes
            const salesQuery = await window.db.collection('ventas_directas')
                .where('fecha', '>=', ranges.month.start)
                .where('fecha', '<=', ranges.month.end)
                .get();

            let totalVentas = 0;
            let countVentas = 0;
            let ventasHoy = 0;

            salesQuery.forEach(doc => {
                const data = doc.data();
                const total = Number(data.total_venta || data.monto_total || 0);
                totalVentas += total;
                countVentas++;

                // Ventas de hoy
                if (data.fecha === ranges.today.start) {
                    ventasHoy += total;
                }
            });

            // Actualizar UI
            updateElementSafely(elements.ingresosHoy, formatCurrency(totalVentas));
            updateElementSafely(elements.ingresosSource, 'Firebase Firestore');
            updateElementSafely(elements.totalVentas, formatNumber(countVentas));
            
            // Calcular tendencia (simplificada por ahora)
            if (elements.ingresosTrend) {
                const avgDaily = totalVentas / new Date().getDate();
                const trendText = `Q${avgDaily.toFixed(0)}/día promedio`;
                elements.ingresosTrend.innerHTML = `<span style="color: #22c55e">${trendText}</span>`;
                elements.ingresosTrend.classList.add('data-real');
            }

            updateElementSafely(elements.statusVentas, '✅');
            appState.data.sales = { total: totalVentas, count: countVentas, hoy: ventasHoy };
            
            logActivity(`Ventas reales cargadas: ${formatCurrency(totalVentas)} en ${countVentas} transacciones`, 'success');
            return { total: totalVentas, count: countVentas, hoy: ventasHoy };

        } catch (error) {
            updateElementError(elements.ingresosHoy, 'Error');
            updateElementError(elements.ingresosTrend, 'Error');
            updateElementSafely(elements.statusVentas, '❌');
            
            logActivity(`Error cargando ventas: ${error.message}`, 'error');
            throw error;
        }
    }

    async function loadRealExpensesData() {
        if (!window.db) {
            throw new Error('Firebase no disponible para cargar gastos');
        }

        logActivity('Cargando datos reales de gastos...', 'info');
        const ranges = getDateRanges();

        try {
            // Gastos del mes
            const expensesQuery = await window.db.collection('gastos')
                .where('fecha', '>=', ranges.month.start)
                .where('fecha', '<=', ranges.month.end)
                .where('active', '==', true)
                .get();

            let totalGastos = 0;
            let countGastos = 0;

            expensesQuery.forEach(doc => {
                const data = doc.data();
                const monto = Number(data.monto || data.amount || 0);
                totalGastos += monto;
                countGastos++;
            });

            // Actualizar UI
            updateElementSafely(elements.gastosHoy, formatCurrency(totalGastos));
            updateElementSafely(elements.gastosSource, 'Firebase Firestore');
            updateElementSafely(elements.totalGastosCount, formatNumber(countGastos));

            // Tendencia de gastos
            if (elements.gastosTrend) {
                const avgDaily = totalGastos / new Date().getDate();
                const trendText = `Q${avgDaily.toFixed(0)}/día promedio`;
                elements.gastosTrend.innerHTML = `<span style="color: #ef4444">${trendText}</span>`;
                elements.gastosTrend.classList.add('data-real');
            }

            updateElementSafely(elements.statusGastos, '✅');
            appState.data.expenses = { total: totalGastos, count: countGastos };

            logActivity(`Gastos reales cargados: ${formatCurrency(totalGastos)} en ${countGastos} transacciones`, 'success');
            return { total: totalGastos, count: countGastos };

        } catch (error) {
            updateElementError(elements.gastosHoy, 'Error');
            updateElementError(elements.gastosTrend, 'Error');
            updateElementSafely(elements.statusGastos, '❌');

            logActivity(`Error cargando gastos: ${error.message}`, 'error');
            throw error;
        }
    }

    async function loadRealTreesData() {
        if (!window.db) {
            throw new Error('Firebase no disponible para cargar árboles');
        }

        logActivity('Cargando datos reales de árboles...', 'info');

        try {
            // Contar árboles total y sanos
            const [totalQuery, healthyQuery] = await Promise.all([
                window.db.collection('arboles').where('fincaId', '==', FINCA_ID).get(),
                window.db.collection('arboles')
                    .where('fincaId', '==', FINCA_ID)
                    .where('estado_salud', '==', 'sano')
                    .get()
            ]);

            const totalTrees = totalQuery.size;
            const healthyTrees = healthyQuery.size;
            const healthPercentage = totalTrees > 0 ? Math.round((healthyTrees / totalTrees) * 100) : 0;

            // Actualizar UI
            updateElementSafely(elements.arbolesSanos, `${formatNumber(healthyTrees)} de ${formatNumber(totalTrees)}`);
            
            if (elements.healthProgress) {
                elements.healthProgress.style.width = `${healthPercentage}%`;
                elements.healthProgress.classList.add('data-real');
            }

            if (elements.arbolesTrend) {
                elements.arbolesTrend.innerHTML = `<span style="color: ${healthPercentage >= 90 ? '#22c55e' : '#f59e0b'}">${healthPercentage}% saludables</span>`;
                elements.arbolesTrend.classList.add('data-real');
            }

            updateElementSafely(elements.statusArboles, '✅');
            appState.data.trees = { total: totalTrees, healthy: healthyTrees, percentage: healthPercentage };

            logActivity(`Árboles reales: ${healthyTrees}/${totalTrees} saludables (${healthPercentage}%)`, 'success');
            return { total: totalTrees, healthy: healthyTrees, percentage: healthPercentage };

        } catch (error) {
            updateElementError(elements.arbolesSanos, 'Error');
            updateElementError(elements.arbolesTrend, 'Error');
            updateElementSafely(elements.statusArboles, '❌');

            logActivity(`Error cargando árboles: ${error.message}`, 'error');
            throw error;
        }
    }

    async function loadRealTankData() {
        if (!window.db) {
            throw new Error('Firebase no disponible para cargar tanque');
        }

        logActivity('Cargando datos reales del tanque...', 'info');

        try {
            // Obtener última medición del tanque
            const tankQuery = await window.db.collection('riegos')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (!tankQuery.empty) {
                const data = tankQuery.docs[0].data();
                const nivel = Number(data.nivel_tanque || data.tanque_nivel_despues || TANK_CAPACITY_L);
                const percentage = Math.max(0, Math.min(100, Math.round((nivel / TANK_CAPACITY_L) * 100)));
                
                // Timestamp de la medición
                const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
                const timeStr = timestamp.toLocaleString('es-GT');

                // Actualizar UI
                updateElementSafely(elements.tankNivel, `${formatNumber(nivel)} L`);
                updateElementSafely(elements.tankPercentage, `${percentage}%`);
                updateElementSafely(elements.tankTimestamp, timeStr);

                if (elements.tankFill) {
                    elements.tankFill.style.height = `${percentage}%`;
                    elements.tankFill.classList.add('data-real');
                }

                // Alerta si nivel bajo
                if (elements.tankAlert) {
                    if (percentage < 20) {
                        elements.tankAlert.style.display = 'block';
                        logActivity('🚨 ALERTA: Nivel del tanque crítico', 'warning');
                    } else {
                        elements.tankAlert.style.display = 'none';
                    }
                }

                updateElementSafely(elements.statusRiegos, '✅');
                appState.data.irrigation = { level: nivel, percentage, timestamp };

                logActivity(`Tanque: ${nivel}L (${percentage}%) - Medición: ${timeStr}`, 'success');
                return { level: nivel, percentage, timestamp };

            } else {
                throw new Error('No hay datos de tanque disponibles');
            }

        } catch (error) {
            updateElementError(elements.tankNivel, 'Sin datos');
            updateElementError(elements.tankPercentage, '--');
            updateElementError(elements.tankTimestamp, 'Sin datos');
            updateElementSafely(elements.statusRiegos, '❌');

            logActivity(`Error cargando datos del tanque: ${error.message}`, 'error');
            throw error;
        }
    }

    async function loadRealPricesData() {
        if (!window.db) {
            throw new Error('Firebase no disponible para cargar precios');
        }

        logActivity('Cargando precios reales MAGA...', 'info');

        try {
            // Obtener último precio MAGA
            const priceQuery = await window.db.collection('precios_maga')
                .orderBy('fecha', 'desc')
                .limit(1)
                .get();

            if (!priceQuery.empty) {
                const data = priceQuery.docs[0].data();
                const price = Number(data.precio_por_unidad || (data.precio_millar_limon_persa / 1000) || 0);
                
                if (price > 0) {
                    updateElementSafely(elements.precioActual, formatCurrency(price));
                    
                    const fechaStr = data.fecha || 'Fecha no disponible';
                    updateElementSafely(elements.precioUpdate, `MAGA: ${fechaStr}`);
                    
                    logActivity(`Precio MAGA actualizado: ${formatCurrency(price)}`, 'success');
                    return price;
                } else {
                    throw new Error('Precio MAGA inválido');
                }
            } else {
                throw new Error('No hay precios MAGA disponibles');
            }

        } catch (error) {
            updateElementError(elements.precioActual, 'Sin datos');
            updateElementError(elements.precioUpdate, 'MAGA no disponible');
            
            logActivity(`Error cargando precios MAGA: ${error.message}`, 'error');
            throw error;
        }
    }

    async function loadRealWeatherData() {
        logActivity('Cargando datos reales del clima...', 'info');

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${GUATEMALA_COORDS.lat}&longitude=${GUATEMALA_COORDS.lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=America/Guatemala`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            const current = data.current_weather;
            const hourly = data.hourly;
            
            // Datos actuales
            const currentHour = new Date().getHours();
            const humidity = hourly.relative_humidity_2m[currentHour] || 0;
            const precipitation = hourly.precipitation_probability[currentHour] || 0;

            // Íconos del clima
            const weatherIcons = {
                0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
                45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️',
                55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
                80: '🌦️', 81: '🌧️', 82: '🌧️', 95: '⛈️'
            };

            const descriptions = {
                0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
                45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna moderada',
                55: 'Llovizna intensa', 61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
                80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos',
                95: 'Tormenta'
            };

            // Actualizar UI
            updateElementSafely(elements.weatherIcon, weatherIcons[current.weathercode] || '🌤️');
            updateElementSafely(elements.currentTemp, `${Math.round(current.temperature)}°C`);
            updateElementSafely(elements.weatherDesc, descriptions[current.weathercode] || 'Condición desconocida');
            updateElementSafely(elements.humidity, `${humidity}%`);
            updateElementSafely(elements.windSpeed, `${Math.round(current.windspeed)} km/h`);
            updateElementSafely(elements.rainChance, `${precipitation}%`);
            updateElementSafely(elements.weatherStatus, '🟢 En vivo');

            appState.data.weather = { 
                temp: current.temperature, 
                condition: current.weathercode,
                humidity, 
                windSpeed: current.windspeed, 
                precipitation 
            };

            logActivity(`Clima real: ${Math.round(current.temperature)}°C, ${descriptions[current.weathercode]}`, 'success');
            return appState.data.weather;

        } catch (error) {
            updateElementError(elements.weatherIcon, '❌');
            updateElementError(elements.currentTemp, 'Error');
            updateElementError(elements.weatherDesc, 'Error cargando clima');
            updateElementError(elements.weatherStatus, '🔴 Error');

            logActivity(`Error cargando clima: ${error.message}`, 'error');
            throw error;
        }
    }

    // ===========================================
    // FUNCIÓN PRINCIPAL DE CARGA
    // ===========================================

    async function loadAllRealData() {
        logActivity('🔄 Iniciando carga de TODOS los datos reales...', 'info');
        appState.ui.loading = true;

        try {
            // Esperar Firebase
            await waitForFirebase();
            await testFirebaseConnection();

            // Cargar todos los datos en paralelo
            const dataLoaders = [
                loadRealProductionData().catch(err => logActivity(`Producción falló: ${err.message}`, 'warning')),
                loadRealSalesData().catch(err => logActivity(`Ventas falló: ${err.message}`, 'warning')),
                loadRealExpensesData().catch(err => logActivity(`Gastos falló: ${err.message}`, 'warning')),
                loadRealTreesData().catch(err => logActivity(`Árboles falló: ${err.message}`, 'warning')),
                loadRealTankData().catch(err => logActivity(`Tanque falló: ${err.message}`, 'warning')),
                loadRealPricesData().catch(err => logActivity(`Precios falló: ${err.message}`, 'warning')),
                loadRealWeatherData().catch(err => logActivity(`Clima falló: ${err.message}`, 'warning'))
            ];

            const results = await Promise.allSettled(dataLoaders);
            
            // Calcular balance financiero real
            if (appState.data.sales && appState.data.expenses) {
                const balanceHoy = appState.data.sales.hoy - (appState.data.expenses.total / new Date().getDate());
                const balanceMes = appState.data.sales.total - appState.data.expenses.total;
                
                updateElementSafely(elements.balanceHoy, formatCurrency(balanceHoy));
                updateElementSafely(elements.balanceMes, formatCurrency(balanceMes));
            }

            // Actualizar resumen de colecciones
            updateCollectionsSummary();

            // Actualizar timestamp de sincronización
            const now = new Date();
            appState.firebase.lastSync = now;
            updateElementSafely(elements.lastSync, now.toLocaleTimeString('es-GT'));

            // Estado de conexión
            updateElementSafely(elements.firebaseConnectionStatus, '✅ Conectado y sincronizado');
            if (elements.connectionIcon) {
                elements.connectionIcon.textContent = '🟢';
            }

            // Habilitar botón de sincronización
            if (elements.syncButton) {
                elements.syncButton.disabled = false;
                elements.syncButton.classList.add('data-real');
            }

            logActivity('✅ TODOS los datos reales cargados exitosamente', 'success');

        } catch (error) {
            logActivity(`❌ Error crítico cargando datos: ${error.message}`, 'error');
            appState.ui.error = error.message;
            
            updateElementError(elements.firebaseConnectionStatus, '❌ Error de conexión');
            if (elements.connectionIcon) {
                elements.connectionIcon.textContent = '🔴';
            }
        } finally {
            appState.ui.loading = false;
            hideLoader();
        }
    }

    async function updateCollectionsSummary() {
        if (!window.db) return;

        try {
            // Contar documentos en cada colección (con límite para rendimiento)
            const [cosechas, ventas, gastos, riegos] = await Promise.all([
                window.db.collection('cosechas_diarias').limit(100).get(),
                window.db.collection('ventas_directas').limit(100).get(),
                window.db.collection('gastos').where('active', '==', true).limit(100).get(),
                window.db.collection('riegos').limit(100).get()
            ]);

            updateElementSafely(elements.totalCosechas, `${cosechas.size}+`);
            updateElementSafely(elements.totalVentas, `${ventas.size}+`);
            updateElementSafely(elements.totalGastosCount, `${gastos.size}+`);
            updateElementSafely(elements.totalRiegos, `${riegos.size}+`);

        } catch (error) {
            logActivity(`Error contando colecciones: ${error.message}`, 'warning');
        }
    }

    function hideLoader() {
        if (elements.loader) {
            elements.loader.classList.add('fade-out');
            setTimeout(() => {
                elements.loader.style.display = 'none';
            }, 500);
        }
        logActivity('Loader ocultado', 'info');
    }

    // ===========================================
    // EVENT LISTENERS Y CONFIGURACIÓN
    // ===========================================

    function setupEventListeners() {
        // Botón de sincronización
        if (elements.syncButton) {
            elements.syncButton.addEventListener('click', async () => {
                elements.syncButton.disabled = true;
                elements.syncButton.innerHTML = '<i class="fas fa-spin fa-spinner"></i> Sincronizando...';
                
                try {
                    await loadAllRealData();
                    logActivity('Sincronización manual completada', 'success');
                } catch (error) {
                    logActivity(`Error en sincronización manual: ${error.message}`, 'error');
                } finally {
                    elements.syncButton.disabled = false;
                    elements.syncButton.innerHTML = '<i class="fas fa-sync"></i> Sincronizar Datos';
                }
            });
        }

        // Detectar conexión/desconexión
        window.addEventListener('online', () => {
            logActivity('Conexión restaurada - recargando datos', 'info');
            setTimeout(loadAllRealData, 1000);
        });

        window.addEventListener('offline', () => {
            logActivity('Conexión perdida - modo offline', 'warning');
            updateElementError(elements.firebaseConnectionStatus, '⚠️ Sin conexión');
        });

        // Auto-refresh cada 5 minutos
        setInterval(() => {
            if (navigator.onLine && appState.firebase.connected) {
                logActivity('Auto-refresh programado', 'info');
                loadAllRealData();
            }
        }, 5 * 60 * 1000);

        logActivity('Event listeners configurados', 'info');
    }

    // ===========================================
    // INICIALIZACIÓN PRINCIPAL
    // ===========================================

    async function initializeDashboard() {
        logActivity('🚀 Inicializando Dashboard con SOLO datos reales', 'info');

        try {
            // Configurar event listeners
            setupEventListeners();

            // Cargar todos los datos reales
            await loadAllRealData();

            logActivity('🎉 Dashboard inicializado exitosamente con datos reales', 'success');

        } catch (error) {
            logActivity(`💥 Error crítico en inicialización: ${error.message}`, 'error');
            
            // No mostrar datos ficticios - solo mensaje de error
            const errorMessage = `Error del sistema: ${error.message}`;
            Object.values(elements).forEach(element => {
                if (element && element.classList && element.classList.contains('data-loading')) {
                    updateElementError(element, 'Sin conexión');
                }
            });
        }
    }

    // ===========================================
    // INICIALIZACIÓN AUTOMÁTICA
    // ===========================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
        // DOM ya cargado
        setTimeout(initializeDashboard, 100);
    }

    // Exposición global para debugging
    window.dashboardApp = {
        state: appState,
        loadData: loadAllRealData,
        elements: elements
    };

    logActivity('📋 Index.js cargado - Sistema configurado para SOLO datos reales', 'info');

})();
