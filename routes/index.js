import express from 'express';
import * as inventoryController from '../src/controllers/inventoryController.js';
import { getHome } from '../src/controllers/homeController.js';
import { getAbout, getCarReview, getContact, postCarInquiry } from '../src/controllers/pageController.js';
import {
  getAdminDashboard,
  getAdminInventory,
  getAdminUsers,
  getEditUser,
  getNewInventoryVehicle,
  getEditInventoryVehicle,
  postDeleteUser,
  postEditUser,
  postDeleteInventoryVehicle,
  postNewInventoryVehicle,
  postEditInventoryVehicle,
} from '../src/controllers/adminController.js';
import {
  getLogin,
  getRegister,
  postLogin,
  postLogout,
  postRegister,
} from '../src/controllers/authController.js';
import { requireAdmin, requireAuth, requireGuest } from '../src/middleware/index.js';

const router = express.Router();

router.get('/', getHome);
router.get('/inventory', requireAuth, inventoryController.listVehicles);
router.get('/inventory/type/:categoryName', requireAuth, inventoryController.categoryVehicles);
router.get('/inventory/:id', requireAuth, inventoryController.vehicleDetail);
router.get('/about', getAbout);
router.get('/contact', getContact);
router.get('/cars/:carId', getCarReview);
router.post('/cars/:carId', postCarInquiry);
router.get('/login', requireGuest, getLogin);
router.post('/login', postLogin);
router.get('/register', requireGuest, getRegister);
router.post('/register', postRegister);
router.post('/logout', postLogout);
router.get('/admin', requireAdmin, getAdminDashboard);
router.get('/admin/inventory', requireAdmin, getAdminInventory);
router.get('/admin/inventory/new', requireAdmin, getNewInventoryVehicle);
router.post('/admin/inventory/new', requireAdmin, postNewInventoryVehicle);
router.get('/admin/inventory/:vehicleId/edit', requireAdmin, getEditInventoryVehicle);
router.post('/admin/inventory/:vehicleId/edit', requireAdmin, postEditInventoryVehicle);
router.post('/admin/inventory/:vehicleId/delete', requireAdmin, postDeleteInventoryVehicle);
router.get('/admin/users', requireAdmin, getAdminUsers);
router.get('/admin/users/:userId/edit', requireAdmin, getEditUser);
router.post('/admin/users/:userId/edit', requireAdmin, postEditUser);
router.post('/admin/users/:userId/delete', requireAdmin, postDeleteUser);
router.get('/test-500', (req, res, next) => {
  next(new Error('Test error'));
});

export default router;