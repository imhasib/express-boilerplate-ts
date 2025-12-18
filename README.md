# Express TypeScript Boilerplate

A production-ready Express.js boilerplate with TypeScript, MongoDB, JWT Authentication, and Docker support.

## Table of Contents

- [Intro](#intro)
- [Features](#features)
- [Installation](#installation)
- [Commands](#commands)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Logging](#logging)
- [Custom Mongoose Plugins](#custom-mongoose-plugins)
- [Linting](#linting)
- [Contributing](#contributing)

## Intro

This is a production-ready boilerplate for building RESTful APIs using Express.js and TypeScript. It comes with pre-configured authentication, validation, error handling, logging, API documentation, and deployment configurations. The project follows best practices and a scalable folder structure to help you kickstart your Node.js projects quickly.

### Quick Highlights

- **Google OAuth Ready**: Pre-configured Google OAuth 2.0 authentication with Passport.js
- **Dual Auth Methods**: Support both traditional JWT and Google social login
- **Production Ready**: Fully Dockerized with PM2 cluster mode support
- **Type Safe**: Complete TypeScript implementation with strict type checking

## Features

- **Authentication**: JWT-based auth (Access & Refresh Tokens), Password hashing (Bcrypt)
- **Google OAuth 2.0**: Social login with Google authentication
- **TypeScript**: Fully typed codebase with strict type checking
- **Validation**: Request validation using Zod schemas
- **Documentation**: Swagger/OpenAPI 3.0 auto-generated API docs
- **Security**: Helmet, CORS, Rate Limiting, XSS protection
- **Error Handling**: Centralized error handling mechanism
- **Logging**: Request logging with Morgan and custom logger
- **Performance**: Gzip compression for responses
- **Database**: MongoDB with Mongoose ODM
- **Testing**: Jest setup for unit and integration tests
- **Linting**: ESLint and Prettier for code quality
- **Deployment**: Dockerized & PM2 ready for production

## Installation

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v4.4 or higher)
- Docker (optional, for containerized deployment)

### Steps

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd expressjs-typescript-boilerplate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your configuration.

## Commands

```bash
# Development
npm run start:dev          # Start development server with hot-reload

# Production
npm run build              # Build TypeScript to JavaScript
npm start                  # Start production server
npm run start:pm2          # Start with PM2 cluster mode
npm run stop:pm2           # Stop PM2 processes
npm run delete:pm2         # Delete PM2 processes
npm run logs:pm2           # View PM2 logs
npm run monit:pm2          # Monitor PM2 processes

# Docker
docker-compose up -d       # Start all services in background
docker-compose down        # Stop all services
docker-compose logs -f     # View container logs

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint errors
npm run format             # Format code with Prettier

# Testing
npm test                   # Run tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate test coverage report
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000
SWAGGER_SERVER_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/boilerplate

# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen
6. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
7. Copy the **Client ID** and **Client Secret** to your `.env` file

## Project Structure

```
src/
├── config/           # Configuration files (database, environment)
├── controllers/      # Route controllers (business logic)
├── middleware/       # Custom Express middlewares
├── models/           # Mongoose models (database schemas)
├── routes/           # API routes
├── services/         # Business logic services
├── utils/            # Utility functions and helpers
├── validators/       # Request validation schemas (Zod)
├── types/            # TypeScript type definitions
├── docs/             # Swagger/OpenAPI documentation
├── app.ts            # Express app setup
└── server.ts         # Server entry point
```

## API Documentation

Interactive API documentation is automatically generated using Swagger/OpenAPI 3.0.

- **Development**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Authentication**: The Swagger UI auto-authorizes using tokens from the `/auth/login` response

### Example Endpoints

```
POST   /api/auth/register           # Register new user
POST   /api/auth/login              # Login user
GET    /api/auth/google             # Initiate Google OAuth login
GET    /api/auth/google/callback    # Google OAuth callback
POST   /api/auth/refresh            # Refresh access token
POST   /api/auth/logout             # Logout user
GET    /api/users                   # Get all users (protected)
GET    /api/users/:id               # Get user by ID (protected)
PATCH  /api/users/:id               # Update user (protected)
DELETE /api/users/:id               # Delete user (protected)
```

## Error Handling

The application uses a centralized error handling mechanism:

- **Custom Error Classes**: Extended error classes for different error types
- **Error Middleware**: Global error handler catches all errors
- **Async Handler**: Wrapper for async route handlers to catch errors
- **Validation Errors**: Automatically formatted Zod validation errors
- **HTTP Status Codes**: Proper status codes for different error types

Example:

```typescript
throw new ApiError(404, 'User not found');
```

## Validation

Request validation is handled using Zod schemas for type-safe validation:

- **Schema Definition**: Define validation schemas using Zod
- **Middleware Integration**: Validate requests before reaching controllers
- **Type Safety**: Automatic TypeScript type inference from schemas
- **Custom Error Messages**: Descriptive validation error messages

Example:

```typescript
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});
```

## Authentication

The application supports multiple authentication methods:

### JWT Authentication

JWT-based authentication with access and refresh tokens:

- **Access Tokens**: Short-lived tokens (15 minutes default)
- **Refresh Tokens**: Long-lived tokens (7 days default)
- **Password Hashing**: Bcrypt for secure password storage
- **Token Storage**: Refresh tokens stored in database
- **Protected Routes**: Middleware to verify JWT tokens

**Traditional Auth Flow:**

1. User registers or logs in with email/password
2. Server returns access token and refresh token
3. Client includes access token in Authorization header: `Bearer <token>`
4. When access token expires, use refresh token to get new access token

### Google OAuth 2.0

Social authentication using Google OAuth:

- **Passport.js**: Google OAuth strategy integration
- **Automatic Account Creation**: Creates user account on first login
- **Seamless Integration**: Returns JWT tokens after successful OAuth
- **Secure Callback**: Validates OAuth state and credentials

**Google OAuth Flow:**

1. User clicks "Login with Google" button
2. Redirect to `/api/auth/google` endpoint
3. User authenticates with Google
4. Google redirects back to `/api/auth/google/callback`
5. Server creates/finds user and returns JWT tokens
6. Client uses JWT tokens for subsequent requests

**Implementation Example:**

```typescript
// Frontend - Initiate Google login
window.location.href = 'http://localhost:3000/api/auth/google';

// Backend handles callback and returns tokens
// Client receives: { accessToken, refreshToken, user }
```

## Authorization

Role-based access control (RBAC) for protecting routes:

- **Roles**: User roles (e.g., user, admin)
- **Permissions**: Fine-grained permissions per role
- **Middleware**: Authorization middleware checks user roles
- **Route Protection**: Protect routes based on required roles

Example:

```typescript
router.get('/admin', auth, authorize('admin'), adminController);
```

## Logging

Comprehensive logging system for debugging and monitoring:

- **Morgan**: HTTP request logging middleware
- **Custom Logger**: Winston-based logger for application logs
- **Log Levels**: debug, info, warn, error
- **Log Files**: Separate files for different log levels (optional)
- **Request IDs**: Trace requests across services

Example:

```typescript
logger.info('User logged in', { userId: user.id });
logger.error('Database connection failed', error);
```

## Custom Mongoose Plugins

Custom Mongoose plugins to enhance models:

- **Timestamps**: Automatic `createdAt` and `updatedAt` fields
- **Pagination**: Built-in pagination helper methods
- **Soft Delete**: Soft delete functionality with `isDeleted` flag
- **JSON Transform**: Automatic `_id` to `id` transformation

Example:

```typescript
userSchema.plugin(toJSON);
userSchema.plugin(paginate);
```

## Linting

Code quality tools configured for consistent code style:

- **ESLint**: Identifies and fixes problematic patterns
- **Prettier**: Code formatter for consistent formatting
- **TypeScript**: Strict type checking enabled
- **Husky**: Git hooks for pre-commit linting (optional)

Configuration files:
- [.eslintrc.js](.eslintrc.js) - ESLint configuration
- [.prettierrc](.prettierrc) - Prettier configuration
- [tsconfig.json](tsconfig.json) - TypeScript configuration

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Write meaningful commit messages
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.
