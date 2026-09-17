import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React from 'react';
// Import custom components and utilities
import Icon from '../../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import {Picker} from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/apiClient';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import { useAuth } from '../../contexts/AuthContext';
import { getFcmToken } from '../../services/pushNotifications';



const AuthResident = () => {
  // Controls whether the user is in login or signup mode
  const [mode, setMode] = React.useState<'login' | 'signup'>('login');

  // Form field states
  const [email, setEmail] = React.useState(''); // User's email address
  const [password, setPassword] = React.useState(''); // User's password
  const [phone, setPhone] = React.useState(''); // User's phone number
  const [estates, setEstates] = React.useState([]); // User's estate name
  const [selectedEstate, setSelectedEstate] = React.useState('');
  // Tracked separately from `estates.length` so a failed request shows a retry
  // affordance instead of spinning forever.
  const [estatesLoading, setEstatesLoading] = React.useState(false);
  const [estatesError, setEstatesError] = React.useState(false);
  // iOS renders Picker as a full-height wheel, so it is presented in a sheet
  // rather than inline. See the estate field below.
  const [estateSheetOpen, setEstateSheetOpen] = React.useState(false);
  const [address, setAddress] = React.useState(''); // User's address
  const [fullName, setFullName] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false); // Controls password visibility
  const [rememberMe, setRememberMe] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [countryCode, setCountryCode] = React.useState<CountryCode>('NG');
  const [callingCode, setCallingCode] = React.useState('234');
  // Which field currently has the keyboard, so the input shell can show a
  // brand-coloured border instead of sitting flat on the lavender panel.
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  // Lets Return advance through the signup form instead of dismissing the
  // keyboard on every field.
  const emailRef = React.useRef<TextInput | null>(null);
  const passwordRef = React.useRef<TextInput | null>(null);
  const phoneRef = React.useRef<TextInput | null>(null);
  const addressRef = React.useRef<TextInput | null>(null);




  // UI state management
  const [loading, setLoading] = React.useState(false); // Controls loading spinner visibility
  const [_error, setError] = React.useState<string | null>(null); // Stores error messages

  // Navigation hook for screen navigation
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const clearSignupFields = React.useCallback(() => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setSelectedEstate('');
    setAddress('');
    setAgreedToTerms(false);
    setShowPassword(false);
  }, []);

  const fetchEstates = React.useCallback(async () => {
    setEstatesLoading(true);
    setEstatesError(false);
    try {
      const response = await api.get('/resident/available-estates');
      setEstates(response.data); // assuming an array of { id, name }
    } catch (error) {
      console.error('Error fetching estates:', error);
      setEstatesError(true);
    } finally {
      setEstatesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (mode === 'signup') {
      fetchEstates();
    }
  }, [mode, fetchEstates]);

  const selectedEstateName = React.useMemo(() => {
    const match = (estates as any[]).find((e) => String(e.id) === String(selectedEstate));
    return match?.name;
  }, [estates, selectedEstate]);

// Clear form fields when switching between login and signup modes
React.useEffect(() => {
  if (mode === 'signup') {
    // Keep email/password for signup form, clear them if switching from login
    setPassword('');
  } else {
    // Switching to login - never carry signup credentials into the login form
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setSelectedEstate('');
    setAddress('');
    setRememberMe(false);
    setAgreedToTerms(false);
    setShowPassword(false);
  }
  setError(null);
}, [mode]);

const handleAuth = async () => {
  if (!validateForm()) {return;}

  setLoading(true);
  setError(null);

  // Obtain FCM Token for push notifications
  let fcmToken = null;
  try {
    fcmToken = await getFcmToken();
  } catch (tokenErr) {
    console.warn('FCM token fetch failed:', tokenErr);
  }

  const endpoint = mode === 'login' ? '/resident-login' : '/resident/signup';
  const trimmedFullName = fullName.trim().replace(/\s+/g, ' ');
  const [parsedFirstName = '', ...parsedLastNameParts] = trimmedFullName.split(' ');
  const parsedLastName = parsedLastNameParts.join(' ');
  const payload = mode === 'login'
    ? { email, password, fcm_token: fcmToken }
    : {
        email,
        password,
        first_name: parsedFirstName,
        last_name: parsedLastName,
        phone_number: phone,
        estate_id: selectedEstate,
        house_address: address,
        agree_to_terms: agreedToTerms,
        country_code: `+${callingCode}`,
        fcm_token: fcmToken,
      };

  try {
    const res = await api.post(endpoint, payload);
    const data = res.data;

    if (!data) {
      setError('Empty response from server.');
      return;
    }

    const token = data.access_token || data.token;
    const refreshToken = data.refresh_token || null;

    const isApproved = data?.resident?.is_approved ?? false;
    const estateName = data?.resident?.estate_name || selectedEstate || 'your estate';

    // Handle signup awaiting approval - check for common success indicators
    if (mode === 'signup' && (
      data?.awaiting_admin_confirmation ||
      data?.message?.toLowerCase().includes('awaiting') ||
      data?.message?.toLowerCase().includes('admin') ||
      data?.message?.toLowerCase().includes('verification')
    )) {
      Alert.alert('Success', 'Account created successfully. Please check your email and wait for admin approval.');
      clearSignupFields();
      navigation.navigate('awaiting_approval', { estateName });
      return;
    }

    if (!token) {
      setError('Authentication failed. Please try again.');
      return;
    }


    // console.log("🔑 Resident token received:", token);

    // Handle different scenarios based on mode and approval status
    if (mode === 'signup') {
      Alert.alert('Success', 'Account created successfully. Awaiting admin approval.');
      clearSignupFields();
      navigation.navigate('awaiting_approval', { estateName });
    } else if (mode === 'login') {
      if (isApproved) {
         await login(token, refreshToken);
        Alert.alert('Success', 'Logged in successfully');
      } else {
        Alert.alert('Account Pending Approval', 'Your account is not yet approved.');
        navigation.navigate('awaiting_approval', { estateName });
      }
    }

  } catch (err: any) {
    const serverMessage = err?.response?.data?.detail || err?.response?.data?.message;
    const estateName = selectedEstate || 'your estate';

    // Handle validation errors during signup
    if (mode === 'signup') {
      // House already occupied
      if (serverMessage?.toLowerCase().includes('house already occupied')) {
        Alert.alert('Address Already Taken', 'This house address is occupied. Please use your house address.');
        return;
      }

      // Email already exists
      if (serverMessage?.toLowerCase().includes('email is already')) {
        Alert.alert('Email Already Registered', 'This email is already in use. Please use a different email or log in if you already have an account.');
        return;
      }

      // Phone already registered
      if (serverMessage?.toLowerCase().includes('phone number is already')) {
        Alert.alert('Phone Already Registered', 'This phone number is already in use. Please use a different phone number.');
        return;
      }

      // Other validation errors
      if (serverMessage && (serverMessage.includes('must') || serverMessage.includes('required') || serverMessage.includes('invalid'))) {
        Alert.alert('Validation Error', serverMessage);
        return;
      }
    }

    // Handle account not approved
    if (serverMessage?.toLowerCase().includes('not approved') ||
        serverMessage?.toLowerCase().includes('awaiting confirmation')) {
      Alert.alert('Account Not Approved', 'Redirecting you to awaiting approval screen...');
      navigation.navigate('awaiting_approval', { estateName });
      return;
    }

    if (err?.response?.status === 403) {
      Alert.alert(
        'Account Not Approved',
        'Redirecting you to awaiting approval screen...'
      );
      navigation.navigate('awaiting_approval', { estateName });
      return;
    }

    // Handle existing email during signup
    if (mode === 'signup' &&
        serverMessage?.toLowerCase().includes('already') &&
        serverMessage?.toLowerCase().includes('exist')) {
      Alert.alert('Account Exists', 'An account with this email already exists. Please log in instead.');
      setMode('login');
      setError('Account already exists. Try logging in.');
      return;
    }

    // Generic error handling
    const message = serverMessage || 'Something went wrong. Please try again.';
    setError(message);
    Alert.alert('Error', message);

  } finally {
    setLoading(false);
  }
};


  // ============= FORM VALIDATION =============
  /**
   * Validates the form based on current mode (login/signup)
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateForm = () => {
    if (mode === 'login') {
      // Login validation: check email and password
      if (!email || !password) {
        // setError('Please fill in all fields');
        Alert.alert('Please fill in all fields');
        return false;
      }
    } else {
      // Signup validation: check all required fields
      const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
      if (!email || !password || nameParts.length < 2 || !phone || !selectedEstate || !address) {
        // setError('Please fill in all fields');
        Alert.alert(nameParts.length < 2 ? 'Please enter your first and last name' : 'Please fill in all fields');
        return false;
      }
      // Password strength validation
      if (password.length < 6) {
        // setError('Password must be at least 6 characters');
        Alert.alert('Password must be at least 6 characters');
        return false;
      }

      // ✅ Require terms acceptance
      if (!agreedToTerms) {
        Alert.alert('You must agree to the Terms of Service and Privacy Policy');
        return false;
      }

    }
    return true;
  };




  // ============= RENDER UI =============
  return (
    // Main container with dynamic background color based on mode

        <KeyboardAvoidingView
         style={[styles.container, { backgroundColor: mode === 'login' ? '#FFFFFF' : '#F7EFFF' }]}
         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
       >
         {/*
           * NOTE: do not wrap this ScrollView in a TouchableWithoutFeedback.
           * Touchables clone their child and inject Pressability's responder
           * handlers onto it, so the touchable claims the responder on
           * touch-down and the ScrollView never receives the pan - the signup
           * form silently refuses to scroll. Tap-to-dismiss is already covered
           * by keyboardShouldPersistTaps + keyboardDismissMode below.
           */}
             <ScrollView
         contentContainerStyle={{
           flexGrow: 1,
           // Login leads with the hero illustration, which is meant to bleed
           // under the status bar. Signup opens straight onto the heading, so
           // without the inset the title renders behind the Dynamic Island.
           paddingTop: mode === 'login' ? 20 : insets.top + 20,
           // Clears the home indicator and leaves the switch-mode row fully
           // readable instead of flush against the bottom edge.
           paddingBottom: insets.bottom + 32,
         }}
         contentInsetAdjustmentBehavior="never"
         // "handled" lets taps on empty space fall through and dismiss the
         // keyboard while still letting buttons receive their press.
         keyboardShouldPersistTaps="handled"
         keyboardDismissMode="on-drag"
         // Login fits on one screen, but signup is taller than the viewport -
         // hiding the indicator there removes the only cue that the Sign up
         // button and the account-switch row are further down.
         showsVerticalScrollIndicator={mode === 'signup'}
       >
        {/* Show image only in login mode */}
        {mode === 'login' ? (
          <View style={styles.imgContainer}>
            <Image source={require('../../assets/slide1.png')} style={styles.image} />
          </View>
        ) : null}

        {/* Form container with dynamic height */}

       <View
        style={[
          styles.inputContainer,
          mode === 'login' ? styles.inputContainerLogin : styles.inputContainerSignup,
        ]}
       >
          {/* Header section with title and subtitle */}
          <View style={styles.headerRow}>
            <Icon name="arrowRFilled" size={20} style={styles.headerCaret} />
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>
                {mode === 'login' ? 'Log in' : 'Create an account'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {mode === 'login' ? 'Enter your email to log in' : 'Fill in your details to sign up'}
              </Text>
            </View>
          </View>

          {/* Error message display */}
          {/* {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )} */}

          {/* Conditional rendering based on mode */}
          {mode === 'login' ? (

       // ===== LOGIN FORM =====
              <View style={styles.loginForm}>
                <View
                  style={[
                    styles.loginInputShell,
                    focusedField === 'email' && styles.inputShellFocused,
                  ]}
                >
                  <View style={styles.loginEnvelopeIcon}>
                    <View
                      style={[
                        styles.loginEnvelopeBody,
                        focusedField === 'email' && styles.iconStrokeFocused,
                      ]}
                    />
                    <View
                      style={[
                        styles.loginEnvelopeFlapLeft,
                        focusedField === 'email' && styles.iconFillFocused,
                      ]}
                    />
                    <View
                      style={[
                        styles.loginEnvelopeFlapRight,
                        focusedField === 'email' && styles.iconFillFocused,
                      ]}
                    />
                  </View>
                  <TextInput
                    placeholder="Email address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholderTextColor="#9A9AA0"
                    style={styles.loginTextInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>

                <View
                  style={[
                    styles.loginInputShell,
                    focusedField === 'password' && styles.inputShellFocused,
                  ]}
                >
                  <View style={styles.loginLockIcon}>
                    <View
                      style={[
                        styles.loginLockShackle,
                        focusedField === 'password' && styles.iconStrokeFocused,
                      ]}
                    />
                    <View
                      style={[
                        styles.loginLockBody,
                        focusedField === 'password' && styles.iconFillFocused,
                      ]}
                    />
                  </View>
                  <TextInput
                    ref={passwordRef}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9A9AA0"
                    keyboardType="default"
                    autoCorrect={false}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    style={styles.loginTextInput}
                    returnKeyType="go"
                    onSubmitEditing={handleAuth}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.loginPasswordToggle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon
                      name={showPassword ? 'eyeO' : 'eyeC'}
                      size={22}
                      style={styles.loginEyeIcon}
                    />
                  </TouchableOpacity>
                </View>
              </View>

          ) : (
            // ===== SIGNUP FORM =====
            <View style={styles.signupForm}>
              {/* Full name input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full name</Text>
                <View
                  style={[
                    styles.inputDetails,
                    focusedField === 'fullName' && styles.inputShellFocused,
                  ]}
                >
                  <TextInput
                    placeholder="First name Last name"
                    value={fullName}
                    onChangeText={setFullName}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                    placeholderTextColor="#9A9AA0"
                    style={styles.inputBox}
                    keyboardType="default"
                    autoComplete="name"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Email input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email address</Text>
                <View
                  style={[
                    styles.inputDetails,
                    focusedField === 'signupEmail' && styles.inputShellFocused,
                  ]}
                >
                  <TextInput
                    ref={emailRef}
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('signupEmail')}
                    onBlur={() => setFocusedField(null)}
                    placeholderTextColor="#9A9AA0"
                    style={styles.inputBox}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Password input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View
                  style={[
                    styles.inputDetails,
                    styles.signupPasswordField,
                    focusedField === 'signupPassword' && styles.inputShellFocused,
                  ]}
                >
                  <TextInput
                    ref={passwordRef}
                    placeholder="At least 8 characters"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('signupPassword')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9A9AA0"
                    style={styles.inputBox}
                    keyboardType="default"
                    autoCorrect={false}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.signupPasswordToggle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon
                      name={showPassword ? 'eyeO' : 'eyeC'}
                      size={22}
                      style={styles.loginEyeIcon}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Phone input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone number</Text>
                <View
                  style={[
                    styles.inputDetails,
                    focusedField === 'phone' && styles.inputShellFocused,
                  ]}
                >
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryPickerWrap}>
                      <CountryPicker
                        countryCode={countryCode}
                        withCallingCode
                        withFlag
                        withFilter
                        withEmoji
                        onSelect={(country: Country) => {
                          setCountryCode(country.cca2);
                          setCallingCode(country.callingCode[0]);
                        }}
                        containerButtonStyle={styles.countryPickerButton}
                      />
                      <Icon name="chevron_down" size={12} style={styles.countryPickerChevron} />
                    </View>
                    <Text style={styles.countryCode}>+{callingCode}</Text>
                    <View style={styles.phoneDivider} />
                    <TextInput
                      ref={phoneRef}
                      placeholder="800 000 0000"
                      value={phone}
                      onChangeText={setPhone}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      placeholderTextColor="#9A9AA0"
                      style={styles.phoneInput}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                  </View>
                </View>
              </View>

              {/* Estate input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Estate</Text>
                {estatesLoading ? (
                  <View style={[styles.inputDetails, styles.estateStatusShell]}>
                    <ActivityIndicator size="small" color="#8506FF" />
                    <Text style={styles.estateStatusText}>Loading estates…</Text>
                  </View>
                ) : estatesError || estates.length === 0 ? (
                  // Previously this branch rendered a spinner forever, so a failed
                  // request looked identical to one still in flight.
                  <TouchableOpacity
                    style={[styles.inputDetails, styles.estateStatusShell]}
                    onPress={fetchEstates}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.estateStatusText}>
                      {estatesError ? "Couldn't load estates." : 'No estates available.'}
                    </Text>
                    <Text style={styles.estateRetryText}>Retry</Text>
                  </TouchableOpacity>
                ) : Platform.OS === 'ios' ? (
                  // On iOS, Picker is a ~216pt UIPickerView wheel, not a compact
                  // dropdown. Rendering it inline inside a 56pt shell clipped it
                  // and let its rows spill over the next field, so iOS gets a
                  // tappable summary row that opens the wheel in a sheet.
                  <>
                    <TouchableOpacity
                      style={styles.inputDetails}
                      onPress={() => {
                        Keyboard.dismiss();
                        setEstateSheetOpen(true);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.estateValueText,
                          !selectedEstate && styles.estateValuePlaceholder,
                        ]}
                      >
                        {selectedEstateName ?? 'Select Estate'}
                      </Text>
                      <Icon name="chevron_down" size={14} style={styles.estateChevron} />
                    </TouchableOpacity>

                    <Modal
                      visible={estateSheetOpen}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setEstateSheetOpen(false)}
                    >
                      <TouchableWithoutFeedback onPress={() => setEstateSheetOpen(false)}>
                        <View style={styles.estateSheetBackdrop} />
                      </TouchableWithoutFeedback>
                      <View style={[styles.estateSheet, { paddingBottom: insets.bottom }]}>
                        <View style={styles.estateSheetHeader}>
                          <Text style={styles.estateSheetTitle}>Select Estate</Text>
                          <TouchableOpacity
                            onPress={() => setEstateSheetOpen(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Text style={styles.estateSheetDone}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <Picker
                          selectedValue={selectedEstate}
                          onValueChange={(itemValue) => setSelectedEstate(itemValue)}
                          itemStyle={styles.estatePickerItem}
                        >
                          <Picker.Item label="Select Estate" value="" />
                          {estates.map((estate: any) => (
                            <Picker.Item key={estate.id} label={estate.name} value={estate.id} />
                          ))}
                        </Picker>
                      </View>
                    </Modal>
                  </>
                ) : (
                  <View style={styles.inputDetails}>
                    <Picker
                      selectedValue={selectedEstate}
                      onValueChange={(itemValue) => setSelectedEstate(itemValue)}
                      itemStyle={styles.estatePickerItem}
                      style={[
                        styles.estatePicker,
                        !selectedEstate && styles.estatePickerPlaceholder,
                      ]}
                    >
                      <Picker.Item label="Select Estate" value="" />
                      {estates.map((estate: any) => (
                        <Picker.Item key={estate.id} label={estate.name} value={estate.id} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              {/* Address input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>House address</Text>
                <View
                  style={[
                    styles.inputDetails,
                    focusedField === 'address' && styles.inputShellFocused,
                  ]}
                >
                  <TextInput
                    ref={addressRef}
                    placeholder="Street name | House unit | Block"
                    value={address}
                    onChangeText={setAddress}
                    onFocus={() => setFocusedField('address')}
                    onBlur={() => setFocusedField(null)}
                    placeholderTextColor="#9A9AA0"
                    style={styles.inputBox}
                    // Was keyboardType="email-address", which gave residents an
                    // "@" key and no capitalisation for a street address.
                    keyboardType="default"
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Conditional rendering for forgot password or terms */}
          {mode === 'login' ? (
            // Forgot password link
            <View style={styles.loginOptionsRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                activeOpacity={0.75}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.rememberCheck, rememberMe && styles.rememberCheckActive]}>
                  {rememberMe ? <Text style={styles.rememberCheckMark}>✓</Text> : null}
                </View>
                <Text style={styles.rememberLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => navigation.navigate('forget_password')}
              >
                <Text style={styles.forgotText}>Forgot Password</Text>
              </TouchableOpacity>
            </View>
          ) : (


            <View style={styles.termsRow}>
              <TouchableOpacity
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                style={[styles.termsCheck, agreedToTerms && styles.termsCheckActive]}
                activeOpacity={0.75}
              >
                {agreedToTerms ? <Text style={styles.termsCheckMark}>✓</Text> : null}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I have read and agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('legal_document', { document: 'terms' })}
                >
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('legal_document', { document: 'privacy' })}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>

          )}


          <TouchableOpacity
            style={[
              mode === 'login' ? styles.loginButton : styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleAuth}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={mode === 'login' ? styles.loginButtonText : styles.buttonText}>
                {mode === 'login' ? 'Login' : 'Sign up'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Mode switch button */}
          {mode === 'login' ? (
            <View style={[styles.switchModeButton, styles.loginSwitchModeButton]}>
              <Text style={styles.loginSwitchText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setMode('signup');
                  setError(null);
                }}
              >
                <Text style={styles.loginSwitchLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.switchModeButton, styles.loginSwitchModeButton]}>
              <Text style={styles.loginSwitchText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                <Text style={styles.loginSwitchLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </ScrollView>
              </KeyboardAvoidingView>

  );
};


export default AuthResident;


// ============= STYLES =============
const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    width: '100%',
    height: '100%',

  },
  // Image container styles
  imgContainer: {
    //  flex: 0.45,
    width: '100%',
    height: '45%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'white',
    position: 'relative',
  },
  // Image styles
  image: {
     width: '100%',
        height: '80%',
        resizeMode: 'contain',
        position: 'absolute',
        // bottom: -20
  },
  // Form container styles
  inputContainer: {
    backgroundColor: '#F7EFFF',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
  },
  // Login is a fixed split: hero illustration on top, form filling the rest.
  inputContainerLogin: {
    flex: 0.55,
    height: '55%',
  },
  // Signup must NOT be height-constrained. `height: '100%'` pinned this box to
  // exactly one viewport, so the Sign up button and the "Already have an
  // account?" row below it were clipped rather than scrolled into view.
  // flexGrow lets it fill the screen when short and grow past it when not.
  inputContainerSignup: {
    flexGrow: 1,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 8,
  },
  headerCaret: {
    marginTop: 10,
  },
  headerTextGroup: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 30,
    textAlign: 'left',
    fontWeight: '700',
    color: '#12002B',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: 'left',
    fontWeight: '400',
    color: '#6E6E72',
    marginBottom: 10,
  },
  loginForm: {
    width: '100%',
    gap: 16,
  },
  signupForm: {
    width: '100%',
    gap: 14,
  },
  // Label + input pair. Labels keep each signup field identifiable once the
  // placeholder is replaced by the resident's own text.
  fieldGroup: {
    width: '100%',
  },
  fieldLabel: {
    color: '#5B4470',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  estateStatusShell: {
    gap: 10,
    justifyContent: 'flex-start',
  },
  estateStatusText: {
    color: '#6E6E72',
    fontSize: 15,
  },
  estateRetryText: {
    color: '#8506FF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  loginInputShell: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EDE2FA',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: '#4C0096',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  // Applied on top of the shell while that field holds the keyboard.
  inputShellFocused: {
    borderColor: '#8506FF',
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  iconStrokeFocused: {
    borderColor: '#8506FF',
  },
  iconFillFocused: {
    backgroundColor: '#8506FF',
  },
  loginEnvelopeIcon: {
    height: 16,
    marginRight: 16,
    position: 'relative',
    width: 20,
  },
  loginEnvelopeBody: {
    borderColor: '#5B5B5F',
    borderRadius: 4,
    borderWidth: 2,
    height: 16,
    width: 20,
  },
  loginEnvelopeFlapLeft: {
    backgroundColor: '#5B5B5F',
    height: 2,
    left: 2,
    position: 'absolute',
    top: 5,
    transform: [{ rotate: '32deg' }],
    width: 10,
  },
  loginEnvelopeFlapRight: {
    backgroundColor: '#5B5B5F',
    height: 2,
    position: 'absolute',
    right: 2,
    top: 5,
    transform: [{ rotate: '-32deg' }],
    width: 10,
  },
  loginLockIcon: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    marginRight: 16,
    width: 20,
  },
  loginLockShackle: {
    borderColor: '#5B5B5F',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 2,
    borderBottomWidth: 0,
    height: 9,
    marginBottom: -2,
    width: 12,
  },
  loginLockBody: {
    backgroundColor: '#5B5B5F',
    borderRadius: 3,
    height: 12,
    width: 16,
  },
  loginTextInput: {
    color: '#1F2933',
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  loginPasswordToggle: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    marginLeft: 8,
    width: 42,
  },
  loginEyeIcon: {
    tintColor: '#77777A',
  },
  loginOptionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    width: '100%',
  },
  rememberRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rememberCheck: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C8CCD2',
    borderRadius: 4,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    marginRight: 8,
    width: 16,
  },
  rememberCheckActive: {
    backgroundColor: '#8506FF',
    borderColor: '#8506FF',
  },
  rememberCheckMark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  rememberLabel: {
    color: '#5B5B63',
    fontSize: 13,
  },
  // Reads as a link rather than as a second static label next to "Remember me".
  forgotText: {
    color: '#8506FF',
    fontSize: 13,
    fontWeight: '600',
  },
  termsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
  },
  termsCheck: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#8506FF',
    borderRadius: 4,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
    width: 20,
  },
  termsCheckActive: {
    backgroundColor: '#8506FF',
  },
  termsCheckMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  termsText: {
    color: '#000000',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  termsLink: {
    color: '#8506FF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // Input field container styles
  inputDetails: {
    alignItems: 'center',
    backgroundColor: 'white',
    width: '100%',
    minHeight: 56,
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EDE2FA',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 0,
    // Spacing between fields now comes from signupForm's gap, so the shell
    // itself no longer carries a vertical margin.
    shadowColor: '#4C0096',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    //  ...Platform.select({
    //   ios: {
    //     paddingVertical: 5,
    //   },
    //  })
    // position: 'relative',
  },
  // Input field styles
  inputBox: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 0,
    paddingRight: 10,
    color: '#000',
    borderWidth: 0,
    borderColor: '#CCCCCC',
    marginTop: 0,

//     fontSize: 18,
//     ...Platform.select({
//       ios: {
//         paddingVertical: 5,
//       },

// })
},
  signupPasswordField: {
    paddingRight: 6,
  },
  signupPasswordToggle: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    marginLeft: 8,
    width: 42,
  },

 showButton: {
    position: 'absolute',
    right: 10,
    padding: 5,
  },

   showText: {
    color: '#6200ee',
    fontSize: 13,
  },


 inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'transperant',
    borderWidth: 0,
    borderRadius: 6,
    borderColor: 'transperant',
    paddingHorizontal: 10,
  },
  countryCode: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
},
  phoneInputRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingTop: 0,
  },
  countryPickerWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 42,
  },
  countryPickerButton: {
    marginRight: 2,
  },
  countryPickerChevron: {
    tintColor: '#555',
    marginLeft: -2,
  },
  phoneDivider: {
    backgroundColor: '#D6D6D6',
    height: 22,
    marginHorizontal: 8,
    width: 1,
  },
  phoneInput: {
    color: '#000',
    flex: 1,
    fontSize: 15,
    minHeight: 52,
    paddingVertical: 0,
  },
  estatePicker: {
    color: '#000000',
    flex: 1,
    fontSize: 13,
    height: 52,
    marginTop: 0,
  },
  estatePickerItem: {
    color: '#000000',
    fontSize: 13,
  },
  estatePickerPlaceholder: {
    color: '#6E6E72',
  },
  estateValueText: {
    color: '#1F2933',
    flex: 1,
    fontSize: 15,
  },
  estateValuePlaceholder: {
    color: '#9A9AA0',
  },
  estateChevron: {
    marginLeft: 8,
    tintColor: '#77777A',
  },
  estateSheetBackdrop: {
    backgroundColor: 'rgba(18, 0, 43, 0.35)',
    flex: 1,
  },
  estateSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  estateSheetHeader: {
    alignItems: 'center',
    borderBottomColor: '#EDE2FA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  estateSheetTitle: {
    color: '#12002B',
    fontSize: 16,
    fontWeight: '700',
  },
  estateSheetDone: {
    color: '#8506FF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Label styles
  label: {
    color: '#8506FF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 0,
  },
  // Error container styles
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    width: '100%',
  },
  // Error text styles
  errorText: {
    color: '#FF0000',
    fontSize: 14,
  },
  // Disabled button styles
  buttonDisabled: {
    opacity: 0.7,
  },
  // Button styles
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 25,
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: '#8506FF',
    marginTop: 20,
    zIndex: 10,
    shadowColor: '#8506FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: '#8506FF',
    borderRadius: 22,
    justifyContent: 'center',
    marginTop: 28,
    minHeight: 56,
    width: '100%',
    shadowColor: '#8506FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Button text styles
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  // Mode switch button styles
  switchModeButton: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 8,
  },
  loginSwitchModeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  loginSwitchText: {
    color: '#6E6E72',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  loginSwitchLink: {
    color: '#8506FF',
    fontWeight: '700',
  },
  // Mode switch text styles
  switchModeText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    color: '#000000',
  },
});
