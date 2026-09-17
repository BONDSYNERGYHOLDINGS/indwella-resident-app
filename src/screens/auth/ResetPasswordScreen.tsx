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
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../lib/apiClient';
import Icon from '../../components/Icon';
import { RootStackParamList } from '../../navigation/types';

type ResetRouteProp = RouteProp<RootStackParamList, 'reset_password'>;
type ResetNavigationProp = NativeStackNavigationProp<RootStackParamList, 'reset_password'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<ResetNavigationProp>();
  const route = useRoute<ResetRouteProp>();
  const { resetToken } = route.params;
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const getErrorMessage = (err: any) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg || item).join('\n');
    }
    return (
      err?.response?.data?.message ||
      detail ||
      err?.message ||
      'Something went wrong, please try again'
    );
  };

  const validatePassword = () => {
    if (!password || !confirmPassword) {
      Alert.alert('Password Required', 'Please enter and confirm your new password.');
      return false;
    }

    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return false;
    }

    if (password.length > 128) {
      Alert.alert('Password Too Long', 'Password must be 128 characters or fewer.');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please confirm the same password.');
      return false;
    }

    return true;
  };

  const goToLogin = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'resident_auth' }],
      }),
    );
  };

  const handleConfirm = async () => {
    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      await api.post(
        '/reset-password',
        {
          new_password: password,
          confirm_password: confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${resetToken}`,
          },
        },
      );

      Alert.alert('Password Reset', 'Your password has been reset successfully.', [
        { text: 'OK', onPress: goToLogin },
      ]);
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
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrowLLine" size={22} />
          </TouchableOpacity>

          <View style={styles.heading}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Set a strong password to keep your account secure.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputShell}>
              <TextInput
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#8A8A8A"
                style={styles.input}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Icon
                  name={showPassword ? 'eyeO' : 'eyeC'}
                  size={20}
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputShell}>
              <TextInput
                placeholder="Enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#8A8A8A"
                style={styles.input}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Icon
                  name={showConfirmPassword ? 'eyeO' : 'eyeC'}
                  size={20}
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Confirm</Text>
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
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heading: {
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 30,
  },
  title: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6E6E72',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14,
  },
  inputShell: {
    alignItems: 'center',
    borderColor: '#D8D8D8',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingLeft: 14,
    paddingRight: 8,
    width: '100%',
  },
  input: {
    color: '#111111',
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  eyeIcon: {
    tintColor: '#8A8A8A',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#8506FF',
    borderRadius: 8,
    bottom: 0,
    justifyContent: 'center',
    left: 18,
    minHeight: 56,
    position: 'absolute',
    right: 18,
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
