import polyline from "@mapbox/polyline";

export async function getRouteCoordinates(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  apiKey: string
) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes || data.routes.length === 0) return [];

  const points = polyline.decode(data.routes[0].overview_polyline.points);
  return points.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
}
