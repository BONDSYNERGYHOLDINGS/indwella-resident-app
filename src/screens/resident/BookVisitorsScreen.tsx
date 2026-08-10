import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Alert, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, ActivityIndicator} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from '../../components/Icon';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import { api } from '../../lib/apiClient';
import { NativeStackNavigationProp} from '@react-navigation/native-stack';
import { ResidentStackParamList, RootStackParamList } from '../../navigation/types';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import PhoneContactPicker from '../../native/PhoneContactPicker';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';


type BookVisitorScreenProps = RouteProp<ResidentStackParamList, 'book_visitor'>

interface VisitorHistoryItem {
  id: number;
  visitor_name: string;
  visitor_phone: string;
  access_code: string;
  visit_date: string;
  visit_start_time: string;
  visit_end_time: string;
  status: 'Active' | 'Time up';
}

export default function BookVisitorScreen() {

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<BookVisitorScreenProps>();
  const { getToken } = useAuth();
  const [name, setName] = useState(route.params?.name || '');
  const [phone, setPhone] = useState(route.params?.phone || '');
  const [visitorsCount, setVisitorsCount] = useState('1');
  const [isRepeating, setIsRepeating] = useState(false);
  const [comments, setComments] = useState('');
  const [history, setHistory] = useState<VisitorHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(Boolean(route.params?.name || route.params?.phone));

  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [countryCode, setCountryCode] =  React.useState<CountryCode>('NG');
  const [callingCode, setCallingCode] = React.useState('234'); // default to Nigeria

  const formatVisitTime = (time: Date) =>
    time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });




 useEffect(() => {
    if (route.params) {
      setName(route.params.name || '');
      setPhone(route.params.phone || '');
      if (route.params.name || route.params.phone) {
        setShowBookingForm(true);
      }
    }
  }, [route.params]);

  const handleNewContact = () => {
    setName('');
    setPhone('');
    setVisitorsCount('1');
    setComments('');
    setShowBookingForm(true);
  };

  const fetchVisitorHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await api.get<VisitorHistoryItem[]>('/resident/visitor-history');
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Error fetching visitor history:', err);
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load visitor history.';
      setHistoryError(errorMessage);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchVisitorHistory();
    }, [fetchVisitorHistory])
  );

  const handleVisitorPress = (visit_id: number) => {
    navigation.navigate('ResidentApp', {
      screen: 'visitor_history_detail',
      params: { visit_id },
    });
  };

  const getStatusStyle = (status: VisitorHistoryItem['status']) => {
    return status === 'Active' ? styles.statusActive : styles.statusExpired;
  };

  const renderHistoryItem = (item: VisitorHistoryItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.historyItem}
      onPress={() => handleVisitorPress(item.id)}>
      <View style={styles.historyAvatar}>
        <Text style={styles.historyAvatarText}>{item.visitor_name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyName}>{item.visitor_name}</Text>
        <Text style={styles.historyCode}>{item.access_code}</Text>
      </View>
      <View style={styles.historyStatusContainer}>
        <Text style={[styles.historyStatus, getStatusStyle(item.status)]}>{item.status}</Text>
        <Text style={styles.historyTime}>
          {format(parseISO(`${item.visit_date}T${item.visit_start_time}`), 'hh:mm a, yyyy MM dd')}
        </Text>
      </View>
    </TouchableOpacity>
  );

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

  const handleSelectContact = async () => {
    if (!PhoneContactPicker) {
      Alert.alert(
        'Contacts unavailable',
        'Please rebuild and reinstall the app so the phone contact picker can be loaded.'
      );
      return;
    }

    try {
      const contact = await PhoneContactPicker.pickContact();
      setName(contact.name || '');
      setPhone(contact.phone ? cleanPhoneNumber(contact.phone) : '');
      setShowBookingForm(true);
    } catch (error: any) {
      if (error?.code !== 'contact_picker_cancelled') {
        Alert.alert('Error', error?.message || 'Failed to select contact.');
      }
    }
  };

  const handleBookVisitor = async () => {
    if (!name || !phone || !visitorsCount) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }



    const payload = {
    visitor_name: name,
    visitor_phone: `+${callingCode}${phone}`,
    number_of_visitors: parseInt(visitorsCount),
    visit_date: date.toISOString().split('T')[0],
    start_time: startTime.toTimeString().split(':').slice(0, 2).join(':'), // "HH:MM"
    end_time: endTime.toTimeString().split(':').slice(0, 2).join(':'), // "HH:MM"
    comment: comments,
  };


    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Login session expired. Please log in again.');
      }

      const res = await api.post('/resident/book-visitor', payload, {
  headers: {
    Authorization: `Bearer ${token}`,

  },
});
const visitorId = res.data?.visitor_id;

