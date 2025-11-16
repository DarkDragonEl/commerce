# 🧪 Guía Completa de Validación y Testing

Esta guía proporciona instrucciones paso a paso para validar y testear completamente la plataforma de e-commerce con microservicios.

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Validación de Infraestructura](#validación-de-infraestructura)
3. [Validación de Product Service](#validación-de-product-service)
4. [Testing End-to-End](#testing-end-to-end)
5. [Troubleshooting](#troubleshooting)
6. [Checklist Completo](#checklist-completo)

---

## 🎯 Pre-requisitos

### Software Requerido

Verifica que tengas instalado:

```bash
# Node.js 20+
node --version  # debe ser >= 20.0.0

# Docker
docker --version

# Docker Compose
docker-compose --version

# Make (opcional pero recomendado)
make --version

# OpenShift CLI (para deployment)
oc version
```

### Configuración Inicial

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd commerce
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env según sea necesario
   ```

3. **Instalar dependencias de shared libraries**
   ```bash
   cd shared
   npm install
   npm run build
   cd ..
   ```

---

## 🔧 Validación de Infraestructura

### Paso 1: Iniciar Infraestructura Base

```bash
# Opción 1: Usar Makefile
make dev

# Opción 2: Usar Docker Compose directamente
docker-compose up -d postgres-product postgres-order postgres-auth \
  postgres-content postgres-inventory postgres-analytics \
  redis rabbitmq minio keycloak kong
```

### Paso 2: Verificar que todos los contenedores estén corriendo

```bash
docker ps

# Deberías ver:
# - postgres-product (puerto 5432)
# - postgres-order (puerto 5433)
# - postgres-auth (puerto 5434)
# - postgres-content (puerto 5435)
# - postgres-inventory (puerto 5436)
# - postgres-analytics (puerto 5437)
# - redis (puerto 6379)
# - rabbitmq (puertos 5672, 15672)
# - minio (puertos 9000, 9001)
# - keycloak (puerto 8180)
# - kong (puertos 8000, 8001)
```

### Paso 3: Verificar Health de Servicios de Infraestructura

```bash
# PostgreSQL Product DB
docker exec ecommerce-product-db pg_isready -U productuser -d product_db
# Debe devolver: "accepting connections"

# Redis
docker exec ecommerce-redis redis-cli ping
# Debe devolver: PONG

# RabbitMQ
curl http://localhost:15672/api/overview -u ecommerce:ecommerce123
# Debe devolver JSON con información del broker

# MinIO
curl http://localhost:9000/minio/health/live
# Debe devolver 200 OK

# Kong Admin API
curl http://localhost:8001/status
# Debe devolver JSON con estado
```

### Paso 4: Validar Conectividad de Red

```bash
# Crear red si no existe
docker network inspect ecommerce-network

# Verificar que todos los contenedores estén en la red
docker network inspect ecommerce-network | grep Name
```

---

## 📦 Validación de Product Service

### Paso 1: Preparar Base de Datos

```bash
cd services/product-service

# Instalar dependencias
npm install

# Generar Prisma client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Verificar que las tablas se crearon
npx prisma studio
# Abrir http://localhost:5555 y verificar tablas
```

### Paso 2: Seed de Datos de Prueba

```bash
# Ejecutar seed script
npm run prisma:seed

# Verificar datos en Prisma Studio
# Deberías ver:
# - 3 categorías
# - 2 productos
# - Variantes de productos
# - Imágenes
# - Atributos
```

### Paso 3: Iniciar Product Service

```bash
# Copiar .env de ejemplo
cp .env.example .env

# Editar variables si es necesario
# Verificar que apunten a localhost

# Iniciar en modo desarrollo
npm run dev

# Deberías ver:
# ✅ Database connected successfully
# ✅ Redis initialized
# ✅ RabbitMQ connected
# ✅ Server listening on port 3001
```

### Paso 4: Verificar Health Endpoints

```bash
# Health check completo
curl http://localhost:3001/health | jq
# Debe devolver status: "healthy"

# Liveness probe
curl http://localhost:3001/health/live
# Debe devolver status: "alive"

# Readiness probe
curl http://localhost:3001/health/ready
# Debe devolver status: "ready"

# Metrics
curl http://localhost:3001/metrics
# Debe devolver métricas en formato Prometheus
```

### Paso 5: Validar API Documentation

```bash
# Abrir Swagger UI en navegador
open http://localhost:3001/api-docs

# Deberías ver:
# - Documentación completa de la API
# - Todos los endpoints listados
# - Posibilidad de probar endpoints directamente
```

### Paso 6: Testing de Endpoints

#### 6.1 GET - Listar Productos

```bash
# Listar todos los productos
curl http://localhost:3001/api/v1/products | jq

# Con filtros
curl "http://localhost:3001/api/v1/products?page=1&limit=10&sortBy=price&sortOrder=asc" | jq

# Buscar productos
curl "http://localhost:3001/api/v1/products?search=macbook" | jq

# Filtrar por categoría
curl "http://localhost:3001/api/v1/products?categoryId=<category-uuid>" | jq
```

#### 6.2 GET - Producto por ID

```bash
# Obtener el ID de un producto del paso anterior
PRODUCT_ID="<uuid-del-producto>"

curl http://localhost:3001/api/v1/products/$PRODUCT_ID | jq
```

#### 6.3 GET - Producto por Slug

```bash
curl http://localhost:3001/api/v1/products/slug/macbook-pro-16 | jq
```

#### 6.4 GET - Productos Destacados

```bash
curl http://localhost:3001/api/v1/products/featured | jq
curl "http://localhost:3001/api/v1/products/featured?limit=5" | jq
```

#### 6.5 GET - Productos Nuevos

```bash
curl http://localhost:3001/api/v1/products/new | jq
```

#### 6.6 GET - Productos en Oferta

```bash
curl http://localhost:3001/api/v1/products/on-sale | jq
```

#### 6.7 GET - Best Sellers

```bash
curl http://localhost:3001/api/v1/products/best-sellers | jq
```

#### 6.8 POST - Crear Producto

```bash
curl -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "TEST-001",
    "name": "Test Product",
    "description": "This is a test product",
    "price": 99.99,
    "stockQuantity": 100,
    "categoryId": "<category-uuid>"
  }' | jq
```

#### 6.9 PUT - Actualizar Producto

```bash
curl -X PUT http://localhost:3001/api/v1/products/$PRODUCT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product Name",
    "price": 109.99
  }' | jq
```

#### 6.10 PUT - Actualizar Stock

```bash
curl -X PUT http://localhost:3001/api/v1/products/$PRODUCT_ID/stock \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 150
  }' | jq
```

#### 6.11 DELETE - Eliminar Producto

```bash
curl -X DELETE http://localhost:3001/api/v1/products/$PRODUCT_ID | jq
```

### Paso 7: Validar Eventos (RabbitMQ)

```bash
# Acceder a RabbitMQ Management UI
open http://localhost:15672
# Usuario: ecommerce
# Password: ecommerce123

# Verificar:
# 1. Exchange "ecommerce.events" existe
# 2. Queue "product-service.events" existe
# 3. Binding entre exchange y queue

# Monitorear eventos en tiempo real
# En la UI de RabbitMQ:
# - Ir a Queues -> product-service.events
# - Hacer Get Messages
# - Deberías ver eventos de productos creados/actualizados
```

### Paso 8: Validar Cache (Redis)

```bash
# Conectar a Redis CLI
docker exec -it ecommerce-redis redis-cli

# Listar todas las keys
KEYS product:*

# Ver un valor específico
GET product:<key>

# Verificar TTL
TTL product:<key>

# Salir
EXIT
```

### Paso 9: Validar Métricas

```bash
# Métricas de HTTP requests
curl http://localhost:3001/metrics | grep http_requests_total

# Métricas de DB queries
curl http://localhost:3001/metrics | grep db_query_duration

# Métricas de cache
curl http://localhost:3001/metrics | grep cache_hits
```

---

## 🧪 Testing End-to-End

### Escenario 1: Flujo Completo de Producto

```bash
# 1. Crear categoría
CATEGORY_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Category",
    "description": "Test category description",
    "isActive": true
  }')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.data.id')
