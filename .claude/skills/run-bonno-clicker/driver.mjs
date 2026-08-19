#!/usr/bin/env node
// bonno-clicker driver: start the PHP server, drive the app with Playwright,
// take screenshots. Run from the repo root: `node .claude/skills/run-bonno-clicker/driver.mjs <cmd>`
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = 8811;
const BASE_URL = `http://localhost:${PORT}`;
const SHOT_DIR = path.join(REPO_ROOT, '.claude/skills/run-bonno-clicker/screenshots');
mkdirSync(SHOT_DIR, { recursive: true });

async function isServerUp() {
  try {
    const res = await fetch(`${BASE_URL}/index.html`);
    return res.ok;
  } catch {
    return false;
  }
}

// Must be a single `php -S` process rooted at REPO_ROOT so that
// index.html/js/ and backend/public/api/*.php share one origin — splitting
// them across two ports makes POST /api/contribute.php fail Origin checks (403).
async function ensureServer() {
  if (await isServerUp()) {
    console.log(`[driver] server already up at ${BASE_URL}`);
    return;
  }
  console.log(`[driver] starting php -S localhost:${PORT} (docroot ${REPO_ROOT})`);
  const child = spawn('php', ['-S', `localhost:${PORT}`], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  for (let i = 0; i < 30; i++) {
    if (await isServerUp()) {
      console.log('[driver] server is up');
      return;
    }
    await sleep(500);
  }
  throw new Error('server did not come up within 15s');
}

// Opens the app, dismisses the faction-select modal that always appears on
// first load, and returns {browser, page, errors}. errors[] collects any
// console "error" messages and uncaught pageerrors seen so far.
// opts.faction: 'kon' | 'shu' picks that faction instead of dismissing via
// "spectate" — needed for anything gated on state.s.faction (mode/boon UI).
async function openApp(opts = {}) {
  const { faction = null } = opts;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (faction === 'kon' || faction === 'shu') {
    const btn = page.locator(faction === 'kon' ? '#chooseKon' : '#chooseShu');
    if (await btn.count() > 0) { await btn.click(); await page.waitForTimeout(500); }
  } else {
    // First-load faction-select modal (仏教陣営/煩悩陣営). Dismiss via the
    // "spectate" link to reach the main 3-column game screen.
    const spectate = page.getByText('まだ選ばない');
    if (await spectate.count() > 0) {
      await spectate.click();
      await page.waitForTimeout(500);
    }
  }
  return { browser, page, errors };
}

async function cmdSmoke() {
  await ensureServer();
  const { browser, page, errors } = await openApp();
  await page.screenshot({ path: path.join(SHOT_DIR, '01-main.png') });

  // The clickable moktgyo is #clickzone, NOT #zone or #mokSvg directly —
  // #mokSvg is inside it but the click handler is bound to the wrapper.
  const zone = await page.$('#clickzone');
  if (!zone) throw new Error('#clickzone not found — DOM structure may have changed');
  for (let i = 0; i < 8; i++) {
    await zone.click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOT_DIR, '02-after-clicks.png') });

  const bonnoText = await page.textContent('#cNum').catch(() => null);
  console.log('[driver] screenshots written to', SHOT_DIR);
  console.log('[driver] bonno counter text:', bonnoText);
  console.log('[driver] console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
  if (errors.length > 0) process.exitCode = 1;
}

async function cmdScreenshot(name = 'shot') {
  await ensureServer();
  const { browser, page, errors } = await openApp();
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  console.log('[driver] wrote', file);
  console.log('[driver] console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
}

async function cmdServe() {
  await ensureServer();
}

// 済度・誘惑UI(企画設計書 5.13 / 9.3 Step 3-6)の確認用。指定陣営を選び、boonbarの状態と
// (kudokuFloor>0なら)ボタンをクリックして確認モーダル→施す、までを一通り操作する。
// DBの世界情勢(劣勢/拮抗)自体はこのコマンドの外(mysql等)で用意しておく前提。
async function cmdBoon(faction = 'kon') {
  await ensureServer();
  const { browser, page, errors } = await openApp({ faction });
  // window.storageが無いheadless環境ではセーブが効かず功徳は転生でしか貯まらないため、
  // 確認用に直接state.s.kudokuを底上げする(同一originの動的importはHTML側のモジュールインスタンスと共有される)。
  await page.evaluate(async () => {
    const mod = await import('/js/core/state.js');
    mod.state.s.kudoku = 100;
  });
  await page.waitForTimeout(1000); // world-status.php の初回取得を待つ
  await page.screenshot({ path: path.join(SHOT_DIR, `boon-01-${faction}.png`) });

  const btnId = faction === 'kon' ? '#seidoBtn' : '#yuuwakuBtn';
  const statusText = await page.textContent('#boonStatus').catch(() => null);
  const disabled = await page.$eval(btnId, (el) => el.disabled).catch(() => null);
  console.log('[driver] boonStatus:', statusText, '/ button disabled:', disabled);

  if (disabled === false) {
    await page.click(btnId);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOT_DIR, `boon-02-${faction}-confirm.png`) });
    await page.click('#mYes');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOT_DIR, `boon-03-${faction}-after.png`) });
    const statusAfter = await page.textContent('#boonStatus').catch(() => null);
    console.log('[driver] boonStatus after cast:', statusAfter);
  }

  console.log('[driver] console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
  if (errors.length > 0) process.exitCode = 1;
}

const [, , cmd, arg] = process.argv;
switch (cmd) {
  case 'serve': await cmdServe(); break;
  case 'smoke': await cmdSmoke(); break;
  case 'screenshot': await cmdScreenshot(arg); break;
  case 'boon': await cmdBoon(arg); break;
  default:
    console.error('usage: node driver.mjs <serve|smoke|screenshot [name]|boon [kon|shu]>');
    process.exit(1);
}
