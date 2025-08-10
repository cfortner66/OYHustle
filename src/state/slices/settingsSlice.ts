import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  userEmail: string;
  smsOnly: boolean;
}

const initialState: SettingsState = {
  userEmail: '',
  smsOnly: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUserEmail: (state, action: PayloadAction<string>) => {
      state.userEmail = action.payload.trim();
    },
    setSmsOnly: (state, action: PayloadAction<boolean>) => {
      state.smsOnly = action.payload;
    },
    resetSettings: () => initialState,
  },
});

export const { setUserEmail, setSmsOnly, resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;


