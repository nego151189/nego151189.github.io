/* ========================================
   FINCA LA HERRADURA - SISTEMA DE RIEGO
   Control inteligente de riego con ML y automatización
   ======================================== */

import offlineManager from './offline.js';
import climateManager from './clima.js';
import treeManager from './arboles.js';

class IrrigationManager {
  constructor() {
    // Configuración base
    this.fincaId = 'finca_la_herradura';
    this.currentDate = new Date().toISOString().split('T')[0];
    this.currentTime = new Date().toTimeString().slice(0, 5);
    
    // Datos en memoria
    this.irrigations = new Map(); // ID -> Irrigation data
    this.schedules = new Map(); // Schedule ID -> Schedule data
    this.sensors = new Map(); // Sensor ID -> Sensor data
    this.zones = new Map(); // Zone ID -> Zone data
    this.systems = new Map(); // System ID -> System data
    
    // Machine Learning para riego
    this.mlModels = {
      optimization: null,
      prediction: null,
      efficiency: null,
      scheduling: null
    };
    
    // Configuración de sistemas de riego
    this.systemTypes = {
      'goteo': {
        name: 'Riego por Goteo',
        efficiency: 0.9,
        flowRate: 2, // L/h por árbol
        pressure: 1.5, // bar
        coverage: 'individual'
      },
      'aspersion': {
        name: 'Aspersión',
        efficiency: 0.75,
        flowRate: 15, // L/h por m²
        pressure: 3.0, // bar
        coverage: 'area'
      },
      'microaspersion': {
        name: 'Microaspersión',
        efficiency: 0.85,
        flowRate: 8, // L/h por árbol
        pressure: 2.0, // bar
        coverage: 'individual'
      },
      'inundacion': {
        name: 'Inundación',
        efficiency: 0.6,
        flowRate: 50, // L/h por m²
        pressure: 0.5, // bar
        coverage: 'area'
      }
    };
    
    // Configuración de sensores
    this.sensorTypes = {
      'humedad_suelo': {
        name: 'Humedad del Suelo',
        unit: '%',
        minValue: 0,
        maxValue: 100,
        optimalRange: [60, 80]
      },
      'temperatura_suelo': {
        name: 'Temperatura del Suelo',
        unit: '°C',
        minValue: 5,
        maxValue: 45,
        optimalRange: [18, 25]
      },
      'ph_suelo': {
        name: 'pH del Suelo',
        unit: 'pH',
        minValue: 4,
        maxValue: 9,
        optimalRange: [6.0, 7.5]
      },
      'salinidad': {
        name: 'Salinidad',
        unit: 'ppm',
        minValue: 0,
        maxValue: 2000,
        optimalRange: [0, 500]
      },
      'flujo_agua': {
        name: 'Flujo de Agua',
        unit: 'L/min',
        minValue: 0,
        maxValue: 1000,
        optimalRange: [10, 100]
      },
      'presion': {
        name: 'Presión',
        unit: 'bar',
        minValue: 0,
        maxValue: 10,
        optimalRange: [1.5, 3.0]
      }
    };
    
    // Parámetros de riego para limones
    this.cropParameters = {
      'limon_persa': {
        waterRequirement: 1200, // mm/año
        criticalPeriods: ['floracion', 'fructificacion'],
        stressThreshold: 50, // % humedad mínima
        optimalHumidity: 70, // % humedad óptima
        maxDailyWater: 25, // L por árbol por día
        rootDepth: 60, // cm
        kc: { // Coeficiente de cultivo por etapa
          inicial: 0.6,
          desarrollo: 0.8,
          media: 1.0,
          final: 0.9
        }
      }
    };
    
    // Estadísticas y métricas
    this.statistics = {
      totalWaterUsed: 0,
      averageEfficiency: 0,
      waterSaved: 0,
      systemUptime: 0,
      alertsCount: 0,
      automationLevel: 0,
      costSavings: 0
    };
    
    // Configuración de alertas
    this.alertThresholds = {
      lowHumidity: 45,      // % humedad crítica
      highHumidity: 90,     // % humedad excesiva
      lowPressure: 1.0,     // bar presión mínima
      highPressure: 4.0,    // bar presión máxima
      systemFailure: 0.5,   // horas sin flujo
      waterWaste: 150,      // % sobre la necesidad teórica
      maintenanceAlert: 30  // días desde último mantenimiento
    };
    
    this.init();
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  async init() {
    try {
      console.log('💧 Inicializando sistema de riego...');
      
      // Cargar datos offline
      await this.loadOfflineData();
      
      // Inicializar sistemas y zonas
      await this.initializeSystems();
      
      // Inicializar sensores
      await this.initializeSensors();
      
      // Inicializar modelos ML
      await this.initMLModels();
      
      // Calcular estadísticas
      await this.calculateStatistics();
      
      // Configurar monitoreo automático
      this.setupAutomaticMonitoring();
      
      // Configurar alertas de riego
      this.setupIrrigationAlerts();
      
      console.log(`✅ Sistema de riego inicializado: ${this.irrigations.size} riegos registrados`);
      
    } catch (error) {
      console.error('❌ Error inicializando sistema de riego:', error);
    }
  }

  async loadOfflineData() {
    try {
      // Cargar riegos
      const irrigationsData = await offlineManager.getAllData('riegos');
      irrigationsData.forEach(irrigationData => {
        this.irrigations.set(irrigationData.id, irrigationData.data);
      });
      
      // Cargar horarios
      const schedulesData = await offlineManager.getAllData('horarios_riego');
      schedulesData.forEach(scheduleData => {
        this.schedules.set(scheduleData.id, scheduleData.data);
      });
      
      // Cargar sensores
      const sensorsData = await offlineManager.getAllData('sensores_riego');
      sensorsData.forEach(sensorData => {
        this.sensors.set(sensorData.id, sensorData.data);
      });
      
      // Cargar zonas
      const zonesData = await offlineManager.getAllData('zonas_riego');
      zonesData.forEach(zoneData => {
        this.zones.set(zoneData.id, zoneData.data);
      });
      
      // Cargar sistemas
      const systemsData = await offlineManager.getAllData('sistemas_riego');
      systemsData.forEach(systemData => {
        this.systems.set(systemData.id, systemData.data);
      });
      
      console.log(`📱 Datos de riego cargados offline: ${this.irrigations.size} riegos`);
      
    } catch (error) {
      console.error('Error cargando datos offline de riego:', error);
    }
  }

  async initializeSystems() {
    try {
      // Crear sistema principal si no existe
      if (this.systems.size === 0) {
        await this.createDefaultSystems();
      }
      
      // Crear zonas por defecto si no existen
      if (this.zones.size === 0) {
        await this.createDefaultZones();
      }
      
    } catch (error) {
      console.error('Error inicializando sistemas de riego:', error);
    }
  }

  async initializeSensors() {
    try {
      // Crear sensores por defecto si no existen
      if (this.sensors.size === 0) {
        await this.createDefaultSensors();
      }
      
      // Iniciar simulación de lecturas de sensores
      this.startSensorSimulation();
      
    } catch (error) {
      console.error('Error inicializando sensores:', error);
    }
  }

  async initMLModels() {
    try {
      // Cargar modelos guardados
      const savedOptimizationModel = await offlineManager.loadData('ml_model', 'irrigation_optimization');
      const savedPredictionModel = await offlineManager.loadData('ml_model', 'irrigation_prediction');
      const savedEfficiencyModel = await offlineManager.loadData('ml_model', 'irrigation_efficiency');
      const savedSchedulingModel = await offlineManager.loadData('ml_model', 'irrigation_scheduling');
      
      this.mlModels.optimization = savedOptimizationModel?.data || this.createEmptyModel('optimization');
      this.mlModels.prediction = savedPredictionModel?.data || this.createEmptyModel('prediction');
      this.mlModels.efficiency = savedEfficiencyModel?.data || this.createEmptyModel('efficiency');
      this.mlModels.scheduling = savedSchedulingModel?.data || this.createEmptyModel('scheduling');
      
      // Entrenar modelos si hay suficientes datos
      if (this.irrigations.size > 50) {
        await this.trainAllModels();
      }
      
      console.log('🤖 Modelos ML de riego inicializados');
      
    } catch (error) {
      console.error('Error inicializando modelos ML de riego:', error);
    }
  }

  createEmptyModel(type) {
    return {
      type,
      version: 1,
      trainedAt: null,
      accuracy: 0,
      features: [],
      predictions: [],
      patterns: []
    };
  }

  // ==========================================
  // REGISTRO DE RIEGO
  // ==========================================

  async createIrrigation(irrigationData) {
    try {
      // Validar datos básicos
      if (!irrigationData.zone && !irrigationData.treeId && !irrigationData.blockId) {
        throw new Error('Zona, árbol o bloque requerido');
      }
      
      if (!irrigationData.duration || irrigationData.duration <= 0) {
        throw new Error('Duración debe ser mayor a 0');
      }
      
      // Generar ID único
      const irrigationId = this.generateIrrigationId();
      
      // Datos completos del riego
      const irrigation = {
        id: irrigationId,
        
        // Ubicación
        zone: irrigationData.zone || null,
        treeId: irrigationData.treeId || null,
        blockId: irrigationData.blockId || null,
        systemId: irrigationData.systemId || 'system_main',
        
        // Tiempo
        date: irrigationData.date || this.currentDate,
        startTime: irrigationData.startTime || this.currentTime,
        endTime: irrigationData.endTime || null,
        duration: parseFloat(irrigationData.duration), // minutos
        actualDuration: 0, // calculado
        
        // Configuración de riego
        flowRate: irrigationData.flowRate || 0, // L/min
        pressure: irrigationData.pressure || 0, // bar
        waterAmount: irrigationData.waterAmount || 0, // litros
        actualWaterAmount: 0, // calculado
        
        // Modo de riego
        mode: irrigationData.mode || 'manual', // manual, automatic, scheduled
        trigger: irrigationData.trigger || 'manual', // manual, sensor, schedule, weather
        
        // Condiciones antes del riego
        preConditions: {
          soilHumidity: irrigationData.preHumidity || null,
          soilTemperature: irrigationData.preTemperature || null,
          weather: irrigationData.preWeather || null,
          lastIrrigation: irrigationData.lastIrrigation || null
        },
        
        // Condiciones después del riego
        postConditions: {
          soilHumidity: irrigationData.postHumidity || null,
          soilTemperature: irrigationData.postTemperature || null,
          runoff: irrigationData.runoff || false,
          infiltration: irrigationData.infiltration || 'good'
        },
        
        // Análisis de eficiencia
        efficiency: {
          waterUseEfficiency: 0, // calculado
          applicationEfficiency: 0, // calculado
          distributionUniformity: 0, // calculado
          energyEfficiency: 0, // calculado
          costEfficiency: 0 // calculado
        },
        
        // Predicciones y recomendaciones ML
        predictions: {
          nextIrrigationDate: null,
          optimalDuration: 0,
          waterNeed: 0,
          efficiency: 0,
          plantResponse: 'good'
        },
        
        // Control de calidad del agua
        waterQuality: {
          ph: irrigationData.waterPh || 7.0,
          ec: irrigationData.waterEc || 0.5, // conductividad eléctrica
          temperature: irrigationData.waterTemp || 20,
          source: irrigationData.waterSource || 'pozo'
        },
        
        // Estado y seguimiento
        status: irrigationData.status || 'completed', // scheduled, active, completed, failed, cancelled
        operator: irrigationData.operator || 'sistema',
        
        // Problemas y observaciones
        issues: irrigationData.issues || [],
        notes: irrigationData.notes || '',
        
        // Costos
        costs: {
          water: 0, // calculado
          energy: 0, // calculado
          labor: 0, // calculado
          total: 0 // calculado
        },
        
        // Metadatos
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: irrigationData.createdBy || 'sistema',
        
        // Control
        active: true,
        synced: false
      };
      
      // Calcular métricas automáticamente
      await this.calculateIrrigationMetrics(irrigation);
      
      // Guardar en memoria y offline
      this.irrigations.set(irrigationId, irrigation);
      await offlineManager.saveData('riegos', irrigationId, irrigation);
      
      // Actualizar estadísticas
      await this.calculateStatistics();
      
      // Generar predicciones
      await this.generateIrrigationPredictions(irrigationId);
      
      // Actualizar próximo riego si es automático
      if (irrigation.mode === 'automatic') {
        await this.scheduleNextIrrigation(irrigation);
      }
      
      console.log(`💧 Riego registrado: ${irrigationId} - ${irrigation.duration} min`);
      this.broadcastIrrigationUpdate('created', irrigation);
      
      return irrigation;
      
    } catch (error) {
      console.error('Error registrando riego:', error);
      throw error;
    }
  }

  async updateIrrigation(irrigationId, updates) {
    try {
      const irrigation = this.irrigations.get(irrigationId);
      if (!irrigation) {
        throw new Error(`Riego ${irrigationId} no encontrado`);
      }
      
      // Aplicar actualizaciones
      const updatedIrrigation = {
        ...irrigation,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Recalcular métricas si cambió información relevante
      if (this.shouldRecalculateMetrics(updates)) {
        await this.calculateIrrigationMetrics(updatedIrrigation);
      }
      
      // Guardar cambios
      this.irrigations.set(irrigationId, updatedIrrigation);
      await offlineManager.saveData('riegos', irrigationId, updatedIrrigation);
      
      // Recalcular estadísticas
      await this.calculateStatistics();
      
      console.log(`📝 Riego actualizado: ${irrigationId}`);
      this.broadcastIrrigationUpdate('updated', updatedIrrigation);
      
      return updatedIrrigation;
      
    } catch (error) {
      console.error('Error actualizando riego:', error);
      throw error;
    }
  }

  async cancelIrrigation(irrigationId, reason = 'Cancelado por usuario') {
    try {
      const irrigation = this.irrigations.get(irrigationId);
      if (!irrigation) {
        throw new Error(`Riego ${irrigationId} no encontrado`);
      }
      
      // Marcar como cancelado
      const cancelledIrrigation = {
        ...irrigation,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason,
        updatedAt: new Date().toISOString()
      };
      
      // Guardar cambios
      this.irrigations.set(irrigationId, cancelledIrrigation);
      await offlineManager.saveData('riegos', irrigationId, cancelledIrrigation);
      
      // Recalcular estadísticas
      await this.calculateStatistics();
      
      console.log(`❌ Riego cancelado: ${irrigationId}`);
      this.broadcastIrrigationUpdate('cancelled', cancelledIrrigation);
      
      return cancelledIrrigation;
      
    } catch (error) {
      console.error('Error cancelando riego:', error);
      throw error;
    }
  }

  // ==========================================
  // PROGRAMACIÓN AUTOMÁTICA
  // ==========================================

  async createIrrigationSchedule(scheduleData) {
    try {
      // Validar datos básicos
      if (!scheduleData.zone && !scheduleData.blockId) {
        throw new Error('Zona o bloque requerido');
      }
      
      if (!scheduleData.frequency) {
        throw new Error('Frecuencia requerida');
      }
      
      const scheduleId = this.generateScheduleId();
      
      const schedule = {
        id: scheduleId,
        
        // Ubicación
        zone: scheduleData.zone || null,
        blockId: scheduleData.blockId || null,
        systemId: scheduleData.systemId || 'system_main',
        
        // Configuración temporal
        frequency: scheduleData.frequency, // daily, weekly, custom
        daysOfWeek: scheduleData.daysOfWeek || [1, 3, 5], // 0=domingo
        timeOfDay: scheduleData.timeOfDay || '06:00',
        duration: scheduleData.duration || 30, // minutos
        
        // Configuración de riego
        flowRate: scheduleData.flowRate || 10, // L/min
        waterAmount: scheduleData.waterAmount || 0, // 0 = calcular automáticamente
        
        // Condiciones para activación
        conditions: {
          minHumidity: scheduleData.minHumidity || 50, // %
          maxHumidity: scheduleData.maxHumidity || 85, // %
          skipIfRain: scheduleData.skipIfRain !== false,
          rainThreshold: scheduleData.rainThreshold || 5, // mm en últimas 24h
          temperatureMin: scheduleData.temperatureMin || 5, // °C
          temperatureMax: scheduleData.temperatureMax || 35 // °C
        },
        
        // Configuración avanzada
        adaptive: scheduleData.adaptive !== false, // ajustar según ML
        seasonalAdjustment: scheduleData.seasonalAdjustment !== false,
        cropStageAdjustment: scheduleData.cropStageAdjustment !== false,
        
        // Estado
        active: scheduleData.active !== false,
        lastExecution: null,
        nextExecution: null,
        executionCount: 0,
        
        // Estadísticas
        stats: {
          totalWaterUsed: 0,
          averageEfficiency: 0,
          skippedExecutions: 0,
          successfulExecutions: 0
        },
        
        // Metadatos
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: scheduleData.createdBy || 'administrador',
        
        // Control
        active: true
      };
      
      // Calcular próxima ejecución
      schedule.nextExecution = this.calculateNextExecution(schedule);
      
      // Guardar horario
      this.schedules.set(scheduleId, schedule);
      await offlineManager.saveData('horarios_riego', scheduleId, schedule);
      
      console.log(`⏰ Horario de riego creado: ${scheduleId}`);
      this.broadcastScheduleUpdate('created', schedule);
      
      return schedule;
      
    } catch (error) {
      console.error('Error creando horario de riego:', error);
      throw error;
    }
  }

  calculateNextExecution(schedule) {
    const now = new Date();
    const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
    
    let nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);
    
    // Si ya pasó la hora de hoy, empezar desde mañana
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    // Encontrar el próximo día válido según frecuencia
    if (schedule.frequency === 'daily') {
      // Ya está configurado para mañana
    } else if (schedule.frequency === 'weekly') {
      while (!schedule.daysOfWeek.includes(nextDate.getDay())) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
    }
    
    return nextDate.toISOString();
  }

  async executeScheduledIrrigations() {
    const now = new Date();
    const activeSchedules = Array.from(this.schedules.values()).filter(s => s.active);
    
    for (const schedule of activeSchedules) {
      if (schedule.nextExecution && new Date(schedule.nextExecution) <= now) {
        await this.executeSchedule(schedule);
      }
    }
  }

  async executeSchedule(schedule) {
    try {
      // Verificar condiciones antes de ejecutar
      const canExecute = await this.checkScheduleConditions(schedule);
      
      if (!canExecute.allowed) {
        console.log(`⏸️ Riego programado omitido: ${canExecute.reason}`);
        
        // Registrar omisión
        schedule.stats.skippedExecutions++;
        schedule.lastExecution = new Date().toISOString();
        schedule.nextExecution = this.calculateNextExecution(schedule);
        
        // Guardar cambios
        this.schedules.set(schedule.id, schedule);
        await offlineManager.saveData('horarios_riego', schedule.id, schedule);
        
        return;
      }
      
      // Calcular parámetros de riego optimizados
      const optimizedParams = await this.optimizeIrrigationParameters(schedule);
      
      // Crear riego automático
      const irrigation = await this.createIrrigation({
        zone: schedule.zone,
        blockId: schedule.blockId,
        systemId: schedule.systemId,
        duration: optimizedParams.duration,
        flowRate: optimizedParams.flowRate,
        waterAmount: optimizedParams.waterAmount,
        mode: 'automatic',
        trigger: 'schedule',
        operator: 'sistema_automatico',
        scheduleId: schedule.id
      });
      
      // Actualizar estadísticas del horario
      schedule.stats.successfulExecutions++;
      schedule.stats.totalWaterUsed += irrigation.waterAmount;
      schedule.lastExecution = new Date().toISOString();
      schedule.nextExecution = this.calculateNextExecution(schedule);
      schedule.executionCount++;
      
      // Guardar cambios en horario
      this.schedules.set(schedule.id, schedule);
      await offlineManager.saveData('horarios_riego', schedule.id, schedule);
      
      console.log(`✅ Riego automático ejecutado: ${irrigation.id}`);
      
    } catch (error) {
      console.error('Error ejecutando riego programado:', error);
    }
  }

  async checkScheduleConditions(schedule) {
    try {
      // Verificar humedad del suelo
      const soilHumidity = await this.getCurrentSoilHumidity(schedule.zone || schedule.blockId);
      
      if (soilHumidity > schedule.conditions.maxHumidity) {
        return { allowed: false, reason: `Humedad alta: ${soilHumidity}%` };
      }
      
      if (soilHumidity < schedule.conditions.minHumidity) {
        // La humedad es baja, necesita riego
      } else {
        return { allowed: false, reason: `Humedad adecuada: ${soilHumidity}%` };
      }
      
      // Verificar lluvia reciente
      if (schedule.conditions.skipIfRain) {
        const recentRain = await this.getRecentRainfall(24); // últimas 24 horas
        
        if (recentRain > schedule.conditions.rainThreshold) {
          return { allowed: false, reason: `Lluvia reciente: ${recentRain}mm` };
        }
      }
      
      // Verificar temperatura
      const currentTemp = await this.getCurrentTemperature();
      
      if (currentTemp < schedule.conditions.temperatureMin || 
          currentTemp > schedule.conditions.temperatureMax) {
        return { allowed: false, reason: `Temperatura fuera de rango: ${currentTemp}°C` };
      }
      
      return { allowed: true, reason: 'Condiciones favorables' };
      
    } catch (error) {
      console.error('Error verificando condiciones de riego:', error);
      return { allowed: false, reason: 'Error verificando condiciones' };
    }
  }

  async optimizeIrrigationParameters(schedule) {
    try {
      // Obtener datos del clima y sensores
      const weatherData = await climateManager.getWeatherData();
      const soilHumidity = await this.getCurrentSoilHumidity(schedule.zone || schedule.blockId);
      
      // Parámetros base
      let duration = schedule.duration;
      let flowRate = schedule.flowRate;
      let waterAmount = schedule.waterAmount;
      
      // Ajustar según humedad del suelo
      const humidityDeficit = schedule.conditions.minHumidity - soilHumidity;
      if (humidityDeficit > 0) {
        duration *= (1 + humidityDeficit / 100); // Aumentar duración si hay déficit
      }
      
      // Ajustar según temperatura
      const currentTemp = await this.getCurrentTemperature();
      if (currentTemp > 30) {
        duration *= 1.2; // Aumentar 20% si hace mucho calor
      } else if (currentTemp < 15) {
        duration *= 0.8; // Reducir 20% si hace frío
      }
      
      // Ajustar según predicción de lluvia
      if (weatherData.forecast) {
        const rainPrediction = this.getRainPredictionNext24h(weatherData.forecast);
        if (rainPrediction > 10) {
          duration *= 0.5; // Reducir si va a llover
        }
      }
      
      // Calcular cantidad de agua si no está especificada
      if (waterAmount === 0) {
        waterAmount = duration * flowRate;
      }
      
      // Aplicar ML si está disponible
      if (this.mlModels.optimization.patterns.length > 0) {
        const mlOptimization = await this.applyMLOptimization(schedule, {
          duration, flowRate, waterAmount, soilHumidity, currentTemp
        });
        
        duration = mlOptimization.duration;
        flowRate = mlOptimization.flowRate;
        waterAmount = mlOptimization.waterAmount;
      }
      
      return {
        duration: Math.round(duration),
        flowRate: Math.round(flowRate * 100) / 100,
        waterAmount: Math.round(waterAmount)
      };
      
    } catch (error) {
      console.error('Error optimizando parámetros de riego:', error);
      
      // Retornar parámetros originales en caso de error
      return {
        duration: schedule.duration,
        flowRate: schedule.flowRate,
        waterAmount: schedule.waterAmount || (schedule.duration * schedule.flowRate)
      };
    }
  }

  // ==========================================
  // SENSORES Y MONITOREO
  // ==========================================

  async createDefaultSensors() {
    const defaultSensors = [
      {
        type: 'humedad_suelo',
        location: 'Bloque A',
        blockId: 'BLK_A',
        depth: 30,
        position: { latitude: 14.6349, longitude: -90.5069 }
      },
      {
        type: 'humedad_suelo',
        location: 'Bloque B',
        blockId: 'BLK_B',
        depth: 30,
        position: { latitude: 14.6350, longitude: -90.5070 }
      },
      {
        type: 'flujo_agua',
        location: 'Bomba Principal',
        systemId: 'system_main',
        position: { latitude: 14.6348, longitude: -90.5068 }
      },
      {
        type: 'presion',
        location: 'Línea Principal',
        systemId: 'system_main',
        position: { latitude: 14.6348, longitude: -90.5068 }
      }
    ];
    
    for (const sensorData of defaultSensors) {
      const sensorId = this.generateSensorId();
      const sensor = {
        id: sensorId,
        type: sensorData.type,
        name: `${this.sensorTypes[sensorData.type].name} - ${sensorData.location}`,
        location: sensorData.location,
        blockId: sensorData.blockId || null,
        systemId: sensorData.systemId || null,
        
        // Configuración física
        depth: sensorData.depth || null,
        position: sensorData.position,
        
        // Estado del sensor
        status: 'active',
        lastReading: null,
        lastMaintenance: new Date().toISOString(),
        
        // Configuración de lecturas
        readingInterval: 15, // minutos
        calibrationDate: new Date().toISOString(),
        
        // Datos técnicos
        model: 'Generic Sensor v1.0',
        serialNumber: `SN${Date.now()}`,
        batteryLevel: 100,
        
        // Configuración de alertas
        alertsEnabled: true,
        minThreshold: this.sensorTypes[sensorData.type].optimalRange[0],
        maxThreshold: this.sensorTypes[sensorData.type].optimalRange[1],
        
        // Metadatos
        createdAt: new Date().toISOString(),
        active: true
      };
      
      this.sensors.set(sensorId, sensor);
      await offlineManager.saveData('sensores_riego', sensorId, sensor);
    }
  }

  startSensorSimulation() {
    // Simular lecturas de sensores cada 15 minutos
    setInterval(() => {
      this.simulateSensorReadings();
    }, 15 * 60 * 1000);
    
    // Primera lectura inmediata
    this.simulateSensorReadings();
  }

  async simulateSensorReadings() {
    for (const [sensorId, sensor] of this.sensors) {
      if (sensor.status !== 'active') continue;
      
      try {
        const reading = await this.generateSensorReading(sensor);
        await this.processSensorReading(sensorId, reading);
      } catch (error) {
        console.error(`Error simulando lectura del sensor ${sensorId}:`, error);
      }
    }
  }

  async generateSensorReading(sensor) {
    const sensorConfig = this.sensorTypes[sensor.type];
    const optimalRange = sensorConfig.optimalRange;
    
    let value;
    
    switch (sensor.type) {
      case 'humedad_suelo':
        // Simular humedad del suelo con variación realista
        value = this.simulateHumidity(sensor);
        break;
        
      case 'temperatura_suelo':
        // Simular temperatura del suelo
        value = this.simulateTemperature(sensor);
        break;
        
      case 'flujo_agua':
        // Simular flujo de agua
        value = this.simulateWaterFlow(sensor);
        break;
        
      case 'presion':
        // Simular presión del sistema
        value = this.simulatePressure(sensor);
        break;
        
      default:
        // Valor aleatorio dentro del rango óptimo
        value = optimalRange[0] + Math.random() * (optimalRange[1] - optimalRange[0]);
    }
    
    return {
      value: Math.round(value * 100) / 100,
      timestamp: new Date().toISOString(),
      quality: 'good', // good, fair, poor
      batteryLevel: Math.max(0, sensor.batteryLevel - Math.random() * 0.1)
    };
  }

  simulateHumidity(sensor) {
    // Obtener última lectura
    const lastValue = sensor.lastReading?.value || 65;
    
    // Simular evapotranspiración (disminución gradual)
    const evaporation = 0.5 + Math.random() * 1.0; // 0.5-1.5% por hora
    
    // Simular efecto de riego reciente
    const recentIrrigation = this.getRecentIrrigationForSensor(sensor);
    let irrigationEffect = 0;
    
    if (recentIrrigation) {
      const hoursAgo = (new Date() - new Date(recentIrrigation.createdAt)) / (1000 * 60 * 60);
      if (hoursAgo < 2) {
        irrigationEffect = 15 * (1 - hoursAgo / 2); // Efecto se reduce en 2 horas
      }
    }
    
    // Simular efecto de lluvia
    const rainEffect = Math.random() < 0.1 ? Math.random() * 10 : 0; // 10% probabilidad de lluvia
    
    let newValue = lastValue - evaporation + irrigationEffect + rainEffect;
    
    // Mantener dentro de rangos realistas
    newValue = Math.max(20, Math.min(95, newValue));
    
    return newValue;
  }

  simulateTemperature(sensor) {
    const hour = new Date().getHours();
    
    // Temperatura base según hora del día
    let baseTemp = 20;
    if (hour >= 6 && hour <= 18) {
      // Día: varía entre 22-28°C
      baseTemp = 22 + 6 * Math.sin((hour - 6) * Math.PI / 12);
    } else {
      // Noche: varía entre 18-22°C
      baseTemp = 18 + 2 * Math.sin((hour + 6) * Math.PI / 12);
    }
    
    // Agregar variación aleatoria
    return baseTemp + (Math.random() - 0.5) * 4;
  }

  simulateWaterFlow(sensor) {
    // Simular flujo basado en riegos activos
    const activeIrrigations = this.getActiveIrrigations();
    
    if (activeIrrigations.length === 0) {
      return 0; // Sin flujo si no hay riegos activos
    }
    
    // Flujo base más variación
    const baseFlow = 25 + Math.random() * 10;
    return baseFlow * activeIrrigations.length;
  }

  simulatePressure(sensor) {
    // Presión normal del sistema con pequeñas variaciones
    const basePressure = 2.0;
    const variation = (Math.random() - 0.5) * 0.4;
    
    return Math.max(0.5, basePressure + variation);
  }

  async processSensorReading(sensorId, reading) {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) return;
    
    // Actualizar sensor con nueva lectura
    sensor.lastReading = reading;
    sensor.batteryLevel = reading.batteryLevel;
    
    // Guardar sensor actualizado
    this.sensors.set(sensorId, sensor);
    await offlineManager.saveData('sensores_riego', sensorId, sensor);
    
    // Verificar alertas
    this.checkSensorAlerts(sensor, reading);
    
    // Guardar historial de lecturas
    await this.saveSensorReading(sensorId, reading);
    
    // Broadcast de actualización
    this.broadcastSensorUpdate(sensor, reading);
  }

