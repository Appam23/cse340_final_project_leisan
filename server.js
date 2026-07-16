import 'dotenv/config';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupMiddleware } from './src/middleware/index.js';
import router from './routes/index.js';
import { handle404, handle500 } from './src/controllers/errorController.js';
import { findUserById } from './src/models/userModel.js';
import {
  ensureContactMessagesTable,
  ensureInventoryTables,
  ensureServiceRequestsTable,
  ensureUsersTable,
} from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 4000);
const MAX_PORT_ATTEMPTS = 10;

// Set up all middleware
setupMiddleware(app);

app.use(async (req, res, next) => {
  try {
    res.locals.currentUser = null;

    if (req.session?.user?.id) {
      res.locals.currentUser = await findUserById(req.session.user.id);
    }

    next();
  } catch (error) {
    next(error);
  }
});

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'src/views'));
app.set('layout', 'layout');
app.use(expressLayouts);

app.get('/favicon.ico', (req, res) => {
  res.sendFile(join(__dirname, 'public/images/car.png'));
});

// Routes
app.use('/', router);

// Error handlers (must be at the end)
app.use(handle404);       // 404 handler
app.use(handle500);       // 500 handler

const listenWithPortFallback = (port, attemptsRemaining = MAX_PORT_ATTEMPTS) => {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE' && attemptsRemaining > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Trying port ${nextPort}...`);
      listenWithPortFallback(nextPort, attemptsRemaining - 1);
      return;
    }

    console.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
};

const startServer = async () => {
  try {
    await ensureUsersTable();
    await ensureInventoryTables();
    await ensureContactMessagesTable();
    await ensureServiceRequestsTable();

    listenWithPortFallback(DEFAULT_PORT);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

startServer();
