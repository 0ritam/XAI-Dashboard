import axios from 'axios';
import type { StudentInput, PredictionResponse, ExplanationResponse, HealthResponse } from '../types';

// API configuration with environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');
const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (IS_DEV_MODE) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Request data:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and logging
api.interceptors.response.use(
  (response) => {
    if (IS_DEV_MODE) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data);
    
    // Enhanced error handling
    if (error.response?.status === 422) {
      throw new Error(`Validation Error: ${error.response.data.detail || 'Invalid input data'}`);
    } else if (error.response?.status === 500) {
      throw new Error('Server Error: Please try again later');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection Error: Backend server is not running');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout Error: Request took too long to complete');
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Health check
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await api.get<HealthResponse>('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Failed to check API health');
    }
  },

  // Predict student performance
  async predictStudentPerformance(studentData: StudentInput): Promise<PredictionResponse> {
    try {
      const response = await api.post<PredictionResponse>('/predict', studentData);
      return response.data;
    } catch (error) {
      console.error('Prediction failed:', error);
      throw new Error('Failed to predict student performance');
    }
  },

  // Get explanation for student prediction
  async explainPrediction(studentData: StudentInput): Promise<ExplanationResponse> {
    try {
      const response = await api.post<ExplanationResponse>('/explain', studentData);
      return response.data;
    } catch (error) {
      console.error('Explanation failed:', error);
      throw new Error('Failed to generate explanation');
    }
  },

  // Batch predict (for future use)
  async batchPredict(students: StudentInput[], includeExplanations = false) {
    try {
      const response = await api.post('/batch-predict', {
        students,
        include_explanations: includeExplanations,
      });
      return response.data;
    } catch (error) {
      console.error('Batch prediction failed:', error);
      throw new Error('Failed to perform batch prediction');
    }
  },
};

export default api;
