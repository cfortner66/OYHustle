import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Job, PaymentRequest } from '../types';
import { AppDispatch, RootState } from '../state/store';
import { modifyJob } from '../state/slices/jobsSlice';
import { paymentService } from '../services/PaymentService';
import { logService } from '../services/LoggingService';
import { Calendar, DateObject } from 'react-native-calendars';

type RootStackParamList = {
  Payment: { job: Job };
  JobDetail: { job: Job };
};

type PaymentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;

type Props = {
  navigation: PaymentScreenNavigationProp;
  route: PaymentScreenRouteProp;
};

const PaymentScreen = ({ navigation, route }: Props) => {
  const { job } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const client = useSelector((state: RootState) => state.clients.clients.find(c => c.id === job.clientId));
  
  const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'gcash' | 'cash' | 'card' | 'venmo' | null>(null);
  const reimbursableTotal = job.expenses
    .filter((e) => e.isReimbursable)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalDue = job.quote + reimbursableTotal;
  const totalPaid = (job.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const amountOwed = Math.max(totalDue - totalPaid, 0);
  const [customAmount, setCustomAmount] = useState(amountOwed.toString());
  const [paymentNote, setPaymentNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Payment',
    });
  }, [navigation]);

  const paymentMethods = [
    paymentService.getPaymentMethodInfo('paypal'),
    paymentService.getPaymentMethodInfo('gcash'),
    paymentService.getPaymentMethodInfo('card'),
    paymentService.getPaymentMethodInfo('venmo'),
    paymentService.getPaymentMethodInfo('cash'),
  ];

  const handlePaymentMethodSelect = (method: 'paypal' | 'gcash' | 'cash' | 'card' | 'venmo') => {
    setSelectedMethod(method);
  };

  const validatePayment = (): boolean => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return false;
    }

    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return false;
    }

    return true;
  };

  const processPayment = async () => {
    if (!validatePayment() || !selectedMethod) return;

    try {
      setProcessing(true);

      const paymentRequest: PaymentRequest = {
        jobId: job.id,
        amount: parseFloat(customAmount),
        method: selectedMethod,
        description: `Payment for ${job.jobName}`,
        paymentDate,
      };

      const result = await paymentService.processPayment(paymentRequest);

      if (result.success && result.payment) {
        const paidAmount = parseFloat(customAmount);
        const newPayments = [...(job.payments || []), result.payment];
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const reimbursableTotal = job.expenses.filter(e => e.isReimbursable).reduce((s, e) => s + e.amount, 0);
        const totalDue = job.quote + reimbursableTotal;
        const amountOwed = Math.max(totalDue - totalPaid, 0);

        const updatedJob: Job = {
          ...job,
          payments: newPayments,
          status: amountOwed <= 0 ? 'Completed' : job.status,
        };

        await dispatch(modifyJob(updatedJob)).unwrap();

        const buildInvoiceText = () => {
          const reimbursableItems = updatedJob.expenses
            .filter(e => e.isReimbursable)
            .map(e => `- ${e.description}: $${e.amount.toFixed(2)}${e.receiptImageUrl ? ` (receipt: ${e.receiptImageUrl})` : ''}`)
            .join('\n');
          const paymentsList = updatedJob.payments?.map(p => `${new Date(p.paymentDate).toLocaleDateString('en-US')} - ${p.method.toUpperCase()}: $${p.amount.toFixed(2)}`).join('\n') || '';
          const clientName = client?.fullName || updatedJob.clientName;
          const tools = (updatedJob.toolsAndSupplies || []).map(t => `- ${t.text}`).join('\n');
          const notes = updatedJob.notes?.trim() ? updatedJob.notes.trim() : 'None';
          const partialNote = amountOwed > 0 ? '\n\nNote: Final payment is due at completion of the job.' : '';
          return (
            `Invoice for ${updatedJob.jobName}\n` +
            `Client: ${clientName}\n` +
            `Quote Amount: $${updatedJob.quote.toFixed(2)}\n` +
            `Reimbursable Expenses Total: $${reimbursableTotal.toFixed(2)}\n` +
            `${reimbursableItems ? `\nReimbursable Items:\n${reimbursableItems}\n` : ''}` +
            `Total Due: $${totalDue.toFixed(2)}\n` +
            `Total Paid: $${totalPaid.toFixed(2)}\n` +
            `Amount Owed: $${amountOwed.toFixed(2)}\n` +
            `${paymentsList ? `\nPayments:\n${paymentsList}\n` : ''}` +
            `\nTools & Supplies:\n${tools || 'None'}\n` +
            `\nNotes:\n${notes}` +
            partialNote
          );
        };

        const sendEmailInvoice = async () => {
          const email = client?.emailAddress;
          if (!email) {
            Alert.alert('No Email', 'This client does not have an email address on file.');
            return;
          }
          const subject = `Invoice for ${updatedJob.jobName} - ${client?.fullName || updatedJob.clientName}`;
          const body = buildInvoiceText();
          const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
            else Alert.alert('Error', 'No mail app available');
          } catch (e) {
            Alert.alert('Error', 'Failed to open mail app');
          }
        };

        const sendSmsInvoice = async () => {
          const phone = client?.phoneNumber;
          if (!phone) {
            Alert.alert('No Phone', 'This client does not have a phone number on file.');
            return;
          }
          const body = buildInvoiceText();
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

        const settings = (await import('../state/store')).store.getState().settings; // access persisted settings

        Alert.alert(
          'Payment Successful!',
          `Payment of $${paidAmount.toFixed(2)} processed successfully.\nRemaining balance: $${amountOwed.toFixed(2)}.${
            result.payment.transactionId ? `\n\nTransaction ID: ${result.payment.transactionId}` : ''
          }`,
          [
            ...(settings.smsOnly ? [] : [{ text: 'Email Invoice', onPress: sendEmailInvoice }]),
            { text: 'Text Invoice', onPress: sendSmsInvoice },
            { text: 'OK', onPress: () => navigation.navigate('JobDetail', { job: updatedJob }) }
          ]
        );
      } else {
        Alert.alert(
          'Payment Failed',
          result.error || 'Payment processing failed. Please try again.',
          [
            { text: 'Try Again', style: 'default' },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      logService.logError('PAYMENT_SCREEN', error as Error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Job Summary */}
        <View style={styles.jobSummary}>
          <Text style={styles.jobTitle}>{job.jobName}</Text>
          <Text style={styles.clientName}>Client: {job.clientName}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount Owed:</Text>
            <Text style={styles.amountValue}>{formatCurrency(amountOwed)}</Text>
          </View>
          {reimbursableTotal > 0 && (
            <View style={[styles.amountRow, { marginTop: 6 }] }>
              <Text style={[styles.amountLabel, { color: '#666' }]}>Includes client expenses:</Text>
              <Text style={[styles.amountValue, { color: '#666' }]}>{formatCurrency(reimbursableTotal)}</Text>
            </View>
          )}
          {(job.payments && job.payments.length > 0) && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.amountLabel, { marginBottom: 6 }]}>Previous Payments:</Text>
              {job.payments.map((p) => (
                <View key={p.id} style={styles.paymentRow}>
                  <Text style={styles.paymentText}>{new Date(p.paymentDate).toLocaleDateString()} - {p.method.toUpperCase()}</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payment Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Amount</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountTextInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <View style={styles.quickAmounts}>
            <TouchableOpacity
              style={styles.quickAmountButton}
              onPress={() => setCustomAmount((amountOwed * 0.5).toFixed(2))}
            >
              <Text style={styles.quickAmountText}>50%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAmountButton}
              onPress={() => setCustomAmount(amountOwed.toString())}
            >
              <Text style={styles.quickAmountText}>Full Amount</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.amountRow, { marginTop: 10 }]}>
            <Text style={styles.amountLabel}>Payment Date</Text>
            <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
              <Text style={[styles.amountValue, { color: '#333' }]}>{paymentDate}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method, index) => {
            const keys: ('paypal'|'gcash'|'card'|'venmo'|'cash')[] = ['paypal','gcash','card','venmo','cash'];
            const methodKey = keys[index];
            const isSelected = selectedMethod === methodKey;
            
            return (
              <TouchableOpacity
                key={methodKey}
                style={[
                  styles.paymentMethod,
                  isSelected && styles.selectedPaymentMethod
                ]}
                onPress={() => handlePaymentMethodSelect(methodKey)}
              >
                <View style={styles.methodHeader}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDescription}>{method.description}</Text>
                  </View>
                  <View style={styles.radioButton}>
                    {isSelected && <View style={styles.radioButtonSelected} />}
                  </View>
                </View>
                <View style={styles.methodDetails}>
                  <Text style={styles.methodFees}>Fees: {method.fees}</Text>
                  <Text style={styles.methodTiming}>Processing: {method.processingTime}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payment Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={paymentNote}
            onChangeText={setPaymentNote}
            placeholder="Add any notes about this payment..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.processButton,
              (!selectedMethod || processing) && styles.disabledButton
            ]}
            onPress={processPayment}
            disabled={!selectedMethod || processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.processButtonText}>
                Process Payment ({formatCurrency(parseFloat(customAmount) || 0)})
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={processing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.calendarModalBackdrop}>
          <View style={styles.calendarModalContent}>
            <Calendar
              current={paymentDate}
              minDate={`${yyyy}-01-01`}
              maxDate={`${yyyy}-12-31`}
              onDayPress={(day: DateObject) => {
                setPaymentDate(day.dateString);
                setDatePickerVisible(false);
              }}
              markedDates={{ [paymentDate]: { selected: true } }}
              enableSwipeMonths
            />
            <TouchableOpacity style={styles.calendarCloseButton} onPress={() => setDatePickerVisible(false)}>
              <Text style={styles.calendarCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  jobSummary: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 16,
    color: '#333',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAmountButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  quickAmountText: {
    color: '#333',
    fontWeight: '600',
  },
  paymentMethod: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
  },
  methodDetails: {
    paddingLeft: 36,
  },
  methodFees: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  methodTiming: {
    fontSize: 12,
    color: '#666',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
  },
  actions: {
    marginTop: 20,
  },
  processButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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
  cancelButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  calendarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  calendarModalContent: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  calendarCloseButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  calendarCloseText: {
    color: '#333',
    fontWeight: '600',
  },
});

export default PaymentScreen;