import { useJobEvents } from "@/hooks/useJobEvents";
import { jobsService } from "@/services/jobs.service";
import { getCurrentCoords } from "@/services/location";
import { ConnectionStatus } from "@/services/job-events.service";
import { CurrentJob, IncomingJobOffer, JobStatus, JobType } from "@/types/job";
import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import Toast from "react-native-toast-message";
import { useLocationStream } from "@/hooks/useLocationStream";
import { useAuth } from "@/context/AuthContext";

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
  isOnlineLoading: boolean;
  goOnline(): Promise<void>;
  goOffline(): Promise<void>;
  acceptJob(jobId: string, jobType: JobType): Promise<void>;
  declineJob(jobId: string, jobType: JobType): Promise<void>;
  cancelJob(jobId: string, jobType: JobType, reason: string): Promise<void>;
  arriveAtPickup(): Promise<void>;
  confirmPickup(otp?: string): Promise<void>;
  arriveAtDropoff(): Promise<void>;
  completeJob(payload?: any): Promise<void>;
  resetJob(): void;
  manualReconnect(): void;
}

const JobsContext = createContext<JobsContextState | undefined>(undefined);

export const JobsProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<JobStatus>("offline");
  const [isOnline, setIsOnline] = useState(false);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const [incomingJob, setIncomingJob] = useState<IncomingJobOffer | null>(null);
  const { logout, user } = useAuth();
  const [activeJob, setActiveJob] = useState<CurrentJob | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Stable ref so handleJobCompleted (defined before checkAndRestoreActiveJob)
  // can always call the latest version without a circular dependency.
  const checkAndRestoreRef = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );

  // Memoize callbacks to prevent re-renders
  const handleJobAssigned = useCallback((job: IncomingJobOffer) => {
    if (__DEV__) console.log("Job assigned:", JSON.stringify(job, null, 2));
    setIncomingJob(job);
    setStatus("incoming-job");
    Toast.show({ type: "info", text1: "New Job", text2: job.customerName });
  }, []);

  const handleJobUpdated = useCallback((jobId: string, newStatus: string) => {
    const isTerminal = newStatus === "online-waiting";

    // Update the job object in state
    setActiveJob((prevActiveJob) => {
      if (!prevActiveJob || prevActiveJob.id !== jobId) return prevActiveJob;
      // Clear job for terminal non-completed states (declined, timeout, etc.)
      if (isTerminal) return null;
      return { ...prevActiveJob, status: newStatus };
    });
    setIncomingJob((prev) => {
      if (isTerminal) return null;
      return prev;
    });
    setStatus(newStatus as JobStatus);
  }, []);

  /**
   * Dedicated COMPLETED handler: clears every piece of job state
   * (active job, incoming offer/quote) and returns the rider to
   * online-waiting so they can take a fresh job.
   */
  const handleJobCompleted = useCallback(async (_jobId: string) => {
    setActiveJob(null);
    setIncomingJob(null);
    setStatus("online-waiting");
    Toast.show({
      type: "success",
      text1: "Job Completed 🎉",
      text2: "Great work! Looking for your next job…",
      visibilityTime: 4000,
    });
    // Check if the backend already has a new job assigned (back-to-back jobs)
    await checkAndRestoreRef.current();
  }, []);

  const handleJobCancelled = useCallback((jobId: string) => {
    // Updater functions must be pure — no setState or Toast calls inside them
    setActiveJob((prevActiveJob) => {
      if (prevActiveJob && prevActiveJob.id === jobId) return null;
      return prevActiveJob;
    });
    setIncomingJob((prevIncomingJob) => {
      if (prevIncomingJob && prevIncomingJob.id === jobId) return null;
      return prevIncomingJob;
    });
    // Side effects go outside the updaters
    setStatus("online-waiting");
    Toast.show({ type: "error", text1: "Job Cancelled" });
  }, []);

  const handleConnectionStatusChange = useCallback(
    (status: ConnectionStatus) => {
      // ...existing code...
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
    [],
  );

  // IMPORTANT: Initialize job events BEFORE location stream
  // The location stream service needs the JobEventsService to be set first
  const handleForceLogout = useCallback(
    (reason?: string) => {
      Toast.show({
        type: "error",
        text1: "Account Suspended",
        text2:
          reason === "banned"
            ? "Your account has been permanently banned."
            : "Your account has been suspended. Contact support.",
        visibilityTime: 6000,
        position: "top",
        topOffset: 40,
      });
      logout();
    },
    [logout],
  );

  const handlePaymentConfirmed = useCallback((rideId: string) => {
    // Customer paid — notify the driver they can now start the trip
    Toast.show({
      type: "success",
      text1: "Payment Confirmed",
      text2: "Customer has paid. You may now start the trip.",
      visibilityTime: 5000,
    });
  }, []);

  const { reconnect, joinOrderRoom } = useJobEvents({
    enabled: isOnline,
    onJobAssigned: handleJobAssigned,
    onJobUpdated: handleJobUpdated,
    onJobCompleted: handleJobCompleted,
    onJobCancelled: handleJobCancelled,
    onConnectionStatusChange: handleConnectionStatusChange,
    onForceLogout: handleForceLogout,
    onPaymentConfirmed: handlePaymentConfirmed,
  });

  // Start location streaming when rider is online (after JobEventsService is set)
  const locationStreamStatus = useLocationStream({
    enabled: isOnline,
    role: user?.role ?? "RIDER",
  });

  /**
   * After going online OR completing/cancelling a job, check whether the backend
   * already has an active job assigned to this rider and restore the UI to the
   * correct step. This handles:
   *  - App restart / crash recovery
   *  - Admin-assigned jobs waiting before the rider went online
   *  - Back-to-back jobs: after finishing one, pick up the next assigned one
   */
  const checkAndRestoreActiveJob = useCallback(async () => {
    try {
      const job = await jobsService.getActiveJob();

      if (__DEV__ && job) console.log("Job found:", job);

      if (!job || job.status === "online-waiting") return;

      if (job.status === "incoming-job") {
        // Show the accept/decline screen for an unconfirmed assignment
        setIncomingJob(job as IncomingJobOffer);
        setStatus("incoming-job");
        Toast.show({
          type: "info",
          text1: "Job Waiting",
          text2: "You have a new job assignment",
        });
      } else {
        // Restore the active job at whatever step it was at
        setActiveJob(job as CurrentJob);
        setStatus(job.status as JobStatus);
        // Re-join the socket room so we receive live status updates
        joinOrderRoom(job.id);
        Toast.show({
          type: "info",
          text1: "Job Resumed",
          text2: "Continuing your active job",
        });
      }
    } catch {
      // Silently fail — rider stays on the waiting screen
    }
  }, [joinOrderRoom]);

  // Keep the ref in sync so handleJobCompleted always has the latest version
  checkAndRestoreRef.current = checkAndRestoreActiveJob;

  const goOnline = async () => {
    setIsOnlineLoading(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) throw new Error("Location unavailable");
      await jobsService.goOnline(coords);
      setIsOnline(true);
      setStatus("online-waiting");
      // Check if a job was already assigned before going online
      // (e.g. admin-dispatched, or app was restarted mid-job)
      await checkAndRestoreActiveJob();
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to go online" });
    } finally {
      setIsOnlineLoading(false);
    }
  };

  const goOffline = async () => {
    setIsOnlineLoading(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) throw new Error("Location unavailable");

      if (activeJob) {
        throw new Error("Complete active job first");
      }
      await jobsService.goOffline(coords);
      setIsOnline(false);
      setStatus("offline");
      setActiveJob(null);
      setIncomingJob(null);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message ?? "Failed to go offline",
      });
    } finally {
      setIsOnlineLoading(false);
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
      // After successful accept, join the order/job room for granular updates
      joinOrderRoom(jobId);
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

  const cancelJob = async (jobId: string, jobType: JobType, reason: string) => {
    const previousStatus = status;
    const previousActiveJob = activeJob;

    try {
      setStatus("online-waiting");
      setActiveJob(null);
      setIncomingJob(null);
      await jobsService.cancelJob(jobId, jobType, reason);
      // After cancelling, check if another job is already waiting
      await checkAndRestoreActiveJob();
    } catch (error: any) {
      setStatus(previousStatus);
      setActiveJob(previousActiveJob);
      Toast.show({
        type: "error",
        text1: "Failed to cancel job",
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
      await jobsService.arriveAtPickup(activeJob.id, activeJob.jobType);
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

  const confirmPickup = async (otp?: string) => {
    if (!activeJob) return;

    const previousStatus = status;

    try {
      const result = await jobsService.confirmPickup(
        activeJob.id,
        activeJob.jobType,
        otp,
      );

      // Multi-stop delivery: more stores to pick up from
      if (activeJob.jobType === "delivery" && result?.nextStop) {
        setActiveJob((prev) =>
          prev
            ? {
                ...prev,
                currentStopIndex: result.nextStopIndex,
                pickupAddress: result.nextStop.pickupAddress,
              }
            : null,
        );
        setStatus("en-route-pickup");
        const stopNum = (result.nextStopIndex ?? 0) + 1;
        const total = activeJob.stops?.length ?? stopNum;
        Toast.show({
          type: "info",
          text1: `Head to stop ${stopNum} of ${total}`,
          text2: result.nextStop.storeName ?? "Next store",
          visibilityTime: 5000,
          position: "top",
          topOffset: 40,
        });
      } else {
        // Single-stop or all stops done → head to customer
        setStatus("en-route-dropoff");
      }
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
      await jobsService.arriveAtDropoff(activeJob.id, activeJob.jobType);
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
      // After finishing, check immediately if another job is already assigned
      await checkAndRestoreActiveJob();
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
        isOnlineLoading,
        incomingJob,
        activeJob,
        connectionStatus,
        locationStreamStatus,
        goOnline,
        goOffline,
        acceptJob,
        declineJob,
        cancelJob,
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
