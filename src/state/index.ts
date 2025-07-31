// Redux state management exports
export { store, persistor } from './store';
export type { RootState, AppDispatch } from './store';
export { useAppDispatch, useAppSelector } from './hooks';

// Slice exports - specific exports to avoid conflicts
export {
  setJobs,
  addJob,
  updateJob,
  deleteJob,
  setFilter as setJobsFilter,
  setLoading as setJobsLoading,
  setError as setJobsError,
} from './slices/jobsSlice';

export {
  setBudgets,
  addBudget,
  updateBudget,
  deleteBudget,
  setExpenses,
  addExpense,
  setLoading as setBudgetLoading,
  setError as setBudgetError,
} from './slices/budgetSlice';

// Recommendations slice not yet implemented
// export {
//   setRecommendations,
//   dismissRecommendation,
//   setFilter as setRecommendationsFilter,
//   setLoading as setRecommendationsLoading,
//   setError as setRecommendationsError,
//   refreshRecommendations,
// } from './slices/recommendationsSlice';
