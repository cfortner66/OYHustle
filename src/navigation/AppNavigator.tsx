import React, { Suspense, lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
// Lazy load screens for better performance
const JobsScreen = lazy(() => import('../screens/JobsScreen'));
const JobDetailScreen = lazy(() => import('../screens/JobDetailScreen'));
const AddExpenseScreen = lazy(() => import('../screens/AddExpenseScreen'));
const EditJobScreen = lazy(() => import('../screens/EditJobScreen'));
const AddEditJobScreen = lazy(() => import('../screens/AddEditJobScreen'));
const ReceiptPhotoCaptureScreen = lazy(() => import('../screens/ReceiptPhotoCaptureScreen'));
const BudgetScreen = lazy(() => import('../screens/BudgetScreen'));
const ClientsScreen = lazy(() => import('../screens/ClientsScreen'));
const ClientDetailScreen = lazy(() => import('../screens/ClientDetailScreen'));
const AddEditClientScreen = lazy(() => import('../screens/AddEditClientScreen'));
const PaymentScreen = lazy(() => import('../screens/PaymentScreen'));
import { Client, Job } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  JobDetail: { job: Job };
  AddExpense: { job: Job };
  EditJob: { job: Job };
  AddJob: { client?: Client };
  ClientDetail: { client: Client };
  AddClient: undefined;
  EditClient: { client: Client };
  ReceiptPhotoCapture: { onPhotoTaken: (photoPath: string) => void };
  Payment: { job: Job };
};

export type TabParamList = {
  Jobs: undefined;
  Clients: undefined;
  Budget: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Loading component for lazy loaded screens
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2196F3" />
  </View>
);

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={() => (
          <Suspense fallback={<LoadingScreen />}>
            <JobsScreen />
          </Suspense>
        )}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Clients"
        component={() => (
          <Suspense fallback={<LoadingScreen />}>
            <ClientsScreen />
          </Suspense>
        )}
        options={{
          tabBarLabel: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Budget"
        component={() => (
          <Suspense fallback={<LoadingScreen />}>
            <BudgetScreen />
          </Suspense>
        )}
        options={{
          tabBarLabel: 'Budget',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="JobDetail"
          component={() => (
            <Suspense fallback={<LoadingScreen />}>
              <JobDetailScreen />
            </Suspense>
          )}
          options={{ title: 'Job Details' }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ title: 'Add Expense' }}
        />
        <Stack.Screen
          name="EditJob"
          component={EditJobScreen}
          options={{ title: 'Edit Job' }}
        />
        <Stack.Screen
          name="AddJob"
          component={AddEditJobScreen}
          options={{ title: 'Add Job' }}
        />
        <Stack.Screen
          name="ClientDetail"
          component={ClientDetailScreen}
          options={{ title: 'Client Details' }}
        />
        <Stack.Screen
          name="AddClient"
          component={AddEditClientScreen}
          options={{ title: 'Add Client' }}
        />
        <Stack.Screen
          name="EditClient"
          component={AddEditClientScreen}
          options={{ title: 'Edit Client' }}
        />
        <Stack.Screen
          name="ReceiptPhotoCapture"
          component={ReceiptPhotoCaptureScreen}
          options={{ title: 'Capture Receipt' }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: 'Payment' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default AppNavigator;
