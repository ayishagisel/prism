import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('auth_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }

    // Add auth header to all requests
    this.client.interceptors.request.use((config) => {
      // Always read from localStorage to get the latest token
      const token = this.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 (token expired or invalid)
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If we get 401 and haven't tried refreshing yet for this request
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Try to refresh the token
          const refreshed = await this.refreshAccessToken();

          if (refreshed) {
            // Retry the original request with new token
            return this.client(originalRequest);
          } else {
            // Refresh failed, redirect to login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise;
      return !!this.accessToken;
    }

    this.isRefreshing = true;
    this.refreshPromise = new Promise<void>(async (resolve) => {
      try {
        const refreshToken = this.refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null);

        if (!refreshToken) {
          resolve();
          return;
        }

        // Make request directly without interceptors to avoid infinite loop
        const response = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken }, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
        });

        if (response.data.success && response.data.data?.accessToken) {
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          this.setTokens(accessToken, newRefreshToken);
        }
      } catch (err) {
        console.error('Token refresh failed:', err);
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
        resolve();
      }
    });

    await this.refreshPromise;
    return !!this.accessToken;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  setToken(token: string) {
    // For backward compatibility with single token
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  }

  async login(email: string): Promise<ApiResponse<any>> {
    const res = await this.client.post('/api/auth/login', { email });
    if (res.data.success) {
      if (res.data.data?.accessToken && res.data.data?.refreshToken) {
        // New token pair format
        this.setTokens(res.data.data.accessToken, res.data.data.refreshToken);
      } else if (res.data.data?.token) {
        // Backward compatibility with single token format
        this.setToken(res.data.data.token);
      }
    }
    return res.data;
  }

  async logout(): Promise<ApiResponse> {
    const res = await this.client.post('/api/auth/logout');
    this.clearToken();
    return res.data;
  }

  async getMe(): Promise<ApiResponse<any>> {
    const res = await this.client.get('/api/auth/me');
    return res.data;
  }

  async getAgency(): Promise<ApiResponse<any>> {
    const res = await this.client.get('/api/agency/me');
    return res.data;
  }

  async getAgencyMetrics(): Promise<ApiResponse<any>> {
    const res = await this.client.get('/api/agency/metrics');
    return res.data;
  }

  async getOpportunities(): Promise<ApiResponse<any[]>> {
    const res = await this.client.get('/api/opportunities');
    return res.data;
  }

  async createOpportunity(data: any): Promise<ApiResponse<any>> {
    const res = await this.client.post('/api/opportunities', data);
    return res.data;
  }

  async getOpportunity(id: string): Promise<ApiResponse<any>> {
    const res = await this.client.get(`/api/opportunities/${id}`);
    return res.data;
  }

  async updateOpportunity(id: string, data: any): Promise<ApiResponse<any>> {
    const res = await this.client.put(`/api/opportunities/${id}`, data);
    return res.data;
  }

  async getClients(): Promise<ApiResponse<any[]>> {
    const res = await this.client.get('/api/clients');
    return res.data;
  }

  async createClient(data: any): Promise<ApiResponse<any>> {
    const res = await this.client.post('/api/clients', data);
    return res.data;
  }

  async getClient(id: string): Promise<ApiResponse<any>> {
    const res = await this.client.get(`/api/clients/${id}`);
    return res.data;
  }

  async updateClient(id: string, data: any): Promise<ApiResponse<any>> {
    const res = await this.client.put(`/api/clients/${id}`, data);
    return res.data;
  }

  async deleteClient(id: string): Promise<ApiResponse<any>> {
    const res = await this.client.delete(`/api/clients/${id}`);
    return res.data;
  }

  async getClientOpportunities(clientId: string): Promise<ApiResponse<any[]>> {
    const res = await this.client.get(`/api/clients/${clientId}/opportunities`);
    return res.data;
  }

  async updateOpportunityStatus(
    clientId: string,
    opportunityId: string,
    data: any
  ): Promise<ApiResponse<any>> {
    const res = await this.client.put(`/api/statuses/${clientId}/${opportunityId}`, data);
    return res.data;
  }

  async getTasks(): Promise<ApiResponse<any[]>> {
    const res = await this.client.get('/api/tasks');
    return res.data;
  }

  async createTask(data: any): Promise<ApiResponse<any>> {
    const res = await this.client.post('/api/tasks', data);
    return res.data;
  }

  async updateTask(id: string, data: any): Promise<ApiResponse<any>> {
    const res = await this.client.put(`/api/tasks/${id}`, data);
    return res.data;
  }

  async getTasksByOpportunity(opportunityId: string): Promise<ApiResponse<any[]>> {
    const res = await this.client.get(`/api/opportunities/${opportunityId}/tasks`);
    return res.data;
  }

  async getOpportunitySummary(opportunityId: string): Promise<ApiResponse<any>> {
    const res = await this.client.get(`/api/opportunities/${opportunityId}/summary`);
    return res.data;
  }

  async getClientOpportunityStatuses(opportunityId: string): Promise<ApiResponse<any[]>> {
    const res = await this.client.get(`/api/opportunities/${opportunityId}/statuses`);
    return res.data;
  }

  async importCSV(csvContent: string, clientMapping?: any): Promise<ApiResponse<any>> {
    const res = await this.client.post('/api/csv/import', {
      csv_content: csvContent,
      client_mapping: clientMapping,
    });
    return res.data;
  }

  async getClientMapping(): Promise<ApiResponse<any>> {
    const res = await this.client.get('/api/csv/client-mapping');
    return res.data;
  }
}

export const apiClient = new ApiClient();
