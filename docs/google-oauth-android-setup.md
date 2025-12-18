# Google OAuth Setup for Android App

## Overview

This guide explains how to integrate Google Sign-In with your Android application and connect it to your boilerplate backend API.

**Architecture:**
```
Android App → Google Sign-In SDK → Google Auth → Backend API → JWT Tokens
```

---

## Table of Contents
1. [Google Cloud Console Setup](#google-cloud-console-setup)
2. [Backend Configuration](#backend-configuration)
3. [Android App Implementation](#android-app-implementation)
4. [API Integration](#api-integration)
5. [Testing](#testing)
6. [Security Best Practices](#security-best-practices)

---

## Google Cloud Console Setup

### Step 1: Create Android OAuth Credentials

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**

2. **Select your project** (same one you created for web OAuth)

3. **Navigate to:** APIs & Services → Credentials

4. **Click "Create Credentials"** → OAuth 2.0 Client ID

5. **Select Application Type:** Android

6. **Fill in the details:**
   - **Name:** boilerplate Android Client
   - **Package name:** Your Android app package (e.g., `com.yourcompany.boilerplate`)
   - **SHA-1 certificate fingerprint:** Get this from your Android app

### Step 2: Get SHA-1 Certificate Fingerprint

#### For Debug Build (Development):

```bash
# Navigate to your Android project directory
cd ~/your-android-project

# Run this command
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### For Release Build (Production):

```bash
# Replace 'your-release-key.jks' with your actual keystore file
keytool -list -v -keystore /path/to/your-release-key.jks -alias your-key-alias
```

**Copy the SHA-1 fingerprint** and paste it in Google Cloud Console.

### Step 3: Get Your Web Client ID

You'll also need your **Web Client ID** (the one you created earlier for the backend):

1. In Google Cloud Console → Credentials
2. Find your **Web application** OAuth 2.0 Client ID
3. Copy the **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

**Important:** You need BOTH the Android Client ID AND Web Client ID!

---

## Backend Configuration

### Update Environment Variables

Your backend is already configured! The existing setup works for Android apps. Just make sure your `.env` has:

```env
# These are already set from previous setup
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-web-client-secret
GOOGLE_CALLBACK_URL=http://your-backend-url/api/auth/google/callback
```

### Add New Endpoint for Mobile Token Verification

Create a new endpoint specifically for mobile apps that accepts Google ID tokens:

#### 1. Create Mobile Auth Controller

**File:** `src/controllers/auth.controller.ts`

Add this new function:

```typescript
import { OAuth2Client } from 'google-auth-library';

/**
 * Google Sign-In for Android/iOS
 * Verifies Google ID token and returns JWT tokens
 */
export async function googleMobileAuth(request: Request, response: Response): Promise<Response> {
    const { idToken } = request.body;

    if (!idToken) {
        return response.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Google ID token is required',
        });
    }

    try {
        // Initialize Google OAuth2 client
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Verify the ID token
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email_verified) {
            return response.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Email not verified by Google',
            });
        }

        // Extract user data from Google token
        const googleData = {
            googleId: payload.sub,
            email: payload.email!,
            name: payload.name || payload.email!,
            profilePicture: payload.picture,
        };

        // Find or create user (same logic as web OAuth)
        const user = await authService.authenticateGoogleUser(googleData);

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
    } catch (error) {
        logger.error('Google mobile auth error:', error);
        return response.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid Google ID token',
        });
    }
}
```

#### 2. Install Google Auth Library

```bash
npm install google-auth-library
npm install --save-dev @types/google-auth-library
```

#### 3. Add Route for Mobile Auth

**File:** `src/routes/auth.route.ts`

Add this route:

```typescript
import { googleMobileAuth } from "../controllers/auth.controller";

/**
 * @swagger
 * /api/auth/google/mobile:
 *   post:
 *     summary: Google Sign-In for Mobile (Android/iOS)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from mobile app
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
 *                     tokens:
 *                       type: object
 *       400:
 *         description: Missing ID token
 *       401:
 *         description: Invalid ID token
 */
