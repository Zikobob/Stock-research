// AsyncStorage has no native module under Jest, so use the in-memory mock that ships with it.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// expo-crypto needs its native module; stand in with Node's crypto so salts are real random values.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  getRandomBytes: (n) => new Uint8Array(require('crypto').randomBytes(n)),
}));
