import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import Icon from '../../components/Icon';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import { api } from '../../lib/apiClient'; // your axios instance
import { useNavigation } from '@react-navigation/native';


type NotificationAttachment = {
  name?: string;
  url?: string;
  content_type?: string;
  size?: number;
};

type Notification = {
  id: string;
  title: string;
  sender: string;
  message: string;
  time: string;
  type?: string;
  amount?: string;
  is_read?: boolean;
  admin_id?: number | null;
  attachment?: NotificationAttachment | null;
};

const getNotificationSender = (type?: string) => {
  switch (type) {
    case 'broadcast':
      return 'Administrator';
    case 'service_payment':
      return 'Payments';
    case 'wallet_funding':
      return 'Wallet';
    case 'service_charge':
    case 'service_charge_update':
      return 'Estate Services';
    case 'signup_response':
      return 'Administartor';
    case 'password_change':
    case 'password_reset':
      return 'Account Security';
    default:
      return 'Indwella';
  }
};

const NotificationScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [expandableIds, setExpandableIds] = useState<string[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/resident?limit=100'); // your backend endpoint
      const raw = Array.isArray(res.data) ? res.data : [];

      // Sort raw data by created_at in descending order (most recent first)
      raw.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Map raw data if necessary
      const formatted = raw.map((item: any) => ({
        id: item.id.toString(),
        title: item.title || 'Notification',
        sender: item.sender || getNotificationSender(item.type),
        message: item.message || '',
        time: formatDateTime(item.created_at),
        type: item.type,
        amount: item.amount,
        is_read: item.is_read,
        admin_id: item.admin_id,
        attachment: item.data?.attachment || null,
      }));

      setNotifications(formatted.filter((item: Notification) => !item.is_read && !item.admin_id));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
    return `${time}, ${day}`;
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const openAttachment = async (attachment: NotificationAttachment) => {
    if (!attachment.url) {
      return;
    }

    const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
    const attachmentUrl = attachment.url.startsWith('http')
      ? attachment.url
      : `${baseURL}${attachment.url}`;

    try {
      const supported = await Linking.canOpenURL(attachmentUrl);
      if (!supported) {
        Alert.alert('Attachment', 'This attachment cannot be opened on this device.');
        return;
      }
      await Linking.openURL(attachmentUrl);
    } catch (error) {
      Alert.alert('Attachment', 'Could not open this attachment.');
    }
  };

  const formatCurrency = (amount?: string | number) => {
    if (amount === undefined || amount === null || amount === '') return 'N/A';
    // accept numbers or numeric strings
    const raw = typeof amount === 'number' ? String(amount) : amount;
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return String(amount);
    const hasFraction = Math.abs(num % 1) > 0;
    const formatted = hasFraction
      ? num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '₦' + formatted;
  };

  const formatMessageAmounts = (message?: string) => {
    if (!message) return '';
    // Normalize currency prefixes so we only render one ₦ symbol.
    message = message.replace(/(?:₦|NGN|N)\s*(?:₦\s*)?(?=\d)/gi, '');
    const numberRegex = /((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:\.\d+)?)/g;
    return message.replace(numberRegex, (_match, numPart) => formatCurrency(numPart));
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await api.post('/notifications/resident/mark-read', {
        notification_id: Number(notificationId),
        is_read: true,
      });
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      setExpandedIds((prev) => prev.filter((id) => id !== notificationId));
      setExpandableIds((prev) => prev.filter((id) => id !== notificationId));
      DeviceEventEmitter.emit('notificationCountChanged', { unreadDelta: -1 });
    } catch (error) {
      Alert.alert('Notification', 'Could not dismiss this notification.');
    }
  };

  const toggleExpanded = (notificationId: string) => {
    setExpandedIds((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId],
    );
  };

  const setMessageExpandable = (notificationId: string, isExpandable: boolean) => {
    setExpandableIds((prev) => {
      const exists = prev.includes(notificationId);
      if (isExpandable === exists) {
        return prev;
      }

      return isExpandable
        ? [...prev, notificationId]
        : prev.filter((id) => id !== notificationId);
    });
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const displayedMessage = formatMessageAmounts(item.message);
    const isBroadcast = item.type === 'broadcast';
    const isExpanded = expandedIds.includes(item.id);
    const canExpand = isBroadcast || expandableIds.includes(item.id);

    return (
      <View style={[styles.card, isBroadcast && styles.broadcastCard]}>
        {isBroadcast && <View style={styles.broadcastAccent} />}

        <TouchableOpacity activeOpacity={0.85} onPress={() => toggleExpanded(item.id)}>
          <View style={styles.metaRow}>
            <Text style={styles.sender}>{item.sender}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>

          <View style={styles.titleRow}>
            {isBroadcast && (
              <View style={styles.broadcastIconWrap}>
                <Icon name="messageFilled" size={14} />
              </View>
            )}
            <Text style={styles.title}>{item.title}</Text>
          </View>

          {isBroadcast ? (
            isExpanded ? (
              <Text style={styles.message}>{displayedMessage}</Text>
            ) : null
          ) : (
            <View style={styles.messageWrap}>
              <Text
                style={[styles.message, styles.measureMessage]}
                onTextLayout={(event) => setMessageExpandable(item.id, event.nativeEvent.lines.length > 3)}
              >
                {displayedMessage}
              </Text>
              <Text style={styles.message} numberOfLines={isExpanded ? undefined : 3}>
                {displayedMessage}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {canExpand ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => toggleExpanded(item.id)}
            style={styles.expandButton}>
            <Text style={styles.expandText}>
              {isExpanded ? 'Show Less' : 'See More'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {item.amount && (
          <Text style={styles.detail}>
            Amount: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(item.amount)}</Text>
          </Text>
        )}

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => dismissNotification(item.id)}
          style={styles.dismissButton}>
          <Icon name="close" size={12} />
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>

        {item.attachment?.url ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.attachmentButton}
            onPress={() => openAttachment(item.attachment as NotificationAttachment)}>
            <Icon name="messageFilled" size={18} />
            <Text style={styles.attachmentText} numberOfLines={1}>
              {item.attachment.name || 'Open attachment'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <AppSafeAreaView style={styles.container}>
      <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={styles.headerBack}>
        <Icon name="arrowLLine" size={20} />
      </TouchableOpacity>

      <Text style={styles.header}>Notifications</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#8506FF" style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </AppSafeAreaView>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBack: {
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 10,
    color: '#000',
  },
  loader: {
    marginTop: 30,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#F8F8F8',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  broadcastCard: {
    borderColor: '#E8D7FF',
    borderWidth: 1,
    paddingLeft: 15,
  },
  broadcastAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#8506FF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sender: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    marginBottom: 6,
    flexShrink: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  broadcastIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E7FF',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  message: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messageWrap: {
    position: 'relative',
  },
  measureMessage: {
    opacity: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: -1,
  },
  expandButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
  expandText: {
    color: '#8506FF',
    fontSize: 13,
    fontWeight: '700',
  },
  dismissButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dismissText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentButton: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3D9FF',
    backgroundColor: '#F7F2FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentText: {
    color: '#5B0CE7',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  detail: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
});
