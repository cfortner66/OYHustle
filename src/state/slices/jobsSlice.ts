import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Job } from '../../types';
import { getJobs, getJobById, saveJob, updateJob as updateJobStorage, deleteJob as deleteJobStorage } from '../../services/StorageService';
import { logService } from '../../services/LoggingService';

interface JobsState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'active' | 'completed';
}

const initialState: JobsState = {
  jobs: [],
  loading: false,
  error: null,
  filter: 'all',
};

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async () => {
    const jobs = await getJobs();
    logService.logUserAction('Fetched jobs via Redux', { jobCount: jobs.length });
    return jobs;
  }
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id: string) => {
    const job = await getJobById(id);
    if (!job) {
      throw new Error(`Job with ID ${id} not found`);
    }
    return job;
  }
);

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (job: Job) => {
    await saveJob(job);
    logService.logUserAction('Created job via Redux', { jobId: job.id, jobName: job.jobName });
    return job;
  }
);

export const modifyJob = createAsyncThunk(
  'jobs/modifyJob',
  async (job: Job) => {
    try {
      await updateJobStorage(job);
      logService.logUserAction('Updated job via Redux', { jobId: job.id, jobName: job.jobName });
      return job;
    } catch (error) {
      // Fallback: if job was never persisted, save it
      await saveJob(job);
      logService.logUserAction('Upserted job via Redux', { jobId: job.id, jobName: job.jobName });
      return job;
    }
  }
);

export const removeJob = createAsyncThunk(
  'jobs/removeJob',
  async (id: string) => {
    await deleteJobStorage(id);
    logService.logUserAction('Deleted job via Redux', { jobId: id });
    return id;
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setJobs: (state, action: PayloadAction<Job[]>) => {
      state.jobs = action.payload;
      state.loading = false;
      state.error = null;
    },
    addJob: (state, action: PayloadAction<Job>) => {
      state.jobs.push(action.payload);
    },
    updateJob: (state, action: PayloadAction<Job>) => {
      const index = state.jobs.findIndex((job) => job.id === action.payload.id);
      if (index !== -1) {
        state.jobs[index] = action.payload;
      }
    },
    deleteJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter((job) => job.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setFilter: (
      state,
      action: PayloadAction<'all' | 'active' | 'completed'>
    ) => {
      state.filter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
        state.error = null;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch jobs';
      })
      .addCase(createJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.push(action.payload);
        state.error = null;
      })
      .addCase(createJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create job';
      })
      .addCase(modifyJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(modifyJob.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.jobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(modifyJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update job';
      })
      .addCase(removeJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = state.jobs.filter((job) => job.id !== action.payload);
        state.error = null;
      })
      .addCase(removeJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete job';
      });
  },
});

export const {
  setJobs,
  addJob,
  updateJob,
  deleteJob,
  setLoading,
  setError,
  setFilter,
} = jobsSlice.actions;

export default jobsSlice.reducer;
