import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Client, Job, ChecklistItem } from '../types';
import { RootState, AppDispatch } from '../state/store';
import { createJob, modifyJob, removeJob } from '../state/slices/jobsSlice';
import { addClient } from '../state/slices/clientsSlice';
import { saveClient } from '../services/ClientService';
import { logService } from '../services/LoggingService';
import { Checklist, NotesEditor } from '../components';

type RootStackParamList = {
  AddJob: { client?: Client };
  EditJob: { job: Job };
  Jobs: undefined;
  ClientDetail: { client: Client };
};

type AddEditJobScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type AddEditJobScreenRouteProp = RouteProp<RootStackParamList, 'AddJob' | 'EditJob'>;

type Props = {
  navigation: AddEditJobScreenNavigationProp;
  route: AddEditJobScreenRouteProp;
};

const AddEditJobScreen = ({ navigation, route }: Props) => {
  const dispatch = useDispatch<AppDispatch>();
  const clients = useSelector((state: RootState) => state.clients.clients);
  
  const isEditing = route.params && 'job' in route.params;
  const existingJob = isEditing ? (route.params as { job: Job }).job : null;
  const preselectedClient = !isEditing && route.params && 'client' in route.params 
    ? (route.params as { client: Client }).client 
    : null;
  const [jobName, setJobName] = useState(existingJob?.jobName || '');
  const [description, setDescription] = useState(existingJob?.description || '');
  const [selectedClientId, setSelectedClientId] = useState(
    existingJob?.clientId || preselectedClient?.id || ''
  );
  const [quote, setQuote] = useState(existingJob?.quote?.toString() || '');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [quoteDate, setQuoteDate] = useState(existingJob?.quoteDate || todayStr);
  const [startDate, setStartDate] = useState(existingJob?.startDate || todayStr);
  const [endDate, setEndDate] = useState(existingJob?.endDate || todayStr);
  const [status, setStatus] = useState<Job['status']>(existingJob?.status || 'Quoted');
  const [toolsAndSupplies, setToolsAndSupplies] = useState<ChecklistItem[]>(existingJob?.toolsAndSupplies || []);
  const [notes, setNotes] = useState(existingJob?.notes || '');
  const [loading, setLoading] = useState(false);

  // Inline validation state
  const [touched, setTouched] = useState({
    jobName: false,
    description: false,
    selectedClientId: false,
    quote: false,
    quoteDate: false,
    startDate: false,
    endDate: false,
  });

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const errors = useMemo(() => {
    const basic: Record<string, string> = {
      jobName: jobName.trim() ? '' : 'Job name is required',
      description: description.trim() ? '' : 'Job description is required',
      selectedClientId: selectedClientId ? '' : 'Client is required',
      quote: quote.trim() && !isNaN(parseFloat(quote)) ? '' : 'Enter a valid quote amount',
      quoteDate: quoteDate.trim() && dateRegex.test(quoteDate) ? '' : 'Use YYYY-MM-DD',
      startDate: startDate.trim() && dateRegex.test(startDate) ? '' : 'Use YYYY-MM-DD',
      endDate: endDate.trim() && dateRegex.test(endDate) ? '' : 'Use YYYY-MM-DD',
    };

    // Cross-field date validations
    if (!basic.quoteDate && !basic.startDate) {
      const q = new Date(quoteDate);
      const s = new Date(startDate);
      if (s < q) basic.startDate = 'Start date cannot be before quote date';
    }
    if (!basic.startDate && !basic.endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e < s) basic.endDate = 'End date cannot be before start date';
    }
    return basic;
  }, [jobName, description, selectedClientId, quote, quoteDate, startDate, endDate]);

  const isValid = useMemo(() => Object.values(errors).every((e) => e === ''), [errors]);

  // For cancel confirmation
  const initialSnapshotRef = useRef({
    jobName: existingJob?.jobName || '',
    description: existingJob?.description || '',
    selectedClientId: existingJob?.clientId || preselectedClient?.id || '',
    quote: existingJob?.quote?.toString() || '',
    quoteDate: existingJob?.quoteDate || '',
    startDate: existingJob?.startDate || '',
    endDate: existingJob?.endDate || '',
    status: existingJob?.status || 'Quoted',
    toolsAndSupplies: existingJob?.toolsAndSupplies || [],
    notes: existingJob?.notes || '',
  });

  const isDirty = useMemo(() => {
    const s = initialSnapshotRef.current;
    return (
      s.jobName !== jobName ||
      s.description !== description ||
      s.selectedClientId !== selectedClientId ||
      s.quote !== quote ||
      s.quoteDate !== quoteDate ||
      s.startDate !== startDate ||
      s.endDate !== endDate ||
      s.status !== status ||
      s.notes !== notes ||
      JSON.stringify(s.toolsAndSupplies) !== JSON.stringify(toolsAndSupplies)
    );
  }, [jobName, description, selectedClientId, quote, quoteDate, startDate, endDate, status, notes, toolsAndSupplies]);

  // Client creation modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [clientCreationLoading, setClientCreationLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Job' : 'Add Job',
    });
  }, [navigation, isEditing]);

  const validateForm = (): boolean => isValid;

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (!selectedClient) {
        Alert.alert('Error', 'Selected client not found');
        return;
      }

      const jobData: Job = {
        id: existingJob?.id || `job_${Date.now()}`,
        jobName: jobName.trim(),
        description: description.trim(),
        clientId: selectedClientId,
        clientName: selectedClient.fullName,
        quote: parseFloat(quote),
        quoteDate,
        startDate,
        endDate,
        status,
        expenses: existingJob?.expenses || [],
        toolsAndSupplies,
        notes: notes.trim(),
      };

      if (isEditing) {
        await dispatch(modifyJob(jobData)).unwrap();
      } else {
        await dispatch(createJob(jobData)).unwrap();
      }

      Alert.alert(
        'Success',
        `Job ${isEditing ? 'updated' : 'created'} successfully`,
        [{ 
          text: 'OK', 
          onPress: () => {
            if (preselectedClient) {
              navigation.navigate('ClientDetail', { client: preselectedClient });
            } else {
              navigation.goBack();
            }
          }
        }]
      );
    } catch (error) {
      logService.logError('ADD_EDIT_JOB', error as Error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} job`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!existingJob) return;
    
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${existingJob.jobName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await dispatch(removeJob(existingJob.id)).unwrap();
              
              Alert.alert(
                'Success',
                'Job deleted successfully',
                [{ 
                  text: 'OK', 
                  onPress: () => navigation.navigate('Jobs')
                }]
              );
            } catch (error) {
              logService.logError('DELETE_JOB', error as Error);
              Alert.alert('Error', 'Failed to delete job');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Calendar picker state
  const [datePickerVisible, setDatePickerVisible] = useState<null | 'quote' | 'start' | 'end'>(null);
  const openDatePicker = (which: 'quote' | 'start' | 'end') => setDatePickerVisible(which);
  const closeDatePicker = () => setDatePickerVisible(null);
  const currentYearRange = {
    minDate: `${yyyy}-01-01`,
    maxDate: `${yyyy}-12-31`,
  };
  const onSelectDate = (day: DateObject) => {
    if (!datePickerVisible) return;
    if (datePickerVisible === 'quote') {
      setQuoteDate(day.dateString);
      setTouched((t) => ({ ...t, quoteDate: true }));
    } else if (datePickerVisible === 'start') {
      setStartDate(day.dateString);
      setTouched((t) => ({ ...t, startDate: true }));
    } else if (datePickerVisible === 'end') {
      setEndDate(day.dateString);
      setTouched((t) => ({ ...t, endDate: true }));
    }
    closeDatePicker();
  };

  const validateClientForm = (): boolean => {
    if (!newClientName.trim()) {
      Alert.alert('Validation Error', 'Client name is required');
      return false;
    }
    if (!newClientEmail.trim()) {
      Alert.alert('Validation Error', 'Email address is required');
      return false;
    }
    if (!newClientPhone.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    if (!newClientAddress.trim()) {
      Alert.alert('Validation Error', 'Address is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newClientEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleCreateClient = async () => {
    if (!validateClientForm()) return;

    try {
      setClientCreationLoading(true);
      
      const newClient: Client = {
        id: `client_${Date.now()}`,
        fullName: newClientName.trim(),
        emailAddress: newClientEmail.trim(),
        phoneNumber: newClientPhone.trim(),
        address: newClientAddress.trim(),
        createdDate: new Date().toISOString(),
      };

      // Persist to clients storage for Clients tab visibility
      await saveClient(newClient);
      // Update Redux slice for immediate in-memory availability
      dispatch(addClient(newClient));
      setSelectedClientId(newClient.id);
      
      // Clear modal form and close
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientAddress('');
      setShowClientModal(false);
      
      logService.logUserAction('Created client from job form', { 
        clientId: newClient.id, 
        clientName: newClient.fullName 
      });
      
      Alert.alert('Success', `Client "${newClient.fullName}" created successfully!`);
    } catch (error) {
      logService.logError('CREATE_CLIENT_FROM_JOB', error as Error);
      Alert.alert('Error', 'Failed to create client');
    } finally {
      setClientCreationLoading(false);
    }
  };

  const openClientModal = () => {
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientAddress('');
    setShowClientModal(true);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Job Name *</Text>
          <TextInput
            style={styles.input}
            value={jobName}
            onChangeText={setJobName}
            onBlur={() => setTouched((t) => ({ ...t, jobName: true }))}
            placeholder="Enter job name"
            autoCapitalize="words"
          />
          {!!touched.jobName && !!errors.jobName && (
            <Text style={styles.errorText}>{errors.jobName}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            placeholder="Enter job description"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {!!touched.description && !!errors.description && (
            <Text style={styles.errorText}>{errors.description}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.clientLabelRow}>
            <Text style={styles.label}>Client *</Text>
            {!preselectedClient && (
              <TouchableOpacity
                style={styles.addClientButton}
                onPress={openClientModal}
              >
                <Text style={styles.addClientButtonText}>+ Add New Client</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedClientId}
              onValueChange={(v) => {
                setSelectedClientId(v);
                setTouched((t) => ({ ...t, selectedClientId: true }));
              }}
              style={styles.picker}
            >
              {!preselectedClient && <Picker.Item label="Select a client..." value="" />}
              {clients.map((client) => (
                <Picker.Item
                  key={client.id}
                  label={client.fullName}
                  value={client.id}
                />
              ))}
            </Picker>
          </View>
        </View>
        {!!touched.selectedClientId && !!errors.selectedClientId && (
          <Text style={styles.errorText}>{errors.selectedClientId}</Text>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quote Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={quote}
            onChangeText={setQuote}
            onBlur={() => setTouched((t) => ({ ...t, quote: true }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          {!!touched.quote && !!errors.quote && (
            <Text style={styles.errorText}>{errors.quote}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quote Date *</Text>
          <TouchableOpacity style={styles.input} onPress={() => openDatePicker('quote')}>
            <Text style={styles.inputValueText}>{quoteDate}</Text>
          </TouchableOpacity>
          {!!touched.quoteDate && !!errors.quoteDate && (
            <Text style={styles.errorText}>{errors.quoteDate}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date *</Text>
          <TouchableOpacity style={styles.input} onPress={() => openDatePicker('start')}>
            <Text style={styles.inputValueText}>{startDate}</Text>
          </TouchableOpacity>
          {!!touched.startDate && !!errors.startDate && (
            <Text style={styles.errorText}>{errors.startDate}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>End Date *</Text>
          <TouchableOpacity style={styles.input} onPress={() => openDatePicker('end')}>
            <Text style={styles.inputValueText}>{endDate}</Text>
          </TouchableOpacity>
          {!!touched.endDate && !!errors.endDate && (
            <Text style={styles.errorText}>{errors.endDate}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={status}
              onValueChange={(value) => setStatus(value as Job['status'])}
              style={styles.picker}
            >
              <Picker.Item label="Quoted" value="Quoted" />
              <Picker.Item label="Accepted" value="Accepted" />
              <Picker.Item label="In-Progress" value="In-Progress" />
              <Picker.Item label="Completed" value="Completed" />
              <Picker.Item label="Cancelled" value="Cancelled" />
            </Picker>
          </View>
        </View>

        {/* Tools & Supplies Section */}
        <View style={styles.sectionContainer}>
          <Checklist
            items={toolsAndSupplies}
            onItemsChange={setToolsAndSupplies}
            title="Tools & Supplies"
            placeholder="Add tool or supply..."
            editable={true}
          />
        </View>

        {/* Notes Section */}
        <View style={styles.sectionContainer}>
          <NotesEditor
            notes={notes}
            onNotesChange={setNotes}
            title="Job Notes"
            placeholder="Add notes, meeting minutes, client requirements..."
            editable={true}
            autoSave={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (loading || !isValid) && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading || !isValid}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Update Job' : 'Save Job'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.disabledButton]}
            onPress={handleDelete}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>Delete Job</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            if (!isDirty) {
              navigation.goBack();
            } else {
              Alert.alert(
                'Discard changes?',
                'You have unsaved changes. Are you sure you want to discard them?',
                [
                  { text: 'Keep Editing', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
                ]
              );
            }
          }}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Client Creation Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClientModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowClientModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={newClientName}
                onChangeText={setNewClientName}
                placeholder="Enter client's full name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={newClientEmail}
                onChangeText={setNewClientEmail}
                placeholder="client@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={newClientPhone}
                onChangeText={setNewClientPhone}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newClientAddress}
                onChangeText={setNewClientAddress}
                placeholder="Enter full address"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, clientCreationLoading && styles.disabledButton]}
              onPress={handleCreateClient}
              disabled={clientCreationLoading}
            >
              <Text style={styles.saveButtonText}>
                {clientCreationLoading ? 'Creating...' : 'Create Client'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowClientModal(false)}
              disabled={clientCreationLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
      {/* Date Picker Modal for current year */}
      <Modal
        visible={datePickerVisible !== null}
        transparent
        animationType="slide"
        onRequestClose={closeDatePicker}
      >
        <View style={styles.calendarModalBackdrop}>
          <View style={styles.calendarModalContent}>
            <Calendar
              current={
                datePickerVisible === 'quote'
                  ? quoteDate
                  : datePickerVisible === 'start'
                  ? startDate
                  : endDate
              }
              minDate={currentYearRange.minDate}
              maxDate={currentYearRange.maxDate}
              onDayPress={onSelectDate}
              markedDates={{
                [
                  datePickerVisible === 'quote'
                    ? quoteDate
                    : datePickerVisible === 'start'
                    ? startDate
                    : endDate
                ]: { selected: true },
              }}
              enableSwipeMonths
            />
            <TouchableOpacity style={styles.calendarCloseButton} onPress={closeDatePicker}>
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
  inputValueText: {
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
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
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 6,
  },
  clientLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addClientButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addClientButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
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
  sectionContainer: {
    marginBottom: 20,
  },
});

export default AddEditJobScreen;