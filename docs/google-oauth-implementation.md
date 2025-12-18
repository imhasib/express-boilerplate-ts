# Google OAuth 2.0 Authentication Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Implementation Steps](#implementation-steps)
5. [Frontend Integration](#frontend-integration)
6. [Testing Guide](#testing-guide)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a complete implementation plan for adding Google OAuth 2.0 authentication to the boilerplate application. Users will be able to sign up and log in using their Google accounts, in addition to the existing email/password authentication.

### Benefits
- **Enhanced Security**: OAuth 2.0 eliminates password storage risks for Google users
- **Better UX**: One-click login without remembering passwords
- **Profile Data**: Automatic user profile information from Google
- **Account Linking**: Seamless integration with existing email/password accounts
- **Future Extensibility**: Easy to add more OAuth providers (Facebook, GitHub, etc.)

### Authentication Flow
1. User clicks "Sign in with Google"
2. Redirected to Google's authorization page
3. User authenticates and grants permissions
4. Google redirects back to our callback URL
5. Backend creates/updates user and issues JWT tokens
6. User is logged in with standard JWT authentication

---

## Architecture

### Technology Stack
- **OAuth Library**: `passport-google-oauth20`
- **Auth Framework**: Passport.js (already in use)
- **Token Strategy**: JWT (reusing existing implementation)
- **Database**: MongoDB (existing User model extended)

### User Model Design

The User model will be extended to support both local and Google authentication:

```typescript
interface IUser {
  name: string;
  email: string;
  password?: string;              // Optional (not required for Google users)
  role: 'admin' | 'user' | 'therapist';
  googleId?: string;              // NEW: Google account identifier
  profilePicture?: string;        // NEW: Profile photo URL
  authProvider: 'local' | 'google'; // NEW: Authentication method
  createdAt: Date;
  updatedAt: Date;
}
```

### Account Linking Strategy

When a user signs in with Google:

1. **Check by Google ID**: Look for existing user with matching `googleId`
2. **Check by Email**: If not found, check if email already exists
3. **Link Account**: If email exists (local auth user), add `googleId` to that user
4. **Create New**: If completely new, create user with Google profile data

This ensures users can have one account accessible via multiple auth methods.

---

## Prerequisites

### 1. Google Cloud Console Setup

#### Step 1: Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

#### Step 2: Enable Google+ API
1. Navigate to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click **Enable**

#### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (or Internal if Google Workspace)
3. Fill in required fields:
   - App name: boilerplate
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Add test users (for development)
6. Save and continue

#### Step 4: Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: boilerplate Web Client
5. Add **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
6. Click **Create**
7. **Save your Client ID and Client Secret**

### 2. Environment Configuration

Add these variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

And update `.env.example`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-from-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-console
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install passport-google-oauth20
npm install --save-dev @types/passport-google-oauth20
```

### Step 2: Update User Model

**File**: `src/models/user.model.ts`

Add new fields to the schema:

```typescript
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { RoleType } from '../constants/roles';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;              // Made optional
    role: RoleType;
    googleId?: string;              // NEW
    profilePicture?: string;        // NEW
    authProvider: 'local' | 'google'; // NEW
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: function(this: IUser) {
                // Password required only for local auth
                return this.authProvider === 'local';
            },
            minlength: 6,
        },
        role: {
            type: String,
            enum: ['admin', 'user', 'therapist'],
            default: 'user',
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // Allows null values with unique constraint
        },
        profilePicture: {
            type: String,
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    if (!this.password) {
        return false; // Google users have no password
    }
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
```

### Step 3: Create Google Types

**File**: `src/types/google.types.ts` (NEW)

```typescript
export interface GoogleProfile {
    id: string;
    displayName: string;
    name?: {
        familyName?: string;
        givenName?: string;
    };
    emails: Array<{
        value: string;
        verified: boolean;
    }>;
    photos: Array<{
        value: string;
    }>;
    provider: 'google';
    _raw: string;
    _json: any;
}

export interface GoogleAuthenticatedUser {
    id: string;
    email: string;
    name: string;
    googleId: string;
    profilePicture?: string;
}
```

### Step 4: Configure Google Strategy

**File**: `src/config/passport.config.ts`

Add Google Strategy configuration:

```typescript
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { tokenConfig } from './token.config';
import { authService } from '../services/auth.service';
import { GoogleProfile } from '../types/google.types';
import logger from './logger';

// Existing JWT Strategy
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: tokenConfig.accessSecret,
};

passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
        try {
            if (!payload.userId || !payload.email || !payload.role) {
                return done(null, false);
            }

            const user = {
                id: payload.userId,
                email: payload.email,
                role: payload.role,
            };

            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    })
);

