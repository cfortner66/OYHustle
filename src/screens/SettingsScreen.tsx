import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { logService } from '../services/LoggingService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../state/store';
import { setSmsOnly, setUserEmail } from '../state/slices/settingsSlice';
import { seedMinimal, seedFullWorkflow, seedEdgeCases } from '../services/SeedService';
import { clearAllPersistedData } from '../services/StorageService';

const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [userEmailLocal, setUserEmailLocal] = useState(settings.userEmail);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logService.logUserAction('logout');
          // Handle logout logic here
        },
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            logService.logUserAction('clear_all_data');
            clearAllPersistedData()
              .then(() => Alert.alert('Success', 'All data cleared. Restart the app to see a clean state.'))
              .catch(() => Alert.alert('Error', 'Failed to clear data'));
          },
        },
      ]
    );
  };

  const handleSeed = (kind: 'minimal' | 'full' | 'edge') => {
    const run = kind === 'minimal' ? seedMinimal : kind === 'full' ? seedFullWorkflow : seedEdgeCases;
    run()
      .then(() => Alert.alert('Seed Complete', `Loaded ${kind} seed data. Reopen Jobs tab to verify.`))
      .catch(() => Alert.alert('Error', 'Failed to load seed data'));
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person',
          label: 'Profile',
          onPress: () => logService.logNavigation('Profile'),
        },
        {
          icon: 'email',
          label: 'Account Email (used for sending quotes/invoices)',
          onPress: () => {},
          renderCustom: (
            <View style={styles.customItemRow}>
              <TextInput
                style={styles.emailInput}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={userEmailLocal}
                onChangeText={setUserEmailLocal}
                onBlur={() => dispatch(setUserEmail(userEmailLocal))}
              />
            </View>
          ),
        },
        {
          icon: 'sms',
          label: 'SMS Only (do not offer email sending)',
          isSwitch: true,
          value: settings.smsOnly,
          onValueChange: (v: boolean) => dispatch(setSmsOnly(v)),
        },
        {
          icon: 'logout',
          label: 'Logout',
          onPress: handleLogout,
          color: '#FF5722',
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: 'notifications',
          label: 'Push Notifications',
          isSwitch: true,
          value: pushNotifications,
          onValueChange: setPushNotifications,
        },
        {
          icon: 'email',
          label: 'Email Notifications',
          isSwitch: true,
          value: emailNotifications,
          onValueChange: setEmailNotifications,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'dark-mode',
          label: 'Dark Mode',
          isSwitch: true,
          value: darkMode,
          onValueChange: setDarkMode,
        },
        {
          icon: 'fingerprint',
          label: 'Biometric Authentication',
          isSwitch: true,
          value: biometricAuth,
          onValueChange: setBiometricAuth,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help',
          label: 'Help & FAQ',
          onPress: () => logService.logNavigation('Help'),
        },
        {
          icon: 'feedback',
          label: 'Send Feedback',
          onPress: () => logService.logNavigation('Feedback'),
        },
        {
          icon: 'info',
          label: 'About',
          onPress: () => logService.logNavigation('About'),
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          icon: 'download',
          label: 'Export Data',
          onPress: () => logService.logUserAction('export_data'),
        },
        {
          icon: 'delete-forever',
          label: 'Clear All Data',
          onPress: handleClearData,
          color: '#FF5722',
        },
        {
          icon: 'dataset',
          label: 'Seed: Minimal',
          onPress: () => handleSeed('minimal'),
        },
        {
          icon: 'dataset-linked',
          label: 'Seed: Full Workflow',
          onPress: () => handleSeed('full'),
        },
        {
          icon: 'bug-report',
          label: 'Seed: Edge Cases',
          onPress: () => handleSeed('edge'),
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, index: number) => {
    if (item.renderCustom) {
      return (
        <View key={index} style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name={item.icon} size={24} color="#666" />
            <Text style={styles.settingLabel}>{item.label}</Text>
          </View>
          {item.renderCustom}
        </View>
      );
    }
    if (item.isSwitch) {
      return (
        <View key={index} style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name={item.icon} size={24} color="#666" />
            <Text style={styles.settingLabel}>{item.label}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: '#ccc', true: '#2196F3' }}
            thumbColor={item.value ? '#fff' : '#f4f3f4'}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={styles.settingItem}
        onPress={item.onPress}
      >
        <View style={styles.settingLeft}>
          <Icon name={item.icon} size={24} color={item.color || '#666'} />
          <Text
            style={[styles.settingLabel, item.color && { color: item.color }]}
          >
            {item.label}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color="#ccc" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your preferences</Text>
      </View>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, index) => renderSettingItem(item, index))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.versionText}>OYHustle v1.0.0</Text>
        <Text style={styles.copyrightText}>© 2024 OYHustle Team</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#ccc',
  },
});

export default SettingsScreen;