  async saveSensorReading(sensorId, reading) {
    try {
      const readingId = `${sensorId}_${Date.now()}`;
      const readingData = {
        id: readingId,
        sensorId,
        ...reading
      };
      
      await offlineManager.saveData('lecturas_sensores', readingId, readingData);
    } catch (error) {
      console.error('Error guardando lectura de sensor:', error);
    }
  }

  // ==========================================
  // ANÁLISIS Y CÁLCULOS
  // ==========================================

  async calculateIrrigationMetrics(irrigation) {
    try {
      // Calcular duración real si no se especificó
      if (irrigation.endTime && !irrigation.actualDuration) {
        const start = new Date(`${irrigation.date}T${irrigation.startTime}`);
        const end = new Date(`${irrigation.date}T${irrigation.endTime}`);
        irrigation.actualDuration = (end - start) / (1000 * 60); // minutos
      } else {
        irrigation.actualDuration = irrigation.duration;
      }
      
      // Calcular cantidad real de agua
      if (!irrigation.actualWaterAmount) {
        irrigation.actualWaterAmount = irrigation.flowRate * irrigation.actualDuration;
      }
      
      // Calcular eficiencia de uso del agua
      const cropWaterNeed = await this.calculateCropWaterNeed(irrigation);
      if (cropWaterNeed > 0) {
        irrigation.efficiency.waterUseEfficiency = (cropWaterNeed / irrigation.actualWaterAmount) * 100;
      }
      
      // Calcular eficiencia de aplicación
      irrigation.efficiency.applicationEfficiency = this.calculateApplicationEfficiency(irrigation);
      
      // Calcular uniformidad de distribución
      irrigation.efficiency.distributionUniformity = this.calculateDistributionUniformity(irrigation);
      
      // Calcular costos
      await this.calculateIrrigationCosts(irrigation);
      
    } catch (error) {
      console.error('Error calculando métricas de riego:', error);
    }
  }