if(!visitorId){
  throw new Error('Visitor ID not found in response');
}
// ✅ Call visitor-access endpoint to get access code
    const accessRes = await api.get(`/resident/visitor-access/${visitorId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

      Alert.alert('Success', 'Visitor booked successfully!');


       const { access_code, validity_text, share_text, visit_id } = accessRes.data;

     navigation.navigate('ResidentApp', {
  screen: 'booking_success',
  params: {
    accessCode: access_code,
    validityText: validity_text,
    shareText: share_text,
    visitId: visit_id,
    visitDate: date.toISOString().split('T')[0],
    startTime: startTime.toTimeString().split(':').slice(0, 2).join(':'),
    endTime: endTime.toTimeString().split(':').slice(0, 2).join(':'),
  },
});
      // Optionally reset form
      setName('');
      setPhone('');
      setVisitorsCount('1');
      setComments('');
      setShowBookingForm(false);
      fetchVisitorHistory();
    } catch (error: any) {
 const message = error.response?.data?.message;
  Alert.alert(
    'Error',
    Array.isArray(message) ? message.join('\n') : message || 'Failed to book visitor.'
  );
}

  };

//   const handleBooking = () => {
//   const now = new Date();
//   const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

//   navigation.navigate('booking_success', {
//     accessCode: 'A1B2C3',
//     visitDate: now.toISOString(),
//     startTime: now.toISOString(),
//     endTime: twoHoursLater.toISOString(),
//   });
// };


  return (
    <AppSafeAreaView>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{paddingVertical: 30, paddingHorizontal: 20}}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Icon name="arrowLLine" size={24} />
              </TouchableOpacity>
              {!showBookingForm && (
                <>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Book Visitors</Text>
                    <Text style={styles.headerSubTitle}>Select contact to invite</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleNewContact}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {showBookingForm ? (
              <>
                <TouchableOpacity style={styles.contactButton} onPress={handleSelectContact}>
                  <Text style={styles.contactButtonText}>Contacts</Text>
                </TouchableOpacity>

                <TextInput
                  placeholder="Visitor’s name"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholderTextColor="gray"
                />

                <View
                  style={[
                    styles.input,
                    {flexDirection: 'row', alignItems: 'center'},
                  ]}>
                  <CountryPicker
                    countryCode={countryCode}
                    withCallingCode
                    withFilter
                    withFlag
                    withEmoji
                    onSelect={(country: Country) => {
                      setCountryCode(country.cca2);
                      setCallingCode(country.callingCode[0]);
                    }}
                    containerButtonStyle={{marginRight: 0}}
                  />
                  <Text style={{fontSize: 16, marginRight: 5, color: 'black', borderEndWidth: 1, borderColor: 'black'}}>
                    +{callingCode}
                  </Text>
                  <TextInput
                    placeholder="9147612434"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={ {flex: 1, marginBottom: 0, color: 'black', borderEndWidth: 1, borderColor: 'black'}}
                    placeholderTextColor="gray"
                  />
                </View>

                <TextInput
                  placeholder="Number of visitors"
                  value={visitorsCount}
                  onChangeText={setVisitorsCount}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="gray"
                />

                <View style={styles.switchContainer}>
                  <Text style={{fontSize: 16, color: 'black'}}>
                    Repeating visit?
                  </Text>
                  <Switch value={isRepeating} onValueChange={setIsRepeating} />
                </View>

                <Text style={styles.label}>Date of visit</Text>
                <TouchableOpacity
                  style={styles.inputRow}
                  onPress={() => setShowDatePicker(true)}>
                  <Text style={{color: '#000'}}>{date.toDateString()}</Text>
                  {/* <Icon name="calendar" size={20} /> */}
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    mode="date"
                    display="default" // safe across platforms
                    value={date}
                    onChange={(event, selected) => {
                      setShowDatePicker(false);
                      if (selected) {setDate(selected);}
                    }}
                  />
                )}

                <Text style={styles.label}>Start time of visit</Text>
                <TouchableOpacity
                  style={styles.inputRow}
                  onPress={() => setShowStartTimePicker(true)}>
                  <Text style={{color: '#000'}}>
                    {formatVisitTime(startTime)}
                  </Text>
                  {/* <Icon name="clock" size={20} /> */}
                </TouchableOpacity>
                {showStartTimePicker && (
                  <DateTimePicker
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    value={startTime}
                    onChange={(event, selected) => {
                      setShowStartTimePicker(false);
                      if (selected) {setStartTime(selected);}
                    }}
                  />
                )}

                <Text style={styles.label}>End time of visit</Text>
                <TouchableOpacity
                  style={styles.inputRow}
                  onPress={() => setShowEndTimePicker(true)}>
                  <Text style={{color: '#000'}}>
                    {formatVisitTime(endTime)}
                  </Text>
                  {/* <Icon name="clock" size={20} /> */}
                </TouchableOpacity>
                {showEndTimePicker && (
                  <DateTimePicker
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    value={endTime}
                    onChange={(event, selected) => {
                      setShowEndTimePicker(false);
                      if (selected) {setEndTime(selected);}
                    }}
                  />
                )}

                <TextInput
                  placeholder="Additional comments"
                  value={comments}
                  onChangeText={setComments}
                  multiline
                  style={[styles.input, {height: 80}]}
                  placeholderTextColor="gray"
                />

                <TouchableOpacity style={styles.button} onPress={handleBookVisitor}>
                  <Text style={styles.buttonText}>Book Visit</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Visitor History</Text>
              {historyLoading ? (
                <ActivityIndicator size="small" color="#8506FF" style={styles.historyLoader} />
              ) : historyError ? (
                <Text style={styles.historyError}>{historyError}</Text>
              ) : history.length === 0 ? (
                <Text style={styles.historyEmpty}>No visitor history found.</Text>
              ) : (
                history.map(renderHistoryItem)
              )}
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubTitle: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#8506FF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    color: 'black',
  },
  contactButton: {
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
    borderRadius: 10,
    marginBottom: 15,
    paddingVertical: 12,
  },
  contactButtonText: {
    color: '#8506FF',
    fontSize: 16,
    fontWeight: '600',
  },
  inputRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#8506FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historySection: {
    marginTop: 28,
    paddingBottom: 20,
  },
  historyTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  historyLoader: {
    marginTop: 10,
  },
  historyError: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
  },
  historyEmpty: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  historyItem: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyAvatar: {
    alignItems: 'center',
    backgroundColor: '#E7D8F6',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 15,
    width: 40,
  },
  historyAvatarText: {
    color: '#8506FF',
    fontSize: 18,
    fontWeight: '700',
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyCode: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  historyStatusContainer: {
    alignItems: 'flex-end',
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusActive: {
    color: '#27AE60',
  },
  statusExpired: {
    color: '#E74C3C',
  },
  historyTime: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});
