export type RootStackParamList = {
  MainTabs: undefined;
  JobDetail: { jobId: string };
  EditJob: { jobId: string };
  AddExpense: { jobId: string };
  ReceiptPhotoCapture: { onPhotoTaken: (photoPath: string) => void };
};

export type TabParamList = {
  Jobs: undefined;
  Recommendations: undefined;
  Budget: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
