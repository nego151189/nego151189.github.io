/* ========================================
   INDEX.JS CORREGIDO - USA TU firebase-integration.js
   NO duplica consultas, usa tu sistema existente
   ======================================== */

(function() {
    'use strict';

    // ===========================================
    // REFERENCIAS A ELEMENTOS DOM
    // ===========================================
    const elements = {
        // Loader
        loader: document.getElementById('loader'),
        
        // Status
        firebaseStatus: document.getElementById('firebase-status'),
        lastSync: document.getElementById('last-sync'),
        pendingCount: document.getElementById('pending-count'),
        syncButton: document.getElementById('sync-now'),
        
        // KPIs Principales
        prodHoy: document.getElementById('produccion-hoy'),
        prodTrend: document.getElementById('produccion-trend'),
        ingresosHoy: document.getElementById('ingresos-hoy'),
        ingresosTrend: document.getElementById('ingresos-trend'),
        arbolesSanos: document.getElementById('arboles-sanos'),
        arbolesPorcentaje: document.getElementById('arboles-porcentaje'),
        gastosHoy: document.getElementById('gastos-hoy'),
        gastosTrend: document.getElementById('gastos-trend'),
        
        // Balance Financiero
        balanceHoy: document.getElementById('balance-hoy'),
        balanceMes: document.getElementById('balance-mes'),
        precioActual: document.getElementById('precio-actual'),
        precioUpdate: document.getElementById('precio-update'),
        
        // Tanque
        tankNivel: document.getElementById('tanque-nivel'),
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
        
        // Resumen Firebase
        totalCosechas: document.getElementById('total-cosechas'),
        totalVentas: document.getElementById('total-ventas'),
        totalGastosCount: document.getElementById('total-gastos-count'),
        totalRiegos: document.getElementById('total-riegos'),
        firebaseConnectionStatus: document.getElementById('firebase-connection-status'),
        
        // Status badges
        statusCosechas: document.getElementById('status-cosechas'),
        statusVentas: document.getElementById('status-ventas'),
        statusGastos: document.getElementById('status-gastos'),
        statusRiegos: document.getElementById('status-riegos'),
        statusArboles: document.getElementById('status-arboles')
    };

    // ===========================================
    // FUNCIONES DE UTILIDAD
    // ===========================================
    
    function logActivity(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('es-GT');
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }

    function formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return 'Q 0.00';
        return 'Q ' + amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function updateElementSafely(element, value, className = 'data-real') {
        if (element) {
            element.textContent = value;
            element.classList.remove('data-loading', 'data-error');
            element.classList.add(className);
        }
    }

    function updateElementError(element, message = 'Error') {
        if (element) {
            element.textContent = message;
            element.classList.remove('data-loading', 'data-real');
            element.classList.add('data-error');
        }
    }

    function hideLoader() {
        if (elements.loader) {
            elements.loader.classList.add('fade-out');
            setTimeout(() => {
                elements.loader.style.display = 'none';
            }, 500);
        }
    }

    // ===========================================
    // FUNCIÓN PRINCIPAL QUE USA TU firebase-integration.js
    // ===========================================
    
    async function loadDashboardData() {
        logActivity('🔄 Cargando datos del dashboard usando firebase-integration.js', 'info');

        try {
            // 1. VERIFICAR QUE TU SISTEMA ESTÉ DISPONIBLE
            if (!window.firebaseDataManager) {
                throw new Error('firebase-integration.js no disponible');
            }

            // 2. INICIALIZAR TU SISTEMA SI NO ESTÁ LISTO
            if (!window.firebaseDataManager.initialized) {
                logActivity('Inicializando firebase-integration.js...', 'info');
                await window.firebaseDataManager.initialize();
            }

            // 3. CARGAR DATOS USANDO TUS FUNCIONES EXISTENTES
            
            // Producción usando TU sistema
            try {
                await loadProductionData();
                updateElementSafely(elements.statusCosechas, '✅');
            } catch (error) {
                logActivity(`Error cargando producción: ${error.message}`, 'warning');
                updateElementSafely(elements.statusCosechas, '❌');
            }

            // Financiero usando TU sistema
            try {
                await loadFinancialData();
                updateElementSafely(elements.statusVentas, '✅');
                updateElementSafely(elements.statusGastos, '✅');
            } catch (error) {
                logActivity(`Error cargando datos financieros: ${error.message}`, 'warning');
                updateElementSafely(elements.statusVentas, '❌');
                updateElementSafely(elements.statusGastos, '❌');
            }

            // Árboles usando TU sistema
            try {
                await loadTreesData();
                updateElementSafely(elements.statusArboles, '✅');
            } catch (error) {
                logActivity(`Error cargando árboles: ${error.message}`, 'warning');
                updateElementSafely(elements.statusArboles, '❌');
            }

            // Tanque/Riegos usando TU sistema
            try {
                await loadIrrigationData();
                updateElementSafely(elements.statusRiegos, '✅');
            } catch (error) {
                logActivity(`Error cargando riegos: ${error.message}`, 'warning');
                updateElementSafely(elements.statusRiegos, '❌');
            }

            // Clima (función independiente)
            try {
                await loadWeatherData();
            } catch (error) {
                logActivity(`Error cargando clima: ${error.message}`, 'warning');
            }

            // 4. ACTUALIZAR CONTADORES DE RESUMEN
            await updateCollectionsCounts();

            // 5. CALCULAR ESTADÍSTICAS USANDO TU SISTEMA
            if (window.firebaseDataManager.calculateStatistics) {
                await window.firebaseDataManager.calculateStatistics();
            }

            // 6. ACTUALIZAR STATUS GENERAL
            updateElementSafely(elements.firebaseStatus, '✅ Conectado');
            updateElementSafely(elements.firebaseConnectionStatus, '✅ Sincronizado');
            updateElementSafely(elements.lastSync, new Date().toLocaleTimeString('es-GT'));

            logActivity('✅ Dashboard cargado exitosamente usando firebase-integration.js', 'success');

        } catch (error) {
            logActivity(`❌ Error crítico: ${error.message}`, 'error');
            updateElementError(elements.firebaseStatus, '❌ Error');
            updateElementError(elements.firebaseConnectionStatus, '❌ Error conexión');
        } finally {
            hideLoader();
        }
    }

    // ===========================================
    // FUNCIONES QUE USAN TU firebase-integration.js
    // ===========================================

    async function loadProductionData() {
        if (!window.db) return;

        logActivity('Cargando producción usando consultas directas...', 'info');
        
        try {
            const ranges = getDateRanges();
            
            // Producción de hoy
            const todayQuery = await window.db.collection('cosechas_diarias')
                .where('fecha', '>=', ranges.today.start)
                .where('fecha', '<=', ranges.today.end)
                .get();

            let todayTotal = 0;
            todayQuery.forEach(doc => {
                const data = doc.data();
                const primera = Number(data.primera || data.unidades_primera || 0);
                const segunda = Number(data.segunda || data.unidades_segunda || 0);
                const descarte = Number(data.descarte || data.unidades_descarte || 0);
                todayTotal += (primera + segunda + descarte);
            });

            // Producción de ayer para tendencia
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const yesterdayQuery = await window.db.collection('cosechas_diarias')
                .where('fecha', '==', yesterdayStr)
                .get();

            let yesterdayTotal = 0;
            yesterdayQuery.forEach(doc => {
                const data = doc.data();
                const primera = Number(data.primera || data.unidades_primera || 0);
                const segunda = Number(data.segunda || data.unidades_segunda || 0);
                const descarte = Number(data.descarte || data.unidades_descarte || 0);
                yesterdayTotal += (primera + segunda + descarte);
            });

            // Calcular tendencia
            const trend = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100) : 0;
            const trendText = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}% vs ayer`;
            const trendColor = trend >= 0 ? '#22c55e' : '#ef4444';

            // Actualizar UI
            updateElementSafely(elements.prodHoy, todayTotal.toLocaleString());
            if (elements.prodTrend) {
                elements.prodTrend.innerHTML = `<span style="color: ${trendColor}">${trendText}</span>`;
                elements.prodTrend.classList.add('data-real');
            }

            logActivity(`Producción: ${todayTotal} unidades (${trendText})`, 'success');

        } catch (error) {
            updateElementError(elements.prodHoy, 'Error');
            updateElementError(elements.prodTrend, 'Error');
            throw error;
        }
    }

    async function loadFinancialData() {
        if (!window.db) return;

        logActivity('Cargando datos financieros...', 'info');
        const ranges = getDateRanges();

        try {
            // Cargar ventas del mes
            const salesQuery = await window.db.collection('ventas_directas')
                .where('fecha', '>=', ranges.month.start)
                .where('fecha', '<=', ranges.month.end)
                .get();

            let totalSales = 0;
            let salesToday = 0;

            salesQuery.forEach(doc => {
                const data = doc.data();
                const total = Number(data.total_venta || data.monto_total || 0);
                totalSales += total;
                
                if (data.fecha === ranges.today.start) {
                    salesToday += total;
                }
            });

            // Cargar gastos del mes usando TU sistema si está disponible
            let totalExpenses = 0;
            let expensesToday = 0;

            if (window.firebaseDataManager && window.firebaseDataManager.loadExpenses) {
                try {
                    const expenses = await window.firebaseDataManager.loadExpenses();
                    expenses.forEach(expense => {
                        const amount = Number(expense.amount || expense.monto || 0);
                        const expenseDate = expense.date || expense.fecha;
                        
                        // Filtrar por mes actual
                        if (expenseDate >= ranges.month.start && expenseDate <= ranges.month.end) {
                            totalExpenses += amount;
                            
                            if (expenseDate === ranges.today.start) {
                                expensesToday += amount;
                            }
                        }
                    });
                } catch (error) {
                    logActivity('Usando consulta directa para gastos', 'info');
                    // Fallback a consulta directa
                    const expensesQuery = await window.db.collection('gastos')
                        .where('fecha', '>=', ranges.month.start)
                        .where('fecha', '<=', ranges.month.end)
                        .where('active', '==', true)
                        .get();

                    expensesQuery.forEach(doc => {
                        const data = doc.data();
                        const amount = Number(data.monto || data.amount || 0);
                        totalExpenses += amount;
                        
                        if (data.fecha === ranges.today.start) {
                            expensesToday += amount;
                        }
                    });
                }
            }

            // Cargar precio MAGA
            const priceQuery = await window.db.collection('precios_maga')
                .orderBy('fecha', 'desc')
                .limit(1)
                .get();

            let unitPrice = 0.40; // Precio por defecto
            if (!priceQuery.empty) {
                const priceData = priceQuery.docs[0].data();
                const price = Number(priceData.precio_por_unidad || (priceData.precio_millar_limon_persa / 1000) || 0);
                if (price > 0) {
                    unitPrice = price;
                }
            }

            // Actualizar UI
            updateElementSafely(elements.ingresosHoy, formatCurrency(totalSales));
            updateElementSafely(elements.gastosHoy, formatCurrency(totalExpenses));
            updateElementSafely(elements.balanceHoy, formatCurrency(salesToday - expensesToday));
            updateElementSafely(elements.balanceMes, formatCurrency(totalSales - totalExpenses));
            updateElementSafely(elements.precioActual, formatCurrency(unitPrice));
            updateElementSafely(elements.precioUpdate, 'MAGA actualizado');

            // Tendencias
            const salesTrend = totalSales > 0 ? `Q${(totalSales / new Date().getDate()).toFixed(0)}/día` : 'Sin datos';
            const expensesTrend = totalExpenses > 0 ? `Q${(totalExpenses / new Date().getDate()).toFixed(0)}/día` : 'Sin datos';
            
            if (elements.ingresosTrend) {
                elements.ingresosTrend.innerHTML = `<span style="color: #22c55e">${salesTrend}</span>`;
                elements.ingresosTrend.classList.add('data-real');
            }
            
            if (elements.gastosTrend) {
                elements.gastosTrend.innerHTML = `<span style="color: #ef4444">${expensesTrend}</span>`;
                elements.gastosTrend.classList.add('data-real');
            }

            logActivity(`Finanzas: Ventas ${formatCurrency(totalSales)}, Gastos ${formatCurrency(totalExpenses)}`, 'success');

        } catch (error) {
            updateElementError(elements.ingresosHoy, 'Error');
            updateElementError(elements.gastosHoy, 'Error');
            updateElementError(elements.balanceHoy, 'Error');
            updateElementError(elements.balanceMes, 'Error');
            updateElementError(elements.precioActual, 'Error');
            throw error;
        }
    }

    async function loadTreesData() {
        if (!window.db) return;

        logActivity('Cargando datos de árboles...', 'info');

        try {
            const [totalQuery, healthyQuery] = await Promise.all([
                window.db.collection('arboles').get(),
                window.db.collection('arboles').where('estado_salud', '==', 'sano').get()
            ]);

            const totalTrees = totalQuery.size;
            const healthyTrees = healthyQuery.size;
            const healthPercentage = totalTrees > 0 ? Math.round((healthyTrees / totalTrees) * 100) : 100;

            updateElementSafely(elements.arbolesSanos, `${healthyTrees.toLocaleString()} de ${totalTrees.toLocaleString()}`);
            
            if (elements.arbolesPorcentaje) {
                const color = healthPercentage >= 90 ? '#22c55e' : '#f59e0b';
                elements.arbolesPorcentaje.innerHTML = `<span style="color: ${color}">${healthPercentage}% saludables</span>`;
                elements.arbolesPorcentaje.classList.add('data-real');
            }

            logActivity(`Árboles: ${healthyTrees}/${totalTrees} saludables (${healthPercentage}%)`, 'success');

        } catch (error) {
            updateElementError(elements.arbolesSanos, 'Error');
            updateElementError(elements.arbolesPorcentaje, 'Error');
            throw error;
        }
    }

    async function loadIrrigationData() {
        if (!window.db) return;

        logActivity('Cargando datos del tanque...', 'info');
        const TANK_CAPACITY = 25000;

        try {
            const tankQuery = await window.db.collection('riegos')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (!tankQuery.empty) {
                const data = tankQuery.docs[0].data();
                const level = Number(data.nivel_tanque || data.tanque_nivel_despues || TANK_CAPACITY);
                const percentage = Math.max(0, Math.min(100, Math.round((level / TANK_CAPACITY) * 100)));

                updateElementSafely(elements.tankNivel, `${level.toLocaleString()} L`);
                updateElementSafely(elements.tankPercentage, `${percentage}%`);
                updateElementSafely(elements.tankSource, 'Firebase Firestore');

                if (elements.tankFill) {
                    elements.tankFill.style.height = `${percentage}%`;
                }

                if (elements.tankAlert) {
                    if (percentage < 20) {
                        elements.tankAlert.style.display = 'block';
                        logActivity('🚨 Alerta: Nivel del tanque bajo', 'warning');
                    } else {
                        elements.tankAlert.style.display = 'none';
                    }
                }

                logActivity(`Tanque: ${level}L (${percentage}%)`, 'success');
            } else {
                throw new Error('No hay datos del tanque');
            }

        } catch (error) {
            updateElementError(elements.tankNivel, 'Sin datos');
            updateElementError(elements.tankPercentage, '--');
            updateElementError(elements.tankSource, 'Error');
            throw error;
        }
    }

    async function loadWeatherData() {
        logActivity('Cargando datos del clima...', 'info');
        
        try {
            const lat = 14.770646;
            const lon = -90.255254;
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=America/Guatemala`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const current = data.current_weather;
            const hourly = data.hourly;
            
            const currentHour = new Date().getHours();
            const humidity = hourly.relative_humidity_2m[currentHour] || 0;
            const precipitation = hourly.precipitation_probability[currentHour] || 0;

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
                80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos', 95: 'Tormenta'
            };

            updateElementSafely(elements.currentTemp, `${Math.round(current.temperature)}°C`);
            updateElementSafely(elements.weatherIcon, weatherIcons[current.weathercode] || '🌤️');
            updateElementSafely(elements.weatherDesc, descriptions[current.weathercode] || 'Condición desconocida');
            updateElementSafely(elements.humidity, `${humidity}%`);
            updateElementSafely(elements.windSpeed, `${Math.round(current.windspeed)} km/h`);
            updateElementSafely(elements.rainChance, `${precipitation}%`);
            updateElementSafely(elements.weatherStatus, '🟢 En vivo');

            logActivity(`Clima: ${Math.round(current.temperature)}°C, ${descriptions[current.weathercode]}`, 'success');

        } catch (error) {
            updateElementError(elements.currentTemp, 'Error');
            updateElementError(elements.weatherIcon, '❌');
            updateElementError(elements.weatherDesc, 'Error cargando');
            updateElementError(elements.weatherStatus, '🔴 Error');
            throw error;
        }
    }

    async function updateCollectionsCounts() {
        if (!window.db) return;

        try {
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

    // ===========================================
    // FUNCIONES DE UTILIDAD PARA FECHAS
    // ===========================================
    
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

    // ===========================================
    // EVENT LISTENERS
    // ===========================================
    
    function setupEventListeners() {
        // Botón de sincronización
        if (elements.syncButton) {
            elements.syncButton.addEventListener('click', async () => {
                elements.syncButton.disabled = true;
                elements.syncButton.innerHTML = '<i class="fas fa-spin fa-spinner"></i> Sincronizando...';
                
                try {
                    await loadDashboardData();
                    logActivity('Sincronización manual completada', 'success');
                } catch (error) {
                    logActivity(`Error en sincronización: ${error.message}`, 'error');
                } finally {
                    elements.syncButton.disabled = false;
                    elements.syncButton.innerHTML = '<i class="fas fa-sync"></i> Sincronizar';
                }
            });
        }

        // Auto-refresh cada 5 minutos
        setInterval(() => {
            if (navigator.onLine) {
                logActivity('Auto-refresh programado', 'info');
                loadDashboardData();
            }
        }, 5 * 60 * 1000);

        // Eventos de conectividad
        window.addEventListener('online', () => {
            logActivity('Conexión restaurada', 'info');
            setTimeout(loadDashboardData, 1000);
        });

        window.addEventListener('offline', () => {
            logActivity('Sin conexión - modo offline', 'warning');
        });
    }

    // ===========================================
    // INICIALIZACIÓN PRINCIPAL
    // ===========================================
    
    async function initializeDashboard() {
        logActivity('🚀 Inicializando Dashboard usando firebase-integration.js', 'info');

        try {
            setupEventListeners();
            
            // Esperar a que tu sistema esté disponible
            let attempts = 0;
            while (!window.firebaseDataManager && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }
            
            if (window.firebaseDataManager) {
                logActivity('✅ firebase-integration.js detectado', 'success');
            } else {
                logActivity('⚠️ firebase-integration.js no disponible, usando consultas directas', 'warning');
            }

            // Cargar todos los datos
            await loadDashboardData();

            logActivity('🎉 Dashboard inicializado exitosamente', 'success');

        } catch (error) {
            logActivity(`💥 Error crítico: ${error.message}`, 'error');
        }
    }

    // ===========================================
    // AUTO-INICIALIZACIÓN
    // ===========================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
        setTimeout(initializeDashboard, 500);
    }

    // Exposición global para debugging
    window.dashboardApp = {
        elements,
        loadData: loadDashboardData,
        logActivity
    };

    logActivity('📋 Index.js cargado - Configurado para usar firebase-integration.js', 'info');

})();
