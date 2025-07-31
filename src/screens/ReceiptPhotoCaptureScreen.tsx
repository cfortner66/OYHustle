import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, Image, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

type RootStackParamList = {
  ReceiptPhotoCapture: { onPhotoTaken: (photoPath: string) => void };
};

type ReceiptPhotoCaptureScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ReceiptPhotoCapture'
>;
type ReceiptPhotoCaptureScreenRouteProp = RouteProp<
  RootStackParamList,
  'ReceiptPhotoCapture'
>;

type Props = {
  navigation: ReceiptPhotoCaptureScreenNavigationProp;
  route: ReceiptPhotoCaptureScreenRouteProp;
};

const ReceiptPhotoCaptureScreen = ({ navigation, route }: Props) => {
  const { onPhotoTaken } = route.params;
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are required to capture receipts.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setCapturedPhoto(photoUri);
        await handlePhotoConfirmation(photoUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handleOpenGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setCapturedPhoto(photoUri);
        await handlePhotoConfirmation(photoUri);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo from gallery.');
    }
  };

  const handlePhotoConfirmation = async (photoUri: string) => {
    Alert.alert(
      'Photo Captured',
      'Receipt photo has been captured successfully!',
      [
        {
          text: 'Retake',
          style: 'cancel',
          onPress: () => setCapturedPhoto(null),
        },
        {
          text: 'Use Photo',
          onPress: () => savePhotoAndReturn(photoUri),
        },
      ]
    );
  };

  const savePhotoAndReturn = async (photoUri: string) => {
    try {
      setUploading(true);
      
      // Create a permanent file path in the app's document directory
      const timestamp = Date.now();
      const fileName = `receipt_${timestamp}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}receipts/${fileName}`;
      
      // Ensure receipts directory exists
      const receiptDir = `${FileSystem.documentDirectory}receipts/`;
      const dirInfo = await FileSystem.getInfoAsync(receiptDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(receiptDir, { intermediates: true });
      }
      
      // Copy the image to permanent storage
      await FileSystem.copyAsync({
        from: photoUri,
        to: permanentUri,
      });
      
      // Return the permanent URI
      onPhotoTaken(permanentUri);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Receipt</Text>
      <Text style={styles.subtitle}>
        Take a photo of your receipt for expense tracking
      </Text>

      {capturedPhoto && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>Photo Preview:</Text>
          <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.primaryButton, uploading && styles.disabledButton]} 
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          <Text style={styles.primaryButtonText}>📷 Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, uploading && styles.disabledButton]} 
          onPress={handleOpenGallery}
          disabled={uploading}
        >
          <Text style={styles.secondaryButtonText}>📁 Choose from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
          disabled={uploading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        {uploading && (
          <Text style={styles.uploadingText}>Saving photo...</Text>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Tips for better results:</Text>
        <Text style={styles.infoText}>• Ensure good lighting</Text>
        <Text style={styles.infoText}>• Keep the receipt flat</Text>
        <Text style={styles.infoText}>• Make sure all text is visible</Text>
        <Text style={styles.infoText}>• Avoid shadows and glare</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  previewContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewImage: {
    width: 200,
    height: 250,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  uploadingText: {
    textAlign: 'center',
    color: '#2196F3',
    fontStyle: 'italic',
    marginTop: 8,
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 'auto',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default ReceiptPhotoCaptureScreen;
