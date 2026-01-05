// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:4000/api' 
    : 'https://your-production-domain.com/api',
  TIMEOUT: 30000, // 30 seconds
};

// Mock device ID - in production, use expo-device or expo-constants
export const getDeviceId = (): string => {
  // TODO: Replace with actual device ID from expo-constants
  return 'demo-device-' + Math.random().toString(36).substring(7);
};

// Mock user credentials - will be replaced with real auth
export const MOCK_USER = {
  userId: 'demo-user-id',
  tenantId: 'demo-tenant-id',
  role: 'crew' as const,
};
