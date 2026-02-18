// Runtime validation for fare estimate payload
export interface FareEstimatePayload {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
}

export const validateFareEstimatePayload: (payload: unknown) => asserts payload is FareEstimatePayload = (
  payload
) => {
  if (!payload || typeof payload !== 'object') throw new Error('Payload must be an object');
  if (
    typeof (payload as any).pickupLat !== 'number' ||
    typeof (payload as any).pickupLng !== 'number'
  )
    throw new Error('pickupLat/pickupLng must be numbers');
  if (
    typeof (payload as any).dropoffLat !== 'number' ||
    typeof (payload as any).dropoffLng !== 'number'
  )
    throw new Error('dropoffLat/dropoffLng must be numbers');
};
