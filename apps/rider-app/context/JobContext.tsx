import { useJobEvents } from "@/hooks/useJobEvents";
import { jobsService } from "@/services/jobs.service";
import { getCurrentCoords } from "@/services/location";
import { ConnectionStatus } from "@/services/job-events.service";
import { CurrentJob, IncomingJobOffer, JobStatus, JobType } from "@/types/job";
import React, { createContext, ReactNode, useContext, useState } from "react";
import Toast from "react-native-toast-message";
import { useLocationStream } from "@/hooks/useLocationStream";

interface JobsContextState {
  status: JobStatus;
  isOnline: boolean;
  incomingJob: IncomingJobOffer | null;
  activeJob: CurrentJob | null;
  connectionStatus: ConnectionStatus;
  locationStreamStatus: {
    isActive: boolean;
    isConnected: boolean;
    queueSize: number;
  };
  goOnline(): Promise<void>;
  goOffline(): Promise<void>;
  acceptJob(jobId: string, jobType: JobType): Promise<void>;
  declineJob(jobId: string, jobType: JobType): Promise<void>;
  arriveAtPickup(): Promise<void>;
  confirmPickup(): Promise<void>;
  arriveAtDropoff(): Promise<void>;
  completeJob(payload?: any): Promise<void>;
  resetJob(): void;
  manualReconnect(): void;
}

const JobsContext = createContext<JobsContextState | undefined>(undefined);

