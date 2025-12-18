import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { Role, RoleType, ALL_ROLES } from '../constants/roles';

// TypeScript interface for User document
export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: RoleType;
    googleId?: string;
    profilePicture?: string;
    authProvider: 'local' | 'google';
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// Mongoose schema definition
const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name must be less than 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        password: {
            type: String,
            required: function(this: IUser) {
                return this.authProvider === 'local';
            },
            minlength: [6, 'Password must be at least 6 characters'],
        },
        role: {
            type: String,
            enum: ALL_ROLES,
            default: Role.USER,
            required: true,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
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
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Index for faster role-based queries
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 });

// Pre-save hook to hash password before saving to database
userSchema.pre('save', async function () {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password') || !this.password) {
        return;
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.password) {
        return false;
    }
    return bcrypt.compare(candidatePassword, this.password);
};

// Export the User model
export const User = mongoose.model<IUser>('User', userSchema);
