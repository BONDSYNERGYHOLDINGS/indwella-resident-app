declare module 'react-native-contacts' {
  export type ContactPhoneNumber = {
    number: string;
  };

  export type Contact = {
    recordID: string;
    displayName: string | null;
    givenName?: string | null;
    familyName?: string | null;
    phoneNumbers: ContactPhoneNumber[];
  };

  export type PermissionStatus = 'authorized' | 'denied' | 'undefined' | 'limited';

  const Contacts: {
    checkPermission(): Promise<PermissionStatus>;
    requestPermission(): Promise<PermissionStatus>;
    getAll(): Promise<Contact[]>;
    getAllWithoutPhotos(): Promise<Contact[]>;
    getCount(): Promise<number>;
  };

  export default Contacts;
}
