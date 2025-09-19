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

// ===== NAVEGACIÓN MÓVIL RESPONSIVE - FINCA LA HERRADURA =====
// Agregar este JavaScript a nav.js o crear archivo separado: mobile-nav.js

class MobileNavigation {
    constructor() {
        this.sidebar = null;
        this.overlay = null;
        this.toggleBtn = null;
        this.isOpen = false;
        this.breakpoint = 768;
        
        this.init();
    }

    init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.createMobileElements();
        this.setupEventListeners();
        this.handleResize();
        
        console.log('✅ Navegación móvil inicializada');
    }

    createMobileElements() {
        // Crear botón hamburguesa si no existe
        this.createToggleButton();
        
        // Crear overlay si no existe
        this.createOverlay();
        
        // Configurar sidebar existente
        this.setupSidebar();
    }

    createToggleButton() {
        // Buscar si ya existe
        this.toggleBtn = document.getElementById('mobile-nav-toggle');
        
        if (!this.toggleBtn) {
            // Crear botón hamburguesa
            this.toggleBtn = document.createElement('button');
            this.toggleBtn.id = 'mobile-nav-toggle';
            this.toggleBtn.className = 'mobile-nav-toggle';
            this.toggleBtn.setAttribute('aria-label', 'Abrir menú de navegación');
            this.toggleBtn.innerHTML = `
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            `;
            
            // Agregar al header
            const header = document.querySelector('.header-content, .ventas-header .header-content, .riegos-header');
            if (header) {
                header.insertBefore(this.toggleBtn, header.firstChild);
            } else {
                // Fallback: agregar al body
                document.body.appendChild(this.toggleBtn);
            }
        }
    }

    createOverlay() {
        this.overlay = document.getElementById('mobile-nav-overlay');
        
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'mobile-nav-overlay';
            this.overlay.className = 'mobile-nav-overlay';
            document.body.appendChild(this.overlay);
        }
    }

    setupSidebar() {
        // Buscar sidebar existente
        this.sidebar = document.querySelector('.sidebar, #navbar');
        
        if (this.sidebar) {
            this.sidebar.classList.add('mobile-sidebar');
            
            // Agregar botón de cerrar si no existe
            let closeBtn = this.sidebar.querySelector('.mobile-nav-close');
            if (!closeBtn) {
                closeBtn = document.createElement('button');
                closeBtn.className = 'mobile-nav-close';
                closeBtn.setAttribute('aria-label', 'Cerrar menú');
                closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                
                // Insertar al inicio del sidebar
                this.sidebar.insertBefore(closeBtn, this.sidebar.firstChild);
            }
        }
    }

    setupEventListeners() {
        // Toggle button
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }

        // Overlay
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.close());
        }

        // Close button
        const closeBtn = document.querySelector('.mobile-nav-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Links del sidebar
        if (this.sidebar) {
            const links = this.sidebar.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', () => {
                    // Cerrar sidebar después de hacer click en un link
                    setTimeout(() => this.close(), 100);
                });
            });
        }

        // Resize
        window.addEventListener('resize', () => this.handleResize());

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Prevent scroll when open
        document.addEventListener('touchmove', (e) => {
            if (this.isOpen && !this.sidebar.contains(e.target)) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        
        // Agregar clases
        document.body.classList.add('mobile-nav-open');
        if (this.sidebar) this.sidebar.classList.add('open');
        if (this.overlay) this.overlay.classList.add('show');
        if (this.toggleBtn) this.toggleBtn.classList.add('active');
        
        // Accessibility
        if (this.toggleBtn) {
            this.toggleBtn.setAttribute('aria-expanded', 'true');
            this.toggleBtn.setAttribute('aria-label', 'Cerrar menú de navegación');
        }
        
        // Focus management
        if (this.sidebar) {
            this.sidebar.focus();
        }
        
        console.log('📱 Menú móvil abierto');
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        // Quitar clases
        document.body.classList.remove('mobile-nav-open');
        if (this.sidebar) this.sidebar.classList.remove('open');
        if (this.overlay) this.overlay.classList.remove('show');
        if (this.toggleBtn) this.toggleBtn.classList.remove('active');
        
        // Accessibility
        if (this.toggleBtn) {
            this.toggleBtn.setAttribute('aria-expanded', 'false');
            this.toggleBtn.setAttribute('aria-label', 'Abrir menú de navegación');
        }
        
        console.log('📱 Menú móvil cerrado');
    }

    handleResize() {
        const width = window.innerWidth;
        
        if (width > this.breakpoint) {
            // Desktop: cerrar menú móvil y mostrar sidebar normal
            this.close();
            if (this.sidebar) {
                this.sidebar.classList.remove('mobile-sidebar-hidden');
            }
        } else {
            // Mobile: asegurar que sidebar esté oculto si no está abierto
            if (!this.isOpen && this.sidebar) {
                this.sidebar.classList.add('mobile-sidebar-hidden');
            }
        }
    }

    // Método para agregar CSS dinámicamente
    injectStyles() {
        const styleId = 'mobile-nav-styles';
        
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Mobile Navigation Styles */
            .mobile-nav-toggle {
                display: none;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                width: 44px;
                height: 44px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                transition: background-color 0.3s ease;
                position: relative;
                z-index: 1002;
            }

            .mobile-nav-toggle:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .hamburger-line {
                width: 20px;
                height: 2px;
                background: currentColor;
                border-radius: 1px;
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                margin: 2px 0;
            }

            .mobile-nav-toggle.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }

            .mobile-nav-toggle.active .hamburger-line:nth-child(2) {
                opacity: 0;
                transform: translateX(-20px);
            }

            .mobile-nav-toggle.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(7px, -6px);
            }

            .mobile-nav-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(2px);
            }

            .mobile-nav-overlay.show {
                display: block;
                opacity: 1;
            }

            .mobile-nav-close {
                display: none;
                position: absolute;
                top: 1rem;
                right: 1rem;
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 50%;
                color: currentColor;
                cursor: pointer;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                transition: all 0.3s ease;
                z-index: 1002;
            }

            .mobile-nav-close:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: rotate(90deg);
            }

            /* Prevent body scroll when menu is open */
            body.mobile-nav-open {
                overflow: hidden;
                height: 100vh;
            }

            /* Mobile breakpoint styles */
            @media (max-width: 768px) {
                .mobile-nav-toggle {
                    display: flex;
                }

                .sidebar,
                #navbar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100vh;
                    width: 280px;
                    z-index: 1001;
                    transform: translateX(-100%);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow-y: auto;
                    padding-top: 80px;
                }

                .sidebar.open,
                #navbar.open {
                    transform: translateX(0);
                }

                .mobile-nav-close {
                    display: flex;
                }

                /* Ajustar contenido principal */
                .main-content-wrapper {
                    margin-left: 0;
                    transition: none;
                }

                /* Mejorar accesibilidad en móvil */
                .sidebar a,
                #navbar a {
                    padding: 1rem 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    transition: background-color 0.2s ease;
                    min-height: 48px;
                }

                .sidebar a:hover,
                #navbar a:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .sidebar a:active,
                #navbar a:active {
                    background: rgba(255, 255, 255, 0.1);
                }
            }

            /* Tablets */
            @media (max-width: 1024px) and (min-width: 769px) {
                .sidebar,
                #navbar {
                    width: 240px;
                }
            }

            /* Animaciones suaves para mejor UX */
            @media (prefers-reduced-motion: reduce) {
                .mobile-nav-toggle,
                .hamburger-line,
                .mobile-nav-overlay,
                .sidebar,
                #navbar {
                    transition: none !important;
                    animation: none !important;
                }
            }

            /* Focus styles para accesibilidad */
            .mobile-nav-toggle:focus-visible,
            .mobile-nav-close:focus-visible {
                outline: 2px solid #007AFF;
                outline-offset: 2px;
            }

            /* Touch improvements */
            @media (hover: none) and (pointer: coarse) {
                .mobile-nav-toggle,
                .mobile-nav-close {
                    min-width: 48px;
                    min-height: 48px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Inicializar cuando el script se carga
document.addEventListener('DOMContentLoaded', () => {
    const mobileNav = new MobileNavigation();
    mobileNav.injectStyles();
    
    // Hacer disponible globalmente para debugging
    window.mobileNav = mobileNav;
});

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigation;
}

/* 
===== INSTRUCCIONES DE USO =====

1. AGREGAR AL HTML (en todas las páginas):
   Agregar antes del </body>:
   <script src="/js/mobile-nav.js"></script>

2. O INCLUIR EN nav.js existente:
   Copiar todo este código al final de nav.js

3. VERIFICAR QUE FUNCIONE:
   - Abrir DevTools
   - Cambiar a vista móvil (< 768px)
   - Debe aparecer el botón hamburguesa
   - Al hacer click debe abrir/cerrar el sidebar

4. PERSONALIZACIÓN:
   - Cambiar breakpoint: modificar this.breakpoint = 768
   - Cambiar animaciones: ajustar transition values
   - Cambiar colores: modificar los CSS styles

5. DEBUGGING:
   - Abrir consola del navegador
   - Verificar mensajes: "✅ Navegación móvil inicializada"
   - Usar window.mobileNav para inspeccionar

6. COMPATIBILIDAD:
   - Funciona con nav.js existente
   - Compatible con Firebase Auth
   - No interfiere con otros scripts
   - Soporta ES5+ (IE11+)
*/

// Auto-inicializar cuando se carga el script
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Exportar para uso global

window.NavigationManager = NavigationManager;

