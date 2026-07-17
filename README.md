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
- `sql/01_core_schema.sql` - full database schema
- `sql/users.sql` - users table schema for quick setup

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

4. Initialize the database schema:

	```bash
	psql -d your_database_name -f sql/01_core_schema.sql
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
- The full schema is documented in `sql/01_core_schema.sql`.
- A minimal users-only schema remains available in `sql/users.sql`.
- Sessions are stored in PostgreSQL through `connect-pg-simple`.

## Scripts

- `pnpm run dev` - start the development server with watch mode
- `pnpm start` - start the production server

## Deployment
The app is deployed on Render as a Node.js web service backed by PostgreSQL, not as a static site.

Live demo: https://cse340-final-project-leisan.onrender.com

## ERD Diagram
![ERD Diagram](docs/erd.png)

## User Roles

### 1) Guest (Not Logged In)
- Browse vehicle listings and view vehicle details
- View approved reviews
- Submit contact messages
- Cannot create reviews or service requests until logged in

### 2) Customer (Logged In User)
- All Guest permissions, plus:
- Create, edit, and delete their own reviews
- Submit service requests for vehicles
- View their own service request history/status
- Manage their account/profile information

### 3) Employee (Staff)
- Moderate customer reviews (approve/hide/edit as allowed)
- View and manage contact messages
- Update service request status (e.g., Submitted, In Progress, Completed)
- Add internal notes on service requests
- Update certain vehicle information (based on permissions)

### 4) Owner/Admin
- Full system access
- Add, edit, and delete vehicle categories
- Add, edit, and delete vehicles
- Manage users/roles (if implemented)
- Perform all Employee actions
- Monitor activity logs and overall system administration

## Author

Appam Leisan
