/**
 * Geolocation Service
 * Handles browser geolocation with proper error handling
 */

/**
 * @typedef {Object} GeolocationCoordinates
 * @property {number} lat
 * @property {number} lng
 * @property {number} accuracy
 */
/**
 * Attempts to get the user's current geolocation with a two-stage strategy.
 * @returns {Promise<import('./geolocation.types').GeolocationCoordinates>}
 */
export async function requestGeolocation() {
  // Stage 1: Fast, moderate accuracy
  try {
    return await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
  } catch (err1) {
    // Stage 2: Fallback with high accuracy + cached positions allowed
    try {
      return await getPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
    } catch (err2) {
      // If both fail, throw the last error
      throw normalizeGeolocationError(err2 || err1);
    }
  }
}

/**
 * @param {PositionOptions} options
 * @returns {Promise<import('./geolocation.types').GeolocationCoordinates>}
 */
function getPosition(options: PositionOptions): Promise<import('./geolocation.types').GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearAll = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      clearAll();
      reject({
        code: 'TIMEOUT',
        message: 'Location request timed out',
        details: 'Please try again or enable location services',
      } as any);
    }, options.timeout || 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearAll();
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error: any) => {
        clearAll();
        reject(error);
      },
      options
    );
  });
}

/**
 * @param {any} error
 * @returns {any}
 */
function normalizeGeolocationError(error: any) {
  if (!error) return { code: 'UNKNOWN', message: 'Unknown geolocation error' };
  if (error.code === 1 || error.code === 'PERMISSION_DENIED') {
    return {
      code: 'PERMISSION_DENIED',
      message: 'Location permission denied',
      details: 'Please enable location access in your browser settings to use current location',
    };
  }
  if (error.code === 2 || error.code === 'POSITION_UNAVAILABLE') {
    return {
      code: 'POSITION_UNAVAILABLE',
      message: 'Location is unavailable',
      details: 'Your device could not retrieve location data. Try again or use manual entry',
    };
  }
  if (error.code === 3 || error.code === 'TIMEOUT') {
    return {
      code: 'TIMEOUT',
      message: 'Location request timed out',
      details: 'Please try again or enter location manually',
    };
  }
  if (error.code === 'UNSUPPORTED') {
    return error;
  }
  return {
    code: 'UNKNOWN',
    message: error.message || 'Failed to get your location',
    details: error.details,
  };
}



/**
 * Format error for display to users
 */
/**
 * @param {any} error
 * @returns {string}
 */
export function formatGeolocationError(error:any) {
  return error.details || error.message;
}
