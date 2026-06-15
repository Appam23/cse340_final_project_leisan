import { Router } from 'express';
import { getHome } from '../src/controllers/homeController.js';

const router = Router();

router.get('/', getHome);
router.get('/test-500', (req, res, next) => {
  next(new Error('Test error'));
});

export default router;