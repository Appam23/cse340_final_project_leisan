import bcrypt from 'bcryptjs';
import {
  deleteUserById,
  createUser,
  findAllUsers,
  findUserByEmail,
  findUserById,
  updateUserById,
} from '../models/userModel.js';
import {
  createCategory,
  createVehicle,
  deleteCategoryById,
  deleteVehicleById,
  getAllVehicles,
  getCategoriesWithVehicleCounts,
  getCategories,
  getCategoryById,
  getVehicleById,
  updateCategoryById,
  updateVehicleById,
} from '../models/inventoryModel.js';
import {
  getAllServiceRequests,
  updateServiceRequestStatus,
} from '../models/serviceRequestModel.js';
import {
  deleteReviewById,
  getAllReviews,
} from '../models/reviewModel.js';
import { getAllContactMessages } from '../models/contactModel.js';
import { getSystemOverview } from '../models/adminModel.js';
import { getVehicleImageFromApi } from '../services/vehicleImageService.js';

const normalizeField = (value) => (value || '').trim();
const normalizeNumber = (value) => Number(String(value || '').trim());
const PLACEHOLDER_IMAGE = '/images/car.png';
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const ADMIN_USER_ROLE_FILTERS = new Set(['customer', 'employee', 'owner']);

const splitName = (name = '') => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  }

  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts.at(-1),
  };
};

const buildName = (firstName, middleName, lastName) => [firstName, middleName, lastName].filter(Boolean).join(' ');

const needsApiImage = (imageUrl) => {
  if (!imageUrl) {
    return true;
  }

  const value = imageUrl.trim();

  if (!value || value === PLACEHOLDER_IMAGE) {
    return true;
  }

  if (value.startsWith('/images/vehicles/')) {
    return true;
  }

  if (ABSOLUTE_HTTP_URL.test(value)) {
    return false;
  }

  if (value.startsWith('/')) {
    return false;
  }

  return true;
};

const enrichVehiclesWithImages = async (vehicles) => {
  const results = [];

  for (const vehicle of vehicles) {
    if (!needsApiImage(vehicle.image_url)) {
      results.push(vehicle);
      continue;
    }

    const apiImageUrl = await getVehicleImageFromApi(vehicle);
    results.push({
      ...vehicle,
      image_url: apiImageUrl || PLACEHOLDER_IMAGE,
    });
  }

  return results;
};

const adminRedirect = (res) => res.redirect('/admin/users');
const employeeDashboardRedirect = (res) => res.redirect('/employee');
const categoriesRedirect = (res) => res.redirect('/admin/categories');
const inventoryRedirect = (res) => res.redirect('/admin/inventory');
const serviceRequestsRedirect = (res) => res.redirect('/admin/service-requests');
const normalizeBoolean = (value) => value === 'on' || value === 'true' || value === true;

const formatUserRoleLabel = (role) => {
  if (role === 'employee') {
    return 'Staff';
  }

  if (role === 'owner') {
    return 'Admin';
  }

  return 'Customer';
};

const buildInventoryFormData = (body) => ({
  categoryId: normalizeField(body.categoryId),
  year: normalizeField(body.year),
  make: normalizeField(body.make),
  model: normalizeField(body.model),
  mileage: normalizeField(body.mileage),
  description: normalizeField(body.description),
  price: normalizeField(body.price),
  imageUrl: normalizeField(body.imageUrl),
  availability: normalizeBoolean(body.availability),
});

const mapVehicleToFormData = (vehicle) => ({
  categoryId: vehicle.category_id ? String(vehicle.category_id) : '',
  year: vehicle.year ?? '',
  make: vehicle.make ?? '',
  model: vehicle.model ?? '',
  mileage: vehicle.mileage ?? '',
  description: vehicle.description ?? '',
  price: vehicle.price ?? '',
  imageUrl: vehicle.raw_image_url ?? '',
  availability: vehicle.availability,
});