  async calculateCropWaterNeed(irrigation) {
    try {
      // Obtener ET0 (evapotranspiración de referencia)
      const weatherData = await climateManager.getWeatherData();
      const et0 = weatherData.current?.et0_fao_evapotranspiration || 5; // mm/día por defecto
      
      // Obtener coeficiente de cultivo
      const cropStage = await this.getCropStage(irrigation);
      const kc = this.cropParameters.limon_persa.kc[cropStage] || 1.0;
      
      // Calcular ETc (evapotranspiración del cultivo)
      const etc = et0 * kc; // mm/día
      
      // Obtener área de cobertura
      const area = await this.getIrrigationArea(irrigation);
      
      // Convertir a litros
      const waterNeed = (etc / 10) * area; // L (1mm en 1m² = 1L)
      
      return waterNeed;
      
    } catch (error) {
      console.error('Error calculando necesidad hídrica:', error);
      return 0;
    }
  }

  calculateApplicationEfficiency(irrigation) {
    // Eficiencia típica según tipo de sistema
    const systemType = this.getSystemType(irrigation.systemId);
    const systemConfig = this.systemTypes[systemType];
    
    if (systemConfig) {
      return systemConfig.efficiency * 100;
    }
    
    return 75; // Eficiencia por defecto
  }

  calculateDistributionUniformity(irrigation) {
    // Uniformidad típica según tipo de sistema
    const systemType = this.getSystemType(irrigation.systemId);
    
    const uniformityBySystem = {
      'goteo': 90,
      'microaspersion': 85,
      'aspersion': 75,
      'inundacion': 60
    };
    
    return uniformityBySystem[systemType] || 75;
  }

