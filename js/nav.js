/* ========================================
   FINCA LA HERRADURA - SISTEMA DE NAVEGACIÓN
   Navegación adaptativa según roles y permisos
   ✅ CORREGIDO: Verificación de auth que espera al AuthManager
   ======================================== */

// Variables globales para mantener el estado
let currentPage = getCurrentPage();
let isOffline = !navigator.onLine;
let mobileMenuOpen = false;
let menuCollapsed = localStorage.getItem('menuCollapsed') === 'true';

// ==========================================
// INICIALIZACIÓN
// ==========================================

function initNavigationManager() {
  // Configuración de menús según rol
  const menuConfig = getMenuConfiguration();
  
  // Escuchar cambios de autenticación
  setupAuthListener();
  
  // Escuchar cambios de conexión
  window.addEventListener('online', () => handleConnectionChange(true));
  window.addEventListener('offline', () => handleConnectionChange(false));
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNavigation());
  } else {
    initNavigation();
  }
}

function initNavigation() {
  createNavigation();
  setupEventListeners();
  updateActiveMenuItem();
  setupMobileMenu();
  addNavigationStyles();
  applyMenuCollapsedState();
  createSidebarOverlay();
  handleResize();
}

function setupAuthListener() {
  // Escuchar cambios en el estado de autenticación
  if (window.authManager) {
    // Actualizar navegación cuando cambie el usuario
    const originalHandleUserLogin = window.authManager.handleUserLogin?.bind(window.authManager);
    if (originalHandleUserLogin) {
      window.authManager.handleUserLogin = async (user) => {
        await originalHandleUserLogin(user);
        setTimeout(() => updateNavigation(), 100);
      };
    }
  }
}

// ==========================================
// CONFIGURACIÓN DE MENÚS
// ==========================================

function getMenuConfiguration() {
  return {
    administrador: [
      {
        icon: '📊',
        label: 'Dashboard',
        href: '/index.html',
        id: 'dashboard',
        description: 'Panel principal con métricas'
      },
      {
        icon: '🌳',
        label: 'Árboles',
        href: '/arboles.html',
        id: 'arboles',
        description: 'Gestión de árboles y bloques'
      },
      {
        icon: '📈',
        label: 'Producción',
        href: '/produccion.html',
        id: 'produccion',
        description: 'Registro de cosechas'
      },
      {
        icon: '💰',
        label: 'Ventas',
        href: '/ventas.html',
        id: 'ventas',
        description: 'Gestión de ventas'
      },
      {
        icon: '💸',
        label: 'Gastos',
        href: '/gastos.html',
        id: 'gastos',
        description: 'Control de gastos'
      },
      {
        icon: '💲',
        label: 'Precios',
        href: '/precios.html',
        id: 'precios',
        description: 'Precios del mercado'
      },
      {
        icon: '🌦️',
        label: 'Clima',
        href: '/clima.html',
        id: 'clima',
        description: 'Datos meteorológicos'
      },
      {
        icon: '💧',
        label: 'Riego',
        href: '/riego.html',
        id: 'riego',
        description: 'Control de riego'
      },
      {
        icon: '🧪',
        label: 'Tratamientos',
        href: '/tratamientos.html',
        id: 'tratamientos',
        description: 'Tratamientos y fertilizantes'
      },
      {
        icon: '👥',
        label: 'Clientes',
        href: '/clientes.html',
        id: 'clientes',
        description: 'Gestión de clientes'
      },
      {
        icon: '💼',
        label: 'Negocios',
        href: '/negocios.html',
        id: 'negocios',
        description: 'Oportunidades de negocio'
      },
      {
        icon: '📋',
        label: 'Recordatorios',
        href: '/recordatorios.html',
        id: 'recordatorios',
        description: 'Alertas y notificaciones'
      },
      {
        icon: '⚙️',
        label: 'Configuración',
        href: '/configuracion.html',
        id: 'configuracion',
        description: 'Ajustes del sistema'
      }
    ],
    trabajador: [
      {
        icon: '📈',
        label: 'Producción',
        href: '/produccion.html',
        id: 'produccion',
        description: 'Registro de cosechas',
        permission: 'produccion'
      },
      {
        icon: '🌳',
        label: 'Árboles',
        href: '/arboles.html',
        id: 'arboles',
        description: 'Información de árboles',
        permission: 'arboles'
      },
      {
        icon: '💧',
        label: 'Riego',
        href: '/riego.html',
        id: 'riego',
        description: 'Registro de riego',
        permission: 'riego'
      },
      {
        icon: '🧪',
        label: 'Tratamientos',
        href: '/tratamientos.html',
        id: 'tratamientos',
        description: 'Aplicar tratamientos',
        permission: 'tratamientos'
      },
      {
        icon: '🌦️',
        label: 'Clima',
        href: '/clima.html',
        id: 'clima',
        description: 'Condiciones climáticas'
      },
      {
        icon: '📋',
        label: 'Recordatorios',
        href: '/recordatorios.html',
        id: 'recordatorios',
        description: 'Mis tareas'
      }
    ]
  };
}

