/* ========================================
   SISTEMA DE NOTIFICACIONES - FINCA LA HERRADURA
   Crea este archivo como: notifications.js
   ======================================== */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-toast {
                background: white;
                border-radius: 12px;
                padding: 16px 20px;
                margin-bottom: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                border-left: 4px solid;
                display: flex;
                align-items: center;
                gap: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                max-width: 100%;
                word-wrap: break-word;
                pointer-events: auto;
                transform: translateX(120%);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                opacity: 0;
            }

            .notification-toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification-toast.hide {
                transform: translateX(120%);
                opacity: 0;
                margin-bottom: 0;
                padding-top: 0;
                padding-bottom: 0;
                max-height: 0;
            }

            .notification-toast.success {
                border-left-color: #22c55e;
                background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
            }

            .notification-toast.error {
                border-left-color: #ef4444;
                background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
            }

            .notification-toast.warning {
                border-left-color: #f59e0b;
                background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
            }

            .notification-toast.info {
                border-left-color: #3b82f6;
                background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
            }

            .notification-icon {
                font-size: 18px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
            }

            .notification-toast.success .notification-icon { color: #22c55e; }
            .notification-toast.error .notification-icon { color: #ef4444; }
            .notification-toast.warning .notification-icon { color: #f59e0b; }
            .notification-toast.info .notification-icon { color: #3b82f6; }

            .notification-content {
                flex: 1;
                color: #374151;
                font-weight: 500;
            }

            .notification-close {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
                flex-shrink: 0;
            }

            .notification-close:hover {
                color: #6b7280;
                background: rgba(0, 0, 0, 0.05);
            }

            @media (max-width: 480px) {
                #notifications-container {
                    left: 20px;
                    right: 20px;
                    top: 20px;
                    max-width: none;
                }
                .notification-toast {
                    font-size: 13px;
                    padding: 14px 16px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    show(message, type = 'info', options = {}) {
        const id = Date.now() + Math.random();
        const {
            duration = type === 'error' ? 6000 : 4000,
            closable = true,
            persistent = false
        } = options;

        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.setAttribute('data-id', id);

        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        notification.innerHTML = `
            <div class="notification-icon">${icons[type] || icons.info}</div>
            <div class="notification-content">${message}</div>
            ${closable ? '<button class="notification-close" title="Cerrar">&times;</button>' : ''}
        `;

        if (closable) {
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn?.addEventListener('click', () => this.hide(id));
        }

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }

        this.cleanup();
        return id;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.classList.remove('show');
        notification.classList.add('hide');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    cleanup() {
        if (this.notifications.size > 5) {
            const oldestId = this.notifications.keys().next().value;
            this.hide(oldestId);
        }
    }

    success(message, options) { return this.show(message, 'success', options); }
    error(message, options) { return this.show(message, 'error', options); }
    warning(message, options) { return this.show(message, 'warning', options); }
    info(message, options) { return this.show(message, 'info', options); }
}

// Instancia global
const notificationSystem = new NotificationSystem();

// Función global compatible con tu código
function mostrarNotificacion(mensaje, tipo = 'info', opciones = {}) {
    const typeMap = {
        'exito': 'success',
        'exitoso': 'success',
        'correcto': 'success',
        'error': 'error',
        'fallo': 'error',
        'advertencia': 'warning',
        'alerta': 'warning',
        'informacion': 'info',
        'info': 'info'
    };

    const mappedType = typeMap[tipo.toLowerCase()] || tipo;
    return notificationSystem.show(mensaje, mappedType, opciones);
}

// Exposición global
window.mostrarNotificacion = mostrarNotificacion;
window.notificationSystem = notificationSystem;
window.showNotification = mostrarNotificacion;

console.log('✅ Sistema de notificaciones inicializado');
