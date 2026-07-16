import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, updateUserRoleById } from '../models/userModel.js';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizeName = (value) => value.trim();

const buildFullName = (firstName, middleName, lastName) => [firstName, middleName, lastName].filter(Boolean).join(' ');

const signInUser = (req, user) => {
  req.session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};

const redirectAfterAuth = (req, res) => {
  const returnTo = req.session.returnTo;
  delete req.session.returnTo;
  returnTo ? res.redirect(returnTo) : res.redirect('/');
};

const renderAuthPage = (res, view, { title, message = '', error = '', formData = {}, fieldErrors = {} }) => {
  res.render(view, {
    title,
    message,
    error,
    formData,
    fieldErrors,
  });
};

const renderAuthError = (res, view, statusCode, payload) => {
  res.status(statusCode);
  renderAuthPage(res, view, payload);
};

export const getLogin = (req, res) => {
  renderAuthPage(res, 'login', { title: 'Login' });
};

export const getRegister = (req, res) => {
  renderAuthPage(res, 'register', { title: 'Register' });
};

export const postRegister = async (req, res, next) => {
  try {
    const firstName = normalizeName(req.body.firstName || '');
    const middleName = normalizeName(req.body.middleName || '');
    const lastName = normalizeName(req.body.lastName || '');
    const email = normalizeEmail(req.body.email || '');
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';
    const fieldErrors = {};

    if (!firstName) fieldErrors.firstName = 'First name is required.';
    if (!lastName) fieldErrors.lastName = 'Last name is required.';
    if (!email) {
      fieldErrors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      fieldErrors.email = 'Enter a valid email address.';
    }
    if (!password) fieldErrors.password = 'Password is required.';
    if (!confirmPassword) fieldErrors.confirmPassword = 'Please confirm your password.';

    if (Object.keys(fieldErrors).length > 0) {
      return renderAuthError(res, 'register', 400, {
        title: 'Register',
        error: 'Please fix the highlighted fields.',
        formData: {
          firstName,
          middleName,
          lastName,
          email,
        },
        fieldErrors,
      });
    }

    if (password !== confirmPassword) {
      fieldErrors.password = 'Passwords do not match.';
      fieldErrors.confirmPassword = 'Passwords do not match.';

      return renderAuthError(res, 'register', 400, {
        title: 'Register',
        error: 'Please fix the highlighted fields.',
        formData: {
          firstName,
          middleName,
          lastName,
          email,
        },
        fieldErrors,
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return renderAuthPage(res, 'register', {
        title: 'Register',
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        formData: {
          firstName,
          middleName,
          lastName,
          email,
        },
        fieldErrors: {
          password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
          confirmPassword: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
        },
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return renderAuthError(res, 'register', 409, {
        title: 'Register',
        error: 'An account with that email already exists.',
        formData: {
          firstName,
          middleName,
          lastName,
          email,
        },
        fieldErrors: {
          email: 'That email is already registered.',
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL ? 'owner' : 'customer';
    const user = await createUser({
      firstName,
      middleName: middleName || null,
      lastName,
      name: buildFullName(firstName, middleName || null, lastName),
      email,
      passwordHash,
      role,
    });

    signInUser(req, user);

    req.flash('success', `Welcome, ${user.name}.`);
    req.session.save(() => {
      redirectAfterAuth(req, res);
    });
  } catch (error) {
    next(error);
  }
};

export const postLogin = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email || '');
    const password = req.body.password || '';
    const fieldErrors = {};

    if (!email) fieldErrors.email = 'Email is required.';
    if (!password) fieldErrors.password = 'Password is required.';

    if (Object.keys(fieldErrors).length > 0) {
      return renderAuthError(res, 'login', 400, {
        title: 'Login',
        error: 'Please fix the highlighted fields.',
        formData: { email },
        fieldErrors,
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return renderAuthError(res, 'login', 401, {
        title: 'Login',
        error: 'Invalid email or password.',
        formData: { email },
        fieldErrors: {
          email: 'No account found for that email.',
          password: 'Check your password and try again.',
        },
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return renderAuthError(res, 'login', 401, {
        title: 'Login',
        error: 'Invalid email or password.',
        formData: { email },
        fieldErrors: {
          password: 'Check your password and try again.',
        },
      });
    }

    if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL && user.role !== 'owner') {
      const promotedUser = await updateUserRoleById(user.id, 'owner');

      if (promotedUser) {
        user.role = promotedUser.role;
      }
    }

    signInUser(req, user);

    req.flash('success', `Welcome back, ${user.name}!`);
    req.session.save(() => {
      redirectAfterAuth(req, res);
    });
  } catch (error) {
    next(error);
  }
};

export const postLogout = (req, res, next) => {
  try {
    // Preserve flash by setting it before ending the session storage for the user.
    req.flash('success', 'You have been logged out.');

    if (req.session) {
      // Remove user data but keep the session so flash can be stored and read on next request
      delete req.session.user;
      delete req.session.returnTo;
      req.session.save((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.redirect('/login');
      });
    } else {
      res.clearCookie('connect.sid');
      res.redirect('/login');
    }
  } catch (error) {
    next(error);
  }
};