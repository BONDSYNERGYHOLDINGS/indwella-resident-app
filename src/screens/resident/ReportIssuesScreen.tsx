import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import Icon from '../../components/Icon';
import { ResidentStackParamList } from '../../navigation/types';
import { pickImageAsset } from '../../services/imagePicker';
import type { Asset } from 'react-native-image-picker';

type ReportIssuesNavigationProp = NativeStackNavigationProp<
  ResidentStackParamList,
  'report_issues'
>;

export default function ReportIssuesScreen() {
  const navigation = useNavigation<ReportIssuesNavigationProp>();
  const { getToken } = useAuth();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [residentAddress, setResidentAddress] = React.useState('');
  const [selectedMedia, setSelectedMedia] = React.useState<Asset | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const fetchResidentAddress = async () => {
      try {
        const token = await getToken();
        const res = await api.get('/resident-profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setResidentAddress(res.data?.house_address || '');
      } catch (error) {
        console.error('Error fetching resident address:', error);
      }
    };

    fetchResidentAddress();
  }, [getToken]);

  const handleAddMedia = async () => {
    const { asset, errorMessage } = await pickImageAsset();

    if (errorMessage) {
      Alert.alert('Error', errorMessage);
      return;
    }

    if (asset) {
      setSelectedMedia(asset);
    }
  };

  const getSelectedMediaName = () => {
    if (selectedMedia?.fileName) {
      return selectedMedia.fileName;
    }

    if (selectedMedia?.type === 'image/png') {
      return 'issue-photo.png';
    }

    if (selectedMedia?.type === 'image/webp') {
      return 'issue-photo.webp';
    }

    return 'issue-photo.jpg';
  };

  const getSubmitErrorMessage = (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response
    ) {
      const data = error.response.data as { detail?: string; message?: string };
      return data.detail || data.message || 'Could not submit report.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Could not submit report.';
  };

  const handleSubmitReport = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      Alert.alert('Missing details', 'Please enter a title and describe the problem.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('description', trimmedDescription);
      formData.append('house_address', residentAddress || '');

      if (selectedMedia?.uri) {
        formData.append('media', {
          uri: selectedMedia.uri,
          name: getSelectedMediaName(),
          type: selectedMedia.type || 'image/jpeg',
        } as any);
      }

      await api.post('/resident/report-issue', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      Alert.alert('Report submitted', 'Your report has been submitted successfully.');
      setTitle('');
      setDescription('');
      setSelectedMedia(null);
    } catch (error: unknown) {
      Alert.alert('Submission failed', getSubmitErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppSafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.screen}>
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.75}
                onPress={() => navigation.goBack()}>
                <Icon name="arrowLLine" size={20} style={styles.backIcon} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Submit Report</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Incident Details</Text>

                <Text style={styles.label}>Report Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter a brief title..."
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                />

                <Text style={styles.label}>Describe the problem in detail...</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Please include dates, times, specific details, and anyone involved..."
                  placeholderTextColor="#6B7280"
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.descriptionInput]}
                />

                <Text style={styles.mediaLabel}>
                  Add media <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.mediaPicker,
                    selectedMedia?.uri ? styles.mediaPickerWithPreview : null,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleAddMedia}>
                  {selectedMedia?.uri ? (
                    <>
                      <Image
                        source={{ uri: selectedMedia.uri }}
                        style={styles.mediaPreview}
                        resizeMode="cover"
                      />
                      <View style={styles.changeMediaOverlay}>
                        <Text style={styles.changeMediaText}>Change image</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.plusText}>+</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting ? styles.submitButtonDisabled : null,
                ]}
                activeOpacity={0.85}
                disabled={submitting}
                onPress={handleSubmitReport}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    alignItems: 'center',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 10,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    minWidth: 78,
  },
  backIcon: {
    tintColor: '#6B21D8',
  },
  backText: {
    color: '#6B21D8',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 2,
  },
  headerTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 78,
  },
  content: {
    flexGrow: 1,
    paddingTop: 12,
  },
  formCard: {
    borderColor: '#9CA3AF',
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 0,
    minHeight: 412,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 18,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  label: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#E5E7EB',
    borderColor: '#B8C0CC',
    borderRadius: 6,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    minHeight: 42,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  descriptionInput: {
    minHeight: 88,
    paddingTop: 10,
  },
  mediaLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  optionalText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  mediaPicker: {
    alignItems: 'center',
    borderColor: '#9CA3AF',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mediaPickerWithPreview: {
    borderStyle: 'solid',
    height: 156,
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  mediaPreview: {
    height: '100%',
    width: '100%',
  },
  changeMediaOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.64)',
    bottom: 0,
    height: 34,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  changeMediaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  plusText: {
    color: '#7B8794',
    fontSize: 44,
    fontWeight: '300',
    lineHeight: 46,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#6B21D8',
    borderRadius: 7,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#6B21D8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
