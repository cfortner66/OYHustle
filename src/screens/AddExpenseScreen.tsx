import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Expense, Job } from '../types';
import { RootState } from '../state/store';
import { updateJob } from '../state/slices/jobsSlice';
import { cloudStorageService } from '../services/CloudStorageService';
import { logService } from '../services/LoggingService';

type RootStackParamList = {
  AddExpense: { job: Job };
  ReceiptPhotoCapture: { onPhotoTaken: (photoPath: string) => void };
};

type AddExpenseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddExpense'>;
type AddExpenseScreenRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

type Props = {
  navigation: AddExpenseScreenNavigationProp;
  route: AddExpenseScreenRouteProp;
};

const AddExpenseScreen = ({ navigation, route }: Props) => {
  const { job } = route.params;
  const dispatch = useDispatch();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return false;
    }
    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return false;
    }
    return true;
  };

  const handleAddExpense = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const expenseId = `expense_${Date.now()}`;
      let cloudImageUrl: string | undefined;
      
      // Upload receipt image if one was captured
      if (receiptImageUri) {
        const uploadResult = await cloudStorageService.uploadReceiptImage(
          receiptImageUri,
          expenseId
        );
        
        if (uploadResult.success) {
          cloudImageUrl = uploadResult.url;
        } else {
          Alert.alert('Warning', 'Failed to upload receipt image, but expense will be saved.');
        }
      }

      const newExpense: Expense = {
        id: expenseId,
        description: description.trim(),
        amount: parseFloat(amount),
        isReimbursable,
        date: new Date().toISOString(),
        receiptImageUrl: cloudImageUrl,
        receiptImageLocalUri: receiptImageUri || undefined,
      };

      const updatedJob: Job = {
        ...job,
        expenses: [...job.expenses, newExpense],
      };
      
      dispatch(updateJob(updatedJob));
      
      logService.logUserAction('Added expense', {
        jobId: job.id,
        expenseId: newExpense.id,
        amount: newExpense.amount,
        hasReceipt: !!receiptImageUri
      });
      
      Alert.alert(
        'Success',
        'Expense added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      logService.logError('ADD_EXPENSE', error as Error);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeReceiptPhoto = () => {
    navigation.navigate('ReceiptPhotoCapture', {
      onPhotoTaken: (photoPath: string) => {
        setReceiptImageUri(photoPath);
      }
    });
  };

  const removeReceiptPhoto = () => {
    Alert.alert(
      'Remove Receipt',
      'Are you sure you want to remove the receipt photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setReceiptImageUri(null)
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter expense description"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Reimbursable by Client?</Text>
          <Switch 
            value={isReimbursable} 
            onValueChange={setIsReimbursable}
            trackColor={{ false: '#ddd', true: '#4CAF50' }}
            thumbColor={isReimbursable ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Receipt Photo Section */}
        <View style={styles.receiptSection}>
          <Text style={styles.label}>Receipt Photo</Text>
          
          {receiptImageUri ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptImageUri }} style={styles.receiptImage} />
              <View style={styles.receiptActions}>
                <TouchableOpacity 
                  style={styles.changePhotoButton}
                  onPress={handleTakeReceiptPhoto}
                >
                  <Text style={styles.changePhotoButtonText}>Change Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={removeReceiptPhoto}
                >
                  <Text style={styles.removePhotoButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={handleTakeReceiptPhoto}
            >
              <Text style={styles.addPhotoButtonText}>📷 Add Receipt Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.addButton, loading && styles.disabledButton]}
          onPress={handleAddExpense}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>
            {loading ? 'Adding...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  receiptSection: {
    marginBottom: 20,
  },
  receiptPreview: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  receiptImage: {
    width: 200,
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  changePhotoButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changePhotoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  removePhotoButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removePhotoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addPhotoButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  addPhotoButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
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

export default AddExpenseScreen;