echo "Category ID: $CATEGORY_ID"

# 2. Crear producto en esa categoría
PRODUCT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -d "{
    \"sku\": \"E2E-TEST-001\",
    \"name\": \"E2E Test Product\",
    \"description\": \"End-to-end test product\",
    \"price\": 199.99,
    \"compareAtPrice\": 249.99,
    \"stockQuantity\": 50,
    \"categoryId\": \"$CATEGORY_ID\",
    \"isFeatured\": true,
    \"isNew\": true,
    \"onSale\": true
  }")

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | jq -r '.data.id')
echo "Product ID: $PRODUCT_ID"

# 3. Obtener el producto
curl -s http://localhost:3001/api/v1/products/$PRODUCT_ID | jq

# 4. Actualizar stock
curl -s -X PUT http://localhost:3001/api/v1/products/$PRODUCT_ID/stock \
  -H "Content-Type: application/json" \
  -d '{"quantity": 75}' | jq

# 5. Actualizar precio
curl -s -X PUT http://localhost:3001/api/v1/products/$PRODUCT_ID \
  -H "Content-Type: application/json" \
  -d '{"price": 179.99}' | jq

# 6. Verificar que aparece en productos destacados
curl -s http://localhost:3001/api/v1/products/featured | jq '.data[] | select(.id == "'$PRODUCT_ID'")'

