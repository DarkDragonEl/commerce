/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3100',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
    KEYCLOAK_ID: process.env.KEYCLOAK_ID || 'ecommerce-backend',
    KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET || '',
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/ecommerce',
  },
};

module.exports = nextConfig;