// NEW: Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
            scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile: GoogleProfile, done) => {
            try {
                // Validate email is verified
                const email = profile.emails?.[0];
                if (!email || !email.verified) {
                    return done(new Error('Email not verified by Google'), false);
                }

                // Extract profile data
                const googleData = {
                    googleId: profile.id,
                    email: email.value,
                    name: profile.displayName,
                    profilePicture: profile.photos?.[0]?.value,
                };

                // Find or create user
                const user = await authService.authenticateGoogleUser(googleData);

                return done(null, user);
            } catch (error) {
                logger.error('Google OAuth error:', error);
                return done(error, false);
            }
        }
    )
);

export default passport;
```

### Step 5: Update User Service

**File**: `src/services/user.service.ts`

Add methods to handle Google users:

```typescript
import User, { IUser } from '../models/user.model';
import { ApiError } from '../errors/ApiError';
import { httpStatus } from '../constants/httpStatus';

// ... existing methods ...

/**
 * Find user by Google ID
 */
export const getUserByGoogleId = async (
    googleId: string
): Promise<IUser | null> => {
    return await User.findOne({ googleId });
};

/**
 * Find user by email
 */
export const getUserByEmail = async (
    email: string
): Promise<IUser | null> => {
    return await User.findOne({ email: email.toLowerCase() });
};

/**
 * Create user with Google profile
 */
export const createGoogleUser = async (googleData: {
    googleId: string;
    email: string;
    name: string;
    profilePicture?: string;
}): Promise<IUser> => {
    const user = await User.create({
        ...googleData,
        authProvider: 'google',
        role: 'user', // Default role
    });

    return user;
};

/**
 * Link Google account to existing user
 */
export const linkGoogleAccount = async (
    userId: string,
    googleId: string,
    profilePicture?: string
): Promise<IUser> => {
    const user = await User.findByIdAndUpdate(
        userId,
        {
            googleId,
            profilePicture,
            // Don't change authProvider - user might still want password login
        },
        { new: true }
    );

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    return user;
};
```

### Step 6: Update Auth Service

**File**: `src/services/auth.service.ts`

Add Google authentication logic:

```typescript
import { IUser } from '../models/user.model';
import * as userService from './user.service';
import { ApiError } from '../errors/ApiError';
import { httpStatus } from '../constants/httpStatus';
import logger from '../config/logger';

// ... existing methods ...

/**
 * Authenticate or register user via Google OAuth
 */
export const authenticateGoogleUser = async (googleData: {
    googleId: string;
    email: string;
    name: string;
    profilePicture?: string;
}): Promise<IUser> => {
    try {
        // 1. Try to find user by Google ID
        let user = await userService.getUserByGoogleId(googleData.googleId);

        if (user) {
            // User exists with this Google account
            logger.info(`Google user login: ${user.email}`);
            return user;
        }

        // 2. Try to find user by email (may have registered with password)
        user = await userService.getUserByEmail(googleData.email);

        if (user) {
            // Email exists - link Google account to existing user
            logger.info(`Linking Google account to existing user: ${user.email}`);
            user = await userService.linkGoogleAccount(
                user._id.toString(),
                googleData.googleId,
                googleData.profilePicture
            );
            return user;
        }

        // 3. Create new user with Google profile
        logger.info(`Creating new Google user: ${googleData.email}`);
        user = await userService.createGoogleUser(googleData);
        return user;

    } catch (error) {
        logger.error('Google authentication error:', error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Failed to authenticate with Google'
        );
    }
};
```

### Step 7: Update Auth Controller

**File**: `src/controllers/auth.controller.ts`

Add Google callback handler:

```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as authService from '../services/auth.service';
import * as tokenService from '../services/token.service';
import { IUser } from '../models/user.model';
import { httpStatus } from '../constants/httpStatus';

