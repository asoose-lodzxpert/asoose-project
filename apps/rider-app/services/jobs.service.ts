import { JobType } from "@/types/job";
import { retryWithBackoff, isRetryableError } from "@/utils/retry";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const jobsService = {
  /**
   * Fetches the currently assigned/active job for the logged-in rider or driver.
   * Returns null if no active job exists.
   * RIDER role → checks deliveries
   * DRIVER role → checks rides
   */
  async getActiveJob() {
    try {
      const response = await fetchWithAuth(
        `${EXPO_PUBLIC_API_URL}/rider/jobs/active`,
      );
      return response ?? null;
    } catch {
      return null;
    }
  },

  async acceptJob(jobId: string, jobType: JobType) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/rider/jobs/${jobId}/accept`,
          {
            method: "POST",
            body: JSON.stringify({ jobType }),
          },
        );
        return response;
      },
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          console.log(
            `Retrying acceptJob (attempt ${attempt}):`,
            error.message,
          );
        },
      },
    );
  },

  async declineJob(jobId: string, jobType: JobType) {
    // Don't retry decline - if it fails, the job will auto-decline anyway
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/jobs/${jobId}/decline`,
      {
        method: "POST",
        body: JSON.stringify({ jobType }),
      },
    );
    return response;
  },

  async arriveAtPickup(jobId: string, jobType: JobType) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/rider/jobs/${jobId}/arrive-pickup`,
          {
            method: "POST",
            body: JSON.stringify({ jobType }),
          },
        );
        return response;
      },
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          console.log(
            `Retrying arriveAtPickup (attempt ${attempt}):`,
            error.message,
          );
        },
      },
    );
  },

  async confirmPickup(jobId: string, jobType: JobType, otp?: string) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/rider/jobs/${jobId}/confirm-pickup`,
          {
            method: "POST",
            body: JSON.stringify({ jobType, ...(otp ? { otp } : {}) }),
          },
        );
        return response;
      },
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          console.log(
            `Retrying confirmPickup (attempt ${attempt}):`,
            error.message,
          );
        },
      },
    );
  },

  async arriveAtDropoff(jobId: string, jobType: JobType) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/rider/jobs/${jobId}/arrive-dropoff`,
          {
            method: "POST",
            body: JSON.stringify({ jobType }),
          },
        );
        return response;
      },
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          console.log(
            `Retrying arriveAtDropoff (attempt ${attempt}):`,
            error.message,
          );
        },
      },
    );
  },

  async completeJob(jobId: string, jobType: JobType, payload?: any) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/rider/jobs/${jobId}/complete`,
          {
            method: "POST",
            body: JSON.stringify({ jobType, payload }),
          },
        );
        return response;
      },
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          console.log(
            `Retrying completeJob (attempt ${attempt}):`,
            error.message,
          );
        },
      },
    );
  },

  async cancelJob(jobId: string, jobType: JobType, reason: string) {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/jobs/${jobId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ jobType, reason }),
      },
    );
    return response;
  },

  async goOnline(coords: { latitude: number; longitude: number }) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/rider/status/online`,
          {
            method: "POST",
            body: JSON.stringify(coords),
            headers: { "Content-Type": "application/json" },
          },
        );
        return response;
      },
      {
        maxAttempts: 2,
        onRetry: (attempt, error) => {
          console.log(`Retrying goOnline (attempt ${attempt}):`, error.message);
        },
      },
    );
  },

  async goOffline(coords: { latitude: number; longitude: number }) {
    // Don't retry offline - rider can manually go offline again if needed
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/status/offline`,
      {
        method: "POST",
        body: JSON.stringify(coords),
        headers: { "Content-Type": "application/json" },
      },
    );
    return response;
  },
};