  async calculateIrrigationCosts(irrigation) {
    try {
      // Costo del agua (Q0.05 por litro)
      irrigation.costs.water = irrigation.actualWaterAmount * 0.05;
      
      // Costo de energía (estimado)
      const energyConsumption = this.calculateEnergyConsumption(irrigation);
      irrigation.costs.energy = energyConsumption * 1.2; // Q1.2 por kWh
      
      // Costo de mano de obra (si es manual)
      if (irrigation.mode === 'manual') {
        irrigation.costs.labor = (irrigation.actualDuration / 60) * 25; // Q25 por hora
      }
      
      // Costo total
      irrigation.costs.total = irrigation.costs.water + irrigation.costs.energy + irrigation.costs.labor;
      
    } catch (error) {
      console.error('Error calculando costos de riego:', error);
    }
  }

  calculateEnergyConsumption(irrigation) {
    // Estimación simple de consumo energético
    const systemPower = 2; // kW por defecto
    const hours = irrigation.actualDuration / 60;
    
    return systemPower * hours; // kWh
  }

  // ==========================================
  // MACHINE LEARNING Y PREDICCIONES
  // ==========================================

  async trainAllModels() {
    try {
      console.log('🤖 Entrenando modelos ML de riego...');
      
      const irrigations = Array.from(this.irrigations.values()).filter(i => i.active);
      
      if (irrigations.length < 50) {
        console.log('Insuficientes datos para entrenar modelos de riego');
        return;
      }
      
      // Entrenar modelo de optimización
      await this.trainOptimizationModel(irrigations);
      
      // Entrenar modelo de predicción
      await this.trainPredictionModel(irrigations);
      
      // Entrenar modelo de eficiencia
      await this.trainEfficiencyModel(irrigations);
      
      // Entrenar modelo de programación
      await this.trainSchedulingModel(irrigations);
      
      // Guardar modelos
      await this.saveMLModels();
      
      console.log('✅ Modelos ML de riego entrenados');
      
    } catch (error) {
      console.error('Error entrenando modelos ML de riego:', error);
    }
  }

