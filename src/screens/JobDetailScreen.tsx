import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Job, Client } from '../types';
import { AppDispatch, RootState } from '../state/store';
import { deleteJob, modifyJob } from '../state/slices/jobsSlice';
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
  const dispatch = useDispatch<AppDispatch>();
  const jobs = useSelector((state: RootState) => state.jobs.jobs);
  const clients = useSelector((state: RootState) => state.clients.clients);
  
  const [job, setJob] = useState<Job>(route.params.job);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: job.jobName,
    });
  }, [navigation, job.jobName]);

  // Refresh details whenever screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      loadJobDetails();
    }, [jobs, clients])
  );

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

  const setJobStatus = async (newStatus: Job['status']) => {
    try {
      if (job.status === newStatus) {
        setStatusPickerVisible(false);
        return;
      }
      const updatedJob: Job = { ...job, status: newStatus };
      await dispatch(modifyJob(updatedJob)).unwrap();
      setJob(updatedJob);
      logService.logUserAction('Changed job status', { jobId: job.id, from: job.status, to: newStatus });
    } catch (error) {
      logService.logError('CHANGE_JOB_STATUS', error as Error);
      Alert.alert('Error', 'Failed to change status');
    } finally {
      setStatusPickerVisible(false);
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
    // Profit should only subtract expenses that are not reimbursable by the client
    const unreimbursedExpenses = job.expenses.reduce((sum, expense) => {
      return sum + (expense.isReimbursable ? 0 : expense.amount);
    }, 0);
    return job.quote - unreimbursedExpenses;
  };

  const calculateReimbursableTotal = () => {
    return job.expenses
      .filter((e) => e.isReimbursable)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const calculateTotalPaid = () => {
    const payments = job.payments || [];
    return payments
      .filter((p) => p.status !== 'failed' && p.status !== 'cancelled')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateAmountOwed = () => {
    const totalDue = job.quote + calculateReimbursableTotal();
    const totalPaid = calculateTotalPaid();
    return Math.max(totalDue - totalPaid, 0);
  };

  const buildQuoteText = () => {
    const reimbTotal = calculateReimbursableTotal();
    const totalDue = job.quote + reimbTotal;
    const tools = (job.toolsAndSupplies || [])
      .map((t) => `- ${t.text}`)
      .join('\n');
    const notes = job.notes?.trim() ? job.notes.trim() : 'None';
    const clientName = client?.fullName || job.clientName;
    return (
      `Quote for ${job.jobName}\n` +
      `Client: ${clientName}\n` +
      `Quote Amount: ${formatCurrency(job.quote)}\n` +
      `Reimbursable Expenses: ${formatCurrency(reimbTotal)}\n` +
      `Total Due: ${formatCurrency(totalDue)}\n` +
      `\nTools & Supplies:\n${tools || 'None'}\n` +
      `\nNotes:\n${notes}`
    );
  };

  const smsOnly = useSelector((state: RootState) => state.settings.smsOnly);

  const sendEmailQuote = async () => {
    const email = client?.emailAddress;
    if (!email) {
      Alert.alert('No Email', 'This client does not have an email address on file.');
      return;
    }
    const subject = `Quote for ${job.jobName} - ${client?.fullName || job.clientName}`;
    const body = buildQuoteText();
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Error', 'No mail app available');
    } catch (e) {
      Alert.alert('Error', 'Failed to open mail app');
    }
  };

  const sendSmsQuote = async () => {
    const phone = client?.phoneNumber;
    if (!phone) {
      Alert.alert('No Phone', 'This client does not have a phone number on file.');
      return;
    }
    const body = buildQuoteText();
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${encodeURIComponent(phone)}${sep}body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Error', 'No SMS app available');
    } catch (e) {
      Alert.alert('Error', 'Failed to open SMS app');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container}>
      {/* Job Header */}
      <View style={styles.jobHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle}>{job.jobName}</Text>
          <TouchableOpacity
            onPress={() => setStatusPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Change job status"
          >
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}> 
              <Text style={styles.statusText}>{job.status}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditJob', { job })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          
          {job.status !== 'Cancelled' && (
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

      {/* Share Quote */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share Quote</Text>
        <View style={styles.shareRow}>
          {!smsOnly && (
            <TouchableOpacity style={styles.shareButtonEmail} onPress={sendEmailQuote}>
              <Text style={styles.shareButtonText}>📧 Email Quote</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.shareButtonSms} onPress={sendSmsQuote}>
            <Text style={styles.shareButtonText}>📱 Text Quote</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Payments */}
      {job.payments && job.payments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments ({job.payments.length})</Text>

          <View style={styles.paymentSummaryRow}>
            <Text style={styles.detailLabel}>Total Paid</Text>
            <Text style={styles.detailValue}>{formatCurrency(calculateTotalPaid())}</Text>
          </View>
          <View style={styles.paymentSummaryRow}>
            <Text style={styles.detailLabel}>Amount Owed</Text>
            <Text style={styles.detailValue}>{formatCurrency(calculateAmountOwed())}</Text>
          </View>

          {job.payments
            .slice()
            .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
            .map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <Text style={styles.paymentText}>
                  {new Date(p.paymentDate).toLocaleDateString('en-US')} - {p.method.toUpperCase()}
                  {p.status && p.status !== 'completed' ? ` (${p.status})` : ''}
                </Text>
                <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
              </View>
            ))}
        </View>
      )}

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
            <TouchableOpacity
              key={expense.id}
              style={styles.expenseItem}
              onPress={() => navigation.navigate('AddExpense', { job, expense })}
            >
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
            </TouchableOpacity>
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
    
    {/* Status Picker Modal */}
    <Modal
      visible={statusPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setStatusPickerVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setStatusPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.statusModalContent}>
              {(['Quoted','Accepted','In-Progress','Completed','Cancelled'] as Job['status'][]).map((s) => (
                <TouchableOpacity key={s} style={styles.statusOption} onPress={() => setJobStatus(s)}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(s) }]} />
                  <Text style={[styles.statusOptionText, s === job.status && styles.statusOptionTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    </>
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
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  paymentText: {
    color: '#666',
    fontSize: 14,
  },
  paymentAmount: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  statusModalContent: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
  },
  statusOptionTextActive: {
    fontWeight: '700',
  },
  shareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButtonEmail: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonSms: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default JobDetailScreen;
