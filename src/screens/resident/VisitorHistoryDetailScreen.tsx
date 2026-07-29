import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from '../../components/Icon';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import { api } from '../../lib/apiClient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ResidentStackParamList } from '../../navigation/types';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';

interface VisitorHistoryItem {
  id: number;
  visitor_name: string;
  visitor_phone: string;
  visit_date: string;
  visit_start_time: string;
  visit_end_time: string;
  house_address: string;
  comment?: string | null;
  approval_status: string;
  status: 'Active' | 'Time up';
  time_left?: string | null;
}

type VisitorHistoryDetailScreenProps = NativeStackScreenProps<
  ResidentStackParamList,
  'visitor_history_detail'
>;

export default function VisitorHistoryDetailScreen() {
  const navigation = useNavigation<VisitorHistoryDetailScreenProps['navigation']>();
  const route = useRoute<VisitorHistoryDetailScreenProps['route']>();
  const { visit_id } = route.params;

  const [visitorDetails, setVisitorDetails] = useState<VisitorHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [visitorNameInputHeight, setVisitorNameInputHeight] = useState(48);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const isVisitActive = visitorDetails?.status === 'Active';
  const approvalStatus = visitorDetails?.approval_status?.toLowerCase();
  const isSecurityApproved = approvalStatus === 'approved';
  const isSecurityDisapproved = approvalStatus === 'disapproved';
  const isEditable = isVisitActive && !isSecurityApproved && !isSecurityDisapproved;

  const formatApprovalStatus = (status?: string | null) => {
    if (!status) {
      return '';
    }

    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const fetchVisitorDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<VisitorHistoryItem>(`/resident/visit-details/${visit_id}`);
      const data = response.data;

      setVisitorDetails(data);
      setName(data.visitor_name);
      setPhone(data.visitor_phone);
      setDate(parseISO(`${data.visit_date}T00:00:00`));
      setStartTime(parseISO(`${data.visit_date}T${data.visit_start_time}`));
      setEndTime(parseISO(`${data.visit_date}T${data.visit_end_time}`));
    } catch (err: any) {
      console.error('Error fetching visitor details:', err);
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load visitor details. Please try again.';
      Alert.alert('Error', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVisitorDetails();
    }, [visit_id]),
  );

  const handleUpdateVisit = async () => {
    if (!isEditable) {
      Alert.alert('Cannot Edit', 'This visit can no longer be edited.');
      return;
    }
    if (!name || !phone) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }

    try {
      await api.patch(`/resident/edit-visit/${visit_id}`, {
        visitor_name: name,
        visitor_phone: phone,
        visit_date: format(date, 'yyyy-MM-dd'),
        visit_start_time: format(startTime, 'HH:mm'),
        visit_end_time: format(endTime, 'HH:mm'),
      });
      Alert.alert('Success', 'Visit updated successfully!');
      fetchVisitorDetails();
    } catch (err: any) {
      console.error('Error updating visit:', err);
      Alert.alert(
        'Error',
        err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update visit.',
      );
    }
  };

  const handleCancelVisit = async () => {
    if (!isEditable) {
      Alert.alert('Cannot Cancel', 'This visit can no longer be cancelled.');
      return;
    }

    Alert.alert('Confirm Cancellation', 'Are you sure you want to cancel this visit?', [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await api.delete(`/resident/cancel-visit/${visit_id}`);
            Alert.alert('Success', 'Visit cancelled successfully!');
            navigation.goBack();
          } catch (err: any) {
            console.error('Error cancelling visit:', err);
            Alert.alert(
              'Error',
              err?.response?.data?.detail || err?.response?.data?.message || 'Failed to cancel visit.',
            );
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <AppSafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8506FF" />
          <Text style={styles.loadingText}>Loading visitor details...</Text>
        </View>
      </AppSafeAreaView>
    );
  }

  if (error || !visitorDetails) {
    return (
      <AppSafeAreaView>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrowLLine" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visitors History</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Visitor details not found.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchVisitorDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AppSafeAreaView>
    );
  }

  return (
    <AppSafeAreaView>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrowLLine" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visitors History</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.detailCard}>
          {isSecurityApproved && (
            <View style={styles.approvedBanner}>
              <Icon name="success" size={20} />
              <Text style={styles.approvedText}>This visit has been approved by security. No further changes can be made.</Text>
            </View>
          )}

          {isSecurityDisapproved && (
            <View style={styles.disapprovedBanner}>
              <Icon name="close" size={20} />
              <Text style={styles.disapprovedText}>This visit has been disapproved by security and cannot be modified.</Text>
            </View>
          )}

          <View style={styles.topRow}>
            <View style={[
              styles.largeAvatar,
              isSecurityApproved && styles.avatarApproved,
              isSecurityDisapproved && styles.avatarDisapproved
            ]}>
              <Text style={styles.largeAvatarText}>
                {visitorDetails.visitor_name ? visitorDetails.visitor_name[0].toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.timeLeftContainer}>
              <Text style={styles.timeLeftLabel}>Time left:</Text>
              <Text style={styles.timeLeftValue}>{visitorDetails.time_left || '0:00:00'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailFullColumn}>
              <Text style={styles.detailLabel}>Visitor name</Text>
              {isEditable ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[
                    styles.detailValueInput,
                    styles.visitorNameInput,
                    { height: visitorNameInputHeight },
                  ]}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  onContentSizeChange={(event) => {
                    setVisitorNameInputHeight(Math.max(48, event.nativeEvent.contentSize.height));
                  }}
                />
              ) : (
                <View style={[styles.visitorNameTextBox, styles.disabledInput]}>
                  <Text style={styles.visitorNameText}>{name}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailFullColumn}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.detailValue, isVisitActive ? styles.statusActive : styles.statusExpired]}>
                {visitorDetails.status}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Visitor phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={[styles.detailValueInput, !isEditable && styles.disabledInput]}
                editable={isEditable}
              />
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>House address</Text>
              <Text style={styles.detailValue}>{visitorDetails.house_address}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Visit date</Text>
              <TouchableOpacity
                style={[styles.detailValueInput, styles.timePickerInput, !isEditable && styles.disabledInput]}
                onPress={() => isEditable && setShowDatePicker(true)}
                disabled={!isEditable}
              >
                <Text style={{ color: '#000' }}>{format(date, 'yyyy-MM-dd')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  mode="date"
                  display="default"
                  value={date}
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Start time</Text>
              <TouchableOpacity
                style={[styles.detailValueInput, styles.timePickerInput, !isEditable && styles.disabledInput]}
                onPress={() => isEditable && setShowStartTimePicker(true)}
                disabled={!isEditable}
              >
                <Text style={{ color: '#000' }}>{format(startTime, 'hh:mm a')}</Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  value={startTime}
                  onChange={(_, selectedTime) => {
                    setShowStartTimePicker(false);
                    if (selectedTime) {
                      setStartTime(selectedTime);
                    }
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>End time</Text>
              <TouchableOpacity
                style={[styles.detailValueInput, styles.timePickerInput, !isEditable && styles.disabledInput]}
                onPress={() => isEditable && setShowEndTimePicker(true)}
                disabled={!isEditable}
              >
                <Text style={{ color: '#000' }}>{format(endTime, 'hh:mm a')}</Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  value={endTime}
                  onChange={(_, selectedTime) => {
                    setShowEndTimePicker(false);
                    if (selectedTime) {
                      setEndTime(selectedTime);
                    }
                  }}
                />
              )}
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Approval status</Text>
              <Text style={[
                styles.detailValue,
                isSecurityApproved && styles.statusApproved,
                isSecurityDisapproved && styles.statusDisapproved
              ]}>
                {formatApprovalStatus(visitorDetails.approval_status)}
              </Text>
            </View>
          </View>

          {!!visitorDetails.comment && (
            <View style={styles.commentSection}>
              <Text style={styles.detailLabel}>Additional comment</Text>
              <Text style={styles.commentValue}>{visitorDetails.comment}</Text>
            </View>
          )}

          {isEditable && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelVisit}>
              <Text style={styles.cancelButtonText}>Cancel Visit</Text>
            </TouchableOpacity>
          )}

          {isEditable && (
            <TouchableOpacity style={styles.editButton} onPress={handleUpdateVisit}>
              <Text style={styles.editButtonText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8506FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9F7EF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  approvedText: {
    color: '#27AE60',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  disapprovedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  disapprovedText: {
    color: '#E74C3C',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8506FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarApproved: {
    backgroundColor: '#27AE60',
  },
  avatarDisapproved: {
    backgroundColor: '#E74C3C',
  },
  largeAvatarText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  timeLeftLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  timeLeftValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailColumn: {
    flex: 1,
    marginRight: 10,
  },
  detailFullColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailValueInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  visitorNameInput: {
    lineHeight: 22,
    minHeight: 48,
  },
  visitorNameTextBox: {
    borderColor: '#eee',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    padding: 12,
  },
  visitorNameText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  timePickerInput: {
    justifyContent: 'center',
  },
  disabledInput: {
    backgroundColor: '#e0e0e0',
    color: '#888',
  },
  commentSection: {
    marginBottom: 15,
  },
  commentValue: {
    backgroundColor: '#f9f9f9',
    borderColor: '#eee',
    borderRadius: 8,
    borderWidth: 1,
    color: '#333',
    fontSize: 16,
    lineHeight: 22,
    padding: 12,
  },
  statusActive: {
    color: '#27AE60',
  },
  statusApproved: {
    color: '#27AE60',
  },
  statusDisapproved: {
    color: '#E74C3C',
  },
  statusExpired: {
    color: '#E74C3C',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#8506FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
