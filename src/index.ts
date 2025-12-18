/// <reference path="./types/express.d.ts" />
// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import router from "./routes/index";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middlewares/errorHandler";
import requestLogger from "./middlewares/requestLogger";
import logger from "./config/logger";
import swaggerSpec from "./config/swagger";
import passport from "./config/passport.config";

const app = express();

// Security & Performance Middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(passport.initialize()); // Initialize Passport for JWT authentication
app.use(requestLogger); // HTTP request logging

// Swagger API Documentation
app.get('/swagger-auth.js', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public/swagger-auth.js'));
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        persistAuthorization: true,
    },
    customJs: '/swagger-auth.js'
}));
app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Routes
app.use('/api', router);

// Error handling middleware (must be last)
app.use(errorHandler);

// Port from environment or default
const PORT = process.env.PORT || 3000;

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port: ${PORT}`);
            logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();