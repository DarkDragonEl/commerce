# E-Commerce Microservices Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenShift](https://img.shields.io/badge/OpenShift-Ready-red.svg)](https://www.openshift.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

A complete, production-ready e-commerce platform built with microservices architecture, designed to run on OpenShift with full observability, scalability, and modern DevOps practices.

## 🌟 Features

### Core E-Commerce Features
- ✅ **Product Management**: Complete catalog with categories, variants, and inventory
- ✅ **Shopping Cart & Checkout**: Real-time cart management with session persistence
- ✅ **Order Processing**: Full order lifecycle with state machine
- ✅ **Payment Integration**: Stripe integration with webhook support
- ✅ **User Authentication**: Keycloak integration with OAuth2/OIDC
- ✅ **Inventory Management**: Real-time stock tracking with reservations
- ✅ **Content Management**: Blog/CMS with markdown/MDX support
- ✅ **Media Management**: Image upload and optimization with MinIO (S3-compatible)
- ✅ **Email Notifications**: Transactional emails with template support
- ✅ **Analytics**: Business metrics and reporting

### Technical Features
- 🏗️ **Microservices Architecture**: Domain-driven design with service autonomy
- 🔐 **Security**: Keycloak authentication, JWT tokens, RBAC
- 📊 **Observability**: Prometheus metrics, Jaeger tracing, structured logging
- 🚀 **CI/CD**: Tekton pipelines for automated deployment
- ☸️ **Cloud Native**: Kubernetes/OpenShift ready with health checks
- 💾 **Database per Service**: PostgreSQL with Prisma ORM
- 🔄 **Event-Driven**: RabbitMQ for async communication
- 🎯 **API Gateway**: Kong for routing, rate limiting, and auth
- 📦 **Containerized**: Docker/Podman with multi-stage builds
- 🧪 **Well-Tested**: Unit, integration, and E2E tests

## 📋 Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Services](#services)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet / Users                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │  OpenShift Router       │
            │  (Ingress/Routes)       │
            └────────────┬────────────┘
                         │
            ┌────────────▼────────────┐
            │    Kong API Gateway     │
            │  - Rate Limiting        │
            │  - Authentication       │
            │  - Request Routing      │
            └─────┬──────────────┬────┘
                  │              │
     ┌────────────┴──┐      ┌────▼────────┐
     │  Frontend     │      │ Admin Panel │
     │  (Next.js)    │      │  (React)    │
     └───────────────┘      └─────────────┘
                  │
        ┌─────────┴─────────────────────────┐
        │                                   │
   ┌────▼─────┐  ┌──────────┐  ┌──────────┐
   │ Product  │  │  Order   │  │   Auth   │
   │ Service  │  │ Service  │  │ Service  │
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │              │
   ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐
   │Postgres  │  │Postgres  │  │Postgres  │
   └──────────┘  └──────────┘  └──────────┘
