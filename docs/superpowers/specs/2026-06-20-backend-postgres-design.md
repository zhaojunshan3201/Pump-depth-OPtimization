# 泵挂深度动态优化管理系统前后端完善设计

## 目标

将当前纯静态的“泵挂深度动态优化管理系统”升级为管理型前后端系统。系统保留现有看板、图表和业务页面体验，新增 Node.js 后端、PostgreSQL 持久化数据库、REST API、井数据编辑、历史记录录入和加深方案保存能力。

## 当前状态

项目当前由 `index.html`、`css/style.css`、`js/app.js`、`js/components.js`、`js/charts.js`、`js/data.js` 组成。所有井数据、历史记录、动液面趋势和算法都集中在浏览器端的 `DataStore` 对象中。页面可以直接打开使用，但数据不可持久化，也没有真正的后端服务和数据库。

## 目标范围

本次按“管理型系统”范围实现：

- 保留现有 7 个页面：总览看板、单井看板、潜力井筛选、加深方案设计、节点分析、动态调参、历史记录。
- 将井数据、动液面趋势、历史优化记录、加深方案保存到 PostgreSQL。
- 新增井数据新增和编辑能力。
- 新增历史优化记录录入能力。
- 加深方案支持预览和保存。
- 潜力井筛选、工况诊断、动态调参、节点分析由后端统一计算并通过 API 返回。
- 前端通过 API 获取数据并渲染现有 Chart.js 图表。

不纳入本次范围：

- 登录和权限管理。
- 审计日志。
- Excel 导入。
- 多角色工作流。
- 生产环境部署脚本。

## 技术方案

后端使用 Node.js、Express 和 `pg` 连接 PostgreSQL。前端继续使用原生 HTML、CSS、JavaScript 和 Chart.js，不引入 React、Vue 或全栈框架。后端同时托管静态前端文件，因此本地运行后可通过一个服务地址访问完整系统。

数据库默认连接配置：

- `PGHOST=localhost`
- `PGPORT=5432`
- `PGUSER=postgres`
- `PGPASSWORD=123456`
- `PGDATABASE=bgua`

项目新增 `.env.example` 说明配置项，实际 `.env` 用于本机运行。

## 后端结构

新增 `server/` 目录：

- `server/app.js`：创建 Express 应用，注册中间件、API 路由和静态文件托管。
- `server/index.js`：读取配置并启动 HTTP 服务。
- `server/db.js`：封装 PostgreSQL 连接池和查询函数。
- `server/config.js`：读取环境变量并提供默认值。
- `server/routes/`：拆分各业务路由。
- `server/services/`：放置业务计算和数据访问逻辑。
- `server/sql/schema.sql`：建表 SQL。
- `server/scripts/init-db.js`：通过 Node `pg` 执行建表 SQL，并导入当前 20 口井、动液面趋势和历史记录。

## 数据模型

### `wells`

保存井基础信息和当前生产参数：

- `id`：井号，主键，例如 `G3-1`。
- `name`：井名。
- `zone`：作业区。
- `status`：生产状态，取值 `producing`、`maintenance`、`shutdown`。
- `depth`：井深。
- `pump_depth`：泵挂深度。
- `pump_efficiency`：泵效。
- `dynamic_level`：动液面。
- `submergence`：沉没度。
- `current`：电流。
- `load`：载荷。
- `stroke_rate`：冲次。
- `stroke_length`：冲程。
- `back_pressure`：回压。
- `daily_oil`：日产油。
- `daily_water`：日产水。
- `water_cut`：含水率。
- `last_overhaul`：最后作业日期。
- `reservoir_pressure`：地层压力。
- `bubble_point_pressure`：泡点压力。
- `aof`：无阻流量。
- `created_at`、`updated_at`：记录时间。

### `dynamic_level_readings`

保存动液面趋势：

- `id`：自增主键。
- `well_id`：井号，关联 `wells.id`。
- `hour_index`：小时序号，0 到 23。
- `level_value`：动液面深度。
- `created_at`：记录时间。

每口井最多保存一组 24 小时趋势。缺失趋势数据时，后端根据该井当前动液面生成可展示的 24 小时趋势，保证图表可用。

### `optimization_records`

保存历史泵挂调整记录：

- `id`：自增主键。
- `well_id`：井号，关联 `wells.id`。
- `record_date`：调整日期。
- `prev_depth`：原泵挂深度。
- `new_depth`：新泵挂深度。
- `delta`：加深幅度。
- `reason`：调整原因。
- `effect`：调整效果。
- `status`：记录状态，取值 `success`、`warning`、`danger`。
- `created_at`：记录时间。

### `deepen_plans`

保存加深方案：

- `id`：自增主键。
- `well_id`：井号，关联 `wells.id`。
- `deepen_amount`：拟加深幅度。
- `current_pump_depth`：当前泵挂深度。
- `new_pump_depth`：新泵挂深度。
- `current_efficiency`：当前泵效。
- `estimated_efficiency`：预计泵效。
- `efficiency_gain`：预计泵效提升。
- `current_oil`：当前日产油。
- `estimated_oil`：预计日产油。
- `oil_gain`：预计日增油。
- `current_submergence`：当前沉没度。
- `estimated_submergence`：预计沉没度。
- `safety_factor`：安全性校核结果。
- `created_at`：创建时间。

