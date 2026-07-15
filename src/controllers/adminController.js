import {
  deleteUserById,
  findAllUsers,
  findUserById,
  updateUserById,
} from '../models/userModel.js';
import {
  createVehicle,
  deleteVehicleById,
  getAllVehicles,
  getCategories,
  getVehicleById,
  updateVehicleById,
} from '../models/inventoryModel.js';
import { getVehicleImageFromApi } from '../services/vehicleImageService.js';

const normalizeField = (value) => (value || '').trim();
const normalizeNumber = (value) => Number(String(value || '').trim());
const PLACEHOLDER_IMAGE = '/images/car.png';
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

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
const inventoryRedirect = (res) => res.redirect('/admin/inventory');
const normalizeBoolean = (value) => value === 'on' || value === 'true' || value === true;

const buildInventoryFormData = (body) => ({
  categoryId: normalizeField(body.categoryId),
  year: normalizeField(body.year),
  make: normalizeField(body.make),
  model: normalizeField(body.model),
  trim: normalizeField(body.trim),
  mileage: normalizeField(body.mileage),
  vin: normalizeField(body.vin),
  color: normalizeField(body.color),
  transmission: normalizeField(body.transmission),
  fuelType: normalizeField(body.fuelType),
  drivetrain: normalizeField(body.drivetrain),
  engine: normalizeField(body.engine),
  description: normalizeField(body.description),
  price: normalizeField(body.price),
  imageUrl: normalizeField(body.imageUrl),
  altText: normalizeField(body.altText),
  isAvailable: normalizeBoolean(body.isAvailable),
  featured: normalizeBoolean(body.featured),
});

const mapVehicleToFormData = (vehicle) => ({
  categoryId: vehicle.category_id ? String(vehicle.category_id) : '',
  year: vehicle.year ?? '',
  make: vehicle.make ?? '',
  model: vehicle.model ?? '',
  trim: vehicle.trim ?? '',
  mileage: vehicle.mileage ?? '',
  vin: vehicle.vin ?? '',
  color: vehicle.color ?? '',
  transmission: vehicle.transmission ?? '',
  fuelType: vehicle.fuel_type ?? '',
  drivetrain: vehicle.drivetrain ?? '',
  engine: vehicle.engine ?? '',
  description: vehicle.description ?? '',
  price: vehicle.price ?? '',
  imageUrl: vehicle.raw_image_url ?? '',
  altText: vehicle.raw_alt_text ?? '',
  isAvailable: vehicle.is_available,
  featured: vehicle.featured,
});

export const getAdminDashboard = async (req, res) => {
  res.render('admin-dashboard', {
    title: 'Admin Dashboard',
    adminStyles: true,
  });
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
      formData: {},
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

    res.render('admin-inventory-edit', {
      title: 'Edit Vehicle',
      categories,
      vehicle,
      formData: mapVehicleToFormData(vehicle),
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
        vehicle,
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
      trim: formData.trim,
      mileage: Number(formData.mileage),
      vin: formData.vin,
      color: formData.color,
      transmission: formData.transmission,
      fuelType: formData.fuelType,
      drivetrain: formData.drivetrain,
      engine: formData.engine,
      description: formData.description,
      price: Number(formData.price),
      imageUrl: formData.imageUrl,
      altText: formData.altText,
      isAvailable: formData.isAvailable,
      featured: formData.featured,
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

      return res.status(409).render('admin-inventory-edit', {
        title: 'Edit Vehicle',
        categories,
        vehicle,
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
  try {
    const categories = await getCategories();
    const formData = buildInventoryFormData(req.body);

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
      trim: formData.trim,
      mileage: normalizeNumber(formData.mileage),
      vin: formData.vin,
      color: formData.color,
      transmission: formData.transmission,
      fuelType: formData.fuelType,
      drivetrain: formData.drivetrain,
      engine: formData.engine,
      description: formData.description,
      price: Number(formData.price),
      imageUrl: formData.imageUrl,
      altText: formData.altText,
      isAvailable: formData.isAvailable,
      featured: formData.featured,
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
    const users = await findAllUsers();

    res.render('admin-users', {
      title: 'Admin Users',
      users,
      adminStyles: true,
    });
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
      user,
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
    const role = req.body.role === 'admin' ? 'admin' : 'user';

    if (!firstName || !lastName || !email) {
      const user = await findUserById(id);

      return res.status(400).render('admin-user-form', {
        title: 'Edit User',
        user: user
          ? {
              ...user,
              first_name: firstName,
              middle_name: middleName,
              last_name: lastName,
              email,
              role,
            }
          : {
              id,
              first_name: firstName,
              middle_name: middleName,
              last_name: lastName,
              email,
              role,
            },
        error: 'First name, last name, and email are required.',
        adminStyles: true,
      });
    }

    const updatedUser = await updateUserById({
      id,
      firstName,
      middleName,
      lastName,
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