/* ============================================================
   泵挂深度动态优化管理系统 — 图表模块
   charts.js — 基于 Chart.js 的图表配置
   ============================================================ */

const ChartManager = {
  charts: {},

  // 颜色方案
  colors: {
    primary:   '#1a5276',
    primaryL:  '#2980b9',
    accent:    '#e67e22',
    success:   '#27ae60',
    warning:   '#e67e22',
    danger:    '#e74c3c',
    info:      '#3498db',
    gray:      '#95a5a6',
    bg:        '#f8f9fa',
  },

  // 默认选项
  defaultOpts: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 16, usePointStyle: true, font: { size: 12 } }
      },
      tooltip: {
        backgroundColor: 'rgba(44,62,80,0.9)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
      }
    }
  },

  // ===== 1. 动液面趋势图 =====
  renderDynamicLevelChart(canvasId, wellId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const values = data || DataStore.dynamicLevelTrend[wellId] ||
      DataStore.dynamicLevelTrend['G3-1'];

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [{
          label: '动液面深度 (m)',
          data: values,
          borderColor: this.colors.primaryL,
          backgroundColor: 'rgba(41,128,185,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: this.colors.primaryL,
          borderWidth: 2,
        }]
      },
      options: {
        ...this.defaultOpts,
        scales: {
          y: {
            reverse: true,
            title: { display: true, text: '深度 (m)', font: { size: 12 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 12, font: { size: 11 } },
          }
        },
        plugins: {
          ...this.defaultOpts.plugins,
          legend: { display: false }
        }
      }
    });
  },

  // ===== 2. 泵效 vs 沉没度散点图 =====
  renderEfficiencyScatter(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const points = DataStore.getPumpEfficiencyVsSubmergence();
    const producing = points.filter(p => p.status === 'producing');
    const others = points.filter(p => p.status !== 'producing');

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: '生产井',
          data: producing.map(p => ({ x: p.submergence, y: p.pumpEfficiency, well: p.well })),
          backgroundColor: this.colors.primaryL,
          pointRadius: 6,
          pointHoverRadius: 8,
        }, {
          label: '非生产井',
          data: others.map(p => ({ x: p.submergence, y: p.pumpEfficiency, well: p.well })),
          backgroundColor: this.colors.gray,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        ...this.defaultOpts,
        scales: {
          y: {
            title: { display: true, text: '泵效 (%)', font: { size: 12 } },
            min: 0, max: 100,
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            title: { display: true, text: '沉没度 (m)', font: { size: 12 } },
            min: 0,
            grid: { color: 'rgba(0,0,0,0.05)' },
          }
        },
        plugins: {
          ...this.defaultOpts.plugins,
          tooltip: {
            ...this.defaultOpts.plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const pt = ctx.raw;
                return `${pt.well}: 沉没度 ${pt.x}m, 泵效 ${pt.y}%`;
              }
            }
          }
        }
      }
    });
  },

  // ===== 3. 月度产油/含水趋势 =====
  renderMonthlyTrend(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const data = DataStore.getMonthlyProductionTrend();

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: '日产油 (t)',
          data: data.map(d => d.oil),
          backgroundColor: this.colors.success,
          borderRadius: 3,
          order: 2,
        }, {
          label: '综合含水率 (%)',
          data: data.map(d => d.waterCut || (75 + Math.random() * 10 - 5)),
          borderColor: this.colors.danger,
          backgroundColor: 'rgba(231,76,60,0.1)',
          type: 'line',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: this.colors.danger,
          borderWidth: 2,
          yAxisID: 'y1',
          order: 1,
        }]
      },
      options: {
        ...this.defaultOpts,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: '日产油 (t)', font: { size: 12 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            position: 'left',
          },
          y1: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: '含水率 (%)', font: { size: 12 } },
            grid: { display: false },
            position: 'right',
          },
          x: {
            grid: { display: false },
          }
        },
      }
    });
  },

  // ===== 4. 平均泵效趋势 =====
  renderEfficiencyTrend(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const data = DataStore.getMonthlyProductionTrend();

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: '平均泵效 (%)',
          data: data.map(d => d.efficiency),
          borderColor: this.colors.info,
          backgroundColor: 'rgba(52,152,219,0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: this.colors.info,
          borderWidth: 2,
        }]
      },
      options: {
        ...this.defaultOpts,
        scales: {
          y: {
            min: 30, max: 70,
            title: { display: true, text: '泵效 (%)', font: { size: 12 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            grid: { display: false },
          }
        },
        plugins: {
          ...this.defaultOpts.plugins,
          legend: { display: false }
        }
      }
    });
  },

  // ===== 5. 单井综合参数雷达图 =====
  renderWellRadar(canvasId, wellId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const well = DataStore.getWellById(wellId);
    if (!well) return;

    // 归一化到 0-100
    const normalize = (val, min, max) => Math.min(100, Math.max(0, (val - min) / (max - min) * 100));

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['泵效', '沉没度', '日产油', '载荷比', '动液面'],
        datasets: [{
          label: well.name,
          data: [
            well.pumpEfficiency,
            normalize(well.submergence, 0, 600),
            normalize(well.dailyOil, 0, 8),
            normalize(1.2 - (well.current / well.load) + 0.2, 0, 1),
            normalize(2000 - well.dynamicLevel, 0, 1500),
          ],
          backgroundColor: 'rgba(41,128,185,0.2)',
          borderColor: this.colors.primaryL,
          borderWidth: 2,
          pointBackgroundColor: this.colors.primaryL,
          pointRadius: 4,
        }]
      },
      options: {
        ...this.defaultOpts,
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { stepSize: 20, font: { size: 10 } },
            pointLabels: { font: { size: 12 } },
            grid: { color: 'rgba(0,0,0,0.08)' },
            angleLines: { color: 'rgba(0,0,0,0.08)' },
          }
        },
        plugins: {
          ...this.defaultOpts.plugins,
          legend: { display: false }
        }
      }
    });
  },

  // ===== 6. 潜力井分布饼图 =====
  renderWellDistribution(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const wells = DataStore.wells;
    const producing = wells.filter(w => w.status === 'producing').length;
    const maintenance = wells.filter(w => w.status === 'maintenance').length;
    const shutdown = wells.filter(w => w.status === 'shutdown').length;

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['生产井', '作业井', '关停井'],
        datasets: [{
          data: [producing, maintenance, shutdown],
          backgroundColor: [this.colors.success, this.colors.warning, this.colors.gray],
          borderWidth: 0,
          hoverOffset: 6,
        }]
      },
      options: {
        ...this.defaultOpts,
        cutout: '65%',
        plugins: {
          ...this.defaultOpts.plugins,
          legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } }
        }
      }
    });
  },

  // ===== 7. 加深方案对比柱状图 =====
  renderDeepenComparison(canvasId, plans) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: plans.map(p => p.wellName || p.well),
        datasets: [{
          label: '当前泵效 (%)',
          data: plans.map(p => p.currentEfficiency),
          backgroundColor: this.colors.gray,
          borderRadius: 3,
        }, {
          label: '预计泵效 (%)',
          data: plans.map(p => p.estimatedEfficiency),
          backgroundColor: this.colors.success,
          borderRadius: 3,
        }]
      },
      options: {
        ...this.defaultOpts,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: '泵效 (%)', font: { size: 12 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: { grid: { display: false } }
        }
      }
    });
  },

  // ===== 8. IPR/VLP 节点分析交会图 =====
  renderIPRVLPChart(canvasId, wellId, skinFactor = 0, tubingPressure = null) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const iprPoints = DataStore.getIPRCurve(wellId, skinFactor);
    const vlpPoints = DataStore.getVLPCurve(wellId, tubingPressure);
    const nodal = DataStore.solveNodal(wellId, skinFactor, tubingPressure);

    // IPR: pwf → q; VLP: q → pwf
    // 统一 X 轴=产量(t/d), Y轴=流压(MPa)
    const iprData = iprPoints.map(p => ({ x: p.q, y: p.pwf }));
    const vlpData = vlpPoints.map(p => ({ x: p.q, y: p.pwf }));

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    const datasets = [{
      label: 'IPR 流入曲线 (Vogel)',
      data: iprData,
      borderColor: this.colors.success,
      backgroundColor: 'rgba(39,174,96,0.08)',
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: this.colors.success,
      borderWidth: 2.5,
      borderDash: [],
      order: 2,
    }, {
      label: 'VLP 流出曲线 (管流)',
      data: vlpData,
      borderColor: this.colors.danger,
      backgroundColor: 'rgba(231,76,60,0.08)',
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: this.colors.danger,
      borderWidth: 2.5,
      borderDash: [],
      order: 2,
    }];

    // 协调点标注
    if (nodal && nodal.Qnode > 0 && nodal.PwfNode > 0) {
      const markerSize = 12;
      datasets.push({
        label: `协调点 (${nodal.Qnode.toFixed(1)}t/d, ${nodal.PwfNode.toFixed(2)}MPa)`,
        data: [{ x: nodal.Qnode, y: nodal.PwfNode }],
        borderColor: this.colors.accent,
        backgroundColor: this.colors.accent,
        pointRadius: markerSize,
        pointHoverRadius: markerSize + 4,
        pointStyle: 'crossRot',
        borderWidth: 3,
        order: 1,
      });
      // 当前工况点
      datasets.push({
        label: `当前工况 (${nodal.Qcurrent.toFixed(1)}t/d, ${nodal.PwfCurrent.toFixed(2)}MPa)`,
        data: [{ x: nodal.Qcurrent, y: nodal.PwfCurrent }],
        borderColor: this.colors.primary,
        backgroundColor: this.colors.primary,
        pointRadius: 8,
        pointHoverRadius: 10,
        pointStyle: 'circle',
        borderWidth: 2,
        order: 1,
      });
    }

    // 地层压力水平线
    if (nodal) {
      datasets.push({
        label: `地层压力 Pr=${nodal.Pr}MPa`,
        data: [
          { x: 0, y: nodal.Pr },
          { x: nodal.AOF * 1.2, y: nodal.Pr }
        ],
        borderColor: this.colors.gray,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        order: 3,
      });
      // 泡点压力线
      datasets.push({
        label: `泡点压力 Pb=${nodal.Pb}MPa`,
        data: [
          { x: 0, y: nodal.Pb },
          { x: nodal.AOF * 1.2, y: nodal.Pb }
        ],
        borderColor: 'rgba(149,165,166,0.5)',
        borderDash: [2, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: 3,
      });
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: '产量 Q (t/d)', font: { size: 13, weight: 'bold' } },
            min: 0,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { size: 11 } },
          },
          y: {
            title: { display: true, text: '井底流压 Pwf (MPa)', font: { size: 13, weight: 'bold' } },
            min: 0,
            reverse: false,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { size: 11 } },
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 14, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(44,62,80,0.92)',
            titleFont: { size: 12 },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 4,
            callbacks: {
              label: (ctx) => {
                const pt = ctx.raw;
                if (ctx.datasetIndex === 2) return `协调点: Q=${pt.x.toFixed(1)} t/d, Pwf=${pt.y.toFixed(2)} MPa`;
                if (ctx.datasetIndex === 3) return `当前工况: Q=${pt.x.toFixed(1)} t/d, Pwf=${pt.y.toFixed(2)} MPa`;
                return `Q=${pt.x.toFixed(2)} t/d, Pwf=${pt.y.toFixed(3)} MPa`;
              }
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 6,
          }
        }
      }
    });
  },

  // ===== 清理所有图表 =====
  destroyAll() {
    Object.values(this.charts).forEach(c => {
      try { c.destroy(); } catch(e) {}
    });
    this.charts = {};
  }
};
