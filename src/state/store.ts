import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jobsSlice from './slices/jobsSlice';
import budgetSlice from './slices/budgetSlice';
import clientsSlice from './slices/clientsSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['jobs', 'budget', 'clients'], // Persist jobs, budget, and clients data
};

const rootReducer = combineReducers({
  jobs: jobsSlice,
  budget: budgetSlice,
  clients: clientsSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
