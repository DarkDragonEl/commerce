import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/auth/signin';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Products
  async getProducts(params?: { search?: string; category?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) {
    const { data } = await this.client.get('/api/v1/products', { params });
    return data;
  }

  async getProduct(id: string) {
    const { data } = await this.client.get(`/api/v1/products/${id}`);
    return data;
  }

  async getCategories() {
    const { data } = await this.client.get('/api/v1/products/categories');
    return data;
  }

  // Auth
  async register(userData: { username: string; email: string; password: string; firstName?: string; lastName?: string }) {
    const { data } = await this.client.post('/api/v1/auth/register', userData);
    return data;
  }

  async login(credentials: { usernameOrEmail: string; password: string }) {
    const { data } = await this.client.post('/api/v1/auth/login', credentials);
    return data;
  }

  async getProfile() {
    const { data } = await this.client.get('/api/v1/auth/profile');
    return data;
  }

  async updateProfile(profileData: { firstName?: string; lastName?: string; phone?: string; address?: any }) {
    const { data } = await this.client.put('/api/v1/auth/profile', profileData);
    return data;
  }

  // Orders
  async createOrder(orderData: { items: Array<{ productId: string; quantity: number; price: number }>; shippingAddress: any; billingAddress?: any }) {
    const { data } = await this.client.post('/api/v1/orders', orderData);
    return data;
  }

  async getOrders() {
    const { data } = await this.client.get('/api/v1/orders');
    return data;
  }

  async getOrder(id: string) {
    const { data } = await this.client.get(`/api/v1/orders/${id}`);
    return data;
  }

  // Payment
  async createPaymentIntent(orderData: { amount: number; currency?: string; orderId: string }) {
    const { data } = await this.client.post('/api/v1/payments/create-intent', orderData);
    return data;
  }

  async confirmPayment(paymentIntentId: string) {
    const { data } = await this.client.post(`/api/v1/payments/${paymentIntentId}/confirm`);
    return data;
  }

  // Inventory
  async checkStock(productId: string) {
    const { data } = await this.client.get(`/api/v1/inventory/${productId}/stock`);
    return data;
  }

  // Content
  async getBlogPosts(params?: { page?: number; limit?: number }) {
    const { data } = await this.client.get('/api/v1/content/posts', { params });
    return data;
  }

  async getBlogPost(slug: string) {
    const { data } = await this.client.get(`/api/v1/content/posts/${slug}`);
    return data;
  }
}

export const api = new ApiClient();
