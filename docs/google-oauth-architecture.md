# Google OAuth Architecture - Technical Deep Dive

## Table of Contents
1. [Top-Level Overview](#top-level-overview)
2. [Architecture Components](#architecture-components)
3. [Authentication Flows](#authentication-flows)
4. [Sequence Diagrams](#sequence-diagrams)
5. [Technical Implementation](#technical-implementation)
6. [Security Mechanisms](#security-mechanisms)

---

## Top-Level Overview

This Node.js application implements **OAuth 2.0 authentication** using **Google as the identity provider** and **Passport.js** as the authentication middleware. The system supports both traditional email/password authentication and Google OAuth, with seamless account linking capabilities.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATION                          │
│                    (Web Browser / Mobile App)                       │
└────────────────┬──────────────────────────────────┬─────────────────┘
                 │                                  │
                 │ ① Initiate Login                │ ⑦ Receive Tokens
                 │                                  │
                 ▼                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                         boilerplate API SERVER                             │
│                       (Node.js + Express)                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Routes Layer         ② Route Request                       │   │
│  │  [auth.route.ts]      ↓                                      │   │
│  │                   Passport.js                                │   │
│  │  ③ Redirect to Google OAuth                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────┬──────────────────────────────────┬─────────────────┘
                 │                                  │
                 │ ③ Redirect                       │ ⑤ Return Profile
                 │                                  │
                 ▼                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE OAUTH 2.0 SERVER                          │
│                  (accounts.google.com)                              │
│                                                                     │
│  • User Authentication                                              │
│  • Consent Screen                                                   │
│  • Token Generation                                                 │
│  ④ User Authenticates                                               │
└─────────────────────────────────────────────────────────────────────┘

After successful Google auth:

┌─────────────────────────────────────────────────────────────────────┐
│                         boilerplate API SERVER                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Passport Strategy    ⑥ Verify & Process                    │   │
│  │  [passport.config.ts] ↓                                      │   │
│  │                   Auth Service                               │   │
│  │  [auth.service.ts]    ↓                                      │   │
│  │                   User Service                               │   │
│  │  [user.service.ts]    ↓                                      │   │
│  │                   MongoDB Database                           │   │
│  │                       ↓                                      │   │
│  │                   Generate JWT Tokens                        │   │
│  │  [token.service.ts]   ↓                                      │   │
│  │                   Return to Client                           │   │
│  │  [auth.controller.ts] ⑦                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Components

### 1. **Routes Layer** ([auth.route.ts](../src/routes/auth.route.ts))
- **Entry Point**: Defines OAuth endpoints
- **Endpoints**:
  - `GET /api/auth/google` - Initiates OAuth flow
  - `GET /api/auth/google/callback` - Handles OAuth callback
  - `POST /api/auth/google/mobile` - Mobile token verification

### 2. **Passport Configuration** ([passport.config.ts](../src/config/passport.config.ts))
- **Google Strategy**: Configures OAuth 2.0 parameters
- **JWT Strategy**: Validates access tokens for protected routes
- **Middleware**: Authenticates requests

### 3. **Controllers** ([auth.controller.ts](../src/controllers/auth.controller.ts))
- **googleCallback**: Processes successful OAuth authentication
- **googleMobileAuth**: Verifies mobile app Google ID tokens
- **Response Formatting**: Returns user data and JWT tokens

### 4. **Authentication Service** ([auth.service.ts](../src/services/auth.service.ts))
- **authenticateGoogleUser**: Core OAuth logic
- **User Lookup**: Finds existing users or creates new ones
- **Account Linking**: Connects Google accounts to existing email/password accounts

### 5. **User Service** ([user.service.ts](../src/services/user.service.ts))
- **Database Operations**: CRUD operations for users
- **getUserByGoogleId**: Looks up user by Google ID
- **createGoogleUser**: Creates new user from Google profile
- **linkGoogleAccount**: Links Google to existing account

### 6. **Token Service** ([token.service.ts](../src/services/token.service.ts))
- **JWT Generation**: Creates access and refresh tokens
- **Token Verification**: Validates JWT signatures
- **Token Storage**: Manages refresh tokens in database

### 7. **Data Models** ([user.model.ts](../src/models/user.model.ts))
- **User Schema**: MongoDB schema with Google OAuth fields
- **Fields**: `googleId`, `profilePicture`, `authProvider`

---

## Authentication Flows

### Flow 1: Web OAuth Flow (Browser)

```
┌──────────┐                                                    ┌──────────┐
│          │                                                    │          │
│  Client  │                                                    │  Google  │
│ Browser  │                                                    │  OAuth   │
│          │                                                    │  Server  │
└────┬─────┘                                                    └────┬─────┘
     │                                                               │
     │  ① GET /api/auth/google                                       │
     ├────────────────────────────────────────►                      │
     │         [boilerplate API Server]                              │
     │                                                               │
     │  ② 302 Redirect to Google                                     │
     │    (with client_id, redirect_uri, scope)                      │
     ├───────────────────────────────────────────────────────────►   │
     │                                                               │
     │  ③ Google Login Page (User authenticates)                     │
     │ ◄─────────────────────────────────────────────────────────┤ │
     │                                                               │
     │  ④ User grants permissions                                   │
     ├──────────────────────────────────────────────────────────►  │
     │                                                               │
     │  ⑤ 302 Redirect to callback URL                              │
     │    (with authorization code)                                 │
     │ ◄─────────────────────────────────────────────────────────┤ │
     │                                                               │
     │  ⑥ GET /api/auth/google/callback?code=...                   │
     ├────────────────────────────────────────►                     │
     │         [boilerplate API Server]                │                   │
     │                                          │                   │
     │         [Passport exchanges code         │                   │
     │          for access token]               │                   │
     │                                          ├──────────────────►│
     │                                          │  Exchange code    │
     │                                          │  for tokens       │
     │                                          │ ◄─────────────────┤
     │                                          │  Returns tokens   │
     │         [Passport fetches profile]       │  & user profile   │
     │                                          │                   │
     │  ⑦ Verify email, find/create user        │                   │
     │  ⑧ Generate JWT tokens                   │                   │
     │  ⑨ 200 OK + JSON response                │                   │
     │ ◄────────────────────────────────────────                    │
     │  {                                                            │
     │    "user": {...},                                             │
     │    "tokens": {                                                │
     │      "accessToken": "...",                                    │
     │      "refreshToken": "..."                                    │
     │    }                                                          │
     │  }                                                            │
     │                                                               │
```

### Flow 2: Mobile OAuth Flow (Android/iOS)

```
┌──────────┐                                                    ┌──────────┐
│          │                                                    │          │
│  Mobile  │                                                    │  Google  │
│   App    │                                                    │   SDK    │
│          │                                                    │          │
└────┬─────┘                                                    └────┬─────┘
     │                                                               │
     │  ① Google Sign-In SDK initiated                              │
     ├──────────────────────────────────────────────────────────►  │
     │                                                               │
     │  ② User authenticates with Google                            │
     │ ◄─────────────────────────────────────────────────────────┤ │
     │                                                               │
     │  ③ Returns ID Token (JWT from Google)                        │
     │ ◄─────────────────────────────────────────────────────────┤ │
     │    idToken: "eyJhbGciOiJSUzI1NiIs..."                        │
     │                                                               │
     │  ④ POST /api/auth/google/mobile                              │
     │    Body: { "idToken": "..." }                                │
     ├────────────────────────────────────────►                     │
     │         [boilerplate API Server]                │                   │
     │                                          │                   │
     │  ⑤ Verify ID Token with Google           │                   │
     │    (OAuth2Client.verifyIdToken)          ├──────────────────►│
     │                                          │  Verify signature │
     │                                          │ ◄─────────────────┤
     │                                          │  Token valid +    │
     │  ⑥ Extract user data from token          │  user payload     │
     │  ⑦ Find/create user in database          │                   │
     │  ⑧ Generate JWT tokens                   │                   │
     │  ⑨ 200 OK + JSON response                │                   │
     │ ◄────────────────────────────────────────                    │
     │  {                                                            │
     │    "user": {...},                                             │
     │    "tokens": {                                                │
     │      "accessToken": "...",                                    │
     │      "refreshToken": "..."                                    │
     │    }                                                          │
     │  }                                                            │
     │                                                               │
```

---

## Sequence Diagrams

### Complete OAuth 2.0 Flow with Passport.js

```
User          Browser         boilerplate API                 Passport.js           Google OAuth       MongoDB
 │               │                │                         │                      │               │
 │ Click Login   │                │                         │                      │               │
 ├──────────────►│                │                         │                      │               │
 │               │                │                         │                      │               │
 │               │ GET /api/auth/google                     │                      │               │
 │               ├───────────────►│                         │                      │               │
 │               │                │                         │                      │               │
 │               │                │ passport.authenticate('google')                │               │
 │               │                ├────────────────────────►│                      │               │
 │               │                │                         │                      │               │
 │               │                │                         │ Build OAuth URL      │               │
 │               │                │                         │ (client_id, scopes)  │               │
 │               │                │                         │                      │               │
 │               │                │ 302 Redirect            │                      │               │
 │               │ ◄──────────────┴─────────────────────────┤                      │               │
 │               │                                           │                      │               │
 │               │ Redirect to accounts.google.com           │                      │               │
 │               ├───────────────────────────────────────────┼─────────────────────►│               │
 │               │                                           │                      │               │
 │               │ Google Login Page                         │                      │               │
 │ ◄─────────────┤                                           │                      │               │
 │               │                                           │                      │               │
 │ Enter         │                                           │                      │               │
 │ Credentials   │                                           │                      │               │
 ├──────────────►│                                           │                      │               │
 │               │ POST credentials                          │                      │               │
 │               ├───────────────────────────────────────────┼─────────────────────►│               │
 │               │                                           │                      │               │
 │               │ Consent Screen                            │         Validate     │               │
 │ ◄─────────────┤                                           │         user         │               │
 │               │                                           │                      │               │
 │ Grant         │                                           │                      │               │
 │ Permissions   │                                           │                      │               │
 ├──────────────►│                                           │                      │               │
 │               │ Approve                                   │                      │               │
 │               ├───────────────────────────────────────────┼─────────────────────►│               │
 │               │                                           │                      │               │
 │               │ 302 Redirect to callback                  │   Generate auth      │               │
 │               │ /api/auth/google/callback?code=xyz        │   code               │               │
 │               │ ◄─────────────────────────────────────────┼──────────────────────┤               │
 │               │                                           │                      │               │
 │               │ GET /api/auth/google/callback?code=xyz    │                      │               │
 │               ├───────────────────────────────────────────►│                      │               │
 │               │                                           │                      │               │
 │               │                │ passport.authenticate('google')                 │               │
 │               │                ├────────────────────────►│                       │               │
 │               │                │                         │                       │               │
 │               │                │                         │ Exchange code         │               │
 │               │                │                         │ for access token      │               │
 │               │                │                         ├──────────────────────►│               │
 │               │                │                         │                       │               │
 │               │                │                         │ Return access token   │               │
 │               │                │                         │ + refresh token       │               │
 │               │                │                         │◄──────────────────────┤               │
 │               │                │                         │                       │               │
 │               │                │                         │ Fetch user profile    │               │
 │               │                │                         │ (email, name, photo)  │               │
 │               │                │                         ├──────────────────────►│               │
 │               │                │                         │                       │               │
 │               │                │                         │ Return profile        │               │
 │               │                │                         │◄──────────────────────┤               │
 │               │                │                         │                       │               │
 │               │                │                         │ Verify callback       │               │
 │               │                │                         │ (passport.config.ts)  │               │
 │               │                │                         │ - Check email verified│               │
 │               │                │                         │ - Extract profile data│               │
 │               │                │                         │                       │               │
 │               │                │ Call authenticateGoogleUser()                   │               │
 │               │                ├─────────────────────────┼───────────────────────┼──────────────►│
 │               │                │                         │                       │  Find user by │
 │               │                │                         │                       │  googleId     │
 │               │                │                         │                       │               │
 │               │                │                         │                       │  If not found:│
 │               │                │                         │                       │  Find by email│
 │               │                │                         │                       │               │
 │               │                │                         │                       │  If found:    │
 │               │                │                         │                       │  Link Google  │
 │               │                │                         │                       │  account      │
 │               │                │                         │                       │               │
 │               │                │                         │                       │  If not found:│
 │               │                │                         │                       │  Create new   │
 │               │                │                         │                       │  user         │
 │               │                │                         │                       │               │
 │               │                │                         │                User document          │
 │               │                │ ◄───────────────────────┼───────────────────────┼───────────────┤
 │               │                │                         │                       │               │
 │               │                │ Set req.user = user     │                       │               │
 │               │                │                         │                       │               │
 │               │                │ Call googleCallback()   │                       │               │
 │               │                │ (controller)            │                       │               │
 │               │                │                         │                       │               │
 │               │                │ Generate JWT tokens     │                       │               │
 │               │                │ - accessToken (15 min)  │                       │               │
 │               │                │ - refreshToken (7 days) │                       │               │
 │               │                │                         │                       │               │
 │               │                │ Save refresh token      │                       │               │
 │               │                ├─────────────────────────┼───────────────────────┼──────────────►│
 │               │                │                         │                       │  Store in     │
 │               │                │                         │                       │  Token model  │
 │               │                │                         │                       │               │
 │               │                │ Return JSON response    │                       │               │
 │               │ ◄──────────────┴─────────────────────────┤                       │               │
 │               │ {                                         │                       │               │
 │               │   "success": true,                        │                       │               │
 │               │   "user": {...},                          │                       │               │
 │               │   "tokens": {                             │                       │               │
 │               │     "accessToken": "...",                 │                       │               │
 │               │     "refreshToken": "..."                 │                       │               │
 │               │   }                                       │                       │               │
 │               │ }                                         │                       │               │
 │ ◄─────────────┤                                           │                       │               │
 │               │                                           │                       │               │
```

---

## Technical Implementation

### 1. Passport Google OAuth Strategy Configuration

**File**: [src/config/passport.config.ts:41-83](../src/config/passport.config.ts#L41-L83)

```typescript
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
            scope: ['profile', 'email'],
        },
        async (
            _accessToken: string,
            _refreshToken: string,
            profile: GoogleProfile,
            done: VerifyCallback
        ) => {
            // Validation and user processing logic
        }
    )
);
```

**Key Parameters**:
- **clientID**: OAuth 2.0 client identifier from Google Console
- **clientSecret**: Secret key for client authentication
- **callbackURL**: Redirect URI registered with Google
- **scope**: Requested permissions (`profile` and `email`)

**Verify Callback**:
1. Validates email is verified by Google
2. Extracts user profile data
3. Calls `authenticateGoogleUser()` to process user
4. Returns user object or error

### 2. Google User Authentication Logic

**File**: [src/services/auth.service.ts:165-202](../src/services/auth.service.ts#L165-L202)

```typescript
export const authenticateGoogleUser = async (googleData: GoogleAuthData): Promise<IUser> => {
    // 1. Try to find user by Google ID
    let user = await userService.getUserByGoogleId(googleData.googleId);

    if (user) {
        // Existing Google user - return immediately
        return user;
    }

    // 2. Try to find user by email (account linking)
    user = await userService.getUserByEmailInternal(googleData.email);

    if (user) {
        // Link Google account to existing user
        user = await userService.linkGoogleAccount(
            user._id.toString(),
            googleData.googleId,
            googleData.profilePicture
        );
        return user;
    }

    // 3. Create new user with Google profile
    user = await userService.createGoogleUser(googleData);
    return user;
};
```

**Three-Step Logic**:
1. **Lookup by googleId**: Fast path for returning users
2. **Lookup by email**: Enables account linking
3. **Create new user**: First-time Google authentication

### 3. OAuth Routes

**File**: [src/routes/auth.route.ts:229-294](../src/routes/auth.route.ts#L229-L294)

```typescript
// Initiate OAuth flow
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

// Handle OAuth callback
router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/login?error=google_auth_failed',
    }),
    asyncHandler(googleCallback)
);
```

**Options**:
- **session: false**: Stateless authentication (JWT-based)
- **failureRedirect**: Error handling for failed authentication

### 4. Controller Response

**File**: [src/controllers/auth.controller.ts:94-135](../src/controllers/auth.controller.ts#L94-L135)

```typescript
export async function googleCallback(request: Request, response: Response): Promise<Response> {
    const user = request.user as unknown as IUser;

    // Generate JWT tokens
    const tokens = generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
    );

    // Store refresh token in database
    const decoded = verifyRefreshToken(tokens.refreshToken);
    await saveRefreshToken(
        tokens.refreshToken,
        user._id.toString(),
        new Date(decoded.exp! * 1000)
    );

    // Return user data and tokens
    return response.status(httpStatus.OK).json({
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
            tokens,
        },
    });
}
```

### 5. Mobile Authentication (Alternative Flow)

**File**: [src/controllers/auth.controller.ts:141-222](../src/controllers/auth.controller.ts#L141-L222)

For mobile apps using Google Sign-In SDK:

```typescript
export async function googleMobileAuth(request: Request, response: Response): Promise<Response> {
    const { idToken } = request.body;

    // Initialize Google OAuth2 client
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Verify the ID token
    const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Extract and process user data
    const googleData = {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || payload.email!,
        profilePicture: payload.picture,
    };

    // Same logic as web OAuth
    const user = await authService.authenticateGoogleUser(googleData);

    // Generate and return JWT tokens
    // ... (similar to web flow)
}
```

**Difference from Web Flow**:
- Client handles OAuth with Google directly
- Server only verifies the ID token
- No redirect-based flow
- Single endpoint: `POST /api/auth/google/mobile`

---

## Security Mechanisms

### 1. Email Verification Check

**Location**: [src/config/passport.config.ts:57-62](../src/config/passport.config.ts#L57-L62)

```typescript
const email = profile.emails?.[0];
if (!email || !email.verified) {
    logger.warn(`Google OAuth failed: Email not verified for ${profile.id}`);
    return done(new Error('Email not verified by Google'), undefined);
}
```

Only users with Google-verified emails can authenticate.

### 2. JWT Token Security

**Access Token** (Short-lived):
- **Expiration**: 15 minutes
- **Purpose**: API authentication
- **Storage**: Client-side (memory/localStorage)
- **Payload**: userId, email, role

**Refresh Token** (Long-lived):
- **Expiration**: 7 days
- **Purpose**: Obtaining new access tokens
- **Storage**: Database + client-side
- **Validation**: Checked against database on use

### 3. HTTPS Enforcement

OAuth requires HTTPS in production:
- Prevents man-in-the-middle attacks
- Protects authorization codes in transit
- Required by Google OAuth policies

### 4. State Management

- **Session: false**: Stateless authentication
- **No cookies**: JWT tokens in Authorization header
- **No CSRF**: Token-based authentication resistant to CSRF

### 5. Token Revocation

**Logout Flow**: [src/services/auth.service.ts:114-132](../src/services/auth.service.ts#L114-L132)

```typescript
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
    // Delete refresh token from database
    const result = await Token.deleteOne({ token: refreshToken });

    if (result.deletedCount === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Refresh token not found');
    }
};
```

Deleting the refresh token prevents future access token generation.

### 6. Unique Constraints

**Database Indexes**: [src/models/user.model.ts:71-72](../src/models/user.model.ts#L71-L72)

```typescript
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 }); // Unique, sparse index
```

- Prevents duplicate Google accounts
- Allows multiple auth methods per email
- Sparse index: only enforces uniqueness when googleId exists

---

## Data Flow Summary

### Request → Response Journey

```
1. Client Request
   ↓
2. Express Router (auth.route.ts)
   ↓
3. Passport Middleware
   ├─→ Google OAuth Strategy
   │   ├─→ Redirect to Google
   │   ├─→ User authenticates
   │   ├─→ Google returns profile
   │   └─→ Verify callback executes
   │
   └─→ Calls next middleware
   ↓
4. Auth Service (auth.service.ts)
   ├─→ Authenticate Google User
   │   ├─→ Find by googleId
   │   ├─→ Find by email
   │   └─→ Create new user
   │
   └─→ Returns user object
   ↓
5. Controller (auth.controller.ts)
   ├─→ Generate JWT tokens
   ├─→ Save refresh token
   └─→ Format response
   ↓
6. Client receives:
   {
     "user": {...},
     "tokens": {
       "accessToken": "...",
       "refreshToken": "..."
     }
   }
```

### Database Operations

```
MongoDB Collections:

┌──────────────────────────────────┐
│         users                    │
├──────────────────────────────────┤
│ _id: ObjectId                    │
│ name: string                     │
│ email: string (unique)           │
│ password?: string (hashed)       │
│ role: 'user'|'admin'|'therapist' │
│ googleId?: string (unique)       │◄─── Google OAuth ID
│ profilePicture?: string          │◄─── Google profile photo
│ authProvider: 'local'|'google'   │◄─── Authentication method
│ createdAt: Date                  │
│ updatedAt: Date                  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│         tokens                   │
├──────────────────────────────────┤
│ _id: ObjectId                    │
│ token: string (JWT)              │◄─── Refresh token
│ userId: ObjectId (ref: users)    │
│ expiresAt: Date                  │
│ createdAt: Date                  │
└──────────────────────────────────┘
```

---

## Environment Configuration

**Required Variables**:

```env
# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# JWT Secrets
JWT_ACCESS_SECRET=<random-secret-key>
JWT_REFRESH_SECRET=<random-secret-key>

# JWT Configuration
JWT_ISSUER=boilerplate-api
JWT_AUDIENCE=boilerplate-client
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

---

## API Reference

### Web OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiates Google OAuth flow |
| GET | `/api/auth/google/callback` | Handles OAuth callback |

### Mobile OAuth Endpoint

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/auth/google/mobile` | Verifies Google ID token | `{ "idToken": "..." }` |

### Response Format

```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "profilePicture": "https://lh3.googleusercontent.com/...",
      "authProvider": "google"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Email not verified by Google` | User's Google email unverified | User must verify email with Google |
| `Redirect URI mismatch` | Callback URL mismatch | Update Google Console or `.env` |
| `Invalid Google ID token` | Token expired/invalid | Regenerate token from client |
| `User not found` | Database inconsistency | Check database connectivity |

### Error Flow

```
Error in Passport Strategy
    ↓
done(error, undefined) called
    ↓
Passport middleware catches error
    ↓
Returns 401 Unauthorized or redirects to failureRedirect
    ↓
Client receives error response
```

---

## Performance Considerations

### Database Queries

1. **First lookup by googleId** (indexed) - O(1)
2. **Fallback to email lookup** (indexed) - O(1)
3. **Token storage** - Single insert operation

### Caching Opportunities

- Google public keys (for ID token verification)
- User profile data (after authentication)
- JWT validation results

### Optimization Tips

- Use connection pooling for MongoDB
- Implement rate limiting on OAuth endpoints
- Cache Google OAuth configuration
- Use Redis for token blacklisting (logout)

---

## Testing Checklist

- [ ] New user signup via Google
- [ ] Returning Google user login
- [ ] Account linking (existing email/password → Google)
- [ ] Email verification rejection
- [ ] Invalid callback URL handling
- [ ] Token generation and validation
- [ ] Refresh token flow
- [ ] Logout (token revocation)
- [ ] Mobile ID token verification
- [ ] Error scenarios (network failure, invalid tokens)

---

## Related Documentation

- [Google OAuth Setup Guide](./google-oauth-setup-guide.md) - Configuration and deployment
- [Google OAuth Implementation Guide](./google-oauth-implementation.md) - Step-by-step implementation

---

**Last Updated**: 2025-12-17
**Version**: 1.0.0
