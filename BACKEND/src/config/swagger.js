const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Nexus Monitor API',
            version: '1.0.0',
            description: 'API documentation for the Nexus Monitor system',
            contact: {
                name: 'Nexus Support',
                email: 'support@nexusmonitor.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/*.js', './src/models/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