// ... existing controllers ...

/**
 * Google OAuth callback handler
 * @route GET /api/auth/google/callback
 */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;

    if (!user) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Authentication failed',
        });
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = await tokenService.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
    );

    // Store refresh token in database
    const decoded = tokenService.verifyRefreshToken(refreshToken);
    await tokenService.saveRefreshToken(
        refreshToken,
        user._id.toString(),
        new Date(decoded.exp! * 1000)
    );

    // Return user data and tokens
    res.status(httpStatus.OK).json({
        success: true,
        message: 'Google authentication successful',
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
                authProvider: user.authProvider,
            },
            accessToken,
            refreshToken,
        },
    });
});
```

### Step 8: Update Token Service

**File**: `src/services/token.service.ts`

Add method to save refresh token (if not already present):

```typescript
import jwt from 'jsonwebtoken';
import { tokenConfig } from '../config/token.config';
import Token, { IToken } from '../models/token.model';

// ... existing methods ...

/**
 * Save refresh token to database
 */
export const saveRefreshToken = async (
    token: string,
    userId: string,
    expiresAt: Date
): Promise<IToken> => {
    return await Token.create({
        token,
        userId,
        expiresAt,
    });
};
```

### Step 9: Update Auth Routes

**File**: `src/routes/auth.route.ts`

Add Google OAuth routes:

```typescript
import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import * as userValidation from '../validations/user.validation';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

// ... existing routes ...

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     description: Redirects user to Google login page for authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 */
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     description: Handles Google OAuth callback and returns JWT tokens
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         profilePicture:
 *                           type: string
 *                         authProvider:
 *                           type: string
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Authentication failed
 */
router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/login?error=google_auth_failed',
    }),
    authController.googleCallback
);

export default router;
```

### Step 10: Update Main Index

**File**: `src/index.ts`

Ensure Passport is initialized (should already be present):

```typescript
import express from 'express';
import passport from './config/passport.config';
// ... other imports ...

const app = express();

// ... other middleware ...

// Initialize Passport
app.use(passport.initialize());

// ... routes ...
```

---

## Frontend Integration

### Web Application (SPA)

#### HTML Button
```html
<button onclick="loginWithGoogle()">
  Sign in with Google
</button>
```

#### JavaScript
```javascript
function loginWithGoogle() {
  // Redirect to backend Google OAuth endpoint
  window.location.href = 'http://localhost:3000/api/auth/google';
}

// Handle callback (if redirected back to frontend)
function handleGoogleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');

  if (error) {
    console.error('Google authentication failed:', error);
    // Show error message
    return;
  }

  // If using redirect approach, tokens would be in URL or you'd make an API call
}
```

#### React Example
```jsx
import React from 'react';

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    // Option 1: Full page redirect
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google`;

    // Option 2: Popup window (more complex, requires postMessage)
    // const width = 500;
    // const height = 600;
    // const left = window.screen.width / 2 - width / 2;
    // const top = window.screen.height / 2 - height / 2;
    // const popup = window.open(
    //   `${process.env.REACT_APP_API_URL}/api/auth/google`,
    //   'Google Login',
    //   `width=${width},height=${height},top=${top},left=${left}`
    // );
  };

  return (
    <button onClick={handleGoogleLogin} className="google-login-btn">
      <img src="/google-icon.svg" alt="Google" />
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton;
```

#### Handling Callback Response

You have several options for handling the callback:

**Option 1: JSON Response (Recommended for SPAs)**

Modify callback to redirect to frontend with tokens:

```typescript
// In auth.controller.ts googleCallback method
res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
```