export const getAdminDashboard = async (req, res) => {
  res.render('admin-dashboard', {
    title: 'Admin Dashboard',
    adminStyles: true,
  });
};

export const getEmployeeDashboard = async (req, res) => {
  res.render('employee-dashboard', {
    title: 'Employee Dashboard',
    adminStyles: true,
  });
};

export const getAdminCategories = async (req, res, next) => {
  try {
    const categories = await getCategoriesWithVehicleCounts();

    res.render('admin-categories', {
      title: 'Manage Categories',
      categories,
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getNewCategory = async (req, res) => {
  res.render('admin-category-form', {
    title: 'Add Category',
    mode: 'create',
    category: { id: null },
    formData: {
      name: '',
      description: '',
    },
    error: '',
    adminStyles: true,
  });
};

export const postNewCategory = async (req, res, next) => {
  try {
    const name = normalizeField(req.body.name);
    const description = normalizeField(req.body.description);

    if (!name) {
      return res.status(400).render('admin-category-form', {
        title: 'Add Category',
        mode: 'create',
        category: { id: null },
        formData: {
          name,
          description,
        },
        error: 'Category name is required.',
        adminStyles: true,
      });
    }

    const createdCategory = await createCategory({ name, description });

    if (!createdCategory) {
      req.flash('error', 'That category could not be created.');
      return categoriesRedirect(res);
    }

    req.flash('success', 'Category created successfully.');
    return categoriesRedirect(res);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).render('admin-category-form', {
        title: 'Add Category',
        mode: 'create',
        category: { id: null },
        formData: {
          name: normalizeField(req.body.name),
          description: normalizeField(req.body.description),
        },
        error: 'That category already exists.',
        adminStyles: true,
      });
    }

    next(error);
  }
};

export const getEditCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.categoryId);
    const category = await getCategoryById(categoryId);

    if (!category) {
      req.flash('error', 'That category could not be found.');
      return categoriesRedirect(res);
    }

    res.render('admin-category-form', {
      title: 'Edit Category',
      mode: 'edit',
      category,
      formData: {
        name: category.name || '',
        description: category.description || '',
      },
      error: '',
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const postEditCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.categoryId);
    const name = normalizeField(req.body.name);
    const description = normalizeField(req.body.description);

    if (!name) {
      return res.status(400).render('admin-category-form', {
        title: 'Edit Category',
        mode: 'edit',
        category: { id: categoryId },
        formData: {
          name,
          description,
        },
        error: 'Category name is required.',
        adminStyles: true,
      });
    }

    const updatedCategory = await updateCategoryById({
      categoryId,
      name,
      description,
    });

    if (!updatedCategory) {
      req.flash('error', 'That category could not be updated.');
      return categoriesRedirect(res);
    }

    req.flash('success', 'Category updated successfully.');
    return categoriesRedirect(res);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).render('admin-category-form', {
        title: 'Edit Category',
        mode: 'edit',
        category: { id: Number(req.params.categoryId) },
        formData: {
          name: normalizeField(req.body.name),
          description: normalizeField(req.body.description),
        },
        error: 'That category already exists.',
        adminStyles: true,
      });
    }

    next(error);
  }
};

export const postDeleteCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.categoryId);
    const deletedCategory = await deleteCategoryById(categoryId);

    if (!deletedCategory) {
      req.flash('error', 'That category could not be deleted.');
      return categoriesRedirect(res);
    }

    req.flash('success', 'Category deleted successfully.');
    return categoriesRedirect(res);
  } catch (error) {
    if (error.code === '23503') {
      req.flash('error', 'Delete all vehicles in this category before deleting the category.');
      return categoriesRedirect(res);
    }

    next(error);
  }
};

