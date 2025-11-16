# Prerequisitos y Dependencias

## 📋 Prerequisitos según Ambiente

### Producción (OpenShift)

#### **Obligatorios:**
1. **OpenShift Cluster 4.14+**
   - Acceso de cluster admin
   - CLI `oc` configurado

2. **Infraestructura Base:**
   - PostgreSQL (incluido en manifiestos)
   - Redis (incluido en manifiestos)
   - RabbitMQ (incluido en manifiestos)

#### **Recomendados pero opcionales:**
3. **Keycloak** (Auth)
   - ✅ Incluido en manifiestos
   - 🔧 Alternativa: Mock Auth Service (ver abajo)

4. **MinIO** (Storage)
   - ✅ Incluido en manifiestos
   - 🔧 Alternativa: File System local

5. **Stripe** (Pagos)
   - ❌ Requiere cuenta externa
   - 🔧 Alternativa: **Mock Payment Service** (ver abajo)

6. **Tekton** (CI/CD)
   - ⚙️ Opcional para despliegue manual
   - Requerido solo para CI/CD automatizado

### Desarrollo Local

#### **Mínimo Viable:**
```bash
# Solo necesitas:
- Node.js 20+
- Docker/Podman (para PostgreSQL, Redis, RabbitMQ)
- npm/yarn
```

#### **Docker Compose para desarrollo:**
Ver `docker-compose.dev.yml` (creado abajo)

---

## 🎭 Mock Services

### 1. Mock Payment Service

Para reemplazar Stripe temporalmente:

**Ubicación:** `services/payment-service/src/mocks/stripe-mock.ts`

**Características:**
- Aprueba cualquier pago con tarjeta terminada en número par
- Rechaza pagos con tarjeta terminada en número impar
- Simula delays realistas
- No requiere API keys

### 2. Mock Auth (Opcional)

Si no quieres configurar Keycloak inicialmente:
- Usar variable `MOCK_AUTH=true`
- Genera tokens JWT locales
- Usuario de prueba: `admin/admin`

### 3. Mock Email (Ya incluido)

El servicio de email ya usa mock por defecto:
- Solo loguea emails en consola
- Para producción: configurar SMTP

---

## 📦 Dependencias por Servicio

### Servicios Backend (9 servicios)

| Servicio | PostgreSQL | Redis | RabbitMQ | Keycloak | MinIO | Stripe | Email SMTP |
|----------|-----------|-------|----------|----------|-------|--------|------------|
| Product | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auth | ✅ | ✅ | ✅ | ✅ (mock) | ❌ | ❌ | ❌ |
| Order | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Payment | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ (mock) | ❌ |
| Email | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ (mock) |
| Inventory | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Media | ✅ | ❌ | ✅ | ❌ | ✅ (fs) | ❌ | ❌ |
| Content | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Leyenda:**
- ✅ = Requerido
- ⚠️ = Opcional (tiene mock)
- ❌ = No usa
- (mock) = Mock disponible
- (fs) = Puede usar filesystem

### Frontend

| Aplicación | Requisitos |
|------------|-----------|
| Customer Frontend | - API Gateway<br>- Node.js 20+ (build) |
| Admin Panel | - API Gateway<br>- Node.js 20+ (build)<br>- Nginx (runtime) |

---

## 🚀 Orden de Despliegue Recomendado

### Fase 1: Infraestructura Core (Obligatoria)
```bash
1. PostgreSQL
2. Redis
3. RabbitMQ
```

### Fase 2: Servicios Base
```bash
4. Product Service (sin dependencias externas)
5. Inventory Service
6. Content Service
```

### Fase 3: Auth y Pagos (con mocks)
```bash
7. Auth Service (MOCK_AUTH=true)
8. Payment Service (STRIPE_MOCK=true)
9. Email Service (usa mock por defecto)
```

### Fase 4: Servicios Dependientes
```bash
10. Order Service (requiere product, inventory, payment)
11. Media Service (puede usar filesystem)
12. Analytics Service
```

### Fase 5: Gateway y Frontend
```bash
13. API Gateway
14. Customer Frontend
15. Admin Panel
```

---

## 🔧 Variables de Ambiente para Mocks

### Payment Service (Mock Stripe)
```env
# Mock mode (no requiere Stripe API key)
STRIPE_MOCK=true

# Opcional: Para usar Stripe real
STRIPE_SECRET_KEY=sk_test_...
```

### Auth Service (Mock Keycloak)
```env
# Mock mode (no requiere Keycloak)
MOCK_AUTH=true

# Opcional: Para usar Keycloak real
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=ecommerce
KEYCLOAK_CLIENT_ID=ecommerce-backend
KEYCLOAK_CLIENT_SECRET=...
```

### Media Service (Filesystem en lugar de MinIO)
```env
# Usar filesystem local
STORAGE_TYPE=filesystem
STORAGE_PATH=/app/uploads

# Opcional: Para usar MinIO real
STORAGE_TYPE=s3
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
```

### Email Service (Mock SMTP)
```env
# Mock mode (solo logs, ya es default)
EMAIL_PROVIDER=mock

# Opcional: Para usar SMTP real
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

---

## 🐳 Docker Compose para Desarrollo Local

Ver `docker-compose.dev.yml` para levantar toda la infraestructura localmente sin OpenShift.

---

## 📝 Checklist de Dependencias

### Antes de empezar
- [ ] OpenShift cluster accesible
- [ ] `oc` CLI instalado
- [ ] Acceso de cluster admin
- [ ] Decidir: ¿Stripe real o mock?
- [ ] Decidir: ¿Keycloak real o mock?
- [ ] Decidir: ¿MinIO real o filesystem?

### Para desarrollo local
- [ ] Docker/Podman instalado
- [ ] Node.js 20+ instalado
- [ ] Clonar repositorio
- [ ] Configurar `.env` files con mocks
- [ ] `docker-compose up -d` (infraestructura)
- [ ] `npm install` en cada servicio
- [ ] `npm run dev` en servicios

### Para producción
- [ ] Stripe account configurado
- [ ] Keycloak realm configurado
- [ ] MinIO buckets creados
- [ ] SMTP configurado (opcional)
- [ ] SSL/TLS certificates
- [ ] Secrets de OpenShift configurados
- [ ] DNS configurado

---

## ⚠️ Notas Importantes

1. **PostgreSQL es OBLIGATORIO** - No hay mock disponible
2. **Redis es OBLIGATORIO** - Necesario para caché
3. **RabbitMQ es OBLIGATORIO** - Necesario para eventos
4. **Stripe puede usar mock** - Perfecto para desarrollo
5. **Keycloak puede usar mock** - Autenticación simplificada
6. **MinIO puede usar filesystem** - Storage local
7. **Email usa mock por defecto** - Solo logs en consola

---

## 🎯 Configuración Mínima Recomendada

Para comenzar a desarrollar/probar **SIN** servicios externos:

```bash
# Infraestructura mínima
- PostgreSQL (Docker)
- Redis (Docker)
- RabbitMQ (Docker)

# Servicios con mocks habilitados
- Payment Service (STRIPE_MOCK=true)
- Auth Service (MOCK_AUTH=true)
- Media Service (STORAGE_TYPE=filesystem)
- Email Service (EMAIL_PROVIDER=mock, default)
```

Con esto puedes desarrollar y probar todo el sistema sin necesidad de:
- ❌ Cuenta de Stripe
- ❌ Configurar Keycloak
- ❌ Instalar MinIO
- ❌ Configurar SMTP