function getMenuItems() {
  const userRole = window.authManager?.userRole || 'trabajador';
  const menuConfig = getMenuConfiguration();
  const menuItems = menuConfig[userRole] || menuConfig.trabajador;
  
  // Filtrar por permisos para trabajadores
  if (userRole === 'trabajador') {
    return menuItems.filter(item => {
      if (!item.permission) return true;
      return window.authManager?.hasPermission(item.permission);
    });
  }
  
  return menuItems;
}

// ==========================================
// CREACIÓN DE NAVEGACIÓN
// ==========================================

function createNavigation() {
  const existingNav = document.querySelector('.sidebar');
  if (existingNav) {
    existingNav.remove();
  }

  const navigation = buildNavigationHTML();
  
  // Insertar al inicio del body
  document.body.insertAdjacentHTML('afterbegin', navigation);
}

function buildNavigationHTML() {
  const menuItems = getMenuItems();
  const userRole = window.authManager?.userRole || '';
  const userName = window.authManager?.currentUser?.email || 'Usuario';
  
  const menuItemsHTML = menuItems.map(item => `
    <li class="nav-item ${currentPage === item.id ? 'active' : ''}">
      <a href="${item.href}" class="nav-link" data-page="${item.id}" title="${item.description}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
        ${isOffline && requiresOnline(item.id) ? '<span class="offline-indicator">⚡</span>' : ''}
      </a>
    </li>
  `).join('');

  return `
    <nav class="sidebar ${menuCollapsed ? 'collapsed' : ''}" id="main-navigation">
      <!-- Header del usuario -->
      <div class="nav-header">
        <div class="user-info">
          <div class="user-avatar">
            <span class="avatar-text">${userName.charAt(0).toUpperCase()}</span>
            ${isOffline ? '<span class="offline-badge">📱</span>' : '<span class="online-badge">🌐</span>'}
          </div>
          <div class="user-details">
            <div class="user-name">${userName.split('@')[0]}</div>
            <div class="user-role">${userRole}</div>
          </div>
        </div>
        
        <!-- Botón móvil -->
        <button class="mobile-menu-toggle" id="mobile-menu-toggle">
          <div class="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      <!-- Botón para colapsar/expandir menú -->
      <div class="collapse-toggle-container">
        <button class="collapse-toggle" id="collapse-toggle" title="${menuCollapsed ? 'Expandir menú' : 'Colapsar menú'}">
          <span class="toggle-icon">${menuCollapsed ? '➡️' : '⬅️'}</span>
        </button>
      </div>

      <!-- Menú principal -->
      <ul class="nav-menu" id="nav-menu">
        ${menuItemsHTML}
      </ul>

      <!-- Footer de navegación -->
      <div class="nav-footer">
        <div class="connection-status">
          <span class="status-indicator ${isOffline ? 'offline' : 'online'}"></span>
          <span class="status-text">${isOffline ? 'Sin conexión' : 'Conectado'}</span>
        </div>
        
        <button class="btn-logout" id="btn-logout" title="Cerrar sesión">
          <span class="logout-icon">🚪</span>
          <span class="logout-text">Salir</span>
        </button>
      </div>

      <!-- Indicador de sincronización -->
      <div class="sync-indicator" id="sync-indicator" style="display: none;">
        <div class="sync-spinner"></div>
        <span>Sincronizando...</span>
      </div>
    </nav>
  `;
}

