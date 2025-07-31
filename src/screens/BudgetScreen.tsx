import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  budgetAnalytics,
  BudgetSummary,
  ExpenseCategory,
} from '../services/BudgetAnalytics';
import { getJobs as getAllJobs } from '../services/StorageService';
import { Job } from '../types';

// Import components
import BudgetSummaryComponent from '../components/budget/BudgetSummary';
import BudgetChart from '../components/budget/BudgetChart';
import PeriodSelector from '../components/budget/PeriodSelector';

type RootStackParamList = {
  Budget: undefined;
};

type BudgetScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Budget'
>;

type Props = {
  navigation: BudgetScreenNavigationProp;
};

const BudgetScreen = ({ navigation: _ }: Props) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | 'year'
  >('month');

  useEffect(() => {
    loadBudgetData();
  }, [selectedPeriod]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const allJobs = await getAllJobs();
      const filteredJobs = filterJobsByPeriod(allJobs, selectedPeriod);

      setJobs(filteredJobs);
      setSummary(budgetAnalytics.calculateBudgetSummary(filteredJobs));
      setCategories(budgetAnalytics.categorizeExpenses(filteredJobs));
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterJobsByPeriod = (
    allJobs: Job[],
    period: 'week' | 'month' | 'year'
  ): Job[] => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (period) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return allJobs.filter((job) => new Date(job.date) >= cutoffDate);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>📊 Analyzing your budget...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No budget data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget Analysis</Text>
        <Text style={styles.subtitle}>Track your financial performance</Text>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </View>

      {/* Summary Cards */}
      <BudgetSummaryComponent summary={summary} />

      {/* Expense Categories */}
      <BudgetChart categories={categories} />

      {/* Empty State */}
      {jobs.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>
            No Data for {selectedPeriod}
          </Text>
          <Text style={styles.emptyStateMessage}>
            Complete some jobs and track expenses to see your budget analysis
            here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BudgetScreen;
