import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  // Static files: Serve CSS, images, etc. from /public folder
  app.use(express.static(join(__dirname, '../../public')));
};
