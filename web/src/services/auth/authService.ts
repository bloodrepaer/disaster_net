import axios from 'axios';
import { User } from '../../types/user';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class AuthService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('jwt_token');
  }

  /**
   * Standard email/password login
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      // Store token
      this.setToken(token);

      return user;
    } catch (error) {
      throw new Error(
        error instanceof axios.AxiosError
          ? error.response?.data?.message || 'Login failed'
          : 'Login failed'
      );
    }
  }

  /**
   * Login via NEAR wallet
   */
  async loginWithNEAR(): Promise<User> {
    try {
      // This would integrate with NEAR wallet SDK
      const response = await axios.post(`${API_URL}/api/v1/auth/near/login`, {
        wallet: 'near_wallet_instance',
      });

      const { token, user } = response.data;
      this.setToken(token);

      return user;
    } catch (error) {
      throw new Error(
        error instanceof axios.AxiosError
          ? error.response?.data?.message || 'NEAR login failed'
          : 'NEAR login failed'
      );
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/auth/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      this.token = token;
      return response.data.user;
    } catch (error) {
      this.logout();
      throw new Error('Token verification failed');
    }
  }

  /**
   * Set JWT token
   */
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('jwt_token', token);
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Logout
   */
  logout(): void {
    this.token = null;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
  }
}

export const authService = new AuthService();

/**
 * Create axios instance with auth header
 */
export const createApiClient = () => {
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add token to every request
  client.interceptors.request.use((config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401 responses
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        authService.logout();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();
