import axios from 'axios'

const API_URL = 'http://127.0.0.1:8001/api'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const api = {
  register: async (username, password, age, gender, bio = '') => {
    const response = await apiClient.post('/auth/register', null, {
      params: { username, password, age, gender, bio }
    })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('userId', response.data.user_id)
      localStorage.setItem('username', response.data.username)
    }
    return response.data
  },
  
  login: async (username, password) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    
    const response = await apiClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('userId', response.data.user_id)
      localStorage.setItem('username', response.data.username)
    }
    return response.data
  },
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  },
    
  getCandidates: async (userId, limit = 10) => {
    const response = await apiClient.get('/candidates', {
      params: { current_user_id: userId, limit }
    })
    return response.data
  },
  
  makeSwipe: async (swiperId, swipedId, isLike) => {
    const response = await apiClient.post('/swipe', null, {
      params: { swiper_id: swiperId, swiped_id: swipedId, is_like: isLike }
    })
    return response.data
  },
  
  getUsers: async () => {
    const response = await apiClient.get('/users')
    return response.data
  },
  
  healthCheck: async () => {
    const response = await apiClient.get('/health')
    return response.data
  }
}