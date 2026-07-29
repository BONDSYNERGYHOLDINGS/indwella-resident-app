const fs = require('fs');
const path = require('path');

const modulePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-document-picker',
  'android',
  'src',
  'main',
  'java',
  'com',
  'reactnativedocumentpicker',
  'RNDocumentPickerModule.java',
);

if (!fs.existsSync(modulePath)) {
  process.exit(0);
}

let source = fs.readFileSync(modulePath, 'utf8');
const original = source;

source = source
  .replace(
    'import android.os.Bundle;\n',
    'import android.os.AsyncTask;\nimport android.os.Bundle;\n',
  )
  .replace('import com.facebook.react.bridge.GuardedResultAsyncTask;\n', '')
  .replace(
    'private static class ProcessDataTask extends GuardedResultAsyncTask<ReadableArray> {',
    'private static class ProcessDataTask extends AsyncTask<Void, Void, ReadableArray> {',
  )
  .replace('      super(reactContext.getExceptionHandler());\n', '')
  .replace(
    'protected ReadableArray doInBackgroundGuarded() {',
    'protected ReadableArray doInBackground(Void... ignored) {',
  )
  .replace(
    'protected void onPostExecuteGuarded(ReadableArray readableArray) {',
    'protected void onPostExecute(ReadableArray readableArray) {',
  );

if (source !== original) {
  fs.writeFileSync(modulePath, source);
  console.log('Patched react-native-document-picker for React Native 0.79 Android builds.');
}
