import { Platform } from 'react-native';

// API Configuration
const getBaseURL = () => {
  if (!__DEV__) {
    return 'https://your-production-domain.com/api';
  }

  // Development mode - auto-detect platform
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api'; // Android emulator
  }

  // iOS simulator and web use localhost
  return 'http://localhost:4000/api';
};

export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  TIMEOUT: 30000, // 30 seconds
};

// Generate or retrieve device ID (UUID format required by backend)
let cachedDeviceId: string | null = null;

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getDeviceId = (): string => {
  // Cache deviceId so it persists across app sessions
  // TODO: In production, use AsyncStorage to persist this or use expo-device
  if (!cachedDeviceId) {
    cachedDeviceId = generateUUID();
  }
  return cachedDeviceId;
};

// Mock user credentials - will be replaced with real auth
export const MOCK_USER = {
  userId: 'demo-user-id',
  tenantId: 'demo-tenant-id',
  role: 'crew' as const,
};
