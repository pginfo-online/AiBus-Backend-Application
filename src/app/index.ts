import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { env } from '../config/env';
import { requestIdMiddleware, errorHandler, notFoundHandler, apiRateLimiter } from './middleware';
import healthRoutes from '../modules/health/health.routes';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import citiesRoutes from '../modules/cities/cities.routes';
import searchRoutes from '../modules/search/search.routes';
import seatsRoutes from '../modules/seats/seats.routes';
import holdsRoutes from '../modules/holds/holds.routes';
import bookingsRoutes from '../modules/bookings/bookings.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import cancellationsRoutes from '../modules/cancellations/cancellations.routes';
import ticketsRoutes from '../modules/tickets/tickets.routes';
import { pinoHttp } from 'pino-http';
import { logger } from '../infrastructure/logger';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from '../docs/swaggerSpec';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy for reverse proxies / load balancers
  app.set('trust proxy', 1);

  // 2. Request tracing
  app.use(requestIdMiddleware);

  // 3. Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 4. CORS configuration
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key', 'access-token'],
    })
  );

  // 5. Parameter pollution protection
  app.use(hpp());

  // 6. Gzip compression (crucial for large bus search/layout payloads)
  app.use(compression());

  // 7. Body parsing with strict size limits
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_BODY_LIMIT }));
  app.use(cookieParser());

  // 8. Structured HTTP request logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as any).id,
      autoLogging: {
        ignore: (req) => req.url?.includes('/health') || req.url?.includes('/liveness'),
      },
    })
  );

  // 9. Root route and OpenAPI interactive documentation
  app.get('/', (_req, res) => {
    res.json({
      name: env.APP_NAME,
      version: env.API_VERSION,
      status: 'operational',
      docs: '/api/docs',
    });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // 10. Health check routes (unthrottled for k8s/monitoring probes)
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  // 11. Rate limiter for API routes
  app.use('/api', apiRateLimiter);

  // 12. Mount API v1 domain modules
  const apiPrefix = `/api/${env.API_VERSION}`;
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/users`, usersRoutes);
  app.use(`${apiPrefix}/cities`, citiesRoutes);
  app.use(`${apiPrefix}/search`, searchRoutes);
  app.use(`${apiPrefix}/buses`, seatsRoutes);
  app.use(`${apiPrefix}/seats`, seatsRoutes);
  app.use(`${apiPrefix}/holds`, holdsRoutes);
  app.use(`${apiPrefix}/bookings`, bookingsRoutes);
  app.use(`${apiPrefix}/payments`, paymentsRoutes);
  app.use(`${apiPrefix}/cancellations`, cancellationsRoutes);
  app.use(`${apiPrefix}/tickets`, ticketsRoutes);

  // Frontend aliases (/api/bus/* & /api/cities etc.)
  app.use('/api/bus/cities', citiesRoutes);
  app.use('/api/cities', citiesRoutes);
  app.use('/api/bus/search', searchRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/bus', seatsRoutes);

  // 13. Central 404 & Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
