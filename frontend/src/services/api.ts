import axios from 'axios';

export const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || '/api',
});

let tokenResolver: (() => Promise<string | null>) | null = null;

// Sets the Clerk token resolver from inside a React component/hook context
export const setTokenResolver = (resolver: () => Promise<string | null>) => {
  tokenResolver = resolver;
};

// Axios request interceptor to attach JWT on every protected endpoint
api.interceptors.request.use(
  async (config) => {
    if (tokenResolver) {
      try {
        const token = await tokenResolver();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Error getting Clerk JWT token:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
