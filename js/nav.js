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
