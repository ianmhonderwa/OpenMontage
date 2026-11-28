// Renders index.html frame by frame in headless Chromium and pipes JPEGs into ffmpeg.
// Usage: node engine/render.js <EP> stills 2,10,17 | node engine/render.js <EP> video [fps]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const EP = process.argv[2]; const mode = process.argv[3] || 'stills';
const OUT = path.join(ROOT, 'out', EP);

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(p); const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.wasm': 'application/wasm' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r)); const PORT = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  page.on('pageerror', e => console.error('PAGEERR:', e.message));
  await page.goto(`http://localhost:${PORT}/engine/index.html?ep=${EP}`);
  await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
  const dur = await page.evaluate('window.DURATION');
  if (mode === 'stills') {
    const times = (process.argv[4] || '2,10,17,22,29,34,41,48').split(',').map(Number);
    fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });
    for (const t of times) { await page.evaluate(t => window.renderAt(t), t); await page.screenshot({ path: path.join(OUT, `stills/t${t}.jpg`), type: 'jpeg', quality: 85 }); console.log('still', t); }
  } else {
    const fps = Number(process.argv[4] || 30); const n = Math.ceil(dur * fps);
    const out = path.join(OUT, 'video_only.mp4'); const CH = 300;
    const cdir = path.join(OUT, 'chunks'); fs.mkdirSync(cdir, { recursive: true });
    const t0 = Date.now(); const list = [];
    for (let c = 0; c * CH < n; c++) {
      const name = `c${String(c).padStart(4, '0')}.mp4`, cf = path.join(cdir, name); list.push(`file '${name}'`);
      if (fs.existsSync(cf + '.ok')) continue;
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', cf]);
      for (let f = c * CH; f < Math.min(n, (c + 1) * CH); f++) {
        await page.evaluate(t => window.renderAt(t), f / fps);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (f % 60 === 0) console.log(`frame ${f}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r)); fs.writeFileSync(cf + '.ok', '');
    }
    fs.writeFileSync(path.join(cdir, 'list.txt'), list.join('\n'));
    await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(cdir, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', c => c ? rej(c) : res()));
    console.log('done', out);
  }
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
