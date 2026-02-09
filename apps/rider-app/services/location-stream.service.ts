import * as Location from "expo-location";
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_QUEUE_KEY = "rider_location_queue";
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 100;

interface QueuedLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export class LocationStreamService {
  private socket: Socket | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isActive: boolean = false;
  private isConnected: boolean = false;
  private locationQueue: QueuedLocation[] = [];

  /**
   * Start streaming location when rider goes active
   */
  async start() {
    if (this.isActive) {
      console.log("Location streaming already active");
      return;
    }

    this.isActive = true;
    console.log("Starting location stream...");

    // Load queued locations from storage
    await this.loadQueue();

    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.error("Location permission not granted");
      this.isActive = false;
      return;
    }

    // Request background permissions for continued tracking
    const bgStatus = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus.status !== "granted") {
      console.warn("Background location permission not granted");
    }

    // Connect to socket
    await this.connectSocket();

    // Start location polling
    this.startLocationPolling();
  }

  /**
   * Stop streaming location when rider goes inactive
   */
  async stop() {
    console.log("Stopping location stream...");
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

    // Save queue before disconnecting
    await this.saveQueue();

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Connect to socket with authentication
   */
  private async connectSocket() {
    try {
      const token = await getAccessToken();
      if (!token) {
        console.error("No access token available");
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "";
      this.socket = io(apiUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      this.socket.on("connect", async () => {
        console.log("Socket connected for location streaming");
        this.isConnected = true;

        // Flush queued locations
        await this.flushQueue();
      });

      this.socket.on("disconnect", () => {
        console.log("Socket disconnected");
        this.isConnected = false;
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        this.isConnected = false;
      });
    } catch (error) {
      console.error("Failed to connect socket:", error);
    }
  }

  /**
   * Start polling location at intervals
   */
  private startLocationPolling() {
    // Use interval-based polling for reliability
    this.intervalId = setInterval(async () => {
      if (!this.isActive) return;

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;
        await this.sendLocation(latitude, longitude);
      } catch (error) {
        console.error("Error getting location:", error);
      }
    }, LOCATION_UPDATE_INTERVAL);

    // Also start watching position for more frequent updates
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: 10, // Update every 10 meters
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

    if (this.isConnected && this.socket) {
      // Send immediately if connected
      try {
        this.socket.emit("rider_location_update", { lat, lng });
        console.log(`Location sent: [${lat}, ${lng}]`);
      } catch (error) {
        console.error("Error sending location:", error);
        // Queue if send fails
        this.queueLocation(locationData);
      }
    } else {
      // Queue if not connected
      this.queueLocation(locationData);
    }
  }

  /**
   * Add location to queue
   */
  private queueLocation(location: QueuedLocation) {
    this.locationQueue.push(location);

    // Limit queue size
    if (this.locationQueue.length > MAX_QUEUE_SIZE) {
      this.locationQueue = this.locationQueue.slice(-MAX_QUEUE_SIZE);
    }

    console.log(`Location queued (${this.locationQueue.length} in queue)`);
  }

  /**
   * Flush queued locations when connected
   */
  private async flushQueue() {
    if (this.locationQueue.length === 0 || !this.socket || !this.isConnected) {
      return;
    }

    console.log(`Flushing ${this.locationQueue.length} queued locations...`);

    try {
      // Send batch to backend
      this.socket.emit("rider_location_batch", {
        locations: this.locationQueue,
      });

      // Clear queue after successful send
      this.locationQueue = [];
      await this.saveQueue();

      console.log("Queue flushed successfully");
    } catch (error) {
      console.error("Error flushing queue:", error);
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
      console.error("Error saving location queue:", error);
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
        console.log(`Loaded ${this.locationQueue.length} queued locations`);
      }
    } catch (error) {
      console.error("Error loading location queue:", error);
      this.locationQueue = [];
    }
  }

  /**
   * Get current streaming status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      isConnected: this.isConnected,
      queueSize: this.locationQueue.length,
    };
  }
}

// Singleton instance
export const locationStreamService = new LocationStreamService();