Frontend extracts tokens from URL and stores them:
```javascript
// In your frontend callback route
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('token');
const refreshToken = urlParams.get('refresh');

if (accessToken && refreshToken) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

**Option 2: HTTP-Only Cookies (More Secure)**

Backend sets cookies instead of returning JSON:

```typescript
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
```

Frontend automatically sends cookies with API requests.

### Mobile Application

For mobile apps (React Native, Flutter), you need to use in-app browsers:

#### React Native Example
```javascript
import { useEffect } from 'react';
import { WebView } from 'react-native-webview';

const GoogleLogin = ({ onSuccess, onError }) => {
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;

    // Check if URL contains callback
    if (url.includes('/auth/callback')) {
      // Extract tokens from URL or make API call
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const accessToken = urlParams.get('token');
      const refreshToken = urlParams.get('refresh');

      if (accessToken && refreshToken) {
        onSuccess({ accessToken, refreshToken });
      } else {
        onError('Failed to get tokens');
      }
    }
  };

  return (
    <WebView
      source={{ uri: 'https://yourapi.com/api/auth/google' }}
      onNavigationStateChange={handleNavigationStateChange}
    />
  );
};
```

---

## Testing Guide

### Manual Testing

#### Test Case 1: New User Signs Up with Google
1. Navigate to login page
2. Click "Sign in with Google"
3. Select Google account
4. Grant permissions
5. **Expected**: Redirected back, user created, tokens received

#### Test Case 2: Existing User (Email/Password) Links Google
1. Create user via email/password: `POST /api/auth/register`
2. Click "Sign in with Google" using same email
3. Grant permissions
4. **Expected**: Google account linked, same user returned

#### Test Case 3: Returning Google User
1. User already signed up with Google previously
2. Click "Sign in with Google"
3. Select same Google account
4. **Expected**: User found, tokens issued immediately

#### Test Case 4: JWT Token Usage
1. Login with Google
2. Use `accessToken` in subsequent API calls:
   ```
   Authorization: Bearer <accessToken>
   ```
3. **Expected**: Protected endpoints work correctly

#### Test Case 5: Token Refresh
1. Wait for access token to expire (15 minutes)
2. Call `POST /api/auth/refresh` with `refreshToken`
3. **Expected**: New access token issued

#### Test Case 6: Logout
1. Call `POST /api/auth/logout` with `refreshToken`
2. Try to refresh token again
3. **Expected**: Refresh fails, token revoked

### API Testing with cURL

#### Initiate Google Login (will redirect)
```bash
curl -X GET http://localhost:3000/api/auth/google
```

#### Test Callback (after getting code from Google)
```bash
curl -X GET "http://localhost:3000/api/auth/google/callback?code=<google_auth_code>"
```

#### Use Access Token
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

### Postman Testing

1. **Initiate OAuth Flow**:
   - Method: GET
   - URL: `http://localhost:3000/api/auth/google`
   - This will redirect to Google - follow in browser

2. **After Callback**:
   - Copy `accessToken` and `refreshToken` from response
   - Save to Postman environment variables

3. **Test Protected Route**:
   - Method: GET
   - URL: `http://localhost:3000/api/users/me`
   - Headers: `Authorization: Bearer {{accessToken}}`

### Database Verification

Check MongoDB after Google login:

```javascript
// Find user by Google ID
db.users.findOne({ googleId: "1234567890" })

// Check if email/password user was linked
db.users.findOne({
  email: "user@example.com",
  googleId: { $exists: true }
})

// Verify refresh token stored
db.tokens.find({ userId: ObjectId("...") })
```

---

## Security Considerations

### 1. Email Verification
Only accept verified emails from Google:

```typescript
if (!email || !email.verified) {
  return done(new Error('Email not verified by Google'), false);
}
```

### 2. State Parameter (CSRF Protection)
Add state parameter for additional security:

```typescript
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state; // Store in session or Redis

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state,
    session: false,
  })(req, res, next);
});

// Verify state in callback
router.get('/google/callback', (req, res, next) => {
  if (req.query.state !== req.session.oauthState) {
    return res.status(403).json({ error: 'Invalid state parameter' });
  }
  // Continue with authentication
});
```

### 3. HTTPS in Production
Always use HTTPS for OAuth callbacks in production:

