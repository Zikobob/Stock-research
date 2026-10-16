// AsyncStorage has no native module under Jest, so use the in-memory mock that ships with it.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
