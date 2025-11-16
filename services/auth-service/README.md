# Auth Service

Authentication and Authorization microservice with Keycloak integration for the e-commerce platform.

## 🎯 Features

### Core Authentication
- **User Registration** - Create new users with email verification
- **Login/Logout** - Username/password authentication via Keycloak
- **Token Management** - JWT access tokens and refresh tokens
- **Session Management** - Track active user sessions
- **Password Management** - Change password, reset password

### Keycloak Integration
- **Full Keycloak Integration** - Leverage Keycloak for identity management
- **SSO Support** - Single Sign-On capabilities
- **OAuth2/OIDC** - Standard protocols for authentication
- **Role-Based Access Control** - User roles and permissions
- **Social Login** - Support for OAuth providers (Google, GitHub, etc.)

### Security Features
- **Secure Password Storage** - Handled by Keycloak
- **Token Introspection** - Validate tokens with Keycloak
- **Session Tracking** - Monitor active sessions per user
- **Login History** - Track all login attempts
- **Rate Limiting** - Prevent brute force attacks
- **API Keys** - Service-to-service authentication

## 🏗️ Architecture

### Clean Architecture Pattern
```
src/
├── api/
│   ├── controllers/       # HTTP request handlers
│   ├── routes/           # Route definitions
│   ├── middleware/       # Custom middleware
│   └── validators/       # Request validation schemas
├── services/             # Business logic
├── repositories/         # Data access layer
├── clients/             # External service clients
│   └── keycloak.client.ts
├── config/              # Configuration
└── server.ts            # Application entry point
```

## 🗄️ Database Schema

### Core Models
- **User** - Local user cache (synced from Keycloak)
- **Session** - Active user sessions
- **RefreshToken** - Refresh token storage
- **LoginHistory** - Login attempt tracking
- **ApiKey** - API key management
- **RoleAssignment** - User role cache
- **OAuthProvider** - Social login connections

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Keycloak instance running
- Redis (for caching)
- RabbitMQ (for events)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start in development mode
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://authuser:authpass@localhost:5433/auth_db

# Keycloak
KEYCLOAK_URL=http://localhost:8180
KEYCLOAK_REALM=ecommerce
KEYCLOAK_CLIENT_ID=ecommerce-backend
KEYCLOAK_CLIENT_SECRET=your-client-secret

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
```

### Keycloak Setup

1. **Access Keycloak Admin Console**
   ```
   URL: http://localhost:8180
   Username: admin
   Password: admin
   ```

2. **Create Realm**
   - Create a new realm named `ecommerce`

3. **Create Client**
   - Client ID: `ecommerce-backend`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `http://localhost:*`
   - Copy the client secret to your `.env` file

4. **Create Roles**
   - admin
   - customer
   - vendor

5. **Create Test Users**
   - Create users via Admin Console
   - Assign roles to users
   - Set passwords

## 📡 API Endpoints

### Authentication

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "johndoe",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900,
      "sessionToken": "abc123..."
    }
  }
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "sessionToken": "abc123...",
  "refreshToken": "eyJhbGc..."
}
```

#### Validate Session
```http
POST /api/v1/auth/validate-session
Content-Type: application/json

{
  "sessionToken": "abc123..."
}
```

#### Validate Token
```http
POST /api/v1/auth/validate-token
Content-Type: application/json

{
  "accessToken": "eyJhbGc..."
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGc...
```

### Password Management

#### Change Password
```http
POST /api/v1/auth/users/:userId/change-password
Content-Type: application/json

{
  "oldPassword": "OldPass123",
  "newPassword": "NewPass123"
}
```

#### Request Password Reset
```http
POST /api/v1/auth/password-reset/request
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Session Management

#### Get User Sessions
```http
GET /api/v1/auth/users/:userId/sessions
```

#### Revoke All Sessions
```http
DELETE /api/v1/auth/users/:userId/sessions
```

## 🔧 Development

### Run Tests
```bash
npm test
```

### Run with Watch Mode
```bash
npm run dev
```

### Database Migrations
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ destroys data)
npx prisma migrate reset
```

### Prisma Studio
```bash
npx prisma studio
```

## 🐳 Docker

### Build Image
```bash
docker build -t auth-service:latest .
```

### Run Container
```bash
docker run -p 3002:3002 \
  -e DATABASE_URL=postgresql://... \
  -e KEYCLOAK_URL=http://keycloak:8080 \
  auth-service:latest
```

## 🔒 Security

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Token Security
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens are stored securely in database
- Revoked tokens are tracked

### Rate Limiting
- 100 requests per minute per IP
- Prevents brute force attacks
- Configurable via environment variables

## 📊 Monitoring

### Health Checks
- `GET /health` - General health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (checks DB)

### Metrics
- Request count and latency
- Authentication success/failure rates
- Active sessions count
- Token refresh rate

## 🔗 Integration with Other Services

### Service-to-Service Authentication

Other services can validate tokens by calling:
```http
POST /api/v1/auth/validate-token
Content-Type: application/json

{
  "accessToken": "token-from-request"
}
```

### Events Published

The service publishes events to RabbitMQ:
- `user.registered` - New user registered
- `user.login` - User logged in
- `user.logout` - User logged out
- `password.changed` - Password changed

## 🛠️ Troubleshooting

### Connection Issues

**Keycloak connection failed:**
```bash
# Check Keycloak is running
curl http://localhost:8180

# Verify realm exists
# Check Admin Console
```

**Database connection failed:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres-auth

# Test connection
psql postgresql://authuser:authpass@localhost:5433/auth_db
```

### Token Issues

**Token validation fails:**
- Ensure Keycloak is accessible
- Check client secret is correct
- Verify realm configuration

**Refresh token expired:**
- Tokens expire after 7 days by default
- User must login again

## 📝 API Documentation

Interactive API documentation available at:
```
http://localhost:3002/api-docs
```

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update API documentation
4. Follow TypeScript best practices

## 📄 License

MIT
