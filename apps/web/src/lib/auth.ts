import api from './api';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
  });

  useAuthStore
    .getState()
    .setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);

  return data.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    useAuthStore.getState().logout();
  }
}

export async function refreshAccessToken() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await api.post('/auth/refresh', { refreshToken });
  useAuthStore.getState().setAccessToken(data.data.accessToken);
  return data.data.accessToken;
}
