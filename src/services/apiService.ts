// src/services/apiService.ts
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

export const fetchData = async () => {
  try {
    const response = await axios.get(API_CONFIG.baseUrl);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};