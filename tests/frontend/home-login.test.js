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
});
