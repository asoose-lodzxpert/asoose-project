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
  useEffect,
} from "react";
import { AppState, AppStateStatus } from "react-native"; // Added AppState
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

  const checkAndRestoreRef = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );

  const handleJobAssigned = useCallback((job: IncomingJobOffer) => {
    if (__DEV__) console.log("Job assigned:", JSON.stringify(job, null, 2));
    setIncomingJob(job);
    setStatus("incoming-job");
    Toast.show({ type: "info", text1: "New Job", text2: job.customerName });
  }, []);

  const handleJobUpdated = useCallback((jobId: string, newStatus: string) => {
    const isTerminal = newStatus === "online-waiting";
    setActiveJob((prevActiveJob) => {
      if (!prevActiveJob || prevActiveJob.id !== jobId) return prevActiveJob;
      if (isTerminal) return null;
      return { ...prevActiveJob, status: newStatus };
    });
    setIncomingJob((prev) => {
      if (isTerminal) return null;
      return prev;
    });
    setStatus(newStatus as JobStatus);
  }, []);

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
    await checkAndRestoreRef.current();
  }, []);

  const handleJobCancelled = useCallback((jobId: string) => {
    setActiveJob((prevActiveJob) => {
      if (prevActiveJob && prevActiveJob.id === jobId) return null;
      return prevActiveJob;
    });
    setIncomingJob((prevIncomingJob) => {
      if (prevIncomingJob && prevIncomingJob.id === jobId) return null;
      return prevIncomingJob;
    });
    setStatus("online-waiting");
    Toast.show({
      type: "error",
      text1: "Job Cancelled",
      text2: "Returning you to standby.",
    });
  }, []);

  const handleRideCancelledByCustomer = useCallback(
    (rideId: string, reason?: string) => {
      setActiveJob((prev) => (prev && prev.id === rideId ? null : prev));
      setIncomingJob((prev) => (prev && prev.id === rideId ? null : prev));
      setStatus("online-waiting");
      Toast.show({
        type: "error",
        text1: "Ride Cancelled by Customer",
        text2: reason?.trim()
          ? `Reason: ${reason}`
          : "The customer has cancelled this ride.",
        visibilityTime: 5000,
      });
    },
    [],
  );

  const handleConnectionStatusChange = useCallback(
    (status: ConnectionStatus) => {
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
    Toast.show({
      type: "success",
      text1: "Payment Confirmed",
      text2: "Customer has paid. You may now start the trip.",
      visibilityTime: 5000,
    });
  }, []);

  const handleRidePaymentCompleted = useCallback((_rideId: string) => {
    Toast.show({
      type: "success",
      text1: "Payment Received",
      text2: "Customer payment confirmed. Earnings have been credited.",
      visibilityTime: 5000,
    });
  }, []);

  const { reconnect, joinOrderRoom } = useJobEvents({
    enabled: isOnline,
    onJobAssigned: handleJobAssigned,
    onJobUpdated: handleJobUpdated,
    onJobCompleted: handleJobCompleted,
    onJobCancelled: handleJobCancelled,
    onRideCancelledByCustomer: handleRideCancelledByCustomer,
    onConnectionStatusChange: handleConnectionStatusChange,
    onForceLogout: handleForceLogout,
    onPaymentConfirmed: handlePaymentConfirmed,
    onRidePaymentCompleted: handleRidePaymentCompleted,
  });

  const locationStreamStatus = useLocationStream({
    enabled: isOnline,
    role: user?.role ?? "RIDER",
  });

  const checkAndRestoreActiveJob = useCallback(async () => {
    try {
      const job = await jobsService.getActiveJob();
      if (__DEV__ && job) console.log("Job found:", job);
      if (!job || job.status === "online-waiting") {
        setIncomingJob(null);
        return;
      }

      if (job.status === "incoming-job") {
        setIncomingJob(job as IncomingJobOffer);
        setStatus("incoming-job");
      } else {
        setActiveJob(job as CurrentJob);
        setStatus(job.status as JobStatus);
        joinOrderRoom(job.id);
      }
    } catch {
      // Silently fail
    }
  }, [joinOrderRoom]);

  checkAndRestoreRef.current = checkAndRestoreActiveJob;

  /**
   * FIX: Listen for App State changes.
   * When a user clicks a push notification, the app moves to 'active'.
   * This ensures the job state is refreshed immediately.
   */
  useEffect(() => {
    if (!isOnline) return;

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          checkAndRestoreActiveJob();
        }
      },
    );

    return () => subscription.remove();
  }, [isOnline, checkAndRestoreActiveJob]);

  const goOnline = async () => {
    setIsOnlineLoading(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) throw new Error("Location unavailable");
      await jobsService.goOnline(coords);
      setIsOnline(true);
      setStatus("online-waiting");
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
      if (activeJob) throw new Error("Complete active job first");
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
      setStatus("en-route-pickup");
      setActiveJob(incomingJob as CurrentJob);
      setIncomingJob(null);
      await jobsService.acceptJob(jobId, jobType);
      joinOrderRoom(jobId);
    } catch (error: any) {
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
      setIncomingJob(null);
      setStatus("online-waiting");
      await jobsService.declineJob(jobId, jobType);
    } catch (error: any) {
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
      } else {
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
    const completedJobType = activeJob.jobType;
    try {
      setStatus("online-waiting");
      setActiveJob(null);
      await jobsService.completeJob(activeJob.id, activeJob.jobType, payload);
      await checkAndRestoreActiveJob();
      if (completedJobType === "ride") {
        Toast.show({
          type: "info",
          text1: "Ride Completed",
          text2: "Awaiting customer payment…",
          visibilityTime: 4000,
        });
      }
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
      Toast.show({ type: "info", text1: "Reconnecting..." });
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
