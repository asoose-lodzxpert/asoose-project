import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { JobEventsService } from "./job-events.service";

const LOCATION_QUEUE_KEY = "rider_location_queue";
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 100;

/**
 * Module-level getter injected from useLocationStream / JobContext.
 * Returns the current authenticated user's role ('RIDER' | 'DRIVER').
 * Falls back to 'RIDER' until a real getter is registered.
 */
let getRoleFn: () => string = () => "RIDER";

export function setRoleGetter(fn: () => string) {
  getRoleFn = fn;
}

interface QueuedLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export class LocationStreamService {
  private jobEventsService: JobEventsService | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isActive: boolean = false;
  private locationQueue: QueuedLocation[] = [];

  /**
   * Set the JobEventsService instance to use its socket
   */
  setJobEventsService(service: JobEventsService) {
    this.jobEventsService = service;
  }

  /**
   * Set the role to include in location updates (RIDER or DRIVER)
   */
  setRole(role: string) {
    setRoleGetter(() => role);
  }

  /**
   * Start streaming location when rider goes active
   */
  async start() {
    if (this.isActive || !this.jobEventsService) {
      return;
    }

    this.isActive = true;

    // Load queued locations from storage
    await this.loadQueue();

    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      this.isActive = false;
      return;
    }

    // Request background permissions for continued tracking
    await Location.requestBackgroundPermissionsAsync();

    // Flush queued locations if connected
    if (this.jobEventsService.isConnected()) {
      await this.flushQueue();
    }

    // Start location polling
    this.startLocationPolling();
  }

  /**
   * Stop streaming location when rider goes inactive
   */
  async stop() {
    this.isActive = false;

    // Stop location polling
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Save queue before stopping
    await this.saveQueue();
  }

  /**
   * Start polling location at intervals
   */
  private startLocationPolling() {
    this.intervalId = setInterval(async () => {
      if (!this.isActive) return;

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;
        await this.sendLocation(latitude, longitude);
      } catch (error) {
        // Silent fail
      }
    }, LOCATION_UPDATE_INTERVAL);

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: 10,
      },
      async (location) => {
        if (!this.isActive) return;
        const { latitude, longitude } = location.coords;
        await this.sendLocation(latitude, longitude);
      },
    ).then((subscription) => {
      this.locationSubscription = subscription;
    });
  }

  /**
   * Send location to backend via socket
   */
  private async sendLocation(lat: number, lng: number) {
    const locationData: QueuedLocation = {
      lat,
      lng,
      timestamp: Date.now(),
    };

    if (this.jobEventsService && this.jobEventsService.isConnected()) {
      const sent = this.jobEventsService.sendLocationUpdate(
        lat,
        lng,
        getRoleFn(),
      );
      if (!sent) {
        this.queueLocation(locationData);
      }
    } else {
      this.queueLocation(locationData);
    }
  }

  /**
   * Add location to queue
   */
  private queueLocation(location: QueuedLocation) {
    this.locationQueue.push(location);

    if (this.locationQueue.length > MAX_QUEUE_SIZE) {
      this.locationQueue = this.locationQueue.slice(-MAX_QUEUE_SIZE);
    }
  }

  /**
   * Flush queued locations when connected
   */
  private async flushQueue() {
    if (
      this.locationQueue.length === 0 ||
      !this.jobEventsService ||
      !this.jobEventsService.isConnected()
    ) {
      return;
    }

    const sent = this.jobEventsService.sendLocationBatch(
      this.locationQueue,
      getRoleFn(),
    );
    if (sent) {
      this.locationQueue = [];
      await this.saveQueue();
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(
        LOCATION_QUEUE_KEY,
        JSON.stringify(this.locationQueue),
      );
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Load queue from persistent storage
   */
  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
      if (stored) {
        this.locationQueue = JSON.parse(stored);
      }
    } catch (error) {
      this.locationQueue = [];
    }
  }

  /**
   * Get current streaming status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      isConnected: this.jobEventsService?.isConnected() || false,
      queueSize: this.locationQueue.length,
    };
  }
}

export const locationStreamService = new LocationStreamService();
