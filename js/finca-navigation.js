/* ========================================
   SISTEMA DE NAVEGACIÓN UNIFICADO
   Reemplaza nav.js y mobile-nav.js completamente
   Soluciona todos los conflictos
   ======================================== */

(function() {
    'use strict';

    // Configuración
    const config = {
        sidebarWidth: '280px',
        sidebarCollapsedWidth: '60px',
        breakpoint: 768,
        animationDuration: 300
    };

    // Estado global
    let navigationState = {
        isInitialized: false,
        isMobileMenuOpen: false,
        currentPage: window.location.pathname
    };

    // Inyectar CSS completo para navegación
    function injectNavigationCSS() {
        if (document.getElementById('navigation-complete-css')) return;

        const style = document.createElement('style');
        style.id = 'navigation-complete-css';
        style.textContent = `
            /* Variables CSS actualizadas */
            :root {
                --sidebar-width: ${config.sidebarWidth};
                --sidebar-collapsed-width: ${config.sidebarCollapsedWidth};
                --header-height: 80px;
                --primary-green: #2d5016;
                --primary-light: #4a7c59;
                --accent-yellow: #f4d03f;
                --white: #ffffff;
                --light-gray: #f8f9fa;
                --dark-gray: #343a40;
                --border: #e2e8f0;
                --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
                --shadow-md: 0 4px 8px rgba(0,0,0,0.15);
                --transition-normal: 0.3s ease;
            }

            /* Layout principal */
            body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            /* Header fijo */
            .finca-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: var(--header-height);
                background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-light) 100%);
                z-index: 1000;
                display: flex;
                align-items: center;
                padding: 0 2rem;
                box-shadow: var(--shadow-md);
                transition: all var(--transition-normal);
            }

            .finca-logo {
                display: flex;
                align-items: center;
                gap: 1rem;
                color: var(--white);
                font-size: 1.25rem;
                font-weight: 700;
                text-decoration: none;
            }

            .finca-logo-icon {
                width: 40px;
                height: 40px;
                background: var(--accent-yellow);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
            }

            /* Sidebar */
            .finca-sidebar {
                position: fixed;
                top: var(--header-height);
                left: 0;
                width: var(--sidebar-width);
                height: calc(100vh - var(--header-height));
                background: var(--white);
                border-right: 1px solid var(--border);
                z-index: 999;
                overflow-y: auto;
                transition: transform var(--transition-normal);
                box-shadow: var(--shadow-sm);
            }

            .finca-nav-menu {
                list-style: none;
                padding: 1rem 0;
                margin: 0;
            }

            .finca-nav-item {
                margin: 0;
            }

            .finca-nav-link {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.5rem;
                color: var(--dark-gray);
                text-decoration: none;
                transition: all 0.2s ease;
                border-left: 3px solid transparent;
                font-weight: 500;
            }

            .finca-nav-link:hover {
                background: var(--light-gray);
                color: var(--primary-green);
            }

            .finca-nav-link.active {
                background: linear-gradient(90deg, rgba(45, 80, 22, 0.1), transparent);
                color: var(--primary-green);
                border-left-color: var(--primary-green);
                font-weight: 600;
            }

            .finca-nav-icon {
                width: 20px;
                text-align: center;
                font-size: 1.1rem;
            }

            /* Contenido principal */
            .main-content-wrapper {
                margin-left: var(--sidebar-width);
                margin-top: var(--header-height);
                min-height: calc(100vh - var(--header-height));
                transition: margin-left var(--transition-normal);
                padding: 2rem;
            }

            /* Botón móvil */
            .finca-mobile-toggle {
                display: none;
                background: none;
                border: none;
                color: var(--white);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 6px;
                transition: background 0.2s ease;
                margin-right: 1rem;
            }

            .finca-mobile-toggle:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .finca-mobile-toggle.active {
                background: rgba(255, 255, 255, 0.2);
            }

            /* Overlay móvil */
            .finca-mobile-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 998;
                opacity: 0;
                transition: opacity var(--transition-normal);
            }

            .finca-mobile-overlay.active {
                display: block;
                opacity: 1;
            }

            /* Botón cerrar móvil */
            .finca-mobile-close {
                display: none;
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: rgba(0, 0, 0, 0.1);
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                color: var(--dark-gray);
                transition: all 0.2s ease;
            }

            .finca-mobile-close:hover {
                background: rgba(0, 0, 0, 0.2);
                transform: rotate(90deg);
            }

            /* Responsive */
            @media (max-width: ${config.breakpoint}px) {
                .finca-mobile-toggle {
                    display: block;
                }

                .finca-sidebar {
                    transform: translateX(-100%);
                    top: 0;
                    height: 100vh;
                    z-index: 1001;
                }

                .finca-sidebar.mobile-open {
                    transform: translateX(0);
                }

                .finca-mobile-close {
                    display: flex;
                }

                .main-content-wrapper {
                    margin-left: 0;
                }

                .finca-nav-link {
                    padding: 1.25rem 1.5rem;
                    font-size: 1.1rem;
                    min-height: 56px;
                }
            }

            @media (max-width: 480px) {
                .finca-header {
                    padding: 0 1rem;
                }

                .main-content-wrapper {
                    padding: 1rem;
                }

                .finca-logo {
                    font-size: 1.1rem;
                }

                .finca-logo-icon {
                    width: 36px;
                    height: 36px;
                    font-size: 1.1rem;
                }
            }

            /* Prevenir scroll cuando menú móvil está abierto */
            body.finca-mobile-menu-open {
                overflow: hidden;
            }

            /* Animaciones */
            @keyframes slideIn {
                from {
                    transform: translateX(-100%);
                }
                to {
                    transform: translateX(0);
                }
            }

            .finca-sidebar.mobile-open {
                animation: slideIn 0.3s ease;
            }

            /* Estados de carga */
            .finca-nav-link.loading {
                opacity: 0.6;
                pointer-events: none;
            }

            /* Mejoras de accesibilidad */
            .finca-mobile-toggle:focus,
            .finca-mobile-close:focus,
            .finca-nav-link:focus {
                outline: 2px solid var(--accent-yellow);
                outline-offset: 2px;
            }

            @media (prefers-reduced-motion: reduce) {
                * {
                    transition: none !important;
                    animation: none !important;
                }
            }
        `;

        document.head.appendChild(style);
        console.log('✅ CSS de navegación inyectado');
    }

    // Crear estructura HTML del header
    function createHeader() {
        if (document.querySelector('.finca-header')) return;

        const header = document.createElement('header');
        header.className = 'finca-header';
        header.innerHTML = `
            <button class="finca-mobile-toggle" id="fincaMobileToggle" aria-label="Abrir menú">
                <i class="fas fa-bars"></i>
            </button>
            <a href="/" class="finca-logo">
                <div class="finca-logo-icon">🍋</div>
                <span>Finca La Herradura</span>
            </a>
        `;

        document.body.insertBefore(header, document.body.firstChild);
        console.log('✅ Header creado');
    }

    // Crear estructura HTML del sidebar
    function createSidebar() {
        if (document.querySelector('.finca-sidebar')) return;

        const menuItems = [
            { href: '/', icon: 'fas fa-tachometer-alt', text: 'Dashboard', id: 'dashboard' },
            { href: '/cosecha.html', icon: 'fas fa-seedling', text: 'Cosecha', id: 'cosecha' },
            { href: '/riegos.html', icon: 'fas fa-tint', text: 'Riegos', id: 'riegos' },
            { href: '/ventas.html', icon: 'fas fa-shopping-cart', text: 'Ventas', id: 'ventas' },
            { href: '/gastos.html', icon: 'fas fa-receipt', text: 'Gastos', id: 'gastos' },
            { href: '/arboles.html', icon: 'fas fa-tree', text: 'Árboles', id: 'arboles' },
            { href: '/clima.html', icon: 'fas fa-cloud-sun', text: 'Clima', id: 'clima' },
            { href: '/reportes.html', icon: 'fas fa-chart-bar', text: 'Reportes', id: 'reportes' }
        ];

        const sidebar = document.createElement('nav');
        sidebar.className = 'finca-sidebar';
        sidebar.id = 'fincaSidebar';

        const menuHTML = menuItems.map(item => {
            const isActive = isCurrentPage(item.href);
            return `
                <li class="finca-nav-item">
                    <a href="${item.href}" class="finca-nav-link ${isActive ? 'active' : ''}" data-page="${item.id}">
                        <i class="${item.icon} finca-nav-icon"></i>
                        <span>${item.text}</span>
                    </a>
                </li>
            `;
        }).join('');

        sidebar.innerHTML = `
            <button class="finca-mobile-close" id="fincaMobileClose" aria-label="Cerrar menú">
                <i class="fas fa-times"></i>
            </button>
            <ul class="finca-nav-menu">
                ${menuHTML}
            </ul>
        `;

        document.body.appendChild(sidebar);
        
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'finca-mobile-overlay';
        overlay.id = 'fincaMobileOverlay';
        document.body.appendChild(overlay);

        console.log('✅ Sidebar y overlay creados');
    }

    // Verificar si es la página actual
    function isCurrentPage(href) {
        const currentPath = window.location.pathname;
        const hrefPath = href === '/' ? '/' : href;
        
        return currentPath === hrefPath || 
               currentPath.includes(hrefPath.replace('.html', '')) ||
               (currentPath === '/' && href === '/') ||
               (currentPath.includes('index') && href === '/');
    }

    // Configurar event listeners
    function setupEventListeners() {
        const toggleBtn = document.getElementById('fincaMobileToggle');
        const closeBtn = document.getElementById('fincaMobileClose');
        const overlay = document.getElementById('fincaMobileOverlay');
        const sidebar = document.getElementById('fincaSidebar');

        if (!toggleBtn || !closeBtn || !overlay || !sidebar) {
            console.warn('⚠️ Elementos de navegación no encontrados');
            return;
        }

        // Abrir menú móvil
        toggleBtn.addEventListener('click', openMobileMenu);
        
        // Cerrar menú móvil
        closeBtn.addEventListener('click', closeMobileMenu);
        overlay.addEventListener('click', closeMobileMenu);

        // Cerrar menú al hacer click en enlaces
        sidebar.querySelectorAll('.finca-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                // Pequeño delay para permitir navegación
                setTimeout(closeMobileMenu, 100);
            });
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navigationState.isMobileMenuOpen) {
                closeMobileMenu();
            }
        });

        // Manejar cambio de tamaño
        window.addEventListener('resize', handleResize);

        console.log('✅ Event listeners configurados');
    }

    // Abrir menú móvil
    function openMobileMenu() {
        if (window.innerWidth > config.breakpoint) return;
        
        navigationState.isMobileMenuOpen = true;
        
        const sidebar = document.getElementById('fincaSidebar');
        const overlay = document.getElementById('fincaMobileOverlay');
        const toggleBtn = document.getElementById('fincaMobileToggle');

        if (sidebar) sidebar.classList.add('mobile-open');
        if (overlay) overlay.classList.add('active');
        if (toggleBtn) toggleBtn.classList.add('active');
        
        document.body.classList.add('finca-mobile-menu-open');
        
        console.log('📱 Menú móvil abierto');
    }

    // Cerrar menú móvil
    function closeMobileMenu() {
        navigationState.isMobileMenuOpen = false;
        
        const sidebar = document.getElementById('fincaSidebar');
        const overlay = document.getElementById('fincaMobileOverlay');
        const toggleBtn = document.getElementById('fincaMobileToggle');

        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
        if (toggleBtn) toggleBtn.classList.remove('active');
        
        document.body.classList.remove('finca-mobile-menu-open');
        
        console.log('📱 Menú móvil cerrado');
    }

    // Manejar cambio de tamaño de ventana
    function handleResize() {
        if (window.innerWidth > config.breakpoint && navigationState.isMobileMenuOpen) {
            closeMobileMenu();
        }
    }

    // Ajustar el main-content-wrapper si existe
    function adjustMainContent() {
        const mainContent = document.querySelector('.main-content-wrapper');
        if (mainContent && !mainContent.style.marginTop) {
            // Ya está siendo manejado por CSS
        }
    }

    // Inicialización principal
    function initializeNavigation() {
        if (navigationState.isInitialized) {
            console.log('⚠️ Navegación ya inicializada');
            return;
        }

        console.log('🚀 Inicializando sistema de navegación unificado...');

        try {
            // Inyectar CSS
            injectNavigationCSS();
            
            // Crear elementos HTML
            createHeader();
            createSidebar();
            adjustMainContent();
            
            // Configurar eventos
            setupEventListeners();
            
            navigationState.isInitialized = true;
            console.log('✅ Sistema de navegación inicializado exitosamente');
            
            // Disparar evento personalizado
            window.dispatchEvent(new CustomEvent('fincaNavigationReady', {
                detail: { timestamp: Date.now() }
            }));
            
        } catch (error) {
            console.error('❌ Error inicializando navegación:', error);
        }
    }

    // Función para actualizar página activa (útil para SPA)
    function updateActivePage(pagePath) {
        document.querySelectorAll('.finca-nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === pagePath || 
                link.getAttribute('href').includes(pagePath)) {
                link.classList.add('active');
            }
        });
    }

    // Auto-inicialización
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        // DOM ya cargado
        setTimeout(initializeNavigation, 100);
    }

    // Exposición global
    window.FincaNavigation = {
        initialize: initializeNavigation,
        openMobileMenu,
        closeMobileMenu,
        updateActivePage,
        getState: () => ({ ...navigationState })
    };

    console.log('📋 Sistema de navegación Finca La Herradura cargado');

})();
