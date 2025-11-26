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
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }

    // Add auth header to all requests
    this.client.interceptors.request.use((config) => {
      // Always read from localStorage to get the latest token
      const token = this.token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 (token expired)
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  async login(email: string): Promise<ApiResponse<any>> {
    const res = await this.client.post('/api/auth/login', { email });
    if (res.data.success && res.data.data?.token) {
      this.setToken(res.data.data.token);
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
