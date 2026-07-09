import { Router } from 'express';
import { getHome } from '../src/controllers/homeController.js';
import { getAbout, getCarReview, getContact, postCarInquiry } from '../src/controllers/pageController.js';
import {
  getLogin,
  getRegister,
  postLogin,
  postLogout,
  postRegister,
} from '../src/controllers/authController.js';

const router = Router();

router.get('/', getHome);
router.get('/about', getAbout);
router.get('/contact', getContact);
router.get('/cars/:carId', getCarReview);
router.post('/cars/:carId', postCarInquiry);
router.get('/login', getLogin);
router.post('/login', postLogin);
router.get('/register', getRegister);
router.post('/register', postRegister);
router.post('/logout', postLogout);
router.get('/test-500', (req, res, next) => {
  next(new Error('Test error'));
});

export default router;