  async trainOptimizationModel(irrigations) {
    const optimizationData = irrigations.map(irrigation => ({
      id: irrigation.id,
      duration: irrigation.duration,
      waterAmount: irrigation.actualWaterAmount,
      efficiency: irrigation.efficiency.waterUseEfficiency,
      soilHumidity: irrigation.preConditions.soilHumidity || 60,
      weather: irrigation.preConditions.weather || 'normal',
      cropStage: 'development', // simplificado
      systemType: this.getSystemType(irrigation.systemId)
    }));
    
    // Análisis de patrones de optimización
    const optimizationPatterns = this.analyzeOptimizationPatterns(optimizationData);
    
    this.mlModels.optimization = {
      type: 'optimization',
      version: (this.mlModels.optimization.version || 0) + 1,
      trainedAt: new Date().toISOString(),
      dataPoints: optimizationData.length,
      patterns: optimizationPatterns,
      accuracy: this.calculateModelAccuracy(optimizationData, 'optimization'),
      features: ['duration', 'soilHumidity', 'weather', 'cropStage', 'systemType']
    };
  }

  async trainPredictionModel(irrigations) {
    const predictionData = irrigations.map(irrigation => ({
      id: irrigation.id,
      waterAmount: irrigation.actualWaterAmount,
      efficiency: irrigation.efficiency.waterUseEfficiency,
      nextIrrigationDays: this.calculateDaysToNextIrrigation(irrigation),
      soilHumidity: irrigation.preConditions.soilHumidity || 60,
      temperature: irrigation.preConditions.soilTemperature || 22,
      season: this.getSeason(irrigation.date)
    }));
    
    // Análisis de patrones de predicción
    const predictionPatterns = this.analyzePredictionPatterns(predictionData);
    
    this.mlModels.prediction = {
      type: 'prediction',
      version: (this.mlModels.prediction.version || 0) + 1,
      trainedAt: new Date().toISOString(),
      dataPoints: predictionData.length,
      patterns: predictionPatterns,
      accuracy: this.calculateModelAccuracy(predictionData, 'prediction'),
      features: ['waterAmount', 'soilHumidity', 'temperature', 'season']
    };
  }

