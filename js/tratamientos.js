// ========================================
// SISTEMA DE TRATAMIENTOS - COMPATIBLE CON TU ESTRUCTURA
// Finca La Herradura - Integrado con arboles.js
// ========================================

class TratamientosManager {
    constructor() {
        this.tratamientos = [];
        this.aplicaciones = [];
        this.productos = [];
        this.sectores = [];
        this.arboles = [];
        this.db = null;
        this.vistaTratamientos = 'tarjetas';
        this.inicializando = false;
        this.inicializado = false;
        
        this.init();
    }

    async init() {
        if (this.inicializando) return;
        this.inicializando = true;
        
        console.log('🌿 Iniciando sistema de tratamientos compatible...');
        
        try {
            // Esperar a Firebase (usando tu configuración)
            await this.esperarFirebase();
            
            // Esperar a TreeManager (compatible con tu estructura)
            await this.esperarTreeManagerCompatible();
            
            // Inicializar el resto del sistema
            await this.inicializarSistema();
            
        } catch (error) {
            console.error('❌ Error en inicialización de tratamientos:', error);
            await this.inicializarConDatosDeRespaldo();
        }
    }

    async esperarFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkFirebase = () => {
                attempts++;
                
                // Verificar múltiples formas de acceso (compatible con tu firebase-config.js)
                if (typeof firebase !== 'undefined' && firebase.firestore) {
                    this.db = firebase.firestore();
                    console.log('✅ Firebase disponible para tratamientos');
                    resolve(true);
                } else if (window.firebase && window.firebase.firestore) {
                    this.db = window.firebase.firestore();
                    resolve(true);
                } else if (window.db) {
                    this.db = window.db;
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ Firebase no disponible');
                    resolve(false);
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            checkFirebase();
        });
    }

    async esperarTreeManagerCompatible() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkTreeManager = async () => {
                attempts++;
                
                if (window.treeManager && window.treeManager.inicializado()) {
                    try {
                        // Usar los métodos compatibles con tu estructura
                        this.sectores = await window.treeManager.getSectoresParaFormulario();
                        this.arboles = await window.treeManager.getArbolesParaFormulario();
                        
                        console.log(`✅ TreeManager compatible: ${this.sectores.length} sectores, ${this.arboles.length} árboles`);
                        resolve(true);
                    } catch (error) {
                        console.error('Error obteniendo datos de TreeManager:', error);
                        await this.cargarDatosDeRespaldo();
                        resolve(false);
                    }
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ TreeManager no disponible, usando datos de respaldo');
                    await this.cargarDatosDeRespaldo();
                    resolve(false);
                } else {
                    setTimeout(checkTreeManager, 100);
                }
            };
            
            checkTreeManager();
        });
        
        // También escuchar eventos de TreeManager (compatible con tu arboles.js)
        window.addEventListener('treeManagerReady', async (event) => {
            console.log('🔄 TreeManager listo, actualizando tratamientos');
            try {
                this.sectores = event.detail.sectores || await window.treeManager.getSectoresParaFormulario();
                this.arboles = event.detail.arboles || await window.treeManager.getArbolesParaFormulario();
                this.poblarSelectores();
            } catch (error) {
                console.error('Error actualizando datos desde TreeManager:', error);
            }
        });

        // Escuchar actualizaciones específicas (compatible con tus eventos)
        window.addEventListener('sectorUpdate', () => {
            setTimeout(async () => {
                if (window.treeManager) {
                    this.sectores = await window.treeManager.getSectoresParaFormulario();
                    this.poblarSelectores();
                }
            }, 100);
        });

        window.addEventListener('treeUpdate', () => {
            setTimeout(async () => {
                if (window.treeManager) {
                    this.arboles = await window.treeManager.getArbolesParaFormulario();
                    this.poblarSelectores();
                }
            }, 100);
        });
    }

    async inicializarSistema() {
        await this.cargarTratamientos();
        await this.cargarProductos();
        this.configurarEventListeners();
        this.poblarSelectores();
        this.renderizarTratamientos();
        this.actualizarEstadisticas();
        this.cargarProximosTratamientos();
        this.inicializarGraficos();
        
        this.inicializado = true;
        this.inicializando = false;
        
        console.log('✅ Sistema de tratamientos inicializado correctamente');
        console.log(`📊 Datos: ${this.sectores.length} sectores, ${this.arboles.length} árboles, ${this.tratamientos.length} tratamientos`);
    }

    async inicializarConDatosDeRespaldo() {
        await this.cargarDatosDeRespaldo();
        await this.cargarTratamientos();
        this.configurarEventListeners();
        this.poblarSelectores();
        this.renderizarTratamientos();
        this.actualizarEstadisticas();
        
        this.inicializado = true;
        this.inicializando = false;
        
        console.log('⚠️ Sistema de tratamientos inicializado con datos de respaldo');
    }

    async cargarDatosDeRespaldo() {
        // Usar estructura compatible con tu sistema
        this.sectores = [
            { id: 'SECTOR_NORTE', nombre: 'Sector Norte', codigo: 'SEC-N' },
            { id: 'SECTOR_SUR', nombre: 'Sector Sur', codigo: 'SEC-S' },
            { id: 'SECTOR_ESTE', nombre: 'Sector Este', codigo: 'SEC-E' }
        ];
        
        this.arboles = [
            { id: 'arbol-1', codigo: 'A-001', sectorId: 'SECTOR_NORTE', sector: 'Sector Norte' },
            { id: 'arbol-2', codigo: 'A-002', sectorId: 'SECTOR_NORTE', sector: 'Sector Norte' },
            { id: 'arbol-3', codigo: 'A-003', sectorId: 'SECTOR_SUR', sector: 'Sector Sur' }
        ];
    }

    poblarSelectores() {
        console.log('🔄 Poblando selectores de tratamientos...');
        
        // Selector de sectores en filtros
        const filtroSector = document.getElementById('filtroSector');
        if (filtroSector && this.sectores.length > 0) {
            filtroSector.innerHTML = '<option value="">Todos los sectores</option>';
            this.sectores.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector.id;
                option.textContent = `${sector.nombre || sector.codigo} (${this.contarArbolesSector(sector.id)} árboles)`;
                filtroSector.appendChild(option);
            });
            console.log(`✅ Filtro poblado con ${this.sectores.length} sectores`);
        }

        // Selector de sector en modal
        const selectorSector = document.querySelector('select[name="sector"]');
        if (selectorSector && this.sectores.length > 0) {
            selectorSector.innerHTML = '<option value="">Seleccionar sector</option>';
            this.sectores.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector.id;
                option.textContent = `${sector.nombre || sector.codigo} (${this.contarArbolesSector(sector.id)} árboles)`;
                selectorSector.appendChild(option);
            });
        }

        // Selector de árboles específicos
        const selectorArboles = document.querySelector('select[name="arboles"]');
        if (selectorArboles && this.arboles.length > 0) {
            selectorArboles.innerHTML = '';
            this.arboles.forEach(arbol => {
                const option = document.createElement('option');
                option.value = arbol.id;
                const sectorNombre = this.getSectorName(arbol.sectorId);
                option.textContent = `${arbol.codigo || arbol.id} - ${sectorNombre}`;
                selectorArboles.appendChild(option);
            });
        }

        // Mostrar información de debug
        console.log(`📊 Selectores actualizados: ${this.sectores.length} sectores, ${this.arboles.length} árboles`);
    }

    contarArbolesSector(sectorId) {
        return this.arboles.filter(a => a.sectorId === sectorId || a.sector === sectorId).length;
    }

    getSectorName(sectorId) {
        const sector = this.sectores.find(s => s.id === sectorId);
        return sector ? (sector.nombre || sector.codigo) : sectorId || 'Sin sector';
    }

    async cargarTratamientos() {
        try {
            if (this.db) {
                const snapshot = await this.db.collection('tratamientos').orderBy('fechaProgramada', 'desc').get();
                this.tratamientos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    fechaProgramada: doc.data().fechaProgramada?.toDate(),
                    fechaCreacion: doc.data().fechaCreacion?.toDate()
                }));
                
                console.log(`✅ ${this.tratamientos.length} tratamientos cargados desde Firebase`);
            } else {
                this.tratamientos = [];
            }
        } catch (error) {
            console.error('Error cargando tratamientos:', error);
            this.tratamientos = this.generarTratamientosEjemplo();
        }
    }

    async cargarProductos() {
        try {
            if (this.db) {
                const snapshot = await this.db.collection('productos-tratamiento').get();
                this.productos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                this.productos = [
                    { id: 'p1', nombre: 'Fungicida Cobre', tipo: 'fungicida', dosisRecomendada: 2.5 },
                    { id: 'p2', nombre: 'Insecticida Orgánico', tipo: 'insecticida', dosisRecomendada: 1.5 },
                    { id: 'p3', nombre: 'Fertilizante Foliar', tipo: 'fertilizante', dosisRecomendada: 3.0 }
                ];
            }
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.productos = [];
        }
    }

    // ==================== RESTO DE FUNCIONES (manteniendo tu estructura) ====================
    
    configurarEventListeners() {
        // Radio buttons para tipo de aplicación
        const radioSector = document.getElementById('aplicacionSector');
        const radioArboles = document.getElementById('aplicacionArboles');
        const selectorSector = document.getElementById('selectorSector');
        const selectorArboles = document.getElementById('selectorArboles');

        if (radioSector && radioArboles) {
            radioSector.addEventListener('change', () => {
                if (radioSector.checked) {
                    selectorSector.style.display = 'block';
                    selectorArboles.style.display = 'none';
                }
            });

            radioArboles.addEventListener('change', () => {
                if (radioArboles.checked) {
                    selectorSector.style.display = 'none';
                    selectorArboles.style.display = 'block';
                }
            });
        }

        // Checkbox repetición
        const checkRepetir = document.querySelector('input[name="repetir"]');
        const opcionesRepeticion = document.getElementById('opcionesRepeticion');
        if (checkRepetir) {
            checkRepetir.addEventListener('change', () => {
                opcionesRepeticion.style.display = checkRepetir.checked ? 'block' : 'none';
            });
        }

        // Filtros
        document.getElementById('filtroSector')?.addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filtroEstado')?.addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filtroTipo')?.addEventListener('change', () => this.aplicarFiltros());
    }

    async guardarNuevoTratamiento() {
        if (!this.db) {
            this.mostrarAlerta('Firebase no disponible', 'error');
            return;
        }

        const form = document.getElementById('formNuevoTratamiento');
        const formData = new FormData(form);
        
        try {
            const tratamientoData = {
                nombre: formData.get('nombre'),
                tipo: formData.get('tipo'),
                producto: formData.get('producto'),
                dosisPorArbol: parseFloat(formData.get('dosisPorArbol')),
                concentracion: parseFloat(formData.get('concentracion')),
                tipoAplicacion: formData.get('tipoAplicacion'),
                sector: formData.get('sector'),
                arboles: formData.getAll('arboles'),
                fechaProgramada: firebase.firestore.Timestamp.fromDate(new Date(formData.get('fechaProgramada') + 'T' + formData.get('hora'))),
                responsable: formData.get('responsable'),
                observaciones: formData.get('observaciones'),
                estado: 'programado',
                fechaCreacion: firebase.firestore.Timestamp.now(),
                repetir: formData.get('repetir') === 'on',
                frecuencia: formData.get('frecuencia') || null
            };

            // Calcular cantidad total necesaria
            let cantidadArbolesAfectados = 0;
            if (tratamientoData.tipoAplicacion === 'sector' && tratamientoData.sector) {
                cantidadArbolesAfectados = this.contarArbolesSector(tratamientoData.sector);
            } else {
                cantidadArbolesAfectados = tratamientoData.arboles.length;
            }
            
            tratamientoData.cantidadTotalEstimada = (cantidadArbolesAfectados * tratamientoData.dosisPorArbol / 1000);
            tratamientoData.arbolesAfectados = cantidadArbolesAfectados;

            const docRef = await this.db.collection('tratamientos').add(tratamientoData);
            
            // Agregar a la lista local
            this.tratamientos.unshift({
                id: docRef.id,
                ...tratamientoData,
                fechaProgramada: tratamientoData.fechaProgramada.toDate(),
                fechaCreacion: tratamientoData.fechaCreacion.toDate()
            });

            // Programar repeticiones si es necesario
            if (tratamientoData.repetir) {
                await this.programarRepeticiones(docRef.id, tratamientoData);
            }

            // Cerrar modal y actualizar vista
            bootstrap.Modal.getInstance(document.getElementById('modalNuevoTratamiento')).hide();
            form.reset();
            
            this.renderizarTratamientos();
            this.actualizarEstadisticas();
            
            this.mostrarAlerta('Tratamiento programado correctamente', 'success');

        } catch (error) {
            console.error('Error guardando tratamiento:', error);
            this.mostrarAlerta('Error al guardar el tratamiento', 'error');
        }
    }

    async programarRepeticiones(tratamientoBaseId, datosBase) {
        const repeticiones = [];
        const fechaBase = datosBase.fechaProgramada.toDate();
        
        for (let i = 1; i <= 12; i++) {
            const nuevaFecha = new Date(fechaBase);
            
            switch (datosBase.frecuencia) {
                case 'semanal':
                    nuevaFecha.setDate(nuevaFecha.getDate() + (i * 7));
                    break;
                case 'quincenal':
                    nuevaFecha.setDate(nuevaFecha.getDate() + (i * 15));
                    break;
                case 'mensual':
                    nuevaFecha.setMonth(nuevaFecha.getMonth() + i);
                    break;
            }

            repeticiones.push({
                ...datosBase,
                fechaProgramada: firebase.firestore.Timestamp.fromDate(nuevaFecha),
                tratamientoMadreId: tratamientoBaseId,
                repeticionNumero: i
            });
        }

        // Guardar repeticiones en lote
        const batch = this.db.batch();
        repeticiones.forEach(rep => {
            const docRef = this.db.collection('tratamientos').doc();
            batch.set(docRef, rep);
        });

        await batch.commit();
    }

    mostrarModalAplicarTratamiento(tratamientoId) {
        const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
        if (!tratamiento) return;

        const modal = document.getElementById('modalAplicarTratamiento');
        const form = document.getElementById('formAplicarTratamiento');
        
        form.querySelector('input[name="tratamientoId"]').value = tratamientoId;
        form.querySelector('input[name="fechaAplicacion"]').value = new Date().toISOString().slice(0, 16);
        form.querySelector('input[name="cantidadAplicada"]').value = tratamiento.cantidadTotalEstimada;
        
        new bootstrap.Modal(modal).show();
    }

    async confirmarAplicacionTratamiento() {
        if (!this.db) {
            this.mostrarAlerta('Firebase no disponible', 'error');
            return;
        }

        const form = document.getElementById('formAplicarTratamiento');
        const formData = new FormData(form);
        const tratamientoId = formData.get('tratamientoId');

        try {
            const aplicacionData = {
                tratamientoId,
                fechaAplicacion: firebase.firestore.Timestamp.fromDate(new Date(formData.get('fechaAplicacion'))),
                cantidadAplicada: parseFloat(formData.get('cantidadAplicada')),
                condicionesClimaticas: formData.get('condicionesClimaticas'),
                observaciones: formData.get('observacionesAplicacion'),
                fechaRegistro: firebase.firestore.Timestamp.now()
            };

            // Guardar aplicación
            await this.db.collection('aplicaciones-tratamiento').add(aplicacionData);

            // Actualizar estado del tratamiento
            await this.db.collection('tratamientos').doc(tratamientoId).update({
                estado: 'aplicado',
                fechaAplicacion: aplicacionData.fechaAplicacion,
                cantidadAplicada: aplicacionData.cantidadAplicada
            });

            // Actualizar localmente
            const tratamiento = this.tratamientos.find(t => t.id === tratamientoId);
            if (tratamiento) {
                tratamiento.estado = 'aplicado';
                tratamiento.fechaAplicacion = aplicacionData.fechaAplicacion.toDate();
                tratamiento.cantidadAplicada = aplicacionData.cantidadAplicada;
            }

            bootstrap.Modal.getInstance(document.getElementById('modalAplicarTratamiento')).hide();
            
            this.renderizarTratamientos();
            this.actualizarEstadisticas();
            
            this.mostrarAlerta('Aplicación registrada correctamente', 'success');

        } catch (error) {
            console.error('Error registrando aplicación:', error);
            this.mostrarAlerta('Error al registrar la aplicación', 'error');
        }
    }

    renderizarTratamientos() {
        const container = document.getElementById('listaTratamientos');
        if (!container) return;

        if (this.tratamientos.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-spray-can fa-3x mb-3"></i>
                    <p>No hay tratamientos programados</p>
                    <button class="btn btn-primary" onclick="mostrarModalNuevoTratamiento()">
                        Crear Primer Tratamiento
                    </button>
                </div>
            `;
            return;
        }

        if (this.vistaTratamientos === 'tarjetas') {
            this.renderizarTarjetas();
        } else {
            this.renderizarTabla();
        }
    }

    renderizarTarjetas() {
        const container = document.getElementById('listaTratamientos');
        
        container.innerHTML = this.tratamientos.map(tratamiento => {
            const estadoClass = `status-${tratamiento.estado}`;
            const fechaFormateada = this.formatearFecha(tratamiento.fechaProgramada);
            const esVencido = new Date() > tratamiento.fechaProgramada && tratamiento.estado === 'programado';
            
            return `
                <div class="aplicacion-card">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-1">${tratamiento.nombre}</h6>
                        <span class="status-badge ${esVencido ? 'status-vencido' : estadoClass}">
                            ${esVencido ? 'Vencido' : this.obtenerTextoEstado(tratamiento.estado)}
                        </span>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <p class="text-muted mb-1">
                                <i class="fas fa-calendar me-1"></i> ${fechaFormateada}
                                <i class="fas fa-user ms-3 me-1"></i> ${tratamiento.responsable || 'Sin asignar'}
                            </p>
                            <p class="text-muted mb-2">
                                <i class="fas fa-flask me-1"></i> ${tratamiento.producto}
                                <i class="fas fa-tint ms-3 me-1"></i> ${tratamiento.cantidadTotalEstimada?.toFixed(1) || 0}L estimados
                            </p>
                            
                            ${this.renderizarSectoresAfectados(tratamiento)}
                            
                            ${tratamiento.observaciones ? 
                                `<p class="small text-muted"><i class="fas fa-comment me-1"></i> ${tratamiento.observaciones}</p>` : 
                                ''
                            }
                        </div>
                        <div class="col-md-4 text-end">
                            ${this.renderizarBotonesTratamiento(tratamiento)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderizarSectoresAfectados(tratamiento) {
        if (tratamiento.tipoAplicacion === 'sector' && tratamiento.sector) {
            const sectorNombre = this.getSectorName(tratamiento.sector);
            return `<div class="mb-2">
                <span class="sector-badge">${sectorNombre}</span>
                <small class="text-muted ms-2">${tratamiento.arbolesAfectados || 0} árboles</small>
            </div>`;
        } else if (tratamiento.arboles && tratamiento.arboles.length > 0) {
            return `<div class="mb-2">
                <small class="text-muted">${tratamiento.arboles.length} árboles específicos</small>
            </div>`;
        }
        return '';
    }

    renderizarBotonesTratamiento(tratamiento) {
        const botones = [];
        
        if (tratamiento.estado === 'programado') {
            botones.push(`
                <button class="btn btn-success btn-sm mb-1" onclick="tratamientosManager.mostrarModalAplicarTratamiento('${tratamiento.id}')">
                    <i class="fas fa-check"></i> Aplicar
                </button>
            `);
        }
        
        if (tratamiento.estado === 'aplicado' && tratamiento.fechaAplicacion) {
            const fechaAplicacion = this.formatearFecha(tratamiento.fechaAplicacion);
            botones.push(`
                <small class="text-success d-block">
                    <i class="fas fa-check-circle"></i> Aplicado: ${fechaAplicacion}
                </small>
            `);
        }
        
        botones.push(`
            <button class="btn btn-outline-primary btn-sm" onclick="tratamientosManager.editarTratamiento('${tratamiento.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="tratamientosManager.eliminarTratamiento('${tratamiento.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `);
        
        return botones.join(' ');
    }

    actualizarEstadisticas() {
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);

        const stats = {
            total: this.tratamientos.filter(t => t.estado === 'programado').length,
            pendientesHoy: this.tratamientos.filter(t => 
                t.estado === 'programado' && 
                t.fechaProgramada <= finDia
            ).length,
            completadosEsteMes: this.tratamientos.filter(t =>
                t.estado === 'aplicado' &&
                t.fechaAplicacion >= inicioMes
            ).length,
            litrosAplicados: this.tratamientos
                .filter(t => t.estado === 'aplicado' && t.fechaAplicacion >= inicioMes)
                .reduce((total, t) => total + (t.cantidadAplicada || 0), 0)
        };

        document.getElementById('totalTratamientos').textContent = stats.total;
        document.getElementById('tratamientosPendientes').textContent = stats.pendientesHoy;
        document.getElementById('tratamientosCompletados').textContent = stats.completadosEsteMes;
        document.getElementById('litrosAplicados').textContent = `${stats.litrosAplicados.toFixed(1)}L`;
    }

    aplicarFiltros() {
        const filtroSector = document.getElementById('filtroSector').value;
        const filtroEstado = document.getElementById('filtroEstado').value;
        const filtroTipo = document.getElementById('filtroTipo').value;

        let tratamientosFiltrados = [...this.tratamientos];

        if (filtroSector) {
            tratamientosFiltrados = tratamientosFiltrados.filter(t => t.sector === filtroSector);
        }

        if (filtroEstado) {
            tratamientosFiltrados = tratamientosFiltrados.filter(t => {
                if (filtroEstado === 'vencido') {
                    return new Date() > t.fechaProgramada && t.estado === 'programado';
                }
                return t.estado === filtroEstado;
            });
        }

        if (filtroTipo) {
            tratamientosFiltrados = tratamientosFiltrados.filter(t => t.tipo === filtroTipo);
        }

        const tratamientosOriginales = this.tratamientos;
        this.tratamientos = tratamientosFiltrados;
        this.renderizarTratamientos();
        this.tratamientos = tratamientosOriginales;
    }

    formatearFecha(fecha) {
        if (!fecha) return 'Sin fecha';
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(fecha);
    }

    obtenerTextoEstado(estado) {
        const estados = {
            'programado': 'Programado',
            'aplicado': 'Aplicado',
            'cancelado': 'Cancelado'
        };
        return estados[estado] || estado;
    }

    mostrarAlerta(mensaje, tipo = 'info') {
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    }

    generarTratamientosEjemplo() {
        if (this.sectores.length === 0) return [];
        
        const ahora = new Date();
        const sector = this.sectores[0];
        
        return [
            {
                id: 'trat1',
                nombre: `Tratamiento Fungicida ${sector.nombre}`,
                tipo: 'fungicida',
                producto: 'Cobre Pentahidratado',
                dosisPorArbol: 2.5,
                concentracion: 0.5,
                tipoAplicacion: 'sector',
                sector: sector.id,
                fechaProgramada: new Date(ahora.getTime() + 24 * 60 * 60 * 1000),
                responsable: 'Juan Pérez',
                estado: 'programado',
                cantidadTotalEstimada: 15.5,
                arbolesAfectados: this.contarArbolesSector(sector.id) || 25,
                fechaCreacion: new Date()
            }
        ];
    }

    cargarProximosTratamientos() {
        // Implementar carga de próximos tratamientos en sidebar
    }

    inicializarGraficos() {
        // Implementar gráficos de efectividad
    }

    cambiarVista(vista) {
        this.vistaTratamientos = vista;
        this.renderizarTratamientos();
    }

    renderizarTabla() {
        // Implementar vista de tabla si es necesaria
    }

    editarTratamiento(id) {
        console.log('Editar tratamiento:', id);
    }

    eliminarTratamiento(id) {
        console.log('Eliminar tratamiento:', id);
    }
}

// Funciones globales para el HTML
window.mostrarModalNuevoTratamiento = function() {
    new bootstrap.Modal(document.getElementById('modalNuevoTratamiento')).show();
};

window.guardarNuevoTratamiento = function() {
    if (window.tratamientosManager) {
        window.tratamientosManager.guardarNuevoTratamiento();
    }
};

window.confirmarAplicacionTratamiento = function() {
    if (window.tratamientosManager) {
        window.tratamientosManager.confirmarAplicacionTratamiento();
    }
};

window.aplicarFiltros = function() {
    if (window.tratamientosManager) {
        window.tratamientosManager.aplicarFiltros();
    }
};

window.cambiarVista = function(vista) {
    if (window.tratamientosManager) {
        window.tratamientosManager.cambiarVista(vista);
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.tratamientosManager = new TratamientosManager();
});

console.log('🌿 Sistema de tratamientos compatible cargado - Versión integrada con estructura existente');
