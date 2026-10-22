import { apiClient } from '../api/axios';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

export const authService = {
  /**
   * Log in user
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  /**
   * Register new user (pushes user to DB)
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  /**
   * Get currently authenticated user details
   */
  async getMe(): Promise<{ success: boolean; user: User }> {
    const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
    return response.data;
  },

  /**
   * Seed / Ensure default Sugan user in DB
   */
  async seedDefaultUser(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/seed');
    return response.data;
  },
};
