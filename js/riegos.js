// ========================================
// SISTEMA DE RIEGO - COMPATIBLE CON TU ESTRUCTURA
// Finca La Herradura - Integrado con arboles.js
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
        
        console.log('💧 Iniciando sistema de riego compatible...');
        
        try {
            // Esperar a Firebase (usando tu configuración)
            await this.esperarFirebase();
            
            // Esperar a TreeManager (compatible con tu estructura)
            await this.esperarTreeManagerCompatible();
            
            // Inicializar el resto del sistema
            await this.inicializarSistema();
            
        } catch (error) {
            console.error('❌ Error en inicialización de riegos:', error);
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
                    console.log('✅ Firebase disponible para riegos');
                    resolve(true);
                } else if (window.firebase && window.firebase.firestore) {
                    this.db = window.firebase.firestore();
                    resolve(true);
                } else if (window.db) {
                    this.db = window.db;
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ Firebase no disponible para riegos');
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
                        console.log(`✅ TreeManager compatible para riego: ${this.sectores.length} sectores, ${this.arboles.length} árboles`);
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
            console.log('🔄 TreeManager listo, actualizando riegos');
            try {
                this.sectores = event.detail.sectores || await window.treeManager.getSectoresParaFormulario();
                this.arboles = event.detail.arboles || await window.treeManager.getArbolesParaFormulario();
                this.inicializarEstadoRiegoPorSector();
                this.poblarSelectores();
                this.renderizarSectores();
            } catch (error) {
                console.error('Error actualizando datos desde TreeManager:', error);
            }
        });

        // Escuchar actualizaciones específicas (compatible con tus eventos)
        window.addEventListener('sectorUpdate', () => {
            setTimeout(async () => {
                if (window.treeManager) {
                    this.sectores = await window.treeManager.getSectoresParaFormulario();
                    this.inicializarEstadoRiegoPorSector();
                    this.poblarSelectores();
                    this.renderizarSectores();
                }
            }, 100);
        });
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
        
        this.inicializado = true;
        this.inicializando = false;
        
        console.log('✅ Sistema de riego inicializado correctamente');
        console.log(`📊 Datos: ${this.sectores.length} sectores, ${this.arboles.length} árboles, ${this.programasRiego.length} programas`);
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
        
        this.inicializado = true;
        this.inicializando = false;
        
        console.log('⚠️ Sistema de riego inicializado con datos de respaldo');
    }

    async cargarDatosDeRespaldo() {
        // Usar estructura compatible con tu sistema
        this.sectores = [
            { id: 'SECTOR_NORTE', nombre: 'Sector Norte', codigo: 'SEC-N', area: 2.5, estado: 'activo' },
            { id: 'SECTOR_SUR', nombre: 'Sector Sur', codigo: 'SEC-S', area: 3.0, estado: 'activo' },
            { id: 'SECTOR_ESTE', nombre: 'Sector Este', codigo: 'SEC-E', area: 1.8, estado: 'activo' }
        ];
        
        this.arboles = [
            { id: 'arbol-1', codigo: 'A-001', sectorId: 'SECTOR_NORTE', sector: 'Sector Norte' },
            { id: 'arbol-2', codigo: 'A-002', sectorId: 'SECTOR_NORTE', sector: 'Sector Norte' },
            { id: 'arbol-3', codigo: 'A-003', sectorId: 'SECTOR_SUR', sector: 'Sector Sur' }
        ];
    }

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
        return this.arboles.filter(a => a.sectorId === sectorId || a.sector === sectorId).length;
    }

    getSectorName(sectorId) {
        const sector = this.sectores.find(s => s.id === sectorId);
        return sector ? (sector.nombre || sector.codigo) : sectorId || 'Sector';
    }

    async cargarProgramasRiego() {
        try {
            if (this.db) {
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
            }
        } catch (error) {
            console.error('Error cargando programas de riego:', error);
            this.programasRiego = this.generarProgramasEjemplo();
        }
    }

    async cargarEstadoSensores() {
        try {
            if (this.db) {
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
            console.error('Error cargando sensores:', error);
        }
        
        // Generar sensores de ejemplo para cada sector
        this.sectores.forEach(sector => {
            if (!this.sensores.has(sector.id)) {
                this.sensores.set(sector.id, {
                    id: sector.id,
                    humedad: Math.random() * 100,
                    temperatura: 20 + Math.random() * 15,
                    presion: 2.0 + Math.random() * 1.5,
                    activo: true,
                    ultimaActualizacion: new Date()
                });
            }
        });
    }

    configurarEventListeners() {
        // Tipo de programación
        const tipoProgramacion = document.querySelector('select[name="tipoProgramacion"]');
        if (tipoProgramacion) {
            tipoProgramacion.addEventListener('change', this.cambiarTipoProgramacion);
        }

        // Repetir programación
        const checkRepetir = document.querySelector('input[name="repetir"]');
        const opcionesRepeticion = document.getElementById('opcionesRepeticion');
        if (checkRepetir) {
            checkRepetir.addEventListener('change', () => {
                opcionesRepeticion.style.display = checkRepetir.checked ? 'block' : 'none';
            });
        }
    }

    cambiarTipoProgramacion() {
        const tipo = document.querySelector('select[name="tipoProgramacion"]').value;
        const opcionesProgramado = document.getElementById('opcionesProgramado');
        const opcionesAutomatico = document.getElementById('opcionesAutomatico');
        
        opcionesProgramado.style.display = tipo === 'programado' ? 'block' : 'none';
        opcionesAutomatico.style.display = tipo === 'automatico' ? 'block' : 'none';
    }

    async guardarNuevoRiego() {
        if (!this.db) {
            this.mostrarAlerta('Firebase no disponible', 'error');
            return;
        }

        const form = document.getElementById('formNuevoRiego');
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
                fechaCreacion: firebase.firestore.Timestamp.now(),
                repetir: formData.get('repetir') === 'on',
                frecuencia: formData.get('frecuencia') || null
            };

            // Configurar fecha según el tipo
            if (programaData.tipoProgramacion === 'programado') {
                const fecha = formData.get('fecha');
                const hora = formData.get('hora');
                if (fecha && hora) {
                    programaData.fechaProgramada = firebase.firestore.Timestamp.fromDate(
                        new Date(fecha + 'T' + hora)
                    );
                }
            } else if (programaData.tipoProgramacion === 'automatico') {
                programaData.condicionesActivacion = {
                    humedadSuelo: formData.get('humedadSuelo') === 'on',
                    temperatura: formData.get('temperatura') === 'on',
                    sinLluvia: formData.get('sinLluvia') === 'on'
                };
            }

            // Ejecutar inmediatamente si es riego inmediato
            if (programaData.tipoProgramacion === 'inmediato') {
                programaData.estado = 'ejecutando';
                const docRef = await this.db.collection('programas-riego').add(programaData);
                await this.ejecutarRiego(docRef.id, programaData);
            } else {
                await this.db.collection('programas-riego').add(programaData);
            }

            // Cerrar modal y actualizar
            bootstrap.Modal.getInstance(document.getElementById('modalNuevoRiego')).hide();
            form.reset();
            
            await this.cargarProgramasRiego();
            this.renderizarSectores();
            this.actualizarEstadisticas();
            
            this.mostrarAlerta(`Programa de riego ${programaData.tipoProgramacion === 'inmediato' ? 'iniciado' : 'guardado'} correctamente`, 'success');

        } catch (error) {
            console.error('Error guardando programa de riego:', error);
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
            
            // Actualizar estado en Firebase
            if (this.db) {
                await this.db.collection('programas-riego').doc(programaId).update({
                    estado: 'ejecutando',
                    fechaInicio: firebase.firestore.Timestamp.now()
                });

                // Registrar inicio en historial
                await this.db.collection('historial-riego').add({
                    programaId,
                    sector: programa.sector,
                    tipo: 'inicio',
                    timestamp: firebase.firestore.Timestamp.now(),
                    duracionProgramada: programa.duracion,
                    caudal: programa.caudal
                });
            }

            // Iniciar timer
            this.iniciarTimerRiego(programa.sector, programa.duracion);
            
            // Actualizar interfaz
            this.renderizarSectores();
            this.mostrarCronometro(programa.sector, programa);
            this.actualizarEstadoGeneral();

        } catch (error) {
            console.error('Error ejecutando riego:', error);
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
                
                // Actualizar cronómetro
                this.actualizarCronometro(transcurridoMs);
            }
            
            // Finalizar si se completó
            if (transcurridoMs >= duracionMs) {
                this.finalizarRiego(sectorId);
                clearInterval(timer);
            }
        }, 1000);
        
        this.timers.set(sectorId, timer);
    }

    async finalizarRiego(sectorId) {
        const estadoRiego = this.riegosActivos.get(sectorId);
        if (!estadoRiego) return;

        console.log(`💧 Finalizando riego en ${this.getSectorName(sectorId)}`);
        
        try {
            const duracionReal = (Date.now() - estadoRiego.inicio.getTime()) / (1000 * 60); // en minutos
            
            // Registrar finalización
            if (this.db) {
                await this.db.collection('historial-riego').add({
                    programaId: estadoRiego.programaId,
                    sector: sectorId,
                    tipo: 'fin',
                    timestamp: firebase.firestore.Timestamp.now(),
                    duracionReal: Math.round(duracionReal),
                    litrosAplicados: Math.round(duracionReal * estadoRiego.caudal)
                });

                // Actualizar programa
                if (estadoRiego.programaId) {
                    await this.db.collection('programas-riego').doc(estadoRiego.programaId).update({
                        estado: 'completado',
                        fechaFinalizacion: firebase.firestore.Timestamp.now(),
                        duracionReal: Math.round(duracionReal)
                    });
                }
            }

            // Limpiar estado local
            this.riegosActivos.set(sectorId, {
                activo: false,
                inicio: null,
                duracion: 0,
                progreso: 0,
                caudal: 0,
                programa: null
            });

            // Limpiar timer
            const timer = this.timers.get(sectorId);
            if (timer) {
                clearInterval(timer);
                this.timers.delete(sectorId);
            }

            // Actualizar interfaz
            this.renderizarSectores();
            this.ocultarCronometro();
            this.actualizarEstadoGeneral();
            this.cargarHistorialReciente();

            this.mostrarAlerta(`Riego completado en ${this.getSectorName(sectorId)}`, 'success');

        } catch (error) {
            console.error('Error finalizando riego:', error);
        }
    }

    mostrarControlManual(sectorId) {
        const sector = this.sectores.find(s => s.id === sectorId);
        const estadoRiego = this.riegosActivos.get(sectorId);
        
        if (!sector) return;

        document.getElementById('sectorControlManual').textContent = `Sector: ${sector.nombre || sector.codigo}`;
        document.getElementById('estadoControlManual').textContent = estadoRiego?.activo ? 'Activo' : 'Inactivo';
        
        const modal = new bootstrap.Modal(document.getElementById('modalControlManual'));
        modal._sectorId = sectorId;
        modal.show();
    }

    async iniciarRiegoManual() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalControlManual'));
        const sectorId = modal._sectorId;
        const duracion = parseInt(document.getElementById('duracionManual').value);

        if (!sectorId || !duracion) return;

        const programa = {
            nombre: `Riego Manual - ${new Date().toLocaleString()}`,
            sector: sectorId,
            duracion: duracion,
            caudal: this.estadoGeneral.caudalPromedio,
            tipoProgramacion: 'manual',
            estado: 'ejecutando'
        };

        try {
            if (this.db) {
                const docRef = await this.db.collection('programas-riego').add({
                    ...programa,
                    fechaCreacion: firebase.firestore.Timestamp.now()
                });
                await this.ejecutarRiego(docRef.id, programa);
            } else {
                // Ejecutar sin Firebase
                await this.ejecutarRiego('manual-' + Date.now(), programa);
            }
            
            modal.hide();

        } catch (error) {
            console.error('Error iniciando riego manual:', error);
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
        if (!estadoRiego || !estadoRiego.activo) return;

        console.log(`💧 Deteniendo riego en ${this.getSectorName(sectorId)}`);
        
        // Limpiar timer
        const timer = this.timers.get(sectorId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(sectorId);
        }

        await this.finalizarRiego(sectorId);
    }

    renderizarSectores() {
        const container = document.getElementById('listaSectores');
        if (!container) return;

        if (this.sectores.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-tint fa-3x mb-3"></i>
                    <p>No hay sectores disponibles</p>
                    <small>Los sectores aparecerán aquí cuando se carguen desde TreeManager</small>
                </div>
            `;
            return;
        }

        const sectoresHTML = this.sectores.map(sector => {
            const estadoRiego = this.riegosActivos.get(sector.id);
            const sensor = this.sensores.get(sector.id) || {};
            const cantidadArboles = this.contarArbolesSector(sector.id);

            let estadoClase = 'estado-inactivo';
            let estadoTexto = 'Inactivo';
            
            if (estadoRiego && estadoRiego.activo) {
                estadoClase = 'estado-activo';
                estadoTexto = 'Regando';
            }

            return `
                <div class="sector-card ${estadoRiego?.activo ? 'regando' : ''}">
                    <div class="estado-riego ${estadoClase}">${estadoTexto}</div>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <h6>${sector.nombre || sector.codigo}</h6>
                            <p class="text-muted mb-2">
                                <i class="fas fa-tree me-1"></i> ${cantidadArboles} árboles
                                ${estadoRiego?.activo ? 
                                    `<i class="fas fa-clock ms-3 me-1"></i> ${Math.round(estadoRiego.duracion - (estadoRiego.progreso * estadoRiego.duracion / 100))} min restantes` :
                                    ''
                                }
                            </p>
                            
                            <div class="row">
                                <div class="col-4">
                                    <small class="text-muted">Humedad</small><br>
                                    <span class="sensor-badge">${sensor.humedad?.toFixed(1) || '---'}%</span>
                                </div>
                                <div class="col-4">
                                    <small class="text-muted">Temp</small><br>
                                    <span class="sensor-badge">${sensor.temperatura?.toFixed(1) || '---'}°C</span>
                                </div>
                                <div class="col-4">
                                    <small class="text-muted">Presión</small><br>
                                    <span class="sensor-badge">${sensor.presion?.toFixed(1) || '---'} BAR</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 text-end">
                            ${estadoRiego?.activo ? `
                                <div class="progress mb-2" style="height: 20px;">
                                    <div class="progress-bar bg-success" style="width: ${estadoRiego.progreso}%">
                                        ${Math.round(estadoRiego.progreso)}%
                                    </div>
                                </div>
                                <button class="btn btn-danger btn-sm" onclick="riegoManager.detenerRiego('${sector.id}')">
                                    <i class="fas fa-stop"></i> Detener
                                </button>
                            ` : `
                                <button class="btn btn-primary btn-sm mb-1" onclick="riegoManager.mostrarControlManual('${sector.id}')">
                                    <i class="fas fa-play"></i> Regar
                                </button>
                                <br>
                                <button class="btn btn-outline-secondary btn-sm" onclick="riegoManager.verHistorialSector('${sector.id}')">
                                    <i class="fas fa-history"></i> Historial
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = sectoresHTML;
        this.renderizarControlesRapidos();
    }

    renderizarControlesRapidos() {
        const container = document.getElementById('controlesRapidos');
        if (!container) return;

        const controlesHTML = this.sectores.map(sector => {
            const estadoRiego = this.riegosActivos.get(sector.id);
            
            return `
                <div class="col-md-2 col-sm-4 col-6 mb-2">
                    <button class="btn ${estadoRiego?.activo ? 'btn-success' : 'btn-outline-primary'} w-100" 
                            onclick="riegoManager.toggleRiegoRapido('${sector.id}')"
                            ${estadoRiego?.activo ? 'disabled' : ''}>
                        <i class="fas fa-${estadoRiego?.activo ? 'stop' : 'play'}"></i>
                        <small class="d-block">${sector.codigo || sector.nombre}</small>
                        ${estadoRiego?.activo ? 
                            `<small class="d-block text-light">${Math.round(estadoRiego.progreso)}%</small>` :
                            ''
                        }
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = controlesHTML;
    }

    actualizarEstadisticas() {
        const riegosActivosCount = Array.from(this.riegosActivos.values()).filter(r => r.activo).length;
        const caudalTotalActivo = Array.from(this.riegosActivos.values())
            .filter(r => r.activo)
            .reduce((total, r) => total + r.caudal, 0);

        document.getElementById('sectoresTotales').textContent = this.sectores.length;
        document.getElementById('sectoresActivos').textContent = riegosActivosCount;
        
        // Riegos programados para hoy
        const hoy = new Date();
        const riegosHoy = this.programasRiego.filter(p => {
            if (!p.fechaProgramada) return false;
            return p.fechaProgramada.toDateString() === hoy.toDateString();
        });
        
        document.getElementById('riegosProgramados').textContent = riegosHoy.length;
        document.getElementById('riegosCompletados').textContent = riegosHoy.filter(p => p.estado === 'completado').length;

        // Actualizar medidores
        this.estadoGeneral.caudal = caudalTotalActivo;
        document.getElementById('caudalActual').textContent = Math.round(caudalTotalActivo);
        document.getElementById('presionSistema').textContent = this.estadoGeneral.presion.toFixed(1);
        document.getElementById('caudalPromedio').textContent = this.estadoGeneral.caudalPromedio;
    }

    actualizarEstadoGeneral() {
        const hayRiegosActivos = Array.from(this.riegosActivos.values()).some(r => r.activo);
        this.estadoGeneral.sistemaActivo = hayRiegosActivos;
        
        // Simular cambios en la presión según el estado
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
        
        cronometro.style.display = 'block';
        sectorTexto.textContent = `Sector: ${this.getSectorName(programa.sector)}`;
        
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
        
        document.getElementById('tiempoTranscurrido').textContent = tiempoFormateado;
    }

    ocultarCronometro() {
        document.getElementById('cronometroRiego').style.display = 'none';
        if (this.cronometroInterval) {
            clearInterval(this.cronometroInterval);
            this.cronometroInterval = null;
        }
    }

    iniciarMonitoreo() {
        // Verificar programas automáticos cada minuto
        setInterval(() => {
            this.verificarProgramasAutomaticos();
        }, 60000);

        // Actualizar sensores cada 30 segundos
        setInterval(() => {
            this.actualizarSensores();
        }, 30000);

        // Actualizar estado general cada 5 segundos
        setInterval(() => {
            this.actualizarEstadoGeneral();
        }, 5000);
    }

    async verificarProgramasAutomaticos() {
        const ahora = new Date();
        
        // Verificar programas programados para esta hora
        const programasPendientes = this.programasRiego.filter(p => 
            p.estado === 'programado' &&
            p.fechaProgramada &&
            p.fechaProgramada <= ahora
        );

        for (const programa of programasPendientes) {
            await this.ejecutarRiego(programa.id, programa);
        }

        // Verificar condiciones de programas automáticos
        const programasAutomaticos = this.programasRiego.filter(p => 
            p.tipoProgramacion === 'automatico' && 
            p.estado === 'programado'
        );

        for (const programa of programasAutomaticos) {
            if (await this.evaluarCondicionesAutomaticas(programa)) {
                await this.ejecutarRiego(programa.id, programa);
            }
        }
    }

    async evaluarCondicionesAutomaticas(programa) {
        const sensor = this.sensores.get(programa.sector);
        if (!sensor || !programa.condicionesActivacion) return false;

        const condiciones = programa.condicionesActivacion;
        let cumpleCondiciones = true;

        if (condiciones.humedadSuelo && sensor.humedad > 30) {
            cumpleCondiciones = false;
        }
        
        if (condiciones.temperatura && sensor.temperatura <= 28) {
            cumpleCondiciones = false;
        }
        
        return cumpleCondiciones;
    }

    actualizarSensores() {
        // Simular actualización de sensores
        this.sensores.forEach((sensor, sectorId) => {
            const estadoRiego = this.riegosActivos.get(sectorId);
            
            // Si está regando, aumentar humedad y disminuir temperatura
            if (estadoRiego?.activo) {
                sensor.humedad = Math.min(100, sensor.humedad + Math.random() * 5);
                sensor.temperatura = Math.max(15, sensor.temperatura - Math.random() * 2);
            } else {
                // Cambios naturales
                sensor.humedad = Math.max(0, sensor.humedad - Math.random() * 2);
                sensor.temperatura = 20 + Math.random() * 15;
            }
            
            sensor.ultimaActualizacion = new Date();
        });

        // Solo renderizar si no hay riegos activos (para evitar parpadeo)
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
            // Iniciar riego rápido de 15 minutos
            const programa = {
                nombre: `Riego Rápido - ${new Date().toLocaleString()}`,
                sector: sectorId,
                duracion: 15,
                caudal: this.estadoGeneral.caudalPromedio,
                tipoProgramacion: 'rapido'
            };

            try {
                if (this.db) {
                    const docRef = await this.db.collection('programas-riego').add({
                        ...programa,
                        fechaCreacion: firebase.firestore.Timestamp.now()
                    });
                    await this.ejecutarRiego(docRef.id, programa);
                } else {
                    await this.ejecutarRiego('rapido-' + Date.now(), programa);
                }
            } catch (error) {
                console.error('Error iniciando riego rápido:', error);
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
            container.innerHTML = '<p class="text-muted">No hay riegos programados</p>';
            return;
        }

        container.innerHTML = proximosRiegos.map(programa => `
            <div class="horario-item">
                <strong>${programa.nombre}</strong><br>
                <small class="text-muted">
                    <i class="fas fa-map-marker-alt me-1"></i>${this.getSectorName(programa.sector)}<br>
                    <i class="fas fa-clock me-1"></i>${this.formatearFecha(programa.fechaProgramada)}<br>
                    <i class="fas fa-tint me-1"></i>${programa.duracion} min
                </small>
            </div>
        `).join('');
    }

    async cargarHistorialReciente() {
        try {
            if (this.db) {
                const snapshot = await this.db.collection('historial-riego')
                    .orderBy('timestamp', 'desc')
                    .limit(10)
                    .get();

                const historial = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp.toDate()
                }));

                const container = document.getElementById('historialReciente');
                if (container && historial.length > 0) {
                    container.innerHTML = historial.map(item => `
                        <div class="horario-item">
                            <small>
                                <strong>${item.tipo === 'inicio' ? 'Iniciado' : 'Finalizado'}</strong> - ${this.getSectorName(item.sector)}<br>
                                <i class="fas fa-clock me-1"></i>${this.formatearFecha(item.timestamp)}
                                ${item.litrosAplicados ? `<br><i class="fas fa-tint me-1"></i>${item.litrosAplicados}L aplicados` : ''}
                            </small>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
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
            mensajeSpan.textContent = mensaje;
            alertas.style.display = 'block';
            
            setTimeout(() => {
                alertas.style.display = 'none';
            }, 5000);
        }
        
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    }

    generarProgramasEjemplo() {
        if (this.sectores.length === 0) return [];
        
        const sector = this.sectores[0];
        return [
            {
                id: 'prog1',
                nombre: `Riego Matutino ${this.getSectorName(sector.id)}`,
                sector: sector.id,
                duracion: 30,
                caudal: 45,
                tipoProgramacion: 'programado',
                fechaProgramada: new Date(Date.now() + 2 * 60 * 60 * 1000), // En 2 horas
                estado: 'programado',
                fechaCreacion: new Date()
            }
        ];
    }

    verHistorialSector(sectorId) {
        console.log('Ver historial del sector:', sectorId);
        // Implementar modal de historial específico del sector
    }
}

// Funciones globales para el HTML
window.mostrarModalNuevoRiego = function() {
    new bootstrap.Modal(document.getElementById('modalNuevoRiego')).show();
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
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.riegoManager = new RiegoManager();
});

console.log('💧 Sistema de riego compatible cargado - Versión integrada con estructura existente');
