import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupMiddleware } from './middleware/index.js';
import router from './routes/index.js';
import { handle404, handle500 } from './controllers/errorController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Set up all middleware
setupMiddleware(app);

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Routes
app.use('/', router);

// Error handlers (must be at the end)
app.use(handle404);       // 404 handler
app.use(handle500);       // 500 handler

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
