/* ========================================
   FINCA LA HERRADURA - GESTIÓN DE VENTAS INTEGRADA
   Sistema completamente integrado con negocios y clientes
   ======================================== */

// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================

// Estado del sistema
let ventasIntegrationReady = false;
let currentUser = null;

// Referencias a otros managers
let clientesManagerRef = null;
let negociosManagerRef = null;
let dataSyncManagerRef = null;

// ==========================================
// CLASE PRINCIPAL MEJORADA
// ==========================================

class VentasManagerIntegrado {
    constructor() {
        this.ventas = new Map();
        this.oportunidades = [];
        this.clientesRecientes = [];
        this.filtrosActivos = {
            periodo: 'mes',
            cliente: '',
            estado: '',
            metodoPago: ''
        };
        
        this.estadisticas = {
            ingresosDelMes: 0,
            cantidadVendida: 0,
            precioPromedio: 0,
            margenGanancia: 0,
            tendencia: 0,
            costoPromedio: 0,
            rentabilidadReal: 0
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('💰 Inicializando VentasManager integrado...');
            
            await this.waitForIntegrations();
            await this.setupAuth();
            await this.cargarDatos();
            
            this.setupSyncListeners();
            this.setupNegocionIntegration();
            
            ventasIntegrationReady = true;
            console.log('✅ VentasManager integrado completamente listo');
            
        } catch (error) {
            console.error('⚠️ Error inicializando VentasManager integrado:', error);
            this.initOfflineMode();
        }
    }

