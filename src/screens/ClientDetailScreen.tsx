import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Client, Job } from '../types';
import { RootState } from '../state/store';
import { logService } from '../services/LoggingService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RootStackParamList = {
  ClientDetail: { client: Client };
  AddJob: { client: Client };
  JobDetail: { job: Job };
  EditClient: { client: Client };
};

type ClientDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ClientDetail'>;
type ClientDetailScreenRouteProp = RouteProp<RootStackParamList, 'ClientDetail'>;

type Props = {
  navigation: ClientDetailScreenNavigationProp;
  route: ClientDetailScreenRouteProp;
};

const ClientDetailScreen = ({ navigation, route }: Props) => {
  const { client } = route.params;
  const jobs = useSelector((state: RootState) => state.jobs.jobs);
  const [clientJobs, setClientJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | Job['status']>('All');
  const INITIAL_COUNT = 5;
  const LOAD_MORE_COUNT = 20;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_COUNT);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({
      title: client.fullName,
    });
    loadClientJobs();
  }, [navigation, client]);

  const loadClientJobs = async () => {
    try {
      setLoading(true);
      const filteredJobs = jobs.filter(job => job.clientId === client.id);
      setClientJobs(filteredJobs);
      logService.logUserAction('Viewed client detail', { 
        clientId: client.id, 
        clientName: client.fullName,
        jobCount: filteredJobs.length 
      });
    } catch (error) {
      logService.logError('CLIENT_DETAIL', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#4CAF50';
      case 'In-Progress': return '#2196F3';
      case 'Accepted': return '#FF9800';
      case 'Quoted': return '#9C27B0';
      case 'Cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusOptions: Array<'All' | Job['status']> = [
    'All',
    'Quoted',
    'Accepted',
    'In-Progress',
    'Completed',
    'Cancelled',
  ];

  const filteredJobs = clientJobs
    .filter(j => (statusFilter === 'All' ? true : j.status === statusFilter))
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const displayedJobs = filteredJobs.slice(0, visibleCount);

  // Reset visible window when filter or source list changes
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [statusFilter, clientJobs]);

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetail', { job: item })}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobName}>{item.jobName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.jobDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.jobDetails}>
        <Text style={styles.jobDetailText}>Quote: {formatCurrency(item.quote)}</Text>
        <Text style={styles.jobDetailText}>Start: {formatDate(item.startDate)}</Text>
      </View>
    </TouchableOpacity>
  );

  const totalQuoted = clientJobs.reduce((sum, job) => sum + job.quote, 0);
  const completedJobs = clientJobs.filter(job => job.status === 'Completed').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      {/* Client Information */}
      <View style={styles.clientInfo}>
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{client.fullName}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditClient', { client })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactItem}>📧 {client.emailAddress}</Text>
          <Text style={styles.contactItem}>📞 {client.phoneNumber}</Text>
          <Text style={styles.contactItem}>📍 {client.address}</Text>
          <Text style={styles.contactItem}>📅 Client since: {formatDate(client.createdDate)}</Text>
        </View>
      </View>

      {/* Job Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Job Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{clientJobs.length}</Text>
            <Text style={styles.summaryLabel}>Total Jobs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{completedJobs}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{formatCurrency(totalQuoted)}</Text>
            <Text style={styles.summaryLabel}>Total Quoted</Text>
          </View>
        </View>
      </View>

      {/* Jobs List */}
      <View style={styles.jobsSection}>
        <View style={styles.jobsHeader}>
          <Text style={styles.sectionTitle}>Jobs</Text>
          <TouchableOpacity
            style={styles.addJobButton}
            onPress={() => navigation.navigate('AddJob', { client })}
          >
            <Text style={styles.addJobButtonText}>+ Add Job</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {statusOptions.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.filterChip, statusFilter === opt && styles.filterChipActive]}
              onPress={() => setStatusFilter(opt)}
            >
              <Text style={[styles.filterChipText, statusFilter === opt && styles.filterChipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading jobs...</Text>
        ) : clientJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Jobs Yet</Text>
            <Text style={styles.emptyStateMessage}>
              Create the first job for {client.fullName}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('AddJob', { client })}
            >
              <Text style={styles.primaryButtonText}>Create First Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
          <FlatList
            data={displayedJobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
          {filteredJobs.length > displayedJobs.length && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <TouchableOpacity onPress={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}>
                <Text style={styles.showMoreText}>Load more</Text>
              </TouchableOpacity>
            </View>
          )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  clientInfo: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    fontSize: 16,
    color: '#666',
  },
  summarySection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  jobsSection: {
    backgroundColor: '#fff',
    padding: 20,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
  },
  filterChipText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  jobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addJobButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addJobButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobDetailText: {
    fontSize: 12,
    color: '#888',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  showMoreText: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default ClientDetailScreen;