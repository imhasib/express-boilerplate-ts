import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from 'passport-google-oauth20';
import { jwtConfig, JwtPayload } from './token.config';
import logger from './logger';
import * as authService from '../services/auth.service';

// JWT Strategy options
const options: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtConfig.accessSecret,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
};

// Configure JWT Strategy
passport.use(
    new JwtStrategy(options, async (payload: JwtPayload, done) => {
        try {
            // Validate that the JWT payload contains required fields
            if (!payload.userId || !payload.email || !payload.role) {
                logger.warn('JWT authentication failed: Invalid token payload');
                return done(null, false);
            }

            // No database lookup needed - role is in the token
            // User information is trusted from the JWT signature
            return done(null, {
                id: payload.userId,
                email: payload.email,
                name: '', // Not stored in token, will be fetched if needed
                role: payload.role,
            });
        } catch (error) {
            logger.error('Error in JWT strategy:', error);
            return done(error, false);
        }
    })
);

// Configure Google OAuth Strategy
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
            try {
                // Validate email is verified
                const email = profile.emails?.[0];
                if (!email || !email.verified) {
                    logger.warn(`Google OAuth failed: Email not verified for ${profile.id}`);
                    return done(new Error('Email not verified by Google'), undefined);
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

                logger.info(`Google OAuth successful for user: ${user.email}`);
                return done(null, user);
            } catch (error) {
                logger.error('Google OAuth error:', error);
                return done(error as Error, undefined);
            }
        }
    )
);

export default passport;
