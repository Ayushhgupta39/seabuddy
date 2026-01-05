import app from './app.js';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;
const ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚢 SeaBuddy Backend Server                             ║
║                                                           ║
║   Server running on port ${PORT}                            ║
║   Environment: ${ENV}                              ║
║                                                           ║
║   Health check: http://localhost:${PORT}/health             ║
║   API endpoint: http://localhost:${PORT}/api                ║
║                                                           ║
║   📱 Offline-first multi-tenant crew well-being platform  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
