import jobsReducer, {
  addJob,
  updateJob,
  deleteJob,
  setFilter,
  fetchJobs,
  createJob,
  modifyJob,
  removeJob,
} from '../state/slices/jobsSlice';
import { Job } from '../types';
import { configureStore } from '@reduxjs/toolkit';

describe('jobsSlice', () => {
  const initialState = {
    jobs: [],
    loading: false,
    error: null,
    filter: 'all' as const,
  };

  const mockJob: Job = {
    id: 'test-job-1',
    jobName: 'Test Job',
    description: 'A test job description',
    clientId: 'client-1',
    clientName: 'Test Client',
    quote: 1000,
    quoteDate: '2024-01-01',
    startDate: '2024-01-02',
    endDate: '2024-01-10',
    status: 'Quoted',
    expenses: [],
    toolsAndSupplies: [],
    notes: 'Test notes',
  };

  it('should return the initial state', () => {
    expect(jobsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle addJob', () => {
    const actual = jobsReducer(initialState, addJob(mockJob));
    expect(actual.jobs).toHaveLength(1);
    expect(actual.jobs[0]).toEqual(mockJob);
  });

  it('should handle updateJob', () => {
    const stateWithJob = {
      ...initialState,
      jobs: [mockJob],
    };

    const updatedJob = {
      ...mockJob,
      jobName: 'Updated Job Name',
      status: 'In-Progress' as const,
    };

    const actual = jobsReducer(stateWithJob, updateJob(updatedJob));
    expect(actual.jobs[0].jobName).toBe('Updated Job Name');
    expect(actual.jobs[0].status).toBe('In-Progress');
  });

  it('should handle deleteJob', () => {
    const stateWithJob = {
      ...initialState,
      jobs: [mockJob],
    };

    const actual = jobsReducer(stateWithJob, deleteJob(mockJob.id));
    expect(actual.jobs).toHaveLength(0);
  });

  it('should handle setFilter', () => {
    const actual = jobsReducer(initialState, setFilter('completed'));
    expect(actual.filter).toBe('completed');
  });

  it('should not update job if id does not exist', () => {
    const stateWithJob = {
      ...initialState,
      jobs: [mockJob],
    };

    const nonExistentJob = {
      ...mockJob,
      id: 'non-existent-id',
      jobName: 'This should not be added',
    };

    const actual = jobsReducer(stateWithJob, updateJob(nonExistentJob));
    expect(actual.jobs).toHaveLength(1);
    expect(actual.jobs[0].jobName).toBe('Test Job');
  });

  describe('async thunks', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          jobs: jobsReducer,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: false,
          }),
      });
    });

    it('should handle fetchJobs.pending', () => {
      const action = { type: fetchJobs.pending.type };
      const actual = jobsReducer(initialState, action);
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    it('should handle fetchJobs.fulfilled', () => {
      const action = { 
        type: fetchJobs.fulfilled.type, 
        payload: [mockJob] 
      };
      const actual = jobsReducer(initialState, action);
      expect(actual.loading).toBe(false);
      expect(actual.jobs).toEqual([mockJob]);
      expect(actual.error).toBe(null);
    });

    it('should handle fetchJobs.rejected', () => {
      const action = { 
        type: fetchJobs.rejected.type,
        error: { message: 'Failed to fetch jobs' }
      };
      const actual = jobsReducer(initialState, action);
      expect(actual.loading).toBe(false);
      expect(actual.error).toBe('Failed to fetch jobs');
    });

    it('should handle createJob.fulfilled', () => {
      const action = { 
        type: createJob.fulfilled.type, 
        payload: mockJob 
      };
      const actual = jobsReducer(initialState, action);
      expect(actual.loading).toBe(false);
      expect(actual.jobs).toEqual([mockJob]);
      expect(actual.error).toBe(null);
    });

    it('should handle modifyJob.fulfilled', () => {
      const stateWithJob = {
        ...initialState,
        jobs: [mockJob],
      };

      const updatedJob = {
        ...mockJob,
        jobName: 'Updated Job Name',
      };

      const action = { 
        type: modifyJob.fulfilled.type, 
        payload: updatedJob 
      };
      const actual = jobsReducer(stateWithJob, action);
      expect(actual.loading).toBe(false);
      expect(actual.jobs[0].jobName).toBe('Updated Job Name');
      expect(actual.error).toBe(null);
    });

    it('should handle removeJob.fulfilled', () => {
      const stateWithJob = {
        ...initialState,
        jobs: [mockJob],
      };

      const action = { 
        type: removeJob.fulfilled.type, 
        payload: mockJob.id 
      };
      const actual = jobsReducer(stateWithJob, action);
      expect(actual.loading).toBe(false);
      expect(actual.jobs).toHaveLength(0);
      expect(actual.error).toBe(null);
    });
  });
});