import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Image } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import { ResidentStackParamList, RootStackParamList } from '../../navigation/types';





type BookingSuccessRouteProp = RouteProp<ResidentStackParamList, 'booking_success'>;
type NavigationProp =   NativeStackNavigationProp<ResidentStackParamList, 'booking_success'>;

const BookingSuccessScreen = () => {
  const route = useRoute<BookingSuccessRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  const { accessCode, startTime, endTime, visitDate } = route.params;
const [year, month, day] = visitDate.split('-');
// Format date to readable (e.g., "Wed Aug 06 2025")
const formattedDate = visitDate
  ? new Date(visitDate).toDateString()
  : 'Invalid Date';

// Format time to 12-hour format (e.g., "5:36 PM")
const formatTime = (time: string | undefined): string => {
  if (!time) return 'Invalid Time';
  const [hourStr, minute] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
};

const formattedStart = formatTime(startTime);
const formattedEnd = formatTime(endTime);


  const message = `Visitor Access Code: ${accessCode}\nValid: ${formattedStart} - ${formattedEnd}, ${formattedDate}`;

  const share = async (method: 'sms' | 'whatsapp' | 'email') => {
    const encoded = encodeURIComponent(message);
    let url = '';

    switch (method) {
      case 'sms':
        url = `sms:&body=${encoded}`;
        break;
      case 'whatsapp':
        url = `whatsapp://send?text=${encoded}`;
        break;
      case 'email':
        url = `mailto:?subject=Visitor Access Code&body=${encoded}`;
        break;
    }

    try {
      await Share.share({ message });
    } catch (error) {
      console.log('Sharing error:', error);
    }
  };

  return (
    <AppSafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="arrowLLine" size={24} />
      </TouchableOpacity>

      {/* <Image source={require('../../assets/visitor_success.png')} style={styles.image} /> */}

      <Text style={styles.title}>Booking Successful</Text>
      <Text style={styles.subtitle}>Find the access code below</Text>

      <View style={styles.codeBox}>
        <Text style={styles.code}>{accessCode}</Text>
      </View>

      <Text style={styles.info}>
        This access code is valid from <Text style={styles.bold}>{formattedStart}</Text> to <Text style={styles.bold}>{formattedEnd}</Text> on{' '}
        <Text style={styles.bold}>{formattedDate}</Text>.{' '}
        <Text style={styles.warning}>Ensure to share the token with your visitors using the buttons below</Text>
      </Text>

      <Text style={styles.shareLabel}>Share access code</Text>
      <View style={styles.shareRow}>
        <TouchableOpacity style={styles.shareButton} onPress={() => share('sms')}>
          <Icon name="messageFilled" size={26} />
          <Text style={styles.shareText}>SMS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={() => share('whatsapp')}>
          <Icon name="whatsapp" size={26} />
          <Text style={styles.shareText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={() => share('email')}>
          <Icon name="email" size={26} />
          <Text style={styles.shareText}>Email</Text>
        </TouchableOpacity>
      </View>

    </AppSafeAreaView>
  );
};

export default BookingSuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
  codeBox: {
    backgroundColor: '#F6F2FF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  info: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginVertical: 10,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000',
  },
  warning: {
    color: 'red',
    fontWeight: 'bold',
  },
  shareLabel: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  shareButton: {
    alignItems: 'center',
  },
  shareText: {
    marginTop: 5,
    color: '#8506FF',
    fontWeight: '600',
  },
  visitButton: {
    backgroundColor: '#8506FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  visitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