    async waitForIntegrations() {
        const maxWait = 20000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            // Verificar ClientesManager
            if (window.clientesManager) {
                clientesManagerRef = window.clientesManager;
            }
            
            // Verificar NegociosManager
            if (window.negociosManager) {
                negociosManagerRef = window.negociosManager;
            }
            
            // Verificar DataSyncManager
            if (window.dataSyncManager) {
                dataSyncManagerRef = window.dataSyncManager;
            }
            
            // Si tenemos al menos ClientesManager, continuar
            if (clientesManagerRef) {
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('🔗 Integraciones de ventas detectadas:', {
            clientes: !!clientesManagerRef,
            negocios: !!negociosManagerRef,
            dataSync: !!dataSyncManagerRef
        });
    }

    async setupAuth() {
        if (window.firebase && window.firebase.auth) {
            window.firebase.auth().onAuthStateChanged((user) => {
                currentUser = user;
                if (user) {
                    console.log('Usuario autenticado en ventas:', user.email);
                }
            });
        }
    }

    setupSyncListeners() {
        // Escuchar cambios de clientes
        window.addEventListener('clienteCreated', (event) => {
            this.onClienteUpdated(event.detail.cliente, 'created');
        });

        window.addEventListener('clienteUpdated', (event) => {
            this.onClienteUpdated(event.detail.cliente, 'updated');
        });

        // Escuchar cambios de negocios
        window.addEventListener('negocio_creado', (event) => {
            this.onNegocioCreado(event.detail.negocio);
        });

        window.addEventListener('negocio_actualizado', (event) => {
            this.onNegocioActualizado(event.detail.negocio);
        });
    }

    setupNegocionIntegration() {
        // Configurar integración bidireccional con negocios
        if (negociosManagerRef) {
            console.log('🤝 Configurando integración con negocios');
            
            // Cuando se crea una venta, verificar si hay negocio relacionado
            this.addEventListener('ventaCreated', (event) => {
                this.syncWithNegocios(event.detail.venta);
            });
        }
    }

    // ==========================================
    // GESTIÓN DE VENTAS INTEGRADA
    // ==========================================

    async registrarVenta(datos) {
        try {
            const ventaId = datos.id || this.generateId();
            const fechaActual = new Date();
            
            // Obtener información del cliente
            let clienteInfo = null;
            if (clientesManagerRef && datos.clienteId) {
                clienteInfo = clientesManagerRef.obtenerCliente(datos.clienteId);
                if (!clienteInfo) {
                    throw new Error('Cliente no válido');
                }
                datos.cliente = clienteInfo.nombre;
            }
            
            // Validar precio contra mercado si hay integración de precios
            if (window.preciosManager) {
                const validacion = await this.validarPrecioVenta(datos.precioKg, datos.cantidad);
                if (!validacion.valido && window.ventasNotificationManager) {
                    window.ventasNotificationManager.warning(validacion.mensaje);
                }
            }
            
            const venta = {
                id: ventaId,
                fecha: datos.fecha || fechaActual.toISOString().split('T')[0],
                clienteId: datos.clienteId,
                cliente: datos.cliente || 'Cliente no especificado',
                cantidad: Number(datos.cantidad) || 0,
                precioKg: Number(datos.precioKg) || 0,
                total: datos.total || (Number(datos.cantidad) * Number(datos.precioKg)),
                metodoPago: datos.metodoPago || 'efectivo',
                estado: datos.estado || 'completada',
                descuento: datos.descuento || 0,
                referencia: datos.referencia || null,
                direccionEntrega: datos.direccionEntrega || null,
                observaciones: datos.observaciones || null,
                negocioId: datos.negocioId || null,
                fechaCreacion: datos.fechaCreacion || fechaActual.toISOString(),
                fechaModificacion: fechaActual.toISOString(),
                usuarioId: currentUser?.uid || 'anonymous'
            };
            
            // Aplicar descuento si existe
            if (venta.descuento > 0) {
                const descuentoMonto = venta.total * (venta.descuento / 100);
                venta.total = venta.total - descuentoMonto;
            }
            
            // Calcular rentabilidad real si hay integración de gastos
            if (window.rentabilidadManager) {
                const rentabilidad = await window.rentabilidadManager.calcularMargenReal(venta);
                if (rentabilidad) {
                    venta.costoEstimado = rentabilidad.costoTotal;
                    venta.margenReal = rentabilidad.margen;
                    venta.rentabilidad = rentabilidad.ganancia;
                }
            }
            
            this.ventas.set(ventaId, venta);
            
            // Guardar en Firebase si está disponible
            if (window.db && currentUser) {
                await this.sincronizarVentaConFirebase(ventaId, venta);
            }
            
            // Guardar offline
            if (window.offlineManager) {
                await window.offlineManager.saveData('ventas', ventaId, venta);
            }
            
            // Actualizar métricas del cliente
            if (clientesManagerRef && datos.clienteId) {
                await clientesManagerRef.actualizarMetricasVenta(datos.clienteId, venta.total);
            }
            
            // Si la venta proviene de un negocio, actualizarlo
            if (datos.negocioId && negociosManagerRef) {
                await negociosManagerRef.avanzarEtapa(datos.negocioId);
            }
            
            this.calcularEstadisticas();
            this.broadcastUpdate('ventaCreated', venta);
            
            console.log(`✅ Venta registrada: ${venta.cantidad} kg para ${venta.cliente}`);
            return venta;
            
        } catch (error) {
            console.error('Error registrando venta:', error);
            throw error;
        }
    }

    async actualizarVenta(ventaId, datos) {
        try {
            const venta = this.ventas.get(ventaId);
            if (!venta) {
                throw new Error(`Venta no encontrada: ${ventaId}`);
            }

            const ventaActualizada = {
                ...venta,
                ...datos,
                fechaModificacion: new Date().toISOString()
            };

            // Recalcular total si cambió cantidad o precio
            if (datos.cantidad !== undefined || datos.precioKg !== undefined) {
                ventaActualizada.total = ventaActualizada.cantidad * ventaActualizada.precioKg;
                
                // Aplicar descuento
                if (ventaActualizada.descuento > 0) {
                    const descuentoMonto = ventaActualizada.total * (ventaActualizada.descuento / 100);
                    ventaActualizada.total = ventaActualizada.total - descuentoMonto;
                }
            }

            this.ventas.set(ventaId, ventaActualizada);
            
            // Sincronizar con Firebase
            if (window.db && currentUser) {
                await this.sincronizarVentaConFirebase(ventaId, ventaActualizada);
            }
            
            this.calcularEstadisticas();
            this.broadcastUpdate('ventaUpdated', ventaActualizada);
            
            console.log(`✅ Venta actualizada: ${ventaId}`);
            return ventaActualizada;
            
        } catch (error) {
            console.error('Error actualizando venta:', error);
            throw error;
        }
    }

    async eliminarVenta(ventaId) {
        try {
            const venta = this.ventas.get(ventaId);
            if (!venta) {
                throw new Error(`Venta no encontrada: ${ventaId}`);
            }

            this.ventas.delete(ventaId);
            
            // Eliminar de Firebase
            if (window.db && currentUser) {
                await window.db.collection('ventas').doc(ventaId).delete();
            }
            
            // Eliminar offline
            if (window.offlineManager) {
                await window.offlineManager.deleteData('ventas', ventaId);
            }
            
            this.calcularEstadisticas();
            this.broadcastUpdate('ventaDeleted', { id: ventaId });
            
            console.log(`✅ Venta eliminada: ${ventaId}`);
            
        } catch (error) {
            console.error('Error eliminando venta:', error);
            throw error;
        }
    }

    // ==========================================
    // CÁLCULOS Y ESTADÍSTICAS
    // ==========================================

    calcularEstadisticas() {
        const ventasArray = Array.from(this.ventas.values()).filter(v => v.estado === 'completada');
        const ventasDelMes = this.getVentasDelMes();
        const ventasMesAnterior = this.getVentasMesAnterior();
        
        // Cálculos básicos
        this.estadisticas.ingresosDelMes = ventasDelMes.reduce((sum, v) => sum + v.total, 0);
        this.estadisticas.cantidadVendida = ventasDelMes.reduce((sum, v) => sum + v.cantidad, 0);
        this.estadisticas.precioPromedio = ventasDelMes.length > 0 
            ? ventasDelMes.reduce((sum, v) => sum + v.precioKg, 0) / ventasDelMes.length
            : 0;
        
        // Cálculos avanzados con integración de gastos
        if (window.rentabilidadManager) {
            const costosReales = ventasDelMes.filter(v => v.costoEstimado > 0);
            if (costosReales.length > 0) {
                this.estadisticas.costoPromedio = costosReales.reduce((sum, v) => sum + (v.costoEstimado / v.cantidad), 0) / costosReales.length;
                this.estadisticas.margenGanancia = costosReales.reduce((sum, v) => sum + v.margenReal, 0) / costosReales.length;
                this.estadisticas.rentabilidadReal = costosReales.reduce((sum, v) => sum + v.rentabilidad, 0);
            }
        } else {
            // Estimación sin datos de gastos
            this.estadisticas.margenGanancia = 35;
            this.estadisticas.costoPromedio = 8.50;
        }
        
        // Tendencia
        const ingresosMesAnterior = ventasMesAnterior.reduce((sum, v) => sum + v.total, 0);
        if (ingresosMesAnterior > 0) {
            this.estadisticas.tendencia = Math.round(((this.estadisticas.ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100);
        } else {
            this.estadisticas.tendencia = this.estadisticas.ingresosDelMes > 0 ? 100 : 0;
        }
    }

    calcularMetricas() {
        this.calcularEstadisticas();
        return {
            ingresosDelMes: this.estadisticas.ingresosDelMes,
            cantidadVendida: this.estadisticas.cantidadVendida,
            precioPromedio: this.estadisticas.precioPromedio,
            margenGanancia: this.estadisticas.margenGanancia,
            tendencia: this.estadisticas.tendencia,
            costoPromedio: this.estadisticas.costoPromedio,
            rentabilidadReal: this.estadisticas.rentabilidadReal
        };
    }

    // ==========================================
    // OBTENCIÓN DE DATOS INTEGRADA
    // ==========================================

    obtenerVentasFiltradas() {
        let ventas = Array.from(this.ventas.values());
        
        if (this.filtrosActivos.cliente) {
            ventas = ventas.filter(v => v.clienteId === this.filtrosActivos.cliente);
        }
        
        if (this.filtrosActivos.estado) {
            ventas = ventas.filter(v => v.estado === this.filtrosActivos.estado);
        }
        
        if (this.filtrosActivos.metodoPago) {
            ventas = ventas.filter(v => v.metodoPago === this.filtrosActivos.metodoPago);
        }
        
        // Filtro por período
        const fechaInicio = this.getFechaInicioPeriodo(this.filtrosActivos.periodo);
        ventas = ventas.filter(v => v.fecha >= fechaInicio);
        
        return ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    obtenerVenta(ventaId) {
        return this.ventas.get(ventaId) || null;
    }

    obtenerClientesRecientes() {
        if (clientesManagerRef) {
            return clientesManagerRef.obtenerTodos()
                .filter(cliente => cliente.totalVentas > 0)
                .sort((a, b) => new Date(b.ultimaCompra || 0) - new Date(a.ultimaCompra || 0))
                .slice(0, 5)
                .map(cliente => ({
                    id: cliente.id,
                    nombre: cliente.nombre,
                    empresa: cliente.empresa || cliente.nombre,
                    totalCompras: cliente.totalVentas,
                    ultimaCompra: `${cliente.totalVentas > 0 ? Math.floor(cliente.totalVentas / 1000) + ' ventas' : 'Sin ventas'}`,
                    fechaUltimaCompra: cliente.ultimaCompra
                }));
        }
        
        // Fallback sin ClientesManager
        const ventasRecientes = Array.from(this.ventas.values())
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 10);
        
        const clientesMap = new Map();
        
        ventasRecientes.forEach(venta => {
            if (!clientesMap.has(venta.clienteId || venta.cliente)) {
                const key = venta.clienteId || venta.cliente;
                clientesMap.set(key, {
                    id: venta.clienteId,
                    nombre: venta.cliente,
                    empresa: venta.cliente,
                    totalCompras: this.calcularTotalComprasCliente(key),
                    ultimaCompra: venta.cantidad + ' kg',
                    fechaUltimaCompra: venta.fecha
                });
            }
        });
        
        return Array.from(clientesMap.values()).slice(0, 5);
    }

    obtenerListaClientes() {
        if (clientesManagerRef) {
            return clientesManagerRef.obtenerParaSelectores();
        }
        
        // Fallback: extraer de ventas existentes
        const clientesUnicos = new Map();
        Array.from(this.ventas.values()).forEach(venta => {
            if (venta.clienteId && !clientesUnicos.has(venta.clienteId)) {
                clientesUnicos.set(venta.clienteId, {
                    id: venta.clienteId,
                    nombre: venta.cliente,
                    displayName: venta.cliente
                });
            }
        });
        
        return Array.from(clientesUnicos.values());
    }

    // ==========================================
    // ANÁLISIS Y OPORTUNIDADES
    // ==========================================

    async identificarOportunidades() {
        const oportunidades = [];
        
        // Oportunidades basadas en clientes
        if (clientesManagerRef) {
            const clientes = clientesManagerRef.obtenerTodos();
            
            // Clientes sin compras recientes
            clientes.forEach(cliente => {
                if (cliente.ultimaCompra) {
                    const ultimaCompra = new Date(cliente.ultimaCompra);
                    const diasSinCompra = (new Date() - ultimaCompra) / (1000 * 60 * 60 * 24);
                    
                    if (diasSinCompra > 14 && cliente.totalVentas > 10000) {
                        oportunidades.push({
                            titulo: 'Cliente frecuente inactivo',
                            descripcion: `${cliente.nombre} no ha realizado pedidos en ${Math.floor(diasSinCompra)} días`,
                            valorPotencial: Math.round(cliente.totalVentas * 0.1),
                            icono: 'fa-user-clock',
                            accion: 'contactar_cliente',
                            clienteId: cliente.id
                        });
                    }
                }
            });
        }
        
        // Oportunidades de precio
        if (window.preciosManager) {
            const resumenPrecios = window.preciosManager.obtenerResumenPrecios();
            const precioActual = this.estadisticas.precioPromedio;
            
            if (precioActual < resumenPrecios.actual * 0.9) {
                oportunidades.push({
                    titulo: 'Oportunidad de incremento de precio',
                    descripcion: `Precio actual (Q${precioActual.toFixed(2)}) por debajo del mercado (Q${resumenPrecios.actual.toFixed(2)})`,
                    valorPotencial: Math.round((resumenPrecios.actual - precioActual) * this.estadisticas.cantidadVendida),
                    icono: 'fa-chart-line',
                    accion: 'ajustar_precios'
                });
            }
        }
        
        // Oportunidades de negocios abiertos
        if (negociosManagerRef) {
            const negociosAbiertos = negociosManagerRef.obtenerNegociosFiltrados({ estado: 'negociacion' });
            
            if (negociosAbiertos.length > 0) {
                const valorTotal = negociosAbiertos.reduce((sum, n) => sum + n.valor, 0);
                oportunidades.push({
                    titulo: 'Negocios en negociación',
                    descripcion: `${negociosAbiertos.length} negocios esperando cierre`,
                    valorPotencial: valorTotal,
                    icono: 'fa-handshake',
                    accion: 'seguir_negocios'
                });
            }
        }
        
        return oportunidades;
    }

    async generarPrediccionesIA() {
        const predicciones = [];
        
        // Predicción basada en tendencia
        const tendencia = this.estadisticas.tendencia;
        const ingresosActuales = this.estadisticas.ingresosDelMes;
        const proyeccionProximoMes = ingresosActuales * (1 + tendencia / 100);
        
        predicciones.push({
            titulo: 'Ingresos próximo mes',
            valor: `Q ${Math.round(proyeccionProximoMes).toLocaleString()}`,
            confianza: tendencia > 0 ? 85 : 70,
            descripcion: 'Basado en tendencia actual',
            color: tendencia > 0 ? '#22c55e' : '#f59e0b'
        });
        
        // Mejor día para vender
        const ventasPorDia = Array.from(this.ventas.values()).reduce((acc, venta) => {
            const dia = new Date(venta.fecha).getDay();
            acc[dia] = (acc[dia] || 0) + venta.total;
            return acc;
        }, {});
        
        const mejorDia = Object.entries(ventasPorDia).sort((a, b) => b[1] - a[1])[0];
        const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        if (mejorDia) {
            predicciones.push({
                titulo: 'Mejor día para vender',
                valor: nombresDias[mejorDia[0]],
                confianza: 78,
                descripcion: 'Análisis de patrones históricos',
                color: '#3b82f6'
            });
        }
        
        // Cliente más rentable
        if (clientesManagerRef) {
            const clientesMasRentables = clientesManagerRef.obtenerTodos()
                .sort((a, b) => b.totalVentas - a.totalVentas)[0];
            
            if (clientesMasRentables) {
                predicciones.push({
                    titulo: 'Cliente más rentable',
                    valor: clientesMasRentables.nombre,
                    confianza: 92,
                    descripcion: 'Mayor volumen y frecuencia',
                    color: '#f59e0b'
                });
            }
        }
        
        return predicciones;
    }

    // ==========================================
    // VALIDACIONES Y SINCRONIZACIÓN
    // ==========================================

    async validarPrecioVenta(precioIngresado, cantidad) {
        if (!window.preciosManager) {
            return { valido: true, mensaje: 'Sistema de precios no disponible' };
        }
        
        try {
            const resumenPrecios = window.preciosManager.obtenerResumenPrecios();
            const precioMercado = resumenPrecios.mercados?.finca || resumenPrecios.actual || 0;
            
            const diferencia = Math.abs(precioIngresado - precioMercado) / precioMercado * 100;
            
            if (precioIngresado < precioMercado * 0.8) {
                return {
                    valido: false,
                    mensaje: `Precio bajo: Q${precioIngresado} vs mercado Q${precioMercado.toFixed(2)}`,
                    sugerencia: precioMercado
                };
            }
            
            if (diferencia > 30) {
                return {
                    valido: false,
                    mensaje: `Precio difiere ${diferencia.toFixed(1)}% del mercado`
                };
            }
            
            return { valido: true, mensaje: 'Precio validado contra mercado' };
            
        } catch (error) {
            console.error('Error validando precio:', error);
            return { valido: true, mensaje: 'No se pudo validar precio' };
        }
    }

    async sincronizarVentaConFirebase(ventaId, venta) {
        try {
            if (!window.db || !window.firebase) return;
            
            await window.db.collection('ventas').doc(ventaId).set({
                fecha: venta.fecha,
                clienteId: venta.clienteId,
                cliente: venta.cliente,
                cantidad: venta.cantidad,
                precioKg: venta.precioKg,
                total: venta.total,
                metodoPago: venta.metodoPago,
                estado: venta.estado,
                descuento: venta.descuento,
                referencia: venta.referencia,
                direccionEntrega: venta.direccionEntrega,
                observaciones: venta.observaciones,
                negocioId: venta.negocioId,
                costoEstimado: venta.costoEstimado || 0,
                margenReal: venta.margenReal || 0,
                rentabilidad: venta.rentabilidad || 0,
                fechaCreacion: window.firebase.firestore.Timestamp.fromDate(new Date(venta.fechaCreacion)),
                fechaModificacion: window.firebase.firestore.Timestamp.fromDate(new Date(venta.fechaModificacion)),
                usuarioId: venta.usuarioId
            });
            
            console.log(`Venta ${ventaId} sincronizada con Firebase`);
            
        } catch (error) {
            console.error(`Error sincronizando venta ${ventaId}:`, error);
        }
    }

    // ==========================================
    // EVENTOS DE INTEGRACIÓN
    // ==========================================

    onClienteUpdated(cliente, accion) {
        console.log(`🔄 Cliente ${accion} en ventas:`, cliente.nombre);
        
        // Actualizar ventas relacionadas
        Array.from(this.ventas.values()).forEach(venta => {
            if (venta.clienteId === cliente.id) {
                venta.cliente = cliente.nombre;
                this.ventas.set(venta.id, venta);
            }
        });
    }

    onNegocioCreado(negocio) {
        console.log('🤝 Nuevo negocio creado:', negocio.nombre);
        // Aquí podrías crear una venta pendiente o una oportunidad
    }

    onNegocioActualizado(negocio) {
        console.log('🔄 Negocio actualizado:', negocio.nombre);
        
        // Si el negocio se cerró y tiene cantidad estimada, sugerir crear venta
        if (negocio.estado === 'cerrado' && negocio.cantidadEstimada > 0) {
            this.sugerirVentaDesdeNegocio(negocio);
        }
    }

    sugerirVentaDesdeNegocio(negocio) {
        if (window.ventasNotificationManager) {
            window.ventasNotificationManager.info(
                `El negocio "${negocio.nombre}" se cerró. ¿Deseas crear la venta correspondiente?`
            );
        }
        
        // Emitir evento para que la interfaz pueda mostrar una sugerencia
        this.broadcastUpdate('sugerirVentaDesdeNegocio', negocio);
    }

    async syncWithNegocios(venta) {
        if (!negociosManagerRef) return;
        
        // Si la venta no tiene negocioId, buscar si hay algún negocio relacionado
        if (!venta.negocioId && venta.clienteId) {
            const negociosCliente = negociosManagerRef.obtenerNegociosFiltrados({ cliente: venta.clienteId });
            const negocioAbierto = negociosCliente.find(n => n.estado !== 'cerrado');
            
            if (negocioAbierto) {
                // Actualizar la venta con el negocioId
                venta.negocioId = negocioAbierto.id;
                this.ventas.set(venta.id, venta);
                
                // Avanzar el negocio a cerrado
                await negociosManagerRef.avanzarEtapa(negocioAbierto.id);
                
                console.log(`✅ Venta asociada con negocio: ${negocioAbierto.nombre}`);
            }
        }
    }

    // ==========================================
    // CARGA DE DATOS
    // ==========================================

    async cargarDatos() {
        try {
            if (window.db && currentUser) {
                await this.loadFromFirebase();
            } else if (window.offlineManager) {
                await this.loadFromOffline();
            } else {
                this.generarDatosEjemplo();
            }
            
            this.calcularEstadisticas();
            
        } catch (error) {
            console.error('Error cargando datos de ventas:', error);
            this.generarDatosEjemplo();
        }
    }

    async loadFromFirebase() {
        try {
            console.log('Cargando ventas desde Firebase...');
            
            const ventasSnapshot = await window.db.collection('ventas')
                .where('usuarioId', '==', currentUser.uid)
                .orderBy('fechaCreacion', 'desc')
                .limit(100)
                .get();
            
            const ventasArray = [];
            ventasSnapshot.forEach(doc => {
                const data = doc.data();
                ventasArray.push({
                    id: doc.id,
                    ...data,
                    fecha: data.fecha,
                    cliente: data.cliente || 'Cliente no especificado',
                    cantidad: Number(data.cantidad) || 0,
                    precioKg: Number(data.precioKg) || 0,
                    total: Number(data.total) || 0,
                    metodoPago: data.metodoPago || 'efectivo',
                    estado: data.estado || 'completada'
                });
            });
            
            ventasArray.forEach(venta => {
                this.ventas.set(venta.id, venta);
            });
            
            console.log(`Ventas cargadas desde Firebase: ${ventasArray.length}`);
            
        } catch (error) {
            console.error('Error cargando desde Firebase:', error);
            throw error;
        }
    }

    async loadFromOffline() {
        try {
            const ventasData = await window.offlineManager.getAllData('ventas');
            ventasData.forEach(item => {
                this.ventas.set(item.id, item.data);
            });
            
            console.log(`Ventas cargadas desde offline: ${this.ventas.size}`);
            
        } catch (error) {
            console.error('Error cargando desde offline:', error);
            throw error;
        }
    }

    initOfflineMode() {
        console.log('📱 VentasManager en modo offline');
        this.generarDatosEjemplo();
    }

    generarDatosEjemplo() {
        console.log('Generando datos de ejemplo para ventas...');
        
        // Usar clientes del ClientesManager si está disponible
        let clientesDisponibles = [];
        if (clientesManagerRef) {
            clientesDisponibles = clientesManagerRef.obtenerTodos();
        } else {
            // Fallback: clientes de ejemplo
            clientesDisponibles = [
                { id: 'CLI_001', nombre: 'María González', empresa: 'Exportadora Maya' },
                { id: 'CLI_002', nombre: 'Carlos Ruiz', empresa: 'Supermercados Paiz' },
                { id: 'CLI_003', nombre: 'Ana López', empresa: 'Alimentos La Pradera' }
            ];
        }
        
        // Generar ventas de ejemplo
        for (let i = 0; i < 20; i++) {
            const cliente = clientesDisponibles[Math.floor(Math.random() * clientesDisponibles.length)];
            const cantidad = Math.random() * 500 + 50;
            const precioKg = Math.random() * 5 + 8;
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 60));
            
            const venta = {
                id: this.generateId(),
                fecha: fecha.toISOString().split('T')[0],
                clienteId: cliente.id,
                cliente: cliente.nombre,
                cantidad: Math.round(cantidad * 10) / 10,
                precioKg: Math.round(precioKg * 100) / 100,
                total: Math.round(cantidad * precioKg * 100) / 100,
                metodoPago: ['efectivo', 'transferencia', 'credito'][Math.floor(Math.random() * 3)],
                estado: 'completada',
                descuento: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : 0,
                costoEstimado: Math.round(cantidad * 8.5 * 100) / 100,
                margenReal: Math.round(((precioKg - 8.5) / precioKg) * 100 * 100) / 100,
                rentabilidad: Math.round(cantidad * (precioKg - 8.5) * 100) / 100,
                fechaCreacion: fecha.toISOString(),
                fechaModificacion: fecha.toISOString(),
                usuarioId: 'example_user'
            };
            
            this.ventas.set(venta.id, venta);
        }
        
        this.calcularEstadisticas();
    }

    // ==========================================
    // FUNCIONES AUXILIARES
    // ==========================================

    getVentasDelMes() {
        const inicio = this.getStartOfMonth();
        const fin = this.getEndOfMonth();
        
        return Array.from(this.ventas.values()).filter(venta => {
            const fechaVenta = venta.fecha;
            return fechaVenta >= inicio && fechaVenta <= fin && venta.estado === 'completada';
        });
    }

    getVentasMesAnterior() {
        const inicioMesAnterior = this.getStartOfPreviousMonth();
        const finMesAnterior = this.getEndOfPreviousMonth();
        
        return Array.from(this.ventas.values()).filter(venta => {
            const fechaVenta = venta.fecha;
            return fechaVenta >= inicioMesAnterior && fechaVenta <= finMesAnterior && venta.estado === 'completada';
        });
    }

    aplicarFiltros(filtros) {
        this.filtrosActivos = { ...this.filtrosActivos, ...filtros };
    }

    getFechaInicioPeriodo(periodo) {
        const ahora = new Date();
        
        switch (periodo) {
            case 'hoy':
                return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString().split('T')[0];
            case 'semana':
                return new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            case 'mes':
                return this.getStartOfMonth();
            case 'trimestre':
                return new Date(ahora.getFullYear(), Math.floor(ahora.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
            case 'ano':
                return new Date(ahora.getFullYear(), 0, 1).toISOString().split('T')[0];
            default:
                return this.getStartOfMonth();
        }
    }

    getStartOfMonth() {
        const ahora = new Date();
        return new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
    }

    getEndOfMonth() {
        const ahora = new Date();
        return new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    getStartOfPreviousMonth() {
        const ahora = new Date();
        return new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().split('T')[0];
    }

    getEndOfPreviousMonth() {
        const ahora = new Date();
        return new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString().split('T')[0];
    }

    calcularTotalComprasCliente(clienteKey) {
        return Array.from(this.ventas.values())
            .filter(v => v.clienteId === clienteKey || v.cliente === clienteKey)
            .reduce((sum, v) => sum + v.total, 0);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    broadcastUpdate(evento, datos) {
        window.dispatchEvent(new CustomEvent('ventasUpdate', {
            detail: { evento, datos, timestamp: Date.now() }
        }));
        
        // También disparar evento específico
        window.dispatchEvent(new CustomEvent(evento, {
            detail: { venta: datos, timestamp: Date.now() }
        }));
    }

    addEventListener(eventType, callback) {
        window.addEventListener(eventType, callback);
    }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Crear instancia global
let ventasManagerIntegrado;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    ventasManagerIntegrado = new VentasManagerIntegrado();
    window.ventasManager = ventasManagerIntegrado;
    
    console.log('💰 VentasManager integrado disponible globalmente');
});

// Funciones globales para compatibilidad
window.registrarVenta = function(datos) {
    return window.ventasManager?.registrarVenta(datos);
};

window.obtenerVentas = function(filtros) {
    return window.ventasManager?.obtenerVentasFiltradas(filtros);
};

window.calcularMetricasVentas = function() {
    return window.ventasManager?.calcularMetricas();
};

// Función para crear venta desde negocio
window.crearVentaDesdeNegocio = async function(negocio) {
    if (window.ventasManager && negocio) {
        const datosVenta = {
            clienteId: negocio.clienteId,
            cantidad: negocio.cantidadEstimada,
            precioKg: negocio.valor / negocio.cantidadEstimada,
            metodoPago: 'transferencia',
            negocioId: negocio.id,
            observaciones: `Venta generada desde negocio: ${negocio.nombre}`
        };
        
        return await window.ventasManager.registrarVenta(datosVenta);
    }
};

// Exportar para otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VentasManagerIntegrado };
}