  async trainEfficiencyModel(irrigations) {
    const efficiencyData = irrigations.map(irrigation => ({
      id: irrigation.id,
      waterUseEfficiency: irrigation.efficiency.waterUseEfficiency,
      applicationEfficiency: irrigation.efficiency.applicationEfficiency,
      duration: irrigation.duration,
      flowRate: irrigation.flowRate,
      systemType: this.getSystemType(irrigation.systemId),
      costEfficiency: irrigation.costs.total > 0 ? irrigation.actualWaterAmount / irrigation.costs.total : 0
    }));
    
    // Análisis de patrones de eficiencia
    const efficiencyPatterns = this.analyzeEfficiencyPatterns(efficiencyData);
    
    this.mlModels.efficiency = {
      type: 'efficiency',
      version: (this.mlModels.efficiency.version || 0) + 1,
      trainedAt: new Date().toISOString(),
      dataPoints: efficiencyData.length,
      patterns: efficiencyPatterns,
      accuracy: this.calculateModelAccuracy(efficiencyData, 'efficiency'),
      features: ['duration', 'flowRate', 'systemType', 'waterUseEfficiency']
    };
  }

  async trainSchedulingModel(irrigations) {
    const schedulingData = irrigations.map(irrigation => ({
      id: irrigation.id,
      timeOfDay: irrigation.startTime,
      dayOfWeek: new Date(`${irrigation.date}T${irrigation.startTime}`).getDay(),
      efficiency: irrigation.efficiency.waterUseEfficiency,
      weather: irrigation.preConditions.weather || 'normal',
      season: this.getSeason(irrigation.date)
    }));
    
    // Análisis de patrones de programación
    const schedulingPatterns = this.analyzeSchedulingPatterns(schedulingData);
    
    this.mlModels.scheduling = {
      type: 'scheduling',
      version: (this.mlModels.scheduling.version || 0) + 1,
      trainedAt: new Date().toISOString(),
      dataPoints: schedulingData.length,
      patterns: schedulingPatterns,
      accuracy: this.calculateModelAccuracy(schedulingData, 'scheduling'),
      features: ['timeOfDay', 'dayOfWeek', 'weather', 'season']
    };
  }

  async generateIrrigationPredictions(irrigationId) {
    try {
      const irrigation = this.irrigations.get(irrigationId);
      if (!irrigation) return;
      
      const predictions = {
        nextIrrigationDate: await this.predictNextIrrigationDate(irrigation),
        optimalDuration: await this.predictOptimalDuration(irrigation),
        waterNeed: await this.predictWaterNeed(irrigation),
        efficiency: await this.predictEfficiency(irrigation),
        plantResponse: await this.predictPlantResponse(irrigation),
        confidence: 0
      };
      
      // Calcular confianza general
      predictions.confidence = this.calculatePredictionConfidence(predictions);
      
      // Actualizar riego con predicciones
      const updatedIrrigation = {
        ...irrigation,
        predictions,
        updatedAt: new Date().toISOString()
      };
      
      this.irrigations.set(irrigationId, updatedIrrigation);
      await offlineManager.saveData('riegos', irrigationId, updatedIrrigation);
      
      return predictions;
      
    } catch (error) {
      console.error('Error generando predicciones de riego:', error);
      return null;
    }
  }

  async predictNextIrrigationDate(irrigation) {
    // Predicción simple basada en tipo de suelo y clima
    const baseInterval = 3; // días
    
    // Ajustar según eficiencia del riego anterior
    let interval = baseInterval;
    if (irrigation.efficiency.waterUseEfficiency > 80) {
      interval += 1; // Extender si fue muy eficiente
    } else if (irrigation.efficiency.waterUseEfficiency < 60) {
      interval -= 1; // Acortar si fue poco eficiente
    }
    
    // Ajustar según temporada
    const season = this.getSeason(irrigation.date);
    if (season === 'dry') {
      interval -= 1;
    } else if (season === 'wet') {
      interval += 1;
    }
    
    const nextDate = new Date(irrigation.date);
    nextDate.setDate(nextDate.getDate() + Math.max(1, interval));
    
    return nextDate.toISOString().split('T')[0];
  }

  async predictOptimalDuration(irrigation) {
    const baseDuration = irrigation.duration;
    
    // Ajustar según humedad del suelo actual
    const currentHumidity = await this.getCurrentSoilHumidity(irrigation.zone || irrigation.blockId);
    const targetHumidity = this.cropParameters.limon_persa.optimalHumidity;
    
    const humidityDeficit = Math.max(0, targetHumidity - currentHumidity);
    const adjustmentFactor = 1 + (humidityDeficit / 100);
    
    return Math.round(baseDuration * adjustmentFactor);
  }

  async predictWaterNeed(irrigation) {
    return await this.calculateCropWaterNeed(irrigation);
  }

  async predictEfficiency(irrigation) {
    // Predicción basada en condiciones actuales
    const baseEfficiency = irrigation.efficiency.applicationEfficiency || 75;
    
    // Ajustar según condiciones climáticas
    const weather = await climateManager.getWeatherData();
    let adjustment = 0;
    
    if (weather.current?.wind_speed_10m > 15) {
      adjustment -= 10; // Viento reduce eficiencia
    }
    
    if (weather.current?.temperature_2m > 30) {
      adjustment -= 5; // Calor excesivo reduce eficiencia
    }
    
    return Math.max(50, Math.min(95, baseEfficiency + adjustment));
  }

  async predictPlantResponse(irrigation) {
    const efficiency = await this.predictEfficiency(irrigation);
    
    if (efficiency > 80) return 'excellent';
    if (efficiency > 70) return 'good';
    if (efficiency > 60) return 'fair';
    return 'poor';
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  generateIrrigationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `RIE_${timestamp}_${random}`.toUpperCase();
  }

