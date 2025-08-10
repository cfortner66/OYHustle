import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Job } from '../types';
import { fetchJobs, modifyJob } from '../state/slices/jobsSlice';
import { selectFilteredJobs, selectJobsLoading, selectJobsError } from '../state/selectors/jobsSelectors';
import { AppDispatch } from '../state/store';

type JobsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const JobsScreen = () => {
  const navigation = useNavigation<JobsScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const [statusPickerJob, setStatusPickerJob] = useState<Job | null>(null);
  
  const jobs = useSelector(selectFilteredJobs);
  const loading = useSelector(selectJobsLoading);
  const error = useSelector(selectJobsError);
  const [statusFilter, setStatusFilter] = useState<'All' | Job['status']>('All');
  const [showAllJobs, setShowAllJobs] = useState(false);

  const loadJobs = () => {
    dispatch(fetchJobs());
  };

  useFocusEffect(
    React.useCallback(() => {
      loadJobs();
    }, [dispatch])
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  // Ensure list refresh after returning from AddExpense/AddJob
  useFocusEffect(
    React.useCallback(() => {
      loadJobs();
    }, [])
  );

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

  const setJobStatus = async (job: Job, newStatus: Job['status']) => {
    try {
      if (job.status === newStatus) {
        setStatusPickerJob(null);
        return;
      }
      const updated: Job = { ...job, status: newStatus };
      await dispatch(modifyJob(updated)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to change status');
    } finally {
      setStatusPickerJob(null);
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

  const filteredJobs = jobs
    .filter((j) => (statusFilter === 'All' ? true : j.status === statusFilter))
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const displayedJobs = showAllJobs ? filteredJobs : filteredJobs.slice(0, 5);

  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetail', { job: item })}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobName}>{item.jobName}</Text>
        <TouchableOpacity onPress={() => setStatusPickerJob(item)} accessibilityRole="button" accessibilityLabel="Change job status">
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.clientName}>Client: {item.clientName}</Text>
      <Text style={styles.jobDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.jobFooter}>
        <Text style={styles.jobQuote}>{formatCurrency(item.quote)}</Text>
        <Text style={styles.jobDate}>Start: {formatDate(item.startDate)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <>
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddJob', {})}
        >
          <Text style={styles.addButtonText}>+ Add Job</Text>
        </TouchableOpacity>
      </View>

      {jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Jobs Yet</Text>
          <Text style={styles.emptyStateMessage}>
            Create your first job to get started with tracking work and expenses.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('AddJob', {})}
          >
            <Text style={styles.primaryButtonText}>Create First Job</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
          <FlatList
            data={displayedJobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
          {filteredJobs.length > displayedJobs.length && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <TouchableOpacity onPress={() => setShowAllJobs(true)}>
                <Text style={styles.showMoreText}>Show older jobs</Text>
              </TouchableOpacity>
            </View>
          )}
          {showAllJobs && filteredJobs.length > 5 && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <TouchableOpacity onPress={() => setShowAllJobs(false)}>
                <Text style={styles.showMoreText}>Show less</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>

    {/* Status Picker Modal */}
    <Modal
      visible={statusPickerJob !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setStatusPickerJob(null)}
    >
      <TouchableWithoutFeedback onPress={() => setStatusPickerJob(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.statusModalContent}>
              {(['Quoted','Accepted','In-Progress','Completed','Cancelled'] as Job['status'][]).map((s) => (
                <TouchableOpacity key={s} style={styles.statusOption} onPress={() => statusPickerJob && setJobStatus(statusPickerJob, s)}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(s) }]} />
                  <Text style={[styles.statusOptionText, statusPickerJob?.status === s && styles.statusOptionTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
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
  clientName: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobQuote: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  jobDate: {
    fontSize: 12,
    color: '#888',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  statusModalContent: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
  },
  statusOptionTextActive: {
    fontWeight: '700',
  },
});

export default JobsScreen;
