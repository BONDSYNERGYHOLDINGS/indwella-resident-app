import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import { RootStackParamList } from '../../navigation/types';

type LegalDocumentRouteProp = RouteProp<RootStackParamList, 'legal_document'>;
type LegalDocumentNavigationProp = NativeStackNavigationProp<RootStackParamList, 'legal_document'>;

const termsSections = [
  {
    title: 'Using Indwella',
    body: 'Indwella helps residents interact with their estate, including account registration, visitor booking, reports, notifications, and estate-related payments. You agree to provide accurate information and to use the app only for lawful estate purposes.',
  },
  {
    title: 'Resident Accounts',
    body: 'Your account may need approval by your estate administrator before full access is granted. Keep your login details private and tell your estate administrator if you believe your account has been used without permission.',
  },
  {
    title: 'Visitor Access',
    body: 'When you book a visitor, you are responsible for entering correct visitor details and sharing access information only with the intended visitor. Estate security may verify, approve, deny, or record visit activity according to estate rules.',
  },
  {
    title: 'Reports and Payments',
    body: 'Issue reports should be truthful and related to your estate or residence. Wallet or service-charge activity must be used only for your account and may be reviewed by the estate administrator for reconciliation.',
  },
  {
    title: 'Changes and Availability',
    body: 'The app may be updated, paused, or changed to improve service, fix issues, or follow estate requirements. Continued use means you accept the current version of these terms.',
  },
];

const privacySections = [
  {
    title: 'Information We Collect',
    body: 'Indwella may collect your name, email address, phone number, estate, house address, account status, visitor bookings, issue reports, notification activity, wallet or charge records, and device notification token.',
  },
  {
    title: 'How We Use It',
    body: 'Your information is used to create and verify resident accounts, manage estate access, send notifications, process reports, support payments, improve the service, and help estate administrators operate the community.',
  },
  {
    title: 'Who Can See It',
    body: 'Relevant estate administrators and authorized security users may see the information needed for their duties. For example, security may see visitor access details, while administrators may see resident approval, reports, and charge information.',
  },
  {
    title: 'Keeping Data Safe',
    body: 'The app should protect account access with authentication and only send information to the backend services needed to run the platform. You should also protect your phone and password.',
  },
  {
    title: 'Your Choices',
    body: 'You can ask your estate administrator to correct account details, review resident records, or help with account access. Some records may need to be retained for security, payment, or estate management reasons.',
  },
];

const LegalDocumentScreen = () => {
  const navigation = useNavigation<LegalDocumentNavigationProp>();
  const route = useRoute<LegalDocumentRouteProp>();
  const isPrivacy = route.params.document === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const subtitle = isPrivacy ? 'How resident information is handled' : 'Rules for using the resident app';
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.75}
        >
          <Icon name="arrowLLine" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Please read this carefully before creating a resident account. This content is written for the app experience and can be replaced with your estate's final legal wording when ready.
        </Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Last updated: June 22, 2026
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default LegalDocumentScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7EFFF',
    flex: 1,
    paddingTop: 54,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: '#230039',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6E607A',
    fontSize: 13,
    marginTop: 3,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 36,
  },
  intro: {
    color: '#3C3443',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#230039',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 7,
  },
  sectionBody: {
    color: '#4F4658',
    fontSize: 14,
    lineHeight: 22,
  },
  notice: {
    backgroundColor: '#F7EFFF',
    borderRadius: 16,
    padding: 14,
  },
  noticeText: {
    color: '#6E607A',
    fontSize: 12,
    lineHeight: 18,
  },
});
