# E-Commerce Platform - OpenShift Deployment Guide

Complete guide for deploying the e-commerce microservices platform on Red Hat OpenShift 4.14+.

## 📋 Prerequisites

- OpenShift cluster 4.14 or higher
- `oc` CLI installed and configured
- Cluster admin access (for initial setup)
- GitHub account (for Tekton CI/CD)
- Docker/Podman for building images locally (optional)

## 🚀 Quick Start Deployment

### 1. Login to OpenShift

```bash
oc login https://api.your-cluster.com:6443
```

### 2. Create Namespace and Deploy Infrastructure

```bash
# Create namespace
oc apply -f k8s/infrastructure/namespace.yaml

# Deploy infrastructure
oc apply -f k8s/infrastructure/postgresql.yaml
oc apply -f k8s/infrastructure/redis.yaml
oc apply -f k8s/infrastructure/rabbitmq.yaml
oc apply -f k8s/infrastructure/keycloak.yaml
oc apply -f k8s/infrastructure/minio.yaml

# Wait for infrastructure to be ready
oc wait --for=condition=ready pod -l app=postgresql -n ecommerce --timeout=300s
oc wait --for=condition=ready pod -l app=redis -n ecommerce --timeout=60s
oc wait --for=condition=ready pod -l app=rabbitmq -n ecommerce --timeout=120s
oc wait --for=condition=ready pod -l app=keycloak -n ecommerce --timeout=180s
oc wait --for=condition=ready pod -l app=minio -n ecommerce --timeout=120s
```

### 3. Initialize Databases

```bash
# Create databases for each service
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE product_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE auth_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE order_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE payment_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE email_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE inventory_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE media_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE content_db;"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE DATABASE analytics_db;"

# Create users for each database
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE USER productuser WITH PASSWORD 'productpass';"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE product_db TO productuser;"

oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE USER authuser WITH PASSWORD 'authpass';"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE auth_db TO authuser;"

oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "CREATE USER orderuser WITH PASSWORD 'orderpass';"
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE order_db TO orderuser;"

# Repeat for other services...
```

### 4. Configure Keycloak

```bash
# Get Keycloak URL
echo "Keycloak URL: http://$(oc get route keycloak -n ecommerce -o jsonpath='{.spec.host}')"

# Access Keycloak Admin Console
# Username: admin
# Password: admin

# Create Realm:
# 1. Click "Add Realm"
# 2. Name: "ecommerce"
# 3. Click "Create"

# Create Client:
# 1. Clients → Create
# 2. Client ID: "ecommerce-backend"
# 3. Client Protocol: openid-connect
# 4. Access Type: confidential
# 5. Valid Redirect URIs: *
# 6. Save
# 7. Copy Client Secret from Credentials tab

# Update auth-service secret with the client secret
oc patch secret keycloak-secret -n ecommerce --type='json' -p='[{"op": "replace", "path": "/data/client-secret", "value":"'$(echo -n "YOUR_CLIENT_SECRET" | base64)'"}]'
```

### 5. Build and Push Service Images

```bash
# Option A: Build locally and push to OpenShift registry
oc project ecommerce

# Login to OpenShift registry
docker login -u $(oc whoami) -p $(oc whoami -t) default-route-openshift-image-registry.apps.your-cluster.com

# Build each service
for service in product-service auth-service order-service payment-service email-service inventory-service media-service content-service analytics-service; do
  echo "Building $service..."
  docker build -t default-route-openshift-image-registry.apps.your-cluster.com/ecommerce/$service:latest \
    -f services/$service/Dockerfile services/$service
  docker push default-route-openshift-image-registry.apps.your-cluster.com/ecommerce/$service:latest
done

# Option B: Use Tekton pipelines (see Tekton section below)
```

### 6. Deploy Microservices

```bash
# Deploy services
oc apply -f k8s/services/product-service.yaml
oc apply -f k8s/services/auth-service.yaml
oc apply -f k8s/services/order-service.yaml

# Verify deployments
oc get pods -n ecommerce
oc get svc -n ecommerce
```

### 7. Run Database Migrations

```bash
# For each service, run migrations
for service in product-service auth-service order-service payment-service email-service inventory-service media-service content-service analytics-service; do
  POD=$(oc get pod -l app=$service -n ecommerce -o jsonpath='{.items[0].metadata.name}')
  echo "Running migrations for $service..."
  oc exec $POD -n ecommerce -- npm run prisma:migrate
done
```

### 8. Deploy API Gateway

```bash
oc apply -f k8s/gateway/ingress.yaml

# Get API Gateway URL
echo "API Gateway: https://$(oc get route ecommerce-api -n ecommerce -o jsonpath='{.spec.host}')"
```

## 🔧 Tekton CI/CD Setup

### 1. Install Tekton

```bash
# Tekton is usually pre-installed on OpenShift as "OpenShift Pipelines"
# Verify installation
oc get pods -n openshift-pipelines
```

### 2. Deploy Tekton Resources

```bash
# Create tasks
oc apply -f tekton/tasks/build-push-task.yaml
oc apply -f tekton/tasks/prisma-migrate-task.yaml

# Create pipelines
oc apply -f tekton/pipelines/product-service-pipeline.yaml

# Create triggers for GitHub webhooks
oc apply -f tekton/triggers/github-webhook.yaml
```

### 3. Configure GitHub Webhook

