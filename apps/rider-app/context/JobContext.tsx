import { useJobEvents } from "@/hooks/useJobEvents";
import { jobsService } from "@/services/jobs.service";
import { getCurrentCoords } from "@/services/location";
import { CurrentJob, IncomingJobOffer, JobStatus, JobType } from "@/types/job";
import React, { createContext, ReactNode, useContext, useState } from "react";
import Toast from "react-native-toast-message";

interface JobsContextState {
  status: JobStatus;
  isOnline: boolean;
  incomingJob: IncomingJobOffer | null;
  activeJob: CurrentJob | null;
  goOnline(): Promise<void>;
  goOffline(): Promise<void>;
  acceptJob(jobId: string, jobType: JobType): Promise<void>;
  declineJob(jobId: string, jobType: JobType): Promise<void>;
  arriveAtPickup(): Promise<void>;
  confirmPickup(): Promise<void>;
  arriveAtDropoff(): Promise<void>;
  completeJob(payload?: any): Promise<void>;
  resetJob(): void;
}

const JobsContext = createContext<JobsContextState | undefined>(undefined);

export const JobsProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<JobStatus>("offline");
  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState<IncomingJobOffer | null>(null);
  const [activeJob, setActiveJob] = useState<CurrentJob | null>(null);

  // Unified job event handlers
  useJobEvents({
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
    enabled: isOnline,
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
    await jobsService.acceptJob(jobId, jobType);
    setStatus("en-route-pickup");
    setIncomingJob(null);
  };

  const declineJob = async (jobId: string, jobType: JobType) => {
    await jobsService.declineJob(jobId, jobType);
    setIncomingJob(null);
    setStatus("online-waiting");
  };

  const arriveAtPickup = async () => {
    if (!activeJob) return;
    await jobsService.updateJobStatus(
      activeJob.id,
      activeJob.jobType,
      "at-pickup",
    );
    setStatus("at-pickup");
  };

  const confirmPickup = async () => {
    if (!activeJob) return;
    await jobsService.updateJobStatus(
      activeJob.id,
      activeJob.jobType,
      "en-route-dropoff",
    );
    setStatus("en-route-dropoff");
  };

  const arriveAtDropoff = async () => {
    if (!activeJob) return;
    await jobsService.updateJobStatus(
      activeJob.id,
      activeJob.jobType,
      "confirm-job",
    );
    setStatus("confirm-job");
  };

  const completeJob = async (payload?: any) => {
    if (!activeJob) return;
    await jobsService.completeJob(activeJob.id, activeJob.jobType, payload);
    setStatus("online-waiting");
    setActiveJob(null);
  };

  const resetJob = () => {
    setActiveJob(null);
    setIncomingJob(null);
    setStatus("offline");
    setIsOnline(false);
  };

  return (
    <JobsContext.Provider
      value={{
        status,
        isOnline,
        incomingJob,
        activeJob,
        goOnline,
        goOffline,
        acceptJob,
        declineJob,
        arriveAtPickup,
        confirmPickup,
        arriveAtDropoff,
        completeJob,
        resetJob,
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