```

### Microservices

1. **Product Service** (Port 3001) - Product catalog, categories, variants
2. **Order Service** (Port 3002) - Cart, orders, order processing
3. **Auth Service** (Port 3003) - Authentication with Keycloak
4. **Payment Service** (Port 3004) - Stripe integration, payments
5. **Content Service** (Port 3005) - Blog, CMS, pages
6. **Media Service** (Port 3006) - File upload, MinIO storage
7. **Email Service** (Worker) - Transactional emails
8. **Inventory Service** (Port 3007) - Stock management
9. **Analytics Service** (Port 3008) - Business metrics

### Frontend Applications

10. **Customer Frontend** (Port 3000) - Next.js 14 storefront
11. **Admin Panel** (Port 3010) - React admin dashboard

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **Docker** or **Podman**
- **OpenShift CLI** (`oc`) for production deployment
- **Make** (optional, for convenience commands)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ecommerce-microservices.git
   cd ecommerce-microservices
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Quick start with Make**
   ```bash
   make quick-start
   ```

   Or manually:
   ```bash
   # Install dependencies
   make install-deps

   # Start infrastructure (databases, Redis, RabbitMQ, etc.)
   make dev-detached

   # Run migrations
   make migrate

   # Seed test data
   make seed

   # Start services
   make dev
   ```

4. **Access the applications**
   - **Customer Frontend**: http://localhost:3000
   - **Admin Panel**: http://localhost:3010
   - **API Gateway**: http://localhost:8080
   - **RabbitMQ Management**: http://localhost:15672 (user: ecommerce, pass: ecommerce123)
   - **MinIO Console**: http://localhost:9001 (user: minioadmin, pass: minioadmin123)
   - **Keycloak**: http://localhost:8080 (user: admin, pass: admin)

## 📦 Services

### Product Service

Manages the product catalog including categories, variants, attributes, and images.

- **Port**: 3001
- **Database**: PostgreSQL (product_db)
- **Endpoints**: `/api/v1/products`, `/api/v1/categories`
- **Documentation**: [Product Service Docs](./docs/services/product-service.md)

### Order Service

Handles shopping cart and order management with full order lifecycle.

- **Port**: 3002
- **Database**: PostgreSQL (order_db)
- **Endpoints**: `/api/v1/orders`, `/api/v1/cart`, `/api/v1/checkout`
- **Documentation**: [Order Service Docs](./docs/services/order-service.md)

### Auth Service

User authentication and authorization using Keycloak.

- **Port**: 3003
- **Database**: PostgreSQL (auth_db)
- **Endpoints**: `/api/v1/auth`, `/api/v1/users`
- **Documentation**: [Auth Service Docs](./docs/services/auth-service.md)

### Payment Service

Payment processing with Stripe integration.

- **Port**: 3004
- **Endpoints**: `/api/v1/payments`, `/api/v1/webhooks/stripe`
- **Documentation**: [Payment Service Docs](./docs/services/payment-service.md)

### Content Service

Content management system for blog posts and static pages.

- **Port**: 3005
- **Database**: PostgreSQL (content_db)
- **Endpoints**: `/api/v1/posts`, `/api/v1/pages`, `/api/v1/blog`
- **Documentation**: [Content Service Docs](./docs/services/content-service.md)

### Media Service

File upload and management with MinIO (S3-compatible) storage.

- **Port**: 3006
- **Storage**: MinIO
- **Endpoints**: `/api/v1/media/upload`, `/api/v1/media/:id`
- **Documentation**: [Media Service Docs](./docs/services/media-service.md)

### Email Service

Asynchronous email sending with RabbitMQ queue.

- **Type**: Worker (no HTTP endpoints)
- **Queue**: RabbitMQ
- **Templates**: Handlebars
- **Documentation**: [Email Service Docs](./docs/services/email-service.md)

### Inventory Service

Real-time inventory management with stock reservations.

- **Port**: 3007
- **Database**: PostgreSQL (inventory_db)
- **Endpoints**: `/api/v1/inventory`
- **Documentation**: [Inventory Service Docs](./docs/services/inventory-service.md)

### Analytics Service

Business metrics, reporting, and analytics.

- **Port**: 3008
- **Database**: PostgreSQL (analytics_db)
- **Endpoints**: `/api/v1/analytics`, `/api/v1/metrics`
- **Documentation**: [Analytics Service Docs](./docs/services/analytics-service.md)

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime environment |
| TypeScript 5.3 | Programming language |
| Fastify 4.x | Web framework |
| Prisma 5.x | ORM and database toolkit |
| Zod | Schema validation |
| Winston | Structured logging |
| Jest | Testing framework |

### Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework (App Router) |
| React 18 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| React Query | Data fetching |
| Zustand | State management |
| React Hook Form | Form handling |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| PostgreSQL 15 | Primary database |
| Redis 7 | Caching layer |
| RabbitMQ 3.12 | Message broker |
| MinIO | S3-compatible object storage |
| Kong | API Gateway |
| Keycloak | Identity and access management |

### DevOps

| Technology | Purpose |
|------------|---------|
| OpenShift | Container orchestration |
| Tekton | CI/CD pipelines |
| Prometheus | Metrics collection |
| Grafana | Metrics visualization |
| Jaeger | Distributed tracing |
| EFK Stack | Logging (Elasticsearch, Fluentd, Kibana) |

## 💻 Development

### Available Commands

```bash
# Development
make dev              # Start all services
make dev-detached     # Start in background
make stop             # Stop all services
make restart          # Restart services

# Database
make migrate          # Run migrations
make seed             # Seed test data
make reset-db         # Reset databases (WARNING: destructive)

# Testing
make test             # Run all tests
make test-service     # Test specific service
make test-coverage    # Tests with coverage
make test-e2e         # End-to-end tests

# Code Quality
make lint             # Run linter
make lint-fix         # Fix linting issues
make format           # Format code

# Deployment
make deploy           # Deploy to OpenShift
make deploy-service   # Deploy specific service
make deploy-infra     # Deploy infrastructure