export const JobsProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<JobStatus>("offline");
  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState<IncomingJobOffer | null>(null);
  const [activeJob, setActiveJob] = useState<CurrentJob | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Start location streaming when rider is online
  const locationStreamStatus = useLocationStream({ enabled: isOnline });

  // Unified job event handlers - Lazy initialization to avoid early imports
  const { reconnect } = useJobEvents({
    enabled: isOnline,
    onJobAssigned: (job: IncomingJobOffer) => {
      setIncomingJob(job);
      setStatus("incoming-job");
      Toast.show({ type: "info", text1: "New Job", text2: job.customerName });
    },
    onJobUpdated: (jobId: string, newStatus: string) => {
      if (activeJob && activeJob.id === jobId) {
        setActiveJob({ ...activeJob, status: newStatus });

        // Map backend status to JobStatus if needed
        setStatus(newStatus as JobStatus);
      }
    },
    onJobCancelled: (jobId: string) => {
      if (activeJob && activeJob.id === jobId) {
        setActiveJob(null);
        setStatus("online-waiting");
        Toast.show({ type: "error", text1: "Job Cancelled" });
      }
      if (incomingJob && incomingJob.id === jobId) {
        setIncomingJob(null);
        setStatus("online-waiting");
      }
    },
    onConnectionStatusChange: (status: ConnectionStatus) => {
      setConnectionStatus(status);

      if (status === "failed") {
        Toast.show({
          type: "error",
          text1: "Connection Lost",
          text2: "Tap to reconnect",
          visibilityTime: 10000,
        });
      } else if (status === "connected") {
        Toast.show({
          type: "success",
          text1: "Connected",
          text2: "You're back online",
        });
      }
    },
  });

  const goOnline = async () => {
    try {
      const coords = await getCurrentCoords();
      if (!coords) throw new Error("Location unavailable");
      await jobsService.goOnline(coords);
      setIsOnline(true);
      setStatus("online-waiting");
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to go online" });
    }
  };

  const goOffline = async () => {
    try {
      const coords = await getCurrentCoords();
      if (!coords) throw new Error("Location unavailable");
      await jobsService.goOffline(coords);
      setIsOnline(false);
      setStatus("offline");
      setActiveJob(null);
      setIncomingJob(null);
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to go offline" });
    }
  };

  const acceptJob = async (jobId: string, jobType: JobType) => {
    const previousJob = incomingJob;
    const previousStatus = status;

    try {
      // Optimistic update
      setStatus("en-route-pickup");
      setActiveJob(incomingJob as CurrentJob);
      setIncomingJob(null);

      await jobsService.acceptJob(jobId, jobType);
    } catch (error: any) {
      // Rollback on error
      setIncomingJob(previousJob);
      setStatus(previousStatus);
      setActiveJob(null);

      Toast.show({
        type: "error",
        text1: "Failed to accept job",
        text2: error.message || "Please try again",
        visibilityTime: 5000,
      });
      throw error;
    }
  };

  const declineJob = async (jobId: string, jobType: JobType) => {
    const previousJob = incomingJob;
    const previousStatus = status;

    try {
      // Optimistic update
      setIncomingJob(null);
      setStatus("online-waiting");

      await jobsService.declineJob(jobId, jobType);
    } catch (error: any) {
      // Rollback on error
      setIncomingJob(previousJob);
      setStatus(previousStatus);

      Toast.show({
        type: "error",
        text1: "Failed to decline job",
        text2: error.message || "Please try again",
        visibilityTime: 5000,
      });
      throw error;
    }
  };

  const arriveAtPickup = async () => {
    if (!activeJob) return;

    const previousStatus = status;

    try {
      setStatus("at-pickup");
      await jobsService.updateJobStatus(
        activeJob.id,
        activeJob.jobType,
        "at-pickup",
      );
    } catch (error: any) {
      setStatus(previousStatus);
      Toast.show({
        type: "error",
        text1: "Failed to update status",
        text2: error.message || "Please try again",
        visibilityTime: 5000,
      });
      throw error;
    }
  };

  const confirmPickup = async () => {
    if (!activeJob) return;

    const previousStatus = status;

    try {
      setStatus("en-route-dropoff");
      await jobsService.updateJobStatus(
        activeJob.id,
        activeJob.jobType,
        "en-route-dropoff",
      );
    } catch (error: any) {
      setStatus(previousStatus);
      Toast.show({
        type: "error",
        text1: "Failed to confirm pickup",
        text2: error.message || "Please try again",
        visibilityTime: 5000,
      });
      throw error;
    }
  };

  const arriveAtDropoff = async () => {
    if (!activeJob) return;

    const previousStatus = status;

    try {
      setStatus("confirm-job");
      await jobsService.updateJobStatus(
        activeJob.id,
        activeJob.jobType,
        "confirm-job",
      );
    } catch (error: any) {
      setStatus(previousStatus);
      Toast.show({
        type: "error",
        text1: "Failed to update status",
        text2: error.message || "Please try again",
        visibilityTime: 5000,
      });
      throw error;
    }
  };

  const completeJob = async (payload?: any) => {
    if (!activeJob) return;

    const previousStatus = status;
    const previousActiveJob = activeJob;

    try {
      setStatus("online-waiting");
      setActiveJob(null);
      await jobsService.completeJob(activeJob.id, activeJob.jobType, payload);
    } catch (error: any) {
      setStatus(previousStatus);
      setActiveJob(previousActiveJob);
      Toast.show({
        type: "error",
        text1: "Failed to complete job",
        text2: error.message || "Please try again",
        visibilityTime: 5000,
      });
      throw error;
    }
  };

  const resetJob = () => {
    setActiveJob(null);
    setIncomingJob(null);
    setStatus("offline");
    setIsOnline(false);
  };

  const manualReconnect = () => {
    if (reconnect) {
      reconnect();
      Toast.show({
        type: "info",
        text1: "Reconnecting...",
      });
    }
  };

  return (
    <JobsContext.Provider
      value={{
        status,
        isOnline,
        incomingJob,
        activeJob,
        connectionStatus,
        locationStreamStatus,
        goOnline,
        goOffline,
        acceptJob,
        declineJob,
        arriveAtPickup,
        confirmPickup,
        arriveAtDropoff,
        completeJob,
        resetJob,
        manualReconnect,
      }}
    >
      {children}
    </JobsContext.Provider>
  );
};

export const useJobs = () => {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within a JobsProvider");
  return ctx;
};
