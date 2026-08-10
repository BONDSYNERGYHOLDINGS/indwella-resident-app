  // src/components/CustomDrawer.tsx
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';


const ResidentDrawer = (_props: DrawerContentComponentProps) => {
  const { logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.container}>
      <Image style={styles.img} source={require('../assets/logo.png')} />

      {/* Example menu items - you can wire these up with navigation or actions */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ResidentApp', { screen: 'resident_profile' })}
      >
        <Text style={styles.item}>👤 My Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity
      onPress={() => navigation.navigate('ResidentApp', {
        screen: 'book_visitor',
        params: { name: '', phone: '' },
      })}
      >
        <Text style={styles.item}>📖 Book Visitors</Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Text style={styles.item}>💡 Bills & Utilities</Text>
      </TouchableOpacity>
      <TouchableOpacity
      onPress={() => navigation.navigate('ResidentApp', { screen: 'notification' })}
      >
        <Text style={styles.item}>🔔 Notifications</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Support</Text>
      <TouchableOpacity onPress={() => Linking.openURL('tel:+123456789')}>
        <Text style={styles.item}>📞 Call</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('mailto:support@indwella.com')}>
        <Text style={styles.item}>✉️ Email</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/2347012345678')}>
        <Text style={styles.item}>💬 WhatsApp</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('ResidentApp', { screen: 'report_issues' })}
      >
        <Text style={styles.item}>Report Issues</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Sign out</Text>
      <TouchableOpacity onPress={logout}><Text style={styles.item}>🚨 Logout</Text></TouchableOpacity>

      <Text style={styles.footer}>Powered by <Text style={{ fontWeight: 'bold' }}>LCR</Text></Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingVertical: 70 },
   img: {
        width: 145,
        height: 145,
        resizeMode: 'contain',
        alignSelf: 'flex-start',
        marginBottom: 0,
    },
  item: { paddingVertical: 10, fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#eee', color: '#333', marginBottom: 20 },
  sectionTitle: { marginTop: 20, fontWeight: 'bold', color: '#555', fontSize: 20},
  footer: { marginTop: 'auto', fontSize: 12, color: '#888', marginBottom: 20  },
});

export default ResidentDrawer;
