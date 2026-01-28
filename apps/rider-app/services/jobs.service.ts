import { JobType } from "@/types/job";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const jobsService = {
  async updateJobStatus(jobId: string, jobType: JobType, status: string) {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/jobs/${jobId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ jobType, status }),
      },
    );
    return response;
  },

  async acceptJob(jobId: string, jobType: JobType) {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/jobs/accept`,
      {
        method: "POST",
        body: JSON.stringify({ jobId, jobType }),
      },
    );
    return response;
  },

  async declineJob(jobId: string, jobType: JobType) {
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
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/jobs/complete`,
      {
        method: "POST",
        body: JSON.stringify({ jobId, jobType, ...payload }),
      },
    );
    return response;
  },

  async goOnline(coords: { latitude: number; longitude: number }) {
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

  async goOffline(coords: { latitude: number; longitude: number }) {
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
