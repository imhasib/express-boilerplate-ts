import morgan from 'morgan';
import logger from '../config/logger';

// Create a stream object that Winston will use for HTTP logs
const stream = {
    write: (message: string) => {
        // Use the http log level
        logger.http(message.trim());
    },
};

// Skip logging during tests
const skip = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'test';
};

// Build the morgan middleware
const requestLogger = morgan(
    // Define message format
    ':method :url :status :res[content-length] - :response-time ms',
    // Options: use the stream and skip function
    { stream, skip }
);

export default requestLogger;
