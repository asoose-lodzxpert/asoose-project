# Asoose Customer Web App

A Next.js-based web application for managing customer orders, rides, and marketplace interactions.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn or npm
- Backend API running (see `backend/README.md`)

### Installation

1. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Or create .env.local for local development
   cp .env.example .env.local
   ```

3. **Update environment variables:**
   
   Edit `.env` or `.env.local` with your configuration:
   
   ```env
   # Backend API URL
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   
   # Google Maps API Key (required for maps features)
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
   
   # Supabase (legacy - optional if migrating from Supabase)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

4. **Run the development server:**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

5. **Open your browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend API endpoint | `http://localhost:3001/api` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | ✅ Yes | Google Maps API key for maps/geocoding | - |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ Optional | Supabase project URL (legacy) | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ Optional | Supabase anon key (legacy) | - |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Optional | App URL for redirects | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | ⚠️ Optional | Application name | `Asoose Customer Portal` |

### Getting API Keys

- **Google Maps API Key**: [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
  - Enable: Maps JavaScript API, Geocoding API, Places API, Directions API
  - Set billing (free tier available)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Customer dashboard
│   ├── super-admin/       # Admin panel
│   └── ...
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── providers/             # Context providers (Google Maps, etc.)
└── middleware.ts          # Next.js middleware (auth, etc.)
utils/
├── supabase/             # Supabase client utilities (legacy)
```

## 🔧 Available Scripts

```bash
# Development
yarn dev              # Start dev server on port 3000

# Production Build
yarn build            # Create optimized production build
yarn start            # Start production server

# Code Quality
yarn lint             # Run ESLint
yarn type-check       # Run TypeScript compiler check

# Testing
yarn test             # Run tests (if configured)
```

## 📦 Key Features

- **Customer Dashboard**: Order tracking, ride booking, profile management
- **Super Admin Panel**: User management, vendor verification, analytics
- **Real-time Updates**: WebSocket integration for live notifications
- **Google Maps Integration**: Address autocomplete, route visualization
- **Responsive Design**: Mobile-first, works on all devices

## 🔗 Related Projects

- **Backend API**: `../../backend` - NestJS backend service
- **Vendor App**: `../../apps/vendor-app` - Vendor mobile app
- **Rider App**: `../../apps/rider-app` - Rider mobile app
- **Customer App**: `../../apps/customer-app` - Customer mobile app

## 🐛 Troubleshooting

### Build fails with "prerender error"
- Ensure `.env` file exists with required variables
- Check that API endpoints are accessible
- For client-only pages, add `export const dynamic = 'force-dynamic'`

### Maps not loading
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set correctly
- Check Google Maps API is enabled in console
- Ensure billing is enabled (required for Maps API)

### API requests failing
- Confirm backend is running on the configured port
- Check `NEXT_PUBLIC_API_URL` matches backend URL
- Verify CORS is configured in backend for your domain

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

```bash
# Build the application
yarn build

# Start production server
yarn start
```

For more details, see [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## 📄 License

See main project LICENSE file.
