# Supabase Removal Guide

## Overview

This guide documents the complete removal of Supabase dependencies from the authentication flow and storage system, while keeping the PostgreSQL database connection.

## Changes Made

### 1. JWT Authentication ✅

**Before:** Used `SUPABASE_JWT_SECRET_KEY` for JWT token signing and verification
**After:** Uses `JWT_SECRET` for custom JWT implementation

#### Files Modified:

- `backend/src/auth/auth.module.ts` - Updated JwtModule configuration
- `backend/src/auth/jwt-strategy.ts` - Removed Supabase-specific JWT validation
- `backend/src/notifications/notifications.gateway.ts` - Updated WebSocket JWT verification

#### Changes:

```typescript
// Before
secret: configService.get<string>("SUPABASE_JWT_SECRET_KEY");

// After
secret: configService.get<string>("JWT_SECRET");
signOptions: {
  expiresIn: "7d";
}
```

### 2. File Storage ✅

**Before:** Used Supabase Storage for file uploads
**After:** Local filesystem storage with optional S3/Cloudinary support

#### Files Modified:

- `backend/src/storage/storage.service.ts` - Complete rewrite
- `backend/src/main.ts` - Added static file serving

#### Storage Options:

1. **Local Storage (Default - FREE)**
   - Files stored in `./uploads` directory
   - Served via `/uploads/*` route
   - Perfect for development

2. **AWS S3 (Production)**
   - Requires `@aws-sdk/client-s3` package
   - Uncomment S3 code in `storage.service.ts`
   - Configure AWS credentials in `.env`

3. **Cloudinary (Free Tier Available)**
   - Requires `cloudinary` package
   - Uncomment Cloudinary code in `storage.service.ts`
   - Configure Cloudinary credentials in `.env`

### 3. Environment Variables ✅

#### Removed Variables:

```bash
SUPABASE_URL
SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET_KEY  # Replaced with JWT_SECRET
SUPABASE_BUCKET          # Replaced with STORAGE_TYPE/STORAGE_PATH
```

#### Added Variables:

```bash
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# File Storage
STORAGE_TYPE=local  # Options: local, s3, cloudinary
STORAGE_PATH=./uploads
BACKEND_URL=http://localhost:3000
```

### 4. Database Connection ✅

**PostgreSQL connection remains unchanged** - You can still use Supabase's PostgreSQL database or any other PostgreSQL instance.

```bash
# Supabase PostgreSQL (Still works!)
DATABASE_URL=postgres://postgres.ffyfvbgcbvbgnmopmmhi:password@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgres://postgres.ffyfvbgcbvbgnmopmmhi:password@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# Or any other PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

### 5. Notifications ✅

**WebSocket notifications work exactly the same** - No changes needed. The notification service uses:

- WebSocket Gateway (built-in NestJS)
- Prisma for storing notifications in PostgreSQL
- No Supabase Realtime dependency

### 6. Push Notifications (Free Alternative) 📱

**Recommended: Firebase Cloud Messaging (FCM)**

- Completely FREE
- Works with iOS, Android, and Web
- Already integrated in your project

#### Setup FCM:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/Select your project
3. Go to Project Settings > Cloud Messaging
4. Copy Server Key and Project ID
5. Add to `.env`:

```bash
FCM_SERVER_KEY=your-firebase-server-key
FCM_PROJECT_ID=your-firebase-project-id
```

#### FCM is already configured in:

- `backend/src/notifications/` - Backend notification service
- User model has `fcmToken` field
- Vendor model has `fcmToken` and `expoPushToken` fields

## Migration Steps

### Step 1: Update Environment Variables

```bash
cd backend
cp .env .env.backup  # Backup your current .env
```

Edit `.env`:

```bash
# Replace these lines:
- SUPABASE_JWT_SECRET_KEY=your-key
- SUPABASE_BUCKET=vendor-documents
- SUPABASE_URL=...
- SUPABASE_KEY=...

# With these:
+ JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
+ JWT_EXPIRES_IN=7d
+ JWT_REFRESH_SECRET=your-refresh-secret
+ JWT_REFRESH_EXPIRES_IN=30d
+ STORAGE_TYPE=local
+ STORAGE_PATH=./uploads
+ BACKEND_URL=http://localhost:3000
```

### Step 2: Install Dependencies (No Changes Needed)

No new dependencies required for local storage. Only if you want S3 or Cloudinary:

```bash
# For AWS S3 (optional)
npm install @aws-sdk/client-s3

