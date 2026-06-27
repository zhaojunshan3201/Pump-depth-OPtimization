# 泵挂深度动态优化管理系统

面向采油作业区的单井泵挂深度优化、潜力井筛选、动态调参、节点分析和历史记录管理系统。

## 技术架构

- 前端：HTML5、CSS3、原生 JavaScript、Chart.js。
- 后端：Node.js、Express。
- 数据库：PostgreSQL。
- 数据访问：`pg` 连接池，REST API 返回 camelCase JSON。
- 数据初始化：`server/scripts/init-db.js` 创建表并导入 20 口井、动液面趋势和优化记录。

## 本机运行

确认本机 PostgreSQL 已启动，并准备数据库：

```powershell
# 默认连接信息
# host=localhost port=5432 user=postgres password=123456 database=bgua
```

安装依赖、初始化数据库并启动：

```powershell
npm install
npm run init-db
npm start
```

浏览器访问：

```text
http://localhost:3000
```

## 测试

```powershell
npm test
```

当前测试覆盖健康检查、井数据 CRUD、看板/筛选/调参/诊断 API、加深方案、优化记录和节点分析 API。

## 主要 API

- `GET /api/health`
- `GET /api/wells`
- `PUT /api/wells/:id`
- `GET /api/wells/:id/diagnosis`
- `GET /api/wells/:id/dynamic-level`
- `GET /api/dashboard/summary`
- `GET /api/screening/potential-wells`
- `GET /api/tuning/reminders`
- `POST /api/deepen-plans/preview`
- `POST /api/deepen-plans`
- `GET /api/deepen-plans`
- `GET /api/optimization-records`
- `POST /api/optimization-records`
- `GET /api/nodal/:id`

## 实际使用

1. 进入系统后查看总览看板，了解作业区井数、日产、平均泵效、潜力井和报警井。
2. 在单井看板选择井号，查看泵挂参数、生产参数、动液面趋势、工况诊断和历史优化记录，并可保存参数调整。
3. 在潜力井筛选页面查看泵效低、沉没度不足的候选井。
4. 在加深方案页面输入拟加深幅度，预览预测效果并保存方案。
5. 在节点分析页面查看 IPR/VLP 曲线、协调点和多井对比。
6. 在历史记录页面新增泵挂优化记录，形成闭环追踪。
