import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { saveClient } from '../services/ClientService';
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

  // Inline validation state
  const [touched, setTouched] = useState({
    fullName: false,
    emailAddress: false,
    phoneNumber: false,
    address: false,
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const errors = useMemo(() => ({
    fullName: fullName.trim() ? '' : 'Full name is required',
    emailAddress: emailAddress.trim()
      ? emailRegex.test(emailAddress) ? '' : 'Enter a valid email address'
      : 'Email address is required',
    phoneNumber: phoneNumber.trim() ? '' : 'Phone number is required',
    address: address.trim() ? '' : 'Address is required',
  }), [fullName, emailAddress, phoneNumber, address]);

  const isValid = useMemo(() =>
    Object.values(errors).every((e) => e === ''),
  [errors]);

  // Dirty state to confirm on cancel
  const initialSnapshotRef = useRef({
    fullName: existingClient?.fullName || '',
    address: existingClient?.address || '',
    phoneNumber: existingClient?.phoneNumber || '',
    emailAddress: existingClient?.emailAddress || '',
  });

  const isDirty = useMemo(() => {
    const s = initialSnapshotRef.current;
    return (
      s.fullName !== fullName ||
      s.address !== address ||
      s.phoneNumber !== phoneNumber ||
      s.emailAddress !== emailAddress
    );
  }, [fullName, address, phoneNumber, emailAddress]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Client' : 'Add Client',
    });
  }, [navigation, isEditing]);

  const validateForm = (): boolean => isValid;

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
        await saveClient(clientData);
        dispatch(updateClient(clientData));
        logService.logUserAction('Updated client', { clientId: clientData.id, clientName: clientData.fullName });
      } else {
        await saveClient(clientData);
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

  const requestCancel = () => {
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
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
            onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
            placeholder="Enter client's full name"
            autoCapitalize="words"
          />
          {!!touched.fullName && !!errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={emailAddress}
            onChangeText={setEmailAddress}
            onBlur={() => setTouched((t) => ({ ...t, emailAddress: true }))}
            placeholder="client@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!touched.emailAddress && !!errors.emailAddress && (
            <Text style={styles.errorText}>{errors.emailAddress}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onBlur={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />
          {!!touched.phoneNumber && !!errors.phoneNumber && (
            <Text style={styles.errorText}>{errors.phoneNumber}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            onBlur={() => setTouched((t) => ({ ...t, address: true }))}
            placeholder="Enter full address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {!!touched.address && !!errors.address && (
            <Text style={styles.errorText}>{errors.address}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (loading || !isValid) && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading || !isValid}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Update Client' : 'Save Client'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={requestCancel}
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
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 6,
  },
});

export default AddEditClientScreen;