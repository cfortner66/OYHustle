import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Job } from '../../types';

export const selectJobsState = (state: RootState) => state.jobs;

export const selectJobs = (state: RootState) => state.jobs.jobs;

export const selectJobsLoading = (state: RootState) => state.jobs.loading;

export const selectJobsError = (state: RootState) => state.jobs.error;

export const selectJobsFilter = (state: RootState) => state.jobs.filter;

export const selectJobById = createSelector(
  [selectJobs, (state: RootState, jobId: string) => jobId],
  (jobs, jobId) => jobs.find((job) => job.id === jobId)
);

export const selectFilteredJobs = createSelector(
  [selectJobs, selectJobsFilter],
  (jobs, filter) => {
    switch (filter) {
      case 'active':
        return jobs.filter((job) => 
          job.status === 'Quoted' || 
          job.status === 'Accepted' || 
          job.status === 'In-Progress'
        );
      case 'completed':
        return jobs.filter((job) => 
          job.status === 'Completed' || 
          job.status === 'Cancelled'
        );
      case 'all':
      default:
        return jobs;
    }
  }
);

export const selectJobsByClient = createSelector(
  [selectJobs, (state: RootState, clientId: string) => clientId],
  (jobs, clientId) => jobs.filter((job) => job.clientId === clientId)
);

export const selectJobsByStatus = createSelector(
  [selectJobs, (state: RootState, status: Job['status']) => status],
  (jobs, status) => jobs.filter((job) => job.status === status)
);

export const selectJobsCount = createSelector(
  [selectJobs],
  (jobs) => jobs.length
);

export const selectActiveJobsCount = createSelector(
  [selectJobs],
  (jobs) => jobs.filter((job) => 
    job.status === 'Quoted' || 
    job.status === 'Accepted' || 
    job.status === 'In-Progress'
  ).length
);

export const selectCompletedJobsCount = createSelector(
  [selectJobs],
  (jobs) => jobs.filter((job) => job.status === 'Completed').length
);

export const selectTotalQuotedValue = createSelector(
  [selectJobs],
  (jobs) => jobs.reduce((total, job) => total + job.quote, 0)
);

export const selectTotalCompletedValue = createSelector(
  [selectJobs],
  (jobs) => jobs
    .filter((job) => job.status === 'Completed')
    .reduce((total, job) => total + job.quote, 0)
);