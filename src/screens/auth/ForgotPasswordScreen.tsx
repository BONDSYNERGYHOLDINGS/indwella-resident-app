import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../lib/apiClient';
import Icon from '../../components/Icon';
import { RootStackParamList } from '../../navigation/types';

type ForgetPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'forget_password'>;
type ForgetPasswordRouteProp = RouteProp<RootStackParamList, 'forget_password'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgetPasswordNavigationProp>();
  const route = useRoute<ForgetPasswordRouteProp>();
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const role = route.params?.role ?? 'resident';

  const getErrorMessage = (err: any) =>
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    err?.message ||
    'Something went wrong, please try again';

  const handleContinue = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/forgot-password', { email: trimmedEmail });
      setEmail(trimmedEmail);
      navigation.navigate('verify_otp', {
        role,
        email: trimmedEmail,
      });
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrowLLine" size={22} />
            </TouchableOpacity>
            <Text style={styles.title}>Forget Password</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.subtitle}>
            Enter your email address to send the OTP code
          </Text>

          <View style={styles.inputShell}>
            <TextInput
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#6E6E72"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: '#111111',
    flex: 1,
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    height: 44,
    width: 44,
  },
  subtitle: {
    alignSelf: 'center',
    color: '#6E6E72',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 280,
    textAlign: 'center',
  },
  inputShell: {
    alignItems: 'center',
    borderColor: '#D8D8D8',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 14,
    width: '100%',
  },
  input: {
    color: '#111111',
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#8506FF',
    borderRadius: 22,
    justifyContent: 'center',
    marginTop: 28,
    minHeight: 56,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
