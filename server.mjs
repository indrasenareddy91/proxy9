// server.mjs
import http from 'http';
import httpProxy from 'http-proxy';

// Create a proxy server instance
const proxy = httpProxy.createProxyServer({});

// Handle errors gracefully so the Render instance doesn't crash
proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
  }
  res.end('Proxy encountered an error routing your request.');
});

const server = http.createServer((req, res) => {
  // CRITICAL FIX: Catch UptimeRobot / direct browser hits instantly to prevent 504/508 infinite loops
  if (req.url === '/' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy node is alive and healthy.');
    return;
  }

  try {
    let target = req.url;

    // If it's not an absolute URL, resolve it using the incoming request headers
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      const host = req.headers.host;
      target = `https://${host}${req.url}`;
    }

    console.log(`[Proxying Request] -> ${req.method} ${target}`);

    // Forward the payload out through this instance's unique IP address
    proxy.web(req, res, {
      target: target,
      changeOrigin: true,
      prependPath: false,
      secure: true
    });

  } catch (error) {
    console.error('Server Processing Error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Proxy Server Error');
  }
});

// Bind explicitly to 0.0.0.0 so Render detects the open port flawlessly
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server actively running on port ${PORT}`);
});
