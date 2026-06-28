import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

describe('home access and login flow', () => {
  it('keeps the homepage browsable and moves login into a modal', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(html).toContain('App.enterSystem()');
    expect(html).toContain('App.openLoginModal()');
    expect(html).toContain('id="loginModal"');
    expect(html).toContain('name="username"');
    expect(html).toContain('name="password"');
    expect(html).toContain('name="role"');
    expect(html).toContain('admin / 123456');
    expect(html).toContain('App.handleLogin(event)');
  });

  it('requires login only for write operations', () => {
    const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

    expect(app).toContain('isAuthenticated: false');
    expect(app).toContain('openLoginModal');
    expect(app).toContain('requireAuth');
    expect(app).toContain("this.requireAuth('保存单井数据'");
    expect(app).toContain("this.requireAuth('保存加深方案'");
    expect(app).toContain("this.requireAuth('录入优化记录'");
  });

  it('uses localhost api requests when opened from a local file', () => {
    const data = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');

    expect(data).toContain('getApiBase()');
    expect(data).toContain("window.location.protocol === 'file:'");
    expect(data).toContain('http://localhost:3000');
  });

  it('turns homepage feature cards into usable navigation links', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    expect(html).toContain("App.enterSystem('wells')");
    expect(html).toContain("App.enterSystem('screening')");
    expect(html).toContain("App.enterSystem('deepen')");
    expect(html).toContain("App.enterSystem('nodal')");
    expect(html).toContain("App.enterSystem('history')");
  });

  it('makes the breadcrumb home item return to the welcome homepage', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');

    expect(html).toContain('breadcrumb-home');
    expect(html).toContain('onclick="App.showHome()"');
    expect(app).toContain('showHome()');
    expect(app).toContain("overlay.classList.remove('hidden')");
    expect(app).toContain('breadcrumb-home');
    expect(css).toContain('.breadcrumb-home');
  });

  it('renders the taste-optimized engineering shell signals', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');

    expect(html).toContain('class="app-shell"');
    expect(html).toContain('class="header-status-strip"');
    expect(html).toContain('id="dataSyncTime"');
    expect(css).toContain('Engineering Taste System');
    expect(css).toContain('.app-shell');
    expect(css).toContain('.header-status-strip');
  });

  it('renders the sidebar brand mark as a running pumpjack', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');

    expect(html).toContain('pumpjack-logo');
    expect(html).toContain('pumpjack-svg');
    expect(html).toContain('pumpjack-silhouette');
    expect(html).toContain('pumpjack-walking-beam');
    expect(html).toContain('pumpjack-horsehead');
    expect(html).toContain('pumpjack-pivot');
    expect(html).toContain('pumpjack-samson-post');
    expect(html).toContain('pumpjack-left-weight');
    expect(html).toContain('pumpjack-right-weight');
    expect(css).toContain('@keyframes pumpjack-rock');
    expect(css).toContain('@keyframes pumpjack-left-lift');
    expect(css).toContain('@keyframes pumpjack-right-lift');
    expect(css).toContain('rotate(-9deg)');
    expect(css).toContain('rotate(12deg)');
    expect(css).toContain('translateY(14px)');
  });

  it('adds a real Excel data import entry with template download and upload controls', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    const data = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');

    expect(html).toContain('data-page="import"');
    expect(html).toContain('id="page-import"');
    expect(app).toContain('renderImport()');
    expect(app).toContain('downloadImportTemplate');
    expect(app).toContain('saveExcelImport');
    expect(app).toContain('type="file"');
    expect(app).toContain('.xlsx');
    expect(data).toContain('importWells');
    expect(data).toContain('downloadImportTemplate');
    expect(data).toContain('importWellsExcel');
    expect(app).not.toContain('realDataImportJson');
    [
      '序号',
      '井号',
      '区块',
      '油井类型',
      '井底深度',
      '泵挂深度',
      '泵效',
      '动液面',
      '沉没度',
      '电流',
      '最大载荷',
      '冲次',
      '冲程',
      '回压',
      '日产油',
      '日产水',
      '含水',
      '最近作业日期',
      '地层压力',
      '饱和压力'
    ].forEach((field) => {
      expect(app).toContain(field);
    });
    expect(app).not.toContain('<strong>aof</strong>');
  });
});