// ==========================================
// GESTIÓN DE EVENTOS
// ==========================================

function setupEventListeners() {
  // Click en enlaces de navegación
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
      handleNavigation(e, navLink);
    }
  });

  // Botón de logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => handleLogout());
  }

  // Menú móvil
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });
  }

  // Botón para colapsar/expandir menú
  const collapseToggle = document.getElementById('collapse-toggle');
  if (collapseToggle) {
    collapseToggle.addEventListener('click', () => toggleMenuCollapse());
  }

  // Cerrar menú móvil al hacer click fuera
  document.addEventListener('click', (e) => {
    if (mobileMenuOpen && !e.target.closest('.sidebar')) {
      closeMobileMenu();
    }
  });

  // Event listeners adicionales
  window.addEventListener('resize', handleResize);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      closeMobileMenu();
    }
  });

  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (navLink && window.innerWidth <= 768 && mobileMenuOpen) {
      setTimeout(() => {
        closeMobileMenu();
      }, 150);
    }
  });

  // Indicar página activa al navegar
  window.addEventListener('popstate', () => {
    currentPage = getCurrentPage();
    updateActiveMenuItem();
  });
}

// ✅ FUNCIÓN CORREGIDA: Ahora espera al AuthManager antes de verificar permisos
async function handleNavigation(e, navLink) {
  const pageId = navLink.dataset.page;
  const href = navLink.getAttribute('href');
  
  // Verificar si requiere conexión
  if (isOffline && requiresOnline(pageId)) {
    e.preventDefault();
    showOfflineMessage(pageId);
    return;
  }

  // ✅ CAMBIO PRINCIPAL: Verificar permisos de forma asíncrona
  await waitForAuthManagerReady();
  const hasPermission = await checkPagePermissionAsync(pageId);
  if (!hasPermission) {
    e.preventDefault();
    showPermissionError(pageId);
    return;
  }

  // Navegación normal
  currentPage = pageId;
  updateActiveMenuItem();
  closeMobileMenu();
  
  // Agregar efecto de carga
  showPageLoading(navLink);

  // Mostrar notificación de navegación si está disponible
  if (window.notificationManager && pageId !== 'dashboard') {
    window.notificationManager.info(`Cargando ${navLink.querySelector('.nav-label').textContent}...`, 2000);
  }
}

// ✅ NUEVA FUNCIÓN: Verificación asíncrona de permisos que espera al AuthManager
// ✅ NUEVA FUNCIÓN: Esperar a que AuthManager esté completamente listo
async function waitForAuthManagerReady() {
    return new Promise((resolve) => {
        const maxWait = 5000; // 5 segundos máximo
        const checkInterval = 100;
        let elapsed = 0;
        
        const check = () => {
            if (window.authManager && window.authManager.isInitialized) {
                resolve();
            } else if (elapsed < maxWait) {
                elapsed += checkInterval;
                setTimeout(check, checkInterval);
            } else {
                console.warn('⚠️ Timeout esperando AuthManager en navegación');
                resolve();
            }
        };
        
        check();
    });
}

// ✅ FUNCIÓN ORIGINAL: Sin cambios, pero ahora solo se llama cuando AuthManager está listo
function hasPagePermission(pageId) {
  if (window.authManager?.userRole === 'administrador') return true;
  
  const pagePermissions = {
    'ventas': 'ventas',
    'gastos': 'gastos',
    'tratamientos': 'tratamientos',
    'clientes': 'clientes',
    'configuracion': 'usuarios'
  };
  
  const requiredPermission = pagePermissions[pageId];
  if (!requiredPermission) return true;
  
  return window.authManager?.hasPermission(requiredPermission);
}