  generateScheduleId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `SCH_${timestamp}_${random}`.toUpperCase();
  }

  generateSensorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `SEN_${timestamp}_${random}`.toUpperCase();
  }

  shouldRecalculateMetrics(updates) {
    const metricsFields = ['duration', 'flowRate', 'waterAmount', 'endTime'];
    return metricsFields.some(field => updates.hasOwnProperty(field));
  }

  getSystemType(systemId) {
    const system = this.systems.get(systemId);
    return system?.type || 'goteo';
  }

  async getCurrentSoilHumidity(location) {
    // Buscar sensor de humedad en la ubicación
    const humiditySensor = Array.from(this.sensors.values()).find(sensor => 
      sensor.type === 'humedad_suelo' && 
      (sensor.blockId === location || sensor.location === location)
    );
    
    if (humiditySensor && humiditySensor.lastReading) {
      return humiditySensor.lastReading.value;
    }
    
    // Valor por defecto si no hay sensor
    return 65;
  }

  async getCurrentTemperature() {
    try {
      const weather = await climateManager.getWeatherData();
      return weather.current?.temperature_2m || 22;
    } catch {
      return 22; // Valor por defecto
    }
  }

  async getRecentRainfall(hours) {
    try {
      const weather = await climateManager.getWeatherData();
      return weather.current?.precipitation || 0;
    } catch {
      return 0;
    }
  }

  getRainPredictionNext24h(forecast) {
    if (!forecast?.daily?.precipitation_sum) return 0;
    return forecast.daily.precipitation_sum[0] || 0;
  }

  getRecentIrrigationForSensor(sensor) {
    const recentIrrigations = Array.from(this.irrigations.values())
      .filter(irrigation => 
        irrigation.blockId === sensor.blockId &&
        irrigation.status === 'completed'
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return recentIrrigations[0] || null;
  }

  getActiveIrrigations() {
    return Array.from(this.irrigations.values()).filter(irrigation => 
      irrigation.status === 'active'
    );
  }

  getSeason(date) {
    const month = new Date(date).getMonth();
    
    // Temporadas en Guatemala
    if (month >= 10 || month <= 3) return 'dry'; // Nov-Abr
    return 'wet'; // May-Oct
  }

  async getCropStage(irrigation) {
    // Simplificado: obtener edad promedio de árboles en la zona
    const trees = await treeManager.getTreesByBlock(irrigation.blockId);
    
    if (trees.length === 0) return 'media';
    
    const avgAge = trees.reduce((sum, tree) => sum + tree.age, 0) / trees.length;
    
    if (avgAge < 2) return 'inicial';
    if (avgAge < 5) return 'desarrollo';
    if (avgAge < 15) return 'media';
    return 'final';
  }

  async getIrrigationArea(irrigation) {
    if (irrigation.treeId) {
      return 25; // m² por árbol
    } else if (irrigation.blockId) {
      const block = await treeManager.getBlock(irrigation.blockId);
      return block?.location?.area || 2500; // m² por defecto
    }
    
    return 100; // Área por defecto
  }

  calculateDaysToNextIrrigation(irrigation) {
    // Buscar el siguiente riego para el mismo lugar
    const nextIrrigation = Array.from(this.irrigations.values())
      .filter(i => 
        i.id !== irrigation.id &&
        (i.blockId === irrigation.blockId || i.treeId === irrigation.treeId) &&
        new Date(i.date) > new Date(irrigation.date)
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    
    if (nextIrrigation) {
      const days = (new Date(nextIrrigation.date) - new Date(irrigation.date)) / (1000 * 60 * 60 * 24);
      return Math.round(days);
    }
    
    return 3; // Valor por defecto
  }

  // ==========================================
  // SISTEMAS Y ZONAS POR DEFECTO
  // ==========================================

  async createDefaultSystems() {
    const defaultSystems = [
      {
        id: 'system_main',
        name: 'Sistema Principal de Goteo',
        type: 'goteo',
        status: 'active',
        capacity: 1000, // L/h
        pressure: 2.0,
        zones: ['zone_a', 'zone_b', 'zone_c']
      }
    ];
    
    for (const systemData of defaultSystems) {
      const system = {
        ...systemData,
        createdAt: new Date().toISOString(),
        lastMaintenance: new Date().toISOString(),
        maintenanceInterval: 30, // días
        active: true
      };
      
      this.systems.set(systemData.id, system);
      await offlineManager.saveData('sistemas_riego', systemData.id, system);
    }
  }

  async createDefaultZones() {
    const defaultZones = [
      {
        id: 'zone_a',
        name: 'Zona A - Bloques 1-5',
        blocks: ['BLK_1', 'BLK_2', 'BLK_3', 'BLK_4', 'BLK_5'],
        systemId: 'system_main'
      },
      {
        id: 'zone_b',
        name: 'Zona B - Bloques 6-10',
        blocks: ['BLK_6', 'BLK_7', 'BLK_8', 'BLK_9', 'BLK_10'],
        systemId: 'system_main'
      },
      {
        id: 'zone_c',
        name: 'Zona C - Bloques 11-15',
        blocks: ['BLK_11', 'BLK_12', 'BLK_13', 'BLK_14', 'BLK_15'],
        systemId: 'system_main'
      }
    ];
    
    for (const zoneData of defaultZones) {
      const zone = {
        ...zoneData,
        area: 5000, // m²
        treeCount: 200,
        flowRate: 50, // L/min
        active: true,
        createdAt: new Date().toISOString()
      };
      
      this.zones.set(zoneData.id, zone);
      await offlineManager.saveData('zonas_riego', zoneData.id, zone);
    }
  }

  // ==========================================
  // ALERTAS Y MONITOREO
  // ==========================================

  setupAutomaticMonitoring() {
    // Ejecutar riegos programados cada minuto
    setInterval(() => {
      this.executeScheduledIrrigations();
    }, 60 * 1000);
    
    // Verificar alertas cada 15 minutos
    setInterval(() => {
      this.checkSystemAlerts();
    }, 15 * 60 * 1000);
  }

  setupIrrigationAlerts() {
    // Configurar alertas específicas de riego
    console.log('Alertas de riego configuradas');
  }

  checkSensorAlerts(sensor, reading) {
    const sensorConfig = this.sensorTypes[sensor.type];
    const value = reading.value;
    
    // Alerta de valor fuera de rango
    if (value < sensorConfig.optimalRange[0] || value > sensorConfig.optimalRange[1]) {
      this.broadcastAlert({
        type: 'sensor_out_of_range',
        level: 'warning',
        message: `${sensor.name}: ${value}${sensorConfig.unit} fuera del rango óptimo`,
        sensorId: sensor.id,
        value: value,
        optimalRange: sensorConfig.optimalRange
      });
    }
    
    // Alerta de batería baja
    if (reading.batteryLevel < 20) {
      this.broadcastAlert({
        type: 'low_battery',
        level: 'warning',
        message: `Batería baja en ${sensor.name}: ${reading.batteryLevel}%`,
        sensorId: sensor.id,
        batteryLevel: reading.batteryLevel
      });
    }
  }

  checkSystemAlerts() {
    // Verificar sistemas de riego
    this.systems.forEach(system => {
      // Alerta de mantenimiento vencido
      const daysSinceMaintenance = (new Date() - new Date(system.lastMaintenance)) / (1000 * 60 * 60 * 24);
      
      if (daysSinceMaintenance > system.maintenanceInterval) {
        this.broadcastAlert({
          type: 'maintenance_overdue',
          level: 'info',
          message: `Mantenimiento vencido en ${system.name}`,
          systemId: system.id,
          daysSince: Math.round(daysSinceMaintenance)
        });
      }
    });
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  async calculateStatistics() {
    try {
      const activeIrrigations = Array.from(this.irrigations.values()).filter(i => i.active);
      const completedIrrigations = activeIrrigations.filter(i => i.status === 'completed');
      
      // Total de agua utilizada
      this.statistics.totalWaterUsed = completedIrrigations.reduce((sum, i) => sum + i.actualWaterAmount, 0);
      
      // Eficiencia promedio
      const efficiencies = completedIrrigations.map(i => i.efficiency.waterUseEfficiency).filter(e => e > 0);
      this.statistics.averageEfficiency = efficiencies.length > 0 
        ? efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length 
        : 0;
      
      // Agua ahorrada (estimación)
      this.statistics.waterSaved = this.statistics.totalWaterUsed * 0.2; // 20% estimado
      
      // Tiempo de funcionamiento del sistema
      this.statistics.systemUptime = 95; // Simplificado
      
      // Número de alertas
      this.statistics.alertsCount = this.getActiveAlertsCount();
      
      // Nivel de automatización
      const automaticIrrigations = activeIrrigations.filter(i => i.mode === 'automatic').length;
      this.statistics.automationLevel = activeIrrigations.length > 0 
        ? (automaticIrrigations / activeIrrigations.length) * 100 
        : 0;
      
      // Ahorros en costos
      this.statistics.costSavings = completedIrrigations.reduce((sum, i) => sum + (i.costs.total || 0), 0) * 0.15; // 15% estimado
      
      // Guardar estadísticas
      await offlineManager.saveData('estadisticas', 'riego', this.statistics);
      
    } catch (error) {
      console.error('Error calculando estadísticas de riego:', error);
    }
  }

  getActiveAlertsCount() {
    // En producción, contar alertas activas reales
    return 2; // Simplificado
  }

  // ==========================================
  // EVENTOS Y COMUNICACIÓN
  // ==========================================

  broadcastIrrigationUpdate(action, irrigation) {
    window.dispatchEvent(new CustomEvent('irrigationUpdate', {
      detail: { action, irrigation, timestamp: new Date().toISOString() }
    }));
  }

  broadcastScheduleUpdate(action, schedule) {
    window.dispatchEvent(new CustomEvent('scheduleUpdate', {
      detail: { action, schedule, timestamp: new Date().toISOString() }
    }));
  }

  broadcastSensorUpdate(sensor, reading) {
    window.dispatchEvent(new CustomEvent('sensorUpdate', {
      detail: { sensor, reading, timestamp: new Date().toISOString() }
    }));
  }

  broadcastAlert(alert) {
    window.dispatchEvent(new CustomEvent('irrigationAlert', {
      detail: { alert, timestamp: new Date().toISOString() }
    }));
    
    console.warn(`💧 Alerta de riego: ${alert.message}`);
  }

  async saveMLModels() {
    await offlineManager.saveData('ml_model', 'irrigation_optimization', this.mlModels.optimization);
    await offlineManager.saveData('ml_model', 'irrigation_prediction', this.mlModels.prediction);
    await offlineManager.saveData('ml_model', 'irrigation_efficiency', this.mlModels.efficiency);
    await offlineManager.saveData('ml_model', 'irrigation_scheduling', this.mlModels.scheduling);
  }

  // ==========================================
  // API PÚBLICA
  // ==========================================

  async getIrrigationSummary() {
    return {
      totalWaterUsed: this.statistics.totalWaterUsed,
      averageEfficiency: this.statistics.averageEfficiency,
      activeSchedules: Array.from(this.schedules.values()).filter(s => s.active).length,
      activeSensors: Array.from(this.sensors.values()).filter(s => s.status === 'active').length,
      automationLevel: this.statistics.automationLevel,
      lastUpdate: new Date().toISOString()
    };
  }

  async getAllIrrigations(filters = {}) {
    let irrigations = Array.from(this.irrigations.values());
    
    // Aplicar filtros
    if (filters.blockId) {
      irrigations = irrigations.filter(i => i.blockId === filters.blockId);
    }
    
    if (filters.startDate) {
      irrigations = irrigations.filter(i => i.date >= filters.startDate);
    }
    
    if (filters.endDate) {
      irrigations = irrigations.filter(i => i.date <= filters.endDate);
    }
    
    if (filters.mode) {
      irrigations = irrigations.filter(i => i.mode === filters.mode);
    }
    
    return irrigations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getCurrentSensorReadings() {
    const readings = {};
    
    this.sensors.forEach((sensor, sensorId) => {
      if (sensor.status === 'active' && sensor.lastReading) {
        readings[sensorId] = {
          type: sensor.type,
          name: sensor.name,
          value: sensor.lastReading.value,
          unit: this.sensorTypes[sensor.type].unit,
          timestamp: sensor.lastReading.timestamp,
          status: this.getSensorStatus(sensor)
        };
      }
    });
    
    return readings;
  }

  getSensorStatus(sensor) {
    if (!sensor.lastReading) return 'no_data';
    
    const sensorConfig = this.sensorTypes[sensor.type];
    const value = sensor.lastReading.value;
    
    if (value >= sensorConfig.optimalRange[0] && value <= sensorConfig.optimalRange[1]) {
      return 'optimal';
    } else if (value < sensorConfig.minValue || value > sensorConfig.maxValue) {
      return 'critical';
    } else {
      return 'warning';
    }
  }
}

// ==========================================
// IMPLEMENTACIONES DE ANÁLISIS ML (STUBS)
// ==========================================

IrrigationManager.prototype.analyzeOptimizationPatterns = function(optimizationData) {
  return [{
    pattern: 'duration_efficiency_correlation',
    description: 'Correlación entre duración y eficiencia',
    confidence: 0.8
  }];
};

IrrigationManager.prototype.analyzePredictionPatterns = function(predictionData) {
  return [{
    pattern: 'seasonal_water_needs',
    description: 'Necesidades hídricas estacionales',
    confidence: 0.85
  }];
};

IrrigationManager.prototype.analyzeEfficiencyPatterns = function(efficiencyData) {
  return [{
    pattern: 'system_efficiency_optimization',
    description: 'Optimización de eficiencia por sistema',
    confidence: 0.75
  }];
};

IrrigationManager.prototype.analyzeSchedulingPatterns = function(schedulingData) {
  return [{
    pattern: 'optimal_timing',
    description: 'Horarios óptimos de riego',
    confidence: 0.9
  }];
};

IrrigationManager.prototype.applyMLOptimization = async function(schedule, params) {
  // Aplicar optimización ML (simplificado)
  return {
    duration: params.duration * 0.95, // 5% más eficiente
    flowRate: params.flowRate,
    waterAmount: params.waterAmount * 0.95
  };
};

IrrigationManager.prototype.calculateModelAccuracy = function(data, type) {
  return Math.random() * 0.15 + 0.8; // 80-95%
};

IrrigationManager.prototype.calculatePredictionConfidence = function(predictions) {
  return 0.82;
};

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Instancia global del gestor de riego
const irrigationManager = new IrrigationManager();

// Exportar para uso en otros módulos
export default irrigationManager;

// Funciones globales de conveniencia
window.irrigationManager = irrigationManager;
window.createIrrigation = (data) => irrigationManager.createIrrigation(data);
window.createIrrigationSchedule = (data) => irrigationManager.createIrrigationSchedule(data);
window.getCurrentSensorReadings = () => irrigationManager.getCurrentSensorReadings();
window.getIrrigationSummary = () => irrigationManager.getIrrigationSummary();

console.log('💧 Sistema de control de riego inicializado');