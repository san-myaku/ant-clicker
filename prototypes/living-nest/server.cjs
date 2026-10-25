const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = __dirname, port = Number(process.env.LIVING_NEST_PORT || 5189);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const gameRoot = path.resolve(root, '../colony-game');
const clickerRoot = path.resolve(root, '../clicker-integration');
const livingClickerRoot = path.resolve(root, '../living-clicker');
const publicPaths = new Map([
  ...['index.html', 'simulation.js', 'view.js'].map(name => ['/' + name, path.join(root, name)]),
  ...['index.html', 'core.js', 'game.js', 'view.js'].map(name => ['/play/' + name, path.join(gameRoot, name)]),
  ...['index.html', 'core.js', 'lifecycle.js', 'game.js', 'view.js'].map(name => ['/clicker/' + name, path.join(livingClickerRoot, name)]),
  ...['index.html', 'sprites.js', 'nest.js'].map(name => ['/clicker-previous/' + name, path.join(clickerRoot, name)]),
  ['/clicker-previous/core.js', path.join(gameRoot, 'core.js')]
]);
function createServer(){return http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/play') { res.writeHead(302, { Location: '/play/' }); return res.end(); }
    if (url.pathname === '/clicker') { res.writeHead(302, { Location: '/clicker/' }); return res.end(); }
    if (url.pathname === '/clicker-previous') { res.writeHead(302, { Location: '/clicker-previous/' }); return res.end(); }
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname === '/play/' ? '/play/index.html' : url.pathname === '/clicker/' ? '/clicker/index.html' : url.pathname === '/clicker-previous/' ? '/clicker-previous/index.html' : url.pathname);
    if (!publicPaths.has(rel) || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Not found'); }
    const file = publicPaths.get(rel);
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', types[path.extname(file)] || 'text/plain; charset=utf-8');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});}
if(require.main===module)createServer().listen(port, '127.0.0.1', () => console.log('Living nest: http://127.0.0.1:' + port + '/ | Colony game: /play/ | Living clicker: /clicker/ | Previous integration: /clicker-previous/'));
module.exports={createServer};
