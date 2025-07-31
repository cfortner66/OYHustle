import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Client } from '../types';
import { addClient, updateClient } from '../state/slices/clientsSlice';
import { logService } from '../services/LoggingService';

type RootStackParamList = {
  AddClient: undefined;
  EditClient: { client: Client };
  Clients: undefined;
};

type AddEditClientScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type AddEditClientScreenRouteProp = RouteProp<RootStackParamList, 'AddClient' | 'EditClient'>;

type Props = {
  navigation: AddEditClientScreenNavigationProp;
  route: AddEditClientScreenRouteProp;
};

const AddEditClientScreen = ({ navigation, route }: Props) => {
  const dispatch = useDispatch();
  const isEditing = route.params && 'client' in route.params;
  const existingClient = isEditing ? (route.params as { client: Client }).client : null;
  
  const [fullName, setFullName] = useState(existingClient?.fullName || '');
  const [address, setAddress] = useState(existingClient?.address || '');
  const [phoneNumber, setPhoneNumber] = useState(existingClient?.phoneNumber || '');
  const [emailAddress, setEmailAddress] = useState(existingClient?.emailAddress || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Client' : 'Add Client',
    });
  }, [navigation, isEditing]);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return false;
    }
    if (!emailAddress.trim()) {
      Alert.alert('Validation Error', 'Email address is required');
      return false;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Address is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const clientData: Client = {
        id: existingClient?.id || `client_${Date.now()}`,
        fullName: fullName.trim(),
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        emailAddress: emailAddress.trim(),
        createdDate: existingClient?.createdDate || new Date().toISOString(),
      };

      if (isEditing) {
        dispatch(updateClient(clientData));
        logService.logUserAction('Updated client', { clientId: clientData.id, clientName: clientData.fullName });
      } else {
        dispatch(addClient(clientData));
        logService.logUserAction('Created new client', { clientId: clientData.id, clientName: clientData.fullName });
      }

      Alert.alert(
        'Success',
        `Client ${isEditing ? 'updated' : 'created'} successfully`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      logService.logError('ADD_EDIT_CLIENT', error as Error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} client`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter client's full name"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={emailAddress}
            onChangeText={setEmailAddress}
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
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter full address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Update Client' : 'Save Client'}
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
  textArea: {
    minHeight: 80,
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
});

export default AddEditClientScreen;