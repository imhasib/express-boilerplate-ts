import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boilerplate';

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGODB_URI);
        logger.info('✅ MongoDB connected successfully');
        logger.info(`📦 Database: ${mongoose.connection.name}`);
    } catch (error) {
        logger.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
    logger.error('❌ MongoDB error:', error);
});