# For Cloudinary (optional)
npm install cloudinary
```

### Step 3: Create Uploads Directory

```bash
mkdir -p backend/uploads
```

### Step 4: Uninstall Supabase Package (Optional)

```bash
cd backend
npm uninstall @supabase/supabase-js
```

### Step 5: Restart Backend

```bash
cd backend
npm run start:dev
```

## Testing

### Test File Upload

```bash
curl -X POST http://localhost:3000/v1/api/storage/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.jpg"
```

### Test File Access

Files uploaded will be accessible at:

```
http://localhost:3000/uploads/1234567890-abc123.jpg
```

### Test JWT Authentication

```bash
curl -X POST http://localhost:3000/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## Production Deployment

### Recommended Setup:

1. **Database**: Keep Supabase PostgreSQL or migrate to AWS RDS
2. **Storage**: Use AWS S3 for file storage
3. **Notifications**: Use Firebase Cloud Messaging (FCM)
4. **JWT**: Use strong, unique secrets (min 32 characters)

### Environment Variables for Production:

```bash
NODE_ENV=production
JWT_SECRET=<generate-strong-secret-min-64-chars>
JWT_REFRESH_SECRET=<generate-different-strong-secret>

# Storage - AWS S3
STORAGE_TYPE=s3
AWS_S3_BUCKET=asoose-uploads-prod
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>

# Database - Keep Supabase or use RDS
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Push Notifications
FCM_SERVER_KEY=<your-fcm-key>
FCM_PROJECT_ID=<your-project-id>
```

## Benefits of Removing Supabase

### ✅ Advantages:

1. **Full Control** - Complete control over authentication logic
2. **No Vendor Lock-in** - Can switch storage providers easily
3. **Cost Savings** - Local storage free, S3 cheaper than Supabase Storage
4. **Flexibility** - Easy to add custom auth features
5. **Portability** - Can deploy anywhere without Supabase dependency

### 🔄 What Still Works:

1. **PostgreSQL Database** - Can still use Supabase's PostgreSQL
2. **WebSocket Notifications** - Built-in NestJS Gateway
3. **Push Notifications** - FCM (completely free)
4. **File Uploads** - Local/S3/Cloudinary
5. **JWT Authentication** - Custom implementation

### ❌ What We Removed:

1. Supabase Auth - Replaced with custom JWT
2. Supabase Storage - Replaced with local/S3/Cloudinary
3. Supabase Realtime - Already using WebSockets, no change needed

## Troubleshooting

### Issue: "JWT_SECRET is not defined"

**Solution:** Add `JWT_SECRET` to your `.env` file

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution:** Run `npm uninstall @supabase/supabase-js` or remove from package.json

### Issue: "Uploads folder not found"

**Solution:** Create it: `mkdir -p backend/uploads`

### Issue: "Files not accessible"

**Solution:** Ensure `BACKEND_URL` is set correctly and static serving is configured in `main.ts`

### Issue: "S3 upload failing"

**Solution:**

1. Install AWS SDK: `npm install @aws-sdk/client-s3`
2. Uncomment S3 code in `storage.service.ts`
3. Configure AWS credentials in `.env`

## Next Steps

### TODO: Implement Complete Auth Service

The auth service (`backend/src/auth/auth.service.ts`) currently has placeholder methods. You should implement:

1. **User Registration**
   - Hash passwords with bcrypt
   - Create user in database
   - Generate JWT token

2. **User Login**
   - Validate credentials
   - Compare hashed passwords
   - Return JWT token

3. **Password Reset**
   - Generate reset token
   - Send email with reset link
   - Update password

4. **Refresh Tokens**
   - Implement refresh token rotation
   - Store refresh tokens in database or Redis

Example implementation:

```typescript
// backend/src/auth/auth.service.ts
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

async registerUser(dto: CreateUserDto) {
  const hashedPassword = await bcrypt.hash(dto.password, 10);

  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: 'CUSTOMER',
    },
  });

  const token = this.jwtService.sign({ sub: user.id, email: user.email });

  return { user, token };
}

async loginUser(email: string, password: string) {
  const user = await this.prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const token = this.jwtService.sign({ sub: user.id, email: user.email });

  return { user, token };
}
```

## Support

For questions or issues:

1. Check this guide first
2. Review the code changes in the modified files
3. Test with the provided curl commands
4. Check environment variables are set correctly

## Summary

✅ **Completed:**

- Removed Supabase from authentication flow
- Replaced Supabase Storage with local/S3/Cloudinary
- Updated all environment variables
- Documented all changes
- Kept PostgreSQL database connection (can still use Supabase's DB)

🚀 **Benefits:**

- Full control over authentication
- No vendor lock-in
- Cost savings
- Easier to deploy and scale
- Free push notifications with FCM

📝 **No Changes Needed:**

- Database connection (still works with Supabase PostgreSQL)
- WebSocket notifications (already using NestJS)
- Push notifications (using FCM, not Supabase)
