import * as Location from "expo-location";

export  async function resolveAddress(coords: Location.LocationObjectCoords) {
    try {
      const res = await Location.reverseGeocodeAsync(coords);
      if (!res.length) return null;

      const p = res[0];
      return {
        label: "Current location",
        address: `${p.formattedAddress}`,
      };
    } catch {
      return null;
    }
  }
