/* /js/index.js – Dashboard alineado con index.html (IDs reales)
   - Sin ESM; usa firebase compat global (window.firebase)
   - Offline-first (si algo falla, muestra valores seguros)
   - Respeta layout/estilos existentes
   - 🔧 Modificado para: produccion-hoy, tanque, arboles-sanos, finanzas, precio, trabajadores
   - ✅ AGREGADO: Verificación de autenticación y manejo del loader
*/
(function(){
  // Helpers de elementos
  const $ = (id)=>document.getElementById(id);

  // IDs del HTML (exactos)
  const el = {
    loader: $('loader'), // ✅ AGREGADO: Elemento del loader
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

  // Variables para Firebase (se inicializarán cuando esté disponible)
  let db = null;
  let auth = null;

  // Función para esperar a que Firebase esté disponible
  function waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (window.db && window.auth) {
          db = window.db;
          auth = window.auth;
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  // ✅ NUEVA FUNCIÓN: Ocultar loader
  function hideLoader() {
    if (el.loader) {
      el.loader.classList.add('fade-out');
      setTimeout(() => {
        el.loader.style.display = 'none';
      }, 500);
    }
  }

  // ✅ NUEVA FUNCIÓN: Verificar autenticación
function checkAuthentication() {
  return new Promise((resolve) => {
    if (!auth) {
      console.warn('Firebase no disponible, permitiendo acceso offline');
      resolve(true);
      return;
    }

    // Verificar si ya hay un usuario autenticado en memoria
    if (window.authManager && window.authManager.isAuthenticated) {
      console.log('Usuario ya autenticado en memoria');
      resolve(true);
      return;
    }

    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('Usuario autenticado:', user.email || user.uid);
        resolve(true);
      } else {
        // Solo redirigir si estamos en una página que no sea login
        if (!window.location.pathname.includes('login.html')) {
          console.log('Usuario no autenticado, redirigiendo...');
          window.location.href = '/login.html';
          resolve(false);
        } else {
          resolve(false);
        }
      }
    });
  });
}

  document.addEventListener('DOMContentLoaded', async ()=>{
    try {
      // 1. Esperar a que Firebase esté disponible
      await waitForFirebase();
      
      // 2. ✅ VERIFICAR AUTENTICACIÓN
      const isAuthenticated = await checkAuthentication();
      if (!isAuthenticated) {
        return; // Se redirigió a login, no continuar
      }

      // 3. Botón de sincronización (usa tu API de offline.js sin romper UI)
      if (el.syncNow) {
        el.syncNow.addEventListener('click', ()=> {
          window.offline?.sync()
            .then(cnt => { if (el.pendingCount) el.pendingCount.textContent = String(window.offline?.getPendingCount?.() ?? 0); })
            .catch(()=>{ /* noop */ });
        });
      }

      // 4. Asegurar sesión (anónima si hace falta)
      await ensureAuth();

      // 5. Primera carga de datos
      await loadAll();

      // 6. ✅ OCULTAR LOADER DESPUÉS DE CARGAR TODO
      hideLoader();

      // 7. Auto refresh
      setInterval(loadAll, 30_000);
      window.addEventListener('online', loadAll);

    } catch (error) {
      console.error('Error inicializando dashboard:', error);
      
      // En caso de error, mostrar valores por defecto y ocultar loader
      setDefaultValues();
      hideLoader();
      
      // Mostrar mensaje de error (opcional)
      console.warn('Dashboard inicializado en modo seguro');
    }
  });

  function ensureAuth(){
    return new Promise((resolve)=>{
      if (!auth) {
        resolve();
        return;
      }
      
      auth.onAuthStateChanged(async (u)=>{
        if (!u) {
          try { await auth.signInAnonymously(); } catch(_) {}
        }
        resolve();
      });
    });
  }

  async function loadAll(){
    // Solo proceder si tenemos Firebase disponible
    if (!db) {
      console.warn('Firebase no disponible, usando valores por defecto');
      setDefaultValues();
      return;
    }

    const [prod, tank, price, ventas, gastos, arboles] = await Promise.allSettled([
      loadProductionToday(),
      loadTankLevel(),
      loadMagaPrice(),
      loadSalesToday(),
      loadExpensesToday(),
      loadTreesHealth(),
      updateWeatherData() 
    ]);

    // Producción de hoy + tendencia vs ayer
    if (prod.status === 'fulfilled' && el.prodHoy && el.prodTrend){
      el.prodHoy.textContent = prod.value.totalHoy.toLocaleString();
      el.prodTrend.textContent = prod.value.trendText;
      el.prodTrend.style.color = prod.value.trendColor;
    } else if (el.prodHoy && el.prodTrend) {
      el.prodHoy.textContent = '0';
      el.prodTrend.textContent = '+0% vs ayer';
      el.prodTrend.style.color = 'var(--success)';
    }

    // Tanque
    if (tank.status === 'fulfilled' && el.tankLiters && el.tankPct && el.tankFill && el.tankAlert){
      const liters = Math.round(TANK_CAPACITY_L * (tank.value/100));
      el.tankLiters.textContent = liters.toLocaleString() + 'L';
      el.tankPct.textContent = tank.value + '%';
      el.tankFill.style.height = tank.value + '%';
      if (tank.value < 20) {
        el.tankAlert.style.display = 'block';
        el.tankAlert.title = 'Nivel de tanque crítico';
      } else {
        el.tankAlert.style.display = 'none';
      }
    } else if (el.tankLiters && el.tankPct && el.tankFill && el.tankAlert) {
      el.tankLiters.textContent = '25,000L';
      el.tankPct.textContent = '100%';
      el.tankFill.style.height = '100%';
      el.tankAlert.style.display = 'none';
    }

    // Árboles sanos
    if (arboles.status === 'fulfilled' && el.treesHealthy && el.healthProgress){
      el.treesHealthy.textContent = `${arboles.value.sanos} de ${arboles.value.total}`;
      el.healthProgress.style.width = `${arboles.value.porcentaje}%`;
    } else if (el.treesHealthy && el.healthProgress) {
      el.treesHealthy.textContent = '800 de 800';
      el.healthProgress.style.width = '100%';
    }

    // Precio MAGA (unitario)
    let unitPrice = 0.40;
    if (price.status === 'fulfilled' && price.value > 0) unitPrice = price.value;
    if (el.priceUnit && el.priceUpdate) {
      el.priceUnit.textContent = 'Q' + unitPrice.toFixed(2);
      el.priceUpdate.textContent = 'Act: ' + new Date().toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'});
    }

    // Finanzas (hoy + mes)
    const ventasHoy = ventas.status==='fulfilled' ? ventas.value.total : 0;
    const gastosHoy = gastos.status==='fulfilled' ? gastos.value : 0;
    
    if (el.ingresosHoy && el.gastosHoy && el.balanceHoy) {
      el.ingresosHoy.textContent = 'Q' + ventasHoy.toFixed(2);
      el.gastosHoy.textContent   = 'Q' + gastosHoy.toFixed(2);
      el.balanceHoy.textContent  = 'Q' + (ventasHoy - gastosHoy).toFixed(2);
    }

    // (Opcional simple) Balance de mes: vuelve a calcular ventas-gastos del mes actual
    const mes = await loadMonthBalance().catch(()=>({ventas:0,gastos:0}));
    if (el.balanceMes) {
      el.balanceMes.textContent = 'Q' + (mes.ventas - mes.gastos).toFixed(2);
    }

    // Trabajadores activos (dummy suave como tu HTML)
    const activos = Math.floor(Math.random()*3)+1;
    if (el.workers && el.lastActivity) {
      el.workers.textContent = String(activos);
      el.lastActivity.textContent = 'Última actividad: ' + new Date().toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'});
    }
  }

  function setDefaultValues() {
    // Establecer valores por defecto cuando Firebase no está disponible
    if (el.prodHoy) el.prodHoy.textContent = '0';
    if (el.prodTrend) el.prodTrend.textContent = '+0% vs ayer';
    if (el.tankLiters) el.tankLiters.textContent = '25,000L';
    if (el.tankPct) el.tankPct.textContent = '100%';
    if (el.tankFill) el.tankFill.style.height = '100%';
    if (el.treesHealthy) el.treesHealthy.textContent = '800 de 800';
    if (el.healthProgress) el.healthProgress.style.width = '100%';
    if (el.priceUnit) el.priceUnit.textContent = 'Q0.40';
    if (el.ingresosHoy) el.ingresosHoy.textContent = 'Q0.00';
    if (el.gastosHoy) el.gastosHoy.textContent = 'Q0.00';
    if (el.balanceHoy) el.balanceHoy.textContent = 'Q0.00';
    if (el.balanceMes) el.balanceMes.textContent = 'Q0.00';
    if (el.workers) el.workers.textContent = '1';
    if (el.lastActivity) el.lastActivity.textContent = 'Última actividad: --:--';
  }

  // --- Consultas Firestore ---
  function dayRange(){
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    const start = new Date(y, m, day, 0,0,0).toISOString().slice(0,10);
    const end   = new Date(y, m, day, 23,59,59).toISOString().slice(0,10);
    return { start, end };
  }
  function monthRange(){
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth();
    const start = new Date(y, m, 1, 0,0,0).toISOString().slice(0,10);
    const end   = new Date(y, m+1, 0, 23,59,59).toISOString().slice(0,10);
    return { start, end };
  }

  async function loadProductionToday(){
    if (!db) throw new Error('DB no disponible');
    
    const { start, end } = dayRange();
    let totalHoy = 0, totalAyer = 0;

    // Hoy
    const qHoy = db.collection('cosechas_diarias')
      .where('fecha','>=',start).where('fecha','<=',end).orderBy('fecha','desc');
    const sHoy = await qHoy.get();
    sHoy.forEach(doc=>{
      const x = doc.data();
      totalHoy += Number(x.primera||x.unidades_primera||0)
                + Number(x.segunda||x.unidades_segunda||0)
                + Number(x.descarte||x.unidades_descarte||0);
    });

    // Ayer
    const dAyer = new Date(Date.now()-24*60*60*1000);
    const sAyer = new Date(dAyer.getFullYear(), dAyer.getMonth(), dAyer.getDate()).toISOString().slice(0,10);
    const eAyer = new Date(dAyer.getFullYear(), dAyer.getMonth(), dAyer.getDate(), 23,59,59).toISOString().slice(0,10);
    const qAyer = db.collection('cosechas_diarias')
      .where('fecha','>=',sAyer).where('fecha','<=',eAyer).orderBy('fecha','desc');
    const sAy = await qAyer.get();
    sAy.forEach(doc=>{
      const x = doc.data();
      totalAyer += Number(x.primera||x.unidades_primera||0)
                 + Number(x.segunda||x.unidades_segunda||0)
                 + Number(x.descarte||x.unidades_descarte||0);
    });

    const trend = totalAyer>0 ? ((totalHoy-totalAyer)/totalAyer*100) : 0;
    const trendText = `${trend>=0?'+':''}${trend.toFixed(1)}% vs ayer`;
    const trendColor = trend>=0 ? 'var(--success)' : 'var(--error)';

    return { totalHoy, trendText, trendColor };
  }

  async function loadTankLevel(){
    if (!db) throw new Error('DB no disponible');
    
    const q = await db.collection('riegos').orderBy('timestamp','desc').limit(1).get()
              .catch(()=>db.collection('riegos').orderBy('fecha','desc').limit(1).get());
    if (!q.empty){
      const x = q.docs[0].data();
      const nivelL = Number(x.nivel_tanque || x.tanque_nivel_despues || TANK_CAPACITY_L);
      const pct = Math.max(0, Math.min(100, Math.round(nivelL / TANK_CAPACITY_L * 100)));
      return pct;
    }
    return 100;
  }

  async function loadMagaPrice(){
    if (!db) throw new Error('DB no disponible');
    
    const s = await db.collection('precios_maga').orderBy('fecha','desc').limit(1).get();
    if (!s.empty){
      const p = s.docs[0].data();
      const unit = Number(p.precio_por_unidad ?? (p.precio_millar_limon_persa ? p.precio_millar_limon_persa/1000 : 0));
      return (isFinite(unit) && unit>0) ? unit : 0.40;
    }
    return 0.40;
  }

  async function loadSalesToday(){
    if (!db) throw new Error('DB no disponible');
    
    const { start, end } = dayRange();
    let total = 0;
    const q = db.collection('ventas_directas')
      .where('fecha','>=',start).where('fecha','<=',end).orderBy('fecha','desc');
    const s = await q.get();
    s.forEach(d=> total += Number(d.data().total_venta || 0));
    return { total: Math.round(total*100)/100 };
  }

  async function loadExpensesToday(){
    if (!db) throw new Error('DB no disponible');
    
    const { start, end } = dayRange();
    let total = 0;
    const q = db.collection('gastos')
      .where('fecha','>=',start).where('fecha','<=',end).orderBy('fecha','desc');
    const s = await q.get();
    s.forEach(d=> total += Number(d.data().monto || 0));
    return Math.round(total*100)/100;
  }

  async function loadMonthBalance(){
    if (!db) throw new Error('DB no disponible');
    
    const { start, end } = monthRange();
    const [v, g] = await Promise.all([
      db.collection('ventas_directas').where('fecha','>=',start).where('fecha','<=',end).get(),
      db.collection('gastos').where('fecha','>=',start).where('fecha','<=',end).get()
    ]);
    let ventas=0, gastos=0;
    v.forEach(d=> ventas += Number(d.data().total_venta || 0));
    g.forEach(d=> gastos += Number(d.data().monto || 0));
    return { ventas, gastos };
  }

  async function loadTreesHealth(){
    if (!db) throw new Error('DB no disponible');
    
    const total = await db.collection('arboles').get();
    const sanos = await db.collection('arboles').where('estado_salud','==','sano').get();
    const porcentaje = total.size>0 ? Math.round((sanos.size/total.size)*100) : 100;
    return { sanos: sanos.size, total: total.size, porcentaje };
  }

async function updateWeatherData() {
  try {
    // Coordenadas de Guatemala (ajusta a tu finca)
    const lat = 14.770646;
    const lon = -90.255254;
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=America/Guatemala`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      const current = data.current_weather;
      const hourly = data.hourly;
      
      // Obtener datos de la hora actual
      const currentHour = new Date().getHours();
      const humidity = hourly.relative_humidity_2m[currentHour] || 60;
      const precipitationChance = hourly.precipitation_probability[currentHour] || 0;
      
      // Iconos basados en código de clima
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
      
    } else {
      throw new Error('Error en la respuesta del servidor');
    }
    
  } catch (error) {
    console.error('Error obteniendo clima:', error);
    
    const tempEl = document.getElementById('current-temp');
    const descEl = document.getElementById('weather-desc');
    const humidityEl = document.getElementById('humidity');
    const windEl = document.getElementById('wind-speed');
    const rainEl = document.getElementById('rain-chance');
    
    if (descEl) descEl.textContent = 'Error cargando clima';
    if (tempEl) tempEl.textContent = '--°C';
    if (humidityEl) humidityEl.textContent = '--%';
    if (windEl) windEl.textContent = '-- km/h';
    if (rainEl) rainEl.textContent = '--%';
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