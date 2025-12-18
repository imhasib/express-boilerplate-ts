import swaggerJsdoc from 'swagger-jsdoc';

// Helper function to get the server URL
const getServerUrl = (): string => {
    // If API_URL is explicitly set, use it
    if (process.env.SWAGGER_SERVER_URL) {
        return process.env.SWAGGER_SERVER_URL;
    }

    // For development, use localhost with port
    return `http://localhost:${process.env.PORT || 3000}`;
};

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Express Boilerplate API',
            version: '1.0.0',
            description: 'A simple Express API with MongoDB, authentication, and error handling',
            contact: {
                name: 'API Support',
                email: 'support@example.com',
            },
        },
        servers: [
            {
                url: getServerUrl(),
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT access token',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'User ID',
                            example: '674442a1f8e9c12345678901',
                        },
                        name: {
                            type: 'string',
                            description: 'User name',
                            example: 'John Doe',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email',
                            example: 'john.doe@example.com',
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'user'],
                            description: 'User role',
                            example: 'user',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User creation timestamp',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User last update timestamp',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                statusCode: {
                                    type: 'number',
                                    description: 'HTTP status code',
                                    example: 400,
                                },
                                message: {
                                    type: 'string',
                                    description: 'Error message',
                                    example: 'Invalid user ID',
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    apis: process.env.NODE_ENV === 'production'
        ? ['./dist/routes/*.js']
        : ['./src/routes/*.ts'], // Path to route files with JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
