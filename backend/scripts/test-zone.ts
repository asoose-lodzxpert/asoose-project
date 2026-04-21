import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Point-in-polygon test (Copy from MapsService for verifying) */
function pointInPolygon(lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

async function test(lat: number, lng: number, label: string) {
  const zones = await prisma.serviceZone.findMany({ where: { isActive: true } });
  let found = false;
  for (const zone of zones) {
    if (pointInPolygon(lat, lng, zone.coordinates as any)) {
      console.log(`[PASS] ${label} (${lat}, ${lng}) is INSIDE zone: ${zone.name}`);
      found = true;
      break;
    }
  }
  if (!found) console.log(`[FAIL] ${label} (${lat}, ${lng}) is OUTSIDE all zones`);
}

async function main() {
  console.log("Verifying Abuja Expanded Zone...");
  
  // Abuja Central
  await test(9.0765, 7.3986, "Abuja Central");
  
  // Karu
  await test(9.0180, 7.6253, "Karu");
  
  // Keffi
  await test(8.8471, 7.8736, "Keffi");
  
  // Outside (e.g., Lokoja area)
  await test(7.80, 6.73, "Lokoja (Should be out)");
}

main().finally(() => prisma.$disconnect());
