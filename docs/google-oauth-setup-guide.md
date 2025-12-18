# Google OAuth Setup Guide - Quick Start

## Implementation Complete! ✅

Google OAuth authentication has been successfully implemented in your boilerplate application. Follow these steps to get it running.

---

## What Was Implemented

### New Features
- **Google OAuth 2.0 Login/Signup** - Users can authenticate using their Google accounts
- **Account Linking** - Existing email/password users can link their Google accounts
- **Profile Pictures** - Automatic profile photo from Google
- **Seamless Integration** - Works with existing JWT token system

### Files Modified
1. ✅ User Model - Added `googleId`, `profilePicture`, `authProvider` fields
2. ✅ User Service - Added Google user methods
3. ✅ Auth Service - Added Google authentication logic
4. ✅ Token Service - Added `saveRefreshToken` method
5. ✅ Passport Config - Added Google OAuth strategy
6. ✅ Auth Controller - Added `googleCallback` handler
7. ✅ Auth Routes - Added `/api/auth/google` and `/api/auth/google/callback` endpoints
8. ✅ Environment Config - Added Google OAuth variables

### Files Created
1. ✅ `src/types/google.types.ts` - Google OAuth type definitions
2. ✅ `docs/google-oauth-implementation.md` - Detailed implementation guide
3. ✅ `docs/google-oauth-setup-guide.md` - This setup guide

### Dependencies Installed
- ✅ `passport-google-oauth20` (v2.0.0)
- ✅ `@types/passport-google-oauth20` (v2.0.17)

---

## Setup Steps

### Step 1: Configure Google Cloud Console

#### 1.1 Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if not already done:
   - User type: External
   - App name: boilerplate
   - Support email: your-email@example.com
   - Scopes: `userinfo.email`, `userinfo.profile`

