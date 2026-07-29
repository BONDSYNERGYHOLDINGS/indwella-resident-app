module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
   
    ['module:react-native-dotenv',
      {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true
      }
    ],
    ['babel-plugin-rewrite-require',
      {
        aliases: {
          stream: 'readable-stream',
        },
      }
    ],
     ['react-native-reanimated/plugin']
  ]
};
