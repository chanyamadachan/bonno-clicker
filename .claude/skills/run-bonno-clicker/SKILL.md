---
name: run-bonno-clicker
description: Build, run, and drive bonno-clicker (煩悩クリッカー). Use when asked to start bonno-clicker, take a screenshot of its UI, click the moktgyo / clickzone, or verify a frontend change renders correctly in a browser.
---

Native-ES-modules web app (no bundler) with a PHP backend under
`backend/public/api/`. Drive it via
`.claude/skills/run-bonno-clicker/driver.mjs`, a Playwright script that
starts the PHP dev server, opens the app in headless Chromium, dismisses
the first-load faction-select modal, and clicks around.

All paths below are relative to the repo root
(`/Users/yuki/dev/phpApp/bonno-clicker`).

## Prerequisites

- PHP (used `php -S`, PHP 8.5.9 via Homebrew — any PHP 8.x should work).
- Node.js + Playwright, already pinned as a devDependency (see Setup).

## Setup

```bash
npm install                       # installs playwright from package.json
npx playwright install chromium   # one-time browser binary download
```

## Run (agent path)

```bash
node .claude/skills/run-bonno-clicker/driver.mjs smoke
```

This starts `php -S localhost:8811` rooted at the repo root (if not
already running), opens `http://localhost:8811/index.html`, dismisses
the faction-select modal, clicks the moktgyo 8 times, and writes two
screenshots + a console-error report. Exit code is non-zero if any
console/page errors were seen.

Screenshots → `.claude/skills/run-bonno-clicker/screenshots/`.

| command | what it does |
|---|---|
| `node driver.mjs serve` | just ensure the PHP server is up on :8811 |
| `node driver.mjs smoke` | full flow: modal dismiss + 8 clicks + 2 screenshots + error check |
| `node driver.mjs screenshot <name>` | open app (modal dismissed), screenshot as `<name>.png` |

The driver is a plain Node script — read it and add commands as needed
(e.g. buying a building, opening the rebirth modal) rather than writing
a new one-off script each time.

Stop the server:

```bash
lsof -ti:8811 -sTCP:LISTEN | xargs -r kill
```

## Run (human path)

```bash
php -S localhost:8811   # from repo root, then open http://localhost:8811/index.html
```

Ctrl-C to stop. Opening `index.html` directly via `file://` does NOT
work — the `<script type="module">` imports get CORS-blocked.

## Test

No test suite exists in this repo (no `package.json` `test` script,
no test directory). `smoke` above is the closest thing to one.

---

## Gotchas

- **Must be one server, one port, docroot = repo root.** The frontend
  (`index.html`, `js/`) and backend (`backend/public/api/*.php`) must
  be served from the same origin. Splitting them into two dev servers
  (e.g. frontend on :8000, backend on :8811) makes
  `POST /api/contribute.php` fail with 403 (Origin mismatch) — see
  `backend/config.php`'s `$ALLOWED_ORIGINS`, which defaults to
  allowing :8811.
- **A faction-select modal blocks the main screen on every fresh load**
  (no save data / cleared storage), and the main screen (`.app`/#viewGame`)
  actually carries a `pre-start` class (`display:none`) until it's
  dismissed — so it's not just covered, it's genuinely hidden. It offers
  仏教陣営 / 煩悩陣営 / "友達を招待してルーム対戦を始める" / "ランダムに選ぶ".
  The driver clicks `#fRandom` to dismiss it — without that click,
  `#clickzone` and the rest of the main 3-column layout are present in the
  DOM but not visible/clickable.
- **The clickable moktgyo element is `#clickzone`, not `#zone` or
  `#mokSvg`.** `#mokSvg` is the SVG nested inside it, but the click
  handler is bound to the `#clickzone` wrapper div. Clicking `#mokSvg`
  directly still works (event bubbles) but `#zone` doesn't exist at all.
- **`chromium-cli` isn't installed in this environment.** Playwright is
  used directly instead (`npm install -D playwright`, already done —
  it's in `package.json`). If `chromium-cli` becomes available later,
  it's a drop-in replacement per `examples/playwright.md` in the
  `run-skill-generator`/`run` skills.
- **Bonno counter element is `#cNum`**, not `#bonnoCount` or similar —
  worth knowing before grepping for it again.

## Troubleshooting

- **`Cannot find module 'playwright'`**: `npm install` wasn't run, or
  was run without `-D playwright` present in `package.json`. Run
  `npm install` from repo root.
- **`page.click('#clickzone')` times out / element not found**: the
  faction-select modal is still open and the main screen still carries its
  `pre-start` (display:none) class — make sure the `#fRandom` dismiss step
  ran first.
- **`ensureServer()` in the driver never sees the server come up**:
  check nothing else is bound to :8811 (`lsof -ti:8811`) and that PHP
  is on PATH (`php -v`).
