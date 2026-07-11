import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, updateUserRoleById } from '../models/userModel.js';

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizeName = (value) => value.trim();

const signInUser = (req, user) => {
  req.session.user = {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    middleName: user.middle_name,
    lastName: user.last_name,
    role: user.role,
  };
};

export const getLogin = (req, res) => {
  res.render('login', {
    title: 'Login',
    message: '',
    error: '',
  });
};

export const getRegister = (req, res) => {
  res.render('register', {
    title: 'Register',
    message: '',
    error: '',
  });
};

export const postRegister = async (req, res, next) => {
  try {
    const firstName = normalizeName(req.body.firstName || '');
    const middleName = normalizeName(req.body.middleName || '');
    const lastName = normalizeName(req.body.lastName || '');
    const email = normalizeEmail(req.body.email || '');
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).render('register', {
        title: 'Register',
        message: '',
        error: 'All fields are required.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('register', {
        title: 'Register',
        message: '',
        error: 'Passwords do not match.',
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(409).render('register', {
        title: 'Register',
        message: '',
        error: 'An account with that email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
    const user = await createUser({
      firstName,
      middleName: middleName || null,
      lastName,
      email,
      passwordHash,
      role,
    });

    signInUser(req, user);

    req.flash('success', `Welcome, ${user.first_name}.`);
    req.session.save(() => {
      res.redirect('/');
    });
  } catch (error) {
    next(error);
  }
};

export const postLogin = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email || '');
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).render('login', {
        title: 'Login',
        message: '',
        error: 'Email and password are required.',
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).render('login', {
        title: 'Login',
        message: '',
        error: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).render('login', {
        title: 'Login',
        message: '',
        error: 'Invalid email or password.',
      });
    }

    if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL && user.role !== 'admin') {
      const promotedUser = await updateUserRoleById(user.id, 'admin');

      if (promotedUser) {
        user.role = promotedUser.role;
      }
    }

    signInUser(req, user);

    req.flash('success', `Welcome back, ${user.first_name}!`);
    req.session.save(() => {
      res.redirect('/');
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