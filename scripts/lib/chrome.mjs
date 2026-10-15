// Drives headless Chrome over the DevTools protocol, with Node's own
// WebSocket, for the gallery's screenshots and the end-to-end tests.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

export async function launch({ width = 1100, height = 900, scale = 1 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'atelier-chrome-'));
  const port = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      await pause(100);
    }
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    ws.onopen = ok;
    ws.onerror = fail;
  });
  let n = 0;
  const waiting = new Map();
  const listeners = [];
  const logs = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    } else if (msg.method) {
      if (msg.method === 'Runtime.consoleAPICalled') logs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      if (msg.method === 'Runtime.exceptionThrown') logs.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
      for (const l of listeners) l(msg);
    }
  };
  const call = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++n;
      waiting.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });

  const page = {
    logs,
    call,
    on: (fn) => listeners.push(fn),
    async goto(url) {
      await call('Page.navigate', { url });
      await pause(300);
    },
    async js(expression, sessionId) {
      const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async until(expression, seconds = 15, sessionId) {
      for (let i = 0; i < seconds * 10; i++) {
        try {
          if (await page.js(`Boolean(${expression})`, sessionId)) return true;
        } catch {}
        await pause(100);
      }
      throw new Error(`Timed out waiting for ${expression}`);
    },
    async shot(file, { full = false } = {}) {
      let clip;
      if (full) {
        const { contentSize } = await call('Page.getLayoutMetrics');
        clip = { x: 0, y: 0, width, height: Math.min(Math.ceil(contentSize.height), 16000), scale: 1 };
      }
      const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}) });
      writeFileSync(file, Buffer.from(data, 'base64'));
      return file;
    },
    async click(selector, sessionId) {
      return page.js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`, sessionId);
    },
    async close() {
      ws.close();
      proc.kill();
      await pause(200);
      rmSync(profile, { recursive: true, force: true });
    },
  };
  return page;
}
