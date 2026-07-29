import { NativeModules } from 'react-native';

type PickedContact = {
  name?: string;
  phone?: string;
};

type PhoneContactPickerModule = {
  pickContact(): Promise<PickedContact>;
};

const { PhoneContactPicker } = NativeModules as {
  PhoneContactPicker?: PhoneContactPickerModule;
};

export default PhoneContactPicker;
