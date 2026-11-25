// Servidor da app Artilheiros: serve os ficheiros e guarda os dados em data/state.json
// Sem dependências. Arranque: node server.js
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const FILE = path.join(DATA, 'state.json');
const PORT = process.env.PORT || 3000;
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.mp4':'video/mp4', '.webm':'video/webm'
};
fs.mkdirSync(DATA, {recursive:true});

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }

  // ---- API: dados da app ----
  if (url === '/api/state') {
    if (req.method === 'GET') {
      fs.readFile(FILE, (e, b) => {
        if (e) { res.writeHead(404, {'X-Artilheiros':'1'}); return res.end(); }
        res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store','X-Artilheiros':'1'});
        res.end(b);
      });
      return;
    }
    if (req.method === 'PUT') {
      const chunks = []; let size = 0, tooBig = false;
      req.on('data', c => { size += c.length; if (size > 200e6) { tooBig = true; req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        if (tooBig) return;
        try {
          const body = Buffer.concat(chunks);
          JSON.parse(body);                                              // só aceita JSON válido
          if (fs.existsSync(FILE)) fs.copyFileSync(FILE, FILE + '.bak'); // cópia da versão anterior
          fs.writeFileSync(FILE + '.tmp', body);
          fs.renameSync(FILE + '.tmp', FILE);
          res.writeHead(204); res.end();
        } catch (e) { res.writeHead(400); res.end(); }
      });
      return;
    }
    res.writeHead(405); return res.end();
  }

  // ---- ficheiros estáticos ----
  const p = path.normalize(path.join(ROOT, url === '/' ? 'index.html' : url));
  const blocked = p === __filename || p === path.join(ROOT, 'package.json') || p.startsWith(DATA);
  if (!p.startsWith(ROOT) || blocked) { res.writeHead(403); return res.end('Proibido'); }
  fs.readFile(p, (e, b) => {
    if (e) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'});
    res.end(b);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log('\nApp Artilheiros a correr.');
  console.log('  Neste PC:        http://localhost:' + PORT);
  Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal)
    .forEach(n => console.log('  Outros aparelhos: http://' + n.address + ':' + PORT));
  console.log('\nOs dados ficam em data/state.json. Ctrl+C para parar.\n');
});
