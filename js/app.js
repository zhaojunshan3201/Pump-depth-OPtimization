const App = {
  currentPage: 'dashboard',
  currentDeepenPlanRequest: null,
  isAuthenticated: false,
  pendingAuthAction: null,

  async init() {
    await DataStore.init();
    this.bindNav();
    this.bindMobileToggle();
    this.updateClock();
    this.updateWelcomeStats();
    this.updateAuthUi();
    setInterval(() => this.updateClock(), 1000);

    const badge = document.getElementById('potentialBadge');
    if (badge) badge.textContent = DataStore.getPotentialWells().length;
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        if (item.dataset.page) this.navigate(item.dataset.page);
      });
    });
  },

  bindMobileToggle() {
    const toggle = document.getElementById('menuToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.toggle('open');
      });
    }
  },

  updateClock() {
    const el = document.getElementById('headerTime');
    const syncEl = document.getElementById('dataSyncTime');
    const currentTime = new Date();
    const formatted = currentTime.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    if (el) el.textContent = formatted;
    if (syncEl) {
      syncEl.textContent = currentTime.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  },

  updateWelcomeStats() {
    const summary = DataStore.getZoneSummary();
    const el = document.getElementById('welcomeStats');
    if (!el) return;

    el.innerHTML = `
      <div class="welcome-stat-item"><div class="s-number">${summary.totalWells}</div><div class="s-label">管理井数</div></div>
      <div class="welcome-stat-item"><div class="s-number">${summary.producingWells}</div><div class="s-label">生产井</div></div>
      <div class="welcome-stat-item"><div class="s-number">${summary.potentialCount}</div><div class="s-label">潜力井</div></div>
      <div class="welcome-stat-item"><div class="s-number">${summary.alertCount}</div><div class="s-label">报警井</div></div>
      <div class="welcome-stat-item"><div class="s-number">${summary.dailyOil}</div><div class="s-label">日油 t</div></div>
      <div class="welcome-stat-item"><div class="s-number">${summary.avgSubmergence}</div><div class="s-label">平均沉没度 m</div></div>
    `;
  },

  enterSystem(page = 'dashboard') {
    const overlay = document.getElementById('welcomeOverlay');
    if (overlay) overlay.classList.add('hidden');
    setTimeout(() => this.navigate(page), 400);
  },

  showHome() {
    const overlay = document.getElementById('welcomeOverlay');
    if (overlay) overlay.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.page === 'dashboard');
    });

    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = '<button class="breadcrumb-home" type="button" onclick="App.showHome()">首页</button><span class="breadcrumb-separator">/</span><span>总览看板</span>';
    }

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openLoginModal(action = null, reason = '') {
    this.pendingAuthAction = typeof action === 'function' ? action : null;
    const modal = document.getElementById('loginModal');
    const title = document.getElementById('loginModalTitle');
    const message = document.getElementById('loginMessage');
    if (title) title.textContent = reason ? `登录后${reason}` : '工程用户登录';
    if (message) {
      message.textContent = '';
      message.classList.remove('success');
    }
    if (modal) modal.classList.remove('hidden');
  },

  closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
    this.pendingAuthAction = null;
  },

  requireAuth(reason, action) {
    if (this.isAuthenticated) return true;
    this.openLoginModal(action, reason);
    return false;
  },

  updateAuthUi() {
    const button = document.getElementById('loginStateButton');
    if (!button) return;
    button.textContent = this.isAuthenticated ? '已登录' : '登录';
    button.classList.toggle('btn-primary', this.isAuthenticated);
  },

  handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = document.getElementById('loginMessage');
    const formData = new FormData(form);
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '').trim();
    const role = String(formData.get('role') || 'engineer');

    if (username === 'admin' && password === '123456') {
      this.isAuthenticated = true;
      if (message) {
        message.textContent = `登录成功，当前角色：${this.getRoleName(role)}`;
        message.classList.add('success');
      }
      const action = this.pendingAuthAction;
      this.pendingAuthAction = null;
      setTimeout(() => {
        const modal = document.getElementById('loginModal');
        if (modal) modal.classList.add('hidden');
        this.updateAuthUi();
        if (action) action();
      }, 220);
      return;
    }

    if (message) {
      message.textContent = '账号或密码不正确，请使用 admin / 123456。';
      message.classList.remove('success');
    }
  },

  getRoleName(role) {
    const roleNames = {
      engineer: '采油工程师',
      dispatcher: '生产调度',
      manager: '管理人员'
    };
    return roleNames[role] || roleNames.engineer;
  },

  navigate(page) {
    this.currentPage = page;

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    const pageNames = {
      dashboard: '总览看板',
      wells: '单井看板',
      screening: '潜力井筛选',
      deepen: '加深方案设计',
      nodal: '节点分析',
      tuning: '动态调参',
      history: '历史记录'
    };
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = `<button class="breadcrumb-home" type="button" onclick="App.showHome()">首页</button><span class="breadcrumb-separator">/</span><span>${pageNames[page] || page}</span>`;
    }

    document.querySelectorAll('.page-section').forEach((section) => section.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) {
      target.classList.add('active');
      const render = this[`render${page.charAt(0).toUpperCase() + page.slice(1)}`];
      if (render) render.call(this);
    }

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  viewWell(wellId) {
    this.navigate('wells');
    setTimeout(() => {
      const select = document.getElementById('wellSelect');
      if (select) {
        select.value = wellId;
        select.dispatchEvent(new Event('change'));
      }
    }, 100);
  },

  showError(containerId, error) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = UIComponents.alert('danger', error.message || '加载失败');
  },

  renderDashboard() {
    const summary = DataStore.getZoneSummary();
    const stats = [
      UIComponents.statCard('总井数', `${summary.totalWells} 口`, '井', 'primary'),
      UIComponents.statCard('生产井', `${summary.producingWells} 口`, '产', 'success'),
      UIComponents.statCard('日油量', `${summary.dailyOil} t`, '油', 'info'),
      UIComponents.statCard('平均沉没度', `${summary.avgSubmergence} m`, '深', 'warning'),
      UIComponents.statCard('潜力井', `${summary.potentialCount} 口`, '潜', 'danger'),
      UIComponents.statCard('报警井', `${summary.alertCount} 口`, '警', 'warning')
    ].join('');

    document.getElementById('dashboard-stats').innerHTML = stats;
    ChartManager.renderDynamicLevelChart('chartDynamicLevel', 'G3-1');
    ChartManager.renderEfficiencyScatter('chartEfficiencyScatter');
    ChartManager.renderMonthlyTrend('chartMonthlyTrend');
    ChartManager.renderWellDistribution('chartWellDistribution');

    document.getElementById('dashboard-recent-optimizations').innerHTML =
      UIComponents.optimizationsTable(DataStore.getRecentOptimizations(5));
    document.getElementById('dashboard-tuning-reminder').innerHTML =
      UIComponents.tuningReminderCard(DataStore.getTuningReminders());
  },

  renderWells() {
    const container = document.getElementById('wells-container');
    container.innerHTML = `
      <div class="well-selector">
        <label>选择井号：</label>
        ${UIComponents.wellSelect('G3-1')}
        <button class="btn btn-primary btn-sm" onclick="App.refreshWellView()">刷新</button>
      </div>
      <div id="wellDetail"></div>
    `;

    document.getElementById('wellSelect').addEventListener('change', () => this.refreshWellView());
    this.refreshWellView();
  },

  async refreshWellView() {
    try {
      const wellId = document.getElementById('wellSelect').value;
      const well = DataStore.getWellById(wellId);
      if (!well) return;

      const [diagnosis, trendData, history] = await Promise.all([
        DataStore.diagnoseWell(wellId),
        DataStore.getDynamicLevel(wellId),
        DataStore.getWellHistory(wellId)
      ]);

      document.getElementById('wellDetail').innerHTML = `
        <div class="grid-2-1" style="margin-bottom:20px">
          <div class="card">
            <div class="card-header"><h3>${well.name} ${UIComponents.wellTag(well.status)}</h3><span>最后作业：${well.lastOverhaul}</span></div>
            <div class="card-body">
              <div class="grid-3" style="margin-bottom:0">
                <div class="param-group">
                  <h4>泵挂参数</h4>
                  <div class="param-row"><span class="param-label">泵挂深度</span><span class="param-value">${well.pumpDepth}m</span></div>
                  <div class="param-row"><span class="param-label">井深</span><span class="param-value">${well.depth}m</span></div>
                  <div class="param-row"><span class="param-label">泵效</span><span class="param-value">${well.pumpEfficiency}%</span></div>
                  <div class="param-row"><span class="param-label">沉没度</span><span class="param-value">${well.submergence}m</span></div>
                  <div class="param-row"><span class="param-label">动液面</span><span class="param-value">${well.dynamicLevel}m</span></div>
                </div>
                <div class="param-group">
                  <h4>生产参数</h4>
                  <div class="param-row"><span class="param-label">冲次</span><span class="param-value">${well.strokeRate} 次/min</span></div>
                  <div class="param-row"><span class="param-label">冲程</span><span class="param-value">${well.strokeLength} m</span></div>
                  <div class="param-row"><span class="param-label">电流</span><span class="param-value">${well.current} A</span></div>
                  <div class="param-row"><span class="param-label">载荷</span><span class="param-value">${well.load} kN</span></div>
                  <div class="param-row"><span class="param-label">回压</span><span class="param-value">${well.backPressure} MPa</span></div>
                </div>
                <div class="param-group">
                  <h4>产量数据</h4>
                  <div class="param-row"><span class="param-label">日油</span><span class="param-value" style="color:var(--success);font-weight:700">${well.dailyOil} t</span></div>
                  <div class="param-row"><span class="param-label">日水</span><span class="param-value">${well.dailyWater} t</span></div>
                  <div class="param-row"><span class="param-label">含水率</span><span class="param-value">${well.waterCut}%</span></div>
                  <div class="param-row"><span class="param-label">${UIComponents.progressBar(100 - well.waterCut, 100, well.waterCut > 90 ? 'danger' : well.waterCut > 80 ? 'warning' : 'success')}</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>综合雷达</h3></div>
            <div class="card-body"><div class="chart-container chart-container-sm" style="height:240px"><canvas id="wellRadarChart"></canvas></div></div>
          </div>
        </div>
        <div class="grid-2" style="margin-bottom:20px">
          <div class="card">
            <div class="card-header"><h3>动液面趋势（24h）</h3></div>
            <div class="card-body"><div class="chart-container"><canvas id="wellDynamicLevelChart"></canvas></div></div>
          </div>
          <div>${UIComponents.diagnosisResult(diagnosis)}</div>
        </div>
        <div class="card">
          <div class="card-header"><h3>该井历史优化记录</h3></div>
          <div class="card-body">${UIComponents.optimizationsTable(history)}</div>
        </div>
        ${UIComponents.wellEditForm(well)}
      `;

      setTimeout(() => {
        ChartManager.renderDynamicLevelChart('wellDynamicLevelChart', wellId, trendData);
        ChartManager.renderWellRadar('wellRadarChart', wellId);
      }, 50);
    } catch (error) {
      this.showError('wellDetail', error);
    }
  },

  async saveWellEdit(event, wellId) {
    event.preventDefault();
    const form = event.target;
    if (!this.requireAuth('保存单井数据', () => this.saveWellEdit({ preventDefault() {}, target: form }, wellId))) return;
    const payload = {};
    new FormData(form).forEach((value, key) => {
      payload[key] = key === 'status' ? value : Number(value);
    });

    const status = document.getElementById('wellEditStatus');
    try {
      await DataStore.updateWell(wellId, payload);
      if (status) status.textContent = '已保存';
      await this.refreshWellView();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  },

  renderScreening() {
    const container = document.getElementById('screening-container');
    container.innerHTML = `
      <div class="highlight-box"><h4>潜力井自动筛选规则</h4><p>系统筛选泵效低于 40% 且沉没度小于 200m 的生产井。</p></div>
      <div class="card">
        <div class="card-header"><h3>潜力井列表</h3><button class="btn btn-accent btn-sm" onclick="App.renderScreening()">重新筛选</button></div>
        <div class="card-body">${UIComponents.potentialWellsTable(DataStore.getPotentialWells())}</div>
      </div>
      <div style="margin-top:20px" class="card">
        <div class="card-header"><h3>泵效-沉没度分析</h3></div>
        <div class="card-body"><div class="chart-container chart-container-lg"><canvas id="screeningScatterChart"></canvas></div></div>
      </div>
    `;
    setTimeout(() => ChartManager.renderEfficiencyScatter('screeningScatterChart'), 50);
  },

  renderDeepen() {
    const container = document.getElementById('deepen-container');
    container.innerHTML = `
      <div class="highlight-box"><h4>加深方案辅助设计</h4><p>选择候选井并输入拟加深幅度，系统自动校核安全性并预测增油潜力。</p></div>
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card">
          <div class="card-header"><h3>方案参数设置</h3></div>
          <div class="card-body">
            <div class="form-group"><label>选择井号</label>${UIComponents.wellSelect('G3-4')}</div>
            <div class="form-group">
              <label>拟加深幅度(m)</label>
              <input type="range" id="deepenAmount" class="form-control" min="20" max="150" value="60" step="10" oninput="document.getElementById('deepenAmountVal').textContent=this.value+'m'">
              <div style="display:flex;justify-content:space-between;margin-top:4px"><span>20m</span><span id="deepenAmountVal" style="font-weight:700;color:var(--accent)">60m</span><span>150m</span></div>
            </div>
            <button class="btn btn-accent btn-lg" onclick="App.calculateDeepenPlan()" style="width:100%">生成加深方案</button>
          </div>
        </div>
        <div id="deepen-result">${UIComponents.alert('info', '请选择井号并生成方案')}</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>加深方案效果对比</h3></div>
        <div class="card-body"><div class="chart-container chart-container-lg"><canvas id="deepenComparisonChart"></canvas></div></div>
      </div>
    `;
    setTimeout(() => this.calculateDeepenPlan(), 100);
  },

  async calculateDeepenPlan() {
    try {
      const wellId = document.getElementById('wellSelect').value;
      const amount = parseInt(document.getElementById('deepenAmount').value, 10) || 60;
      const plan = await DataStore.generateDeepenPlan(wellId, amount);
      this.currentDeepenPlanRequest = { wellId, deepenAmount: amount };
      document.getElementById('deepen-result').innerHTML = UIComponents.deepenPlanCard(plan);

      const plans = (await Promise.all(
        DataStore.getPotentialWells().slice(0, 5).map((well) => DataStore.generateDeepenPlan(well.id, 60))
      )).filter(Boolean);

      if (!plans.find((item) => item.well === plan.well)) plans.unshift(plan);
      setTimeout(() => ChartManager.renderDeepenComparison('deepenComparisonChart', plans.slice(0, 6)), 50);
    } catch (error) {
      this.showError('deepen-result', error);
    }
  },

  async saveCurrentDeepenPlan() {
    const status = document.getElementById('deepenSaveStatus');
    if (!this.currentDeepenPlanRequest) return;
    if (!this.requireAuth('保存加深方案', () => this.saveCurrentDeepenPlan())) return;

    try {
      await DataStore.saveDeepenPlan(this.currentDeepenPlanRequest);
      if (status) status.textContent = '已保存';
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  },

  renderTuning() {
    const reminder = DataStore.getTuningReminders();
    const allWells = DataStore.wells.filter((well) => well.status === 'producing').map((well) => {
      let suggestion = '参数合理';
      if (well.submergence < 150) suggestion = '建议加深泵挂';
      else if (well.submergence > 450) suggestion = '建议调小冲次';
      else if (well.pumpEfficiency < 45) suggestion = '建议优化冲次冲程';
      else if (well.pumpEfficiency < 55) suggestion = '可优化参数';
      return { ...well, suggestion };
    });

    document.getElementById('tuning-container').innerHTML = `
      <div class="highlight-box"><h4>动态调参提醒</h4><p>结合实时数据推荐优化参数。</p></div>
      ${UIComponents.tuningReminderCard(reminder)}
      <div class="card" style="margin-top:20px">
        <div class="card-header"><h3>全部生产井调参建议</h3></div>
        <div class="card-body">
          ${UIComponents.renderTable(allWells, [
            { key: 'id', label: '井号' },
            { key: 'pumpEfficiency', label: '泵效(%)' },
            { key: 'submergence', label: '沉没度(m)' },
            { key: 'strokeRate', label: '冲次' },
            { key: 'strokeLength', label: '冲程(m)' },
            { key: 'suggestion', label: '调参建议' },
            { key: 'action', label: '操作', render: (value, row) => `<button class="btn btn-info btn-sm" onclick="App.viewWell('${row.id}')">查看</button>` }
          ])}
        </div>
      </div>
    `;
  },

  renderNodal() {
    const container = document.getElementById('nodal-container');
    container.innerHTML = `
      <div class="highlight-box"><h4>节点分析</h4><p>以井底流压为节点，联立 IPR 与 VLP 曲线求解协调点。</p></div>
      <div class="well-selector"><label>选择井号：</label>${UIComponents.wellSelect('G3-4')}<button class="btn btn-primary btn-sm" onclick="App.refreshNodal()">分析</button></div>
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card"><div class="card-header"><h3>IPR - VLP 交会图</h3></div><div class="card-body"><div class="chart-container chart-container-lg" style="height:420px"><canvas id="nodalIPRVLPChart"></canvas></div></div></div>
        <div id="nodal-result">${UIComponents.alert('info', '节点分析加载中...')}</div>
      </div>
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card"><div class="card-header"><h3>IPR 灵敏度</h3></div><div class="card-body"><div class="chart-container" style="height:220px"><canvas id="nodalIPRSensitivityChart"></canvas></div></div></div>
        <div class="card"><div class="card-header"><h3>VLP 灵敏度</h3></div><div class="card-body"><div class="chart-container" style="height:220px"><canvas id="nodalVLPSensitivityChart"></canvas></div></div></div>
      </div>
      <div class="card"><div class="card-header"><h3>多井节点分析对比</h3></div><div class="card-body" id="nodal-comparison"></div></div>
    `;

    document.getElementById('wellSelect').addEventListener('change', () => this.refreshNodal());
    setTimeout(() => this.refreshNodal(), 100);
  },

  async refreshNodal() {
    try {
      const wellId = document.getElementById('wellSelect').value;
      const nodal = await DataStore.getNodal(wellId);
      ChartManager.renderIPRVLPChart('nodalIPRVLPChart', wellId);
      document.getElementById('nodal-result').innerHTML = UIComponents.nodalResultCard(nodal);
      this.renderIPRSensitivityChart(DataStore.getIPRSensitivity(wellId));
      this.renderVLPSensitivityChart(DataStore.getVLPSensitivity(wellId));
      await this.renderNodalComparison();
    } catch (error) {
      this.showError('nodal-result', error);
    }
  },

  renderIPRSensitivityChart(sensitivity) {
    const ctx = document.getElementById('nodalIPRSensitivityChart');
    if (!ctx || !sensitivity) return;
    const canvasId = 'nodalIPRSensitivityChart';
    if (ChartManager.charts[canvasId]) ChartManager.charts[canvasId].destroy();

    const labels = sensitivity.sensitivities.map((item) => item.label);
    const qData = sensitivity.sensitivities.map((item) => item.Qnode);
    ChartManager.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: '协调产量 (t/d)', data: qData, backgroundColor: 'rgba(39,174,96,0.7)', borderRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
    });
  },

  renderVLPSensitivityChart(sensitivity) {
    const ctx = document.getElementById('nodalVLPSensitivityChart');
    if (!ctx || !sensitivity) return;
    const canvasId = 'nodalVLPSensitivityChart';
    if (ChartManager.charts[canvasId]) ChartManager.charts[canvasId].destroy();

    const labels = sensitivity.sensitivities.map((item) => item.label);
    const qData = sensitivity.sensitivities.map((item) => item.Qnode);
    ChartManager.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: '协调产量 (t/d)', data: qData, backgroundColor: 'rgba(52,152,219,0.7)', borderRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
    });
  },

  async renderNodalComparison() {
    const ids = DataStore.getWellList().filter((well) => well.status === 'producing').slice(0, 10).map((well) => well.id);
    const results = await Promise.all(ids.map((id) => DataStore.getNodal(id)));
    document.getElementById('nodal-comparison').innerHTML = UIComponents.renderTable(results, [
      { key: 'well', label: '井号' },
      { key: 'Qcurrent', label: '当前产量(t/d)' },
      { key: 'Qnode', label: '协调产量(t/d)' },
      { key: 'PwfNode', label: '协调流压(MPa)' },
      { key: 'estEfficiency', label: '预计泵效(%)' },
      { key: 'potentialGain', label: '潜能(%)' },
      { key: 'isReasonable', label: '协调性', render: (value) => value ? '正常' : '偏差' }
    ]);
  },

  renderImport() {
    const container = document.getElementById('import-container');
    container.innerHTML = `
      <div class="card import-panel">
        <div class="card-header"><h3>真实油井数据导入</h3><span>下载模板，填写后导入</span></div>
        <div class="card-body">
          <div class="alert alert-info">先下载 Excel 模板，按模板字段填写真实油井数据。导入时按井号 upsert，已有井覆盖最新参数。</div>
          <div class="import-actions">
            <button class="btn btn-primary btn-sm" type="button" onclick="App.downloadImportTemplate()">下载Excel模板</button>
          </div>
          <form id="excelImportForm" onsubmit="App.saveExcelImport(event)">
            <div class="import-upload-box">
              <input class="form-control" id="excelImportFile" type="file" accept=".xlsx,.xls" required>
              <button class="btn btn-success btn-sm" type="submit">导入模板数据</button>
              <span id="excelImportStatus"></span>
            </div>
          </form>
          <div class="import-field-grid">
            <div><strong>序号</strong><span>模板行号</span></div>
            <div><strong>井号</strong><span>油井唯一编号</span></div>
            <div><strong>区块</strong><span>作业区/区块</span></div>
            <div><strong>油井类型</strong><span>生产 / 作业 / 关停</span></div>
            <div><strong>井底深度</strong><span>井深</span></div>
            <div><strong>泵挂深度</strong><span>泵挂深度</span></div>
            <div><strong>泵效</strong><span>泵效</span></div>
            <div><strong>动液面</strong><span>动液面</span></div>
            <div><strong>沉没度</strong><span>沉没度</span></div>
            <div><strong>电流</strong><span>电流</span></div>
            <div><strong>最大载荷</strong><span>最大载荷</span></div>
            <div><strong>冲次</strong><span>冲次</span></div>
            <div><strong>冲程</strong><span>冲程</span></div>
            <div><strong>回压</strong><span>回压</span></div>
            <div><strong>日产油</strong><span>日产油</span></div>
            <div><strong>日产水</strong><span>日产水</span></div>
            <div><strong>含水</strong><span>含水</span></div>
            <div><strong>最近作业日期</strong><span>最近作业日期</span></div>
            <div><strong>地层压力</strong><span>地层压力</span></div>
            <div><strong>饱和压力</strong><span>饱和压力</span></div>
          </div>
        </div>
      </div>
    `;
  },

  downloadImportTemplate() {
    DataStore.downloadImportTemplate();
  },

  async saveExcelImport(event) {
    event.preventDefault();
    if (!this.requireAuth('导入真实油井数据', () => this.saveExcelImport({ preventDefault() {} }))) return;

    const input = document.getElementById('excelImportFile');
    const status = document.getElementById('excelImportStatus');
    try {
      const file = input.files && input.files[0];
      if (!file) throw new Error('请选择Excel模板文件');
      const result = await DataStore.importWellsExcel(file);
      if (status) {
        status.textContent = `已写入 ${result.imported} 口井`;
        status.style.color = 'var(--success)';
      }
      this.updateWelcomeStats();
      const badge = document.getElementById('potentialBadge');
      if (badge) badge.textContent = DataStore.getPotentialWells().length;
    } catch (error) {
      if (status) {
        status.textContent = error.message || '导入失败';
        status.style.color = 'var(--danger)';
      }
    }
  },

  renderHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = `
      <div class="highlight-box"><h4>历史优化记录追踪</h4><p>记录历次泵挂调整及效果。共 ${DataStore.optimizationHistory.length} 条记录。</p></div>
      ${UIComponents.optimizationRecordForm(DataStore.getWellList())}
      <div class="card">
        <div class="card-header">
          <h3>全部优化记录</h3>
          <select class="form-control form-control-sm" id="historyWellFilter" onchange="App.filterHistory()" style="width:auto"><option value="">全部井</option>${DataStore.getWellList().map((well) => `<option value="${well.id}">${well.name}</option>`).join('')}</select>
        </div>
        <div class="card-body" id="history-table">${UIComponents.optimizationsTable(DataStore.optimizationHistory)}</div>
      </div>
      <div style="margin-top:20px" class="card"><div class="card-header"><h3>优化时间线</h3></div><div class="card-body" id="history-timeline"></div></div>
    `;
    this.renderTimeline(DataStore.optimizationHistory);
  },

  async saveOptimizationRecord(event) {
    event.preventDefault();
    const form = event.target;
    if (!this.requireAuth('录入优化记录', () => this.saveOptimizationRecord({ preventDefault() {}, target: form }))) return;
    const payload = {};
    new FormData(form).forEach((value, key) => {
      payload[key] = ['prevDepth', 'newDepth', 'delta'].includes(key) ? Number(value) : value;
    });

    const status = document.getElementById('optimizationRecordStatus');
    try {
      await DataStore.createOptimizationRecord(payload);
      if (status) status.textContent = '已保存';
      this.renderHistory();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  },

  filterHistory() {
    const filter = document.getElementById('historyWellFilter').value;
    const records = filter
      ? DataStore.optimizationHistory.filter((record) => record.well === filter)
      : DataStore.optimizationHistory;
    document.getElementById('history-table').innerHTML = UIComponents.optimizationsTable(records);
    this.renderTimeline(records);
  },

  renderTimeline(records) {
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    document.getElementById('history-timeline').innerHTML = `
      <div class="timeline">
        ${sorted.map((record) => `
          <div class="timeline-item ${record.status}">
            <div class="time">${record.date}</div>
            <div class="title">${record.well} 泵挂调整 ${record.prevDepth}m -> ${record.newDepth}m (加深${record.delta}m)</div>
            <div class="desc">原因：${record.reason} · 效果：${record.effect}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await App.init();
  } catch (error) {
    document.body.innerHTML = `<div style="padding:24px">${UIComponents.alert('danger', `系统启动失败：${error.message}`)}</div>`;
  }
});
