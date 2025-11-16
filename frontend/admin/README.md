# Admin Panel

Administrative dashboard for managing the e-commerce platform.

## Features

- **Dashboard**: Overview with key metrics and recent orders
- **Product Management**: CRUD operations for products and categories
- **Order Management**: View and update order status, track shipments
- **User Management**: View registered users and their details
- **Blog Management**: Create and manage blog posts
- **Analytics**: Sales reports and metrics visualization
- **Role-Based Access**: Admin-only access control
- **Responsive Design**: Modern UI with Tailwind CSS

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: Zustand
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

## Prerequisites

- Node.js 20+
- npm or yarn
- Backend API running
- Admin user account

## Environment Variables

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:8000
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3200](http://localhost:3200) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Docker

Build and run with Docker:

```bash
docker build -t admin-panel .
docker run -p 8080:80 admin-panel
```

## Project Structure

```
src/
├── App.tsx                # Main app component with routes
├── main.tsx               # Application entry point
├── components/            # Reusable components
│   └── layout/            # Layout components
│       └── Layout.tsx     # Main layout with sidebar
├── pages/                 # Page components
│   ├── Dashboard.tsx      # Dashboard overview
│   ├── Login.tsx          # Admin login
│   ├── Analytics.tsx      # Analytics and charts
│   ├── products/          # Product pages
│   ├── orders/            # Order pages
│   ├── users/             # User pages
│   └── blog/              # Blog pages
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   └── utils.ts          # Helper functions
├── store/                 # Zustand stores
│   └── auth.ts           # Authentication state
└── types/                 # TypeScript types
    └── index.ts          # Shared types
```

## Features Detail

### Dashboard
- Key metrics (products, orders, users, revenue)
- Recent orders table
- Quick navigation

### Product Management
- Product list with search and pagination
- Create/edit products
- Category management
- Stock tracking
- Image management

### Order Management
- Order list with status filtering
- Order details view
- Status updates
- Shipping tracking

### User Management
- User list with role indicators
- Email verification status
- User details

### Blog Management
- Post list with status (draft/published/archived)
- Rich content editor
- Auto-slug generation
- Excerpt management

### Analytics
- Sales charts (Recharts)
- Event tracking metrics
- Conversion analytics
- Sales reports

## Deployment

### OpenShift/Kubernetes

Deploy using the provided manifest:

```bash
kubectl apply -f k8s/frontend/admin-panel.yaml
```

### Environment Configuration

For production, update the nginx configuration to point to your API gateway:

```nginx
location /api {
    proxy_pass https://api.your-domain.com;
}
```

## Security

- Admin-only access enforced
- JWT token authentication
- Role-based authorization
- Automatic token refresh
- Secure HTTP-only cookies (recommended for production)

## Contributing

1. Follow TypeScript best practices
2. Use proper type definitions
3. Validate forms with Zod schemas
4. Handle errors gracefully
5. Test responsive design
6. Maintain accessibility standards

## License

Proprietary - All rights reserved
