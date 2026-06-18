import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupMiddleware } from './src/middleware/index.js';
import router from './routes/index.js';
import { handle404, handle500 } from './src/controllers/errorController.js';
import { findUserById } from './src/models/userModel.js';
import { ensureUsersTable } from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

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

// Routes
app.use('/', router);

// Error handlers (must be at the end)
app.use(handle404);       // 404 handler
app.use(handle500);       // 500 handler

const startServer = async () => {
  try {
    await ensureUsersTable();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

startServer();