```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

### 4. Rate Limiting
Apply rate limiting to OAuth endpoints:

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many authentication attempts, please try again later',
});

router.get('/google', authLimiter, passport.authenticate('google', ...));
```

### 5. Token Security
- Store refresh tokens in database with expiration
- Use HTTP-only cookies for web apps when possible
- Never expose tokens in URLs (use POST body or headers)
- Implement token rotation on refresh

### 6. Account Linking Confirmation
For enhanced security, consider asking for password confirmation before linking:

```typescript
// Before linking Google to existing password account
if (existingUser.authProvider === 'local') {
  // Send email notification or require password confirmation
  await sendAccountLinkingEmail(existingUser.email);
}
```

### 7. Error Handling
Don't expose sensitive information in error messages:

```typescript
// Bad
throw new Error('User with email user@example.com already exists');

// Good
throw new Error('Authentication failed. Please try again.');
```

---

## Troubleshooting

### Issue: "Redirect URI mismatch"
**Cause**: Callback URL doesn't match Google Cloud Console configuration

**Solution**:
1. Check exact URL in Google Cloud Console under Credentials
2. Ensure it matches `GOOGLE_CALLBACK_URL` in `.env`
3. URLs must match exactly (including http/https, port, path)

### Issue: "Access blocked: This app's request is invalid"
**Cause**: OAuth consent screen not configured or missing scopes

**Solution**:
1. Configure OAuth consent screen in Google Cloud Console
2. Add required scopes: `userinfo.email`, `userinfo.profile`
3. Verify app is not in production mode while in development

### Issue: "Email not verified by Google"
**Cause**: Google account email is not verified

**Solution**:
- User must verify their email with Google first
- Or remove the email verification check (not recommended)

### Issue: Duplicate user created on second login
**Cause**: User lookup by Google ID or email failing

**Solution**:
- Check database indexes are created
- Verify `getUserByGoogleId` and `getUserByEmail` methods
- Check case-sensitivity on email comparison

### Issue: JWT token not working after Google login
**Cause**: User object structure mismatch in JWT payload

**Solution**:
- Ensure JWT payload contains required fields: `userId`, `email`, `role`
- Verify token generation in `googleCallback` controller

### Issue: "Cannot read property 'id' of undefined"
**Cause**: req.user not populated by Passport

**Solution**:
- Ensure `passport.initialize()` middleware is added
- Check Google strategy is configured correctly
- Verify callback returns user object with `done(null, user)`

### Issue: CORS error when redirecting from Google
**Cause**: CORS not configured for callback URL

**Solution**:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

### Issue: Tokens not persisting
**Cause**: Frontend not storing tokens properly

**Solution**:
- Check localStorage/cookies are being set
- Verify browser allows third-party cookies
- Use SameSite: 'lax' for cookies in development

---

## Additional Resources

### Documentation
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Documentation](http://www.passportjs.org/)
- [passport-google-oauth20 NPM](https://www.npmjs.com/package/passport-google-oauth20)

### Best Practices
- Always use HTTPS in production
- Keep OAuth credentials secret and rotate regularly
- Implement proper error logging
- Monitor authentication failures
- Use short-lived access tokens
- Implement token rotation
- Add multi-factor authentication for sensitive operations

### Future Enhancements
1. **Add More OAuth Providers**: Facebook, GitHub, Microsoft
2. **Account Unlinking**: Allow users to disconnect Google account
3. **MFA Support**: Add two-factor authentication
4. **Social Login UI**: Pre-built login buttons with branding
5. **Analytics**: Track OAuth usage and conversion rates
6. **Admin Dashboard**: View users by auth provider

---

## Summary

This implementation provides:
- Secure Google OAuth 2.0 authentication
- Seamless account linking for existing users
- JWT token generation compatible with existing auth
- Profile picture and name from Google
- Comprehensive error handling
- Production-ready security measures

**Estimated Implementation Time**: 4-5 hours

**Files Modified**: 9 existing files
**Files Created**: 2 new files

For questions or issues, refer to the troubleshooting section or consult the main project documentation.
