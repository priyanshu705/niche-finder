// Tiny local dev server. On Vercel this file is not used (api/ and public/ are served natively).
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const routes = { '/api/chat': require('./api/chat'), '/api/report': require('./api/report') };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (routes[url]) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      await routes[url](req, res);
    });
    return;
  }
  const file = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
  if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('Niche Finder on http://localhost:' + PORT + (process.env.MOCK === '1' ? ' (MOCK mode)' : '')));