export const getAdminActivity = async (req, res, next) => {
  try {
    const overview = await getSystemOverview();

    res.render('admin-activity', {
      title: 'System Activity',
      summary: overview.summary,
      recentUsers: overview.recentUsers,
      recentServiceRequests: overview.recentServiceRequests,
      recentReviews: overview.recentReviews,
      recentContactMessages: overview.recentContactMessages,
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminServiceRequests = async (req, res, next) => {
  try {
    const serviceRequests = await getAllServiceRequests();

    res.render('admin-service-requests', {
      title: 'Service Requests',
      serviceRequests,
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const postUpdateServiceRequestStatus = async (req, res, next) => {
  try {
    const requestId = Number(req.params.requestId);
    const status = req.body.status;
    const employeeNotes = normalizeField(req.body.employeeNotes);

    const updatedRequest = await updateServiceRequestStatus({
      requestId,
      status,
      employeeNotes: employeeNotes || null,
    });

    if (!updatedRequest) {
      req.flash('error', 'That service request could not be updated.');
      return serviceRequestsRedirect(res);
    }

    req.flash('success', 'Service request status updated successfully.');
    return serviceRequestsRedirect(res);
  } catch (error) {
    next(error);
  }
};

export const getAdminReviews = async (req, res, next) => {
  try {
    const reviews = await getAllReviews();

    res.render('admin-reviews', {
      title: 'Review Moderation',
      reviews,
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const postDeleteAdminReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const deletedReview = await deleteReviewById(reviewId);

    if (!deletedReview) {
      req.flash('error', 'That review could not be deleted.');
      return res.redirect('/admin/reviews');
    }

    req.flash('success', 'Review deleted successfully.');
    return res.redirect('/admin/reviews');
  } catch (error) {
    next(error);
  }
};

export const getAdminContactMessages = async (req, res, next) => {
  try {
    const contactMessages = await getAllContactMessages();

    res.render('admin-contact-messages', {
      title: 'Contact Submissions',
      contactMessages,
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminInventory = async (req, res, next) => {
  try {
    const vehicles = await getAllVehicles();
    const vehiclesWithApiImages = await enrichVehiclesWithImages(vehicles);

    res.render('admin-inventory', {
      title: 'Admin Inventory',
      vehicles: vehiclesWithApiImages,
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getNewInventoryVehicle = async (req, res, next) => {
  try {
    const categories = await getCategories();

    res.render('admin-inventory-form', {
      title: 'Add Vehicle',
      categories,
      error: '',
      formData: { availability: true },
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getEditInventoryVehicle = async (req, res, next) => {
  try {
    const [categories, vehicle] = await Promise.all([
      getCategories(),
      getVehicleById(req.params.vehicleId),
    ]);

    if (!vehicle) {
      req.flash('error', 'That vehicle could not be found.');
      return inventoryRedirect(res);
    }

    const formData = mapVehicleToFormData(vehicle);

    if (needsApiImage(formData.imageUrl)) {
      const apiImageUrl = await getVehicleImageFromApi(vehicle);
      if (apiImageUrl) {
        formData.imageUrl = apiImageUrl;
      }
    }

    res.render('admin-inventory-edit', {
      title: 'Edit Vehicle',
      categories,
      vehicle,
      formData,
      error: '',
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const postEditInventoryVehicle = async (req, res, next) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const categories = await getCategories();
    const formData = buildInventoryFormData(req.body);

    if (!formData.categoryId || !formData.year || !formData.make || !formData.model || !formData.mileage || !formData.price) {
      const vehicle = await getVehicleById(vehicleId);

      return res.status(400).render('admin-inventory-edit', {
        title: 'Edit Vehicle',
        categories,
        vehicle: vehicle || { id: vehicleId },
        formData,
        error: 'Category, year, make, model, mileage, and price are required.',
        adminStyles: true,
      });
    }

    const updatedVehicle = await updateVehicleById(vehicleId, {
      categoryId: Number(formData.categoryId),
      year: Number(formData.year),
      make: formData.make,
      model: formData.model,
      mileage: Number(formData.mileage),
      description: formData.description,
      price: Number(formData.price),
      imageUrl: formData.imageUrl,
      availability: formData.availability,
    });

    if (!updatedVehicle) {
      req.flash('error', 'That vehicle could not be updated.');
      return inventoryRedirect(res);
    }

    req.flash('success', 'Vehicle updated successfully.');
    return inventoryRedirect(res);
  } catch (error) {
    if (error.code === '23505') {
      const categories = await getCategories();
      const vehicle = await getVehicleById(req.params.vehicleId);
      const vehicleId = Number(req.params.vehicleId);

      return res.status(409).render('admin-inventory-edit', {
        title: 'Edit Vehicle',
        categories,
        vehicle: vehicle || { id: vehicleId },
        formData: buildInventoryFormData(req.body),
        error: 'That vehicle already exists.',
        adminStyles: true,
      });
    }

    next(error);
  }
};

export const postDeleteInventoryVehicle = async (req, res, next) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const deletedVehicle = await deleteVehicleById(vehicleId);

    if (!deletedVehicle) {
      req.flash('error', 'That vehicle could not be deleted.');
      return inventoryRedirect(res);
    }

    req.flash('success', 'Vehicle deleted successfully.');
    return inventoryRedirect(res);
  } catch (error) {
    next(error);
  }
};

export const postNewInventoryVehicle = async (req, res, next) => {
  const formData = buildInventoryFormData(req.body);

  try {
    const categories = await getCategories();

    if (!formData.categoryId || !formData.year || !formData.make || !formData.model || !formData.mileage || !formData.price) {
      return res.status(400).render('admin-inventory-form', {
        title: 'Add Vehicle',
        categories,
        error: 'Category, year, make, model, mileage, and price are required.',
        formData,
        adminStyles: true,
      });
    }

    const vehicleId = await createVehicle({
      categoryId: normalizeNumber(formData.categoryId),
      year: normalizeNumber(formData.year),
      make: formData.make,
      model: formData.model,
      mileage: normalizeNumber(formData.mileage),
      description: formData.description,
      price: Number(formData.price),
      imageUrl: formData.imageUrl,
      availability: formData.availability,
    });

    if (!vehicleId) {
      req.flash('error', 'That vehicle could not be created.');
      return inventoryRedirect(res);
    }

    req.flash('success', 'Vehicle created successfully.');
    return inventoryRedirect(res);
  } catch (error) {
    if (error.code === '23505') {
      const categories = await getCategories();

      return res.status(409).render('admin-inventory-form', {
        title: 'Add Vehicle',
        categories,
        error: 'That vehicle already exists.',
        formData,
        adminStyles: true,
      });
    }

    next(error);
  }
};

export const getAdminUsers = async (req, res, next) => {
  try {
    const requestedRole = String(req.query.role || '').toLowerCase();
    const roleFilter = ADMIN_USER_ROLE_FILTERS.has(requestedRole) ? requestedRole : '';
    const users = await findAllUsers();
    const filteredUsers = roleFilter ? users.filter((user) => user.role === roleFilter) : users;

    res.render('admin-users', {
      title: 'Admin Users',
      users: filteredUsers.map((user) => ({
        ...user,
        displayRole: formatUserRoleLabel(user.role),
      })),
      selectedRole: roleFilter,
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getNewStaffUser = async (req, res) => {
  res.render('admin-user-form', {
    title: 'Create Staff Account',
    mode: 'create',
    user: { id: null },
    formData: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'employee',
    },
    error: '',
    adminStyles: true,
  });
};

export const postNewStaffUser = async (req, res, next) => {
  try {
    const firstName = normalizeField(req.body.firstName);
    const middleName = normalizeField(req.body.middleName) || null;
    const lastName = normalizeField(req.body.lastName);
    const email = normalizeField(req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    const fieldErrors = {};

    if (!firstName) fieldErrors.firstName = 'First name is required.';
    if (!lastName) fieldErrors.lastName = 'Last name is required.';
    if (!email) {
      fieldErrors.email = 'Email is required.';
    }
    if (!password) fieldErrors.password = 'Password is required.';
    if (!confirmPassword) fieldErrors.confirmPassword = 'Please confirm the password.';

    if (password && confirmPassword && password !== confirmPassword) {
      fieldErrors.password = 'Passwords do not match.';
      fieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).render('admin-user-form', {
        title: 'Create Staff Account',
        mode: 'create',
        user: { id: null },
        formData: {
          firstName,
          middleName: middleName || '',
          lastName,
          email,
          password: '',
          confirmPassword: '',
          role: 'employee',
        },
        error: 'Please fix the highlighted fields.',
        fieldErrors,
        adminStyles: true,
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(409).render('admin-user-form', {
        title: 'Create Staff Account',
        mode: 'create',
        user: { id: null },
        formData: {
          firstName,
          middleName: middleName || '',
          lastName,
          email,
          password: '',
          confirmPassword: '',
          role: 'employee',
        },
        error: 'An account with that email already exists.',
        fieldErrors: {
          email: 'That email is already registered.',
        },
        adminStyles: true,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await createUser({
      firstName,
      middleName,
      lastName,
      name: buildName(firstName, middleName, lastName),
      email,
      passwordHash,
      role: 'employee',
    });

    if (!createdUser) {
      req.flash('error', 'That staff account could not be created.');
      return adminRedirect(res);
    }

    req.flash('success', 'Staff account created successfully.');
    return adminRedirect(res);
  } catch (error) {
    next(error);
  }
};

export const getEditUser = async (req, res, next) => {
  try {
    const user = await findUserById(req.params.userId);

    if (!user) {
      req.flash('error', 'That user could not be found.');
      return adminRedirect(res);
    }

    res.render('admin-user-form', {
      title: 'Edit User',
      mode: 'edit',
      user,
      formData: {
        ...splitName(user.name),
        email: user.email,
        role: user.role,
      },
      error: '',
      adminStyles: true,
    });
  } catch (error) {
    next(error);
  }
};

export const postEditUser = async (req, res, next) => {
  try {
    const id = Number(req.params.userId);
    const firstName = normalizeField(req.body.firstName);
    const middleName = normalizeField(req.body.middleName) || null;
    const lastName = normalizeField(req.body.lastName);
    const email = normalizeField(req.body.email).toLowerCase();
    const role = ['customer', 'employee', 'owner'].includes(req.body.role) ? req.body.role : 'customer';
    const name = buildName(firstName, middleName, lastName);

    if (!firstName || !lastName || !email) {
      const user = await findUserById(id);

      return res.status(400).render('admin-user-form', {
        title: 'Edit User',
        mode: 'edit',
        user: user || { id },
        formData: {
          firstName,
          middleName: middleName || '',
          lastName,
          email,
          role,
        },
        error: 'First name, last name, and email are required.',
        adminStyles: true,
      });
    }

    const updatedUser = await updateUserById({
      id,
      name,
      email,
      role,
    });

    if (!updatedUser) {
      req.flash('error', 'That user could not be updated.');
      return adminRedirect(res);
    }

    req.flash('success', 'User updated successfully.');
    return adminRedirect(res);
  } catch (error) {
    next(error);
  }
};

export const postDeleteUser = async (req, res, next) => {
  try {
    const id = Number(req.params.userId);

    if (res.locals.currentUser?.id === id) {
      req.flash('error', 'You cannot delete your own account from this page.');
      return adminRedirect(res);
    }

    const deletedUser = await deleteUserById(id);

    if (!deletedUser) {
      req.flash('error', 'That user could not be deleted.');
      return adminRedirect(res);
    }

    req.flash('success', 'User deleted successfully.');
    return adminRedirect(res);
  } catch (error) {
    next(error);
  }
};