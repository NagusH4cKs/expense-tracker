import { app } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Expense Tracker Backend (JavaScript) running on http://localhost:${PORT}`);
  console.log(`📡 API Health available at http://localhost:${PORT}/api/health`);
});
