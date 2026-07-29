import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import Icon from '../../components/Icon';
import { api } from '../../lib/apiClient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ResidentStackParamList } from '../../navigation/types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';

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

type VisitorHistoryListScreenProps = NativeStackScreenProps<
  ResidentStackParamList,
  'visitor_history_list'
>;

export default function VisitorHistoryListScreen() {
  const navigation = useNavigation<VisitorHistoryListScreenProps['navigation']>();
  const [history, setHistory] = useState<VisitorHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisitorHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<VisitorHistoryItem[]>('/resident/visitor-history');
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Error fetching visitor history:', err);
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load visitor history. Please try again.';
      Alert.alert('Error', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVisitorHistory();
    }, []),
  );

  const handleVisitorPress = (visit_id: number) => {
    navigation.navigate('visitor_history_detail', { visit_id });
  };

  const getStatusStyle = (status: VisitorHistoryItem['status']) => {
    return status === 'Active' ? styles.statusActive : styles.statusExpired;
  };

  const renderHistoryItem = ({ item }: { item: VisitorHistoryItem }) => (
    <TouchableOpacity style={styles.historyItem} onPress={() => handleVisitorPress(item.id)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.visitor_name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.visitorName}>{item.visitor_name}</Text>
        <Text style={styles.accessCode}>{item.access_code}</Text>
      </View>
      <View style={styles.statusTimeContainer}>
        <Text style={[styles.statusText, getStatusStyle(item.status)]}>{item.status}</Text>
        <Text style={styles.visitTime}>
          {format(parseISO(`${item.visit_date}T${item.visit_start_time}`), 'hh:mm a, yyyy MM dd')}
        </Text>
      </View>
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
          <Text style={styles.subHeader}>View your booked visitor passes</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.historyTabButton}>
        <Text style={styles.historyTabText}>Visitor History</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8506FF" style={styles.loadingIndicator} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => <Text style={styles.emptyListText}>No visitor history found.</Text>}
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
  subHeader: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  historyTabButton: {
    alignItems: 'center',
    backgroundColor: '#8506FF',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 16,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  historyTabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingIndicator: {
    marginTop: 50,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginTop: 20,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyItem: {
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
    alignItems: 'center',
    backgroundColor: '#E7D8F6',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 15,
    width: 40,
  },
  avatarText: {
    color: '#8506FF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  accessCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusTimeContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusActive: {
    color: '#27AE60',
  },
  statusExpired: {
    color: '#E74C3C',
  },
  visitTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
    fontSize: 16,
  },
});
