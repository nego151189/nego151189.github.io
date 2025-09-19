/**
 * nav.js - Sistema de Navegación Inteligente
 * Finca La Herradura - Sistema de Gestión Inteligente
 * 
 * Funcionalidades:
 * - Sidebar responsive con colapso automático
 * - Detección automática de página activa
 * - Tema claro/oscuro
 * - Gestión de estado offline
 * - Notificaciones y badges dinámicos
 */

class NavigationManager {
    constructor() {
        this.sidebar = null;
        this.isInitialized = false;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.notifications = this.loadNotifications();
        
        this.init();
    }

    // Estructura de navegación - fácil de modificar
    getNavigationStructure() {
        return [
            {
                section: 'Principal',
                items: [
                    {
                        href: 'index.html',
                        icon: 'fas fa-home',
                        text: 'Dashboard',
                        badge: null
                    },
                    {
                        href: 'recordatorios.html',
                        icon: 'fas fa-bell',
                        text: 'Recordatorios',
                        badge: this.notifications.recordatorios || null
                    }
                ]
            },
            {
                section: 'Gestión de Cultivo',
                items: [
                    {
                        href: 'arboles.html',
                        icon: 'fas fa-tree',
                        text: 'Gestión de Árboles',
                        badge: null
                    },
                    {
                        href: 'produccion.html',
                        icon: 'fas fa-seedling',
                        text: 'Producción',
                        badge: null
                    },
                    {
                        href: 'riegos.html',
                        icon: 'fas fa-tint',
                        text: 'Sistema de Riegos',
                        badge: null
                    },
                    {
                        href: 'tratamientos.html',
                        icon: 'fas fa-stethoscope',
                        text: 'Tratamientos',
                        badge: this.notifications.tratamientos || null
                    }
                ]
            },
            {
                section: 'Comercial',
                items: [
                    {
                        href: 'ventas.html',
                        icon: 'fas fa-shopping-cart',
                        text: 'Ventas',
                        badge: null
                    },
                    {
                        href: 'precios.html',
                        icon: 'fas fa-tags',
                        text: 'Precios MAGA',
                        badge: null
                    },
                    {
                        href: 'gastos.html',
                        icon: 'fas fa-receipt',
                        text: 'Gastos',
                        badge: null
                    },
                    {
                        href: 'negocios.html',
                        icon: 'fas fa-handshake',
                        text: 'Negocios',
                        badge: null
                    }
                ]
            },
            {
                section: 'Análisis',
                items: [
                    {
                        href: 'clima.html',
                        icon: 'fas fa-cloud-sun',
                        text: 'Clima',
                        badge: null
                    },
                    {
                        href: '#reportes',
                        icon: 'fas fa-chart-line',
                        text: 'Reportes',
                        badge: null
                    },
                    {
                        href: '#ia-insights',
                        icon: 'fas fa-robot',
                        text: 'IA Insights',
                        badge: this.notifications.ia || null
                    }
                ]
            }
        ];
    }