#### 1.2 Create Web Application Credentials
1. Application type: **Web application**
2. Name: boilerplate Web Client
3. **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
4. Click **Create**
5. **Copy your Client ID and Client Secret** (you'll need these next)

### Step 2: Update Environment Variables

Add these to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-client-id-from-google-console
GOOGLE_CLIENT_SECRET=your-actual-client-secret-from-google-console
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

**Important:** Replace `your-actual-client-id-from-google-console` and `your-actual-client-secret-from-google-console` with the actual values from Step 1.

### Step 3: Build and Start the Server

```bash
# Build the project
npm run build

# Start the server (development)
npm run start:dev

# OR start with PM2 (production)
npm run start:pm2
```

---

## Testing the Implementation

### Method 1: Using a Browser

1. **Start your server** (make sure it's running on port 3000)

2. **Navigate to the Google OAuth endpoint:**
   ```
   http://localhost:3000/api/auth/google
   ```

3. **You'll be redirected to Google login page**
   - Select your Google account
   - Grant permissions (email and profile)

4. **After authentication, you'll be redirected back to:**
   ```
   http://localhost:3000/api/auth/google/callback
   ```

5. **You should receive a JSON response with:**
   ```json
   {
     "success": true,
     "message": "Google authentication successful",
     "data": {
       "user": {
         "id": "...",
         "name": "Your Name",
         "email": "your@email.com",
         "role": "user",
         "profilePicture": "https://...",
         "authProvider": "google"
       },
       "tokens": {
         "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
         "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
       }
     }
   }
   ```

6. **Copy the `accessToken`** and use it to access protected routes:
   ```bash
   curl -X GET http://localhost:3000/api/users/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

### Method 2: Using Swagger UI

1. **Navigate to Swagger documentation:**
   ```
   http://localhost:3000/api-docs
   ```

2. **Find the Auth section** and look for:
   - `GET /api/auth/google` - Initiate Google OAuth
   - `GET /api/auth/google/callback` - Callback endpoint

3. **Click "Try it out"** on `/api/auth/google`

### Method 3: Frontend Integration Example

Create a simple HTML page to test:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Google OAuth</title>
</head>
<body>
    <h1>Test Google Sign In</h1>
    <button onclick="loginWithGoogle()">Sign in with Google</button>

    <script>
        function loginWithGoogle() {
            window.location.href = 'http://localhost:3000/api/auth/google';
        }
    </script>
</body>
</html>
```

---

## API Endpoints Reference

### New Endpoints

#### 1. Initiate Google OAuth
```
GET /api/auth/google
```
- Redirects to Google login page
- No authentication required

#### 2. Google OAuth Callback
```
GET /api/auth/google/callback
```
- Handles Google's response after user authentication
- Creates/updates user in database
- Returns JWT tokens

**Response Format:**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "user|admin|therapist",
      "profilePicture": "string (URL)",
      "authProvider": "google"
    },
    "tokens": {
      "accessToken": "string (JWT)",
      "refreshToken": "string (JWT)"
    }
  }
}
```

### Existing Endpoints (Still Work!)

All existing authentication endpoints continue to work:
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Revoke refresh token
- `POST /api/auth/change-password` - Change password

---

## User Scenarios

### Scenario 1: New User Signs Up with Google
1. User clicks "Sign in with Google"
2. Redirected to Google, selects account
3. **New user created** in database with:
   - Email from Google
   - Name from Google
   - Profile picture from Google
   - `authProvider: 'google'`
   - `role: 'user'` (default)
   - No password (not needed for Google users)
4. JWT tokens returned
5. User is logged in ✅

### Scenario 2: Existing Email/Password User Links Google
1. User previously registered with email: `user@example.com`
2. User clicks "Sign in with Google"
3. Selects Google account with same email: `user@example.com`
4. **System links Google account** to existing user:
   - Adds `googleId` to user record
   - Updates `profilePicture` from Google
   - Keeps existing password (user can still use email/password login)
5. JWT tokens returned
6. User can now login with either method ✅

### Scenario 3: Returning Google User
1. User already signed up with Google previously
2. Clicks "Sign in with Google"
3. **System finds user** by `googleId`
4. JWT tokens returned immediately
5. User is logged in ✅

---

## Database Changes

The User collection now has these additional fields:

```typescript
{
  name: string,
  email: string,
  password?: string,              // Optional (not required for Google users)
  role: 'admin' | 'user' | 'therapist',
  googleId?: string,              // NEW: Google account ID
  profilePicture?: string,        // NEW: Profile photo URL
  authProvider: 'local' | 'google', // NEW: How user signed up
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes Created:**
- `email` (unique)
- `googleId` (unique, sparse)
- `role`

---

## Security Features

✅ **Email Verification** - Only verified Google emails accepted
✅ **HTTPS Enforcement** - Use HTTPS in production
✅ **JWT Tokens** - Secure token-based authentication
✅ **Token Expiration** - Access token: 15 min, Refresh token: 7 days
✅ **Token Storage** - Refresh tokens stored in database
✅ **Rate Limiting** - Existing rate limiting applies
✅ **Error Handling** - Comprehensive error messages

---

## Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution:**
- Check that the callback URL in Google Console exactly matches `GOOGLE_CALLBACK_URL` in `.env`
- URLs must include protocol (http/https), domain, port, and path

### Issue: "Email not verified by Google"
**Solution:**
- User must verify their email with Google first
- Check Google account settings

### Issue: Environment variables not loading
**Solution:**
```bash
# Check .env file exists
cat .env | grep GOOGLE

# Restart server after adding env variables
npm run start:dev
```

### Issue: "Cannot find module 'passport-google-oauth20'"
**Solution:**
```bash
# Reinstall dependencies
npm install
```

### Issue: TypeScript build errors
**Solution:**
```bash
# Clean and rebuild
rm -rf dist
npm run build
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Update `GOOGLE_CALLBACK_URL` to production domain
- [ ] Add production callback URL to Google Console
- [ ] Use HTTPS for all OAuth endpoints
- [ ] Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Enable Google OAuth app for production (not in testing mode)
- [ ] Test OAuth flow end-to-end on production
- [ ] Monitor logs for authentication failures

---

## Next Steps

### Optional Enhancements

1. **Frontend UI**
   - Add "Sign in with Google" button to login page
   - Display profile picture in user dashboard

2. **Account Management**
   - Allow users to unlink Google account
   - Show which auth method was used in profile

3. **Multiple OAuth Providers**
   - Add Facebook login
   - Add GitHub login
   - Add Microsoft/Azure AD login

4. **Enhanced Security**
   - Add 2FA for sensitive operations
   - Implement account linking confirmation
   - Add login notification emails

---

## Support

For detailed implementation documentation, see:
- [google-oauth-implementation.md](./google-oauth-implementation.md) - Full implementation guide

For questions or issues:
- Check the troubleshooting section above
- Review implementation documentation
- Check server logs: `npm run logs:pm2` or console output

---

**Implementation completed successfully!** 🎉

You can now allow users to sign up and log in using their Google accounts.
