import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../models/userModel.js';

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizeName = (value) => value.trim();

const signInUser = (req, user) => {
  req.session.user = {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    middleName: user.middle_name,
    lastName: user.last_name,
  };
};

export const getLogin = (req, res) => {
  res.render('login', {
    title: 'Login',
    message: req.query.message || '',
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
    const user = await createUser({
      firstName,
      middleName: middleName || null,
      lastName,
      email,
      passwordHash,
    });

    signInUser(req, user);

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

    signInUser(req, user);

    req.session.save(() => {
      res.redirect('/');
    });
  } catch (error) {
    next(error);
  }
};

export const postLogout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie('connect.sid');
    res.redirect('/login?message=You%20have%20been%20logged%20out.');
  });
};