/* ============================================================
   泵挂深度动态优化管理系统 — UI 组件
   components.js — 表格、卡片、弹窗等复用组件
   ============================================================ */

const UIComponents = {

  // ===== 状态徽章 =====
  statusBadge(status) {
    const map = {
      'producing': { cls: 'badge-success', label: '生产' },
      'shutdown':  { cls: 'badge-danger',  label: '关停' },
      'maintenance': { cls: 'badge-warning', label: '作业' },
    };
    const m = map[status] || { cls: 'badge-secondary', label: status };
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  },

  wellEditForm(well) {
    if (!well) return '';

    return `
      <div class="card" style="margin-top:20px">
        <div class="card-header"><h3>参数编辑</h3></div>
        <div class="card-body">
          <form id="wellEditForm" onsubmit="App.saveWellEdit(event, '${well.id}')">
            <div class="grid-3" style="margin-bottom:12px">
              <div class="form-group">
                <label>状态</label>
                <select class="form-control" name="status">
                  <option value="producing" ${well.status === 'producing' ? 'selected' : ''}>生产</option>
                  <option value="maintenance" ${well.status === 'maintenance' ? 'selected' : ''}>作业</option>
                  <option value="shutdown" ${well.status === 'shutdown' ? 'selected' : ''}>关停</option>
                </select>
              </div>
              <div class="form-group"><label>泵挂深度(m)</label><input class="form-control" name="pumpDepth" type="number" step="0.1" value="${well.pumpDepth}"></div>
              <div class="form-group"><label>泵效(%)</label><input class="form-control" name="pumpEfficiency" type="number" step="0.1" value="${well.pumpEfficiency}"></div>
              <div class="form-group"><label>动液面(m)</label><input class="form-control" name="dynamicLevel" type="number" step="0.1" value="${well.dynamicLevel}"></div>
              <div class="form-group"><label>沉没度(m)</label><input class="form-control" name="submergence" type="number" step="0.1" value="${well.submergence}"></div>
              <div class="form-group"><label>日油(t)</label><input class="form-control" name="dailyOil" type="number" step="0.01" value="${well.dailyOil}"></div>
              <div class="form-group"><label>日水(t)</label><input class="form-control" name="dailyWater" type="number" step="0.01" value="${well.dailyWater}"></div>
              <div class="form-group"><label>含水率(%)</label><input class="form-control" name="waterCut" type="number" step="0.1" value="${well.waterCut}"></div>
              <div class="form-group"><label>回压(MPa)</label><input class="form-control" name="backPressure" type="number" step="0.01" value="${well.backPressure}"></div>
              <div class="form-group"><label>地层压力(MPa)</label><input class="form-control" name="reservoirPressure" type="number" step="0.01" value="${well.reservoirPressure}"></div>
              <div class="form-group"><label>泡点压力(MPa)</label><input class="form-control" name="bubblePointPressure" type="number" step="0.01" value="${well.bubblePointPressure}"></div>
              <div class="form-group"><label>AOF(t/d)</label><input class="form-control" name="AOF" type="number" step="0.01" value="${well.AOF}"></div>
            </div>
            <button class="btn btn-success btn-sm" type="submit">保存参数</button>
            <span id="wellEditStatus" style="margin-left:10px;color:var(--text-light)"></span>
          </form>
        </div>
      </div>
    `;
  },

  optimizationRecordForm(wells) {
    const today = new Date().toISOString().slice(0, 10);

    return `
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>新增优化记录</h3></div>
        <div class="card-body">
          <form id="optimizationRecordForm" onsubmit="App.saveOptimizationRecord(event)">
            <div class="grid-3" style="margin-bottom:12px">
              <div class="form-group">
                <label>井号</label>
                <select class="form-control" name="wellId">
                  ${wells.map((well) => `<option value="${well.id}">${well.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>日期</label><input class="form-control" name="recordDate" type="date" value="${today}"></div>
              <div class="form-group"><label>原泵挂(m)</label><input class="form-control" name="prevDepth" type="number" step="0.1" required></div>
              <div class="form-group"><label>新泵挂(m)</label><input class="form-control" name="newDepth" type="number" step="0.1" required></div>
              <div class="form-group"><label>调整幅度(m)</label><input class="form-control" name="delta" type="number" step="0.1" required></div>
              <div class="form-group">
                <label>状态</label>
                <select class="form-control" name="status">
                  <option value="success">成功</option>
                  <option value="warning">观察</option>
                  <option value="danger">风险</option>
                </select>
              </div>
              <div class="form-group"><label>原因</label><input class="form-control" name="reason" required></div>
              <div class="form-group"><label>效果</label><input class="form-control" name="effect" required></div>
            </div>
            <button class="btn btn-success btn-sm" type="submit">保存记录</button>
            <span id="optimizationRecordStatus" style="margin-left:10px;color:var(--text-light)"></span>
          </form>
        </div>
      </div>
    `;
  },

  // ===== 井状态标签 =====
  wellTag(status) {
    const map = {
      'producing': { cls: 'producing', label: '● 生产' },
      'shutdown':  { cls: 'shutdown',  label: '● 关停' },
      'maintenance': { cls: 'maintenance', label: '● 作业' },
    };
    const m = map[status] || { cls: '', label: status };
    return `<span class="well-tag ${m.cls}">${m.label}</span>`;
  },

  // ===== 进度条 =====
  progressBar(value, max = 100, color = 'info') {
    const pct = Math.min(100, (value / max) * 100);
    return `<div class="progress-bar"><div class="progress-fill ${color}" style="width:${pct}%"></div></div>`;
  },

  // ===== 警报框 =====
  alert(type, message) {
    const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', danger: '🚨' };
    return `<div class="alert alert-${type}">${icons[type] || ''} ${message}</div>`;
  },

  // ===== 表格渲染 =====
  renderTable(data, columns) {
    if (!data || data.length === 0) {
      return '<div class="empty-state"><div class="empty-icon">📋</div><p>暂无数据</p></div>';
    }

    let html = '<div class="table-container"><table><thead><tr>';
    columns.forEach(col => {
      html += `<th>${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';

    data.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        let val = row[col.key];
        if (col.render) {
          val = col.render(val, row);
        } else if (val === null || val === undefined) {
          val = '-';
        }
        html += `<td>${val}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  },

  // ===== 统计卡片 =====
  statCard(label, value, icon, cls = 'primary', change = null) {
    const changeHtml = change
      ? `<div class="stat-change ${change.direction}">${change.text}</div>`
      : '';
    return `
      <div class="stat-card ${cls}">
        <div class="stat-icon">${icon}</div>
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
        ${changeHtml}
      </div>
    `;
  },

  // ===== 井选择器下拉 =====
  wellSelect(selectedId, includeAll = false) {
    let html = `<select class="form-control form-control-sm" id="wellSelect">`;
    if (includeAll) html += `<option value="">全部井</option>`;
    DataStore.getWellList().forEach(w => {
      const sel = w.id === selectedId ? 'selected' : '';
      html += `<option value="${w.id}" ${sel}>${w.name}</option>`;
    });
    html += '</select>';
    return html;
  },

  // ===== 加深方案结果卡片 =====
  deepenPlanCard(plan) {
    if (!plan) return '<div class="alert alert-warning">请选择井并输入加深幅度</div>';
    return `
      <div class="card">
        <div class="card-header"><h3>📋 ${plan.wellName} 加深方案</h3></div>
        <div class="card-body">
          <div class="grid-2" style="margin-bottom:0">
            <div class="param-group">
              <h4>📐 泵挂参数</h4>
              <div class="param-row"><span class="param-label">当前泵挂深度</span><span class="param-value">${plan.currentPumpDepth}m</span></div>
              <div class="param-row"><span class="param-label">加深幅度</span><span class="param-value" style="color:var(--accent)">+${plan.deepenAmount}m</span></div>
              <div class="param-row"><span class="param-label">新泵挂深度</span><span class="param-value" style="color:var(--primary);font-size:16px">${plan.newPumpDepth}m</span></div>
              <div class="param-row"><span class="param-label">安全性校核</span><span class="param-value">${plan.safetyFactor}</span></div>
            </div>
            <div class="param-group">
              <h4>📈 预期效果</h4>
              <div class="param-row"><span class="param-label">当前泵效</span><span class="param-value">${plan.currentEfficiency}%</span></div>
              <div class="param-row"><span class="param-label">预计泵效</span><span class="param-value" style="color:var(--success);font-weight:700">${plan.estimatedEfficiency}%</span></div>
              <div class="param-row"><span class="param-label">泵效提升</span><span class="param-value" style="color:var(--success)">+${plan.efficiencyGain}%</span></div>
              <div class="param-row"><span class="param-label">预计日增油</span><span class="param-value" style="color:var(--success);font-size:16px">+${plan.oilGain} t</span></div>
              <div class="param-row"><span class="param-label">预计沉没度</span><span class="param-value">${plan.estimatedSubmergence}m</span></div>
            </div>
          </div>
          <div style="margin-top:16px">
            <button class="btn btn-success btn-sm" onclick="App.saveCurrentDeepenPlan()">保存方案</button>
            <span id="deepenSaveStatus" style="margin-left:10px;color:var(--text-light)"></span>
          </div>
        </div>
      </div>
    `;
  },

  // ===== 工况诊断结果（用于单井看板） =====
  diagnosisResult(diagnosis) {
    if (!diagnosis) return '';
    let healthIcon = { '良好': '✅', '一般': '⚠️', '差': '🚨' };
    let html = `
      <div class="card">
        <div class="card-header"><h3>🏥 工况诊断 — ${diagnosis.wellName} ${this.wellTag(diagnosis.status)}</h3></div>
        <div class="card-body">
          <div style="margin-bottom:12px;font-weight:600">综合评价：${healthIcon[diagnosis.overallHealth] || ''} ${diagnosis.overallHealth}</div>
    `;
    diagnosis.issues.forEach(issue => {
      html += this.alert(issue.type, issue.msg);
    });
    html += '</div></div>';
    return html;
  },

  // ===== 逢五调参提醒卡片 =====
  tuningReminderCard(reminder) {
    if (!reminder.isTuningDay) {
      return this.alert('info', `今日非调参日。下次"逢五调参"日为每月${reminder.nextTuningDay}号。`);
    }

    let html = this.alert('success', `📢 今日是调参日！以下 ${reminder.wells.length} 口井需要关注：`);
    const cols = [
      { key: 'id', label: '井号' },
      { key: 'status', label: '状态', render: (v) => this.statusBadge(v) },
      { key: 'pumpEfficiency', label: '泵效(%)' },
      { key: 'submergence', label: '沉没度(m)' },
      { key: 'suggestion', label: '建议' },
    ];
    html += this.renderTable(reminder.wells, cols);
    return html;
  },

  // ===== 潜力井列表 =====
  potentialWellsTable(wells) {
    if (wells.length === 0) {
      return '<div class="alert alert-success">✅ 当前无满足条件的潜力井</div>';
    }

    const cols = [
      { key: 'id', label: '井号' },
      { key: 'status', label: '状态', render: (v) => this.statusBadge(v) },
      { key: 'pumpEfficiency', label: '泵效(%)', render: (v) => `<span style="color:var(--danger);font-weight:600">${v}</span>` },
      { key: 'submergence', label: '沉没度(m)', render: (v) => `<span style="color:var(--danger);font-weight:600">${v}</span>` },
      { key: 'dailyOil', label: '日产油(t)' },
      { key: 'dynamicLevel', label: '动液面(m)' },
      { key: 'action', label: '操作', render: (v, row) => `<button class="btn btn-accent btn-sm" onclick="App.viewWell('${row.id}')">查看详情</button>` },
    ];

    return `<div class="alert alert-warning">⚠️ 发现 ${wells.length} 口潜力井（泵效<40% 且 沉没度<200m）</div>`
      + this.renderTable(wells, cols);
  },

  // ===== 优化记录表格 =====
  optimizationsTable(records) {
    if (!records || records.length === 0) {
      return '<div class="empty-state"><div class="empty-icon">📋</div><p>暂无优化记录</p></div>';
    }

    const cols = [
      { key: 'well', label: '井号' },
      { key: 'date', label: '日期' },
      { key: 'prevDepth', label: '原深度(m)', render: (v) => `${v}m` },
      { key: 'newDepth', label: '新深度(m)', render: (v) => `${v}m` },
      { key: 'delta', label: '加深(m)', render: (v) => `<span style="color:var(--accent)">+${v}m</span>` },
      { key: 'effect', label: '效果', render: (v, row) => {
        const icons = { success: '✅', warning: '⚠️', danger: '🚨' };
        return `${icons[row.status] || ''} ${v}`;
      }},
    ];

    return this.renderTable(records, cols);
  },

  // ===== 节点分析结果卡片 =====
  nodalResultCard(nodal) {
    if (!nodal) return '<div class="alert alert-warning">⚠️ 请选择一口井</div>';

    const statusIcon = nodal.isReasonable ? '✅' : '⚠️';
    const statusText = nodal.isReasonable ? '协调合理' : '偏差较大';
    const statusColor = nodal.isReasonable ? 'var(--success)' : 'var(--warning)';

    // 潜力判断
    let potentialHtml = '';
    if (nodal.Qnode > nodal.Qcurrent) {
      potentialHtml = `
        <div class="alert alert-success">
          📈 该井尚有 ${nodal.potentialGain}% 增油潜力（协调产量 ${nodal.Qnode}t/d ＞ 当前 ${nodal.Qcurrent}t/d）
        </div>`;
    } else {
      potentialHtml = `
        <div class="alert alert-info">
          ℹ️ 当前产量已接近协调点，增油空间有限（潜力 ${nodal.potentialGain}%）
        </div>`;
    }

    return `
      <div class="card" style="height:100%">
        <div class="card-header">
          <h3>📋 节点分析结果 — ${nodal.wellName}</h3>
          <span class="badge ${nodal.isReasonable ? 'badge-success' : 'badge-warning'}">${statusIcon} ${statusText}</span>
        </div>
        <div class="card-body">
          ${potentialHtml}
          <div class="grid-2" style="margin-bottom:0">
            <div class="param-group">
              <h4>🗄️ 储层参数</h4>
              <div class="param-row"><span class="param-label">地层压力 Pr</span><span class="param-value">${nodal.Pr} MPa</span></div>
              <div class="param-row"><span class="param-label">泡点压力 Pb</span><span class="param-value">${nodal.Pb} MPa</span></div>
              <div class="param-row"><span class="param-label">无阻流量 AOF</span><span class="param-value">${nodal.AOF} t/d</span></div>
              <div class="param-row"><span class="param-label">预计泵效</span><span class="param-value">${nodal.estEfficiency}%</span></div>
            </div>
            <div class="param-group">
              <h4>⚖️ 协调点参数</h4>
              <div class="param-row"><span class="param-label">协调产量 Q</span><span class="param-value" style="color:var(--accent);font-weight:700">${nodal.Qnode} t/d</span></div>
              <div class="param-row"><span class="param-label">协调流压 Pwf</span><span class="param-value" style="color:var(--accent);font-weight:700">${nodal.PwfNode} MPa</span></div>
              <div class="param-row"><span class="param-label">当前产量</span><span class="param-value">${nodal.Qcurrent} t/d</span></div>
              <div class="param-row"><span class="param-label">当前流压</span><span class="param-value">${nodal.PwfCurrent} MPa</span></div>
              <div class="param-row"><span class="param-label">拟合误差</span><span class="param-value">${nodal.minDiff}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ===== IPR 灵敏度分析表格 =====
  sensitivityTable(sensitivity) {
    if (!sensitivity) return '';

    let html = '<div class="table-container"><table><thead><tr>';
    html += '<th>工况</th><th>协调产量(t/d)</th><th>协调流压(MPa)</th><th>潜能(%)</th><th>评价</th>';
    html += '</tr></thead><tbody>';

    sensitivity.sensitivities.forEach(s => {
      const isBetter = s.Qnode > sensitivity.base.Qnode;
      html += `<tr>
        <td><strong>${s.label}</strong></td>
        <td style="font-weight:${isBetter ? '700' : '400'};color:${isBetter ? 'var(--success)' : 'var(--text)'}">${s.Qnode}</td>
        <td>${s.PwfNode}</td>
        <td>${s.potentialGain}%</td>
        <td>${s.isReasonable ? '✅' : '⚠️'}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    return html;
  }
};
