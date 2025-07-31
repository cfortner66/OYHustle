import React, { useState, useEffect } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Client, Job, ChecklistItem } from '../types';
import { RootState } from '../state/store';
import { addJob, updateJob } from '../state/slices/jobsSlice';
import { addClient } from '../state/slices/clientsSlice';
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
  const dispatch = useDispatch();
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
  const [quoteDate, setQuoteDate] = useState(existingJob?.quoteDate || '');
  const [startDate, setStartDate] = useState(existingJob?.startDate || '');
  const [endDate, setEndDate] = useState(existingJob?.endDate || '');
  const [status, setStatus] = useState<Job['status']>(existingJob?.status || 'Quoted');
  const [toolsAndSupplies, setToolsAndSupplies] = useState<ChecklistItem[]>(existingJob?.toolsAndSupplies || []);
  const [notes, setNotes] = useState(existingJob?.notes || '');
  const [loading, setLoading] = useState(false);

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

  const validateForm = (): boolean => {
    if (!jobName.trim()) {
      Alert.alert('Validation Error', 'Job name is required');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Job description is required');
      return false;
    }
    if (!selectedClientId) {
      Alert.alert('Validation Error', 'Please select a client');
      return false;
    }
    if (!quote.trim() || isNaN(parseFloat(quote))) {
      Alert.alert('Validation Error', 'Please enter a valid quote amount');
      return false;
    }
    if (!quoteDate.trim()) {
      Alert.alert('Validation Error', 'Quote date is required');
      return false;
    }
    if (!startDate.trim()) {
      Alert.alert('Validation Error', 'Start date is required');
      return false;
    }
    if (!endDate.trim()) {
      Alert.alert('Validation Error', 'End date is required');
      return false;
    }

    // Validate date format (basic check for YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(quoteDate)) {
      Alert.alert('Validation Error', 'Quote date must be in format YYYY-MM-DD');
      return false;
    }
    if (!dateRegex.test(startDate)) {
      Alert.alert('Validation Error', 'Start date must be in format YYYY-MM-DD');
      return false;
    }
    if (!dateRegex.test(endDate)) {
      Alert.alert('Validation Error', 'End date must be in format YYYY-MM-DD');
      return false;
    }

    // Validate date order
    const quoteDateObj = new Date(quoteDate);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (startDateObj < quoteDateObj) {
      Alert.alert('Validation Error', 'Start date cannot be before quote date');
      return false;
    }
    if (endDateObj < startDateObj) {
      Alert.alert('Validation Error', 'End date cannot be before start date');
      return false;
    }

    return true;
  };

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
        dispatch(updateJob(jobData));
        logService.logUserAction('Updated job', { 
          jobId: jobData.id, 
          jobName: jobData.jobName,
          clientId: jobData.clientId 
        });
      } else {
        dispatch(addJob(jobData));
        logService.logUserAction('Created new job', { 
          jobId: jobData.id, 
          jobName: jobData.jobName,
          clientId: jobData.clientId 
        });
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

  const formatDateInput = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as YYYY-MM-DD
    if (digits.length <= 4) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
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
            placeholder="Enter job name"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter job description"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.clientLabelRow}>
            <Text style={styles.label}>Client *</Text>
            <TouchableOpacity
              style={styles.addClientButton}
              onPress={openClientModal}
            >
              <Text style={styles.addClientButtonText}>+ Add New Client</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedClientId}
              onValueChange={setSelectedClientId}
              style={styles.picker}
            >
              <Picker.Item label="Select a client..." value="" />
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quote Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={quote}
            onChangeText={setQuote}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quote Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={quoteDate}
            onChangeText={(text) => setQuoteDate(formatDateInput(text))}
            placeholder="2024-01-15"
            maxLength={10}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={(text) => setStartDate(formatDateInput(text))}
            placeholder="2024-01-20"
            maxLength={10}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>End Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={(text) => setEndDate(formatDateInput(text))}
            placeholder="2024-02-15"
            maxLength={10}
          />
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
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Update Job' : 'Save Job'}
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
  disabledButton: {
    opacity: 0.6,
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
  sectionContainer: {
    marginBottom: 20,
  },
});

export default AddEditJobScreen;