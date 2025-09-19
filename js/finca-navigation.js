/* ========================================
   SISTEMA DE NAVEGACIÓN UNIFICADO
   Optimizado para menú hamburguesa en móviles/tablets
   ======================================== */

(function() {
    'use strict';

    // Configuración mejorada
    const config = {
        sidebarWidth: '280px',
        sidebarCollapsedWidth: '60px',
        // Breakpoint más alto para incluir tablets
        breakpoint: 1024, // Cambiado de 768 a 1024 para incluir tablets
        tabletBreakpoint: 768,
        animationDuration: 300
    };

    // Estado global
    let navigationState = {
        isInitialized: false,
        isMobileMenuOpen: false,
        currentPage: window.location.pathname,
        isDesktop: false,
        isTablet: false,
        isMobile: false
    };

    // Detectar tipo de dispositivo
    function detectDevice() {
        const width = window.innerWidth;
        navigationState.isDesktop = width > config.breakpoint;
        navigationState.isTablet = width <= config.breakpoint && width > config.tabletBreakpoint;
        navigationState.isMobile = width <= config.tabletBreakpoint;
        
        console.log(`📱 Dispositivo: ${width}px - ${navigationState.isDesktop ? 'Desktop' : navigationState.isTablet ? 'Tablet' : 'Móvil'}`);
    }

    // Inyectar CSS completo mejorado
    function injectNavigationCSS() {
        if (document.getElementById('navigation-complete-css')) return;

        const style = document.createElement('style');
        style.id = 'navigation-complete-css';
        style.textContent = `
            /* Variables CSS actualizadas */
            :root {
                --sidebar-width: ${config.sidebarWidth};
                --sidebar-collapsed-width: ${config.sidebarCollapsedWidth};
                --header-height: 70px;
                --primary-green: #2d5016;
                --primary-light: #4a7c59;
                --accent-yellow: #f4d03f;
                --white: #ffffff;
                --light-gray: #f8f9fa;
                --dark-gray: #343a40;
                --border: #e2e8f0;
                --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
                --shadow-md: 0 4px 8px rgba(0,0,0,0.15);
                --transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Reset y layout principal */
            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                line-height: 1.6;
                background: var(--light-gray);
            }

            /* Header fijo optimizado */
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
                justify-content: space-between;
                padding: 0 1.5rem;
                box-shadow: var(--shadow-md);
                transition: all var(--transition-normal);
            }

            .finca-header-left {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .finca-logo {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                color: var(--white);
                font-size: 1.2rem;
                font-weight: 700;
                text-decoration: none;
                transition: opacity var(--transition-fast);
            }

            .finca-logo:hover {
                opacity: 0.9;
            }

            .finca-logo-icon {
                width: 36px;
                height: 36px;
                background: var(--accent-yellow);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }

            /* Botón hamburguesa mejorado */
            .finca-mobile-toggle {
                display: none;
                background: none;
                border: none;
                color: var(--white);
                font-size: 1.4rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all var(--transition-fast);
                position: relative;
                width: 44px;
                height: 44px;
                align-items: center;
                justify-content: center;
            }

            .finca-mobile-toggle:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: scale(1.05);
            }

            .finca-mobile-toggle:active {
                transform: scale(0.95);
            }

            .finca-mobile-toggle.active {
                background: rgba(255, 255, 255, 0.2);
            }

            /* Sidebar mejorado */
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
                overflow-x: hidden;
                transition: transform var(--transition-normal);
                box-shadow: var(--shadow-md);
            }

            /* Scrollbar personalizado */
            .finca-sidebar::-webkit-scrollbar {
                width: 6px;
            }

            .finca-sidebar::-webkit-scrollbar-track {
                background: transparent;
            }

            .finca-sidebar::-webkit-scrollbar-thumb {
                background: var(--border);
                border-radius: 3px;
            }

            .finca-sidebar::-webkit-scrollbar-thumb:hover {
                background: var(--dark-gray);
            }

            .finca-nav-menu {
                list-style: none;
                padding: 1.5rem 0;
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
                transition: all var(--transition-fast);
                border-left: 3px solid transparent;
                font-weight: 500;
                font-size: 0.95rem;
                position: relative;
                min-height: 52px;
            }

            .finca-nav-link:hover {
                background: linear-gradient(90deg, rgba(45, 80, 22, 0.05), transparent);
                color: var(--primary-green);
                padding-left: 2rem;
            }

            .finca-nav-link.active {
                background: linear-gradient(90deg, rgba(45, 80, 22, 0.1), transparent);
                color: var(--primary-green);
                border-left-color: var(--primary-green);
                font-weight: 600;
            }

            .finca-nav-link.active::after {
                content: '';
                position: absolute;
                right: 1.5rem;
                top: 50%;
                transform: translateY(-50%);
                width: 6px;
                height: 6px;
                background: var(--primary-green);
                border-radius: 50%;
            }

            .finca-nav-icon {
                width: 20px;
                text-align: center;
                font-size: 1.1rem;
                flex-shrink: 0;
            }

            /* Contenido principal */
            .main-content-wrapper {
                margin-left: var(--sidebar-width);
                margin-top: var(--header-height);
                min-height: calc(100vh - var(--header-height));
                transition: margin-left var(--transition-normal);
                padding: 2rem;
                background: var(--light-gray);
            }

            /* Overlay móvil mejorado */
            .finca-mobile-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(2px);
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
                transition: all var(--transition-fast);
                z-index: 1002;
            }

            .finca-mobile-close:hover {
                background: rgba(0, 0, 0, 0.2);
                transform: rotate(90deg) scale(1.1);
            }

            /* RESPONSIVE DESIGN MEJORADO */

            /* Tablets y móviles (1024px y menos) */
            @media (max-width: 1024px) {
                .finca-mobile-toggle {
                    display: flex;
                }

                .finca-sidebar {
                    transform: translateX(-100%);
                    top: 0;
                    height: 100vh;
                    z-index: 1001;
                    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
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
                    font-size: 1rem;
                    min-height: 56px;
                }

                .finca-nav-link:hover {
                    padding-left: 1.5rem;
                }
            }

            /* Tablets específicamente */
            @media (max-width: 1024px) and (min-width: 769px) {
                .finca-header {
                    padding: 0 2rem;
                }

                .finca-logo {
                    font-size: 1.3rem;
                }

                .finca-nav-menu {
                    padding: 2rem 0;
                }
            }

            /* Móviles */
            @media (max-width: 768px) {
                .finca-header {
                    height: 60px;
                    padding: 0 1rem;
                }

                :root {
                    --header-height: 60px;
                }

                .main-content-wrapper {
                    padding: 1.5rem;
                    margin-top: 60px;
                }

                .finca-logo {
                    font-size: 1.1rem;
                }

                .finca-logo-icon {
                    width: 32px;
                    height: 32px;
                    font-size: 1.1rem;
                }

                .finca-nav-link {
                    padding: 1rem 1.25rem;
                    font-size: 1rem;
                }

                .finca-mobile-toggle {
                    font-size: 1.3rem;
                    width: 40px;
                    height: 40px;
                }
            }

            /* Móviles pequeños */
            @media (max-width: 480px) {
                .finca-header {
                    padding: 0 0.75rem;
                }

                .main-content-wrapper {
                    padding: 1rem;
                }

                .finca-logo span {
                    display: none;
                }

                .finca-sidebar {
                    width: 100%;
                }
            }

            /* Prevenir scroll cuando menú móvil está abierto */
            body.finca-mobile-menu-open {
                overflow: hidden;
                position: fixed;
                width: 100%;
            }

            /* Animaciones mejoradas */
            @keyframes slideInRight {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutLeft {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-100%);
                    opacity: 0;
                }
            }

            .finca-sidebar.mobile-open {
                animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .finca-sidebar.mobile-closing {
                animation: slideOutLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Estados de carga y loading */
            .finca-nav-link.loading {
                opacity: 0.6;
                pointer-events: none;
                position: relative;
            }

            .finca-nav-link.loading::before {
                content: '';
                position: absolute;
                right: 1.5rem;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                border: 2px solid var(--border);
                border-top: 2px solid var(--primary-green);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to {
                    transform: translateY(-50%) rotate(360deg);
                }
            }

            /* Mejoras de accesibilidad */
            .finca-mobile-toggle:focus,
            .finca-mobile-close:focus,
            .finca-nav-link:focus {
                outline: 2px solid var(--accent-yellow);
                outline-offset: 2px;
            }

            /* Modo oscuro automático */
            @media (prefers-color-scheme: dark) {
                :root {
                    --white: #1a1a1a;
                    --light-gray: #121212;
                    --dark-gray: #e0e0e0;
                    --border: #333333;
                }
            }

            /* Reducir animaciones si el usuario lo prefiere */
            @media (prefers-reduced-motion: reduce) {
                * {
                    transition: none !important;
                    animation: none !important;
                }
            }

            /* Estados hover solo en dispositivos que los soportan */
            @media (hover: hover) {
                .finca-nav-link:hover {
                    background: linear-gradient(90deg, rgba(45, 80, 22, 0.05), transparent);
                    color: var(--primary-green);
                    padding-left: 2rem;
                }
            }

            /* Alto contraste para accesibilidad */
            @media (prefers-contrast: high) {
                .finca-nav-link {
                    border: 1px solid transparent;
                }
                
                .finca-nav-link:hover,
                .finca-nav-link.active {
                    border-color: var(--primary-green);
                }
            }
        `;

        document.head.appendChild(style);
        console.log('✅ CSS de navegación hamburguesa inyectado');
    }

    // Crear estructura HTML del header mejorado
    function createHeader() {
        if (document.querySelector('.finca-header')) return;

        const header = document.createElement('header');
        header.className = 'finca-header';
        header.innerHTML = `
            <div class="finca-header-left">
                <button class="finca-mobile-toggle" id="fincaMobileToggle" aria-label="Abrir menú" aria-expanded="false">
                    <i class="fas fa-bars"></i>
                </button>
                <a href="/" class="finca-logo">
                    <div class="finca-logo-icon">🍋</div>
                    <span>Finca La Herradura</span>
                </a>
            </div>
        `;

        document.body.insertBefore(header, document.body.firstChild);
        console.log('✅ Header hamburguesa creado');
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
        sidebar.setAttribute('aria-label', 'Navegación principal');

        const menuHTML = menuItems.map(item => {
            const isActive = isCurrentPage(item.href);
            return `
                <li class="finca-nav-item">
                    <a href="${item.href}" class="finca-nav-link ${isActive ? 'active' : ''}" 
                       data-page="${item.id}" aria-current="${isActive ? 'page' : 'false'}">
                        <i class="${item.icon} finca-nav-icon" aria-hidden="true"></i>
                        <span>${item.text}</span>
                    </a>
                </li>
            `;
        }).join('');

        sidebar.innerHTML = `
            <button class="finca-mobile-close" id="fincaMobileClose" aria-label="Cerrar menú">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            <ul class="finca-nav-menu" role="list">
                ${menuHTML}
            </ul>
        `;

        document.body.appendChild(sidebar);
        
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'finca-mobile-overlay';
        overlay.id = 'fincaMobileOverlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);

        console.log('✅ Sidebar hamburguesa y overlay creados');
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

    // Configurar event listeners mejorados
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
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openMobileMenu();
        });
        
        // Cerrar menú móvil
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
        });
        
        overlay.addEventListener('click', closeMobileMenu);

        // Cerrar menú al hacer click en enlaces (solo en móvil/tablet)
        sidebar.querySelectorAll('.finca-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                if (!navigationState.isDesktop && navigationState.isMobileMenuOpen) {
                    // Añadir clase de loading
                    link.classList.add('loading');
                    
                    // Pequeño delay para permitir navegación
                    setTimeout(() => {
                        closeMobileMenu();
                        link.classList.remove('loading');
                    }, 150);
                }
            });
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navigationState.isMobileMenuOpen) {
                closeMobileMenu();
                toggleBtn.focus(); // Devolver foco al botón
            }
        });

        // Manejar cambio de tamaño con debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 250);
        });

        // Prevenir scroll en móvil cuando se abre/cierra
        document.addEventListener('touchmove', (e) => {
            if (navigationState.isMobileMenuOpen && !sidebar.contains(e.target)) {
                e.preventDefault();
            }
        }, { passive: false });

        console.log('✅ Event listeners hamburguesa configurados');
    }

    // Abrir menú móvil mejorado
    function openMobileMenu() {
        detectDevice();
        
        if (navigationState.isDesktop) {
            console.log('🖥️ Menú no necesario en desktop');
            return;
        }
        
        navigationState.isMobileMenuOpen = true;
        
        const sidebar = document.getElementById('fincaSidebar');
        const overlay = document.getElementById('fincaMobileOverlay');
        const toggleBtn = document.getElementById('fincaMobileToggle');

        if (sidebar) {
            sidebar.classList.remove('mobile-closing');
            sidebar.classList.add('mobile-open');
            sidebar.setAttribute('aria-hidden', 'false');
        }
        
        if (overlay) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
        }
        
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            toggleBtn.setAttribute('aria-expanded', 'true');
        }
        
        document.body.classList.add('finca-mobile-menu-open');
        
        // Focus en el primer enlace del menú
        setTimeout(() => {
            const firstLink = sidebar?.querySelector('.finca-nav-link');
            if (firstLink) firstLink.focus();
        }, 100);
        
        console.log(`📱 Menú hamburguesa abierto (${navigationState.isTablet ? 'Tablet' : 'Móvil'})`);
    }

    // Cerrar menú móvil mejorado
    function closeMobileMenu() {
        navigationState.isMobileMenuOpen = false;
        
        const sidebar = document.getElementById('fincaSidebar');
        const overlay = document.getElementById('fincaMobileOverlay');
        const toggleBtn = document.getElementById('fincaMobileToggle');

        if (sidebar) {
            sidebar.classList.add('mobile-closing');
            setTimeout(() => {
                sidebar.classList.remove('mobile-open', 'mobile-closing');
                sidebar.setAttribute('aria-hidden', 'true');
            }, 300);
        }
        
        if (overlay) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
        }
        
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
        
        document.body.classList.remove('finca-mobile-menu-open');
        
        console.log('📱 Menú hamburguesa cerrado');
    }

    // Manejar cambio de tamaño de ventana
    function handleResize() {
        const wasDesktop = navigationState.isDesktop;
        detectDevice();
        
        // Si cambió de móvil/tablet a desktop, cerrar menú
        if (!wasDesktop && navigationState.isDesktop && navigationState.isMobileMenuOpen) {
            closeMobileMenu();
            console.log('🖥️ Menú cerrado automáticamente en desktop');
        }
        
        // Si está en desktop, asegurar que el menú esté visible
        if (navigationState.isDesktop) {
            const sidebar = document.getElementById('fincaSidebar');
            if (sidebar) {
                sidebar.classList.remove('mobile-open', 'mobile-closing');
                sidebar.style.transform = '';
            }
        }
    }

    // Inicialización principal
    function initializeNavigation() {
        if (navigationState.isInitialized) {
            console.log('⚠️ Navegación ya inicializada');
            return;
        }

        console.log('🚀 Inicializando sistema de navegación hamburguesa...');

        try {
            // Detectar dispositivo inicial
            detectDevice();
            
            // Inyectar CSS
            injectNavigationCSS();
            
            // Crear elementos HTML
            createHeader();
            createSidebar();
            
            // Configurar eventos
            setupEventListeners();
            
            // Asegurar estado inicial correcto
            if (!navigationState.isDesktop) {
                closeMobileMenu();
            }
            
            navigationState.isInitialized = true;
            console.log('✅ Sistema de navegación hamburguesa inicializado exitosamente');
            console.log(`📱 Dispositivo detectado: ${navigationState.isDesktop ? 'Desktop' : navigationState.isTablet ? 'Tablet' : 'Móvil'}`);
            
            // Disparar evento personalizado
            window.dispatchEvent(new CustomEvent('fincaNavigationReady', {
                detail: { 
                    timestamp: Date.now(),
                    deviceType: navigationState.isDesktop ? 'desktop' : navigationState.isTablet ? 'tablet' : 'mobile'
                }
            }));
            
        } catch (error) {
            console.error('❌ Error inicializando navegación:', error);
        }
    }

    // Función para actualizar página activa
    function updateActivePage(pagePath) {
        document.querySelectorAll('.finca-nav-link').forEach(link => {
            link.classList.remove('active');
            link.setAttribute('aria-current', 'false');
            
            if (link.getAttribute('href') === pagePath || 
                link.getAttribute('href').includes(pagePath)) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
        console.log(`📄 Página activa actualizada: ${pagePath}`);
    }

    // Auto-inicialización
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        // DOM ya cargado
        setTimeout(initializeNavigation, 50);
    }

    // Exposición global
    window.FincaNavigation = {
        initialize: initializeNavigation,
        openMobileMenu,
        closeMobileMenu,
        updateActivePage,
        detectDevice,
        getState: () => ({ ...navigationState }),
        config
    };

    console.log('📋 Sistema de navegación hamburguesa Finca La Herradura cargado');

})();