```bash
# Get webhook URL
echo "Webhook URL: https://$(oc get route github-webhook -n ecommerce -o jsonpath='{.spec.host}')"

# In GitHub repository settings:
# 1. Settings → Webhooks → Add webhook
# 2. Payload URL: [webhook URL from above]
# 3. Content type: application/json
# 4. Secret: [your secret token]
# 5. Events: Just the push event
# 6. Active: ✓
# 7. Add webhook
```

### 4. Create GitHub Secret

```bash
# Create secret for webhook validation
oc create secret generic github-secret \
  --from-literal=secretToken=YOUR_WEBHOOK_SECRET \
  -n ecommerce
```

## 📊 Monitoring Setup

### 1. Deploy Prometheus

```bash
# OpenShift includes Prometheus by default
# Configure ServiceMonitors for each service

cat <<EOF | oc apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: product-service
  namespace: ecommerce
spec:
  selector:
    matchLabels:
      app: product-service
  endpoints:
  - port: http
    path: /metrics
EOF
```

### 2. Deploy Grafana

```bash
# Install Grafana Operator
oc apply -f https://raw.githubusercontent.com/grafana-operator/grafana-operator/master/deploy/manifests/latest/grafana-operator.yaml

# Create Grafana instance
cat <<EOF | oc apply -f -
apiVersion: integreatly.org/v1alpha1
kind: Grafana
metadata:
  name: grafana
  namespace: ecommerce
spec:
  ingress:
    enabled: true
  config:
    auth:
      disable_login_form: false
    security:
      admin_user: admin
      admin_password: admin
EOF
```

## 🔐 Security Best Practices

### 1. Update Default Passwords

```bash
# Update PostgreSQL password
oc patch secret postgresql-secret -n ecommerce --type='json' \
  -p='[{"op": "replace", "path": "/data/password", "value":"'$(echo -n "NEW_SECURE_PASSWORD" | base64)'"}]'

# Restart PostgreSQL
oc rollout restart statefulset/postgresql -n ecommerce
```

### 2. Configure Network Policies

```bash
cat <<EOF | oc apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-api-gateway
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
EOF
```

### 3. Enable TLS for Services

```bash
# Generate TLS certificates (use cert-manager in production)
oc create secret tls ecommerce-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n ecommerce
```

## 📈 Scaling

### Horizontal Pod Autoscaling

```bash
# Create HPA for product-service
oc autoscale deployment product-service \
  --min=2 --max=10 \
  --cpu-percent=70 \
  -n ecommerce

# Verify HPA
oc get hpa -n ecommerce
```

### Vertical Scaling

```bash
# Increase resources for a service
oc set resources deployment/product-service \
  --requests=cpu=500m,memory=512Mi \
  --limits=cpu=1000m,memory=1Gi \
  -n ecommerce
```

## 🧪 Testing Deployment

### 1. Health Checks

```bash
# Check all pods are running
oc get pods -n ecommerce

# Test health endpoints
API_URL=$(oc get route ecommerce-api -n ecommerce -o jsonpath='{.spec.host}')

curl https://$API_URL/api/v1/products/health
curl https://$API_URL/api/v1/auth/health
curl https://$API_URL/api/v1/orders/health
```

### 2. API Testing

```bash
# Register user
curl -X POST https://$API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!"
  }'

# Login
curl -X POST https://$API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testuser",
    "password": "Test123!"
  }'

# List products
curl https://$API_URL/api/v1/products
```

## 🔄 Updates and Rollbacks

### Rolling Update

```bash
# Update service image
oc set image deployment/product-service \
  product-service=ecommerce/product-service:v2.0 \
  -n ecommerce

# Watch rollout
oc rollout status deployment/product-service -n ecommerce
```

### Rollback

```bash
# Rollback to previous version
oc rollout undo deployment/product-service -n ecommerce

# Rollback to specific revision
oc rollout undo deployment/product-service --to-revision=3 -n ecommerce
```

## 🗑️ Cleanup

```bash
# Delete all resources
oc delete project ecommerce

# Or delete specific components
oc delete -f k8s/services/
oc delete -f k8s/infrastructure/
oc delete -f k8s/gateway/
```

## 📚 Additional Resources

- [OpenShift Documentation](https://docs.openshift.com/)
- [Tekton Documentation](https://tekton.dev/docs/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Kong Gateway Documentation](https://docs.konghq.com/)

## 🆘 Troubleshooting

### Pod Not Starting

```bash
# Check pod events
oc describe pod POD_NAME -n ecommerce

# Check logs
oc logs POD_NAME -n ecommerce

# Check previous logs (if pod crashed)
oc logs POD_NAME --previous -n ecommerce
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
oc exec -it postgresql-0 -n ecommerce -- psql -U postgres -d product_db -c "\conninfo"

# Check service DNS
oc exec -it POD_NAME -n ecommerce -- nslookup postgresql
```

### Image Pull Errors

```bash
# Check image pull secrets
oc get secrets -n ecommerce | grep docker

# Verify image exists
oc describe deployment product-service -n ecommerce | grep Image
```

## 📞 Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/commerce/issues
- Documentation: See individual service READMEs
- OpenShift Support: Red Hat Support Portal

---

**Production Checklist:**

- [ ] All default passwords changed
- [ ] TLS certificates configured
- [ ] Network policies applied
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Resource limits tuned for production
- [ ] Security scanning completed
- [ ] Performance testing passed
- [ ] Documentation updated

**Deployment Complete! 🎉**