# 7. Verificar que aparece en productos nuevos
curl -s http://localhost:3001/api/v1/products/new | jq '.data[] | select(.id == "'$PRODUCT_ID'")'

# 8. Verificar que aparece en productos en oferta
curl -s http://localhost:3001/api/v1/products/on-sale | jq '.data[] | select(.id == "'$PRODUCT_ID'")'

# 9. Buscar el producto
curl -s "http://localhost:3001/api/v1/products?search=E2E" | jq

# 10. Eliminar el producto
curl -s -X DELETE http://localhost:3001/api/v1/products/$PRODUCT_ID | jq

# 11. Verificar que fue eliminado (soft delete)
curl -s http://localhost:3001/api/v1/products/$PRODUCT_ID
# Debería devolver 404 Not Found
```

### Escenario 2: Validar Paginación

```bash
# Crear múltiples productos
for i in {1..25}; do
  curl -s -X POST http://localhost:3001/api/v1/products \
    -H "Content-Type: application/json" \
    -d "{
      \"sku\": \"BULK-$i\",
      \"name\": \"Bulk Product $i\",
      \"price\": $(( $i * 10 )),
      \"stockQuantity\": 100
    }" > /dev/null
  echo "Created product $i"
done

# Obtener primera página
curl -s "http://localhost:3001/api/v1/products?page=1&limit=10" | jq '.pagination'

# Obtener segunda página
curl -s "http://localhost:3001/api/v1/products?page=2&limit=10" | jq '.pagination'

# Verificar que hay 25+ productos
curl -s "http://localhost:3001/api/v1/products?page=1&limit=100" | jq '.pagination.totalItems'
```

### Escenario 3: Validar Filtros

```bash
# Filtrar por rango de precio
curl -s "http://localhost:3001/api/v1/products?priceMin=100&priceMax=200" | jq '.data[] | {name, price}'

# Ordenar por precio ascendente
curl -s "http://localhost:3001/api/v1/products?sortBy=price&sortOrder=asc&limit=5" | jq '.data[] | {name, price}'

# Ordenar por precio descendente
curl -s "http://localhost:3001/api/v1/products?sortBy=price&sortOrder=desc&limit=5" | jq '.data[] | {name, price}'
```

---

## 🐛 Troubleshooting

### Problema: Database connection failed

**Síntomas:**
```
❌ Failed to connect to database
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Soluciones:**
```bash
# 1. Verificar que PostgreSQL está corriendo
docker ps | grep postgres-product

# 2. Reiniciar contenedor
docker restart ecommerce-product-db

# 3. Verificar logs
docker logs ecommerce-product-db

# 4. Verificar DATABASE_URL en .env
cat services/product-service/.env | grep DATABASE_URL
```

### Problema: Redis connection failed

**Síntomas:**
```
Error: Redis connection refused
```

**Soluciones:**
```bash
# 1. Verificar que Redis está corriendo
docker ps | grep redis

# 2. Reiniciar contenedor
docker restart ecommerce-redis

# 3. Test de conexión
redis-cli -h localhost -p 6379 ping
```

### Problema: RabbitMQ connection failed

**Síntomas:**
```
Error: RabbitMQ connection refused
```

**Soluciones:**
```bash
# 1. Verificar que RabbitMQ está corriendo
docker ps | grep rabbitmq

# 2. Reiniciar contenedor
docker restart ecommerce-rabbitmq

# 3. Verificar logs
docker logs ecommerce-rabbitmq

# 4. Acceder a Management UI
open http://localhost:15672
```

### Problema: Prisma migrations failed

**Síntomas:**
```
Error: Migration failed
```

