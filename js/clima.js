/* ========================================
   FINCA LA HERRADURA - SISTEMA CLIMÁTICO
   Integración con OpenMeteo, análisis IA y predicciones v3
   ======================================== */

class ClimateManager {
  constructor() {
    // Configuración de la finca con COORDENADAS REALES
    this.fincaLocation = {
      latitude: 14.77073,   // Finca La Herradura - Guatemala
      longitude: -90.25398, // Coordenadas reales proporcionadas
      elevation: 1500,      // metros sobre el nivel del mar
      timezone: 'America/Guatemala'
    };
    
    // APIs y configuración
    this.openMeteoBaseUrl = 'https://api.open-meteo.com/v1';
    this.updateInterval = 300000; // 5 minutos
    this.forecastDays = 14;
    this.historicalDays = 30;
    
    // Machine Learning y análisis
    this.mlModel = null;
    this.weatherPatterns = [];
    this.alerts = [];
    this.recommendations = [];
    
    // Cache y almacenamiento
    this.currentWeather = null;
    this.forecastData = null;
    this.historicalData = [];
    
    // Umbrales críticos para limones en Guatemala
    this.thresholds = {
      temperature: {
        optimal: { min: 18, max: 32 },    // Ajustado para clima guatemalteco
        critical: { min: 10, max: 38 }
      },
      humidity: {
        optimal: { min: 65, max: 85 },    // Mayor humedad típica de Guatemala
        critical: { min: 45, max: 95 }
      },
      rainfall: {
        daily_max: 60,                    // Mayor precipitación esperada
        monthly_optimal: 150,             // Ajustado para estación lluviosa
        drought_threshold: 25             // mm/semana
      },
      wind: {
        strong_wind: 25,                  // km/h
        dangerous_wind: 50                // km/h
      },
      uv: {
        high: 9,                          // Mayor índice UV en Guatemala
        extreme: 11
      }
    };
    
    this.init();
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  async init() {
    try {
      console.log('🌦️ Inicializando sistema climático...');
      console.log('📍 Ubicación: Finca La Herradura');
      console.log(`📍 Coordenadas: ${this.fincaLocation.latitude}, ${this.fincaLocation.longitude}`);
      
      // Cargar datos históricos offline
      await this.loadOfflineData();
      
      // Inicializar modelo de ML
      await this.initMLModel();
      
      // Obtener datos actuales
      await this.getCurrentWeather();
      
      // Obtener pronóstico
      await this.getForecast();
      
      // Configurar actualizaciones automáticas
      this.setupAutoUpdate();
      
      // Configurar alertas
      this.setupWeatherAlerts();
      
      console.log('✅ Sistema climático inicializado');
      
    } catch (error) {
      console.error('❌ Error inicializando sistema climático:', error);
      
      // Usar datos offline si hay error
      await this.useOfflineData();
    }
  }

  async loadOfflineData() {
    try {
      const offlineWeather = await this.getOfflineManager().loadData('weather', 'current');
      const offlineForecast = await this.getOfflineManager().loadData('weather', 'forecast');
      const offlineHistorical = await this.getOfflineManager().getAllData('weather_historical');
      
      if (offlineWeather) {
        this.currentWeather = offlineWeather.data;
        console.log('📱 Datos climáticos actuales cargados offline');
      }
      
      if (offlineForecast) {
        this.forecastData = offlineForecast.data;
        console.log('📱 Pronóstico cargado offline');
      }
      
      if (offlineHistorical.length > 0) {
        this.historicalData = offlineHistorical.map(item => item.data);
        console.log(`📱 ${offlineHistorical.length} registros históricos cargados offline`);
      }
      
    } catch (error) {
      console.error('Error cargando datos climáticos offline:', error);
    }
  }

  async useOfflineData() {
    if (this.currentWeather || this.forecastData) {
      console.log('📱 Usando datos climáticos offline');
      this.broadcastWeatherUpdate();
      return true;
    }
    return false;
  }

  getOfflineManager() {
    return window.offline || window.offlineManager || {
      loadData: () => null,
      saveData: () => {},
      getAllData: () => []
    };
  }

  // ==========================================
  // OBTENCIÓN DE DATOS CLIMÁTICOS REALES
  // ==========================================

  async getCurrentWeather() {
    try {
      const params = new URLSearchParams({
        latitude: this.fincaLocation.latitude,
        longitude: this.fincaLocation.longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m', 
          'apparent_temperature',
          'is_day',
          'precipitation',
          'rain',
          'weather_code',
          'cloud_cover',
          'pressure_msl',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
          'uv_index'
        ].join(','),
        timezone: this.fincaLocation.timezone,
        forecast_days: 1
      });

      const response = await fetch(`${this.openMeteoBaseUrl}/forecast?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error OpenMeteo: ${response.status}`);
      }

      const data = await response.json();
      
      this.currentWeather = {
        ...data.current,
        location: this.fincaLocation,
        timestamp: new Date().toISOString(),
        source: 'openmeteo'
      };

      // Guardar offline
      await this.getOfflineManager().saveData('weather', 'current', this.currentWeather);
      
      // Analizar y generar alertas
      await this.analyzeCurrentConditions();
      
      console.log('🌤️ Clima actual actualizado desde OpenMeteo');
      console.log('📊 Datos:', {
        temperatura: `${this.currentWeather.temperature_2m}°C`,
        humedad: `${this.currentWeather.relative_humidity_2m}%`,
        viento: `${this.currentWeather.wind_speed_10m} km/h`,
        uvIndex: this.currentWeather.uv_index
      });
      
      this.broadcastWeatherUpdate();
      
      return this.currentWeather;
      
    } catch (error) {
      console.error('Error obteniendo clima actual:', error);
      throw error;
    }
  }

  async getForecast() {
    try {
      const params = new URLSearchParams({
        latitude: this.fincaLocation.latitude,
        longitude: this.fincaLocation.longitude,
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'apparent_temperature_max',
          'apparent_temperature_min',
          'sunrise',
          'sunset',
          'daylight_duration',
          'sunshine_duration',
          'uv_index_max',
          'precipitation_sum',
          'rain_sum',
          'precipitation_hours',
          'precipitation_probability_max',
          'wind_speed_10m_max',
          'wind_gusts_10m_max',
          'wind_direction_10m_dominant',
          'shortwave_radiation_sum',
          'et0_fao_evapotranspiration'
        ].join(','),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'precipitation',
          'rain',
          'wind_speed_10m',
          'uv_index',
          'soil_moisture_0_to_1cm',
          'soil_moisture_1_to_3cm',
          'soil_temperature_0cm'
        ].join(','),
        timezone: this.fincaLocation.timezone,
        forecast_days: this.forecastDays
      });

      const response = await fetch(`${this.openMeteoBaseUrl}/forecast?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error OpenMeteo: ${response.status}`);
      }

      const data = await response.json();
      
      this.forecastData = {
        ...data,
        location: this.fincaLocation,
        timestamp: new Date().toISOString(),
        source: 'openmeteo'
      };

      // Guardar offline
      await this.getOfflineManager().saveData('weather', 'forecast', this.forecastData);
      
      // Analizar pronóstico con IA
      await this.analyzeForecast();
      
      console.log(`📅 Pronóstico de ${this.forecastDays} días actualizado para Finca La Herradura`);
      this.broadcastForecastUpdate();
      
      return this.forecastData;
      
    } catch (error) {
      console.error('Error obteniendo pronóstico:', error);
      throw error;
    }
  }

  async getHistoricalData(startDate, endDate) {
    try {
      const params = new URLSearchParams({
        latitude: this.fincaLocation.latitude,
        longitude: this.fincaLocation.longitude,
        start_date: startDate,
        end_date: endDate,
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'rain_sum',
          'wind_speed_10m_max',
          'wind_direction_10m_dominant',
          'shortwave_radiation_sum',
          'et0_fao_evapotranspiration'
        ].join(','),
        timezone: this.fincaLocation.timezone
      });

      const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error OpenMeteo Historical: ${response.status}`);
      }

      const data = await response.json();
      
      const historicalRecord = {
        ...data,
        period: { startDate, endDate },
        location: this.fincaLocation,
        timestamp: new Date().toISOString(),
        source: 'openmeteo'
      };

      // Guardar offline
      const recordId = `${startDate}_${endDate}`;
      await this.getOfflineManager().saveData('weather_historical', recordId, historicalRecord);
      
      this.historicalData.push(historicalRecord);
      
      console.log(`📊 Datos históricos obtenidos: ${startDate} a ${endDate}`);
      
      return historicalRecord;
      
    } catch (error) {
      console.error('Error obteniendo datos históricos:', error);
      throw error;
    }
  }

  // ==========================================
  // ANÁLISIS CON MACHINE LEARNING
  // ==========================================

  async initMLModel() {
    try {
      // Inicializar modelo simple de análisis climático
      this.mlModel = {
        patterns: [],
        predictions: [],
        confidence: 0,
        lastTrained: null
      };
      
      // Cargar patrones guardados
      const savedModel = await this.getOfflineManager().loadData('ml_model', 'climate');
      if (savedModel) {
        this.mlModel = savedModel.data;
        console.log('🤖 Modelo ML climático cargado');
      }
      
      // Entrenar con datos históricos si los hay
      if (this.historicalData.length > 0) {
        await this.trainModel();
      }
      
    } catch (error) {
      console.error('Error inicializando modelo ML:', error);
    }
  }

  async trainModel() {
    try {
      console.log('🤖 Entrenando modelo de análisis climático...');
      
      // Análisis de patrones climáticos
      const patterns = this.analyzeWeatherPatterns();
      
      // Correlaciones entre clima y producción
      const correlations = await this.analyzeClimateProductionCorrelations();
      
      // Predicciones de riesgo
      const riskPatterns = this.identifyRiskPatterns();
      
      this.mlModel = {
        patterns,
        correlations,
        riskPatterns,
        confidence: this.calculateModelConfidence(),
        lastTrained: new Date().toISOString(),
        version: (this.mlModel.version || 0) + 1
      };
      
      // Guardar modelo
      await this.getOfflineManager().saveData('ml_model', 'climate', this.mlModel);
      
      console.log(`🤖 Modelo entrenado con confianza del ${this.mlModel.confidence}%`);
      
    } catch (error) {
      console.error('Error entrenando modelo:', error);
    }
  }

  analyzeWeatherPatterns() {
    if (this.historicalData.length === 0) return [];
    
    const patterns = [];
    
    // Patrón de lluvia
    const rainfallPattern = this.analyzeRainfallPatterns();
    patterns.push(rainfallPattern);
    
    // Patrón de temperatura
    const temperaturePattern = this.analyzeTemperaturePatterns();
    patterns.push(temperaturePattern);
    
    // Patrón de sequía
    const droughtPattern = this.analyzeDroughtPatterns();
    patterns.push(droughtPattern);
    
    return patterns;
  }

  analyzeRainfallPatterns() {
    const dailyRainfall = [];
    
    this.historicalData.forEach(record => {
      if (record.daily && record.daily.precipitation_sum) {
        record.daily.precipitation_sum.forEach((rain, index) => {
          dailyRainfall.push({
            date: record.daily.time[index],
            rain: rain || 0
          });
        });
      }
    });
    
    // Calcular estadísticas
    const avgRainfall = dailyRainfall.reduce((sum, day) => sum + day.rain, 0) / dailyRainfall.length;
    const dryDays = dailyRainfall.filter(day => day.rain < 1).length;
    const heavyRainDays = dailyRainfall.filter(day => day.rain > 20).length;
    
    return {
      type: 'rainfall',
      avgDaily: avgRainfall,
      dryDaysPercentage: (dryDays / dailyRainfall.length) * 100,
      heavyRainDaysPercentage: (heavyRainDays / dailyRainfall.length) * 100,
      seasonality: this.detectSeasonality(dailyRainfall, 'rain')
    };
  }

  analyzeTemperaturePatterns() {
    const dailyTemps = [];
    
    this.historicalData.forEach(record => {
      if (record.daily) {
        record.daily.temperature_2m_max?.forEach((maxTemp, index) => {
          const minTemp = record.daily.temperature_2m_min?.[index];
          if (maxTemp && minTemp) {
            dailyTemps.push({
              date: record.daily.time[index],
              max: maxTemp,
              min: minTemp,
              avg: (maxTemp + minTemp) / 2
            });
          }
        });
      }
    });
    
    const avgTemp = dailyTemps.reduce((sum, day) => sum + day.avg, 0) / dailyTemps.length;
    const hotDays = dailyTemps.filter(day => day.max > this.thresholds.temperature.optimal.max).length;
    const coldDays = dailyTemps.filter(day => day.min < this.thresholds.temperature.optimal.min).length;
    
    return {
      type: 'temperature',
      avgDaily: avgTemp,
      hotDaysPercentage: (hotDays / dailyTemps.length) * 100,
      coldDaysPercentage: (coldDays / dailyTemps.length) * 100,
      seasonality: this.detectSeasonality(dailyTemps, 'avg')
    };
  }

  analyzeDroughtPatterns() {
    // Detectar períodos de sequía (7+ días consecutivos con <2mm lluvia)
    const droughtPeriods = [];
    let currentDrought = null;
    
    this.historicalData.forEach(record => {
      if (record.daily && record.daily.precipitation_sum) {
        record.daily.precipitation_sum.forEach((rain, index) => {
          const date = record.daily.time[index];
          
          if ((rain || 0) < 2) {
            if (!currentDrought) {
              currentDrought = { start: date, days: 1 };
            } else {
              currentDrought.days++;
            }
          } else {
            if (currentDrought && currentDrought.days >= 7) {
              droughtPeriods.push({
                ...currentDrought,
                end: date,
                severity: this.calculateDroughtSeverity(currentDrought.days)
              });
            }
            currentDrought = null;
          }
        });
      }
    });
    
    return {
      type: 'drought',
      periodsCount: droughtPeriods.length,
      avgDuration: droughtPeriods.length > 0 
        ? droughtPeriods.reduce((sum, d) => sum + d.days, 0) / droughtPeriods.length 
        : 0,
      maxDuration: droughtPeriods.length > 0 
        ? Math.max(...droughtPeriods.map(d => d.days)) 
        : 0,
      periods: droughtPeriods
    };
  }

  async analyzeClimateProductionCorrelations() {
    try {
      // Obtener datos de producción
      const productionData = await this.getOfflineManager().getAllData('produccion');
      
      if (productionData.length === 0) {
        return { correlations: [], confidence: 0 };
      }
      
      const correlations = {
        rainfall_yield: this.calculateCorrelation('rainfall', 'yield', productionData),
        temperature_yield: this.calculateCorrelation('temperature', 'yield', productionData),
        humidity_diseases: this.calculateCorrelation('humidity', 'diseases', productionData),
        wind_damage: this.calculateCorrelation('wind', 'damage', productionData)
      };
      
      return {
        correlations,
        confidence: this.calculateCorrelationConfidence(correlations)
      };
      
    } catch (error) {
      console.error('Error analizando correlaciones:', error);
      return { correlations: [], confidence: 0 };
    }
  }

  identifyRiskPatterns() {
    const risks = [];
    
    // Riesgo de sequía
    const droughtRisk = this.calculateDroughtRisk();
    if (droughtRisk.level > 0.3) {
      risks.push(droughtRisk);
    }
    
    // Riesgo de exceso de lluvia
    const floodRisk = this.calculateFloodRisk();
    if (floodRisk.level > 0.3) {
      risks.push(floodRisk);
    }
    
    // Riesgo de temperaturas extremas
    const tempRisk = this.calculateTemperatureRisk();
    if (tempRisk.level > 0.3) {
      risks.push(tempRisk);
    }
    
    return risks;
  }

  // ==========================================
  // ANÁLISIS DE CONDICIONES ACTUALES
  // ==========================================

  async analyzeCurrentConditions() {
    if (!this.currentWeather) return;
    
    const analysis = {
      timestamp: new Date().toISOString(),
      conditions: this.classifyCurrentConditions(),
      alerts: this.generateCurrentAlerts(),
      recommendations: this.generateCurrentRecommendations(),
      impact: this.assessImpactOnLimons()
    };
    
    // Guardar análisis
    await this.getOfflineManager().saveData('weather_analysis', 'current', analysis);
    
    this.broadcastWeatherAnalysis(analysis);
    
    return analysis;
  }

  classifyCurrentConditions() {
    const weather = this.currentWeather;
    const conditions = {
      temperature: this.classifyTemperature(weather.temperature_2m),
      humidity: this.classifyHumidity(weather.relative_humidity_2m),
      precipitation: this.classifyPrecipitation(weather.precipitation),
      wind: this.classifyWind(weather.wind_speed_10m),
      uv: this.classifyUV(weather.uv_index),
      overall: 'favorable' // será calculado
    };
    
    // Calcular condición general
    const scores = {
      favorable: 0,
      warning: 0,
      critical: 0
    };
    
    Object.values(conditions).forEach(condition => {
      if (typeof condition === 'object' && condition.category) {
        scores[condition.category]++;
      }
    });
    
    conditions.overall = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );
    
    return conditions;
  }

  classifyTemperature(temp) {
    const thresholds = this.thresholds.temperature;
    
    if (temp < thresholds.critical.min || temp > thresholds.critical.max) {
      return {
        category: 'critical',
        value: temp,
        message: temp < thresholds.critical.min ? 'Temperatura crítica baja' : 'Temperatura crítica alta',
        impact: 'Alto riesgo para los limones'
      };
    } else if (temp < thresholds.optimal.min || temp > thresholds.optimal.max) {
      return {
        category: 'warning',
        value: temp,
        message: temp < thresholds.optimal.min ? 'Temperatura baja' : 'Temperatura alta',
        impact: 'Condiciones subóptimas'
      };
    } else {
      return {
        category: 'favorable',
        value: temp,
        message: 'Temperatura óptima',
        impact: 'Favorable para el crecimiento'
      };
    }
  }

  classifyHumidity(humidity) {
    const thresholds = this.thresholds.humidity;
    
    if (humidity < thresholds.critical.min || humidity > thresholds.critical.max) {
      return {
        category: 'critical',
        value: humidity,
        message: humidity < thresholds.critical.min ? 'Humedad muy baja' : 'Humedad excesiva',
        impact: humidity < thresholds.critical.min ? 'Riesgo de estrés hídrico' : 'Alto riesgo de hongos'
      };
    } else if (humidity < thresholds.optimal.min || humidity > thresholds.optimal.max) {
      return {
        category: 'warning',
        value: humidity,
        message: humidity < thresholds.optimal.min ? 'Humedad baja' : 'Humedad alta',
        impact: 'Monitorear desarrollo de enfermedades'
      };
    } else {
      return {
        category: 'favorable',
        value: humidity,
        message: 'Humedad óptima',
        impact: 'Condiciones favorables'
      };
    }
  }

  classifyPrecipitation(precipitation) {
    if (precipitation === 0) {
      return {
        category: 'favorable',
        value: precipitation,
        message: 'Sin lluvia',
        impact: 'Condiciones secas'
      };
    } else if (precipitation > this.thresholds.rainfall.daily_max) {
      return {
        category: 'critical',
        value: precipitation,
        message: 'Lluvia intensa',
        impact: 'Riesgo de inundación y enfermedades'
      };
    } else {
      return {
        category: 'favorable',
        value: precipitation,
        message: 'Lluvia moderada',
        impact: 'Beneficiosa para la hidratación'
      };
    }
  }

  classifyWind(windSpeed) {
    if (windSpeed > this.thresholds.wind.dangerous_wind) {
      return {
        category: 'critical',
        value: windSpeed,
        message: 'Vientos peligrosos',
        impact: 'Alto riesgo de daño a árboles'
      };
    } else if (windSpeed > this.thresholds.wind.strong_wind) {
      return {
        category: 'warning',
        value: windSpeed,
        message: 'Vientos fuertes',
        impact: 'Posible caída de frutos'
      };
    } else {
      return {
        category: 'favorable',
        value: windSpeed,
        message: 'Vientos moderados',
        impact: 'Buena ventilación'
      };
    }
  }

  classifyUV(uvIndex) {
    if (uvIndex > this.thresholds.uv.extreme) {
      return {
        category: 'critical',
        value: uvIndex,
        message: 'Radiación UV extrema',
        impact: 'Riesgo de quemaduras en frutos'
      };
    } else if (uvIndex > this.thresholds.uv.high) {
      return {
        category: 'warning',
        value: uvIndex,
        message: 'Radiación UV alta',
        impact: 'Monitorear exposición solar'
      };
    } else {
      return {
        category: 'favorable',
        value: uvIndex,
        message: 'Radiación UV normal',
        impact: 'Favorable para fotosíntesis'
      };
    }
  }

  generateCurrentAlerts() {
    const alerts = [];
    const weather = this.currentWeather;
    
    // Alertas críticas adaptadas para Guatemala
    if (weather.temperature_2m < this.thresholds.temperature.critical.min) {
      alerts.push({
        level: 'critical',
        type: 'cold',
        message: 'ALERTA DE FRÍO: Temperatura baja para la región',
        actions: ['Proteger árboles jóvenes', 'Aplicar riego en horas cálidas', 'Monitorear constantemente']
      });
    }
    
    if (weather.temperature_2m > this.thresholds.temperature.critical.max) {
      alerts.push({
        level: 'critical',
        type: 'heat',
        message: 'ALERTA DE CALOR EXTREMO',
        actions: ['Aumentar riego', 'Proteger del sol directo', 'Revisar sistema de sombra']
      });
    }
    
    if (weather.wind_speed_10m > this.thresholds.wind.dangerous_wind) {
      alerts.push({
        level: 'critical',
        type: 'wind',
        message: 'ALERTA DE VIENTOS PELIGROSOS',
        actions: ['Asegurar estructuras', 'Cosechar frutos maduros', 'Revisar tutores']
      });
    }
    
    // Alertas de advertencia
    if (weather.relative_humidity_2m > this.thresholds.humidity.optimal.max) {
      alerts.push({
        level: 'warning',
        type: 'humidity',
        message: 'Humedad alta - Riesgo de hongos',
        actions: ['Mejorar ventilación', 'Aplicar fungicidas preventivos', 'Monitorear síntomas']
      });
    }
    
    // Alerta específica para índice UV alto (común en Guatemala)
    if (weather.uv_index > this.thresholds.uv.high) {
      alerts.push({
        level: 'warning',
        type: 'uv',
        message: 'Índice UV alto - Proteger frutos y trabajadores',
        actions: ['Usar protección solar', 'Trabajar en horas tempranas', 'Proteger frutos expuestos']
      });
    }
    
    return alerts;
  }

  generateCurrentRecommendations() {
    const recommendations = [];
    const weather = this.currentWeather;
    const analysis = this.classifyCurrentConditions();
    
    // Recomendaciones de riego para clima guatemalteco
    if (weather.precipitation === 0 && weather.temperature_2m > 28) {
      recommendations.push({
        category: 'riego',
        priority: 'high',
        message: 'Incrementar frecuencia de riego debido a alta temperatura y ausencia de lluvia',
        timing: 'Regar en horas tempranas de la mañana (5-7 AM)'
      });
    }
    
    // Recomendaciones de tratamientos
    if (weather.relative_humidity_2m > 80 && weather.temperature_2m > 22) {
      recommendations.push({
        category: 'tratamientos',
        priority: 'medium',
        message: 'Condiciones favorables para hongos - Aplicar tratamiento preventivo',
        timing: 'Aplicar en las próximas 24 horas'
      });
    }
    
    // Recomendaciones de cosecha
    if (analysis.overall === 'favorable' && weather.precipitation === 0) {
      recommendations.push({
        category: 'cosecha',
        priority: 'medium',
        message: 'Condiciones ideales para cosecha',
        timing: 'Aprovechar condiciones secas'
      });
    }
    
    // Recomendación específica para manejo de sombra
    if (weather.uv_index > 9 && weather.temperature_2m > 30) {
      recommendations.push({
        category: 'protección',
        priority: 'high',
        message: 'Implementar sombra temporal para proteger frutos jóvenes',
        timing: 'Durante horas pico de sol (10 AM - 3 PM)'
      });
    }
    
    return recommendations;
  }

  assessImpactOnLimons() {
    const weather = this.currentWeather;
    const impact = {
      growth: 0,
      flowering: 0,
      fruiting: 0,
      diseases: 0,
      overall: 0
    };
    
    // Impacto en crecimiento (ajustado para limones en Guatemala)
    if (weather.temperature_2m >= 18 && weather.temperature_2m <= 32) {
      impact.growth += 0.8;
    } else {
      impact.growth -= 0.5;
    }
    
    if (weather.relative_humidity_2m >= 65 && weather.relative_humidity_2m <= 85) {
      impact.growth += 0.2;
    }
    
    // Impacto en floración
    if (weather.temperature_2m >= 20 && weather.temperature_2m <= 28) {
      impact.flowering += 0.7;
    }
    
    if (weather.wind_speed_10m < 15) {
      impact.flowering += 0.3;
    } else {
      impact.flowering -= 0.4;
    }
    
    // Impacto en fructificación
    if (weather.precipitation > 0 && weather.precipitation < 30) {
      impact.fruiting += 0.6;
    }
    
    // Riesgo de enfermedades (mayor en clima húmedo de Guatemala)
    if (weather.relative_humidity_2m > 85) {
      impact.diseases += 0.8;
    }
    
    if (weather.temperature_2m > 25 && weather.relative_humidity_2m > 75) {
      impact.diseases += 0.2;
    }
    
    // Impacto general
    impact.overall = (impact.growth + impact.flowering + impact.fruiting - impact.diseases) / 3;
    
    return impact;
  }

  // ==========================================
  // PREDICCIONES Y PRONÓSTICO
  // ==========================================

  async analyzeForecast() {
    if (!this.forecastData) return;
    
    const analysis = {
      timestamp: new Date().toISOString(),
      shortTerm: this.analyzeShortTermForecast(3), // 3 días
      mediumTerm: this.analyzeMediumTermForecast(7), // 7 días
      longTerm: this.analyzeLongTermForecast(14), // 14 días
      recommendations: this.generateForecastRecommendations(), // CORREGIDO: Ya no causa recursión
      alerts: this.generateForecastAlerts()
    };
    
    // Guardar análisis
    await this.getOfflineManager().saveData('forecast_analysis', 'current', analysis);
    
    this.broadcastForecastAnalysis(analysis);
    
    return analysis;
  }

  analyzeShortTermForecast(days) {
    const forecast = this.forecastData.daily;
    const analysis = {
      period: `${days} días`,
      avgTemp: 0,
      totalRainfall: 0,
      maxTemp: -Infinity,
      minTemp: Infinity,
      riskDays: 0,
      favorableDays: 0
    };
    
    for (let i = 0; i < days && i < forecast.time.length; i++) {
      const maxTemp = forecast.temperature_2m_max[i];
      const minTemp = forecast.temperature_2m_min[i];
      const rainfall = forecast.precipitation_sum[i] || 0;
      
      analysis.avgTemp += (maxTemp + minTemp) / 2;
      analysis.totalRainfall += rainfall;
      analysis.maxTemp = Math.max(analysis.maxTemp, maxTemp);
      analysis.minTemp = Math.min(analysis.minTemp, minTemp);
      
      // Evaluar riesgo del día
      if (this.isDayRisky(maxTemp, minTemp, rainfall, forecast.wind_speed_10m_max[i])) {
        analysis.riskDays++;
      } else {
        analysis.favorableDays++;
      }
    }
    
    analysis.avgTemp /= days;
    
    return analysis;
  }

  analyzeMediumTermForecast(days) {
    const forecast = this.forecastData.daily;
    const analysis = {
      period: `${days} días`,
      trends: this.identifyWeatherTrends(days),
      irrigation: this.calculateIrrigationNeeds(days),
      workWindows: this.identifyWorkWindows(days)
    };
    
    return analysis;
  }

  analyzeLongTermForecast(days) {
    const forecast = this.forecastData.daily;
    const analysis = {
      period: `${days} días`,
      patterns: this.identifyForecastPatterns(days),
      seasonalTrends: this.analyzeSeasonalTrends(days),
      planning: this.generatePlanningRecommendations(days)
    };
    
    return analysis;
  }

  analyzeSeasonalTrends(days) {
    const forecast = this.forecastData?.daily;
    if (!forecast) return {};
    
    const trends = {
      temperature: { trend: 'stable', change: 0 },
      rainfall: { trend: 'stable', change: 0 },
      humidity: { trend: 'stable', change: 0 }
    };
    
    // Analizar tendencias de temperatura
    const temps = [];
    for (let i = 0; i < Math.min(days, forecast.time.length); i++) {
      if (forecast.temperature_2m_max[i] && forecast.temperature_2m_min[i]) {
        temps.push((forecast.temperature_2m_max[i] + forecast.temperature_2m_min[i]) / 2);
      }
    }
    
    if (temps.length > 1) {
      const tempChange = temps[temps.length - 1] - temps[0];
      trends.temperature.change = tempChange;
      trends.temperature.trend = tempChange > 1 ? 'increasing' : 
                                 tempChange < -1 ? 'decreasing' : 'stable';
    }
    
    // Analizar tendencias de lluvia
    const rainfall = forecast.precipitation_sum?.slice(0, days) || [];
    if (rainfall.length > 1) {
      const avgEarly = rainfall.slice(0, Math.floor(rainfall.length/2)).reduce((a,b) => a+b, 0);
      const avgLate = rainfall.slice(Math.floor(rainfall.length/2)).reduce((a,b) => a+b, 0);
      const rainChange = avgLate - avgEarly;
      
      trends.rainfall.change = rainChange;
      trends.rainfall.trend = rainChange > 5 ? 'increasing' : 
                              rainChange < -5 ? 'decreasing' : 'stable';
    }
    
    return trends;
  }

  isDayRisky(maxTemp, minTemp, rainfall, windSpeed) {
    return (
      maxTemp > this.thresholds.temperature.critical.max ||
      minTemp < this.thresholds.temperature.critical.min ||
      rainfall > this.thresholds.rainfall.daily_max ||
      windSpeed > this.thresholds.wind.strong_wind
    );
  }

  identifyWeatherTrends(days) {
    const forecast = this.forecastData.daily;
    const trends = {
      temperature: 'stable',
      rainfall: 'stable',
      pressure: 'stable'
    };
    
    // Analizar tendencia de temperatura
    const temps = [];
    for (let i = 0; i < days && i < forecast.time.length; i++) {
      temps.push((forecast.temperature_2m_max[i] + forecast.temperature_2m_min[i]) / 2);
    }
    
    const tempTrend = this.calculateTrend(temps);
    if (tempTrend > 0.5) trends.temperature = 'increasing';
    else if (tempTrend < -0.5) trends.temperature = 'decreasing';
    
    // Analizar tendencia de lluvia
    const rainfall = forecast.precipitation_sum.slice(0, days);
    const rainTrend = this.calculateTrend(rainfall);
    if (rainTrend > 0.3) trends.rainfall = 'increasing';
    else if (rainTrend < -0.3) trends.rainfall = 'decreasing';
    
    return trends;
  }

  calculateIrrigationNeeds(days) {
    const forecast = this.forecastData.daily;
    const needs = [];
    
    for (let i = 0; i < days && i < forecast.time.length; i++) {
      const rainfall = forecast.precipitation_sum[i] || 0;
      const maxTemp = forecast.temperature_2m_max[i];
      const et0 = forecast.et0_fao_evapotranspiration?.[i] || 5; // Default ET0 para Guatemala
      
      // Calcular necesidad de riego (ajustado para limones)
      const waterNeed = Math.max(0, et0 * 1.2 - rainfall); // Factor 1.2 para limones
      
      needs.push({
        date: forecast.time[i],
        rainfall: rainfall,
        et0: et0,
        waterNeed: waterNeed,
        recommendation: this.getIrrigationRecommendation(waterNeed, rainfall, maxTemp)
      });
    }
    
    return needs;
  }

  getIrrigationRecommendation(waterNeed, rainfall, temp) {
    if (rainfall > 15) {
      return { level: 'none', message: 'No regar - lluvia suficiente' };
    } else if (waterNeed > 6 || temp > 32) {
      return { level: 'high', message: 'Riego intensivo necesario - aplicar 40-50 L/árbol' };
    } else if (waterNeed > 3) {
      return { level: 'medium', message: 'Riego moderado - aplicar 25-30 L/árbol' };
    } else {
      return { level: 'low', message: 'Riego ligero - aplicar 15-20 L/árbol' };
    }
  }

  identifyWorkWindows(days) {
    const forecast = this.forecastData.daily;
    const windows = [];
    
    for (let i = 0; i < days && i < forecast.time.length; i++) {
      const rainfall = forecast.precipitation_sum[i] || 0;
      const windSpeed = forecast.wind_speed_10m_max[i] || 0;
      const temp = forecast.temperature_2m_max[i];
      
      const activities = [];
      
      // Ventana para cosecha
      if (rainfall < 2 && windSpeed < 20 && temp < 35) {
        activities.push('cosecha');
      }
      
      // Ventana para tratamientos
      if (rainfall < 1 && windSpeed < 15) {
        activities.push('tratamientos');
      }
      
      // Ventana para podas
      if (rainfall < 5 && windSpeed < 25) {
        activities.push('podas');
      }
      
      // Ventana para fertilización
      if (rainfall > 0 && rainfall < 20) {
        activities.push('fertilización');
      }
      
      if (activities.length > 0) {
        windows.push({
          date: forecast.time[i],
          activities: activities,
          conditions: { rainfall, windSpeed, temp }
        });
      }
    }
    
    return windows;
  }

  identifyForecastPatterns(days) {
    const forecast = this.forecastData?.daily;
    if (!forecast) return {};
    
    const patterns = {
      drySpells: [],
      wetPeriods: [],
      heatWaves: [],
      optimalPeriods: []
    };
    
    let consecutiveDry = 0;
    let consecutiveWet = 0;
    let consecutiveHot = 0;
    
    for (let i = 0; i < days && i < forecast.time.length; i++) {
      const rain = forecast.precipitation_sum[i] || 0;
      const maxTemp = forecast.temperature_2m_max[i];
      const minTemp = forecast.temperature_2m_min[i];
      
      // Detectar períodos secos
      if (rain < 2) {
        consecutiveDry++;
        consecutiveWet = 0;
      } else {
        if (consecutiveDry >= 5) {
          patterns.drySpells.push({
            start: i - consecutiveDry,
            end: i - 1,
            duration: consecutiveDry
          });
        }
        consecutiveDry = 0;
        consecutiveWet++;
      }
      
      // Detectar olas de calor
      if (maxTemp > 32) {
        consecutiveHot++;
      } else {
        if (consecutiveHot >= 3) {
          patterns.heatWaves.push({
            start: i - consecutiveHot,
            end: i - 1,
            duration: consecutiveHot
          });
        }
        consecutiveHot = 0;
      }
      
      // Detectar períodos óptimos
      if (maxTemp >= 22 && maxTemp <= 30 && minTemp >= 18 && rain < 20 && rain > 0) {
        patterns.optimalPeriods.push(i);
      }
    }
    
    return patterns;
  }

  generateForecastRecommendations() {
    // CORRECCIÓN: Eliminada la llamada recursiva a analyzeForecast()
    const shortTerm = this.forecastData ? this.analyzeShortTermForecast(3) : null;
    
    const recommendations = [];
    
    if (shortTerm) {
      // Recomendaciones basadas en pronóstico a corto plazo
      if (shortTerm.totalRainfall < 5) {
        recommendations.push({
          type: 'irrigation',
          priority: 'high',
          message: 'Se esperan condiciones secas. Preparar sistema de riego.',
          action: 'Revisar y mantener sistema de riego'
        });
      }
      
      if (shortTerm.maxTemp > 32) {
        recommendations.push({
          type: 'protection',
          priority: 'medium',
          message: 'Temperaturas altas esperadas. Proteger frutos jóvenes.',
          action: 'Instalar mallas de sombra temporales'
        });
      }
    }
    
    return recommendations;
  }

  generateForecastAlerts() {
    const forecast = this.forecastData?.daily;
    if (!forecast) return [];
    
    const alerts = [];
    
    // Buscar condiciones extremas en el pronóstico
    for (let i = 0; i < 7 && i < forecast.time.length; i++) {
      const maxTemp = forecast.temperature_2m_max[i];
      const minTemp = forecast.temperature_2m_min[i];
      const rain = forecast.precipitation_sum[i] || 0;
      const wind = forecast.wind_speed_10m_max[i] || 0;
      
      if (maxTemp > 35) {
        alerts.push({
          day: i,
          type: 'heat',
          level: 'warning',
          message: `Calor extremo esperado en ${i} días (${maxTemp}°C)`
        });
      }
      
      if (rain > 50) {
        alerts.push({
          day: i,
          type: 'rain',
          level: 'warning',
          message: `Lluvia intensa esperada en ${i} días (${rain}mm)`
        });
      }
      
      if (wind > 40) {
        alerts.push({
          day: i,
          type: 'wind',
          level: 'warning',
          message: `Vientos fuertes esperados en ${i} días (${wind} km/h)`
        });
      }
    }
    
    return alerts;
  }

  generatePlanningRecommendations(days) {
    const patterns = this.identifyForecastPatterns(days);
    const recommendations = {};
    
    // Planificación de riego
    if (patterns.drySpells && patterns.drySpells.length > 0) {
      recommendations.irrigation = {
        priority: 'high',
        message: 'Períodos secos detectados. Planificar riego intensivo.',
        periods: patterns.drySpells
      };
    }
    
    // Planificación de protección
    if (patterns.heatWaves && patterns.heatWaves.length > 0) {
      recommendations.protection = {
        priority: 'medium',
        message: 'Olas de calor detectadas. Preparar medidas de protección.',
        periods: patterns.heatWaves
      };
    }
    
    // Planificación de actividades
    if (patterns.optimalPeriods && patterns.optimalPeriods.length > 0) {
      recommendations.activities = {
        priority: 'low',
        message: 'Períodos óptimos para actividades agrícolas.',
        days: patterns.optimalPeriods
      };
    }
    
    return recommendations;
  }

  // ==========================================
  // UTILIDADES DE CÁLCULO
  // ==========================================

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, val, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  calculateCorrelation(weatherParam, productionParam, data) {
    // Implementar cálculo de correlación básico
    // Por ahora retorna valor simulado
    return 0.5 + Math.random() * 0.3;
  }

  calculateCorrelationConfidence(correlations) {
    // Calcular confianza basada en las correlaciones
    const values = Object.values(correlations);
    const avg = values.reduce((sum, val) => sum + Math.abs(val), 0) / values.length;
    return Math.min(95, avg * 100);
  }

  calculateDroughtRisk() {
    const forecast = this.forecastData?.daily;
    if (!forecast) return { level: 0, message: 'Sin datos' };
    
    let consecutiveDryDays = 0;
    let totalRainfall = 0;
    
    for (let i = 0; i < 7 && i < forecast.time.length; i++) {
      const rainfall = forecast.precipitation_sum[i] || 0;
      totalRainfall += rainfall;
      
      if (rainfall < 2) {
        consecutiveDryDays++;
      } else {
        consecutiveDryDays = 0;
      }
    }
    
    const risk = Math.min(1, consecutiveDryDays / 7 + (1 - totalRainfall / 30));
    
    return {
      level: risk,
      consecutiveDryDays,
      totalRainfall,
      message: risk > 0.7 ? 'Alto riesgo de sequía' : 
               risk > 0.4 ? 'Riesgo moderado de sequía' : 'Bajo riesgo de sequía'
    };
  }

  calculateFloodRisk() {
    const forecast = this.forecastData?.daily;
    if (!forecast) return { level: 0, message: 'Sin datos' };
    
    let maxDailyRain = 0;
    let totalRainfall = 0;
    
    for (let i = 0; i < 3 && i < forecast.time.length; i++) {
      const rainfall = forecast.precipitation_sum[i] || 0;
      totalRainfall += rainfall;
      maxDailyRain = Math.max(maxDailyRain, rainfall);
    }
    
    const risk = Math.min(1, maxDailyRain / 60 + totalRainfall / 120);
    
    return {
      level: risk,
      maxDailyRain,
      totalRainfall,
      message: risk > 0.7 ? 'Alto riesgo de inundación' : 
               risk > 0.4 ? 'Riesgo moderado de inundación' : 'Bajo riesgo de inundación'
    };
  }

  calculateTemperatureRisk() {
    const forecast = this.forecastData?.daily;
    if (!forecast) return { level: 0, message: 'Sin datos' };
    
    let extremeDays = 0;
    
    for (let i = 0; i < 7 && i < forecast.time.length; i++) {
      const maxTemp = forecast.temperature_2m_max[i];
      const minTemp = forecast.temperature_2m_min[i];
      
      if (maxTemp > this.thresholds.temperature.critical.max || 
          minTemp < this.thresholds.temperature.critical.min) {
        extremeDays++;
      }
    }
    
    const risk = extremeDays / 7;
    
    return {
      level: risk,
      extremeDays,
      message: risk > 0.4 ? 'Alto riesgo de temperaturas extremas' : 
               risk > 0.2 ? 'Riesgo moderado de temperaturas extremas' : 'Bajo riesgo de temperaturas extremas'
    };
  }

  calculateModelConfidence() {
    const dataPoints = this.historicalData.reduce((sum, record) => {
      return sum + (record.daily?.time?.length || 0);
    }, 0);
    
    if (dataPoints > 365) return 85;
    if (dataPoints > 180) return 70;
    if (dataPoints > 90) return 55;
    if (dataPoints > 30) return 40;
    return 25;
  }

  detectSeasonality(data, valueKey) {
    // Análisis básico de estacionalidad
    const monthlyData = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }));
    
    data.forEach(item => {
      const date = new Date(item.date);
      const month = date.getMonth();
      monthlyData[month].sum += item[valueKey];
      monthlyData[month].count++;
    });
    
    const monthlyAverages = monthlyData.map(month => 
      month.count > 0 ? month.sum / month.count : 0
    );
    
    return {
      monthlyAverages,
      peakMonth: monthlyAverages.indexOf(Math.max(...monthlyAverages)),
      lowMonth: monthlyAverages.indexOf(Math.min(...monthlyAverages))
    };
  }

  calculateDroughtSeverity(days) {
    if (days >= 30) return 'extreme';
    if (days >= 21) return 'severe';
    if (days >= 14) return 'moderate';
    return 'mild';
  }

  // ==========================================
  // EVENTOS Y COMUNICACIÓN
  // ==========================================

  setupAutoUpdate() {
    setInterval(async () => {
      try {
        if (navigator.onLine) {
          await this.getCurrentWeather();
          
          // Actualizar pronóstico cada hora
          const now = new Date();
          if (now.getMinutes() === 0) {
            await this.getForecast();
          }
        }
      } catch (error) {
        console.error('Error en actualización automática:', error);
      }
    }, this.updateInterval);
  }

  setupWeatherAlerts() {
    // Configurar alertas automáticas basadas en umbrales
    setInterval(() => {
      this.checkCriticalConditions();
    }, 60000); // Cada minuto
  }

  checkCriticalConditions() {
    if (!this.currentWeather) return;
    
    const criticalAlerts = this.generateCurrentAlerts().filter(alert => 
      alert.level === 'critical'
    );
    
    if (criticalAlerts.length > 0) {
      this.broadcastCriticalAlert(criticalAlerts);
    }
  }

  broadcastWeatherUpdate() {
    window.dispatchEvent(new CustomEvent('weatherUpdate', {
      detail: { 
        current: this.currentWeather,
        timestamp: new Date().toISOString()
      }
    }));
  }

  broadcastForecastUpdate() {
    window.dispatchEvent(new CustomEvent('forecastUpdate', {
      detail: { 
        forecast: this.forecastData,
        timestamp: new Date().toISOString()
      }
    }));
  }

  broadcastWeatherAnalysis(analysis) {
    window.dispatchEvent(new CustomEvent('weatherAnalysis', {
      detail: { analysis }
    }));
  }

  broadcastForecastAnalysis(analysis) {
    window.dispatchEvent(new CustomEvent('forecastAnalysis', {
      detail: { analysis }
    }));
  }

  broadcastCriticalAlert(alerts) {
    window.dispatchEvent(new CustomEvent('criticalWeatherAlert', {
      detail: { alerts }
    }));
    
    // Mostrar notificación del sistema si está disponible
    if ('Notification' in window && Notification.permission === 'granted') {
      alerts.forEach(alert => {
        new Notification('🌦️ Alerta Climática Crítica', {
          body: alert.message,
          icon: '/icons/weather-alert.png'
        });
      });
    }
  }

  // ==========================================
  // API PÚBLICA
  // ==========================================

  async getWeatherData() {
    return {
      current: this.currentWeather,
      forecast: this.forecastData,
      historical: this.historicalData,
      analysis: await this.getOfflineManager().loadData('weather_analysis', 'current'),
      forecastAnalysis: await this.getOfflineManager().loadData('forecast_analysis', 'current')
    };
  }

  async refreshAll() {
    await this.getCurrentWeather();
    await this.getForecast();
    await this.trainModel();
  }

  getRecommendations() {
    return this.recommendations;
  }

  getAlerts() {
    return this.alerts;
  }

  // Obtener datos para períodos específicos
  async getWeatherForDateRange(startDate, endDate) {
    return await this.getHistoricalData(startDate, endDate);
  }

  // Predicción personalizada
  async predictOptimalHarvestDays(daysAhead = 7) {
    if (!this.forecastData) return [];
    
    const optimalDays = [];
    const forecast = this.forecastData.daily;
    
    for (let i = 0; i < daysAhead && i < forecast.time.length; i++) {
      const rainfall = forecast.precipitation_sum[i] || 0;
      const windSpeed = forecast.wind_speed_10m_max[i] || 0;
      const temp = forecast.temperature_2m_max[i];
      
      // Condiciones óptimas para cosecha de limones
      if (rainfall < 2 && windSpeed < 20 && temp < 35 && temp > 18) {
        optimalDays.push({
          date: forecast.time[i],
          score: this.calculateHarvestScore(rainfall, windSpeed, temp),
          conditions: { rainfall, windSpeed, temp }
        });
      }
    }
    
    return optimalDays.sort((a, b) => b.score - a.score);
  }

  calculateHarvestScore(rainfall, windSpeed, temp) {
    let score = 100;
    
    // Penalizar lluvia
    score -= rainfall * 10;
    
    // Penalizar viento
    score -= Math.max(0, windSpeed - 10) * 2;
    
    // Penalizar temperaturas extremas (ajustado para Guatemala)
    if (temp > 30) score -= (temp - 30) * 5;
    if (temp < 20) score -= (20 - temp) * 3;
    
    return Math.max(0, score);
  }

  // Exportar datos
  async exportarDatos() {
    const datos = {
      fecha: new Date().toISOString(),
      ubicacion: 'Finca La Herradura, Guatemala',
      coordenadas: this.fincaLocation,
      climaActual: this.currentWeather,
      pronostico: this.forecastData?.daily ? {
        dias: this.forecastData.daily.time.length,
        temperaturaMax: this.forecastData.daily.temperature_2m_max,
        temperaturaMin: this.forecastData.daily.temperature_2m_min,
        precipitacion: this.forecastData.daily.precipitation_sum
      } : null,
      alertas: this.alerts,
      recomendaciones: this.recommendations
    };
    
    // Crear blob y descargar
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clima-finca-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Datos exportados correctamente');
  }

  // Mostrar histórico detallado
  mostrarHistoricoDetallado(tipo) {
    console.log(`📊 Mostrando histórico de ${tipo}`);
    // Implementar visualización detallada
    // Por ahora solo log
    if (this.historicalData.length > 0) {
      console.log('Datos históricos disponibles:', this.historicalData);
    } else {
      console.log('No hay datos históricos disponibles');
    }
  }
}

// ==========================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ==========================================

// Instancia global del gestor climático
let climateManager;

// Exportar para uso en otros módulos
document.addEventListener('DOMContentLoaded', () => {
  climateManager = new ClimateManager();
  window.climateManager = climateManager;
  window.climaManager = climateManager; // Alias para compatibilidad
  window.getWeatherData = () => climateManager.getWeatherData();
  window.refreshWeather = () => climateManager.refreshAll();
  window.getOptimalHarvestDays = (days) => climateManager.predictOptimalHarvestDays(days);

  console.log('🌦️ Sistema climático con IA inicializado para Finca La Herradura');
  console.log('📍 Ubicación: 14.77073, -90.25398 (Guatemala)');
});

// Exportar la clase para módulos ES6
export default ClimateManager;
