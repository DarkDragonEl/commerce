# 🚀 Quick Start Guide

Guía rápida para iniciar el proyecto **sin** necesidad de configurar servicios externos como Stripe o Keycloak.

## 📋 Prerequisitos Mínimos

```bash
# Software requerido
- Node.js 20+
- Docker Desktop (o Podman)
- Git
```

## 🎯 Inicio Rápido - Desarrollo Local (5 minutos)

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd commerce
```

### 2. Levantar infraestructura con Docker Compose

```bash
# Levanta PostgreSQL, Redis, RabbitMQ
docker-compose -f docker-compose.dev.yml up -d

# Verificar que todo está corriendo
docker-compose -f docker-compose.dev.yml ps
```

**Servicios disponibles:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672` (Management UI: http://localhost:15672)
- Keycloak (opcional): `localhost:8080`
- MinIO (opcional): `localhost:9000`
- Mailhog (email testing): `localhost:8025`

### 3. Variables importantes para MOCKS

```env
# Payment Service - No requiere Stripe real
STRIPE_MOCK=true

# Auth Service - No requiere Keycloak real (pendiente implementar)
MOCK_AUTH=true

# Media Service - Usa filesystem en lugar de MinIO
STORAGE_TYPE=filesystem

# Email Service - Solo logs (ya es default)
EMAIL_PROVIDER=mock
```

### 4. Configurar e iniciar servicios

```bash
# Product Service
cd services/product-service
cp .env.example .env
npm install
npm run prisma:migrate
npm run dev &

# Payment Service (con MOCK habilitado)
cd ../payment-service
cp .env.example .env
# Asegurar que .env tiene: STRIPE_MOCK=true
npm install
npm run prisma:migrate
npm run dev &

# ... repetir para otros servicios
```

## 🎭 Usando Payment Mock

Cuando `STRIPE_MOCK=true`, el sistema simula procesamiento de pagos:

### Reglas del Mock:
- **Tarjetas terminadas en número PAR (0, 2, 4, 6, 8)** → ✅ APROBADAS
- **Tarjetas terminadas en número IMPAR (1, 3, 5, 7, 9)** → ❌ RECHAZADAS

### Tarjetas de prueba:

```
✅ APROBADAS:
- 4242 4242 4242 4242 (Visa - termina en 2)
- 5555 5555 5555 4444 (Mastercard - termina en 4)
- 3782 822463 10006 (Amex - termina en 6)

❌ RECHAZADAS:
- 4242 4242 4242 4241 (Visa - termina en 1)
- 5555 5555 5555 4443 (Mastercard - termina en 3)
- 3782 822463 10005 (Amex - termina en 5)
```

**Cualquier fecha de expiración futura y CVC funcionan.**

## 📝 Logs del Mock

Cuando uses el mock, verás mensajes como:

```
🎭 Stripe Mock Client initialized - Using mock payment processor
💡 Mock Rules: Cards ending in EVEN digit → APPROVED, ODD digit → DECLINED
✅ Mock Payment APPROVED - amount: 10000, cardLast4: 4242
❌ Mock Payment DECLINED - cardLast4: 4241, reason: Card ends in odd digit
```

## 📊 Verificar que todo funciona

### Health Checks

```bash
curl http://localhost:3004/health
```

### Test de pago

```bash
# Crear payment intent
curl -X POST http://localhost:3004/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "orderId": "test-order-123"
  }'
```

## 🔗 URLs útiles

- Customer Frontend: http://localhost:3100
- Admin Panel: http://localhost:3200
- RabbitMQ Management: http://localhost:15672 (admin/admin)
- Mailhog (emails): http://localhost:8025

## 📖 Documentación adicional

- [PREREQUISITES.md](./PREREQUISITES.md) - Dependencias detalladas y opciones de mock
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Despliegue en OpenShift
