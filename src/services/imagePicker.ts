import {
  isCancel,
  pick,
  types,
  type DocumentPickerResponse,
} from 'react-native-document-picker';
import {
  launchImageLibrary,
  type Asset,
  type ImageLibraryOptions,
  type PhotoQuality,
} from 'react-native-image-picker';

type PickImageResult = {
  asset: Asset | null;
  errorMessage?: string;
};

const PHOTO_PICKER_UNAVAILABLE_PATTERNS = [
  'android.provider.action.pick_images',
  'no activity found to handle intent',
];

const isPhotoPickerUnavailable = (message?: string) => {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();
  return PHOTO_PICKER_UNAVAILABLE_PATTERNS.some(pattern =>
    normalizedMessage.includes(pattern),
  );
};

const documentToAsset = (file: DocumentPickerResponse): Asset => ({
  uri: file.uri,
  fileName: file.name || undefined,
  type: file.type || undefined,
  fileSize: file.size || undefined,
});

const pickImageFromDocuments = async (): Promise<PickImageResult> => {
  try {
    const [file] = await pick({
      type: [types.images],
      allowMultiSelection: false,
    });

    return { asset: file ? documentToAsset(file) : null };
  } catch (error: unknown) {
    if (isCancel(error)) {
      return { asset: null };
    }

    return {
      asset: null,
      errorMessage: 'Could not open your media library. Please try again.',
    };
  }
};

export const pickImageAsset = async (
  options: Partial<ImageLibraryOptions> = {},
): Promise<PickImageResult> => {
  const pickerOptions: ImageLibraryOptions = {
    ...options,
    mediaType: options.mediaType || 'photo',
    quality: (options.quality ?? 0.7) as PhotoQuality,
  };

  const response = await launchImageLibrary(pickerOptions);

  if (response.didCancel) {
    return { asset: null };
  }

  if (response.errorCode) {
    if (isPhotoPickerUnavailable(response.errorMessage)) {
      return pickImageFromDocuments();
    }

    return {
      asset: null,
      errorMessage: response.errorMessage || 'Could not pick image.',
    };
  }

  return { asset: response.assets?.[0] || null };
};