function handleLogout() {
  if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
    // Mostrar notificación de logout si está disponible
    if (window.notificationManager) {
      window.notificationManager.info('Cerrando sesión...', 2000);
    }
    
    // Logout después de un pequeño delay para mostrar la notificación
    setTimeout(() => {
      if (window.authManager) {
        window.authManager.logout();
      } else {
        window.location.href = '/login.html';
      }
    }, 500);
  }
}

// ==========================================
// MENÚ MÓVIL Y COLAPSABLE
// ==========================================

function setupMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.add('mobile-closed');
  }
}

function toggleMobileMenu() {
  if (mobileMenuOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function openMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.getElementById('mobile-menu-toggle');
  
  if (sidebar && toggle) {
    createSidebarOverlay();
    
    sidebar.classList.add('mobile-open');
    toggle.classList.add('active');
    
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }
    
    mobileMenuOpen = true;
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.getElementById('mobile-menu-toggle');
  
  if (sidebar && toggle) {
    sidebar.classList.remove('mobile-open');
    toggle.classList.remove('active');
    
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    
    mobileMenuOpen = false;
    document.body.style.overflow = '';
  }
}

function toggleMenuCollapse() {
  menuCollapsed = !menuCollapsed;
  localStorage.setItem('menuCollapsed', menuCollapsed);
  applyMenuCollapsedState();
  
  if (window.notificationManager) {
    const mensaje = menuCollapsed ? 'Menú colapsado' : 'Menú expandido';
    window.notificationManager.info(mensaje, 1500);
  }
}

function applyMenuCollapsedState() {
  const sidebar = document.querySelector('.sidebar');
  const collapseToggle = document.getElementById('collapse-toggle');
  const mainContent = document.querySelector('.main-content-wrapper');
  
  if (sidebar) {
    if (menuCollapsed) {
      sidebar.classList.add('collapsed');
      if (collapseToggle) {
        collapseToggle.title = 'Expandir menú';
        collapseToggle.querySelector('.toggle-icon').textContent = '➡️';
      }
    } else {
      sidebar.classList.remove('collapsed');
      if (collapseToggle) {
        collapseToggle.title = 'Colapsar menú';
        collapseToggle.querySelector('.toggle-icon').textContent = '⬅️';
      }
    }
  }
  
  // Ajustar el contenido principal si existe
  if (mainContent) {
    if (menuCollapsed) {
      mainContent.style.marginLeft = '80px';
    } else {
      mainContent.style.marginLeft = '280px';
    }
  }
}

// ==========================================
// UTILIDADES
// ==========================================

function getCurrentPage() {
  const path = window.location.pathname;
  const filename = path.split('/').pop().replace('.html', '') || 'index';
  
  // Mapear nombres de archivos a IDs
  const pageMap = {
    'index': 'dashboard',
    'arboles': 'arboles',
    'produccion': 'produccion',
    'ventas': 'ventas',
    'gastos': 'gastos',
    'precios': 'precios',
    'clima': 'clima',
    'riego': 'riego',
    'tratamientos': 'tratamientos',
    'clientes': 'clientes',
    'negocios': 'negocios',
    'recordatorios': 'recordatorios',
    'configuracion': 'configuracion'
  };
  
  return pageMap[filename] || filename;
}

function updateActiveMenuItem() {
  // Remover active de todos los elementos
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Agregar active al elemento actual
  const activeItem = document.querySelector(`[data-page="${currentPage}"]`)?.closest('.nav-item');
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

function requiresOnline(pageId) {
  const onlineRequired = ['clima', 'precios', 'negocios'];
  return onlineRequired.includes(pageId);
}

function updateNavigation() {
  createNavigation();
  setupEventListeners();
  updateActiveMenuItem();
  applyMenuCollapsedState();
}

function handleConnectionChange(isOnline) {
  isOffline = !isOnline;
  
  // Actualizar indicador de estado
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.querySelector('.status-text');
  const onlineBadge = document.querySelector('.online-badge');
  const offlineBadge = document.querySelector('.offline-badge');
  
  if (statusIndicator && statusText) {
    statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
    statusText.textContent = isOnline ? 'Conectado' : 'Sin conexión';
  }
  
  // Actualizar badge del usuario
  if (onlineBadge && offlineBadge) {
    onlineBadge.style.display = isOnline ? 'block' : 'none';
    offlineBadge.style.display = isOnline ? 'none' : 'block';
  }
  
  // Mostrar/ocultar indicadores offline en menú
  updateOfflineIndicators();
  
  // Mostrar sincronización si vuelve la conexión
  if (isOnline) {
    showSyncIndicator();
    if (window.notificationManager) {
      window.notificationManager.success('Conexión restaurada - Sincronizando datos...', 3000);
    }
    setTimeout(() => hideSyncIndicator(), 3000);
  } else {
    if (window.notificationManager) {
      window.notificationManager.warning('Sin conexión a internet - Trabajando en modo offline', 4000);
    }
  }
}

function updateOfflineIndicators() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const pageId = link.dataset.page;
    const offlineIndicator = link.querySelector('.offline-indicator');
    
    if (isOffline && requiresOnline(pageId)) {
      if (!offlineIndicator) {
        link.insertAdjacentHTML('beforeend', '<span class="offline-indicator">⚡</span>');
      }
    } else if (offlineIndicator) {
      offlineIndicator.remove();
    }
  });
}

