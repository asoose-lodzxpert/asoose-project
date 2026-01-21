# Asoose Customer Web App

A Next.js-based web application for managing customer orders, rides, and marketplace interactions with NextAuth.js authentication.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- Backend API running (see `backend/README.md`)
- Google OAuth credentials (for social sign-in)

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
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

   # NextAuth Configuration
   NEXTAUTH_SECRET=your-generated-secret-key  # Generate: openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3001

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Google Maps API Key (required for maps features)
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
   ```

4. **Run the development server:**

   ```bash
   yarn dev
   # or
   npm run dev
   ```

5. **Open your browser:**

   Navigate to [http://localhost:3001](http://localhost:3001)

## 📋 Environment Variables

| Variable                      | Required    | Description                             | Default                        |
| ----------------------------- | ----------- | --------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`         | ✅ Yes      | Backend API endpoint                    | `http://localhost:3000/api/v1` |
| `NEXTAUTH_SECRET`             | ✅ Yes      | Secret for NextAuth.js token encryption | -                              |
| `NEXTAUTH_URL`                | ✅ Yes      | Your app URL (auto-detected in dev)     | `http://localhost:3001`        |
| `GOOGLE_CLIENT_ID`            | ✅ Yes      | Google OAuth Client ID                  | -                              |
| `GOOGLE_CLIENT_SECRET`        | ✅ Yes      | Google OAuth Client Secret              | -                              |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | ✅ Yes      | Google Maps API key for maps/geocoding  | -                              |
| `NEXT_PUBLIC_APP_URL`         | ⚠️ Optional | App URL for redirects                   | `http://localhost:3000`        |
| `NEXT_PUBLIC_APP_NAME`        | ⚠️ Optional | Application name                        | `Asoose Customer Portal`       |

### Getting API Keys

#### Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy **Client ID** and **Client Secret**

#### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Enable: Maps JavaScript API, Geocoding API, Places API, Directions API
3. Create API key in **Credentials**
4. Set billing (free tier available)

#### NextAuth Secret

Generate a secure secret:

```bash
openssl rand -base64 32
```

## 🔐 Authentication

This app uses **NextAuth.js v5** for authentication with:

- **Google OAuth**: Social sign-in with Google accounts
- **Credentials**: Email/password authentication via backend API
- **JWT Sessions**: Stateless session management
- **Backend Integration**: All user data stored in backend database

### Authentication Flow

1. User signs in with Google or credentials
2. NextAuth.js validates credentials
3. Backend API creates/updates user and returns JWT
4. Frontend stores JWT in NextAuth session
5. Protected routes use JWT for API requests

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/auth/          # NextAuth.js API routes
│   ├── dashboard/         # Customer dashboard
│   ├── sign-in/           # Sign-in page
│   └── ...
├── auth.ts                # NextAuth.js configuration
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── providers/             # Context providers (Google Maps, etc.)
├── middleware.ts          # Next.js middleware (auth, protected routes)
└── types/                 # TypeScript type definitions
```

## 🔧 Available Scripts

```bash
# Development
yarn dev              # Start dev server on port 3001

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