    // CSS para el sidebar
    getSidebarCSS() {
        return `
        /* Variables CSS para el sistema de navegación */
        :root {
            --sidebar-width: 280px;
            --sidebar-collapsed-width: 70px;
            --primary-green: #22c55e;
            --primary-dark: #16a34a;
            --secondary: #64748b;
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-hover: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --border: #e2e8f0;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-theme="dark"] {
            --bg-primary: #1e293b;
            --bg-secondary: #0f172a;
            --bg-hover: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --border: #334155;
        }

        /* Sidebar principal */
        .nav-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: var(--sidebar-width);
            height: 100vh;
            background: var(--bg-primary);
            border-right: 1px solid var(--border);
            z-index: 1000;
            transform: translateX(0);
            transition: var(--transition);
            box-shadow: var(--shadow);
            display: flex;
            flex-direction: column;
        }

        .nav-sidebar.collapsed {
            width: var(--sidebar-collapsed-width);
        }

        .nav-sidebar.mobile-hidden {
            transform: translateX(-100%);
        }

        /* Header del sidebar */
        .nav-sidebar-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 1rem;
            min-height: 80px;
        }

        .nav-logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--primary-green), var(--primary-dark));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            font-weight: 700;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }

        .nav-logo-text {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: var(--transition);
        }

        .nav-sidebar.collapsed .nav-logo-text {
            opacity: 0;
            width: 0;
        }

        .nav-logo-title {
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--text-primary);
            line-height: 1.2;
        }

        .nav-logo-subtitle {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        /* Navigation */
        .nav-sidebar-nav {
            flex: 1;
            padding: 1rem 0;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .nav-nav-section {
            margin-bottom: 2rem;
        }

        .nav-section-title {
            padding: 0 1.5rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: var(--transition);
        }

        .nav-sidebar.collapsed .nav-section-title {
            opacity: 0;
            padding: 0;
            margin: 0;
            height: 0;
        }

        .nav-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .nav-item {
            margin-bottom: 0.25rem;
        }

        .nav-link {
            display: flex;
            align-items: center;
            padding: 0.75rem 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            transition: var(--transition);
            position: relative;
            border-radius: 0;
            margin: 0 0.75rem;
            border-radius: 8px;
        }

        .nav-link:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .nav-link.active {
            background: rgba(34, 197, 94, 0.1);
            color: var(--primary-green);
            font-weight: 600;
        }

        .nav-link.active::before {
            content: '';
            position: absolute;
            left: -0.75rem;
            top: 0;
            bottom: 0;
            width: 3px;
            background: var(--primary-green);
            border-radius: 0 2px 2px 0;
        }

        .nav-icon {
            width: 20px;
            height: 20px;
            margin-right: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 1.125rem;
        }

        .nav-text {
            flex: 1;
            transition: var(--transition);
            white-space: nowrap;
            overflow: hidden;
        }

        .nav-sidebar.collapsed .nav-text {
            opacity: 0;
            width: 0;
            margin: 0;
        }

        .nav-badge {
            background: var(--primary-green);
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.125rem 0.5rem;
            border-radius: 10px;
            min-width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition);
        }

        .nav-sidebar.collapsed .nav-badge {
            opacity: 0;
            width: 0;
        }

        /* Footer del sidebar */
        .nav-sidebar-footer {
            padding: 1rem;
            border-top: 1px solid var(--border);
        }

        .nav-user-profile {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border-radius: 12px;
            background: var(--bg-secondary);
            cursor: pointer;
            transition: var(--transition);
        }

        .nav-user-profile:hover {
            background: var(--bg-hover);
        }

        .nav-user-avatar {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, var(--primary-green), var(--primary-dark));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            flex-shrink: 0;
        }

        .nav-user-info {
            flex: 1;
            overflow: hidden;
            transition: var(--transition);
        }

        .nav-sidebar.collapsed .nav-user-info {
            opacity: 0;
            width: 0;
        }

        .nav-user-name {
            font-weight: 600;
            font-size: 0.875rem;
            color: var(--text-primary);
            line-height: 1.2;
        }

        .nav-user-role {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        /* Controls */
        .nav-sidebar-controls {
            position: absolute;
            top: 1rem;
            right: -15px;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .nav-control-btn {
            width: 30px;
            height: 30px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: var(--transition);
            box-shadow: var(--shadow);
            color: var(--text-secondary);
        }

        .nav-control-btn:hover {
            background: var(--primary-green);
            color: white;
            border-color: var(--primary-green);
        }

        /* Mobile overlay */
        .nav-sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: none;
            opacity: 0;
            transition: var(--transition);
        }

        .nav-sidebar-overlay.active {
            display: block;
            opacity: 1;
        }

        /* Mobile hamburger */
        .nav-mobile-menu-btn {
            display: none;
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 1001;
            width: 44px;
            height: 44px;
            background: var(--primary-green);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            box-shadow: var(--shadow);
        }

        /* Responsive */
        @media (max-width: 1024px) {
            .nav-sidebar {
                width: var(--sidebar-collapsed-width);
            }
            
            .nav-sidebar .nav-text,
            .nav-sidebar .nav-logo-text,
            .nav-sidebar .nav-section-title,
            .nav-sidebar .nav-user-info,
            .nav-sidebar .nav-badge {
                opacity: 0;
                width: 0;
            }
        }

        @media (max-width: 768px) {
            .nav-mobile-menu-btn {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .nav-sidebar {
                transform: translateX(-100%);
                width: var(--sidebar-width);
            }
            
            .nav-sidebar.mobile-visible {
                transform: translateX(0);
            }
            
            .nav-sidebar.mobile-visible .nav-text,
            .nav-sidebar.mobile-visible .nav-logo-text,
            .nav-sidebar.mobile-visible .nav-section-title,
            .nav-sidebar.mobile-visible .nav-user-info,
            .nav-sidebar.mobile-visible .nav-badge {
                opacity: 1;
                width: auto;
            }
        }
        `;
    }

