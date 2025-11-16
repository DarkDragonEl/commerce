# Product Service

Microservicio de catálogo de productos para la plataforma de e-commerce.

## 📋 Descripción

El Product Service maneja toda la gestión del catálogo de productos incluyendo:

- ✅ CRUD completo de productos
- ✅ Gestión de categorías jerárquicas
- ✅ Variantes de productos (tallas, colores, etc.)
- ✅ Atributos dinámicos
- ✅ Imágenes de productos
- ✅ Búsqueda y filtrado avanzado
- ✅ Gestión de inventario básico
- ✅ Productos destacados, nuevos, en oferta
- ✅ Relaciones entre productos (related, upsell, cross-sell)
- ✅ Publicación de eventos (RabbitMQ)
- ✅ Caching con Redis
- ✅ Métricas de Prometheus
- ✅ OpenAPI/Swagger documentation

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3.12+

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed
```

### Development

```bash
# Start in development mode
npm run dev

# Build
npm run build

# Start production
npm start

# Run tests
npm test

# Run linter
npm run lint
```

### Docker

```bash
# Build image
docker build -t product-service .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e RABBITMQ_URL=amqp://... \
  product-service
```

## 📚 API Documentation

Una vez iniciado el servicio, la documentación Swagger está disponible en:

```
http://localhost:3001/api-docs
```

## 🔌 API Endpoints

### Products

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/products` | List products with filters | No |
| GET | `/api/v1/products/:id` | Get product by ID | No |
| GET | `/api/v1/products/slug/:slug` | Get product by slug | No |
| GET | `/api/v1/products/featured` | Get featured products | No |
| GET | `/api/v1/products/new` | Get new products | No |
| GET | `/api/v1/products/on-sale` | Get products on sale | No |
| GET | `/api/v1/products/best-sellers` | Get best sellers | No |
| POST | `/api/v1/products` | Create product | Yes (Admin) |
| PUT | `/api/v1/products/:id` | Update product | Yes (Admin) |
| DELETE | `/api/v1/products/:id` | Delete product | Yes (Admin) |
| PUT | `/api/v1/products/:id/stock` | Update stock | Yes (Admin) |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |
| GET | `/metrics` | Prometheus metrics |

## 🔍 Query Parameters

### List Products

```
GET /api/v1/products?page=1&limit=20&sortBy=name&sortOrder=asc
```

**Supported filters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `sortBy` (string): Sort field (name, price, createdAt, purchaseCount, averageRating)
- `sortOrder` (string): Sort direction (asc, desc)
- `search` (string): Search in name, description, SKU
- `categoryId` (uuid): Filter by category
- `status` (string): Filter by status (DRAFT, ACTIVE, ARCHIVED, OUT_OF_STOCK)
- `isActive` (boolean): Filter active products
- `isFeatured` (boolean): Filter featured products
- `isNew` (boolean): Filter new products
- `onSale` (boolean): Filter products on sale
- `priceMin` (number): Minimum price
- `priceMax` (number): Maximum price

## 📊 Database Schema

### Main Tables

- `products` - Main product information
- `categories` - Product categories (hierarchical)
- `product_variants` - Product variations (size, color, etc.)
- `product_images` - Product images
- `product_attributes` - Custom product attributes
- `product_relations` - Related products
- `product_audit_logs` - Audit trail

## 🔄 Events Published

El servicio publica los siguientes eventos a RabbitMQ:

- `product.created` - When a product is created
- `product.updated` - When a product is updated
- `product.deleted` - When a product is deleted
- `product.stock.changed` - When stock quantity changes
- `product.price.changed` - When price changes

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run in watch mode
npm run test:watch
```

## 📝 Environment Variables

See `.env.example` for all available environment variables.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - Secret for JWT token validation

**Optional:**
- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Logging level (default: info)
- `ENABLE_API_DOCS` - Enable Swagger docs (default: true)

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://productuser:productpass@localhost:5432/product_db
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
redis-cli -h localhost -p 6379 ping
```

### Migration Issues

```bash
# Reset database (WARNING: destroys all data)
npm run prisma:migrate:reset

# Apply pending migrations
npm run prisma:migrate:deploy
```

## 📦 Dependencies

### Production
- `fastify` - Web framework
- `@prisma/client` - Database ORM
- `@ecommerce/shared` - Shared utilities
- `zod` - Schema validation

### Development
- `typescript` - Type checking
- `prisma` - Database toolkit
- `jest` - Testing framework
- `tsx` - TypeScript execution

## 🏗️ Architecture

```
src/
├── api/                    # HTTP layer
│   ├── controllers/        # Request handlers
│   ├── routes/            # Route definitions
│   ├── validators/        # Input validation
│   └── middleware/        # Custom middleware
├── services/              # Business logic
├── repositories/          # Data access
├── config/                # Configuration
└── server.ts              # Application entry point
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Run linter and tests
5. Submit pull request

## 📄 License

MIT