## API 设计

所有接口返回 JSON。错误响应统一包含 `error` 字段和清晰中文提示。

### 健康检查

- `GET /api/health`：返回服务状态和数据库连接状态。

### 井数据

- `GET /api/wells`：获取全部井列表。
- `GET /api/wells/:id`：获取单井详情。
- `POST /api/wells`：新增井。
- `PUT /api/wells/:id`：编辑井参数。

新增和编辑井时，后端校验必填字段、数值字段和状态枚举。井号不能重复。

### 看板和分析

- `GET /api/dashboard/summary`：获取首页统计卡片数据。
- `GET /api/screening/potential-wells`：返回泵效低于 40% 且沉没度低于 200m 的非关停井。
- `GET /api/tuning/reminders`：返回逢五调参提醒和候选井建议。
- `GET /api/wells/:id/dynamic-level`：获取单井 24 小时动液面趋势。
- `GET /api/wells/:id/diagnosis`：获取单井工况诊断。
- `GET /api/nodal/:id`：获取单井节点分析结果、IPR 曲线、VLP 曲线、IPR 灵敏度和 VLP 灵敏度。

### 加深方案

- `POST /api/deepen-plans/preview`：根据井号和加深幅度生成方案预览，不写入数据库。
- `POST /api/deepen-plans`：生成并保存加深方案。
- `GET /api/deepen-plans`：查询已保存方案。

### 历史优化记录

- `GET /api/optimization-records`：获取历史记录，支持 `wellId` 查询参数。
- `POST /api/optimization-records`：新增历史优化记录。

## 业务计算

后端从现有 `DataStore` 迁移以下业务逻辑：

- 作业区统计摘要。
- 潜力井筛选。
- 报警井筛选。
- 加深方案计算。
- 逢五调参提醒。
- 工况诊断。
- 月度趋势模拟。
- Vogel IPR 曲线。
- VLP 曲线。
- 节点分析求解。
- IPR 和 VLP 灵敏度分析。

算法保持现有计算口径，避免本次改造同时改变业务结果。字段命名在 API 返回时保持前端易用的 camelCase 格式，例如数据库字段 `pump_depth` 返回为 `pumpDepth`。

## 前端改造

前端保留当前页面结构和视觉风格。`js/data.js` 改为 API 客户端和少量缓存层，不再作为真实数据来源。

核心变化：

- `App.init()` 先调用 `DataStore.init()` 检查后端健康状态并加载初始数据。
- 页面渲染函数改为异步，进入页面时显示加载状态。
- API 请求失败时展示错误提示，不静默回退到模拟数据。
- `ChartManager` 保持 Chart.js 配置职责，但图表数据来自 API。
- `UIComponents` 继续负责表格、卡片、表单、提醒和结果卡片。

新增前端交互：

- 单井看板增加“编辑井参数”按钮，打开表单编辑井当前参数。
- 历史记录页增加“新增优化记录”按钮，提交后刷新历史表格和时间线。
- 加深方案设计页增加“保存方案”按钮，保存成功后给出提示。

## 运行方式

本地运行步骤：

1. 确认 PostgreSQL 运行在 `localhost:5432`。
2. 确认数据库用户为 `postgres`，密码为 `123456`。
3. 创建数据库 `bgua`。
4. 安装 Node.js 依赖。
5. 执行数据库初始化和种子数据导入。
6. 启动后端服务。
7. 浏览器访问后端服务地址。

README 会更新为前后端运行说明，并保留静态版背景说明。

## 测试策略

采用测试先行方式实现后端核心逻辑。测试重点：

- 潜力井筛选能正确排除关停井。
- 工况诊断能根据沉没度、泵效、含水率、回压、载荷比返回正确级别。
- 加深方案计算能返回新泵挂深度、预计泵效、预计日增油和安全性校核。
- 节点分析能返回协调点、当前工况点和曲线数据。
- API 健康检查能验证数据库连接。
- 井列表、单井详情、方案预览、历史记录查询接口能返回预期 JSON。

前端验证重点：

- 首页能从 API 渲染统计卡片和图表。
- 单井看板能切换井并刷新详情。
- 编辑井参数后，刷新页面仍保留修改结果。
- 新增历史优化记录后，历史表格和时间线更新。
- 保存加深方案后，后端数据库可查询该方案。

## 风险和约束

- 当前项目不是 Git 仓库，无法按常规提交设计文档和后续代码提交。
- 当前 PostgreSQL 客户端命令 `psql` 未在 PATH 中发现，初始化脚本需要通过 Node `pg` 执行或用户补充 PostgreSQL 命令行路径。
- 现有前端使用全局对象和同步渲染，改为异步 API 后需要控制加载顺序，避免 Chart.js 在 DOM 未准备好时渲染。
- 本次不加入权限控制，因此接口默认面向本机可信环境使用。

## 验收标准

- 后端服务可启动并连接本机 PostgreSQL。
- 数据库中存在 20 口种子井、动液面趋势和历史优化记录。
- 浏览器访问系统后，7 个现有页面均可正常显示。
- 首页、单井、筛选、调参、节点分析、历史记录均从 API 获取数据。
- 可以新增和编辑井数据。
- 可以新增历史优化记录。
- 可以生成并保存加深方案。
- 核心后端测试通过。
