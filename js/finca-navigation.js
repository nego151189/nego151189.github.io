/* ========================================
   SISTEMA DE NAVEGACIÓN PROFESIONAL
   Diseño elegante con secciones organizadas
   ======================================== */

(function() {
    'use strict';

    // Configuración
    const config = {
        sidebarWidth: '280px',
        sidebarCollapsedWidth: '60px',
        breakpoint: 1024,
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

    // Inyectar CSS completo para navegación profesional
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

            /* Sidebar profesional mejorado */
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
                display: flex;
                flex-direction: column;
            }

            /* Header del sidebar */
            .finca-sidebar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
                flex-shrink: 0;
            }

            .finca-sidebar-brand {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                flex: 1;
            }

            .finca-brand-icon {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-light) 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                box-shadow: 0 4px 12px rgba(45, 80, 22, 0.3);
            }

            .finca-brand-text {
                flex: 1;
            }

            .finca-brand-title {
                font-size: 1rem;
                font-weight: 700;
                color: var(--dark-gray);
                line-height: 1.2;
                margin: 0;
            }

            .finca-brand-subtitle {
                font-size: 0.75rem;
                color: #94a3b8;
                font-weight: 500;
                line-height: 1.2;
                margin: 0;
            }

            /* Contenido del sidebar con scroll */
            .finca-sidebar-content {
                flex: 1;
                overflow-y: auto;
                padding: 0.5rem 0;
            }

            /* Secciones del menú */
            .finca-nav-section {
                margin-bottom: 1.5rem;
            }

            .finca-nav-section-title {
                font-size: 0.65rem;
                font-weight: 700;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 0 1.5rem 0.75rem 1.5rem;
                margin-bottom: 0.5rem;
            }

            .finca-nav-section-items {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .finca-nav-item {
                margin: 0;
            }

            .finca-nav-link {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.875rem 1.5rem;
                color: #64748b;
                text-decoration: none;
                transition: all var(--transition-fast);
                border-left: 3px solid transparent;
                font-weight: 500;
                font-size: 0.875rem;
                position: relative;
                min-height: 48px;
            }

            .finca-nav-link-content {
                display: flex;
                align-items: center;
                gap: 0.875rem;
                flex: 1;
            }

            .finca-nav-link:hover {
                background: linear-gradient(90deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%);
                color: var(--primary-green);
                border-left-color: var(--primary-green);
                transform: translateX(2px);
            }

            .finca-nav-link.active {
                background: linear-gradient(90deg, rgba(34, 197, 94, 0.12) 0%, transparent 100%);
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
                box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
            }

            .finca-nav-icon {
                width: 18px;
                text-align: center;
                font-size: 1rem;
                flex-shrink: 0;
                color: currentColor;
            }

            .finca-nav-text {
                flex: 1;
                font-size: 0.875rem;
            }

            /* Badges para notificaciones */
            .finca-nav-badge {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
                font-size: 0.7rem;
                font-weight: 700;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                min-width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
                animation: pulse-badge 2s infinite;
            }

            @keyframes pulse-badge {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.1);
                    opacity: 0.9;
                }
            }

            /* Footer del sidebar */
            .finca-sidebar-footer {
                margin-top: auto;
                padding: 1.5rem;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
                background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
                flex-shrink: 0;
            }

            .finca-user-info {
                display: flex;
                align-items: center;
                gap: 0.875rem;
            }

            .finca-user-avatar {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-light) 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1rem;
                font-weight: 700;
                box-shadow: 0 4px 12px rgba(45, 80, 22, 0.3);
            }

            .finca-user-details {
                flex: 1;
            }

            .finca-user-name {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--dark-gray);
                line-height: 1.2;
                margin: 0;
            }

            .finca-user-role {
                font-size: 0.75rem;
                color: #94a3b8;
                font-weight: 500;
                line-height: 1.2;
                margin: 0;
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

            /* Botón cerrar móvil mejorado */
            .finca-mobile-close {
                display: none;
                background: rgba(0, 0, 0, 0.1);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                color: var(--dark-gray);
                transition: all var(--transition-fast);
                z-index: 1002;
            }

            .finca-mobile-close:hover {
                background: rgba(0, 0, 0, 0.2);
                transform: rotate(90deg) scale(1.1);
            }

            /* Scrollbar personalizado para el sidebar */
            .finca-sidebar::-webkit-scrollbar,
            .finca-sidebar-content::-webkit-scrollbar {
                width: 4px;
            }

            .finca-sidebar::-webkit-scrollbar-track,
            .finca-sidebar-content::-webkit-scrollbar-track {
                background: transparent;
            }

            .finca-sidebar::-webkit-scrollbar-thumb,
            .finca-sidebar-content::-webkit-scrollbar-thumb {
                background: rgba(148, 163, 184, 0.3);
                border-radius: 2px;
            }

            .finca-sidebar::-webkit-scrollbar-thumb:hover,
            .finca-sidebar-content::-webkit-scrollbar-thumb:hover {
                background: rgba(148, 163, 184, 0.5);
            }

            /* RESPONSIVE DESIGN COMPLETO */

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
                    padding: 1rem 1.5rem;
                    font-size: 0.9rem;
                    min-height: 52px;
                }

                .finca-nav-link:hover {
                    transform: translateX(0);
                    padding-left: 1.5rem;
                }
            }

            /* Tablets específicamente */
            @media (max-width: 1024px) and (min-width: 769px) {
                .finca-header {
                    padding: 0 2rem;
                }

                .finca-sidebar-header {
                    padding: 1.25rem 1.5rem;
                }

                .finca-brand-title {
                    font-size: 1.1rem;
                }

                .finca-nav-section {
                    margin-bottom: 1.25rem;
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

                .finca-sidebar-header {
                    padding: 1rem;
                }

                .finca-brand-icon {
                    width: 36px;
                    height: 36px;
                    font-size: 1.1rem;
                }

                .finca-brand-title {
                    font-size: 0.95rem;
                }

                .finca-brand-subtitle {
                    font-size: 0.7rem;
                }

                .finca-nav-section-title {
                    font-size: 0.6rem;
                    padding: 0 1rem 0.5rem 1rem;
                }

                .finca-nav-link {
                    padding: 0.875rem 1rem;
                    font-size: 0.875rem;
                    min-height: 48px;
                }

                .finca-nav-link-content {
                    gap: 0.75rem;
                }

                .finca-nav-icon {
                    font-size: 0.95rem;
                    width: 16px;
                }

                .finca-nav-text {
                    font-size: 0.875rem;
                }

                .finca-nav-badge {
                    font-size: 0.65rem;
                    padding: 0.2rem 0.4rem;
                    min-width: 18px;
                    height: 18px;
                }

                .finca-sidebar-footer {
                    padding: 1rem;
                }

                .finca-user-info {
                    gap: 0.75rem;
                }

                .finca-user-avatar {
                    width: 36px;
                    height: 36px;
                    font-size: 0.9rem;
                }

                .finca-user-name {
                    font-size: 0.8rem;
                }

                .finca-user-role {
                    font-size: 0.7rem;
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

                .finca-sidebar-header {
                    padding: 0.875rem;
                }

                .finca-brand-icon {
                    width: 32px;
                    height: 32px;
                    font-size: 1rem;
                }

                .finca-brand-title {
                    font-size: 0.9rem;
                }

                .finca-brand-subtitle {
                    font-size: 0.65rem;
                }

                .finca-nav-section-title {
                    font-size: 0.55rem;
                    padding: 0 0.875rem 0.4rem 0.875rem;
                }

                .finca-nav-link {
                    padding: 0.75rem 0.875rem;
                    font-size: 0.8rem;
                    min-height: 44px;
                }

                .finca-nav-link-content {
                    gap: 0.625rem;
                }

                .finca-nav-icon {
                    font-size: 0.9rem;
                    width: 14px;
                }

                .finca-nav-text {
                    font-size: 0.8rem;
                }

                .finca-sidebar-footer {
                    padding: 0.875rem;
                }

                .finca-user-info {
                    gap: 0.625rem;
                }

                .finca-user-avatar {
                    width: 32px;
                    height: 32px;
                    font-size: 0.8rem;
                }

                .finca-user-name {
                    font-size: 0.75rem;
                }

                .finca-user-role {
                    font-size: 0.65rem;
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

            /* Mejoras de accesibilidad */
            .finca-mobile-toggle:focus,
            .finca-mobile-close:focus,
            .finca-nav-link:focus {
                outline: 2px solid var(--accent-yellow);
                outline-offset: 2px;
            }

            /* Estados hover solo en dispositivos que los soportan */
            @media (hover: hover) {
                .finca-nav-link:hover {
                    background: linear-gradient(90deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%);
                    color: var(--primary-green);
                    border-left-color: var(--primary-green);
                    transform: translateX(2px);
                }
            }

            /* Reducir animaciones si el usuario lo prefiere */
            @media (prefers-reduced-motion: reduce) {
                * {
                    transition: none !important;
                    animation: none !important;
                }
            }
        `;

        document.head.appendChild(style);
        console.log('✅ CSS de navegación profesional inyectado');
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
                <a href="/index.html" class="finca-logo">
                    <div class="finca-logo-icon">🍋</div>
                    <span>Finca La Herradura</span>
                </a>
            </div>
        `;

        document.body.insertBefore(header, document.body.firstChild);
        console.log('✅ Header profesional creado');
    }

    // Crear estructura HTML del sidebar profesional con secciones organizadas
    function createSidebar() {
        if (document.querySelector('.finca-sidebar')) return;

        // Estructura de menú organizada por secciones ACTUALIZADA
        const menuStructure = {
            principal: {
                title: 'PRINCIPAL',
                items: [
                    { href: '/index.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard', id: 'dashboard' },
                    { href: '/recordatorios.html', icon: 'fas fa-bell', text: 'Recordatorios', id: 'recordatorios', badge: '3' }
                ]
            },
            cultivo: {
                title: 'GESTIÓN DE CULTIVO',
                items: [
                    { href: '/arboles.html', icon: 'fas fa-tree', text: 'Gestión de Árboles', id: 'arboles' },
                    { href: '/produccion.html', icon: 'fas fa-seedling', text: 'Producción', id: 'produccion' },
                    { href: '/riegos.html', icon: 'fas fa-tint', text: 'Sistema de Riegos', id: 'riegos' },
                    { href: '/tratamientos.html', icon: 'fas fa-leaf', text: 'Tratamientos', id: 'tratamientos', badge: '1' },
                    { href: '/clima.html', icon: 'fas fa-cloud-sun', text: 'Clima', id: 'clima' }
                ]
            },
            comercial: {
                title: 'COMERCIAL',
                items: [
                    { href: '/ventas.html', icon: 'fas fa-shopping-cart', text: 'Ventas', id: 'ventas' },
                    { href: '/precios.html', icon: 'fas fa-chart-line', text: 'Precios MAGA', id: 'precios' },
                    { href: '/gastos.html', icon: 'fas fa-receipt', text: 'Gastos', id: 'gastos' },
                    { href: '/negocios.html', icon: 'fas fa-handshake', text: 'Negocios', id: 'negocios' }
                ]
            }
        };

        const sidebar = document.createElement('nav');
        sidebar.className = 'finca-sidebar';
        sidebar.id = 'fincaSidebar';
        sidebar.setAttribute('aria-label', 'Navegación principal');

        // Generar el HTML del menú por secciones
        let menuHTML = '';
        
        // Header del sidebar
        menuHTML += `
            <div class="finca-sidebar-header">
                <div class="finca-sidebar-brand">
                    <div class="finca-brand-icon">🍋</div>
                    <div class="finca-brand-text">
                        <div class="finca-brand-title">Finca La Herradura</div>
                        <div class="finca-brand-subtitle">Sistema Inteligente</div>
                    </div>
                </div>
                <button class="finca-mobile-close" id="fincaMobileClose" aria-label="Cerrar menú">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        `;

        // Contenido scrolleable del sidebar
        menuHTML += `<div class="finca-sidebar-content">`;

        // Generar secciones del menú
        Object.entries(menuStructure).forEach(([sectionKey, section]) => {
            menuHTML += `
                <div class="finca-nav-section">
                    <div class="finca-nav-section-title">${section.title}</div>
                    <ul class="finca-nav-section-items" role="list">
            `;
            
            section.items.forEach(item => {
                const isActive = isCurrentPage(item.href);
                const badgeHTML = item.badge ? `<span class="finca-nav-badge">${item.badge}</span>` : '';
                
                menuHTML += `
                    <li class="finca-nav-item">
                        <a href="${item.href}" class="finca-nav-link ${isActive ? 'active' : ''}" 
                           data-page="${item.id}" aria-current="${isActive ? 'page' : 'false'}">
                            <div class="finca-nav-link-content">
                                <i class="${item.icon} finca-nav-icon" aria-hidden="true"></i>
                                <span class="finca-nav-text">${item.text}</span>
                            </div>
                            ${badgeHTML}
                        </a>
                    </li>
                `;
            });
            
            menuHTML += `
                    </ul>
                </div>
            `;
        });

        menuHTML += `</div>`; // Cerrar finca-sidebar-content

        // Footer del sidebar
        menuHTML += `
            <div class="finca-sidebar-footer">
                <div class="finca-user-info">
                    <div class="finca-user-avatar">
                        <span>A</span>
                    </div>
                    <div class="finca-user-details">
                        <div class="finca-user-name">Administrador</div>
                        <div class="finca-user-role">Gestor Principal</div>
                    </div>
                </div>
            </div>
        `;

        sidebar.innerHTML = menuHTML;
        document.body.appendChild(sidebar);
        
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'finca-mobile-overlay';
        overlay.id = 'fincaMobileOverlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);

        console.log('✅ Sidebar profesional con secciones organizadas creado');
    }

    // Verificar si es la página actual - mejorado para todos los archivos
    function isCurrentPage(href) {
        const currentPath = window.location.pathname;
        const fileName = currentPath.split('/').pop() || 'index.html';
        const targetFileName = href.split('/').pop();
        
        // Manejo especial para index/dashboard
        if ((fileName === '' || fileName === 'index.html') && (targetFileName === 'index.html' || href === '/')) {
            return true;
        }
        
        // Comparación exacta de archivos
        if (fileName === targetFileName) {
            return true;
        }
        
        // Comparación sin extensión
        const currentBase = fileName.replace('.html', '');
        const targetBase = targetFileName ? targetFileName.replace('.html', '') : '';
        
        return currentBase === targetBase;
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
                    // Pequeño delay para permitir navegación
                    setTimeout(() => {
                        closeMobileMenu();
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

        console.log('✅ Event listeners profesionales configurados');
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
        
        console.log(`📱 Menú profesional abierto (${navigationState.isTablet ? 'Tablet' : 'Móvil'})`);
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
        
        console.log('📱 Menú profesional cerrado');
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

        console.log('🚀 Inicializando sistema de navegación profesional...');

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
            console.log('✅ Sistema de navegación profesional inicializado exitosamente');
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

    console.log('📋 Sistema de navegación profesional Finca La Herradura cargado');

})();
