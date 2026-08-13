// Smoke test headless: carga el juego, conduce hasta la primera parada y
// captura pantallas. Requiere chromium + puppeteer-core en el contenedor:
//   apk add chromium && npm i --no-save puppeteer-core
//   node scripts/smoke.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('/app/.smoke', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await sleep(2000);
await page.screenshot({ path: '/app/.smoke/1-title.png' });

// entrar a la Ruta del Vecindario desde la pantalla de título
await page.keyboard.press('Enter');
await sleep(1500);
await page.screenshot({ path: '/app/.smoke/1b-game.png' });

// claxon y silencio: ejercita startHorn/stopHorn/toggleMute
await page.keyboard.down('Space');
await sleep(400);
await page.keyboard.up('Space');
await page.keyboard.press('KeyM');
await page.keyboard.press('KeyM');

// acelerar ~2.2 s: con la física actual el bus desliza hasta ~x1500 (parada 1)
await page.keyboard.down('ArrowRight');
await sleep(2200);
await page.keyboard.up('ArrowRight');
await sleep(2000);
await page.screenshot({ path: '/app/.smoke/2-driving.png' });

// dar tiempo a la secuencia de abordaje si quedó dentro del rango de la parada
await sleep(5000);
await page.screenshot({ path: '/app/.smoke/3-boarding.png' });

// ciclo día/noche acelerado (16 s por día): a los ~9 s ya es de noche
await page.goto('http://localhost:5180/?ciclo=16', { waitUntil: 'networkidle0' });
await sleep(1200);
await page.keyboard.press('Enter');
await sleep(9000);
await page.screenshot({ path: '/app/.smoke/4-night.png' });

// ruta con lluvia (tercera tarjeta de la pantalla de título)
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0' });
await sleep(1200);
await page.mouse.click(770, 300);
await sleep(2500);
await page.keyboard.down('ArrowRight');
await sleep(1500);
await page.keyboard.up('ArrowRight');
await sleep(1000);
await page.screenshot({ path: '/app/.smoke/5-lluvia.png' });

console.log(
  errors.length ? 'ERRORS:\n' + errors.join('\n') : 'OK: sin errores de consola',
);
await browser.close();
