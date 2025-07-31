import { Job, Expense } from '../types';

export interface BudgetSummary {
  totalEarnings: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  reimbursableExpenses: number;
  taxDeductibleExpenses: number;
}

export interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  count: number;
  average: number;
  trend: 'up' | 'down' | 'stable';
}


export interface MonthlyTrend {
  month: string;
  earnings: number;
  expenses: number;
  profit: number;
  jobCount: number;
}

class BudgetAnalytics {
  public calculateBudgetSummary(jobs: Job[]): BudgetSummary {
    const totalEarnings = jobs.reduce((sum, job) => sum + job.pay, 0);
    const allExpenses = jobs.flatMap((job) => job.expenses);
    const totalExpenses = allExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const reimbursableExpenses = allExpenses
      .filter((expense) => expense.isReimbursable)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const netProfit = totalEarnings - totalExpenses + reimbursableExpenses;
    const profitMargin =
      totalEarnings > 0 ? (netProfit / totalEarnings) * 100 : 0;

    // Assume 85% of business expenses are tax deductible
    const taxDeductibleExpenses = totalExpenses * 0.85;

    return {
      totalEarnings,
      totalExpenses,
      netProfit,
      profitMargin,
      reimbursableExpenses,
      taxDeductibleExpenses,
    };
  }

  public categorizeExpenses(jobs: Job[]): ExpenseCategory[] {
    const allExpenses = jobs.flatMap((job) => job.expenses);
    const categoryMap = new Map<string, Expense[]>();

    // Group expenses by category
    allExpenses.forEach((expense) => {
      const category = this.getCategoryFromDescription(expense.description);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(expense);
    });

    const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categories: ExpenseCategory[] = [];

    categoryMap.forEach((expenses, categoryName) => {
      const amount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      const count = expenses.length;
      const average = count > 0 ? amount / count : 0;

      categories.push({
        name: categoryName,
        amount,
        percentage,
        count,
        average,
        trend: this.calculateTrend(expenses), // Simplified trend calculation
      });
    });

    return categories.sort((a, b) => b.amount - a.amount);
  }

  private getCategoryFromDescription(description: string): string {
    const lowerDesc = description.toLowerCase();

    if (
      lowerDesc.includes('gas') ||
      lowerDesc.includes('fuel') ||
      lowerDesc.includes('gasoline')
    ) {
      return 'Fuel';
    }
    if (
      lowerDesc.includes('food') ||
      lowerDesc.includes('meal') ||
      lowerDesc.includes('lunch') ||
      lowerDesc.includes('dinner')
    ) {
      return 'Meals';
    }
    if (
      lowerDesc.includes('phone') ||
      lowerDesc.includes('data') ||
      lowerDesc.includes('cellular') ||
      lowerDesc.includes('mobile')
    ) {
      return 'Phone/Data';
    }
    if (
      lowerDesc.includes('parking') ||
      lowerDesc.includes('toll') ||
      lowerDesc.includes('fee')
    ) {
      return 'Parking & Tolls';
    }
    if (
      lowerDesc.includes('maintenance') ||
      lowerDesc.includes('repair') ||
      lowerDesc.includes('oil') ||
      lowerDesc.includes('tire')
    ) {
      return 'Vehicle Maintenance';
    }
    if (
      lowerDesc.includes('insurance') ||
      lowerDesc.includes('registration') ||
      lowerDesc.includes('license')
    ) {
      return 'Insurance & Licensing';
    }
    if (
      lowerDesc.includes('supply') ||
      lowerDesc.includes('equipment') ||
      lowerDesc.includes('bag') ||
      lowerDesc.includes('charger')
    ) {
      return 'Supplies & Equipment';
    }

    return 'Other';
  }

