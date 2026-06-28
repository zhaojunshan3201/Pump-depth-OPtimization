/* ============================================================
   Pump depth optimization system - API-backed data layer
   ============================================================ */

const DataStore = {
  wells: [],
  optimizationHistory: [],
  dynamicLevelTrend: {},
  monthlyTrend: [],
  zoneSummary: null,
  tuningReminder: null,
  potentialWells: [],
  nodalResults: {},

  getApiBase() {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return 'http://localhost:3000';
    }
    return '';
  },

  async request(path, options = {}) {
    const res = await fetch(`${this.getApiBase()}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || '请求失败');
    }

    return res.json();
  },

  async init() {
    await this.request('/api/health');
    await this.refreshWells();
    await this.refreshOptimizationRecords();
    await Promise.all([
      this.fetchZoneSummary(),
      this.fetchPotentialWells(),
      this.fetchTuningReminders(),
      this.getDynamicLevel('G3-1')
    ]);
  },

  normalizeRecord(record) {
    return {
      ...record,
      well: record.well || record.wellId,
      date: record.date || record.recordDate
    };
  },

  async refreshWells() {
    this.wells = await this.request('/api/wells');
    return this.wells;
  },

  async refreshOptimizationRecords() {
    const records = await this.request('/api/optimization-records');
    this.optimizationHistory = records.map((record) => this.normalizeRecord(record));
    return this.optimizationHistory;
  },

  getWellList() {
    return this.wells.map((well) => ({
      id: well.id,
      name: well.name,
      status: well.status
    }));
  },

  getWellById(id) {
    return this.wells.find((well) => well.id === id);
  },

  getPumpEfficiencyVsSubmergence() {
    return this.wells.map((well) => ({
      well: well.id,
      pumpEfficiency: well.pumpEfficiency,
      submergence: well.submergence,
      status: well.status
    }));
  },

  getProductionStats() {
    const producing = this.wells.filter((well) => well.status === 'producing');
    const totalEfficiency = this.wells.reduce((sum, well) => sum + Number(well.pumpEfficiency || 0), 0);

    return {
      dailyOil: this.wells.reduce((sum, well) => sum + Number(well.dailyOil || 0), 0),
      dailyWater: this.wells.reduce((sum, well) => sum + Number(well.dailyWater || 0), 0),
      wells: this.wells.length,
      producingWells: producing.length,
      avgEfficiency: this.wells.length ? totalEfficiency / this.wells.length : 0
    };
  },

  getAlertWells() {
    return this.wells.filter((well) =>
      well.status !== 'shutdown' &&
      (Number(well.pumpEfficiency) < 30 || Number(well.submergence) < 50)
    );
  },

  async fetchZoneSummary() {
    this.zoneSummary = await this.request('/api/dashboard/summary');
    return this.zoneSummary;
  },

  getZoneSummary() {
    if (this.zoneSummary) return this.zoneSummary;

    const stats = this.getProductionStats();
    const avgSubmergence = this.wells.length
      ? this.wells.reduce((sum, well) => sum + Number(well.submergence || 0), 0) / this.wells.length
      : 0;
    const avgDynamicLevel = this.wells.length
      ? this.wells.reduce((sum, well) => sum + Number(well.dynamicLevel || 0), 0) / this.wells.length
      : 0;

    return {
      totalWells: stats.wells,
      producingWells: stats.producingWells,
      dailyOil: stats.dailyOil.toFixed(1),
      dailyWater: stats.dailyWater.toFixed(1),
      avgEfficiency: stats.avgEfficiency.toFixed(1),
      avgSubmergence: avgSubmergence.toFixed(0),
      potentialCount: this.potentialWells.length,
      alertCount: this.getAlertWells().length,
      avgDynamicLevel: avgDynamicLevel.toFixed(0)
    };
  },

  async fetchPotentialWells() {
    this.potentialWells = await this.request('/api/screening/potential-wells');
    return this.potentialWells;
  },

  getPotentialWells() {
    if (this.potentialWells.length > 0) return this.potentialWells;

    return this.wells.filter((well) =>
      well.status !== 'shutdown' &&
      Number(well.pumpEfficiency) < 40 &&
      Number(well.submergence) < 200
    );
  },

  async fetchTuningReminders() {
    this.tuningReminder = await this.request('/api/tuning/reminders');
    return this.tuningReminder;
  },

  getTuningReminders() {
    return this.tuningReminder || { isTuningDay: false, nextTuningDay: '-', wells: [] };
  },

  getRecentOptimizations(limit = 5) {
    return [...this.optimizationHistory]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  },

  async getWellHistory(wellId) {
    const records = await this.request(`/api/optimization-records?wellId=${encodeURIComponent(wellId)}`);
    return records.map((record) => this.normalizeRecord(record));
  },

  async diagnoseWell(wellId) {
    return this.request(`/api/wells/${encodeURIComponent(wellId)}/diagnosis`);
  },

  async getDynamicLevel(wellId) {
    const readings = await this.request(`/api/wells/${encodeURIComponent(wellId)}/dynamic-level`);
    const values = readings.map((reading) => Number(reading.levelValue));
    this.dynamicLevelTrend[wellId] = values;
    return values;
  },

  async generateDeepenPlan(wellId, deepenAmount) {
    return this.request('/api/deepen-plans/preview', {
      method: 'POST',
      body: JSON.stringify({ wellId, deepenAmount: Number(deepenAmount) })
    });
  },

  async saveDeepenPlan(payload) {
    return this.request('/api/deepen-plans', {
      method: 'POST',
      body: JSON.stringify({
        wellId: payload.wellId,
        deepenAmount: Number(payload.deepenAmount)
      })
    });
  },

  async createOptimizationRecord(payload) {
    const record = await this.request('/api/optimization-records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    await this.refreshOptimizationRecords();
    return this.normalizeRecord(record);
  },

  async updateWell(id, payload) {
    const well = await this.request(`/api/wells/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    await this.refreshWells();
    return well;
  },

  async importWells(wells) {
    const result = await this.request('/api/wells/import', {
      method: 'POST',
      body: JSON.stringify({ wells })
    });
    await Promise.all([
      this.refreshWells(),
      this.fetchZoneSummary(),
      this.fetchPotentialWells(),
      this.fetchTuningReminders()
    ]);
    return result;
  },

  downloadImportTemplate() {
    window.location.href = `${this.getApiBase()}/api/wells/import-template`;
  },

  async importWellsExcel(file) {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    const result = await this.request('/api/wells/import-excel', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        fileBase64: btoa(binary)
      })
    });
    await Promise.all([
      this.refreshWells(),
      this.fetchZoneSummary(),
      this.fetchPotentialWells(),
      this.fetchTuningReminders()
    ]);
    return result;
  },

  async getNodal(wellId) {
    const result = await this.request(`/api/nodal/${encodeURIComponent(wellId)}`);
    this.nodalResults[wellId] = result;
    return result;
  },

  getMonthlyProductionTrend() {
    if (this.monthlyTrend.length > 0) return this.monthlyTrend;

    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    this.monthlyTrend = months.map((month, index) => ({
      month,
      oil: (55 + Math.sin(index * 0.5) * 8 + Math.cos(index * 0.8) * 2).toFixed(1),
      water: (180 + Math.sin(index * 0.3) * 20 + Math.cos(index * 0.4) * 4).toFixed(1),
      waterCut: (75 + Math.sin(index * 0.35) * 6).toFixed(1),
      efficiency: (52 + Math.sin(index * 0.4 + 1) * 8 + Math.cos(index * 0.6) * 1.5).toFixed(1)
    }));
    return this.monthlyTrend;
  },

  solveNodal(wellId) {
    return this.nodalResults[wellId] || null;
  },

  getIPRCurve(wellId) {
    return this.nodalResults[wellId]?.iprCurve || [];
  },

  getVLPCurve(wellId) {
    return this.nodalResults[wellId]?.vlpCurve || [];
  },

  getIPRSensitivity(wellId) {
    return this.nodalResults[wellId]?.iprSensitivity || null;
  },

  getVLPSensitivity(wellId) {
    return this.nodalResults[wellId]?.vlpSensitivity || null;
  },

  getNodalComparison(wellIds) {
    return wellIds.map((id) => this.nodalResults[id]).filter(Boolean);
  }
};
