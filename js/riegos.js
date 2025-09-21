// ========================================
// SISTEMA DE RIEGO CORREGIDO - 100% RESPONSIVE
// Finca La Herradura - Totalmente integrado con TreeManagerv1
// ========================================

class RiegoManager {
    constructor() {
        this.sectores = [];
        this.arboles = [];
        this.programasRiego = [];
        this.riegosActivos = new Map();
        this.db = null;
        this.timers = new Map();
        this.sensores = new Map();
        this.inicializando = false;
        this.inicializado = false;
        this.usingMockData = false;
        this.estadoGeneral = {
            presion: 2.5,
            caudal: 0,
            caudalPromedio: 45,
            sistemaActivo: false
        };
        
        this.init();
    }

    async init() {
        if (this.inicializando) return;
        this.inicializando = true;
        
        console.log('💧 Iniciando sistema de riego corregido...');
        
        try {
            await this.esperarFirebase();
            await this.esperarTreeManagerCorregido();
            await this.inicializarSistema();
        } catch (error) {
            console.error('❌ Error en inicialización de riegos:', error);
            await this.inicializarConDatosDeRespaldo();
        }
    }

    async esperarFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkFirebase = () => {
                attempts++;
                
                if (window.db && window.auth) {
                    this.db = window.db;
                    console.log('✅ Firebase servicios disponibles para riegos');
                    resolve(true);
                } else if (typeof firebase !== 'undefined' && firebase.firestore) {
                    this.db = firebase.firestore();
                    console.log('✅ Firebase directo disponible para riegos');
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ Firebase no disponible para riegos, usando modo offline');
                    this.usingMockData = true;
                    resolve(false);
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            const firebaseReadyHandler = (event) => {
                console.log('🔥 Firebase ready event recibido en riegos');
                this.db = event.detail.db || window.db;
                this.usingMockData = event.detail.isMock || false;
                window.removeEventListener('firebaseReady', firebaseReadyHandler);
                resolve(true);
            };
            
            window.addEventListener('firebaseReady', firebaseReadyHandler);
            checkFirebase();
        });
    }

    async esperarTreeManagerCorregido() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 150;
            
            const checkTreeManager = async () => {
                attempts++;
                
                // CORREGIDO: Usar la API correcta de TreeManager
                if (window.treeManager && window.treeManager.isInitialized) {
                    try {
                        console.log('✅ TreeManager detectado, obteniendo datos...');
                        
                        const sectoresData = await window.treeManager.getSectoresParaFormulario();
                        const arbolesData = await window.treeManager.getArbolesParaFormulario();
                        
                        // Convertir a formato compatible
                        this.sectores = sectoresData.map(s => ({
                            id: s.value,
                            nombre: s.name || s.label.replace('📦 ', '').split(' - ')[1] || s.label,
                            codigo: s.correlative || s.value,
                            area: 0,
                            estado: 'activo'
                        }));
                        
                        this.arboles = arbolesData.map(a => ({
                            id: a.value,
                            codigo: a.correlative || a.value,
                            sectorId: a.blockId || a.value,
                            sector: a.sectorName || 'Sin sector'
                        }));
                        
                        console.log(`✅ TreeManager integrado: ${this.sectores.length} sectores, ${this.arboles.length} árboles`);
                        resolve(true);
                        
                    } catch (error) {
                        console.error('❌ Error obteniendo datos de TreeManager:', error);
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
        
        // Escuchar eventos de TreeManager
        window.addEventListener('treeManagerReady', async (event) => {
            console.log('🌳 TreeManager ready event recibido en riegos');
            try {
                if (event.detail) {
                    await this.actualizarDatosDesdeTreeManager();
                }
            } catch (error) {
                console.error('❌ Error actualizando datos desde TreeManager event:', error);
            }
        });

        // Escuchar actualizaciones específicas
        window.addEventListener('sectorCreated', () => this.actualizarDatosDesdeTreeManager());
        window.addEventListener('sectorUpdated', () => this.actualizarDatosDesdeTreeManager());
        window.addEventListener('treeCreated', () => this.actualizarDatosDesdeTreeManager());
        window.addEventListener('treeUpdated', () => this.actualizarDatosDesdeTreeManager());
    }

    async actualizarDatosDesdeTreeManager() {
        setTimeout(async () => {
            if (window.treeManager && window.treeManager.isInitialized) {
                try {
                    const sectoresData = await window.treeManager.getSectoresParaFormulario();
                    const arbolesData = await window.treeManager.getArbolesParaFormulario();
                    
                    this.sectores = sectoresData.map(s => ({
                        id: s.value,
                        nombre: s.name || s.label.replace('📦 ', '').split(' - ')[1] || s.label,
                        codigo: s.correlative || s.value,
                        area: 0,
                        estado: 'activo'
                    }));
                    
                    this.arboles = arbolesData.map(a => ({
                        id: a.value,
                        codigo: a.correlative || a.value,
                        sectorId: a.blockId || a.value,
                        sector: a.sectorName || 'Sin sector'
                    }));
                    
                    this.inicializarEstadoRiegoPorSector();
                    this.poblarSelectores();
                    this.renderizarSectores();
                    console.log('🔄 Datos sincronizados con TreeManager');
                } catch (error) {
                    console.error('❌ Error sincronizando con TreeManager:', error);
                }
            }
        }, 200);
    }

    async inicializarSistema() {
        this.inicializarEstadoRiegoPorSector();
        await this.cargarProgramasRiego();
        await this.cargarEstadoSensores();
        this.configurarEventListeners();
        this.poblarSelectores();
        this.renderizarSectores();
        this.actualizarEstadisticas();
        this.iniciarMonitoreo();
        this.cargarProximosRiegos();
        this.cargarHistorialReciente();
        this.aplicarMejorasResponsive();
        
        this.inicializado = true;
        this.inicializando = false;
        
        console.log('✅ Sistema de riego inicializado correctamente');
        console.log(`📊 Datos: ${this.sectores.length} sectores, ${this.arboles.length} árboles`);
        console.log(`🔧 Modo: ${this.usingMockData ? 'Mock/Offline' : 'Firebase Online'}`);
    }

    async inicializarConDatosDeRespaldo() {
        await this.cargarDatosDeRespaldo();
        this.inicializarEstadoRiegoPorSector();
        await this.cargarProgramasRiego();
        this.configurarEventListeners();
        this.poblarSelectores();
        this.renderizarSectores();
        this.actualizarEstadisticas();
        this.iniciarMonitoreo();
        this.aplicarMejorasResponsive();
        
        this.inicializado = true;
        this.inicializando = false;
        
        console.log('⚠️ Sistema de riego inicializado con datos de respaldo');
    }

    async cargarDatosDeRespaldo() {
        console.log('📦 Cargando datos de respaldo para riegos...');
        
        this.sectores = [
            { id: 'SECTOR_NORTE', nombre: 'Sector Norte', codigo: 'S0001', area: 2.5, estado: 'activo' },
            { id: 'SECTOR_SUR', nombre: 'Sector Sur', codigo: 'S0002', area: 3.0, estado: 'activo' },
            { id: 'SECTOR_ESTE', nombre: 'Sector Este', codigo: 'S0003', area: 1.8, estado: 'activo' },
            { id: 'SECTOR_OESTE', nombre: 'Sector Oeste', codigo: 'S0004', area: 2.2, estado: 'activo' }
        ];
        
        this.arboles = [
            { id: 'arbol-1', codigo: '00001', sectorId: 'SECTOR_NORTE', sector: 'Sector Norte' },
            { id: 'arbol-2', codigo: '00002', sectorId: 'SECTOR_NORTE', sector: 'Sector Norte' },
            { id: 'arbol-3', codigo: '00003', sectorId: 'SECTOR_SUR', sector: 'Sector Sur' },
            { id: 'arbol-4', codigo: '00004', sectorId: 'SECTOR_SUR', sector: 'Sector Sur' },
            { id: 'arbol-5', codigo: '00005', sectorId: 'SECTOR_ESTE', sector: 'Sector Este' },
            { id: 'arbol-6', codigo: '00006', sectorId: 'SECTOR_OESTE', sector: 'Sector Oeste' }
        ];
        
        this.usingMockData = true;
    }

    // ==========================================
    // MEJORAS RESPONSIVE
    // ==========================================

    aplicarMejorasResponsive() {
        console.log('📱 Aplicando mejoras responsive al sistema de riego...');
        
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        
        this.ajustarLayoutResponsive(isMobile, isTablet);
        
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                const newIsMobile = window.innerWidth <= 768;
                const newIsTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
                this.ajustarLayoutResponsive(newIsMobile, newIsTablet);
            }, 250);
        });
        
        this.mejorarInteraccionesTactiles();
    }

    ajustarLayoutResponsive(isMobile, isTablet) {
        const mainContent = document.querySelector('.main-content');
        const controlesRapidos = document.getElementById('controlesRapidos');
        const headerActions = document.querySelector('.header-actions');
        
        if (mainContent) {
            mainContent.classList.toggle('mobile-layout', isMobile);
            mainContent.classList.toggle('tablet-layout', isTablet);
        }
        
        if (controlesRapidos) {
            if (isMobile) {
                controlesRapidos.className = 'row g-2';
                controlesRapidos.style.margin = '0 -0.5rem';
            } else if (isTablet) {
                controlesRapidos.className = 'row g-3';
            } else {
                controlesRapidos.className = 'row g-3';
            }
        }
        
        if (headerActions) {
            if (isMobile) {
                headerActions.classList.add('flex-column', 'gap-2', 'w-100');
                const buttons = headerActions.querySelectorAll('.btn');
                buttons.forEach(btn => {
                    btn.classList.add('w-100', 'justify-content-center');
                });
            } else {
                headerActions.classList.remove('flex-column', 'gap-2', 'w-100');
                const buttons = headerActions.querySelectorAll('.btn');
                buttons.forEach(btn => {
                    btn.classList.remove('w-100', 'justify-content-center');
                });
            }
        }
    }

    mejorarInteraccionesTactiles() {
        const botonesSmall = document.querySelectorAll('.btn-sm');
        botonesSmall.forEach(btn => {
            if (window.innerWidth <= 768) {
                btn.style.minHeight = '44px';
                btn.style.minWidth = '44px';
                btn.style.padding = '0.5rem';
            }
        });
        
        const tables = document.querySelectorAll('.table-container');
        tables.forEach(table => {
            if (window.innerWidth <= 768) {
                table.style.overflowX = 'auto';
                table.style.WebkitOverflowScrolling = 'touch';
            }
        });
    }

    // ==========================================
    // RESTO DE MÉTODOS PRINCIPALES
    // ==========================================

    inicializarEstadoRiegoPorSector() {
        console.log('🔄 Inicializando estado de riego por sectores...');
        
        this.sectores.forEach(sector => {
            if (!this.riegosActivos.has(sector.id)) {
                this.riegosActivos.set(sector.id, {
                    activo: false,
                    inicio: null,
                    duracion: 0,
                    progreso: 0,
                    caudal: 0,
                    programa: null
                });
            }
        });
        
        console.log(`✅ Estado de riego inicializado para ${this.sectores.length} sectores`);
    }

    poblarSelectores() {
        console.log('🔄 Poblando selectores de riego...');
        
        const selectorSector = document.querySelector('select[name="sector"]');
        if (selectorSector && this.sectores.length > 0) {
            selectorSector.innerHTML = '<option value="">Seleccionar sector</option>';
            this.sectores.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector.id;
                option.textContent = `${sector.nombre || sector.codigo} (${this.contarArbolesSector(sector.id)} árboles)`;
                selectorSector.appendChild(option);
            });
            console.log(`✅ Selector poblado con ${this.sectores.length} sectores`);
        }
    }

    contarArbolesSector(sectorId) {
        return this.arboles.filter(a => a.sectorId === sectorId).length;
    }

    getSectorName(sectorId) {
        const sector = this.sectores.find(s => s.id === sectorId);
        return sector ? (sector.nombre || sector.codigo) : sectorId || 'Sector';
    }

    async cargarProgramasRiego() {
        try {
            if (this.db && !this.usingMockData) {
                const snapshot = await this.db.collection('programas-riego')
                    .orderBy('fechaCreacion', 'desc')
                    .get();
                
                this.programasRiego = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    fechaProgramada: doc.data().fechaProgramada?.toDate(),
                    fechaCreacion: doc.data().fechaCreacion?.toDate()
                }));
                
                console.log(`✅ ${this.programasRiego.length} programas de riego cargados desde Firebase`);
            } else {
                this.programasRiego = this.generarProgramasEjemplo();
                console.log(`📦 ${this.programasRiego.length} programas de ejemplo generados`);
            }
        } catch (error) {
            console.error('❌ Error cargando programas de riego:', error);
            this.programasRiego = this.generarProgramasEjemplo();
        }
    }

    async cargarEstadoSensores() {
        try {
            if (this.db && !this.usingMockData) {
                const snapshot = await this.db.collection('sensores-riego').get();
                snapshot.docs.forEach(doc => {
                    this.sensores.set(doc.id, {
                        id: doc.id,
                        ...doc.data(),
                        ultimaActualizacion: doc.data().ultimaActualizacion?.toDate()
                    });
                });
                console.log(`✅ ${this.sensores.size} sensores de riego cargados`);
            }
        } catch (error) {
            console.error('❌ Error cargando sensores:', error);
        }
        
        // Generar sensores de ejemplo para cada sector
        this.sectores.forEach(sector => {
            if (!this.sensores.has(sector.id)) {
                this.sensores.set(sector.id, {
                    id: sector.id,
                    humedad: 30 + Math.random() * 40,
                    temperatura: 20 + Math.random() * 15,
                    presion: 2.0 + Math.random() * 1.5,
                    activo: true,
                    ultimaActualizacion: new Date()
                });
            }
        });
    }

    configurarEventListeners() {
        const tipoProgramacion = document.querySelector('select[name="tipoProgramacion"]');
        if (tipoProgramacion) {
            tipoProgramacion.addEventListener('change', this.cambiarTipoProgramacion);
        }

        const checkRepetir = document.querySelector('input[name="repetir"]');
        const opcionesRepeticion = document.getElementById('opcionesRepeticion');
        if (checkRepetir && opcionesRepeticion) {
            checkRepetir.addEventListener('change', () => {
                opcionesRepeticion.style.display = checkRepetir.checked ? 'block' : 'none';
            });
        }
    }

    cambiarTipoProgramacion() {
        const tipo = document.querySelector('select[name="tipoProgramacion"]')?.value;
        const opcionesProgramado = document.getElementById('opcionesProgramado');
        const opcionesAutomatico = document.getElementById('opcionesAutomatico');
        
        if (opcionesProgramado) {
            opcionesProgramado.style.display = tipo === 'programado' ? 'block' : 'none';
        }
        if (opcionesAutomatico) {
            opcionesAutomatico.style.display = tipo === 'automatico' ? 'block' : 'none';
        }
    }