# Utilities
make logs             # View all logs
make logs-service     # View specific service logs
make health-check     # Check service health
make clean            # Clean up containers and volumes
```

### Service Development

Each service follows a consistent structure:

```
service-name/
├── src/
│   ├── api/
│   │   ├── routes/          # Route definitions
│   │   ├── controllers/     # Request handlers
│   │   ├── validators/      # Input validation (Zod)
│   │   └── middleware/      # Custom middleware
│   ├── services/            # Business logic
│   ├── repositories/        # Data access layer
│   ├── domain/
│   │   ├── entities/        # Domain models
│   │   └── interfaces/      # Type definitions
│   ├── events/
│   │   ├── publishers/      # Event publishers
│   │   └── subscribers/     # Event subscribers
│   ├── config/              # Configuration
│   ├── utils/               # Utilities
│   └── server.ts            # Entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration files
│   └── seed.ts              # Seed data
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # E2E tests
├── Dockerfile               # Container definition
├── package.json
└── tsconfig.json
```

### Adding a New Service

1. **Create service structure**
   ```bash
   mkdir -p services/my-service/src/{api,services,repositories}
   cd services/my-service
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm install fastify @fastify/cors @prisma/client zod
   npm install -D typescript @types/node prisma jest ts-jest
   ```

3. **Setup Prisma**
   ```bash
   npx prisma init
   # Edit prisma/schema.prisma
   npx prisma migrate dev
   ```

4. **Create OpenShift manifests**
   ```bash
   mkdir -p openshift/03-services/my-service
   # Create deployment.yaml, service.yaml, etc.
   ```

5. **Add to docker-compose.yaml**

## 🚢 Deployment

### OpenShift Deployment

1. **Login to OpenShift**
   ```bash
   oc login --token=YOUR_TOKEN --server=https://api.your-cluster.com:6443
   ```

2. **Deploy infrastructure**
   ```bash
   make deploy-infra
   ```

3. **Deploy all services**
   ```bash
   make deploy
   ```

4. **Deploy specific service**
   ```bash
   make deploy-service service=product-service
   ```

### CI/CD with Tekton

The project includes Tekton pipelines for automated build and deployment.

```bash
# Apply Tekton resources
oc apply -f openshift/07-tekton/

# Trigger a pipeline run
tkn pipeline start build-and-deploy \
  --param git-url=https://github.com/your-org/ecommerce \
  --param git-revision=main \
  --param service-name=product-service
```

### Environment Variables

All services require environment variables. See `.env.example` for a complete list.

Production secrets should be managed through OpenShift Secrets:

```bash
oc create secret generic product-service-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=...
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
make test

# Run tests for specific service
cd services/product-service
npm test

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# Run integration tests
cd services/product-service
npm run test:integration
```

### E2E Tests

```bash
# Run Playwright E2E tests
cd frontend
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui
```

### Load Testing

```bash
# Run k6 load tests
k6 run tests/load/k6-scripts/product-api.js
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture/README.md)
- [API Reference](./docs/api/README.md)
- [Deployment Guide](./docs/deployment/README.md)
- [Development Guide](./docs/development/README.md)
- [Service Documentation](./docs/services/)
- [Runbooks](./docs/runbooks/)

### API Documentation

Each service exposes OpenAPI/Swagger documentation at `/api-docs`:

- Product Service: http://localhost:3001/api-docs
- Order Service: http://localhost:3002/api-docs
- Auth Service: http://localhost:3003/api-docs
- etc.

## 🔐 Security

- **Authentication**: Keycloak with OAuth2/OIDC
- **Authorization**: Role-Based Access Control (RBAC)
- **API Gateway**: Kong with rate limiting and JWT validation
- **Secrets Management**: OpenShift Secrets
- **TLS/SSL**: Enforced in production
- **Security Headers**: Helmet.js
- **Input Validation**: Zod schemas
- **SQL Injection Prevention**: Prisma parameterized queries

## 📊 Monitoring & Observability

### Metrics

Prometheus metrics available at `/metrics` endpoint for each service:

- HTTP request duration and count
- Database query performance
- Business metrics (orders, revenue, etc.)
- Resource usage (CPU, memory)

### Tracing

Distributed tracing with Jaeger:

```bash
# Access Jaeger UI
oc port-forward svc/jaeger-query 16686:16686
# Open http://localhost:16686
```

### Logging

Structured JSON logging with correlation IDs:

```typescript
logger.info('Order created', {
  orderId: '123',
  userId: '456',
  total: 99.99,
  correlationId: 'abc-def-ghi'
});
```

Logs are collected by Fluentd and sent to Elasticsearch for analysis in Kibana.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`make test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESLint + Prettier for formatting
- Conventional Commits for commit messages
- 100% test coverage for critical paths

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Architecture**: Microservices with domain-driven design
- **DevOps**: OpenShift, Tekton, Kubernetes
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js, Fastify, Prisma

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Fastify](https://www.fastify.io/)
- [Prisma](https://www.prisma.io/)
- [OpenShift](https://www.openshift.com/)
- [Tekton](https://tekton.dev/)
- [Keycloak](https://www.keycloak.org/)
- [Kong](https://konghq.com/)

## 📞 Support

For support, email support@ecommerce.com or join our Slack channel.

## 🗺️ Roadmap

- [ ] Multi-language support (i18n)
- [ ] GraphQL API
- [ ] Mobile app (React Native)
- [ ] AI-powered recommendations
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] Marketplace features

---

**Built with ❤️ for the cloud-native era**
