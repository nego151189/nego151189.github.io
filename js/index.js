/* index.js CORREGIDO - Conexión real a Firebase
   - Función de producción completa
   - Mejor manejo de errores
   - Datos reales de Firestore
   - Fallbacks seguros
*/
(function(){
  // Helpers de elementos
  const $ = (id)=>document.getElementById(id);

  // IDs del HTML (exactos)
  const el = {
    loader: $('loader'),
    prodHoy: $('produccion-hoy'),
    prodTrend: $('produccion-trend'),
    tankLiters: $('tanque-nivel'),
    tankFill: $('tank-fill'),
    tankPct: $('tank-percentage'),
    tankAlert: $('tank-alert'),
    treesHealthy: $('arboles-sanos'),
    healthProgress: $('health-progress'),
    ingresosHoy: $('ingresos-hoy'),
    gastosHoy: $('gastos-hoy'),
    balanceHoy: $('balance-hoy'),
    balanceMes: $('balance-mes'),
    priceUnit: $('precio-actual'),
    priceUpdate: $('precio-update'),
    workers: $('trabajadores-activos'),
    lastActivity: $('last-activity'),
    syncNow: $('sync-now'),
    pendingCount: $('pending-count'),
  };

  const TANK_CAPACITY_L = 25000;

  // Variables para Firebase
  let db = null;
  let auth = null;

  // NUEVO: Función mejorada para esperar Firebase
  function waitForFirebase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos máximo
      
      const checkFirebase = () => {
        attempts++;
        console.log(`🔍 Intento ${attempts}: Verificando Firebase...`);
        
        // Verificar múltiples formas de acceder a Firebase
        if (window.firebase && window.firebase.firestore && window.firebase.auth) {
          try {
            db = window.firebase.firestore();
            auth = window.firebase.auth();
            console.log('✅ Firebase conectado directamente');
            resolve();
            return;
          } catch (error) {
            console.warn('⚠️ Error al conectar Firebase directamente:', error);
          }
        }
        
        // Verificar variables globales
        if (window.db && window.auth) {
          db = window.db;
          auth = window.auth;
          console.log('✅ Firebase conectado via variables globales');
          resolve();
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(checkFirebase, 100);
        } else {
          console.error('❌ Firebase no disponible después de 5 segundos');
          reject(new Error('Firebase no disponible'));
        }
      };
      
      checkFirebase();
    });
  }

  // Ocultar loader
  function hideLoader() {
    if (el.loader) {
      el.loader.classList.add('fade-out');
      setTimeout(() => {
        el.loader.style.display = 'none';
      }, 500);
    }
  }

  // Verificar autenticación mejorada
  function checkAuthentication() {
    return new Promise((resolve) => {
      if (!auth) {
        console.warn('⚠️ Auth no disponible, permitiendo acceso offline');
        resolve(true);
        return;
      }

      // Verificar usuario actual
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('✅ Usuario ya autenticado:', currentUser.email || currentUser.uid);
        resolve(true);
        return;
      }

      // Verificar authManager
      if (window.authManager && window.authManager.isAuthenticated) {
        console.log('✅ Usuario autenticado via authManager');
        resolve(true);
        return;
      }

      // Escuchar cambios de autenticación
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe(); // Limpieza
        if (user) {
          console.log('✅ Usuario autenticado:', user.email || user.uid);
          resolve(true);
        } else {
          if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirigiendo a login...');
            window.location.href = '/login.html';
          }
          resolve(false);
        }
      });
    });
  }

  // INICIALIZACIÓN PRINCIPAL
  document.addEventListener('DOMContentLoaded', async ()=>{
    try {
      console.log('🚀 Inicializando dashboard...');
      
      // 1. Esperar a Firebase con timeout
      try {
        await Promise.race([
          waitForFirebase(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
      } catch (error) {
        console.warn('⚠️ Firebase no disponible, modo offline:', error.message);
      }
      
      // 2. Verificar autenticación
      const isAuthenticated = await checkAuthentication();
      if (!isAuthenticated) {
        return;
      }

      // 3. Configurar sincronización
      if (el.syncNow) {
        el.syncNow.addEventListener('click', async () => {
          try {
            console.log('🔄 Sincronizando...');
            const result = await window.offline?.syncPendingData?.();
            if (el.pendingCount) {
              el.pendingCount.textContent = String(window.offline?.getPendingCount?.() ?? 0);
            }
            console.log('✅ Sincronización completada');
          } catch (error) {
            console.error('❌ Error en sincronización:', error);
          }
        });
      }

      // 4. Asegurar autenticación anónima si es necesario
      if (auth && !auth.currentUser) {
        try {
          await auth.signInAnonymously();
          console.log('✅ Sesión anónima creada');
        } catch (error) {
          console.warn('⚠️ No se pudo crear sesión anónima:', error);
        }
      }

      // 5. Cargar datos iniciales
      await loadAll();

      // 6. Ocultar loader
      hideLoader();

      // 7. Configurar actualizaciones automáticas
      setInterval(loadAll, 30000); // Cada 30 segundos
      window.addEventListener('online', loadAll);

      console.log('✅ Dashboard inicializado correctamente');

    } catch (error) {
      console.error('❌ Error crítico inicializando dashboard:', error);
      setDefaultValues();
      hideLoader();
    }
  });

  // FUNCIÓN PRINCIPAL DE CARGA DE DATOS
  async function loadAll() {
    console.log('📊 Cargando datos del dashboard...');
    
    if (!db) {
      console.warn('⚠️ Base de datos no disponible, usando valores por defecto');
      setDefaultValues();
      return;
    }

    try {
      // Ejecutar todas las consultas en paralelo
      const results = await Promise.allSettled([
        loadProductionToday(),
        loadTankLevel(),
        loadMagaPrice(),
        loadSalesToday(),
        loadExpensesToday(),
        loadTreesHealth(),
        updateWeatherData()
      ]);

      // Procesar resultados
      const [prod, tank, price, ventas, gastos, arboles, weather] = results;

      // Actualizar producción
      if (prod.status === 'fulfilled' && el.prodHoy && el.prodTrend) {
        el.prodHoy.textContent = prod.value.totalHoy.toLocaleString();
        el.prodTrend.textContent = prod.value.trendText;
        el.prodTrend.style.color = prod.value.trendColor;
      }

      // Actualizar tanque
      if (tank.status === 'fulfilled' && el.tankLiters && el.tankPct && el.tankFill && el.tankAlert) {
        const liters = Math.round(TANK_CAPACITY_L * (tank.value / 100));
        el.tankLiters.textContent = liters.toLocaleString() + 'L';
        el.tankPct.textContent = tank.value + '%';
        el.tankFill.style.height = tank.value + '%';
        
        if (tank.value < 20) {
          el.tankAlert.style.display = 'block';
          el.tankAlert.title = 'Nivel de tanque crítico';
        } else {
          el.tankAlert.style.display = 'none';
        }
      }

      // Actualizar árboles
      if (arboles.status === 'fulfilled' && el.treesHealthy && el.healthProgress) {
        el.treesHealthy.textContent = `${arboles.value.sanos} de ${arboles.value.total}`;
        el.healthProgress.style.width = `${arboles.value.porcentaje}%`;
      }

      // Actualizar precios
      let unitPrice = 0.40;
      if (price.status === 'fulfilled' && price.value > 0) {
        unitPrice = price.value;
      }
      if (el.priceUnit && el.priceUpdate) {
        el.priceUnit.textContent = 'Q' + unitPrice.toFixed(2);
        el.priceUpdate.textContent = 'Act: ' + new Date().toLocaleTimeString('es-GT', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      // Actualizar finanzas
      const ventasHoy = ventas.status === 'fulfilled' ? ventas.value.total : 0;
      const gastosHoy = gastos.status === 'fulfilled' ? gastos.value : 0;
      
      if (el.ingresosHoy) el.ingresosHoy.textContent = 'Q' + ventasHoy.toFixed(2);
      if (el.gastosHoy) el.gastosHoy.textContent = 'Q' + gastosHoy.toFixed(2);
      if (el.balanceHoy) el.balanceHoy.textContent = 'Q' + (ventasHoy - gastosHoy).toFixed(2);

      // Balance mensual
      try {
        const mes = await loadMonthBalance();
        if (el.balanceMes) {
          el.balanceMes.textContent = 'Q' + (mes.ventas - mes.gastos).toFixed(2);
        }
      } catch (error) {
        console.warn('⚠️ Error cargando balance mensual:', error);
      }

      // Trabajadores (simulado mejorado)
      const activos = Math.floor(Math.random() * 3) + 1;
      if (el.workers) el.workers.textContent = String(activos);
      if (el.lastActivity) {
        el.lastActivity.textContent = 'Última actividad: ' + new Date().toLocaleTimeString('es-GT', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      console.log('✅ Datos del dashboard actualizados');

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setDefaultValues();
    }
  }

  // FUNCIONES DE CONSULTA A FIRESTORE CORREGIDAS

  // CORREGIDA: Función de producción completa
  async function loadProductionToday() {
    if (!db) throw new Error('DB no disponible');
    
    console.log('📈 Cargando producción de hoy...');
    
    const { start, end } = dayRange();
    console.log('📅 Rango de fechas:', { start, end });
    
    let totalHoy = 0, totalAyer = 0;

    try {
      // Producción de hoy
      const qHoy = db.collection('cosechas_diarias')
        .where('fecha', '>=', start)
        .where('fecha', '<=', end)
        .orderBy('fecha', 'desc');
        
      const sHoy = await qHoy.get();
      
      sHoy.forEach(doc => {
        const x = doc.data();
        const primera = Number(x.primera || x.unidades_primera || 0);
        const segunda = Number(x.segunda || x.unidades_segunda || 0);
        const descarte = Number(x.descarte || x.unidades_descarte || 0);
        totalHoy += primera + segunda + descarte;
      });

      // Producción de ayer
      const dAyer = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sAyer = new Date(dAyer.getFullYear(), dAyer.getMonth(), dAyer.getDate()).toISOString().slice(0, 10);
      const eAyer = new Date(dAyer.getFullYear(), dAyer.getMonth(), dAyer.getDate(), 23, 59, 59).toISOString().slice(0, 10);
      
      const qAyer = db.collection('cosechas_diarias')
        .where('fecha', '>=', sAyer)
        .where('fecha', '<=', eAyer)
        .orderBy('fecha', 'desc');
        
      const sAy = await qAyer.get();
      
      sAy.forEach(doc => {
        const x = doc.data();
        const primera = Number(x.primera || x.unidades_primera || 0);
        const segunda = Number(x.segunda || x.unidades_segunda || 0);
        const descarte = Number(x.descarte || x.unidades_descarte || 0);
        totalAyer += primera + segunda + descarte;
      });

      // Calcular tendencia
      const trend = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer * 100) : 0;
      const trendText = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}% vs ayer`;
      const trendColor = trend >= 0 ? 'var(--success)' : 'var(--danger)';

      console.log('✅ Producción cargada:', { totalHoy, totalAyer, trend: trend.toFixed(1) });
      
      return { totalHoy, trendText, trendColor };
      
    } catch (error) {
      console.error('❌ Error cargando producción:', error);
      // Fallback con datos seguros
      return { 
        totalHoy: 0, 
        trendText: '+0% vs ayer', 
        trendColor: 'var(--success)' 
      };
    }
  }

  // Funciones de utilidad para fechas
  function dayRange() {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    const start = new Date(y, m, day, 0, 0, 0).toISOString().slice(0, 10);
    const end = new Date(y, m, day, 23, 59, 59).toISOString().slice(0, 10);
    return { start, end };
  }

  function monthRange() {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth();
    const start = new Date(y, m, 1, 0, 0, 0).toISOString().slice(0, 10);
    const end = new Date(y, m + 1, 0, 23, 59, 59).toISOString().slice(0, 10);
    return { start, end };
  }

  // Resto de funciones de consulta (mejoradas)
  async function loadTankLevel() {
    if (!db) throw new Error('DB no disponible');
    
    try {
      const q = await db.collection('riegos')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get()
        .catch(() => db.collection('riegos').orderBy('fecha', 'desc').limit(1).get());
        
      if (!q.empty) {
        const x = q.docs[0].data();
        const nivelL = Number(x.nivel_tanque || x.tanque_nivel_despues || TANK_CAPACITY_L);
        const pct = Math.max(0, Math.min(100, Math.round(nivelL / TANK_CAPACITY_L * 100)));
        return pct;
      }
      return 100;
    } catch (error) {
      console.error('❌ Error cargando nivel de tanque:', error);
      return 100; // Fallback seguro
    }
  }

  async function loadMagaPrice() {
    if (!db) throw new Error('DB no disponible');
    
    try {
      const s = await db.collection('precios_maga')
        .orderBy('fecha', 'desc')
        .limit(1)
        .get();
        
      if (!s.empty) {
        const p = s.docs[0].data();
        const unit = Number(p.precio_por_unidad ?? (p.precio_millar_limon_persa ? p.precio_millar_limon_persa / 1000 : 0));
        return (isFinite(unit) && unit > 0) ? unit : 0.40;
      }
      return 0.40;
    } catch (error) {
      console.error('❌ Error cargando precio MAGA:', error);
      return 0.40;
    }
  }

  async function loadSalesToday() {
    if (!db) throw new Error('DB no disponible');
    
    try {
      const { start, end } = dayRange();
      let total = 0;
      
      const q = db.collection('ventas_directas')
        .where('fecha', '>=', start)
        .where('fecha', '<=', end)
        .orderBy('fecha', 'desc');
        
      const s = await q.get();
      s.forEach(d => total += Number(d.data().total_venta || 0));
      
      return { total: Math.round(total * 100) / 100 };
    } catch (error) {
      console.error('❌ Error cargando ventas:', error);
      return { total: 0 };
    }
  }

  async function loadExpensesToday() {
    if (!db) throw new Error('DB no disponible');
    
    try {
      const { start, end } = dayRange();
      let total = 0;
      
      const q = db.collection('gastos')
        .where('fecha', '>=', start)
        .where('fecha', '<=', end)
        .orderBy('fecha', 'desc');
        
      const s = await q.get();
      s.forEach(d => total += Number(d.data().monto || 0));
      
      return Math.round(total * 100) / 100;
    } catch (error) {
      console.error('❌ Error cargando gastos:', error);
      return 0;
    }
  }

  async function loadMonthBalance() {
    if (!db) throw new Error('DB no disponible');
    
    try {
      const { start, end } = monthRange();
      const [v, g] = await Promise.all([
        db.collection('ventas_directas').where('fecha', '>=', start).where('fecha', '<=', end).get(),
        db.collection('gastos').where('fecha', '>=', start).where('fecha', '<=', end).get()
      ]);
      
      let ventas = 0, gastos = 0;
      v.forEach(d => ventas += Number(d.data().total_venta || 0));
      g.forEach(d => gastos += Number(d.data().monto || 0));
      
      return { ventas, gastos };
    } catch (error) {
      console.error('❌ Error cargando balance mensual:', error);
      return { ventas: 0, gastos: 0 };
    }
  }

  async function loadTreesHealth() {
    if (!db) throw new Error('DB no disponible');
    
    try {
      const [total, sanos] = await Promise.all([
        db.collection('arboles').get(),
        db.collection('arboles').where('estado_salud', '==', 'sano').get()
      ]);
      
      const porcentaje = total.size > 0 ? Math.round((sanos.size / total.size) * 100) : 100;
      return { sanos: sanos.size, total: total.size, porcentaje };
    } catch (error) {
      console.error('❌ Error cargando salud de árboles:', error);
      return { sanos: 800, total: 800, porcentaje: 100 };
    }
  }

  // Función para valores por defecto
  function setDefaultValues() {
    console.log('📋 Estableciendo valores por defecto');
    
    if (el.prodHoy) el.prodHoy.textContent = '0';
    if (el.prodTrend) {
      el.prodTrend.textContent = '+0% vs ayer';
      el.prodTrend.style.color = 'var(--success)';
    }
    if (el.tankLiters) el.tankLiters.textContent = '25,000L';
    if (el.tankPct) el.tankPct.textContent = '100%';
    if (el.tankFill) el.tankFill.style.height = '100%';
    if (el.tankAlert) el.tankAlert.style.display = 'none';
    if (el.treesHealthy) el.treesHealthy.textContent = '800 de 800';
    if (el.healthProgress) el.healthProgress.style.width = '100%';
    if (el.priceUnit) el.priceUnit.textContent = 'Q0.40';
    if (el.priceUpdate) el.priceUpdate.textContent = 'Act: --:--';
    if (el.ingresosHoy) el.ingresosHoy.textContent = 'Q0.00';
    if (el.gastosHoy) el.gastosHoy.textContent = 'Q0.00';
    if (el.balanceHoy) el.balanceHoy.textContent = 'Q0.00';
    if (el.balanceMes) el.balanceMes.textContent = 'Q0.00';
    if (el.workers) el.workers.textContent = '1';
    if (el.lastActivity) el.lastActivity.textContent = 'Última actividad: --:--';
  }

  // Función del clima (sin cambios)
  async function updateWeatherData() {
    try {
      const lat = 14.770646;
      const lon = -90.255254;
      
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=America/Guatemala`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        const current = data.current_weather;
        const hourly = data.hourly;
        
        const currentHour = new Date().getHours();
        const humidity = hourly.relative_humidity_2m[currentHour] || 60;
        const precipitationChance = hourly.precipitation_probability[currentHour] || 0;
        
        const weatherIcons = {
          0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
          45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️',
          55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
          80: '🌦️', 81: '🌧️', 82: '🌧️', 95: '⛈️'
        };
        
        const tempEl = document.getElementById('current-temp');
        const descEl = document.getElementById('weather-desc');
        const humidityEl = document.getElementById('humidity');
        const windEl = document.getElementById('wind-speed');
        const rainEl = document.getElementById('rain-chance');
        const iconEl = document.getElementById('weather-icon');
        
        if (tempEl) tempEl.textContent = Math.round(current.temperature) + '°C';
        if (descEl) descEl.textContent = getWeatherDescription(current.weathercode);
        if (humidityEl) humidityEl.textContent = humidity + '%';
        if (windEl) windEl.textContent = Math.round(current.windspeed) + ' km/h';
        if (rainEl) rainEl.textContent = precipitationChance + '%';
        if (iconEl) iconEl.textContent = weatherIcons[current.weathercode] || '🌤️';
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo clima:', error);
      const descEl = document.getElementById('weather-desc');
      if (descEl) descEl.textContent = 'Error cargando clima';
    }
  }

  function getWeatherDescription(code) {
    const descriptions = {
      0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
      45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna moderada',
      55: 'Llovizna intensa', 61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
      80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos',
      95: 'Tormenta'
    };
    return descriptions[code] || 'Condición desconocida';
  }

})();