async guardarNuevoRiego() {
        const form = document.getElementById('formNuevoRiego');
        if (!form) {
            this.mostrarAlerta('Formulario no encontrado', 'error');
            return;
        }

        const formData = new FormData(form);
        
        try {
            const programaData = {
                nombre: formData.get('nombre'),
                sector: formData.get('sector'),
                duracion: parseInt(formData.get('duracion')),
                caudal: parseFloat(formData.get('caudal')),
                tipoProgramacion: formData.get('tipoProgramacion'),
                observaciones: formData.get('observaciones'),
                estado: 'programado',
                fechaCreacion: new Date(),
                repetir: formData.get('repetir') === 'on',
                frecuencia: formData.get('frecuencia') || null
            };

            if (programaData.tipoProgramacion === 'programado') {
                const fecha = formData.get('fecha');
                const hora = formData.get('hora');
                if (fecha && hora) {
                    programaData.fechaProgramada = new Date(fecha + 'T' + hora);
                }
            } else if (programaData.tipoProgramacion === 'automatico') {
                programaData.condicionesActivacion = {
                    humedadSuelo: formData.get('humedadSuelo') === 'on',
                    temperatura: formData.get('temperatura') === 'on',
                    sinLluvia: formData.get('sinLluvia') === 'on'
                };
            }

            let programaId;
            if (this.db && !this.usingMockData) {
                const programaParaFirebase = {
                    ...programaData,
                    fechaCreacion: firebase.firestore.Timestamp.fromDate(programaData.fechaCreacion)
                };
                
                if (programaData.fechaProgramada) {
                    programaParaFirebase.fechaProgramada = firebase.firestore.Timestamp.fromDate(programaData.fechaProgramada);
                }

                const docRef = await this.db.collection('programas-riego').add(programaParaFirebase);
                programaId = docRef.id;
            } else {
                programaId = 'local-' + Date.now();
                programaData.id = programaId;
                this.programasRiego.push(programaData);
            }

            if (programaData.tipoProgramacion === 'inmediato') {
                programaData.estado = 'ejecutando';
                await this.ejecutarRiego(programaId, programaData);
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoRiego'));
            if (modal) modal.hide();
            form.reset();
            
            await this.cargarProgramasRiego();
            this.renderizarSectores();
            this.actualizarEstadisticas();
            
            this.mostrarAlerta(`Programa de riego ${programaData.tipoProgramacion === 'inmediato' ? 'iniciado' : 'guardado'} correctamente`, 'success');

        } catch (error) {
            console.error('❌ Error guardando programa de riego:', error);
            this.mostrarAlerta('Error al guardar el programa de riego', 'error');
        }
    }

    async ejecutarRiego(programaId, programa) {
        console.log(`💧 Iniciando riego: ${programa.nombre} en ${this.getSectorName(programa.sector)}`);
        
        try {
            const estadoRiego = {
                activo: true,
                inicio: new Date(),
                duracion: programa.duracion,
                progreso: 0,
                caudal: programa.caudal,
                programa: programa,
                programaId
            };

            this.riegosActivos.set(programa.sector, estadoRiego);
            
            if (this.db && !this.usingMockData) {
                await this.db.collection('programas-riego').doc(programaId).update({
                    estado: 'ejecutando',
                    fechaInicio: firebase.firestore.Timestamp.now()
                });

                await this.db.collection('historial-riego').add({
                    programaId,
                    sector: programa.sector,
                    tipo: 'inicio',
                    timestamp: firebase.firestore.Timestamp.now(),
                    duracionProgramada: programa.duracion,
                    caudal: programa.caudal
                });
            }

            this.iniciarTimerRiego(programa.sector, programa.duracion);
            this.renderizarSectores();
            this.mostrarCronometro(programa.sector, programa);
            this.actualizarEstadoGeneral();

        } catch (error) {
            console.error('❌ Error ejecutando riego:', error);
            this.mostrarAlerta('Error al ejecutar el riego', 'error');
        }
    }

    iniciarTimerRiego(sectorId, duracionMinutos) {
        const duracionMs = duracionMinutos * 60 * 1000;
        const inicioMs = Date.now();
        
        const timer = setInterval(() => {
            const transcurridoMs = Date.now() - inicioMs;
            const progreso = (transcurridoMs / duracionMs) * 100;
            
            const estadoRiego = this.riegosActivos.get(sectorId);
            if (estadoRiego) {
                estadoRiego.progreso = Math.min(progreso, 100);
                this.actualizarCronometro(transcurridoMs);
                this.actualizarProgresoVisual(sectorId, estadoRiego.progreso);
            }
            
            if (transcurridoMs >= duracionMs) {
                this.finalizarRiego(sectorId);
                clearInterval(timer);
            }
        }, 1000);
        
        this.timers.set(sectorId, timer);
    }

    actualizarProgresoVisual(sectorId, progreso) {
        const progressBar = document.querySelector(`[data-sector-id="${sectorId}"] .progress-bar`);
        if (progressBar) {
            progressBar.style.width = `${progreso}%`;
            progressBar.textContent = `${Math.round(progreso)}%`;
        }
    }

    async finalizarRiego(sectorId) {
        const estadoRiego = this.riegosActivos.get(sectorId);
        if (!estadoRiego) return;

        console.log(`💧 Finalizando riego en ${this.getSectorName(sectorId)}`);
        
        try {
            const duracionReal = (Date.now() - estadoRiego.inicio.getTime()) / (1000 * 60);
            
            if (this.db && !this.usingMockData) {
                await this.db.collection('historial-riego').add({
                    programaId: estadoRiego.programaId,
                    sector: sectorId,
                    tipo: 'fin',
                    timestamp: firebase.firestore.Timestamp.now(),
                    duracionReal: Math.round(duracionReal),
                    litrosAplicados: Math.round(duracionReal * estadoRiego.caudal)
                });

                if (estadoRiego.programaId) {
                    await this.db.collection('programas-riego').doc(estadoRiego.programaId).update({
                        estado: 'completado',
                        fechaFinalizacion: firebase.firestore.Timestamp.now(),
                        duracionReal: Math.round(duracionReal)
                    });
                }
            }

            this.riegosActivos.set(sectorId, {
                activo: false,
                inicio: null,
                duracion: 0,
                progreso: 0,
                caudal: 0,
                programa: null
            });

            const timer = this.timers.get(sectorId);
            if (timer) {
                clearInterval(timer);
                this.timers.delete(sectorId);
            }

            this.renderizarSectores();
            this.ocultarCronometro();
            this.actualizarEstadoGeneral();
            this.cargarHistorialReciente();

            this.mostrarAlerta(`Riego completado en ${this.getSectorName(sectorId)}`, 'success');

        } catch (error) {
            console.error('❌ Error finalizando riego:', error);
        }
    }

    // ==========================================
    // RENDERIZADO RESPONSIVE MEJORADO
    // ==========================================

    renderizarSectores() {
        const container = document.getElementById('listaSectores');
        if (!container) return;

        if (this.sectores.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-tint fa-3x mb-3 opacity-50"></i>
                    <h5>No hay sectores disponibles</h5>
                    <p class="small">Los sectores aparecerán aquí cuando se carguen desde TreeManager</p>
                    ${this.usingMockData ? '<small class="badge bg-warning">Modo Offline</small>' : ''}
                </div>
            `;
            return;
        }

        const isMobile = window.innerWidth <= 768;
        
        const sectoresHTML = this.sectores.map(sector => {
            const estadoRiego = this.riegosActivos.get(sector.id);
            const sensor = this.sensores.get(sector.id) || {};
            const cantidadArboles = this.contarArbolesSector(sector.id);

            let estadoClase = 'badge bg-secondary';
            let estadoTexto = 'Inactivo';
            
            if (estadoRiego && estadoRiego.activo) {
                estadoClase = 'badge bg-success';
                estadoTexto = 'Regando';
            }

            const tiempoRestante = estadoRiego?.activo ? 
                Math.round(estadoRiego.duracion - (estadoRiego.progreso * estadoRiego.duracion / 100)) : 0;

            return `
                <div class="card sector-card ${estadoRiego?.activo ? 'border-success shadow-sm' : ''} mb-3" 
                     data-sector-id="${sector.id}">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                            <div class="sector-info">
                                <h6 class="card-title mb-1 d-flex align-items-center gap-2">
                                    <i class="fas fa-map-marker-alt text-primary"></i>
                                    ${sector.nombre || sector.codigo}
                                    <span class="${estadoClase}">${estadoTexto}</span>
                                </h6>
                                <p class="text-muted small mb-0">
                                    <i class="fas fa-tree me-1"></i> ${cantidadArboles} árboles
                                    ${estadoRiego?.activo ? 
                                        `<span class="ms-3"><i class="fas fa-clock me-1"></i> ${tiempoRestante} min restantes</span>` :
                                        ''
                                    }
                                </p>
                            </div>
                            
                            <div class="sector-actions ${isMobile ? 'w-100 mt-2' : ''}">
                                ${estadoRiego?.activo ? `
                                    <button class="btn btn-danger btn-sm ${isMobile ? 'w-100' : ''}" 
                                            onclick="riegoManager.detenerRiego('${sector.id}')">
                                        <i class="fas fa-stop"></i> Detener
                                    </button>
                                ` : `
                                    <div class="btn-group ${isMobile ? 'w-100' : ''}" role="group">
                                        <button class="btn btn-primary btn-sm" 
                                                onclick="riegoManager.mostrarControlManual('${sector.id}')">
                                            <i class="fas fa-play"></i> ${isMobile ? 'Regar' : 'Iniciar'}
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm" 
                                                onclick="riegoManager.verHistorialSector('${sector.id}')">
                                            <i class="fas fa-history"></i> ${isMobile ? 'Hist.' : 'Historial'}
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>
                        
                        ${estadoRiego?.activo ? `
                            <div class="progress mb-3" style="height: 8px;">
                                <div class="progress-bar bg-success progress-bar-striped progress-bar-animated" 
                                     style="width: ${estadoRiego.progreso}%"
                                     aria-valuenow="${estadoRiego.progreso}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                </div>
                            </div>
                            <div class="text-center small text-muted mb-3">
                                Progreso: ${Math.round(estadoRiego.progreso)}% - 
                                Programa: ${estadoRiego.programa?.nombre || 'Sin nombre'}
                            </div>
                        ` : ''}
                        
                        <div class="row g-2 text-center">
                            <div class="col-4">
                                <div class="sensor-reading">
                                    <div class="sensor-value ${this.getHumedadClass(sensor.humedad)}">
                                        ${sensor.humedad?.toFixed(1) || '---'}%
                                    </div>
                                    <div class="sensor-label">Humedad</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="sensor-reading">
                                    <div class="sensor-value ${this.getTemperaturaClass(sensor.temperatura)}">
                                        ${sensor.temperatura?.toFixed(1) || '---'}°C
                                    </div>
                                    <div class="sensor-label">Temp.</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="sensor-reading">
                                    <div class="sensor-value ${this.getPresionClass(sensor.presion)}">
                                        ${sensor.presion?.toFixed(1) || '---'} BAR
                                    </div>
                                    <div class="sensor-label">Presión</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = sectoresHTML;
        this.renderizarControlesRapidos();
        this.aplicarEstilosSensores();
    }

    getHumedadClass(humedad) {
        if (!humedad) return 'text-muted';
        if (humedad < 30) return 'text-danger';
        if (humedad < 60) return 'text-warning';
        return 'text-success';
    }

    getTemperaturaClass(temperatura) {
        if (!temperatura) return 'text-muted';
        if (temperatura > 35) return 'text-danger';
        if (temperatura > 30) return 'text-warning';
        return 'text-success';
    }

    getPresionClass(presion) {
        if (!presion) return 'text-muted';
        if (presion < 2.0) return 'text-danger';
        if (presion > 3.5) return 'text-warning';
        return 'text-success';
    }

    aplicarEstilosSensores() {
        if (!document.querySelector('#sensor-styles')) {
            const style = document.createElement('style');
            style.id = 'sensor-styles';
            style.textContent = `
                .sensor-reading {
                    padding: 0.5rem;
                    background: rgba(0,0,0,0.02);
                    border-radius: 8px;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .sensor-value {
                    font-weight: 600;
                    font-size: 0.9rem;
                    margin-bottom: 0.25rem;
                }
                .sensor-label {
                    font-size: 0.75rem;
                    color: #6c757d;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                @media (max-width: 768px) {
                    .sensor-value { font-size: 0.8rem; }
                    .sensor-label { font-size: 0.7rem; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    renderizarControlesRapidos() {
        const container = document.getElementById('controlesRapidos');
        if (!container) return;

        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        
        let colClass = 'col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6';
        if (isMobile) {
            colClass = 'col-6';
        } else if (isTablet) {
            colClass = 'col-4';
        }

        const controlesHTML = this.sectores.map(sector => {
            const estadoRiego = this.riegosActivos.get(sector.id);
            const btnClass = estadoRiego?.activo ? 'btn-success' : 'btn-outline-primary';
            const icon = estadoRiego?.activo ? 'stop' : 'play';
            const disabled = estadoRiego?.activo ? 'disabled' : '';
            
            return `
                <div class="${colClass} mb-2">
                    <button class="btn ${btnClass} w-100 h-100 d-flex flex-column align-items-center justify-content-center p-2" 
                            onclick="riegoManager.toggleRiegoRapido('${sector.id}')"
                            ${disabled}
                            style="min-height: 80px;">
                        <i class="fas fa-${icon} mb-1"></i>
                        <small class="text-center fw-bold">${sector.codigo || sector.nombre}</small>
                        ${estadoRiego?.activo ? 
                            `<small class="text-center opacity-75">${Math.round(estadoRiego.progreso)}%</small>` :
                            `<small class="text-center opacity-75">${this.contarArbolesSector(sector.id)} árboles</small>`
                        }
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = controlesHTML;
    }

    // ==========================================
    // MÉTODOS DE CONTROL Y MONITOREO
    // ==========================================

    mostrarControlManual(sectorId) {
        const sector = this.sectores.find(s => s.id === sectorId);
        const estadoRiego = this.riegosActivos.get(sectorId);
        
        if (!sector) return;

        const sectorDisplay = document.getElementById('sectorControlManual');
        const estadoDisplay = document.getElementById('estadoControlManual');
        
        if (sectorDisplay) {
            sectorDisplay.textContent = `Sector: ${sector.nombre || sector.codigo}`;
        }
        if (estadoDisplay) {
            estadoDisplay.textContent = estadoRiego?.activo ? 'Activo' : 'Inactivo';
            estadoDisplay.className = estadoRiego?.activo ? 'badge bg-success' : 'badge bg-secondary';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalControlManual'));
        modal._sectorId = sectorId;
        modal.show();
    }

    async iniciarRiegoManual() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalControlManual'));
        const sectorId = modal._sectorId;
        const duracionInput = document.getElementById('duracionManual');
        const duracion = parseInt(duracionInput?.value || 30);

        if (!sectorId || !duracion) {
            this.mostrarAlerta('Datos incompletos para riego manual', 'error');
            return;
        }

        const programa = {
            nombre: `Riego Manual - ${new Date().toLocaleString()}`,
            sector: sectorId,
            duracion: duracion,
            caudal: this.estadoGeneral.caudalPromedio,
            tipoProgramacion: 'manual',
            estado: 'ejecutando'
        };

        try {
            let programaId;
            if (this.db && !this.usingMockData) {
                const docRef = await this.db.collection('programas-riego').add({
                    ...programa,
                    fechaCreacion: firebase.firestore.Timestamp.now()
                });
                programaId = docRef.id;
            } else {
                programaId = 'manual-' + Date.now();
            }
            
            await this.ejecutarRiego(programaId, programa);
            modal.hide();

        } catch (error) {
            console.error('❌ Error iniciando riego manual:', error);
            this.mostrarAlerta('Error al iniciar riego manual', 'error');
        }
    }

    async detenerRiegoManual() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalControlManual'));
        const sectorId = modal._sectorId;
        
        if (sectorId) {
            await this.detenerRiego(sectorId);
            modal.hide();
        }
    }

    async detenerRiego(sectorId) {
        const estadoRiego = this.riegosActivos.get(sectorId);
        if (!estadoRiego || !estadoRiego.activo) {
            this.mostrarAlerta('No hay riego activo en este sector', 'warning');
            return;
        }

        console.log(`💧 Deteniendo riego en ${this.getSectorName(sectorId)}`);
        
        const timer = this.timers.get(sectorId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(sectorId);
        }

        await this.finalizarRiego(sectorId);
    }

    actualizarEstadisticas() {
        const riegosActivosCount = Array.from(this.riegosActivos.values()).filter(r => r.activo).length;
        const caudalTotalActivo = Array.from(this.riegosActivos.values())
            .filter(r => r.activo)
            .reduce((total, r) => total + r.caudal, 0);

        const elementos = {
            'sectoresTotales': this.sectores.length,
            'sectoresActivos': riegosActivosCount,
            'riegosProgramados': this.contarRiegosHoy(),
            'riegosCompletados': this.contarRiegosCompletados(),
            'caudalActual': Math.round(caudalTotalActivo),
            'presionSistema': this.estadoGeneral.presion.toFixed(1),
            'caudalPromedio': this.estadoGeneral.caudalPromedio
        };

        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        });

        this.estadoGeneral.caudal = caudalTotalActivo;
        this.estadoGeneral.sistemaActivo = riegosActivosCount > 0;
    }

    contarRiegosHoy() {
        const hoy = new Date().toDateString();
        return this.programasRiego.filter(p => {
            if (!p.fechaProgramada) return false;
            return p.fechaProgramada.toDateString() === hoy;
        }).length;
    }

    contarRiegosCompletados() {
        const hoy = new Date().toDateString();
        return this.programasRiego.filter(p => {
            if (!p.fechaProgramada || p.estado !== 'completado') return false;
            return p.fechaProgramada.toDateString() === hoy;
        }).length;
    }

    actualizarEstadoGeneral() {
        const hayRiegosActivos = Array.from(this.riegosActivos.values()).some(r => r.activo);
        this.estadoGeneral.sistemaActivo = hayRiegosActivos;
        
        if (hayRiegosActivos) {
            this.estadoGeneral.presion = Math.max(1.5, this.estadoGeneral.presion - 0.1);
        } else {
            this.estadoGeneral.presion = Math.min(3.0, this.estadoGeneral.presion + 0.05);
        }
        
        this.actualizarEstadisticas();
    }

    mostrarCronometro(sectorId, programa) {
        const cronometro = document.getElementById('cronometroRiego');
        const sectorTexto = document.getElementById('sectorEnRiego');
        
        if (cronometro) {
            cronometro.style.display = 'block';
        }
        if (sectorTexto) {
            sectorTexto.textContent = `Sector: ${this.getSectorName(programa.sector)}`;
        }
        
        this.iniciarActualizacionCronometro();
    }

    iniciarActualizacionCronometro() {
        if (this.cronometroInterval) {
            clearInterval(this.cronometroInterval);
        }
        
        this.cronometroInterval = setInterval(() => {
            const riegoActivo = Array.from(this.riegosActivos.values()).find(r => r.activo);
            if (riegoActivo) {
                const transcurrido = Date.now() - riegoActivo.inicio.getTime();
                this.actualizarCronometro(transcurrido);
            } else {
                this.ocultarCronometro();
            }
        }, 1000);
    }

    actualizarCronometro(transcurridoMs) {
        const horas = Math.floor(transcurridoMs / (1000 * 60 * 60));
        const minutos = Math.floor((transcurridoMs % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((transcurridoMs % (1000 * 60)) / 1000);
        
        const tiempoFormateado = 
            `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        
        const elemento = document.getElementById('tiempoTranscurrido');
        if (elemento) {
            elemento.textContent = tiempoFormateado;
        }
    }

    ocultarCronometro() {
        const cronometro = document.getElementById('cronometroRiego');
        if (cronometro) {
            cronometro.style.display = 'none';
        }
        if (this.cronometroInterval) {
            clearInterval(this.cronometroInterval);
            this.cronometroInterval = null;
        }
    }

    iniciarMonitoreo() {
        setInterval(() => {
            this.verificarProgramasAutomaticos();
        }, 60000);

        setInterval(() => {
            this.actualizarSensores();
        }, 30000);

        setInterval(() => {
            this.actualizarEstadoGeneral();
        }, 5000);
    }

    async verificarProgramasAutomaticos() {
        const ahora = new Date();
        
        const programasPendientes = this.programasRiego.filter(p => 
            p.estado === 'programado' &&
            p.fechaProgramada &&
            p.fechaProgramada <= ahora
        );

        for (const programa of programasPendientes) {
            try {
                await this.ejecutarRiego(programa.id, programa);
            } catch (error) {
                console.error('❌ Error ejecutando programa automático:', error);
            }
        }
    }

    actualizarSensores() {
        this.sensores.forEach((sensor, sectorId) => {
            const estadoRiego = this.riegosActivos.get(sectorId);
            
            if (estadoRiego?.activo) {
                sensor.humedad = Math.min(100, sensor.humedad + Math.random() * 8 + 2);
                sensor.temperatura = Math.max(15, sensor.temperatura - Math.random() * 3);
                sensor.presion = Math.max(1.5, sensor.presion - Math.random() * 0.2);
            } else {
                sensor.humedad = Math.max(10, sensor.humedad - Math.random() * 2);
                sensor.temperatura = 20 + Math.random() * 15 + Math.sin(Date.now() / 100000) * 5;
                sensor.presion = 2.0 + Math.random() * 1.5;
            }
            
            sensor.ultimaActualizacion = new Date();
        });

        const hayRiegosActivos = Array.from(this.riegosActivos.values()).some(r => r.activo);
        if (!hayRiegosActivos) {
            this.renderizarSectores();
        }
    }

    async toggleRiegoRapido(sectorId) {
        const estadoRiego = this.riegosActivos.get(sectorId);
        
        if (estadoRiego && estadoRiego.activo) {
            await this.detenerRiego(sectorId);
        } else {
            const programa = {
                nombre: `Riego Rápido - ${new Date().toLocaleString()}`,
                sector: sectorId,
                duracion: 15,
                caudal: this.estadoGeneral.caudalPromedio,
                tipoProgramacion: 'rapido'
            };

            try {
                let programaId;
                if (this.db && !this.usingMockData) {
                    const docRef = await this.db.collection('programas-riego').add({
                        ...programa,
                        fechaCreacion: firebase.firestore.Timestamp.now()
                    });
                    programaId = docRef.id;
                } else {
                    programaId = 'rapido-' + Date.now();
                }
                
                await this.ejecutarRiego(programaId, programa);
            } catch (error) {
                console.error('❌ Error iniciando riego rápido:', error);
                this.mostrarAlerta('Error al iniciar riego rápido', 'error');
            }
        }
    }

    async pararTodosLosRiegos() {
        const sectoresActivos = Array.from(this.riegosActivos.entries())
            .filter(([_, estado]) => estado.activo)
            .map(([sectorId, _]) => sectorId);

        if (sectoresActivos.length === 0) {
            this.mostrarAlerta('No hay riegos activos para detener', 'info');
            return;
        }

        if (confirm(`¿Detener todos los riegos activos? (${sectoresActivos.length} sectores)`)) {
            for (const sectorId of sectoresActivos) {
                await this.detenerRiego(sectorId);
            }
            this.mostrarAlerta(`${sectoresActivos.length} riegos detenidos`, 'success');
        }
    }

    cargarProximosRiegos() {
        const container = document.getElementById('proximosRiegos');
        if (!container) return;

        const ahora = new Date();
        const proximosRiegos = this.programasRiego
            .filter(p => p.estado === 'programado' && p.fechaProgramada && p.fechaProgramada > ahora)
            .sort((a, b) => a.fechaProgramada - b.fechaProgramada)
            .slice(0, 5);

        if (proximosRiegos.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-3">
                    <i class="fas fa-calendar-times mb-2"></i>
                    <p class="small mb-0">No hay riegos programados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = proximosRiegos.map(programa => `
            <div class="d-flex align-items-center p-2 border-bottom border-light">
                <div class="flex-shrink-0 me-3">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 32px; height: 32px;">
                        <i class="fas fa-tint fa-sm"></i>
                    </div>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1 fs-6">${programa.nombre}</h6>
                    <small class="text-muted d-block">
                        <i class="fas fa-map-marker-alt me-1"></i>${this.getSectorName(programa.sector)}
                    </small>
                    <small class="text-muted d-block">
                        <i class="fas fa-clock me-1"></i>${this.formatearFecha(programa.fechaProgramada)}
                    </small>
                    <small class="text-muted">
                        <i class="fas fa-stopwatch me-1"></i>${programa.duracion} min
                    </small>
                </div>
            </div>
        `).join('');
    }

    async cargarHistorialReciente() {
        try {
            let historial = [];
            
            if (this.db && !this.usingMockData) {
                const snapshot = await this.db.collection('historial-riego')
                    .orderBy('timestamp', 'desc')
                    .limit(10)
                    .get();

                historial = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp.toDate()
                }));
            } else {
                historial = this.generarHistorialMock();
            }

            const container = document.getElementById('historialReciente');
            if (container && historial.length > 0) {
                container.innerHTML = historial.map(item => `
                    <div class="d-flex align-items-center p-2 border-bottom border-light">
                        <div class="flex-shrink-0 me-3">
                            <div class="${item.tipo === 'inicio' ? 'bg-success' : 'bg-secondary'} text-white rounded-circle d-flex align-items-center justify-content-center" 
                                 style="width: 24px; height: 24px;">
                                <i class="fas fa-${item.tipo === 'inicio' ? 'play' : 'stop'} fa-xs"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <small class="fw-semibold">${item.tipo === 'inicio' ? 'Iniciado' : 'Finalizado'}</small>
                            <small class="text-muted d-block">${this.getSectorName(item.sector)}</small>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>${this.formatearFecha(item.timestamp)}
                            </small>
                            ${item.litrosAplicados ? 
                                `<small class="text-success d-block"><i class="fas fa-tint me-1"></i>${item.litrosAplicados}L aplicados</small>` : 
                                ''
                            }
                        </div>
                    </div>
                `).join('');
            } else if (container) {
                container.innerHTML = `
                    <div class="text-center text-muted p-3">
                        <i class="fas fa-history mb-2"></i>
                        <p class="small mb-0">Sin historial reciente</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
        }
    }

    generarHistorialMock() {
        const eventos = ['inicio', 'fin'];
        const historial = [];
        
        for (let i = 0; i < 5; i++) {
            const sector = this.sectores[Math.floor(Math.random() * this.sectores.length)];
            const tipo = eventos[Math.floor(Math.random() * eventos.length)];
            const timestamp = new Date(Date.now() - Math.random() * 86400000 * 7);
            
            historial.push({
                id: `mock-${i}`,
                sector: sector.id,
                tipo: tipo,
                timestamp: timestamp,
                litrosAplicados: tipo === 'fin' ? Math.round(Math.random() * 200 + 50) : null
            });
        }
        
        return historial.sort((a, b) => b.timestamp - a.timestamp);
    }

    formatearFecha(fecha) {
        if (!fecha) return 'Sin fecha';
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(fecha);
    }

    mostrarAlerta(mensaje, tipo = 'info') {
        const alertas = document.getElementById('alertasRiego');
        const mensajeSpan = document.getElementById('mensajeAlerta');
        
        if (alertas && mensajeSpan) {
            const clases = {
                'success': 'alert-success',
                'error': 'alert-danger',
                'warning': 'alert-warning',
                'info': 'alert-info'
            };
            
            alertas.className = `alert ${clases[tipo] || 'alert-info'} alert-dismissible fade show`;
            mensajeSpan.textContent = mensaje;
            alertas.style.display = 'block';
            
            setTimeout(() => {
                alertas.style.display = 'none';
            }, 5000);
        }
        
        const logLevel = tipo === 'error' ? 'error' : tipo === 'warning' ? 'warn' : 'log';
        console[logLevel](`${tipo.toUpperCase()}: ${mensaje}`);
    }

    generarProgramasEjemplo() {
        if (this.sectores.length === 0) return [];
        
        const programas = [];
        
        this.sectores.forEach((sector, index) => {
            const fechaEjemplo = new Date();
            fechaEjemplo.setHours(6 + index, 0, 0, 0);
            fechaEjemplo.setDate(fechaEjemplo.getDate() + 1);
            
            programas.push({
                id: `prog-${sector.id}`,
                nombre: `Riego Matutino ${this.getSectorName(sector.id)}`,
                sector: sector.id,
                duracion: 30 + (index * 5),
                caudal: this.estadoGeneral.caudalPromedio,
                tipoProgramacion: 'programado',
                fechaProgramada: fechaEjemplo,
                estado: 'programado',
                fechaCreacion: new Date()
            });
        });
        
        return programas;
    }

    verHistorialSector(sectorId) {
        console.log('📊 Ver historial del sector:', this.getSectorName(sectorId));
        this.mostrarAlerta(`Mostrando historial de ${this.getSectorName(sectorId)}`, 'info');
    }
}

// ==========================================
// FUNCIONES GLOBALES PARA EL HTML
// ==========================================

window.mostrarModalNuevoRiego = function() {
    const modalElement = document.getElementById('modalNuevoRiego');
    if (modalElement) {
        new bootstrap.Modal(modalElement).show();
    }
};

window.guardarNuevoRiego = function() {
    if (window.riegoManager) {
        window.riegoManager.guardarNuevoRiego();
    }
};

window.cambiarTipoProgramacion = function() {
    if (window.riegoManager) {
        window.riegoManager.cambiarTipoProgramacion();
    }
};

window.iniciarRiegoManual = function() {
    if (window.riegoManager) {
        window.riegoManager.iniciarRiegoManual();
    }
};

window.detenerRiegoManual = function() {
    if (window.riegoManager) {
        window.riegoManager.detenerRiegoManual();
    }
};

window.detenerRiegoActivo = function() {
    if (window.riegoManager) {
        const riegoActivo = Array.from(window.riegoManager.riegosActivos.entries())
            .find(([_, estado]) => estado.activo);
        
        if (riegoActivo) {
            window.riegoManager.detenerRiego(riegoActivo[0]);
        }
    }
};

window.pararTodosLosRiegos = function() {
    if (window.riegoManager) {
        window.riegoManager.pararTodosLosRiegos();
    }
};

window.actualizarEstadoSectores = function() {
    if (window.riegoManager) {
        window.riegoManager.renderizarSectores();
        window.riegoManager.actualizarEstadisticas();
        window.riegoManager.mostrarAlerta('Estado de sectores actualizado', 'success');
    }
};

window.mostrarEstadisticasRiego = function() {
    console.log('📊 Mostrando estadísticas de riego');
    if (window.riegoManager) {
        const stats = {
            sectores: window.riegoManager.sectores.length,
            arboles: window.riegoManager.arboles.length,
            programas: window.riegoManager.programasRiego.length,
            activos: Array.from(window.riegoManager.riegosActivos.values()).filter(r => r.activo).length
        };
        
        window.riegoManager.mostrarAlerta(
            `Estadísticas: ${stats.sectores} sectores, ${stats.arboles} árboles, ${stats.programas} programas, ${stats.activos} riegos activos`, 
            'info'
        );
    }
};

// ==========================================
// INICIALIZACIÓN CUANDO EL DOM ESTÉ LISTO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando RiegoManager mejorado...');
    window.riegoManager = new RiegoManager();
});

console.log('💧 Sistema de riego CORREGIDO y 100% RESPONSIVE cargado');
console.log('🔧 Versión: 2.0 - Integración TreeManager corregida + Firebase mejorado + Responsive completo');
