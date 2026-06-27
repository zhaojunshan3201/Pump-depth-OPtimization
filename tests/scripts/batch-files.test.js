import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function readBatch(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

describe('windows service batch files', () => {
  test('start.bat starts the Node server and records its PID', () => {
    const script = readBatch('start.bat');

    expect(script).toContain('server\\index.js');
    expect(script).toContain('.server.pid');
    expect(script).toContain('Start-Process');
    expect(script).toContain('server.out.log');
    expect(script).toContain('server.err.log');
  });

  test('stop.bat stops the process recorded by start.bat', () => {
    const script = readBatch('stop.bat');

    expect(script).toContain('.server.pid');
    expect(script).toContain('Stop-Process');
    expect(script).toContain('Remove-Item');
  });

  test('local runtime files are ignored by git', () => {
    const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

    expect(gitignore).toContain('.server.pid');
    expect(gitignore).toContain('server.out.log');
    expect(gitignore).toContain('server.err.log');
  });
});
