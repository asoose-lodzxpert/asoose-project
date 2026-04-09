import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Asserts that the given city is active.
 * Throws a 400 if the city ID is unknown or the city is inactive.
 * Use this in order placement, ride request, and any service-gated endpoint.
 */
export async function assertCityActive(
  cityId: string | null | undefined,
  prisma: PrismaService,
): Promise<void> {
  if (!cityId) {
    throw new BadRequestException(
      'Your area has not been set. Please select a city to continue.',
    );
  }
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) {
    throw new BadRequestException('City not found.');
  }
  if (!city.isActive) {
    throw new BadRequestException(
      `Service is not yet available in ${city.name}. We're expanding soon!`,
    );
  }
}

/**
 * Resolves a city record by name (case-insensitive).
 * Returns null if not found or not active.
 */
export async function resolveCityByName(
  name: string,
  prisma: PrismaService,
) {
  return prisma.city.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, isActive: true },
    select: { id: true, name: true, state: true },
  });
}
