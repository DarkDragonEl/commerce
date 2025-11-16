import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: { usernameOrEmail: string; password: string }) {
    const { data } = await this.client.post('/api/v1/auth/login', credentials);
    return data;
  }

  // Products
  async getProducts(params?: any) {
    const { data } = await this.client.get('/api/v1/products', { params });
    return data;
  }

  async getProduct(id: string) {
    const { data } = await this.client.get(`/api/v1/products/${id}`);
    return data;
  }

  async createProduct(productData: any) {
    const { data } = await this.client.post('/api/v1/products', productData);
    return data;
  }

  async updateProduct(id: string, productData: any) {
    const { data } = await this.client.put(`/api/v1/products/${id}`, productData);
    return data;
  }

  async deleteProduct(id: string) {
    const { data } = await this.client.delete(`/api/v1/products/${id}`);
    return data;
  }

  // Categories
  async getCategories() {
    const { data } = await this.client.get('/api/v1/products/categories');
    return data;
  }

  async createCategory(categoryData: any) {
    const { data } = await this.client.post('/api/v1/products/categories', categoryData);
    return data;
  }

  // Orders
  async getOrders(params?: any) {
    const { data } = await this.client.get('/api/v1/orders', { params });
    return data;
  }

  async getOrder(id: string) {
    const { data } = await this.client.get(`/api/v1/orders/${id}`);
    return data;
  }

  async updateOrderStatus(id: string, status: string) {
    const { data } = await this.client.patch(`/api/v1/orders/${id}/status`, { status });
    return data;
  }

  // Users
  async getUsers(params?: any) {
    const { data } = await this.client.get('/api/v1/auth/users', { params });
    return data;
  }

  async getUser(id: string) {
    const { data } = await this.client.get(`/api/v1/auth/users/${id}`);
    return data;
  }

  // Blog
  async getBlogPosts(params?: any) {
    const { data } = await this.client.get('/api/v1/content/posts', { params });
    return data;
  }

  async getBlogPost(id: string) {
    const { data } = await this.client.get(`/api/v1/content/posts/${id}`);
    return data;
  }

  async createBlogPost(postData: any) {
    const { data } = await this.client.post('/api/v1/content/posts', postData);
    return data;
  }

  async updateBlogPost(id: string, postData: any) {
    const { data } = await this.client.put(`/api/v1/content/posts/${id}`, postData);
    return data;
  }

  async deleteBlogPost(id: string) {
    const { data } = await this.client.delete(`/api/v1/content/posts/${id}`);
    return data;
  }

  // Analytics
  async getAnalytics(params?: any) {
    const { data } = await this.client.get('/api/v1/analytics/reports/sales', { params });
    return data;
  }

  async getMetrics() {
    const { data } = await this.client.get('/api/v1/analytics/metrics');
    return data;
  }
}

export const api = new ApiClient();
