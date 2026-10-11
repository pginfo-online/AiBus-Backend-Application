/**
 * Entry point forwarding file for deployment platforms (like Render)
 * that default to running `node index.js`.
 * 
 * Delegates execution to the compiled TypeScript server at `dist/server.js`.
 */
require('./dist/server.js');
