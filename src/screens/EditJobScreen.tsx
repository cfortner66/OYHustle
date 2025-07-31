import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
// Navigation hooks available if needed:
// import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getJobById, updateJob } from '../services/StorageService';
import { Job } from '../types';
import { RootStackParamList } from '../navigation/types';

type EditJobScreenRouteProp = RouteProp<RootStackParamList, 'EditJob'>;
type EditJobScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EditJob'
>;

type Props = {
  route: EditJobScreenRouteProp;
  navigation: EditJobScreenNavigationProp;
};

const EditJobScreen = ({ route, navigation }: Props) => {
  const { jobId } = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      const fetchedJob = await getJobById(jobId);
      setJob(fetchedJob);
      setLoading(false);
    };

    fetchJob();
  }, [jobId]);

  const handleUpdate = async () => {
    if (job) {
      await updateJob(job);
      navigation.goBack();
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (!job) {
    return <Text>Job not found</Text>;
  }

  return (
    <View style={styles.container}>
      <Text>Title</Text>
      <TextInput
        style={styles.input}
        value={job.title}
        onChangeText={(text) => setJob({ ...job, title: text })}
      />
      <Text>Client Name</Text>
      <TextInput
        style={styles.input}
        value={job.clientName}
        onChangeText={(text) => setJob({ ...job, clientName: text })}
      />
      <Text>Pay</Text>
      <TextInput
        style={styles.input}
        value={job.pay.toString()}
        onChangeText={(text) => setJob({ ...job, pay: Number(text) })}
        keyboardType="numeric"
      />
      <Button title="Update Job" onPress={handleUpdate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
});

export default EditJobScreen;
