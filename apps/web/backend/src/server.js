import { app } from './app.js';

const PORT = process.env.PORT || 5000;
let retryCount = 0;
const MAX_RETRIES = 5;

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Expense Tracker Backend (JavaScript) running on http://localhost:${PORT}`);
    console.log(`📡 API Health available at http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        console.warn(`\x1b[33m[Backend Warning] Port ${PORT} is busy, retrying in 1s (${retryCount}/${MAX_RETRIES})...\x1b[0m`);
        setTimeout(() => {
          try {
            server.close();
          } catch (e) {
            // ignore
          }
          startServer();
        }, 1000);
      } else {
        console.error(`\x1b[31m[Backend Error] Port ${PORT} is still in use after ${MAX_RETRIES} attempts.\x1b[0m`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();

