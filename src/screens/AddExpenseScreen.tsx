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
  Modal,
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Expense, Job } from '../types';
import { AppDispatch, RootState } from '../state/store';
import { modifyJob } from '../state/slices/jobsSlice';
import { cloudStorageService } from '../services/CloudStorageService';
import { logService } from '../services/LoggingService';

type RootStackParamList = {
  AddExpense: { job: Job; expense?: Expense };
  ReceiptPhotoCapture: { onPhotoTaken: (photoPath: string) => void };
};

type AddExpenseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddExpense'>;
type AddExpenseScreenRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

type Props = {
  navigation: AddExpenseScreenNavigationProp;
  route: AddExpenseScreenRouteProp;
};

const AddExpenseScreen = ({ navigation, route }: Props) => {
  const { job, expense: expenseToEdit } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  
  const isEditing = !!expenseToEdit;
  const [description, setDescription] = useState(expenseToEdit?.description || '');
  const [amount, setAmount] = useState(expenseToEdit ? String(expenseToEdit.amount) : '');
  const [isReimbursable, setIsReimbursable] = useState(expenseToEdit?.isReimbursable || false);
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(expenseToEdit?.receiptImageLocalUri || null);
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const [date, setDate] = useState<string>(expenseToEdit?.date || todayStr);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const currentYearRange = { minDate: `${yyyy}-01-01`, maxDate: `${yyyy}-12-31` };
  const onSelectDate = (day: DateObject) => {
    setDate(day.dateString);
    setDatePickerVisible(false);
  };

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

  const handleSaveExpense = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const expenseId = isEditing ? expenseToEdit!.id : `expense_${Date.now()}`;
      let cloudImageUrl: string | undefined = expenseToEdit?.receiptImageUrl;
      
      // Upload receipt image if one was captured
      if (receiptImageUri && receiptImageUri !== expenseToEdit?.receiptImageLocalUri) {
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
        date,
        receiptImageUrl: cloudImageUrl,
        receiptImageLocalUri: receiptImageUri || undefined,
      };

      const updatedJob: Job = isEditing
        ? {
            ...job,
            expenses: job.expenses.map((exp) => (exp.id === expenseId ? newExpense : exp)),
          }
        : {
            ...job,
            expenses: [...job.expenses, newExpense],
          };
      
      await dispatch(modifyJob(updatedJob)).unwrap();
      
      logService.logUserAction(isEditing ? 'Edited expense' : 'Added expense', {
        jobId: job.id,
        expenseId: newExpense.id,
        amount: newExpense.amount,
        hasReceipt: !!receiptImageUri
      });
      
      Alert.alert(
        'Success',
        isEditing ? 'Expense updated successfully' : 'Expense added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      logService.logError(isEditing ? 'EDIT_EXPENSE' : 'ADD_EXPENSE', error as Error);
      Alert.alert('Error', isEditing ? 'Failed to update expense. Please try again.' : 'Failed to add expense. Please try again.');
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

  const handleDeleteExpense = async () => {
    if (!isEditing || !expenseToEdit) return;

    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const updatedJob: Job = {
                ...job,
                expenses: job.expenses.filter((exp) => exp.id !== expenseToEdit.id),
              };

              await dispatch(modifyJob(updatedJob)).unwrap();

              logService.logUserAction('Deleted expense', {
                jobId: job.id,
                expenseId: expenseToEdit.id,
              });

              Alert.alert('Deleted', 'Expense deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              logService.logError('DELETE_EXPENSE', error as Error);
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
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
          <Text style={styles.label}>Expense Date *</Text>
          <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisible(true)}>
            <Text style={{ fontSize: 16, color: '#333' }}>{date}</Text>
          </TouchableOpacity>
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
          onPress={handleSaveExpense}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>
            {loading ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Expense')}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.disabledButton]}
            onPress={handleDeleteExpense}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>Delete Expense</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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
              current={date}
              minDate={currentYearRange.minDate}
              maxDate={currentYearRange.maxDate}
              onDayPress={onSelectDate}
              markedDates={{ [date]: { selected: true } }}
              enableSwipeMonths
            />
            <TouchableOpacity
              style={styles.calendarCloseButton}
              onPress={() => setDatePickerVisible(false)}
            >
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
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddExpenseScreen;
