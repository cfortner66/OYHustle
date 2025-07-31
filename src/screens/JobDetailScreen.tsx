import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Job, Client } from '../types';
import { RootState } from '../state/store';
import { deleteJob } from '../state/slices/jobsSlice';
import { logService } from '../services/LoggingService';
import { Checklist, NotesEditor } from '../components';

type RootStackParamList = {
  JobDetail: { job: Job };
  EditJob: { job: Job };
  ClientDetail: { client: Client };
  AddExpense: { job: Job };
  Payment: { job: Job };
};

type JobDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JobDetail'>;
type JobDetailScreenRouteProp = RouteProp<RootStackParamList, 'JobDetail'>;

type Props = {
  navigation: JobDetailScreenNavigationProp;
  route: JobDetailScreenRouteProp;
};

const JobDetailScreen = ({ navigation, route }: Props) => {
  const dispatch = useDispatch();
  const jobs = useSelector((state: RootState) => state.jobs.jobs);
  const clients = useSelector((state: RootState) => state.clients.clients);
  
  const [job, setJob] = useState<Job>(route.params.job);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      title: job.jobName,
    });
    loadJobDetails();
  }, [navigation, job]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      
      // Load fresh job data from Redux
      const freshJob = jobs.find(j => j.id === job.id);
      if (freshJob) {
        setJob(freshJob);
      }
      
      // Load client details from Redux
      const clientData = clients.find(c => c.id === job.clientId);
      setClient(clientData || null);
      
      logService.logUserAction('Viewed job detail', { 
        jobId: job.id, 
        jobName: job.jobName,
        clientId: job.clientId 
      });
    } catch (error) {
      logService.logError('JOB_DETAIL', error as Error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = () => {
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${job.jobName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              dispatch(deleteJob(job.id));
              logService.logUserAction('Deleted job', { 
                jobId: job.id, 
                jobName: job.jobName 
              });
              navigation.goBack();
            } catch (error) {
              logService.logError('JOB_DETAIL', error as Error);
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#4CAF50';
      case 'In-Progress': return '#2196F3';
      case 'Accepted': return '#FF9800';
      case 'Quoted': return '#9C27B0';
      case 'Cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateTotalExpenses = () => {
    return job.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const calculateProfit = () => {
    return job.quote - calculateTotalExpenses();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Job Header */}
      <View style={styles.jobHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle}>{job.jobName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{job.status}</Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditJob', { job })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          
          {job.status !== 'Completed' && job.status !== 'Cancelled' && (
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => navigation.navigate('Payment', { job })}
            >
              <Text style={styles.paymentButtonText}>💳 Payment</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteJob}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Job Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Details</Text>
        <Text style={styles.description}>{job.description}</Text>
        
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Quote Amount</Text>
            <Text style={styles.detailValue}>{formatCurrency(job.quote)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Quote Date</Text>
            <Text style={styles.detailValue}>{formatDate(job.quoteDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>{formatDate(job.startDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>{formatDate(job.endDate)}</Text>
          </View>
        </View>
      </View>

      {/* Client Information */}
      {client && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <TouchableOpacity
            style={styles.clientCard}
            onPress={() => navigation.navigate('ClientDetail', { client })}
          >
            <Text style={styles.clientName}>{client.fullName}</Text>
            <Text style={styles.clientInfo}>📧 {client.emailAddress}</Text>
            <Text style={styles.clientInfo}>📞 {client.phoneNumber}</Text>
            <Text style={styles.clientInfo}>📍 {client.address}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Financial Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Summary</Text>
        <View style={styles.financialGrid}>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Quote</Text>
            <Text style={[styles.financialValue, { color: '#2196F3' }]}>
              {formatCurrency(job.quote)}
            </Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Expenses</Text>
            <Text style={[styles.financialValue, { color: '#f44336' }]}>
              {formatCurrency(calculateTotalExpenses())}
            </Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Profit</Text>
            <Text style={[
              styles.financialValue, 
              { color: calculateProfit() >= 0 ? '#4CAF50' : '#f44336' }
            ]}>
              {formatCurrency(calculateProfit())}
            </Text>
          </View>
        </View>
      </View>

      {/* Expenses */}
      <View style={styles.section}>
        <View style={styles.expensesHeader}>
          <Text style={styles.sectionTitle}>Expenses ({job.expenses.length})</Text>
          <TouchableOpacity
            style={styles.addExpenseButton}
            onPress={() => navigation.navigate('AddExpense', { job })}
          >
            <Text style={styles.addExpenseButtonText}>+ Add Expense</Text>
          </TouchableOpacity>
        </View>

        {job.expenses.length === 0 ? (
          <View style={styles.emptyExpenses}>
            <Text style={styles.emptyExpensesText}>No expenses recorded</Text>
            <Text style={styles.emptyExpensesSubtext}>Add your first expense to track costs</Text>
          </View>
        ) : (
          job.expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseDescription}>{expense.description}</Text>
                <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
              </View>
              <View style={styles.expenseFooter}>
                <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
                {expense.isReimbursable && (
                  <Text style={styles.reimbursableTag}>Reimbursable</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Tools & Supplies */}
      {job.toolsAndSupplies && job.toolsAndSupplies.length > 0 && (
        <View style={styles.section}>
          <Checklist
            items={job.toolsAndSupplies}
            onItemsChange={() => {}} // Read-only in detail view
            title="Tools & Supplies"
            editable={false}
          />
        </View>
      )}

      {/* Notes */}
      {job.notes && job.notes.trim().length > 0 && (
        <View style={styles.section}>
          <NotesEditor
            notes={job.notes}
            onNotesChange={() => {}} // Read-only in detail view
            title="Job Notes"
            editable={false}
          />
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
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  jobHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clientCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  clientInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  financialItem: {
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addExpenseButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addExpenseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyExpenses: {
    alignItems: 'center',
    padding: 20,
  },
  emptyExpensesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptyExpensesSubtext: {
    fontSize: 14,
    color: '#666',
  },
  expenseItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseDescription: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f44336',
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: 12,
    color: '#666',
  },
  reimbursableTag: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default JobDetailScreen;
