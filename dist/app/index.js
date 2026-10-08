"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const hpp_1 = __importDefault(require("hpp"));
const env_1 = require("../config/env");
const middleware_1 = require("./middleware");
const health_routes_1 = __importDefault(require("../modules/health/health.routes"));
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const users_routes_1 = __importDefault(require("../modules/users/users.routes"));
const cities_routes_1 = __importDefault(require("../modules/cities/cities.routes"));
const search_routes_1 = __importDefault(require("../modules/search/search.routes"));
const seats_routes_1 = __importDefault(require("../modules/seats/seats.routes"));
const holds_routes_1 = __importDefault(require("../modules/holds/holds.routes"));
const bookings_routes_1 = __importDefault(require("../modules/bookings/bookings.routes"));
const payments_routes_1 = __importDefault(require("../modules/payments/payments.routes"));
const cancellations_routes_1 = __importDefault(require("../modules/cancellations/cancellations.routes"));
const tickets_routes_1 = __importDefault(require("../modules/tickets/tickets.routes"));
const pino_http_1 = require("pino-http");
const logger_1 = require("../infrastructure/logger");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerSpec_1 = require("../docs/swaggerSpec");
function createApp() {
    const app = (0, express_1.default)();
    // 1. Trust proxy for reverse proxies / load balancers
    app.set('trust proxy', 1);
    // 2. Request tracing
    app.use(middleware_1.requestIdMiddleware);
    // 3. Security headers
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    // 4. CORS configuration
    const allowedOrigins = env_1.env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                callback(null, true);
            }
            else {
                callback(new Error('Origin not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key', 'access-token'],
    }));
    // 5. Parameter pollution protection
    app.use((0, hpp_1.default)());
    // 6. Gzip compression (crucial for large bus search/layout payloads)
    app.use((0, compression_1.default)());
    // 7. Body parsing with strict size limits
    app.use(express_1.default.json({ limit: env_1.env.REQUEST_BODY_LIMIT }));
    app.use(express_1.default.urlencoded({ extended: true, limit: env_1.env.REQUEST_BODY_LIMIT }));
    app.use((0, cookie_parser_1.default)());
    // 8. Structured HTTP request logging
    app.use((0, pino_http_1.pinoHttp)({
        logger: logger_1.logger,
        genReqId: (req) => req.id,
        autoLogging: {
            ignore: (req) => req.url?.includes('/health') || req.url?.includes('/liveness'),
        },
    }));
    // 9. Root route and OpenAPI interactive documentation
    app.get('/', (_req, res) => {
        res.json({
            name: env_1.env.APP_NAME,
            version: env_1.env.API_VERSION,
            status: 'operational',
            docs: '/api/docs',
        });
    });
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec_1.swaggerDocument));
    // 10. Health check routes (unthrottled for k8s/monitoring probes)
    app.use('/health', health_routes_1.default);
    app.use('/api/health', health_routes_1.default);
    // 11. Rate limiter for API routes
    app.use('/api', middleware_1.apiRateLimiter);
    // 12. Mount API v1 domain modules
    const apiPrefix = `/api/${env_1.env.API_VERSION}`;
    app.use(`${apiPrefix}/auth`, auth_routes_1.default);
    app.use(`${apiPrefix}/users`, users_routes_1.default);
    app.use(`${apiPrefix}/cities`, cities_routes_1.default);
    app.use(`${apiPrefix}/search`, search_routes_1.default);
    app.use(`${apiPrefix}/buses`, seats_routes_1.default);
    app.use(`${apiPrefix}/seats`, seats_routes_1.default);
    app.use(`${apiPrefix}/holds`, holds_routes_1.default);
    app.use(`${apiPrefix}/bookings`, bookings_routes_1.default);
    app.use(`${apiPrefix}/payments`, payments_routes_1.default);
    app.use(`${apiPrefix}/cancellations`, cancellations_routes_1.default);
    app.use(`${apiPrefix}/tickets`, tickets_routes_1.default);
    // Frontend aliases (/api/bus/* & /api/cities etc.)
    app.use('/api/bus/cities', cities_routes_1.default);
    app.use('/api/cities', cities_routes_1.default);
    app.use('/api/bus/search', search_routes_1.default);
    app.use('/api/search', search_routes_1.default);
    app.use('/api/bus', seats_routes_1.default);
    // 13. Central 404 & Error handlers
    app.use(middleware_1.notFoundHandler);
    app.use(middleware_1.errorHandler);
    return app;
}
//# sourceMappingURL=index.js.map