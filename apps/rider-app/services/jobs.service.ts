import { JobType } from "@/types/job";
import { retryWithBackoff, isRetryableError } from "@/utils/retry";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const jobsService = {
  async updateJobStatus(jobId: string, jobType: JobType, status: string) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/riders/jobs/${jobId}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ jobType, status }),
          },
        );
        return response;
      },
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          console.log(
            `Retrying updateJobStatus (attempt ${attempt}):`,
            error.message,
          );
        },
      },
    );
  },

  async acceptJob(jobId: string, jobType: JobType) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/riders/jobs/accept`,
          {
            method: "POST",
            body: JSON.stringify({ jobId, jobType }),
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
      `${EXPO_PUBLIC_API_URL}/riders/jobs/decline`,
      {
        method: "POST",
        body: JSON.stringify({ jobId, jobType }),
      },
    );
    return response;
  },

  async completeJob(jobId: string, jobType: JobType, payload?: any) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/riders/jobs/complete`,
          {
            method: "POST",
            body: JSON.stringify({ jobId, jobType, ...payload }),
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

  async goOnline(coords: { latitude: number; longitude: number }) {
    return retryWithBackoff(
      async () => {
        const response = await fetchWithAuth(
          `${EXPO_PUBLIC_API_URL}/riders/online`,
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
      `${EXPO_PUBLIC_API_URL}/riders/offline`,
      {
        method: "POST",
        body: JSON.stringify(coords),
        headers: { "Content-Type": "application/json" },
      },
    );
    return response;
  },
};
