import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BudgetSummary as BudgetSummaryType } from '../../services/BudgetAnalytics';

interface Props {
  summary: BudgetSummaryType;
}

const BudgetSummary: React.FC<Props> = ({ summary }) => {
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.summarySection}>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.earningsCard]}>
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(summary.totalEarnings)}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.expensesCard]}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(summary.totalExpenses)}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.profitCard]}>
          <Text style={styles.summaryLabel}>Net Profit</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(summary.netProfit)}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.marginCard]}>
          <Text style={styles.summaryLabel}>Profit Margin</Text>
          <Text style={styles.summaryValue}>
            {summary.profitMargin.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={styles.additionalMetrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Reimbursable Expenses:</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(summary.reimbursableExpenses)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Tax Deductible:</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(summary.taxDeductibleExpenses)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summarySection: {
    padding: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: '1%',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  expensesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  marginCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  additionalMetrics: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default BudgetSummary;
