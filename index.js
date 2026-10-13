/**
 * Entry point forwarding file for deployment platforms and runners
 * that execute `node index.js`.
 * 
 * Delegates execution to the compiled TypeScript server at `dist/server.js`.
 */
const server = require('./dist/server.js');

if (server && typeof server.bootstrap === 'function') {
  server.bootstrap();
}
