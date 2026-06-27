const { createApp } = require('./app');
const { config } = require('./config');

const app = createApp();

app.listen(config.port, () => {
  console.log(`泵挂深度动态优化管理系统已启动：http://localhost:${config.port}`);
});
