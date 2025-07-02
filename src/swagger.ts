import { Express } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SSO API',
            version: '1.0.0',
            description: 'Documentation for Single Sign-On Backend'
        },
        servers: [
            {
                url: 'https://singe-sign-on-portal-backend.onrender.com/api'
            },
            {
                url: 'http://localhost:8000/api'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./src/routes/**/*.ts'] // adjust path to your route files
}

const swaggerSpec = swaggerJsdoc(options)

export function setupSwagger(app: Express) {
    app.use('/swagger-ui/index.html', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}
