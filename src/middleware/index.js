import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import flash from 'connect-flash';
import { pool } from '../config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PgSession = connectPgSimple(session);

// Function that sets up all middleware on the app
export const setupMiddleware = (app) => {
  // Security: Add HTTP headers
  app.use(helmet());

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
      secret: process.env.SESSION_SECRET || 'car-franchise-session-secret',
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
