# CSE340 Final Project

Car dealership website built for the CSE340 final project. The app is a server-rendered Node.js and Express application that uses EJS templates, PostgreSQL, and session-based authentication.

## Overview

This project presents a simple car dealership experience with public pages, account registration and login, and a car inquiry flow. It is structured as a full-stack web app with a persistent PostgreSQL database and reusable EJS layouts.

## Features

- Home page with featured content
- About and Contact pages
- Car detail and review pages
- User registration, login, and logout
- Session-based authentication with flash messages
- Form submission for car inquiries
- Custom 404 and 500 error pages

## Tech Stack

- Node.js
- Express
- EJS
- PostgreSQL
- bcryptjs for password hashing
- express-session with connect-pg-simple for session storage
- dotenv for environment variables
- helmet and cors for middleware security

## Project Structure

- `server.js` - application entry point
- `routes/` - route definitions
- `src/controllers/` - request handlers
- `src/models/` - database queries
- `src/config/` - database connection and setup
- `src/middleware/` - shared middleware configuration
- `src/views/` - EJS pages and partials
- `public/` - CSS, images, and static assets
- `sql/users.sql` - users table schema

## Requirements

- Node.js 18+ recommended
- pnpm or npm
- PostgreSQL database

## Setup

1. Install dependencies:

	```bash
	pnpm install
	```

2. Create a PostgreSQL database for the app.

3. Set your environment variables in a `.env` file.

4. Initialize the users table:

	```bash
	psql -d your_database_name -f sql/users.sql
	```

5. Start the app:

	```bash
	pnpm run dev
	```

	The app will be available at `http://localhost:4000` unless `PORT` is set.

## Environment Variables

The app reads the following environment variables:

- `PORT` - server port
- `DATABASE_URL` - full PostgreSQL connection string for hosted deployments
- `PGHOST` - PostgreSQL host
- `PGPORT` - PostgreSQL port
- `PGDATABASE` - database name
- `PGUSER` - database user
- `PGPASSWORD` - database password
- `SESSION_SECRET` - session signing secret
- `ADMIN_EMAIL` - email address that should be promoted to admin on registration/login
- `UNSPLASH_ACCESS_KEY` - Unsplash API access key for live inventory vehicle images

If `DATABASE_URL` is set, it is used first. Otherwise the app falls back to the individual `PG*` values.

## Database Notes

- The app creates the `users` table automatically on startup if it does not exist.
- The table schema is also documented in `sql/users.sql`.
- Sessions are stored in PostgreSQL through `connect-pg-simple`.

## Scripts

- `pnpm run dev` - start the development server with watch mode
- `pnpm start` - start the production server

## Deployment
The app is deployed on Render as a Node.js web service backed by PostgreSQL, not as a static site.

Live demo: https://cse340-final-project-leisan.onrender.com

## Author

Appam Leisan
