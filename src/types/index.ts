export interface Client {
  id: string;
  fullName: string;
  address: string;
  phoneNumber: string;
  emailAddress: string;
  createdDate: string;
}

export interface Job {
  id: string;
  jobName: string;
  description: string;
  clientId: string;
  clientName: string; // Keep for easy display
  quote: number;
  quoteDate: string;
  startDate: string;
  endDate: string;
  status: 'Quoted' | 'Accepted' | 'In-Progress' | 'Completed' | 'Cancelled';
  expenses: Expense[];
  toolsAndSupplies?: ChecklistItem[];
  notes?: string;
  payments?: Payment[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  isReimbursable: boolean;
  date: string;
  receiptImageUrl?: string;
  receiptImageLocalUri?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdDate: string;
}

export interface Payment {
  id: string;
  jobId: string;
  amount: number;
  method: 'paypal' | 'gcash' | 'cash' | 'card' | 'venmo';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  paymentDate: string;
  notes?: string;
}

export interface PaymentRequest {
  jobId: string;
  amount: number;
  method: 'paypal' | 'gcash' | 'cash' | 'card' | 'venmo';
  description: string;
  paymentDate?: string; // ISO date (YYYY-MM-DD) or ISO timestamp
}
