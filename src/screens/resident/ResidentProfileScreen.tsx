import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getFcmToken } from '../../services/pushNotifications';

import Icon from '../../components/Icon';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import { api } from '../../lib/apiClient';
import { ResidentStackParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../../contexts/AuthContext';
import { pickImageAsset } from '../../services/imagePicker';

type ResidentProfileNavigationProp = NativeStackNavigationProp<
  ResidentStackParamList & RootStackParamList
>;

export default function ResidentProfileScreen() {
  const navigation = useNavigation<ResidentProfileNavigationProp>();
  const [residentId, setResidentId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');

  const { getToken, logout } = useAuth();
  const baseURL = api.defaults.baseURL || '';

  const fetchResident = useCallback(async () => {
    try {
      const res = await api.get('/resident-profile');
      const data = res.data;

      setResidentId(data.id ?? null);
      setFirstName(data.first_name ?? '');
      setLastName(data.last_name ?? '');
      setEmail(data.email ?? '');
      setOriginalEmail(data.email ?? '');
      setPhone(data.phone_number ?? '');
      setOriginalPhone(data.phone_number ?? '');
      setAvatarUrl(data.profile_photo ? `${baseURL}/${data.profile_photo}` : null);
    } catch (error) {
      console.error('Error fetching resident info:', error);
      Alert.alert('Error', 'Could not load profile info.');
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  useEffect(() => {
    fetchResident();
  }, [fetchResident]);

  const handleDelete = async () => {
    Alert.alert('Delete Account', 'This action cannot be undone. Proceed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/resident/delete-account');
            await logout();
            navigation.replace('resident_auth');
          } catch (err) {
            Alert.alert('Error', 'Could not delete account.');
          }
        },
      },
    ]);
  };

  const isModified =
    email.trim().toLowerCase() !== originalEmail.trim().toLowerCase() ||
    phone.trim() !== originalPhone.trim();

  const handleUpdate = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail) {
      Alert.alert('Error', 'Email is required.');
      return;
    }

    if (!trimmedPhone) {
      Alert.alert('Error', 'Phone number is required.');
      return;
    }

    if (!isModified) {
      return;
    }

    setSaving(true);
    try {
      let fcmToken = null;
      try {
        fcmToken = await getFcmToken();
      } catch (e) {
        console.warn('FCM token fetch failed during profile update', e);
      }

      await api.patch(
        '/resident-profile',
        {
          ...(trimmedEmail !== originalEmail.trim().toLowerCase() && {
            email: trimmedEmail,
          }),
          ...(trimmedPhone !== originalPhone.trim() && {
            phone_number: trimmedPhone,
          }),
          fcm_token: fcmToken,
        },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        },
      );

      setEmail(trimmedEmail);
      setOriginalEmail(trimmedEmail);
      setPhone(trimmedPhone);
      setOriginalPhone(trimmedPhone);
      Alert.alert('Updated', 'Profile updated successfully.');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectImage = async () => {
    const { asset, errorMessage } = await pickImageAsset();

    if (errorMessage) {
      Alert.alert('Error', errorMessage);
      return;
    }

    if (!asset?.uri) {
      return;
    }

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.type || 'image/jpeg',
      });

      const token = await getToken();
      const res = await api.post('/resident/upload-photo', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAvatarUrl(`${baseURL}${res.data.url}`);
      Alert.alert('Success', 'Profile image updated!');
    } catch (err: any) {
      console.error('Upload error:', err?.response?.data || err.message || err);
      Alert.alert(
        'Error',
        err?.response?.data?.detail || 'Could not update profile image.',
      );
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <AppSafeAreaView>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#4B4CFF" />
        </View>
      </AppSafeAreaView>
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <AppSafeAreaView>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrowLLine" size={22} />
        </TouchableOpacity>

        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Icon name="userbgless" size={48} style={styles.placeholderIcon} />
              </View>
            )}
            <TouchableOpacity
              style={styles.plusButton}
              onPress={handleSelectImage}
              disabled={uploadingImage}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="addPlus" size={16} />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.emailLabel}>{email}</Text>
          <Text style={styles.nameNotice}>Name changes are not allowed.</Text>
        </View>

        {residentId !== null && (
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Icon name="credit" size={18} />
            </View>
            <Text style={styles.infoText}>{`Resident ID: RS${residentId}`}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Icon name="email" size={18} />
          </View>
          <TextInput
            style={styles.fieldInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Icon name="phone" size={18} />
          </View>
          <TextInput
            style={styles.fieldInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.updateBtn, !isModified || saving ? styles.updateBtnDisabled : null]}
          onPress={handleUpdate}
          disabled={!isModified || saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.updateText}>Update Profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => navigation.navigate('resident_change_password')}>
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
          <Icon name="trash" size={18} />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  placeholderAvatar: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    tintColor: '#94A3B8',
  },
  plusButton: {
    position: 'absolute',
    right: -6,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4B4CFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  emailLabel: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  nameNotice: {
    marginTop: 8,
    fontSize: 12,
    color: '#4B4CFF',
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  updateBtn: {
    marginTop: 8,
    marginBottom: 18,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#4B4CFF',
  },
  updateBtnDisabled: {
    opacity: 0.65,
  },
  updateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  changePasswordText: {
    color: '#4B4CFF',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },
  deleteAction: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
