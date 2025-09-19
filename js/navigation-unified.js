/* ========================================
   NAVEGACIÓN SIMPLIFICADA - FINCA LA HERRADURA
   Resuelve conflictos entre nav.js y mobile-nav.js
   ======================================== */

(function() {
    'use strict';

    // Crear sidebar HTML
    function createSidebar() {
        // Verificar si ya existe
        if (document.getElementById('navbar')) {
            return;
        }

        const sidebarHTML = `
            <nav class="sidebar" id="navbar">
                <ul class="nav-menu">
                    <li><a href="/" class="nav-link ${window.location.pathname === '/' ? 'active' : ''}">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Dashboard</span>
                    </a></li>
                    
                    <li><a href="cosecha.html" class="nav-link ${window.location.pathname.includes('cosecha') ? 'active' : ''}">
                        <i class="fas fa-seedling"></i>
                        <span>Cosecha</span>
                    </a></li>
                    
                    <li><a href="riegos.html" class="nav-link ${window.location.pathname.includes('riegos') ? 'active' : ''}">
                        <i class="fas fa-tint"></i>
                        <span>Riegos</span>
                    </a></li>
                    
                    <li><a href="ventas.html" class="nav-link ${window.location.pathname.includes('ventas') ? 'active' : ''}">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Ventas</span>
                    </a></li>
                    
                    <li><a href="gastos.html" class="nav-link ${window.location.pathname.includes('gastos') ? 'active' : ''}">
                        <i class="fas fa-receipt"></i>
                        <span>Gastos</span>
                    </a></li>
                    
                    <li><a href="arboles.html" class="nav-link ${window.location.pathname.includes('arboles') ? 'active' : ''}">
                        <i class="fas fa-tree"></i>
                        <span>Árboles</span>
                    </a></li>
                    
                    <li><a href="clima.html" class="nav-link ${window.location.pathname.includes('clima') ? 'active' : ''}">
                        <i class="fas fa-cloud-sun"></i>
                        <span>Clima</span>
                    </a></li>
                    
                    <li><a href="reportes.html" class="nav-link ${window.location.pathname.includes('reportes') ? 'active' : ''}">
                        <i class="fas fa-chart-bar"></i>
                        <span>Reportes</span>
                    </a></li>
                </ul>
            </nav>
        `;

        // Insertar al inicio del body
        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
        console.log('✅ Sidebar creado');
    }

    // Crear header si no existe
    function createHeader() {
        if (document.querySelector('.header')) {
            return;
        }

        const headerHTML = `
            <header class="header">
                <div class="header-content">
                    <a href="/" class="logo">
                        <div class="logo-icon">🍋</div>
                        <span>Finca La Herradura</span>
                    </a>
                    
                    <!-- Estado de conexión -->
                    <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.875rem; color: white;">
                        <span id="connection-indicator">🟢 Conectado</span>
                    </div>
                </div>
            </header>
        `;

        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        console.log('✅ Header creado');
    }

    // Funcionalidad móvil simplificada
    function setupMobileNavigation() {
        const sidebar = document.getElementById('navbar');
        if (!sidebar) return;

        // Crear botón hamburguesa
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'mobile-nav-toggle';
        toggleBtn.className = 'mobile-nav-toggle';
        toggleBtn.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;

        // Agregar botón al header
        const headerContent = document.querySelector('.header-content');
        if (headerContent) {
            headerContent.insertBefore(toggleBtn, headerContent.firstChild);
        }

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.id = 'mobile-nav-overlay';
        overlay.className = 'mobile-nav-overlay';
        document.body.appendChild(overlay);

        // Botón de cerrar en sidebar
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-nav-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        sidebar.insertBefore(closeBtn, sidebar.firstChild);

        // Event listeners
        let isOpen = false;

        function openNav() {
            isOpen = true;
            document.body.classList.add('mobile-nav-open');
            sidebar.classList.add('open');
            overlay.classList.add('show');
            toggleBtn.classList.add('active');
        }

        function closeNav() {
            isOpen = false;
            document.body.classList.remove('mobile-nav-open');
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
            toggleBtn.classList.remove('active');
        }

        toggleBtn.addEventListener('click', () => {
            if (isOpen) closeNav();
            else openNav();
        });

        closeBtn.addEventListener('click', closeNav);
        overlay.addEventListener('click', closeNav);

        // Cerrar al hacer click en links
        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                setTimeout(closeNav, 100);
            });
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeNav();
            }
        });

        // Manejar resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && isOpen) {
                closeNav();
            }
        });

        console.log('✅ Navegación móvil configurada');
    }

    // Inyectar CSS necesario
    function injectCSS() {
        if (document.getElementById('navigation-styles')) return;

        const style = document.createElement('style');
        style.id = 'navigation-styles';
        style.textContent = `
            /* Estilos para botón hamburguesa */
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

            /* Overlay */
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

            /* Botón cerrar */
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

            /* Prevenir scroll cuando está abierto */
            body.mobile-nav-open {
                overflow: hidden;
                height: 100vh;
            }

            /* Móvil */
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
        `;

        document.head.appendChild(style);
        console.log('✅ CSS de navegación inyectado');
    }

    // Inicialización principal
    function initializeNavigation() {
        console.log('🔧 Inicializando navegación unificada...');
        
        try {
            injectCSS();
            createHeader();
            createSidebar();
            setupMobileNavigation();
            
            console.log('✅ Navegación inicializada exitosamente');
        } catch (error) {
            console.error('❌ Error inicializando navegación:', error);
        }
    }

    // Auto-inicialización
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        initializeNavigation();
    }

    // Exponer globalmente para debugging
    window.navigationSystem = {
        initialize: initializeNavigation,
        createSidebar,
        setupMobileNavigation
    };

    console.log('📱 Sistema de navegación unificado cargado');
})();
