import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Expense } from '../../types';

interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
}

interface BudgetState {
  budgets: Budget[];
  expenses: Expense[];
  totalBudget: number;
  totalSpent: number;
  loading: boolean;
  error: string | null;
}

const initialState: BudgetState = {
  budgets: [],
  expenses: [],
  totalBudget: 0,
  totalSpent: 0,
  loading: false,
  error: null,
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    setBudgets: (state, action: PayloadAction<Budget[]>) => {
      state.budgets = action.payload;
      state.totalBudget = action.payload.reduce(
        (sum, budget) => sum + budget.amount,
        0
      );
    },
    addBudget: (state, action: PayloadAction<Budget>) => {
      state.budgets.push(action.payload);
      state.totalBudget += action.payload.amount;
    },
    updateBudget: (state, action: PayloadAction<Budget>) => {
      const index = state.budgets.findIndex(
        (budget) => budget.id === action.payload.id
      );
      if (index !== -1) {
        const oldAmount = state.budgets[index]?.amount ?? 0;
        state.budgets[index] = action.payload;
        state.totalBudget =
          state.totalBudget - oldAmount + action.payload.amount;
      }
    },
    deleteBudget: (state, action: PayloadAction<string>) => {
      const budget = state.budgets.find((b) => b.id === action.payload);
      if (budget) {
        state.totalBudget -= budget.amount;
      }
      state.budgets = state.budgets.filter(
        (budget) => budget.id !== action.payload
      );
    },
    setExpenses: (state, action: PayloadAction<Expense[]>) => {
      state.expenses = action.payload;
      state.totalSpent = action.payload.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
    },
    addExpense: (state, action: PayloadAction<Expense>) => {
      state.expenses.push(action.payload);
      state.totalSpent += action.payload.amount;

      // Update corresponding budget's spent amount
      const budget = state.budgets.find(
        (b) => b.category === action.payload.category
      );
      if (budget) {
        budget.spent += action.payload.amount;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setBudgets,
  addBudget,
  updateBudget,
  deleteBudget,
  setExpenses,
  addExpense,
  setLoading,
  setError,
} = budgetSlice.actions;

export default budgetSlice.reducer;
