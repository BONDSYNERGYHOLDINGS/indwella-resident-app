import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FeatureCards from '../../components/FeatureCards';
import TransactionList from '../../components/TransactionList';
import Recharge from '../../components/Recharge';

type TabName = 'features' | 'payments' | 'recharge';

interface FeatureNavProps {
  refreshKey?: number;
}

const FeatureNav: React.FC<FeatureNavProps> = ({ refreshKey = 0 }) => {
  const [activeTab, setActiveTab] = useState<TabName>('features');

  const handleTabPress = (tabName: TabName) => {
    setActiveTab(tabName);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'payments':
        return <TransactionList refreshKey={refreshKey} />;
      case 'recharge':
        return <Recharge />;
      case 'features':
      default:
        return <FeatureCards />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'features' && styles.activeTab]}
          onPress={() => handleTabPress('features')}
        >
          <Text style={[styles.tabText, activeTab === 'features' && styles.activeTabText]}>
            Features
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
          onPress={() => handleTabPress('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>
            Payments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'recharge' && styles.activeTab]}
          onPress={() => handleTabPress('recharge')}
        >
          <Text style={[styles.tabText, activeTab === 'recharge' && styles.activeTabText]}>
            Recharge
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activeContent}>{renderActiveTab()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6D28D9',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#5B35D5',
    fontWeight: '700',
  },
  activeContent: {
    width: '100%',
    overflow: 'hidden',
  },
});

export default FeatureNav;
