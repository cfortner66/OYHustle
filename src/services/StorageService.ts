import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job } from '../types';
import { logService } from './LoggingService';

const JOBS_KEY = 'jobs';

export const getJobs = async (): Promise<Job[]> => {
  try {
    logService.debug('STORAGE', 'Fetching jobs from AsyncStorage');
    const jsonValue = await AsyncStorage.getItem(JOBS_KEY);
    const jobs = jsonValue != null ? JSON.parse(jsonValue) : [];
    logService.info('STORAGE', `Successfully fetched ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    logService.logError('STORAGE', error as Error, { operation: 'getJobs' });
    return [];
  }
};

export const getJobById = async (id: string): Promise<Job | null> => {
  try {
    logService.debug('STORAGE', `Fetching job by ID: ${id}`);
    const jobs = await getJobs();
    const job = jobs.find((j) => j.id === id);
    if (job) {
      logService.info('STORAGE', `Successfully found job with ID: ${id}`);
    } else {
      logService.warn('STORAGE', `Job not found with ID: ${id}`);
    }
    return job || null;
  } catch (error) {
    logService.logError('STORAGE', error as Error, {
      operation: 'getJobById',
      jobId: id,
    });
    return null;
  }
};

export const saveJob = async (job: Job): Promise<void> => {
  try {
    logService.debug('STORAGE', `Saving new job: ${job.jobName}`, {
      jobId: job.id,
    });
    const jobs = await getJobs();
    const newJobs = [...jobs, job];
    const jsonValue = JSON.stringify(newJobs);
    await AsyncStorage.setItem(JOBS_KEY, jsonValue);
    logService.info('STORAGE', `Successfully saved job: ${job.jobName}`, {
      jobId: job.id,
      totalJobs: newJobs.length,
    });
  } catch (error) {
    logService.logError('STORAGE', error as Error, {
      operation: 'saveJob',
      jobId: job.id,
      jobTitle: job.jobName,
    });
    throw error; // Re-throw to allow caller to handle
  }
};

export const updateJob = async (updatedJob: Job): Promise<void> => {
  try {
    logService.debug('STORAGE', `Updating job: ${updatedJob.jobName}`, {
      jobId: updatedJob.id,
    });
    const jobs = await getJobs();
    const jobIndex = jobs.findIndex((job) => job.id === updatedJob.id);

    if (jobIndex === -1) {
      const error = new Error(`Job with ID ${updatedJob.id} not found`);
      logService.logError('STORAGE', error, {
        operation: 'updateJob',
        jobId: updatedJob.id,
      });
      throw error;
    }

    const newJobs = jobs.map((job) =>
      job.id === updatedJob.id ? updatedJob : job
    );
    const jsonValue = JSON.stringify(newJobs);
    await AsyncStorage.setItem(JOBS_KEY, jsonValue);
    logService.info(
      'STORAGE',
      `Successfully updated job: ${updatedJob.jobName}`,
      { jobId: updatedJob.id }
    );
  } catch (error) {
    logService.logError('STORAGE', error as Error, {
      operation: 'updateJob',
      jobId: updatedJob.id,
      jobTitle: updatedJob.jobName,
    });
    throw error; // Re-throw to allow caller to handle
  }
};

export const deleteJob = async (id: string): Promise<void> => {
  try {
    logService.debug('STORAGE', `Deleting job with ID: ${id}`);
    const jobs = await getJobs();
    const jobToDelete = jobs.find((job) => job.id === id);

    if (!jobToDelete) {
      const error = new Error(`Job with ID ${id} not found`);
      logService.logError('STORAGE', error, {
        operation: 'deleteJob',
        jobId: id,
      });
      throw error;
    }

    const newJobs = jobs.filter((job) => job.id !== id);
    const jsonValue = JSON.stringify(newJobs);
    await AsyncStorage.setItem(JOBS_KEY, jsonValue);
    logService.info(
      'STORAGE',
      `Successfully deleted job: ${jobToDelete.jobName}`,
      { jobId: id, remainingJobs: newJobs.length }
    );
  } catch (error) {
    logService.logError('STORAGE', error as Error, {
      operation: 'deleteJob',
      jobId: id,
    });
    throw error; // Re-throw to allow caller to handle
  }
};

// Replace the entire jobs collection (used by seeders/tests)
export const setJobs = async (jobs: Job[]): Promise<void> => {
  try {
    logService.debug('STORAGE', `Setting jobs collection (count=${jobs.length})`);
    const jsonValue = JSON.stringify(jobs);
    await AsyncStorage.setItem(JOBS_KEY, jsonValue);
    logService.info('STORAGE', 'Jobs collection replaced successfully');
  } catch (error) {
    logService.logError('STORAGE', error as Error, {
      operation: 'setJobs',
      jobCount: jobs.length,
    });
    throw error;
  }
};

// Clear all persisted app data (Redux Persist + storage consumers)
export const clearAllPersistedData = async (): Promise<void> => {
  try {
    logService.warn('STORAGE', 'Clearing ALL persisted data');
    await AsyncStorage.clear();
    logService.info('STORAGE', 'All persisted data cleared');
  } catch (error) {
    logService.logError('STORAGE', error as Error, { operation: 'clearAllPersistedData' });
    throw error;
  }
};
