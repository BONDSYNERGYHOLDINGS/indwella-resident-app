// src/screens/SelectContactScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  PermissionsAndroid, // Import for Android permissions
} from 'react-native';
import Contacts from 'react-native-contacts'; // Import the contacts library

import Icon from '../../components/Icon'; // Adjust path as needed
import AppSafeAreaView from '../../components/AppSafeAreaView'; // Adjust path as needed
// import api from '../api'; // No longer needed for fetching contacts
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types'; // Adjust path as needed
import { useNavigation, useFocusEffect } from '@react-navigation/native';

type ContactType = {
  recordID: string;
  displayName: string;
  givenName?: string | null;
  familyName?: string | null;
  phoneNumbers: { number: string }[];
};

export default function SelectContactScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestContactsPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      return Contacts.checkPermission().then((permission) => {
        if (permission === 'undefined') {
          return Contacts.requestPermission().then((requestResult) => requestResult === 'authorized');
        }
        return permission === 'authorized' || permission === 'limited';
      });
    } else if (Platform.OS === 'android') {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message: 'This app needs access to your contacts to help you select visitors.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return false; // For other platforms
  }, []);

  const fetchDeviceContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        setError('Permission to access contacts denied. Please enable it in settings.');
        setLoading(false);
        return;
      }

      let deviceContacts = await Contacts.getAllWithoutPhotos();
      if (!deviceContacts.length) {
        deviceContacts = await Contacts.getAll();
      }

      const sortedContacts = deviceContacts
        .map(contact => {
          const displayName =
            contact.displayName ||
            [contact.givenName, contact.familyName].filter(Boolean).join(' ');

          return {
            recordID: contact.recordID,
            displayName,
            givenName: contact.givenName,
            familyName: contact.familyName,
            phoneNumbers: contact.phoneNumbers.map(p => ({ number: p.number })),
          };
        })
        .filter(contact => contact.phoneNumbers.length > 0)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setContacts(sortedContacts);
    } catch (err) {
      console.error('Error in permission request or initial contact fetch:', err);
      setError('Failed to load contacts from your device.');
    } finally {
      setLoading(false);
    }
  }, [requestContactsPermission]);

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Linking.openSettings();
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeviceContacts();
    }, [fetchDeviceContacts])
  );

  const handleContactPress = (contact: ContactType) => {
    // Take the first available phone number. You might want to let the user choose if multiple exist.
    // const selectedPhoneNumber =
    //   contact.phoneNumbers.find(
    //     p => typeof p.number === 'string' && p.number.trim() !== '',
    //   )?.number || '';
    // Clean up the phone number (remove spaces, dashes, parentheses)
    const cleanPhoneNumber = (num: string | number) => {
      let cleaned = num.toString().replace(/\D/g, '');

      if (cleaned.startsWith('234')) {
        cleaned = cleaned.slice(3);
      }

      if (cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
      }

      return cleaned;
    };
    const selectedPhoneNumber = contact.phoneNumbers.find(
      p => typeof p.number === 'string' || typeof p.number === 'number'
    )?.number;
    const formattedPhone = selectedPhoneNumber ? cleanPhoneNumber(selectedPhoneNumber) : '';


    // Navigate to the book_visitor screen with the selected contact's name and phone number
    navigation.navigate('ResidentApp', {
      screen: 'book_visitor',
      params:{
        name: contact.displayName || '',
        phone: formattedPhone,
      },
    });
  };

  const handleNewContact = () => {
    navigation.navigate('ResidentApp', {
      screen: 'book_visitor',
      params:{ name: '', phone: '' },
    });
  };

  const renderContactItem = ({ item }: { item: ContactType}) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => handleContactPress(item)}>
      <View style={[styles.avatar, { backgroundColor: item.displayName ? '#C8FAD6' : '#E0E0E0' }]}>
        {/* <Icon
          name="person"
          size={20}
          color={item.displayName ? '#27AE60' : '#888'}
        /> */}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.displayName || (item.phoneNumbers[0]?.number || 'No Name')}</Text>
        {item.phoneNumbers.length > 0 && (
          <Text style={styles.contactPhone}>
            {item.phoneNumbers.map(p => p.number).join(', ')}
          </Text>
        )}
      </View>
      {/* <Icon name="arrowDown" size={20} color="#888" /> */}
    </TouchableOpacity>
  );

  return (
    <AppSafeAreaView>

      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrowLLine" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Book Visitors</Text>
          <Text style={styles.subHeader}>Select contact to invite</Text>
        </View>
        <TouchableOpacity
          style={styles.newContactButton}
          onPress={handleNewContact}
        >
          <Text style={styles.newContactButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8506FF" style={styles.loadingIndicator} />
      ) : error ? (
        <View style={styles.messageContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.recordID} // Use recordID as key
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <Text style={styles.emptyListText}>
              No phone contacts found on this device.
            </Text>
          )}
        />
      )}

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
    position: 'relative',
  },
  backButton: {
    padding: 5,
  },
  headerTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  newContactButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8506FF',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  newContactButtonText: {
    color: 'white',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  settingsButton: {
    backgroundColor: '#8506FF',
    borderRadius: 8,
    marginTop: 15,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
    fontSize: 16,
  },
});
