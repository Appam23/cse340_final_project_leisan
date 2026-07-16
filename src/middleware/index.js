import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import flash from 'connect-flash';
import { pool } from '../config/database.js';
import { handle401 } from '../controllers/errorController.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PgSession = connectPgSimple(session);

// Function that sets up all middleware on the app
export const setupMiddleware = (app) => {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET environment variable is required.');
  }

  // Security: Add HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'https://api.openverse.org', 'https://live.staticflickr.com'],
        },
      },
    })
  );

  // Access control: Allow cross-origin requests
  app.use(cors());

  // Parsing: Understand JSON data
  app.use(express.json());

  // Parsing: Understand form data
  app.use(express.urlencoded({ extended: true }));

  // Sessions: Persist login state in PostgreSQL
  app.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  app.use(flash());
  app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
  });

  app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
  });

  // Static files: Serve CSS, images, etc. from /public folder
  app.use(express.static(join(__dirname, '../../public')));
};

export const requireAuth = (req, res, next) => {
  if (!res.locals.currentUser) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }

  return next();
};

export const requireAdmin = (req, res, next) => {
  if (!res.locals.currentUser) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }

  if (res.locals.currentUser.role !== 'owner') {
    return handle401(req, res);
  }

  return next();
};

export const requireInventoryStaff = (req, res, next) => {
  if (!res.locals.currentUser) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }

  if (!['employee', 'owner'].includes(res.locals.currentUser.role)) {
    return handle401(req, res);
  }

  return next();
};

export const requireGuest = (req, res, next) => {
  if (res.locals.currentUser) {
    return res.redirect('/');
  }

  return next();
};
