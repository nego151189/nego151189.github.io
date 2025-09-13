/* ========================================
   FINCA LA HERRADURA - TREE MANAGER
   Gestor completo de árboles con Firebase Firestore
   ======================================== */

class TreeManager {
  constructor() {
    this.trees = new Map();
    this.sectors = new Map(); // AGREGADO: Gestión de sectores
    this.isInitialized = false;
    this.db = null;
    this.auth = null;
    
    // Esperar Firebase y luego inicializar
    this.waitForFirebase().then(() => {
      this.init();
    }).catch(error => {
      console.error('Error inicializando TreeManager:', error);
    });
  }

  async waitForFirebase() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50;
      let attempts = 0;
      
      const checkFirebase = () => {
        attempts++;
        
        if (window.firebase && window.db && window.auth) {
          this.db = window.db;
          this.auth = window.auth;
          console.log('✅ Firebase disponible para TreeManager');
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(checkFirebase, 100);
        } else {
          reject(new Error('Firebase timeout'));
        }
      };
      
      checkFirebase();
    });
  }

  async init() {
    try {
      console.log('🌳 Inicializando TreeManager...');
      
      // Cargar sectores y árboles
      await this.loadSectors();
      await this.loadAllTrees();
      
      this.isInitialized = true;
      console.log('✅ TreeManager inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando TreeManager:', error);
      this.isInitialized = false;
    }
  }

  // ==========================================
  // GESTIÓN DE SECTORES (NUEVO)
  // ==========================================

  async loadSectors() {
    try {
      // Intentar cargar desde Firebase primero
      if (this.db) {
        const snapshot = await this.db.collection('sectores')
          .where('active', '==', true)
          .get();
        
        snapshot.forEach(doc => {
          const sectorData = {
            id: doc.id,
            ...doc.data(),
            firebaseRef: doc.ref
          };
          this.sectors.set(doc.id, sectorData);
        });
        
        console.log(`📦 ${this.sectors.size} sectores cargados desde Firebase`);
      }
      
      // Si no hay sectores en Firebase, cargar desde localStorage
      if (this.sectors.size === 0) {
        this.loadSectorsFromLocalStorage();
      }
      
    } catch (error) {
      console.error('Error cargando sectores:', error);
      this.loadSectorsFromLocalStorage();
    }
  }

  loadSectorsFromLocalStorage() {
    try {
      const savedSectors = localStorage.getItem('finca_sectores');
      if (savedSectors) {
        const sectorsData = JSON.parse(savedSectors);
        sectorsData.forEach(sector => {
          this.sectors.set(sector.id, sector);
        });
        console.log(`📦 ${this.sectors.size} sectores cargados desde localStorage`);
      } else {
        this.createDefaultSectors();
      }
    } catch (error) {
      console.error('Error cargando sectores desde localStorage:', error);
      this.createDefaultSectors();
    }
  }

  createDefaultSectors() {
    const defaultSectors = [
      {
        id: 'SECTOR_NORTE',
        name: 'Sector Norte',
        coordinates: {
          center: [14.6359, -90.5069],
          bounds: [[14.6354, -90.5074], [14.6364, -90.5064]]
        },
        capacity: 100,
        currentTrees: 0,
        soilType: 'Franco arcilloso',
        irrigationSystem: 'Goteo',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SECTOR_SUR',
        name: 'Sector Sur',
        coordinates: {
          center: [14.6339, -90.5069],
          bounds: [[14.6334, -90.5074], [14.6344, -90.5064]]
        },
        capacity: 100,
        currentTrees: 0,
        soilType: 'Franco arenoso',
        irrigationSystem: 'Aspersión',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SECTOR_ESTE',
        name: 'Sector Este',
        coordinates: {
          center: [14.6349, -90.5059],
          bounds: [[14.6344, -90.5064], [14.6354, -90.5054]]
        },
        capacity: 100,
        currentTrees: 0,
        soilType: 'Arcilloso',
        irrigationSystem: 'Manual',
        active: true,
        createdAt: new Date().toISOString()
      }
    ];

    defaultSectors.forEach(sector => this.sectors.set(sector.id, sector));
    this.saveSectorsToLocalStorage();
  }

  saveSectorsToLocalStorage() {
    try {
      const sectorsArray = Array.from(this.sectors.values());
      localStorage.setItem('finca_sectores', JSON.stringify(sectorsArray));
    } catch (error) {
      console.error('Error guardando sectores:', error);
    }
  }

  // ==========================================
  // MÉTODOS PARA INTEGRACIÓN CON PRODUCCIÓN
  // ==========================================

  getSectoresParaFormulario() {
    return Array.from(this.sectors.values()).map(sector => ({
      value: sector.id,
      label: sector.name,
      type: 'block',
      data: sector
    }));
  }

  getArbolesParaFormulario() {
    const arboles = Array.from(this.trees.values())
      .filter(tree => tree.active)
      .map(tree => ({
        value: tree.id,
        label: `Árbol ${tree.id.split('_').pop() || tree.id} - ${tree.blockId || 'Sin sector'}`,
        type: 'tree',
        data: tree
      }));

    // Agregar sectores como opciones también
    const sectores = Array.from(this.sectors.values()).map(sector => ({
      value: sector.id,
      label: `${sector.name} (Sector completo)`,
      type: 'block',
      data: sector
    }));

    return [...arboles, ...sectores];
  }

  obtenerListaCompleta() {
    const items = [];
    
    // Agregar árboles
    Array.from(this.trees.values())
      .filter(tree => tree.active)
      .forEach(tree => {
        items.push({
          id: tree.id,
          label: `Árbol ${tree.id.split('_').pop() || tree.id}`,
          type: 'tree',
          blockId: tree.blockId,
          data: tree
        });
      });

    // Agregar sectores
    Array.from(this.sectors.values())
      .filter(sector => sector.active !== false)
      .forEach(sector => {
        items.push({
          id: sector.id,
          label: sector.name,
          type: 'block',
          data: sector
        });
      });

    return items;
  }

  getProductionSummary() {
    const trees = Array.from(this.trees.values()).filter(tree => tree.active);
    
    const totalProduction = trees.reduce((sum, tree) => {
      return sum + (tree.production?.currentSeason || 0);
    }, 0);

    const totalTrees = trees.length;
    const averagePerTree = totalTrees > 0 ? totalProduction / totalTrees : 0;

    return {
      totalProduction: Math.round(totalProduction * 100) / 100,
      totalTrees,
      averagePerTree: Math.round(averagePerTree * 100) / 100
    };
  }

  // ==========================================
  // MÉTODOS DE SECTORES
  // ==========================================

  async createSector(sectorData) {
    try {
      const now = firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString();
      const currentUser = this.auth?.currentUser;
      
      const newSector = {
        name: sectorData.name,
        capacity: sectorData.capacity || 100,
        soilType: sectorData.soilType,
        irrigationSystem: sectorData.irrigationSystem,
        coordinates: sectorData.coordinates,
        currentTrees: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.uid || 'anonymous',
        fincaId: 'finca_la_herradura'
      };

      let savedSector;
      
      if (this.db) {
        // Guardar en Firebase
        const docRef = await this.db.collection('sectores').add(newSector);
        savedSector = {
          id: docRef.id,
          ...newSector,
          firebaseRef: docRef
        };
      } else {
        // Guardar solo localmente
        const sectorId = `SECTOR_${Date.now().toString(36).toUpperCase()}`;
        savedSector = {
          id: sectorId,
          ...newSector
        };
      }

      this.sectors.set(savedSector.id, savedSector);
      this.saveSectorsToLocalStorage();
      
      console.log('✅ Sector creado:', savedSector.id);
      
      // Notificar actualización
      window.dispatchEvent(new CustomEvent('sectorUpdate', {
        detail: { action: 'create', sector: savedSector }
      }));
      
      return savedSector;
      
    } catch (error) {
      console.error('Error creando sector:', error);
      throw error;
    }
  }

  async updateSector(sectorId, updates) {
    try {
      const currentSector = this.sectors.get(sectorId);
      if (!currentSector) throw new Error('Sector no encontrado');

      const updateData = {
        ...updates,
        updatedAt: firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString(),
        updatedBy: this.auth?.currentUser?.uid || 'anonymous'
      };

      if (this.db && currentSector.firebaseRef) {
        await currentSector.firebaseRef.update(updateData);
      }

      const updatedSector = { ...currentSector, ...updateData };
      this.sectors.set(sectorId, updatedSector);
      this.saveSectorsToLocalStorage();
      
      // Notificar actualización
      window.dispatchEvent(new CustomEvent('sectorUpdate', {
        detail: { action: 'update', sector: updatedSector }
      }));
      
      return updatedSector;
      
    } catch (error) {
      console.error('Error actualizando sector:', error);
      throw error;
    }
  }

  async deleteSector(sectorId, reason = 'Eliminado por usuario') {
    try {
      const currentSector = this.sectors.get(sectorId);
      if (!currentSector) throw new Error('Sector no encontrado');

      // Verificar si hay árboles en el sector
      const treesInSector = Array.from(this.trees.values())
        .filter(tree => tree.active && tree.blockId === sectorId);
      
      if (treesInSector.length > 0) {
        throw new Error('No se puede eliminar un sector que tiene árboles');
      }

      if (this.db && currentSector.firebaseRef) {
        await currentSector.firebaseRef.update({
          active: false,
          deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
          deletedBy: this.auth?.currentUser?.uid || 'anonymous',
          deleteReason: reason
        });
      }

      this.sectors.delete(sectorId);
      this.saveSectorsToLocalStorage();
      
      console.log('✅ Sector eliminado:', sectorId);
      
      // Notificar eliminación
      window.dispatchEvent(new CustomEvent('sectorUpdate', {
        detail: { action: 'delete', sectorId: sectorId }
      }));
      
    } catch (error) {
      console.error('Error eliminando sector:', error);
      throw error;
    }
  }

  getAllSectors() {
    return Array.from(this.sectors.values()).filter(sector => sector.active !== false);
  }

  getSector(sectorId) {
    return this.sectors.get(sectorId);
  }

  // ==========================================
  // CARGAR DATOS DESDE FIREBASE
  // ==========================================

  async loadAllTrees() {
    try {
      if (!this.db) {
        console.warn('Firebase no disponible, usando datos locales');
        return;
      }
      
      const snapshot = await this.db.collection('arboles')
        .where('active', '==', true)
        .get();
      
      this.trees.clear();
      
      snapshot.forEach(doc => {
        const treeData = {
          id: doc.id,
          ...doc.data(),
          firebaseRef: doc.ref
        };
        this.trees.set(doc.id, treeData);
      });
      
      console.log(`📊 ${this.trees.size} árboles cargados desde Firebase`);
      
    } catch (error) {
      console.error('Error cargando árboles:', error);
      throw error;
    }
  }

  // ==========================================
  // OPERACIONES CRUD DE ÁRBOLES
  // ==========================================

  async createTree(treeData) {
    try {
      if (!this.db) throw new Error('Firebase no disponible');
      
      // Preparar datos para Firebase
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const currentUser = this.auth?.currentUser;
      
      const newTree = {
        // Datos básicos
        variety: treeData.variety,
        blockId: treeData.blockId,
        plantingDate: treeData.plantingDate,
        
        // Ubicación GPS
        location: {
          latitude: treeData.latitude,
          longitude: treeData.longitude,
          elevation: treeData.elevation || null
        },
        
        // Medidas
        measurements: {
          height: treeData.height || 0,
          diameter: treeData.diameter || 0,
          canopyWidth: treeData.canopyWidth || 0
        },
        
        // Salud
        health: {
          overall: treeData.health?.overall || 100,
          leaves: treeData.health?.leaves || 100,
          trunk: treeData.health?.trunk || 100,
          lastInspection: now
        },
        
        // Producción (inicializar en 0)
        production: {
          currentSeason: 0,
          totalLifetime: 0,
          averageYield: 0,
          lastHarvest: null
        },
        
        // Metadatos
        notes: treeData.notes || '',
        active: true,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.uid || 'anonymous',
        fincaId: 'finca_la_herradura'
      };
      
      // Calcular edad basada en fecha de plantación
      if (newTree.plantingDate) {
        const plantDate = new Date(newTree.plantingDate);
        const now = new Date();
        newTree.age = Math.floor((now - plantDate) / (365.25 * 24 * 60 * 60 * 1000));
      }
      
      // Guardar en Firebase
      const docRef = await this.db.collection('arboles').add(newTree);
      
      // Actualizar caché local
      const savedTree = {
        id: docRef.id,
        ...newTree,
        firebaseRef: docRef
      };
      
      this.trees.set(docRef.id, savedTree);
      
      // Actualizar contador de árboles en el sector
      if (savedTree.blockId) {
        await this.updateTreeCountInSector(savedTree.blockId, 1);
      }
      
      // Guardar offline para sincronización
      if (window.offlineManager) {
        await window.offlineManager.saveData('arboles', docRef.id, savedTree);
      }
      
      console.log('✅ Árbol creado:', docRef.id);
      
      // Notificar actualización
      window.dispatchEvent(new CustomEvent('treeUpdate', {
        detail: { action: 'create', tree: savedTree }
      }));
      
      return savedTree;
      
    } catch (error) {
      console.error('Error creando árbol:', error);
      throw error;
    }
  }

  async updateTree(treeId, updates) {
    try {
      if (!this.db) throw new Error('Firebase no disponible');
      
      const treeRef = this.db.collection('arboles').doc(treeId);
      const currentUser = this.auth?.currentUser;
      
      const updateData = {
        ...updates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser?.uid || 'anonymous'
      };
      
      // Actualizar en Firebase
      await treeRef.update(updateData);
      
      // Actualizar caché local
      const currentTree = this.trees.get(treeId);
      if (currentTree) {
        const updatedTree = { ...currentTree, ...updateData };
        this.trees.set(treeId, updatedTree);
        
        // Guardar offline
        if (window.offlineManager) {
          await window.offlineManager.saveData('arboles', treeId, updatedTree);
        }
        
        // Notificar actualización
        window.dispatchEvent(new CustomEvent('treeUpdate', {
          detail: { action: 'update', tree: updatedTree }
        }));
        
        return updatedTree;
      }
      
    } catch (error) {
      console.error('Error actualizando árbol:', error);
      throw error;
    }
  }

  async deleteTree(treeId, reason = 'Eliminado por usuario') {
    try {
      if (!this.db) throw new Error('Firebase no disponible');
      
      const currentUser = this.auth?.currentUser;
      const tree = this.trees.get(treeId);
      
      // Soft delete - marcar como inactivo
      await this.db.collection('arboles').doc(treeId).update({
        active: false,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deletedBy: currentUser?.uid || 'anonymous',
        deleteReason: reason
      });
      
      // Actualizar contador de árboles en el sector
      if (tree?.blockId) {
        await this.updateTreeCountInSector(tree.blockId, -1);
      }
      
      // Remover del caché local
      this.trees.delete(treeId);
      
      // Limpiar offline storage
      if (window.offlineManager) {
        await window.offlineManager.deleteData('arboles', treeId);
      }
      
      console.log('✅ Árbol eliminado (soft delete):', treeId);
      
      // Notificar eliminación
      window.dispatchEvent(new CustomEvent('treeUpdate', {
        detail: { action: 'delete', treeId: treeId }
      }));
      
    } catch (error) {
      console.error('Error eliminando árbol:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  async updateTreeCountInSector(sectorId, increment) {
    try {
      const sector = this.sectors.get(sectorId);
      if (sector) {
        const newCount = Math.max(0, (sector.currentTrees || 0) + increment);
        await this.updateSector(sectorId, { currentTrees: newCount });
      }
    } catch (error) {
      console.error('Error actualizando contador de árboles:', error);
    }
  }

  // ==========================================
  // CONSULTAS
  // ==========================================

  async getAllTrees(filters = {}) {
    try {
      let trees = Array.from(this.trees.values());
      
      // Aplicar filtros
      if (filters.blockId) {
        trees = trees.filter(tree => tree.blockId === filters.blockId);
      }
      
      if (filters.ageMin) {
        trees = trees.filter(tree => (tree.age || 0) >= filters.ageMin);
      }
      
      if (filters.ageMax) {
        trees = trees.filter(tree => (tree.age || 0) <= filters.ageMax);
      }
      
      if (filters.healthMin) {
        trees = trees.filter(tree => (tree.health?.overall || 0) >= filters.healthMin);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        trees = trees.filter(tree => 
          tree.id.toLowerCase().includes(searchLower) ||
          (tree.notes && tree.notes.toLowerCase().includes(searchLower)) ||
          (tree.blockId && tree.blockId.toLowerCase().includes(searchLower))
        );
      }
      
      return trees;
      
    } catch (error) {
      console.error('Error obteniendo árboles:', error);
      return [];
    }
  }

  async getTree(treeId) {
    try {
      // Intentar obtener del caché local primero
      const cachedTree = this.trees.get(treeId);
      if (cachedTree) {
        return cachedTree;
      }
      
      // Si no está en caché, obtener de Firebase
      if (this.db) {
        const doc = await this.db.collection('arboles').doc(treeId).get();
        if (doc.exists) {
          const treeData = {
            id: doc.id,
            ...doc.data(),
            firebaseRef: doc.ref
          };
          
          // Agregar al caché
          this.trees.set(treeId, treeData);
          
          return treeData;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error obteniendo árbol:', error);
      return null;
    }
  }

  async getTreesByBlock(blockId) {
    return this.getAllTrees({ blockId });
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  async getStatistics() {
    try {
      const trees = Array.from(this.trees.values());
      
      const stats = {
        totalTrees: trees.length,
        healthyTrees: 0,
        sickTrees: 0,
        treatmentTrees: 0,
        totalProduction: 0,
        productiveTrees: 0,
        averageAge: 0,
        averageHealth: 0,
        averageProduction: 0,
        byBlock: {},
        byVariety: {}
      };
      
      let totalAge = 0;
      let totalHealth = 0;
      
      trees.forEach(tree => {
        const health = tree.health?.overall || 0;
        const production = tree.production?.currentSeason || 0;
        const age = tree.age || 0;
        
        // Clasificar por salud
        if (health >= 80) {
          stats.healthyTrees++;
        } else if (health >= 60) {
          stats.treatmentTrees++;
        } else {
          stats.sickTrees++;
        }
        
        // Producción
        stats.totalProduction += production;
        if (production > 0) {
          stats.productiveTrees++;
        }
        
        // Promedios
        totalAge += age;
        totalHealth += health;
        
        // Por bloque
        if (!stats.byBlock[tree.blockId]) {
          stats.byBlock[tree.blockId] = {
            count: 0,
            healthy: 0,
            sick: 0,
            production: 0
          };
        }
        stats.byBlock[tree.blockId].count++;
        stats.byBlock[tree.blockId].production += production;
        
        if (health >= 80) {
          stats.byBlock[tree.blockId].healthy++;
        } else if (health < 60) {
          stats.byBlock[tree.blockId].sick++;
        }
        
        // Por variedad
        if (!stats.byVariety[tree.variety]) {
          stats.byVariety[tree.variety] = { count: 0, production: 0 };
        }
        stats.byVariety[tree.variety].count++;
        stats.byVariety[tree.variety].production += production;
      });
      
      // Calcular promedios
      if (trees.length > 0) {
        stats.averageAge = Math.round(totalAge / trees.length);
        stats.averageHealth = Math.round(totalHealth / trees.length);
        stats.averageProduction = Math.round(stats.totalProduction / trees.length);
      }
      
      return stats;
      
    } catch (error) {
      console.error('Error calculando estadísticas:', error);
      return {
        totalTrees: 0,
        healthyTrees: 0,
        sickTrees: 0,
        treatmentTrees: 0,
        totalProduction: 0,
        productiveTrees: 0,
        averageProduction: 0
      };
    }
  }

  // ==========================================
  // VALIDACIONES
  // ==========================================

  validateTreeData(treeData) {
    const errors = [];
    
    // Validaciones obligatorias
    if (!treeData.variety) {
      errors.push('La variedad es obligatoria');
    }
    
    if (!treeData.blockId) {
      errors.push('El sector es obligatorio');
    }
    
    if (!treeData.plantingDate) {
      errors.push('La fecha de plantación es obligatoria');
    }
    
    if (!treeData.latitude || !treeData.longitude) {
      errors.push('Las coordenadas GPS son obligatorias');
    }
    
    // Validar coordenadas GPS
    if (treeData.latitude && treeData.longitude) {
      if (Math.abs(treeData.latitude) > 90) {
        errors.push('Latitud inválida');
      }
      
      if (Math.abs(treeData.longitude) > 180) {
        errors.push('Longitud inválida');
      }
      
      // Validar que esté en Guatemala aproximadamente
      if (treeData.latitude < 13.5 || treeData.latitude > 18.0 ||
          treeData.longitude < -92.5 || treeData.longitude > -88.0) {
        errors.push('Las coordenadas parecen estar fuera de Guatemala');
      }
    }
    
    // Validar medidas
    if (treeData.height && treeData.height < 0) {
      errors.push('La altura no puede ser negativa');
    }
    
    if (treeData.diameter && treeData.diameter < 0) {
      errors.push('El diámetro no puede ser negativo');
    }
    
    // Validar salud
    if (treeData.health?.overall !== undefined) {
      if (treeData.health.overall < 0 || treeData.health.overall > 100) {
        errors.push('El porcentaje de salud debe estar entre 0 y 100');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  validateSectorData(sectorData) {
    const errors = [];
    
    // Validaciones obligatorias
    if (!sectorData.name) {
      errors.push('El nombre del sector es obligatorio');
    }
    
    if (!sectorData.capacity || sectorData.capacity <= 0) {
      errors.push('La capacidad debe ser mayor a 0');
    }
    
    if (!sectorData.coordinates || !sectorData.coordinates.center) {
      errors.push('Las coordenadas del centro son obligatorias');
    }
    
    // Validar coordenadas si están presentes
    if (sectorData.coordinates?.center) {
      const [lat, lng] = sectorData.coordinates.center;
      
      if (Math.abs(lat) > 90) {
        errors.push('Latitud inválida');
      }
      
      if (Math.abs(lng) > 180) {
        errors.push('Longitud inválida');
      }
      
      // Validar que esté en Guatemala aproximadamente
      if (lat < 13.5 || lat > 18.0 || lng < -92.5 || lng > -88.0) {
        errors.push('Las coordenadas parecen estar fuera de Guatemala');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  calculateAge(plantingDate) {
    if (!plantingDate) return 0;
    
    const plantDate = new Date(plantingDate);
    const now = new Date();
    
    return Math.floor((now - plantDate) / (365.25 * 24 * 60 * 60 * 1000));
  }

  generateTreeNumber() {
    const existingNumbers = Array.from(this.trees.values())
      .map(tree => {
        const match = tree.id.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      });
    
    const maxNumber = Math.max(0, ...existingNumbers);
    return (maxNumber + 1).toString().padStart(4, '0');
  }

  // Método para exportar datos
  async exportData() {
    const data = {
      trees: Array.from(this.trees.values()),
      sectors: Array.from(this.sectors.values()),
      statistics: await this.getStatistics(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    return data;
  }

  // Método para importar datos
  async importData(data) {
    try {
      if (data.trees) {
        data.trees.forEach(tree => {
          this.trees.set(tree.id, tree);
        });
      }
      
      if (data.sectors) {
        data.sectors.forEach(sector => {
          this.sectors.set(sector.id, sector);
        });
        this.saveSectorsToLocalStorage();
      }
      
      console.log('✅ Datos importados correctamente');
      
      // Notificar actualización masiva
      window.dispatchEvent(new CustomEvent('treeUpdate', {
        detail: { action: 'import', count: data.trees?.length || 0 }
      }));
      
      window.dispatchEvent(new CustomEvent('sectorUpdate', {
        detail: { action: 'import', count: data.sectors?.length || 0 }
      }));
      
    } catch (error) {
      console.error('Error importando datos:', error);
      throw error;
    }
  }
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

let treeManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  treeManager = new TreeManager();
  window.treeManager = treeManager;
  
  console.log('🌳 TreeManager disponible globalmente');
});

// Exportar para otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeManager;
}