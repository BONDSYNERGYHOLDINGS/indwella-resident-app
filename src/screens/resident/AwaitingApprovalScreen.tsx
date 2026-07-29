import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';

type Props = {
  route: any; // optionally extract estate name from route.params
};

const AwaitingApprovalScreen = ({ route }: Props) => {
  const navigation = useNavigation();
  const estateName = route?.params?.estateName || 'your estate';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon name="arrowLLine" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Awaiting Approval</Text>
          <Text style={styles.subtitle}>Request sent</Text>
        </View>
      </View>

      {/* Image or Icon */}
      {/* <Image
        source={require('../assets/pending.png')} 
        style={styles.image}
        resizeMode="contain"
      /> */}

      {/* Message */}
      <Text style={styles.message}>
        Awaiting approval from <Text style={styles.estate}>{estateName} admin</Text>
      </Text>
    </View>
  );
};

export default AwaitingApprovalScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B0066',
  },
  subtitle: {
    fontSize: 13,
    color: '#777777',
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 30,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    color: '#3B0066',
    fontWeight: '500',
  },
  estate: {
    fontWeight: 'bold',
    color: '#8506FF',
  },
});
