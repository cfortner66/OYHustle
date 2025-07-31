import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { ExpenseCategory } from '../../services/BudgetAnalytics';

interface Props {
  categories: ExpenseCategory[];
}

const { width } = Dimensions.get('window');

const BudgetChart: React.FC<Props> = ({ categories }) => {
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '➡️';
    }
  };

  if (categories.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>No expense data available</Text>
        <Text style={styles.emptyStateMessage}>
          Start tracking expenses to see your spending breakdown.
        </Text>
      </View>
    );
  }

  // Prepare data for PieChart
  const pieData = categories.slice(0, 6).map((category, index) => ({
    name: category.name,
    amount: category.amount,
    color: `hsl(${(index * 360) / 6}, 70%, 50%)`,
    legendFontColor: '#7F7F7F',
    legendFontSize: 15,
  }));

  // Prepare data for BarChart
  const barData = {
    labels: categories.slice(0, 5).map((cat) => cat.name.substring(0, 8)),
    datasets: [
      {
        data: categories.slice(0, 5).map((cat) => cat.amount),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726',
    },
  };

  return (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitle}>📊 Expense Breakdown</Text>

      {/* Pie Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Expense Distribution</Text>
        <PieChart
          data={pieData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 50]}
          absolute
        />
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Categories</Text>
        <BarChart
          data={barData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          yAxisLabel="$"
          yAxisSuffix=""
          showValuesOnTopOfBars
        />
      </View>

      {/* Category Details List */}
      {categories.map((category, index) => (
        <View key={index} style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <View style={styles.categoryMetrics}>
              <Text style={styles.categoryTrend}>
                {getTrendIcon(category.trend)}
              </Text>
              <Text style={styles.categoryAmount}>
                {formatCurrency(category.amount)}
              </Text>
            </View>
          </View>

          <View style={styles.categoryDetails}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(category.percentage, 100)}%` },
                ]}
              />
            </View>
            <View style={styles.categoryStats}>
              <Text style={styles.categoryPercentage}>
                {category.percentage.toFixed(1)}%
              </Text>
              <Text style={styles.categoryCount}>
                {category.count} transactions
              </Text>
              <Text style={styles.categoryAverage}>
                Avg: {formatCurrency(category.average)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  categoriesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTrend: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryDetails: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
  },
  categoryAverage: {
    fontSize: 12,
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

export default BudgetChart;