router.post('/google/mobile', asyncHandler(googleMobileAuth));
```

---

## Android App Implementation

### Step 1: Add Dependencies

**File:** `app/build.gradle`

```gradle
dependencies {
    // Google Sign-In SDK
    implementation 'com.google.android.gms:play-services-auth:20.7.0'

    // For making API calls
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'

    // Coroutines for async operations
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

    // Optional: For secure token storage
    implementation 'androidx.security:security-crypto:1.1.0-alpha06'
}
```

### Step 2: Configure Google Sign-In

**File:** `app/src/main/res/values/strings.xml`

```xml
<resources>
    <string name="app_name">boilerplate</string>

    <!-- Your Web Client ID from Google Cloud Console -->
    <string name="web_client_id">YOUR_WEB_CLIENT_ID.apps.googleusercontent.com</string>

    <!-- Your Backend API URL -->
    <string name="api_base_url">https://your-backend-url.com</string>
    <!-- For local development: http://10.0.2.2:3000 (Android emulator) -->
    <!-- For physical device: http://your-computer-ip:3000 -->
</resources>
```

### Step 3: Create API Service Interface

**File:** `app/src/main/java/com/yourcompany/boilerplate/api/AuthApiService.kt`

```kotlin
package com.yourcompany.boilerplate.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

data class GoogleMobileAuthRequest(
    val idToken: String
)

data class GoogleMobileAuthResponse(
    val success: Boolean,
    val message: String,
    val data: AuthData?
)

data class AuthData(
    val user: User,
    val tokens: Tokens
)

data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val profilePicture: String?,
    val authProvider: String
)

data class Tokens(
    val accessToken: String,
    val refreshToken: String
)

interface AuthApiService {
    @POST("/api/auth/google/mobile")
    suspend fun googleMobileAuth(
        @Body request: GoogleMobileAuthRequest
    ): Response<GoogleMobileAuthResponse>
}
```

### Step 4: Create Retrofit Instance

**File:** `app/src/main/java/com/yourcompany/boilerplate/api/RetrofitClient.kt`

```kotlin
package com.yourcompany.boilerplate.api

import android.content.Context
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private var retrofit: Retrofit? = null

    fun getInstance(context: Context): Retrofit {
        if (retrofit == null) {
            val baseUrl = context.getString(R.string.api_base_url)

            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!
    }

    fun getAuthService(context: Context): AuthApiService {
        return getInstance(context).create(AuthApiService::class.java)
    }
}
```

### Step 5: Implement Google Sign-In

**File:** `app/src/main/java/com/yourcompany/boilerplate/auth/GoogleSignInManager.kt`

```kotlin
package com.yourcompany.boilerplate.auth

import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import com.yourcompany.boilerplate.R
import kotlinx.coroutines.tasks.await

class GoogleSignInManager(private val context: Context) {

    private val googleSignInClient: GoogleSignInClient

    init {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(context.getString(R.string.web_client_id))
            .requestEmail()
            .requestProfile()
            .build()

        googleSignInClient = GoogleSignIn.getClient(context, gso)
    }

    fun getSignInIntent(): Intent {
        return googleSignInClient.signInIntent
    }

    fun handleSignInResult(data: Intent?): GoogleSignInAccount? {
        val task = GoogleSignIn.getSignedInAccountFromIntent(data)
        return try {
            task.getResult(ApiException::class.java)
        } catch (e: ApiException) {
            null
        }
    }

    suspend fun signOut() {
        try {
            googleSignInClient.signOut().await()
        } catch (e: Exception) {
            // Handle error
        }
    }

