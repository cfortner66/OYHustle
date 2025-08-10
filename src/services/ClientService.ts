import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '../types';
import { logService } from './LoggingService';

const CLIENTS_KEY = 'clients';

export const getClients = async (): Promise<Client[]> => {
  try {
    logService.debug('CLIENT_SERVICE', 'Fetching clients from AsyncStorage');
    const jsonValue = await AsyncStorage.getItem(CLIENTS_KEY);
    const clients = jsonValue != null ? JSON.parse(jsonValue) : [];
    logService.info('CLIENT_SERVICE', `Successfully fetched ${clients.length} clients`);
    return clients;
  } catch (error) {
    logService.logError('CLIENT_SERVICE', error as Error, { operation: 'getClients' });
    return [];
  }
};

export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    logService.debug('CLIENT_SERVICE', `Fetching client by ID: ${id}`);
    const clients = await getClients();
    const client = clients.find((c) => c.id === id);
    if (client) {
      logService.info('CLIENT_SERVICE', `Successfully found client: ${client.fullName}`);
    } else {
      logService.warn('CLIENT_SERVICE', `Client not found with ID: ${id}`);
    }
    return client || null;
  } catch (error) {
    logService.logError('CLIENT_SERVICE', error as Error, { operation: 'getClientById', clientId: id });
    return null;
  }
};

export const saveClient = async (client: Client): Promise<void> => {
  try {
    logService.debug('CLIENT_SERVICE', `Saving new client: ${client.fullName}`, { clientId: client.id });
    const clients = await getClients();
    // Avoid duplicate IDs
    const withoutDuplicate = clients.filter((c) => c.id !== client.id);
    const newClients = [...withoutDuplicate, client];
    const jsonValue = JSON.stringify(newClients);
    await AsyncStorage.setItem(CLIENTS_KEY, jsonValue);
    logService.info('CLIENT_SERVICE', `Successfully saved client: ${client.fullName}`, { 
      clientId: client.id, 
      totalClients: newClients.length 
    });
  } catch (error) {
    logService.logError('CLIENT_SERVICE', error as Error, { 
      operation: 'saveClient', 
      clientId: client.id, 
      clientName: client.fullName 
    });
    throw error;
  }
};

export const updateClient = async (updatedClient: Client): Promise<void> => {
  try {
    logService.debug('CLIENT_SERVICE', `Updating client: ${updatedClient.fullName}`, { clientId: updatedClient.id });
    const clients = await getClients();
    const clientIndex = clients.findIndex(client => client.id === updatedClient.id);
    
    if (clientIndex === -1) {
      const error = new Error(`Client with ID ${updatedClient.id} not found`);
      logService.logError('CLIENT_SERVICE', error, { operation: 'updateClient', clientId: updatedClient.id });
      throw error;
    }
    
    // Ensure only one instance of the client with this ID exists
    const filtered = clients.filter((c) => c.id !== updatedClient.id);
    const newClients = [...filtered, updatedClient];
    const jsonValue = JSON.stringify(newClients);
    await AsyncStorage.setItem(CLIENTS_KEY, jsonValue);
    logService.info('CLIENT_SERVICE', `Successfully updated client: ${updatedClient.fullName}`, { clientId: updatedClient.id });
  } catch (error) {
    logService.logError('CLIENT_SERVICE', error as Error, { 
      operation: 'updateClient', 
      clientId: updatedClient.id, 
      clientName: updatedClient.fullName 
    });
    throw error;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    logService.debug('CLIENT_SERVICE', `Deleting client with ID: ${id}`);
    const clients = await getClients();
    const clientToDelete = clients.find(client => client.id === id);
    
    if (!clientToDelete) {
      const error = new Error(`Client with ID ${id} not found`);
      logService.logError('CLIENT_SERVICE', error, { operation: 'deleteClient', clientId: id });
      throw error;
    }
    
    const newClients = clients.filter((client) => client.id !== id);
    const jsonValue = JSON.stringify(newClients);
    await AsyncStorage.setItem(CLIENTS_KEY, jsonValue);
    logService.info('CLIENT_SERVICE', `Successfully deleted client: ${clientToDelete.fullName}`, { 
      clientId: id, 
      remainingClients: newClients.length 
    });
  } catch (error) {
    logService.logError('CLIENT_SERVICE', error as Error, { operation: 'deleteClient', clientId: id });
    throw error;
  }
};

// Replace all clients (used by seeders/tests)
export const setClients = async (clients: Client[]): Promise<void> => {
  try {
    logService.debug('CLIENT_SERVICE', `Setting clients collection (count=${clients.length})`);
    const jsonValue = JSON.stringify(clients);
    await AsyncStorage.setItem(CLIENTS_KEY, jsonValue);
    logService.info('CLIENT_SERVICE', 'Clients collection replaced successfully');
  } catch (error) {
    logService.logError('CLIENT_SERVICE', error as Error, { operation: 'setClients' });
    throw error;
  }
};