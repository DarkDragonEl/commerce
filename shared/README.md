# @ecommerce/shared

Shared libraries and utilities for the e-commerce microservices platform.

## Overview

This package contains reusable code, types, utilities, and clients that are shared across all microservices in the platform. It promotes code reuse, consistency, and maintainability.

## Contents

### Types

- **common.types.ts** - Common TypeScript interfaces and types
  - Pagination types
  - API response types
  - Health check types
  - User roles and permissions
  - Address and Money types

- **events.types.ts** - Event definitions for inter-service communication
  - Product events
  - Order events
  - User events
  - Payment events
  - Inventory events
  - Email events

### Utilities

- **logger.ts** - Structured logging with Winston
  - JSON logging for production
  - Pretty printing for development
  - Log levels: debug, info, warn, error
  - Contextual metadata support

- **errors.ts** - Custom error classes
  - AppError base class
  - HTTP error classes (BadRequestError, NotFoundError, etc.)
  - Business logic errors
  - Error formatting utilities

- **pagination.ts** - Pagination helpers
  - Normalize pagination parameters
  - Calculate skip/take values
  - Create pagination metadata
  - Prisma pagination utilities

- **validation.ts** - Validation utilities and Zod schemas
  - Common Zod schemas (email, password, UUID, etc.)
  - Validation helper functions
  - Sanitization utilities

### Clients

- **redis.client.ts** - Redis client wrapper
  - Connection management
  - Auto-reconnection
  - Caching utilities
  - Set/Hash/List operations

- **rabbitmq.client.ts** - RabbitMQ client wrapper
  - Event publishing
  - Event subscribing
  - Connection management
  - Auto-reconnection
  - Message acknowledgment

### Monitoring

- **metrics.ts** - Prometheus metrics
  - HTTP metrics
  - Database metrics
  - Business metrics
  - Cache metrics
  - Queue metrics

## Installation

```bash
npm install
npm run build
```

## Usage

### Import in Services

```typescript
import {
  logger,
  initRedis,
  initRabbitMQ,
  initMetrics,
  BadRequestError,
  NotFoundError,
  PaginationParams,
  ProductCreatedEvent,
} from '@ecommerce/shared';
```

### Initialize Clients

```typescript
// Initialize logger
import { initLogger } from '@ecommerce/shared';

const logger = initLogger({
  service: 'product-service',
  level: 'info',
  format: 'json',
});

// Initialize Redis
import { initRedis } from '@ecommerce/shared';

const redis = initRedis({
  url: process.env.REDIS_URL,
  keyPrefix: 'product:',
});

// Initialize RabbitMQ
import { initRabbitMQ } from '@ecommerce/shared';

const rabbitmq = initRabbitMQ({
  url: process.env.RABBITMQ_URL,
  exchanges: [
    {
      name: 'ecommerce.events',
      type: 'topic',
      options: { durable: true },
    },
  ],
  queues: [
    {
      name: 'product-service.events',
      options: { durable: true },
      bindings: [
        {
          exchange: 'ecommerce.events',
          routingKey: 'order.*',
        },
      ],
    },
  ],
});

await rabbitmq.connect();

// Initialize Metrics
import { initMetrics } from '@ecommerce/shared';

const metrics = initMetrics({
  serviceName: 'product-service',
  enableDefaultMetrics: true,
});
```

### Using Logger

```typescript
import { logger } from '@ecommerce/shared';

logger.info('Product created', { productId: '123', sku: 'ABC-001' });
logger.error('Failed to create product', error, { productId: '123' });
logger.debug('Cache hit', { key: 'product:123' });
```

### Using Errors

```typescript
import { NotFoundError, ValidationError } from '@ecommerce/shared';

// Throw custom errors
if (!product) {
  throw new NotFoundError('Product');
}

// Validation error with details
throw new ValidationError('Invalid input', {
  field: 'email',
  message: 'Invalid email format',
});
```

### Using Redis

```typescript
import { getRedis } from '@ecommerce/shared';

const redis = getRedis();

// Cache product
await redis.set('product:123', productData, 3600); // 1 hour TTL

// Get from cache
const product = await redis.get('product:123');

// Delete from cache
await redis.del('product:123');
```

### Using RabbitMQ

```typescript
import { getRabbitMQ, ProductCreatedEvent, ProductEventType } from '@ecommerce/shared';

const rabbitmq = getRabbitMQ();

// Publish event
const event: ProductCreatedEvent = {
  id: uuidv4(),
  type: ProductEventType.CREATED,
  timestamp: new Date().toISOString(),
  source: 'product-service',
  data: {
    productId: '123',
    sku: 'ABC-001',
    name: 'Product Name',
    price: 29.99,
  },
};

await rabbitmq.publish('ecommerce.events', 'product.created', event);

// Subscribe to events
await rabbitmq.subscribe('product-service.events', async (message) => {
  logger.info('Event received', { eventType: message.type });
  // Handle event
});
```

### Using Metrics

```typescript
import { getMetrics } from '@ecommerce/shared';

const metrics = getMetrics();

// Record HTTP request
metrics.recordHttpRequest('GET', '/api/products', 200, 0.123);

// Record database query
metrics.recordDbQuery('SELECT', 'products', 0.045);

// Record business event
metrics.recordBusinessEvent('product.created');

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await metrics.getMetrics());
});
```

### Using Pagination

```typescript
import {
  parsePaginationQuery,
  createPaginatedResponse,
  getPrismaPaginationArgs,
} from '@ecommerce/shared';

// Parse query params
const pagination = parsePaginationQuery(req.query);

// Get Prisma args
const prismaArgs = getPrismaPaginationArgs(pagination);

// Query database
const [products, total] = await Promise.all([
  prisma.product.findMany({
    ...prismaArgs,
    where: { isActive: true },
  }),
  prisma.product.count({ where: { isActive: true } }),
]);

// Create paginated response
const response = createPaginatedResponse(products, pagination.page, pagination.limit, total);

res.json(response);
```

### Using Validation

```typescript
import { z, EmailSchema, validateData } from '@ecommerce/shared';

// Define schema
const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: SKUSchema,
  price: z.number().positive(),
  email: EmailSchema.optional(),
});

// Validate data
const validatedData = validateData(CreateProductSchema, req.body);
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint

# Fix lint issues
npm run lint:fix

# Run tests
npm test
```

## Contributing

This is a shared package used by all microservices. When making changes:

1. Ensure backward compatibility
2. Update version in package.json
3. Update documentation
4. Run tests before committing
5. Rebuild and test in dependent services

## License

MIT