    fun getLastSignedInAccount(): GoogleSignInAccount? {
        return GoogleSignIn.getLastSignedInAccount(context)
    }
}
```

### Step 6: Create Login Activity

**File:** `app/src/main/java/com/yourcompany/boilerplate/ui/LoginActivity.kt`

```kotlin
package com.yourcompany.boilerplate.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.yourcompany.boilerplate.R
import com.yourcompany.boilerplate.api.GoogleMobileAuthRequest
import com.yourcompany.boilerplate.api.RetrofitClient
import com.yourcompany.boilerplate.auth.GoogleSignInManager
import com.yourcompany.boilerplate.databinding.ActivityLoginBinding
import com.yourcompany.boilerplate.utils.TokenManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var googleSignInManager: GoogleSignInManager
    private lateinit var tokenManager: TokenManager

    private val signInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val account = googleSignInManager.handleSignInResult(result.data)
        if (account != null) {
            handleGoogleSignInSuccess(account)
        } else {
            Toast.makeText(this, "Google Sign-In failed", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        googleSignInManager = GoogleSignInManager(this)
        tokenManager = TokenManager(this)

        // Check if user is already signed in
        if (tokenManager.getAccessToken() != null) {
            navigateToMain()
            return
        }

        setupUI()
    }

    private fun setupUI() {
        binding.googleSignInButton.setOnClickListener {
            signInWithGoogle()
        }
    }

    private fun signInWithGoogle() {
        val signInIntent = googleSignInManager.getSignInIntent()
        signInLauncher.launch(signInIntent)
    }

    private fun handleGoogleSignInSuccess(account: GoogleSignInAccount) {
        val idToken = account.idToken

        if (idToken == null) {
            Toast.makeText(this, "Failed to get ID token", Toast.LENGTH_SHORT).show()
            return
        }

        // Show loading
        binding.progressBar.visibility = android.view.View.VISIBLE
        binding.googleSignInButton.isEnabled = false

        // Send token to backend
        lifecycleScope.launch {
            try {
                val authService = RetrofitClient.getAuthService(this@LoginActivity)
                val request = GoogleMobileAuthRequest(idToken)
                val response = authService.googleMobileAuth(request)

                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data

                    // Save tokens
                    data?.tokens?.let { tokens ->
                        tokenManager.saveAccessToken(tokens.accessToken)
                        tokenManager.saveRefreshToken(tokens.refreshToken)
                    }

                    // Save user data
                    data?.user?.let { user ->
                        tokenManager.saveUserData(user)
                    }

                    Toast.makeText(
                        this@LoginActivity,
                        "Welcome ${data?.user?.name}!",
                        Toast.LENGTH_SHORT
                    ).show()

                    navigateToMain()
                } else {
                    Toast.makeText(
                        this@LoginActivity,
                        "Authentication failed: ${response.body()?.message}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    this@LoginActivity,
                    "Network error: ${e.message}",
                    Toast.LENGTH_SHORT
                ).show()
            } finally {
                binding.progressBar.visibility = android.view.View.GONE
                binding.googleSignInButton.isEnabled = true
            }
        }
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}
```

### Step 7: Create Token Manager for Secure Storage

**File:** `app/src/main/java/com/yourcompany/boilerplate/utils/TokenManager.kt`

```kotlin
package com.yourcompany.boilerplate.utils

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.yourcompany.boilerplate.api.User

class TokenManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "boilerplate_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val gson = Gson()

    fun saveAccessToken(token: String) {
        sharedPreferences.edit().putString(KEY_ACCESS_TOKEN, token).apply()
    }

    fun getAccessToken(): String? {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }

    fun saveRefreshToken(token: String) {
        sharedPreferences.edit().putString(KEY_REFRESH_TOKEN, token).apply()
    }

    fun getRefreshToken(): String? {
        return sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
    }

    fun saveUserData(user: User) {
        val userJson = gson.toJson(user)
        sharedPreferences.edit().putString(KEY_USER_DATA, userJson).apply()
    }

    fun getUserData(): User? {
        val userJson = sharedPreferences.getString(KEY_USER_DATA, null)
        return if (userJson != null) {
            gson.fromJson(userJson, User::class.java)
        } else {
            null
        }
    }

    fun clearAll() {
        sharedPreferences.edit().clear().apply()
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_DATA = "user_data"
    }
}
```

### Step 8: Create Login Layout

**File:** `app/src/main/res/layout/activity_login.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="24dp">

    <ImageView
        android:id="@+id/logo"
        android:layout_width="120dp"
        android:layout_height="120dp"
        android:src="@drawable/ic_launcher_foreground"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintBottom_toTopOf="@id/title"
        android:layout_marginBottom="32dp"/>

    <TextView
        android:id="@+id/title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Welcome to boilerplate"
        android:textSize="24sp"
        android:textStyle="bold"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"/>

    <com.google.android.gms.common.SignInButton
        android:id="@+id/googleSignInButton"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_marginTop="32dp"
        app:layout_constraintTop_toBottomOf="@id/title"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"/>

    <ProgressBar
        android:id="@+id/progressBar"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:visibility="gone"
        app:layout_constraintTop_toBottomOf="@id/googleSignInButton"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="16dp"/>

</androidx.constraintlayout.widget.ConstraintLayout>
```

### Step 9: Add Permissions

**File:** `app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Internet permission for API calls -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:usesCleartextTraffic="true"
        ...>

        <activity
            android:name=".ui.LoginActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.MainActivity"
            android:exported="false" />

    </application>

</manifest>
```

---

## API Integration

### Making Authenticated API Calls

Create an interceptor to add the access token to all requests:

**File:** `app/src/main/java/com/yourcompany/boilerplate/api/AuthInterceptor.kt`

```kotlin
package com.yourcompany.boilerplate.api

