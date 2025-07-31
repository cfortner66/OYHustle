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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Job, PaymentRequest } from '../types';
import { RootState } from '../state/store';
import { updateJob } from '../state/slices/jobsSlice';
import { paymentService } from '../services/PaymentService';
import { logService } from '../services/LoggingService';

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
  const dispatch = useDispatch();
  
  const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'gcash' | 'cash' | null>(null);
  const [customAmount, setCustomAmount] = useState(job.quote.toString());
  const [paymentNote, setPaymentNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Payment',
    });
  }, [navigation]);

  const paymentMethods = [
    paymentService.getPaymentMethodInfo('paypal'),
    paymentService.getPaymentMethodInfo('gcash'),
    paymentService.getPaymentMethodInfo('cash'),
  ];

  const handlePaymentMethodSelect = (method: 'paypal' | 'gcash' | 'cash') => {
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
      };

      const result = await paymentService.processPayment(paymentRequest);

      if (result.success && result.payment) {
        // Update job status to completed if full payment received
        const totalPaid = parseFloat(customAmount);
        const updatedJob = {
          ...job,
          status: totalPaid >= job.quote ? 'Completed' as const : job.status,
        };

        dispatch(updateJob(updatedJob));

        Alert.alert(
          'Payment Successful!',
          `Payment of $${totalPaid.toFixed(2)} has been processed successfully.${
            result.payment.transactionId ? `\n\nTransaction ID: ${result.payment.transactionId}` : ''
          }`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('JobDetail', { job: updatedJob })
            }
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
            <Text style={styles.amountLabel}>Total Quote:</Text>
            <Text style={styles.amountValue}>{formatCurrency(job.quote)}</Text>
          </View>
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
              onPress={() => setCustomAmount((job.quote * 0.5).toFixed(2))}
            >
              <Text style={styles.quickAmountText}>50%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAmountButton}
              onPress={() => setCustomAmount(job.quote.toString())}
            >
              <Text style={styles.quickAmountText}>Full Amount</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method, index) => {
            const methodKey = index === 0 ? 'paypal' : index === 1 ? 'gcash' : 'cash';
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
});

export default PaymentScreen;