import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  const lat = 11.804972;
  const lng = 13.203166;
  
  console.log(`Checking coords: ${lat}, ${lng}`);
  
  const zones = await prisma.serviceZone.findMany();
  console.log(`Checking against ${zones.length} zones...`);
  
  for (const zone of zones) {
    const coords = zone.coordinates as { lat: number; lng: number }[];
    const isInside = pointInPolygon(lat, lng, coords);
    console.log(`- Zone "${zone.name}": ${isInside ? 'MATCH' : 'No match'}`);
  }
  
  const cities = await prisma.city.findMany();
  console.log('\nAvailable Cities:');
  console.table(cities);
}

main().finally(() => prisma.$disconnect());
