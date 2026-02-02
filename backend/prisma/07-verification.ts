// 06-verification.ts
import { prisma, PASSWORD_HASH, MAIDUGURI_COORDS } from './seed-utils';
import { VerificationStatus, UserRole, UserStatus } from '@prisma/client';

export async function seedVerificationQueue() {
  console.log('🌱 Seeding Verification Queue (Pending/Rejected docs)...');

  // --- 1. Pending Vendor (For Admin Approval) ---
  const pendingVendorEmail = 'vendor.pending@example.com';
  
  const pendingVendor = await prisma.vendor.upsert({
    where: { email: pendingVendorEmail },
    update: {},
    create: {
      email: pendingVendorEmail,
      password: PASSWORD_HASH,
      name: "Pending Pharmacy Ltd",
      phone: "+2348099999001",
      status: UserStatus.PENDING, // Not active yet
      countryCode: 'NG',
      businessType: 'PHARMACY',
      employees: '10+',
    }
  });

  // Upload Pending Documents
  await prisma.vendorDocument.createMany({
    data: [
      {
        vendorId: pendingVendor.id,
        name: "CAC Registration",
        fileName: "cac_cert.pdf",
        url: "https://placehold.co/600x800/png?text=CAC+Cert",
        status: VerificationStatus.PENDING
      },
      {
        vendorId: pendingVendor.id,
        name: "Pharmacy License",
        fileName: "license.pdf",
        url: "https://placehold.co/600x800/png?text=License",
        status: VerificationStatus.PENDING
      }
    ],
    skipDuplicates: true,
  });

  // --- 2. Rejected Rider (For Correction Flow) ---
  const rejectedRiderEmail = 'rider.rejected@example.com';

  const rejectedRider = await prisma.rider.upsert({
    where: { email: rejectedRiderEmail },
    update: {},
    create: {
      email: rejectedRiderEmail,
      name: "Rider Rejected",
      phone: "+2348099999002",
      password: PASSWORD_HASH,
      role: UserRole.RIDER,
      status: UserStatus.PENDING, // Stuck in pending due to rejection
      countryCode: 'NG',
      currentLat: MAIDUGURI_COORDS.lat,
      currentLng: MAIDUGURI_COORDS.lng,
    }
  });

  // Upload Rejected Documents
  // Note: RiderDocument uses 'type' instead of 'name'
  await prisma.riderDocument.createMany({
    data: [
      {
        riderId: rejectedRider.id,
        type: "DRIVER_LICENSE",
        url: "https://placehold.co/600x400/png?text=Blurry+License",
        status: VerificationStatus.REJECTED,
        // The schema might not have 'rejectionReason' on RiderDocument, 
        // checking schema... it is on UserDocument. 
        // For RiderDocument, status is the main indicator.
      },
      {
        riderId: rejectedRider.id,
        type: "VEHICLE_INSURANCE",
        url: "https://placehold.co/600x400/png?text=Valid+Insurance",
        status: VerificationStatus.VERIFIED // One valid, one invalid
      }
    ],
    skipDuplicates: true,
  });

  // --- 3. Expiring Documents (Optional: For Expiry Job Testing) ---
  // Attaching to an existing active rider
  const activeRider = await prisma.rider.findFirst({ where: { status: UserStatus.ACTIVE } });
  
  if (activeRider) {
    // Determine a date in the past for expiry
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    await prisma.riderDocument.create({
      data: {
        riderId: activeRider.id,
        type: "ROAD_WORTHINESS",
        url: "https://placehold.co/600x400/png?text=Expired+Doc",
        status: VerificationStatus.VERIFIED,
        // Ideally we would set expiresAt here if the schema supports it for RiderDocument.
        // Looking at schema: UserDocument has expiresAt. VehicleDocument has expiresAt.
        // RiderDocument does NOT have expiresAt in the provided schema.
        // We will add it to a VehicleDocument instead.
      }
    });
    
    // Check for vehicle
    const vehicle = await prisma.vehicle.findUnique({ where: { riderId: activeRider.id } });
    if (vehicle) {
      await prisma.vehicleDocument.create({
        data: {
          vehicleId: vehicle.id,
          type: "MOT_TEST",
          url: "https://placehold.co/600x400",
          expiresAt: lastMonth, // EXPIRED
        }
      });
    }
  }
}