import {
  Address,
  DeliveryQuote,
  LocationPoint,
  PackageOptions,
  PackageSize,
} from "@/types/delivery";

/* Delivery pricing utilities moved from delivery.service.ts */
export const RATE_PER_KM = 300; // Naira per km

export function calculatePrice(
  distanceKm: number,
  packageSize: PackageSize,
  weightKg: number,
  packageOptions?: PackageOptions,
  ratePerKm = RATE_PER_KM
) {
  // base by distance
  const base = distanceKm * ratePerKm;

  // size multiplier
  let sizeMultiplier = 1;
  if (packageSize === "medium") sizeMultiplier = 1.2;
  if (packageSize === "large") sizeMultiplier = 1.5;

  // weight surcharge: small allowance for up to 5kg, then charge N50 per extra kg
  const extraKg = Math.max(0, weightKg - 5);
  const weightSurcharge = Math.round(extraKg * 50);

  // options-based surcharges
  const fragile = packageOptions?.fragile ?? false;
  const containsLiquid = packageOptions?.containsLiquid ?? false;
  const perishable = packageOptions?.perishable ?? false;
  const declaredValueRaw = packageOptions?.declaredValue ?? "";
  const declaredValue = Number(declaredValueRaw) || 0;

  // fragile surcharge: 10% of (base * sizeMultiplier)
  const fragileSurcharge = fragile
    ? Math.round(base * sizeMultiplier * 0.1)
    : 0;

  // liquid surcharge: flat N200
  const liquidSurcharge = containsLiquid ? 200 : 0;

  // perishable surcharge: 15% of (base * sizeMultiplier)
  const perishableSurcharge = perishable
    ? Math.round(base * sizeMultiplier * 0.15)
    : 0;

  // insurance / declared value fee: 1% of declared value (min 0)
  const insuranceFee = declaredValue > 0 ? Math.round(declaredValue * 0.01) : 0;

  const price = Math.round(
    base * sizeMultiplier +
      weightSurcharge +
      fragileSurcharge +
      liquidSurcharge +
      perishableSurcharge +
      insuranceFee
  );
  // Helper to normalize numbers to 2 decimal places (except coords)
  const toTwo = (v: number) => Number(v.toFixed(2));

  return {
    price: toTwo(price),
    distanceKm: toTwo(distanceKm),
    sizeMultiplier: toTwo(sizeMultiplier),
    weightSurcharge: toTwo(weightSurcharge),
    fragileSurcharge: toTwo(fragileSurcharge),
    liquidSurcharge: toTwo(liquidSurcharge),
    perishableSurcharge: toTwo(perishableSurcharge),
    insuranceFee: toTwo(insuranceFee),
    declaredValue: toTwo(declaredValue),
    base: toTwo(base),
  };
}

export function formatCurrency(n: number) {
  // show two decimal places for consistency
  return `₦${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function fetchSavedAddresses(): Promise<Address[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve([
        {
          id: "home",
          label: "Home",
          fullAddress: "12 Admiralty Way, Lekki",
          coords: { latitude: 6.4474, longitude: 3.4726 },
        },
        {
          id: "work",
          label: "Work",
          fullAddress: "Victoria Island, Lagos",
          coords: { latitude: 6.4281, longitude: 3.4219 },
        },
      ]);
    }, 500)
  );
}

export async function fetchDeliveryQuote(
  pickup: LocationPoint,
  dropoff: LocationPoint,
  packageSize: PackageSize,
  packageOptions: PackageOptions
): Promise<DeliveryQuote> {
  // Try to compute distance & ETA from a Maps API (Google Distance Matrix) if
  // an API key is provided via environment, otherwise fall back to a local
  // haversine estimate and a simple speed-based ETA approximation.
  return new Promise(async (resolve) => {
    try {
      const coordsA = pickup?.address?.coords;
      const coordsB = dropoff?.address?.coords;

      let distanceKm = 0;
      let etaMinutes = 0;

      const MAPS_KEY =
        typeof process !== "undefined"
          ? (process.env.GOOGLE_MAPS_API_KEY as string | undefined)
          : undefined;

      // Helper: haversine distance (km)
      function haversineKm(
        a: { latitude: number; longitude: number },
        b: { latitude: number; longitude: number }
      ) {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371; // earth radius km
        const dLat = toRad(b.latitude - a.latitude);
        const dLon = toRad(b.longitude - a.longitude);
        const lat1 = toRad(a.latitude);
        const lat2 = toRad(b.latitude);

        const sinDLat = Math.sin(dLat / 2);
        const sinDLon = Math.sin(dLon / 2);
        const aHarv =
          sinDLat * sinDLat +
          sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
        return R * c;
      }

      if (coordsA && coordsB) {
        if (MAPS_KEY) {
          try {
            const origins = `${coordsA.latitude},${coordsA.longitude}`;
            const destinations = `${coordsB.latitude},${coordsB.longitude}`;
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
              origins
            )}&destinations=${encodeURIComponent(destinations)}&key=${MAPS_KEY}`;

            const resp = await fetch(url);
            if (resp.ok) {
              const body = await resp.json();
              const elem = body?.rows?.[0]?.elements?.[0];
              const meters = elem?.distance?.value as number | undefined;
              const seconds = elem?.duration?.value as number | undefined;
              if (typeof meters === "number")
                distanceKm = Math.max(0, meters / 1000);
              if (typeof seconds === "number")
                etaMinutes = Math.max(1, Math.ceil(seconds / 60));
            }
          } catch (e) {
            // ignore maps errors and fallback to haversine below
          }
        }

        // fallback to haversine if maps not used or failed
        if (!distanceKm) {
          distanceKm = haversineKm(coordsA, coordsB);
        }
      } else {
        // no coords provided — fall back to a small default
        distanceKm = 1.5;
      }

      // If ETA wasn't filled by Maps API, estimate using average speed 30 km/h
      if (!etaMinutes) {
        const avgSpeedKmh = 30;
        etaMinutes = Math.max(
          1,
          Math.ceil((distanceKm / avgSpeedKmh) * 60 + 5)
        );
      }

      const weightKg = packageOptions?.weightKg ?? 0;
      const estimate = calculatePrice(
        distanceKm,
        packageSize,
        weightKg,
        packageOptions
      );

      // normalize numeric outputs to 2 decimal places (coords remain untouched)
      const toTwo = (v: number) => Number(v.toFixed(2));
      const outDistance = toTwo(distanceKm);
      const outEta = toTwo(etaMinutes);
      // simulate small request latency similar to earlier mock
      setTimeout(() => {
        resolve({
          distanceKm: outDistance,
          etaMinutes: outEta,
          price: toTwo(estimate.price),
        });
      }, 250);
    } catch (err) {
      // worst-case fallback to original mock values
      const distanceKm = 7.4;
      const etaMinutes = 32;
      const weightKg = packageOptions?.weightKg ?? 0;
      const estimate = calculatePrice(
        distanceKm,
        packageSize,
        weightKg,
        packageOptions
      );
      const toTwo = (v: number) => Number(v.toFixed(2));
      setTimeout(() => {
        resolve({
          distanceKm: toTwo(distanceKm),
          etaMinutes: toTwo(etaMinutes),
          price: toTwo(estimate.price),
        });
      }, 250);
    }
  });
}