    // Inicialización
    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.waitForDOM();
            this.injectStyles();
            this.createSidebar();
            this.setupEventListeners();
            this.setActiveLink();
            this.applyTheme();
            this.adjustMainContent();
            
            this.isInitialized = true;
            console.log('✅ Navigation system initialized');
        } catch (error) {
            console.error('❌ Error initializing navigation:', error);
        }
    }

    // Esperar a que el DOM esté listo
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // Inyectar estilos CSS
    injectStyles() {
        const styleId = 'nav-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = this.getSidebarCSS();
        document.head.appendChild(style);
    }

    // Crear estructura del sidebar
    createSidebar() {
        // Remover sidebar existente
        const existingSidebar = document.getElementById('navbar') || document.querySelector('.nav-sidebar');
        if (existingSidebar) {
            existingSidebar.remove();
        }

        // Crear elementos principales
        const mobileBtn = document.createElement('button');
        mobileBtn.className = 'nav-mobile-menu-btn';
        mobileBtn.id = 'navMobileMenuBtn';
        mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';

        const overlay = document.createElement('div');
        overlay.className = 'nav-sidebar-overlay';
        overlay.id = 'navSidebarOverlay';

        const sidebar = document.createElement('aside');
        sidebar.className = 'nav-sidebar';
        sidebar.id = 'navSidebar';

        // Crear contenido del sidebar
        sidebar.innerHTML = this.generateSidebarHTML();

        // Insertar en el DOM
        document.body.insertBefore(mobileBtn, document.body.firstChild);
        document.body.insertBefore(overlay, document.body.firstChild);
        document.body.insertBefore(sidebar, document.body.firstChild);

        this.sidebar = sidebar;
        this.overlay = overlay;
        this.mobileBtn = mobileBtn;
    }

    // Generar HTML del sidebar
    generateSidebarHTML() {
        const navigation = this.getNavigationStructure();
        
        let sectionsHTML = navigation.map(section => `
            <div class="nav-nav-section">
                <div class="nav-section-title">${section.section}</div>
                <ul class="nav-list">
                    ${section.items.map(item => `
                        <li class="nav-item">
                            <a href="${item.href}" class="nav-link">
                                <div class="nav-icon"><i class="${item.icon}"></i></div>
                                <span class="nav-text">${item.text}</span>
                                ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');

        return `
            <!-- Sidebar Controls -->
            <div class="nav-sidebar-controls">
                <button class="nav-control-btn" id="navToggleSidebar" title="Contraer/Expandir">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="nav-control-btn" id="navThemeToggle" title="Cambiar tema">
                    <i class="fas fa-moon"></i>
                </button>
            </div>

            <!-- Header -->
            <div class="nav-sidebar-header">
                <div class="nav-logo">
                    <i class="fas fa-lemon"></i>
                </div>
                <div class="nav-logo-text">
                    <div class="nav-logo-title">Finca La Herradura</div>
                    <div class="nav-logo-subtitle">Sistema Inteligente</div>
                </div>
            </div>

            <!-- Navigation -->
            <nav class="nav-sidebar-nav">
                ${sectionsHTML}
            </nav>

            <!-- Footer -->
            <div class="nav-sidebar-footer">
                <div class="nav-user-profile" id="navUserProfile">
                    <div class="nav-user-avatar">${this.getUserInitials()}</div>
                    <div class="nav-user-info">
                        <div class="nav-user-name">${this.getUserName()}</div>
                        <div class="nav-user-role">Gestor Principal</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Event listeners
    setupEventListeners() {
        // Toggle collapse
        const toggleBtn = document.getElementById('navToggleSidebar');
        toggleBtn?.addEventListener('click', () => this.toggleCollapse());
        
        // Mobile menu
        this.mobileBtn?.addEventListener('click', () => this.toggleMobile());
        this.overlay?.addEventListener('click', () => this.closeMobile());
        
        // Theme toggle
        const themeBtn = document.getElementById('navThemeToggle');
        themeBtn?.addEventListener('click', () => this.toggleTheme());
        
        // Close mobile menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeMobile();
                }
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // User profile click
        const userProfile = document.getElementById('navUserProfile');
        userProfile?.addEventListener('click', () => this.showUserMenu());
    }

    // Toggle collapse
    toggleCollapse() {
        this.sidebar.classList.toggle('collapsed');
        const icon = document.querySelector('#navToggleSidebar i');
        if (this.sidebar.classList.contains('collapsed')) {
            icon.className = 'fas fa-chevron-right';
            localStorage.setItem('sidebar-collapsed', 'true');
        } else {
            icon.className = 'fas fa-chevron-left';
            localStorage.setItem('sidebar-collapsed', 'false');
        }
    }

    // Toggle mobile
    toggleMobile() {
        this.sidebar.classList.toggle('mobile-visible');
        this.overlay.classList.toggle('active');
        document.body.style.overflow = this.sidebar.classList.contains('mobile-visible') ? 'hidden' : '';
    }

    // Close mobile
    closeMobile() {
        this.sidebar.classList.remove('mobile-visible');
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Handle resize
    handleResize() {
        if (window.innerWidth > 768) {
            this.closeMobile();
        }
    }

    // Set active link
    setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPage || 
                (currentPage === '' && link.getAttribute('href') === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    // Theme management
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.currentTheme);
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        const icon = document.querySelector('#navThemeToggle i');
        if (icon) {
            icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Adjust main content
    adjustMainContent() {
        // Buscar el contenedor principal
        const mainContent = document.querySelector('.main-content-wrapper') || 
                          document.querySelector('.main-content') ||
                          document.querySelector('main');
        
        if (mainContent && !mainContent.style.marginLeft) {
            mainContent.style.marginLeft = 'var(--sidebar-width)';
            mainContent.style.transition = 'var(--transition)';
        }

        // Aplicar estado colapsado guardado
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed && window.innerWidth > 1024) {
            this.sidebar.classList.add('collapsed');
            const icon = document.querySelector('#navToggleSidebar i');
            if (icon) icon.className = 'fas fa-chevron-right';
        }
    }

    // User utilities
    getUserName() {
        // Intentar obtener del authManager o Firebase
        if (window.authManager && window.authManager.currentUser) {
            return window.authManager.currentUser.displayName || 'Administrador';
        }
        if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
            return window.firebase.auth().currentUser.displayName || 'Administrador';
        }
        return 'Administrador';
    }

    getUserInitials() {
        const name = this.getUserName();
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    showUserMenu() {
        // Mostrar menú de usuario (implementar según necesidad)
        console.log('User menu clicked');
    }

    // Notifications management
    loadNotifications() {
        return {
            recordatorios: 3,
            tratamientos: 1,
            ia: 2
        };
    }

    updateNotifications(newNotifications) {
        this.notifications = { ...this.notifications, ...newNotifications };
        this.updateBadges();
    }

    updateBadges() {
        // Actualizar badges dinámicamente
        const badgeMap = {
            'recordatorios.html': this.notifications.recordatorios,
            'tratamientos.html': this.notifications.tratamientos,
            '#ia-insights': this.notifications.ia
        };

        Object.entries(badgeMap).forEach(([href, count]) => {
            const link = document.querySelector(`[href="${href}"]`);
            if (link) {
                let badge = link.querySelector('.nav-badge');
                if (count > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'nav-badge';
                        link.appendChild(badge);
                    }
                    badge.textContent = count;
                } else if (badge) {
                    badge.remove();
                }
            }
        });
    }

    // Public API
    collapse() {
        if (!this.sidebar.classList.contains('collapsed')) {
            this.toggleCollapse();
        }
    }

    expand() {
        if (this.sidebar.classList.contains('collapsed')) {
            this.toggleCollapse();
        }
    }

    setUser(name, role, avatar) {
        const userName = document.querySelector('.nav-user-name');
        const userRole = document.querySelector('.nav-user-role');
        const userAvatar = document.querySelector('.nav-user-avatar');
        
        if (userName) userName.textContent = name;
        if (userRole) userRole.textContent = role;
        if (userAvatar) userAvatar.textContent = avatar || this.getUserInitials();
    }
}



// Auto-inicializar cuando se carga el script
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Exportar para uso global

window.NavigationManager = NavigationManager;