function showSyncIndicator() {
  const indicator = document.getElementById('sync-indicator');
  if (indicator) {
    indicator.style.display = 'flex';
  }
}

function hideSyncIndicator() {
  const indicator = document.getElementById('sync-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

function showOfflineMessage(pageId) {
  const mensaje = `La sección "${pageId}" requiere conexión a internet para funcionar correctamente.`;
  if (window.notificationManager) {
    window.notificationManager.warning(mensaje, 5000);
  } else {
    alert(mensaje);
  }
}

function showPermissionError(pageId) {
  const mensaje = `No tienes permisos para acceder a la sección "${pageId}".`;
  if (window.notificationManager) {
    window.notificationManager.error(mensaje, 5000);
  } else {
    alert(mensaje);
  }
}

function showPageLoading(navLink) {
  navLink.style.opacity = '0.6';
  setTimeout(() => {
    navLink.style.opacity = '1';
  }, 300);
}

// ==========================================
// ESTILOS DE NAVEGACIÓN
// ==========================================

function addNavigationStyles() {
  const styles = `
    <style>
      /* Variables CSS mejoradas */
      :root {
        --sidebar-width: 280px;
        --sidebar-collapsed-width: 70px;
        --sidebar-bg: #ffffff;
        --sidebar-border: #e9ecef;
        --sidebar-shadow: 0 4px 25px rgba(0, 0, 0, 0.1);
        --primary-green: #2d5016;
        --primary-light: #4a7c59;
        --accent-yellow: #f4d03f;
        --text-primary: #2c3e50;
        --text-secondary: #6c757d;
        --hover-bg: #f8f9fa;
        --active-bg: linear-gradient(135deg, #2d5016 0%, #4a7c59 100%);
      }

      /* Sidebar principal mejorado */
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: var(--sidebar-width);
        background: var(--sidebar-bg);
        color: var(--text-primary);
        display: flex;
        flex-direction: column;
        z-index: 1000;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: var(--sidebar-shadow);
        border-right: 1px solid var(--sidebar-border);
        backdrop-filter: blur(10px);
      }

      .sidebar.collapsed {
        width: var(--sidebar-collapsed-width);
      }

      /* Header del usuario mejorado */
      .nav-header {
        padding: 2rem 1.5rem 1.5rem;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-bottom: 1px solid var(--sidebar-border);
        position: relative;
      }

      .nav-header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 1.5rem;
        right: 1.5rem;
        height: 3px;
        background: var(--active-bg);
        border-radius: 2px;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .user-avatar {
        position: relative;
        width: 50px;
        height: 50px;
        background: var(--active-bg);
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: white;
        font-size: 1.25rem;
        flex-shrink: 0;
        box-shadow: 0 4px 15px rgba(45, 80, 22, 0.3);
      }

      .avatar-text {
        font-size: 1.25rem;
        font-weight: 700;
      }

      .online-badge, .offline-badge {
        position: absolute;
        bottom: -3px;
        right: -3px;
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        border: 2px solid white;
      }

      .user-details {
        flex: 1;
        transition: all 0.3s ease;
        overflow: hidden;
      }

      .user-name {
        font-weight: 600;
        font-size: 1.1rem;
        margin-bottom: 4px;
        color: var(--text-primary);
        text-transform: capitalize;
      }

      .user-role {
        font-size: 0.85rem;
        color: var(--text-secondary);
        background: var(--hover-bg);
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        display: inline-block;
        text-transform: capitalize;
        font-weight: 500;
      }

      /* Botón colapsar mejorado */
      .collapse-toggle-container {
        display: flex;
        justify-content: center;
        padding: 1rem;
        background: #fafbfc;
        border-bottom: 1px solid var(--sidebar-border);
      }

      .collapse-toggle {
        background: white;
        border: 2px solid var(--sidebar-border);
        border-radius: 12px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1.1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .collapse-toggle:hover {
        background: var(--primary-green);
        color: white;
        border-color: var(--primary-green);
        transform: scale(1.1);
      }

      /* Menú de navegación mejorado */
      .nav-menu {
        flex: 1;
        list-style: none;
        padding: 1.5rem 1rem;
        margin: 0;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--sidebar-border) transparent;
      }

      .nav-menu::-webkit-scrollbar {
        width: 4px;
      }

      .nav-menu::-webkit-scrollbar-track {
        background: transparent;
      }

      .nav-menu::-webkit-scrollbar-thumb {
        background: var(--sidebar-border);
        border-radius: 2px;
      }

      .nav-item {
        margin-bottom: 0.5rem;
        position: relative;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
        color: var(--text-primary);
        text-decoration: none;
        border-radius: 15px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        font-weight: 500;
        background: transparent;
        border: 2px solid transparent;
      }

      .nav-link:hover {
        background: var(--hover-bg);
        color: var(--primary-green);
        transform: translateX(8px);
        border-color: rgba(45, 80, 22, 0.1);
        box-shadow: 0 4px 15px rgba(45, 80, 22, 0.1);
      }

      .nav-item.active .nav-link {
        background: var(--active-bg);
        color: white;
        transform: translateX(8px);
        box-shadow: 0 8px 25px rgba(45, 80, 22, 0.4);
        border-color: var(--primary-green);
      }

      .nav-item.active .nav-link::before {
        content: '';
        position: absolute;
        left: -1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 30px;
        background: var(--accent-yellow);
        border-radius: 2px;
      }

      .nav-icon {
        font-size: 1.4rem;
        width: 28px;
        text-align: center;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .nav-label {
        font-weight: 500;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        white-space: nowrap;
      }

      .offline-indicator {
        margin-left: auto;
        opacity: 0.6;
        font-size: 0.9rem;
        color: #ff6b6b;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }

      /* Footer mejorado */
      .nav-footer {
        padding: 1.5rem;
        background: #fafbfc;
        border-top: 1px solid var(--sidebar-border);
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        color: var(--text-secondary);
        padding: 0.75rem;
        background: white;
        border-radius: 12px;
        border: 1px solid var(--sidebar-border);
      }

      .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ff6b6b;
        flex-shrink: 0;
        position: relative;
      }

      .status-indicator.online {
        background: #51cf66;
      }

      .status-indicator.online::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: #51cf66;
        animation: ping 2s infinite;
      }

      @keyframes ping {
        75%, 100% {
          transform: scale(2);
          opacity: 0;
        }
      }

      .btn-logout {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        background: white;
        color: #dc3545;
        border: 2px solid #dc3545;
        border-radius: 12px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.3s ease;
        justify-content: center;
      }

      .btn-logout:hover {
        background: #dc3545;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
      }

      .logout-icon {
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      /* Estados colapsado mejorados */
      .sidebar.collapsed .nav-label,
      .sidebar.collapsed .user-details,
      .sidebar.collapsed .status-text,
      .sidebar.collapsed .logout-text {
        opacity: 0;
        visibility: hidden;
      }

      .sidebar.collapsed .nav-link {
        justify-content: center;
        padding: 1rem;
      }

      .sidebar.collapsed .connection-status,
      .sidebar.collapsed .btn-logout {
        justify-content: center;
      }

      .sidebar.collapsed .user-info {
        justify-content: center;
      }

      .sidebar.collapsed .nav-item.active .nav-link::before {
        display: none;
      }

      /* Tooltips mejorados */
      .sidebar.collapsed .nav-link {
        position: relative;
      }

      .sidebar.collapsed .nav-link:hover::after {
        content: attr(title);
        position: absolute;
        left: calc(100% + 15px);
        top: 50%;
        transform: translateY(-50%);
        background: var(--text-primary);
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.85rem;
        white-space: nowrap;
        z-index: 1002;
        pointer-events: none;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      }

      .sidebar.collapsed .nav-link:hover::before {
        content: '';
        position: absolute;
        left: calc(100% + 7px);
        top: 50%;
        transform: translateY(-50%);
        border: 8px solid transparent;
        border-right-color: var(--text-primary);
        z-index: 1002;
      }

      /* Indicador de sincronización */
      .sync-indicator {
        position: absolute;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(45, 80, 22, 0.9);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.8rem;
        display: none;
        align-items: center;
        gap: 0.5rem;
        z-index: 1001;
        backdrop-filter: blur(10px);
      }

      .sync-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Overlay para móviles */
      .sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .sidebar-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      /* Mobile mejorado */
      @media (max-width: 768px) {
        .mobile-menu-toggle {
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1001;
          background: var(--active-bg);
          color: white;
          border: none;
          border-radius: 12px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(45, 80, 22, 0.4);
          transition: all 0.3s ease;
        }

        .mobile-menu-toggle:hover {
          transform: scale(1.1);
        }

        .hamburger-icon {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .hamburger-icon span {
          width: 20px;
          height: 3px;
          background: currentColor;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .mobile-menu-toggle.active .hamburger-icon span:nth-child(1) {
          transform: rotate(45deg) translate(6px, 6px);
        }

        .mobile-menu-toggle.active .hamburger-icon span:nth-child(2) {
          opacity: 0;
        }

        .mobile-menu-toggle.active .hamburger-icon span:nth-child(3) {
          transform: rotate(-45deg) translate(6px, -6px);
        }

        .sidebar {
          transform: translateX(-100%);
          width: var(--sidebar-width) !important;
          box-shadow: 4px 0 30px rgba(0, 0, 0, 0.3);
        }

        .sidebar.mobile-open {
          transform: translateX(0);
        }

        .collapse-toggle-container {
          display: none;
        }

        .nav-header {
          padding-top: 5rem;
        }

        .main-content-wrapper {
          margin-left: 0 !important;
          padding: 1rem;
          padding-top: 5rem;
        }
      }

      /* Ajustes del contenido principal */
      .main-content-wrapper {
        margin-left: var(--sidebar-width);
        transition: margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        min-height: 100vh;
      }

      .sidebar.collapsed ~ .main-content-wrapper {
        margin-left: var(--sidebar-collapsed-width);
      }
    </style>
  `;
  
  // Solo agregar si no existe
  if (!document.querySelector('#nav-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'nav-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
  }
}

function createSidebarOverlay() {
  if (!document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeMobileMenu);
    document.body.appendChild(overlay);
  }
}

function handleResize() {
  const sidebar = document.querySelector('.sidebar');
  
  if (window.innerWidth > 768) {
    if (mobileMenuOpen) {
      closeMobileMenu();
    }
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
    }
  } else {
    if (sidebar && !mobileMenuOpen) {
      sidebar.classList.remove('mobile-open');
    }
  }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar el gestor de navegación
  initNavigationManager();

  // Hacer funciones disponibles globalmente
  window.updateNavigation = updateNavigation;
  window.toggleMenuCollapse = toggleMenuCollapse;
  window.getMenuConfiguration = getMenuConfiguration;

  console.log('Sistema de navegación inicializado');
});