import android.content.Context
import com.yourcompany.boilerplate.utils.TokenManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val context: Context) : Interceptor {

    private val tokenManager = TokenManager(context)

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = tokenManager.getAccessToken()

        val newRequest = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(newRequest)
    }
}
```

Update RetrofitClient to use the interceptor:

```kotlin
object RetrofitClient {
    private var retrofit: Retrofit? = null

    fun getInstance(context: Context): Retrofit {
        if (retrofit == null) {
            val baseUrl = context.getString(R.string.api_base_url)

            val okHttpClient = OkHttpClient.Builder()
                .addInterceptor(AuthInterceptor(context))
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!
    }
}
```

---

## Testing

### Test on Android Emulator

1. **Start your backend server:**
   ```bash
   npm run start:dev
   ```

2. **Update `strings.xml` with emulator URL:**
   ```xml
   <string name="api_base_url">http://10.0.2.2:3000</string>
   ```
   Note: `10.0.2.2` is the special IP for accessing localhost from Android emulator

3. **Run the app** on the emulator

4. **Click "Sign in with Google"**

5. **Select a Google account** in the emulator

6. **Check the response** - you should receive JWT tokens

### Test on Physical Device

1. **Make sure your phone and computer are on the same WiFi network**

2. **Find your computer's local IP:**
   ```bash
   # On Mac/Linux
   ifconfig | grep "inet "

   # On Windows
   ipconfig
   ```

3. **Update `strings.xml`:**
   ```xml
   <string name="api_base_url">http://192.168.1.xxx:3000</string>
   ```

4. **Run the app** on your device

### Debug Tips

**Enable network logging:**

```kotlin
val logging = HttpLoggingInterceptor()
logging.setLevel(HttpLoggingInterceptor.Level.BODY)

val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(context))
    .addInterceptor(logging)
    .build()
```

**Check Logcat for errors:**
```bash
adb logcat | grep "boilerplate"
```

---

## Security Best Practices

### 1. Secure Token Storage
✅ Using EncryptedSharedPreferences for token storage
✅ Never log tokens in production

### 2. Network Security

**File:** `app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Production: Only allow HTTPS -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- Development: Allow localhost for testing -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

Add to AndroidManifest.xml:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

### 3. ProGuard Rules (for production)

**File:** `app/proguard-rules.pro`

```proguard
# Keep Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclassmembers class * {
    @retrofit2.http.* <methods>;
}

# Keep Google Sign-In
-keep class com.google.android.gms.** { *; }

# Keep your API models
-keep class com.yourcompany.boilerplate.api.** { *; }
```

### 4. Handle Token Refresh

Create a token refresh interceptor:

```kotlin
class TokenRefreshInterceptor(private val context: Context) : Interceptor {

    private val tokenManager = TokenManager(context)

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)

        // If 401 Unauthorized, try to refresh token
        if (response.code == 401) {
            synchronized(this) {
                val refreshToken = tokenManager.getRefreshToken()
                if (refreshToken != null) {
                    // Call refresh endpoint
                    val newAccessToken = refreshAccessToken(refreshToken)
                    if (newAccessToken != null) {
                        tokenManager.saveAccessToken(newAccessToken)

                        // Retry original request with new token
                        val newRequest = request.newBuilder()
                            .header("Authorization", "Bearer $newAccessToken")
                            .build()
                        return chain.proceed(newRequest)
                    }
                }
            }
        }

        return response
    }

    private fun refreshAccessToken(refreshToken: String): String? {
        // Call your /api/auth/refresh endpoint
        // Return new access token or null if failed
        return null
    }
}
```

---

## Summary

### What You Need:

1. **Google Cloud Console:**
   - ✅ Android OAuth Client ID (with SHA-1)
   - ✅ Web Client ID (for backend)

2. **Backend:**
   - ✅ New endpoint: `POST /api/auth/google/mobile`
   - ✅ Google Auth Library installed

3. **Android App:**
   - ✅ Google Sign-In SDK integrated
   - ✅ Retrofit for API calls
   - ✅ Secure token storage
   - ✅ Authentication flow implemented

### Flow Summary:

```
1. User clicks "Sign in with Google" button
2. Google Sign-In SDK opens Google account selector
3. User selects account and grants permissions
4. App receives ID token from Google
5. App sends ID token to backend: POST /api/auth/google/mobile
6. Backend verifies token with Google
7. Backend creates/finds user in database
8. Backend returns JWT access + refresh tokens
9. App stores tokens securely
10. App uses access token for authenticated API calls
```

**Ready to test!** 🚀

Follow the testing steps above to verify everything works correctly.
