// App.tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from './Icon';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useNavigation } from '@react-navigation/native';


// Feature item type
interface CardItem {
  id: string;
  title: string;
  description: string;
  iconName: any;
  backgroundColor: string;
  borderColor?: string;
  onPress: () => void;
}

// Component for each feature card
const Cards: React.FC<CardItem> = ({
  title,
  description,
  iconName,
  backgroundColor,
  borderColor,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor, borderColor: borderColor, borderWidth: 1 }]} // Apply background and border color
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View >
        <Icon
          name={(iconName)}
          size={30}
        />
      </View>
    <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};

const FeatureCards: React.FC = () => {

     const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Features data
  const features: CardItem[] = [
    {
      id: '1',
      title: 'Dashboard',
      description: 'Access data of your energy quota & spending',
      iconName: 'dashboard',
      borderColor: '#DFBEFF',
      backgroundColor: '#F7EFFF',

      onPress: () => Alert.alert('Coming Soon', 'This feature is under development'),
    },
    {
      id: '2',
      title: 'Panic',
      description: 'Get quick help incase of an emergency',
      iconName: 'panic',
      borderColor: '#FFBEC5',
      backgroundColor: '#fff0f0',

      onPress: () => Alert.alert('Coming Soon', 'This feature is under development'),
    },
    {
      id: '3',
      title: 'Book Visitors',
      description: 'Make it super easy for people to visit you',
      iconName: 'visitor',
      borderColor: '#9CFFDB',
      backgroundColor: '#f0fff8',

      // onPress: () => navigation.navigate('booking_visitor'),
      onPress: () => navigation.navigate('ResidentApp', {
        screen: 'book_visitor',
        params: { name: '', phone: '' },
      }),
    },
    {
      id: '4',
      title: 'Electricity',
      description: 'Buy & pay for electricity seamlessly',
      iconName: 'flash',
      backgroundColor: '#fffbf0',
      borderColor: '#FFD358',
      onPress: () => Alert.alert('Coming Soon', 'This feature is under development'),
    },
    {
      id: '5',
      title: 'Bills & Utilities',
      description: 'Pay for gas, water & other amenities with ease',
      iconName: 'util',
      borderColor: '#9CE4FF',
      backgroundColor: '#f0faff',

      onPress: () => Alert.alert('Coming Soon', 'This feature is under development'),
    },
    {
      id: '6',
      title: 'Report Issues',
      description: 'Report issues and request for maintenance',
      iconName: 'report',
      borderColor: '#F4BFFF',
      backgroundColor: '#FDF0FF',

      onPress: () => navigation.navigate('ResidentApp', {
        screen: 'report_issues',
      }),
    },
  ];

  return (
    <View style={styles.container}>

        <View style={styles.gridContainer}>
          {features.map((feature, index) => (
            <View
              key={feature.id}
              style={[
                styles.cardWrapper,
                index >= features.length - 2 && styles.lastRowCardWrapper,
              ]}
            >
              <Cards {...feature} />
            </View>
          ))}
        </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
  },

  gridContainer: {
    width: '100%',
    paddingTop: 16,
    // paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',

  },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  lastRowCardWrapper: {
    marginBottom: 0,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,

  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#000',
  },
  cardDescription: {
    fontSize: 13,
    color: '#1D0039',
    lineHeight: 18,
  },
});

export default FeatureCards;
