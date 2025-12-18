import mongoose, { Schema, Document } from 'mongoose';

// TypeScript interface for Token document
export interface IToken extends Document {
    token: string;
    userId: mongoose.Types.ObjectId;
    expiresAt: Date;
    createdAt: Date;
}

// Mongoose schema definition
const tokenSchema = new Schema<IToken>(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true, // Index for fast lookup
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
    }
);

// Index to automatically delete expired tokens (TTL index)
// MongoDB will automatically delete documents when expiresAt is reached
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export the Token model
export const Token = mongoose.model<IToken>('Token', tokenSchema);