**Soluciones:**
```bash
# 1. Reset database (⚠️ DESTRUYE DATOS)
cd services/product-service
npx prisma migrate reset --force

# 2. Aplicar migraciones nuevamente
npx prisma migrate dev

# 3. Verificar estado de migraciones
npx prisma migrate status
```

### Problema: Port already in use

**Síntomas:**
```
Error: Port 3001 is already in use
```

**Soluciones:**
```bash
# 1. Encontrar proceso usando el puerto
lsof -i :3001

# 2. Matar proceso
kill -9 <PID>

# 3. O cambiar puerto en .env
PORT=3002
```

---

## ✅ Checklist Completo

### Infraestructura

- [ ] PostgreSQL Product DB corriendo y accesible
- [ ] PostgreSQL Order DB corriendo y accesible
- [ ] PostgreSQL Auth DB corriendo y accesible
- [ ] PostgreSQL Content DB corriendo y accesible
- [ ] PostgreSQL Inventory DB corriendo y accesible
- [ ] PostgreSQL Analytics DB corriendo y accesible
- [ ] Redis corriendo y respondiendo a PING
- [ ] RabbitMQ corriendo con Management UI accesible
- [ ] MinIO corriendo con Console accesible
- [ ] Keycloak corriendo y accesible
- [ ] Kong corriendo con Admin API accesible
- [ ] Todos los contenedores en la misma red Docker

### Product Service

- [ ] Dependencias instaladas
- [ ] Prisma client generado
- [ ] Migraciones aplicadas
- [ ] Base de datos seeded con datos de prueba
- [ ] Servicio inicia sin errores
- [ ] Health check responde correctamente
- [ ] Swagger UI accesible
- [ ] GET /api/v1/products funciona
- [ ] GET /api/v1/products/:id funciona
- [ ] GET /api/v1/products/slug/:slug funciona
- [ ] GET /api/v1/products/featured funciona
- [ ] GET /api/v1/products/new funciona
- [ ] GET /api/v1/products/on-sale funciona
- [ ] GET /api/v1/products/best-sellers funciona
- [ ] POST /api/v1/products funciona
- [ ] PUT /api/v1/products/:id funciona
- [ ] PUT /api/v1/products/:id/stock funciona
- [ ] DELETE /api/v1/products/:id funciona
- [ ] Paginación funciona correctamente
- [ ] Filtros funcionan correctamente
- [ ] Búsqueda funciona correctamente
- [ ] Eventos se publican a RabbitMQ
- [ ] Cache de Redis funciona
- [ ] Métricas de Prometheus expuestas

### Performance

- [ ] Respuestas de API < 200ms (promedio)
- [ ] Cache hit rate > 80%
- [ ] Sin memory leaks (ejecutar 1 hora)
- [ ] Manejo correcto de errores
- [ ] Logs estructurados en JSON

---

## 📊 Métricas de Éxito

### Criterios de Aceptación

1. **Disponibilidad**: 99.9% uptime
2. **Latencia**: p95 < 200ms, p99 < 500ms
3. **Throughput**: > 1000 requests/segundo
4. **Error Rate**: < 0.1%
5. **Cache Hit Rate**: > 80%

### Herramientas de Testing de Carga

```bash
# Instalar k6
brew install k6  # macOS
# o
choco install k6  # Windows
# o
apt install k6  # Linux

# Crear script de carga
cat > load-test.js <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '30s',
};

export default function() {
  const res = http.get('http://localhost:3001/api/v1/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
EOF

# Ejecutar test de carga
k6 run load-test.js
```

---

## 🎯 Próximos Pasos

Una vez que Product Service esté completamente validado:

1. **Implementar servicios restantes** usando Product Service como template
2. **Configurar OpenShift manifests** para deployment
3. **Setup CI/CD con Tekton**
4. **Implementar Frontend (Next.js)**
5. **Implementar Admin Panel (React)**
6. **Testing de integración entre servicios**
7. **Performance testing completo**
8. **Security audit**
9. **Documentation completa**
10. **Production deployment**

---

## 📚 Recursos Adicionales

- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials/tutorial-one-javascript.html)
- [Redis Documentation](https://redis.io/documentation)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [OpenShift Documentation](https://docs.openshift.com/)

---

## 🤝 Soporte

Si encuentras problemas durante la validación:

1. Revisa los logs de cada servicio
2. Verifica la configuración de .env
3. Consulta la sección de Troubleshooting
4. Revisa la documentación de cada componente
5. Crea un issue en GitHub con detalles completos

---

**¡Buena suerte con la validación! 🚀**
