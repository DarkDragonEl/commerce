# Customer Frontend

Modern e-commerce storefront built with Next.js 14 and TypeScript.

## Features

- **Product Catalog**: Browse products with search and filtering
- **Shopping Cart**: Add products to cart with quantity management
- **User Authentication**: Sign in/sign up with Keycloak integration
- **Checkout**: Complete purchase flow with address and payment
- **Order History**: View past orders and track shipments
- **Blog**: Read blog posts from the content service
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript support
- **State Management**: Zustand for cart and auth state
- **Form Validation**: React Hook Form with Zod schemas

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Prerequisites

- Node.js 20+
- npm or yarn
- Backend API running

## Environment Variables

Create a `.env.local` file:

```env
API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3100
NEXTAUTH_SECRET=your-secret-key
KEYCLOAK_ID=ecommerce-backend
KEYCLOAK_SECRET=your-client-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/ecommerce
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3100](http://localhost:3100) in your browser.

## Build

```bash
npm run build
npm start
```

## Docker

Build and run with Docker:

```bash
docker build -t customer-frontend .
docker run -p 3100:3100 \
  -e API_URL=http://api-gateway:8000 \
  customer-frontend
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home page
│   ├── products/          # Product listing and details
│   ├── cart/              # Shopping cart
│   ├── checkout/          # Checkout flow
│   ├── orders/            # Order history
│   ├── auth/              # Sign in/sign up
│   ├── account/           # User account
│   └── blog/              # Blog posts
├── components/            # Reusable components
│   ├── layout/            # Layout components
│   └── products/          # Product components
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   └── utils.ts          # Helper functions
├── store/                 # Zustand stores
│   ├── cart.ts           # Shopping cart state
│   └── auth.ts           # Authentication state
└── types/                 # TypeScript types
    └── index.ts          # Shared types
```

## API Integration

The frontend integrates with the following backend services:

- **Product Service**: Product catalog and categories
- **Auth Service**: User authentication and registration
- **Order Service**: Order creation and management
- **Payment Service**: Payment processing
- **Content Service**: Blog posts
- **Inventory Service**: Stock checking

All API calls go through the API Gateway at `/api/v1/*`.

## Features Detail

### Product Catalog
- Grid view with images and prices
- Search functionality
- Category filtering
- Pagination

### Shopping Cart
- Add/remove items
- Quantity adjustment
- Price calculation
- Free shipping threshold

### Checkout
- Address forms with validation
- Order summary
- Payment integration (Stripe)
- Order confirmation

### User Account
- Profile management
- Address book
- Order history
- Order tracking

## Deployment

### OpenShift/Kubernetes

Deploy using the provided manifest:

```bash
kubectl apply -f k8s/frontend/customer-frontend.yaml
```

### Environment Configuration

For production, update environment variables:

```yaml
env:
  - name: API_URL
    value: "https://api.your-domain.com"
  - name: NEXTAUTH_URL
    value: "https://shop.your-domain.com"
  - name: KEYCLOAK_ISSUER
    value: "https://keycloak.your-domain.com/realms/ecommerce"
```

## Contributing

1. Follow TypeScript best practices
2. Use proper type definitions
3. Validate forms with Zod schemas
4. Handle errors gracefully
5. Test responsive design
6. Optimize images and assets

## License

Proprietary - All rights reserved
