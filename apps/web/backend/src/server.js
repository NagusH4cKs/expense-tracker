import { app } from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Expense Tracker Backend (JavaScript) running on http://localhost:${PORT}`);
  console.log(`📡 API Health available at http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m[Backend Error] Port ${PORT} is already in use. Retrying or shutting down...\x1b[0m`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
