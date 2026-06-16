import { Router } from 'express';
import { getHome } from '../src/controllers/homeController.js';
import { getAbout, getContact } from '../src/controllers/pageController.js';

const router = Router();

router.get('/', getHome);
router.get('/about', getAbout);
router.get('/contact', getContact);
router.get('/test-500', (req, res, next) => {
  next(new Error('Test error'));
});

export default router;