  private calculateTrend(expenses: Expense[]): 'up' | 'down' | 'stable' {
    if (expenses.length < 2) return 'stable';

    // Sort by date
    const sortedExpenses = expenses.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstHalf = sortedExpenses.slice(
      0,
      Math.floor(sortedExpenses.length / 2)
    );
    const secondHalf = sortedExpenses.slice(
      Math.floor(sortedExpenses.length / 2)
    );

    const firstHalfAvg =
      firstHalf.reduce((sum, exp) => sum + exp.amount, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, exp) => sum + exp.amount, 0) / secondHalf.length;

    const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (changePercent > 10) return 'up';
    if (changePercent < -10) return 'down';
    return 'stable';
  }


  public calculateMonthlyTrends(jobs: Job[]): MonthlyTrend[] {
    const monthlyData = new Map<
      string,
      { earnings: number; expenses: number; jobs: Job[] }
    >();

    jobs.forEach((job) => {
      const date = new Date(job.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { earnings: 0, expenses: 0, jobs: [] });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.earnings += job.pay;
      monthData.expenses += job.expenses.reduce(
        (sum, exp) => sum + exp.amount,
        0
      );
      monthData.jobs.push(job);
    });

    const trends: MonthlyTrend[] = [];
    monthlyData.forEach((data, monthKey) => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(
        parseInt(year),
        parseInt(month) - 1
      ).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      trends.push({
        month: monthName,
        earnings: data.earnings,
        expenses: data.expenses,
        profit: data.earnings - data.expenses,
        jobCount: data.jobs.length,
      });
    });

    return trends.sort((a, b) => a.month.localeCompare(b.month));
  }

  public calculateExpenseEfficiency(jobs: Job[]): {
    expensePerJob: number;
    expensePerDollarEarned: number;
    mostEfficientJobType: string;
    leastEfficientJobType: string;
  } {
    if (jobs.length === 0) {
      return {
        expensePerJob: 0,
        expensePerDollarEarned: 0,
        mostEfficientJobType: 'N/A',
        leastEfficientJobType: 'N/A',
      };
    }

    const totalExpenses = jobs.reduce(
      (sum, job) =>
        sum + job.expenses.reduce((expSum, exp) => expSum + exp.amount, 0),
      0
    );
    const totalEarnings = jobs.reduce((sum, job) => sum + job.pay, 0);

    const expensePerJob = totalExpenses / jobs.length;
    const expensePerDollarEarned =
      totalEarnings > 0 ? totalExpenses / totalEarnings : 0;

    // Group by job title to find most/least efficient
    const jobTypeEfficiency = new Map<
      string,
      { totalExpenses: number; totalEarnings: number; count: number }
    >();

    jobs.forEach((job) => {
      const jobType = job.title;
      if (!jobTypeEfficiency.has(jobType)) {
        jobTypeEfficiency.set(jobType, {
          totalExpenses: 0,
          totalEarnings: 0,
          count: 0,
        });
      }

      const data = jobTypeEfficiency.get(jobType)!;
      data.totalExpenses += job.expenses.reduce(
        (sum, exp) => sum + exp.amount,
        0
      );
      data.totalEarnings += job.pay;
      data.count += 1;
    });

    let mostEfficient = 'N/A';
    let leastEfficient = 'N/A';
    let bestRatio = Infinity;
    let worstRatio = -1;

    jobTypeEfficiency.forEach((data, jobType) => {
      if (data.count > 1) {
        // Only consider job types with multiple entries
        const ratio =
          data.totalEarnings > 0
            ? data.totalExpenses / data.totalEarnings
            : Infinity;

        if (ratio < bestRatio) {
          bestRatio = ratio;
          mostEfficient = jobType;
        }

        if (ratio > worstRatio && ratio !== Infinity) {
          worstRatio = ratio;
          leastEfficient = jobType;
        }
      }
    });

    return {
      expensePerJob,
      expensePerDollarEarned,
      mostEfficientJobType: mostEfficient,
      leastEfficientJobType: leastEfficient,
    };
  }
}

export const budgetAnalytics = new BudgetAnalytics();
