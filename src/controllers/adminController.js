import {
  deleteUserById,
  findAllUsers,
  findUserById,
  updateUserById,
} from '../models/userModel.js';

const normalizeField = (value) => (value || '').trim();

const adminRedirect = (res) => res.redirect('/admin/users');

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