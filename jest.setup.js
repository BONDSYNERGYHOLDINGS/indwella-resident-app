// react-native-bootsplash talks to a native module that doesn't exist under Jest.
jest.mock('react-native-bootsplash', () => ({
  default: {
    hide: jest.fn().mockResolvedValue(undefined),
    isVisible: jest.fn().mockReturnValue(false),
    useHideAnimation: jest.fn().mockReturnValue({
      container: {},
      logo: { source: 0 },
      brand: { source: 0 },
    }),
  },
}));
