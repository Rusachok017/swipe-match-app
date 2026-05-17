import axios from 'axios'

const API_URL = 'http://127.0.0.1:8001/api'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
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
    
    if (response.data.status === '2fa_required') {
      return response.data
    }
    
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
  
  isAuthenticated: () => !!localStorage.getItem('token'),
  
  getCandidates: async (userId, limit = 10) => {
    const response = await apiClient.get('/candidates', {
      params: { current_user_id: userId, limit }
    })
    return response.data
  },
  
  makeSwipe: async (swiperId, swipedId, isLike) => {
    console.log(`💕 [SWIPE] ${swiperId} → ${swipedId} (like=${isLike})`)
    
    const response = await apiClient.post('/swipe', null, {
      params: { swiper_id: swiperId, swiped_id: swipedId, is_like: isLike }
    })
    
    console.log('📥 [SWIPE] Ответ:', response.data)
    if (response.data.is_match) {
      console.log('✅ [MATCH] Мэтч!')
      if (response.data.email_sent) {
        console.log('📧 [EMAIL] Уведомления отправлены обоим!')
      } else {
        console.log('⚠️ [EMAIL] Email не отправлен (2FA не включена у одного из пользователей)')
      }
    }
    
    return response.data
  },
  
  getUsers: async () => {
    const response = await apiClient.get('/users')
    return response.data
  },
  
  getProfile: async () => {
    const response = await apiClient.get('/profile')
    return response.data
  },
  
  updateProfile: async (data) => {
    const response = await apiClient.put('/profile', null, { params: data })
    return response.data
  },
  
  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
  
  deleteAvatar: async () => {
    const response = await apiClient.delete('/profile/avatar')
    return response.data
  },
  
  getFilters: async () => {
    const response = await apiClient.get('/profile/keywords')
    return response.data
  },
  
  setFilterStatus: async (keyword, status) => {
    const response = await apiClient.post('/profile/keywords/set', null, {
      params: { keyword, status }
    })
    return response.data
  },
  
  healthCheck: async () => {
    const response = await apiClient.get('/health')
    return response.data
  },

  check2FAStatus: async () => {
    const response = await apiClient.get('/auth/2fa/status')
    return response.data
  },

  enable2FA: async (email) => {
    const response = await apiClient.post('/auth/2fa/enable', null, {
      params: { email }
    })
    return response.data
  },

  verify2FA: async (code) => {
    const response = await apiClient.post('/auth/2fa/verify', null, {
      params: { code }
    })
    return response.data
  },

  disable2FA: async (password) => {
    const response = await apiClient.post('/auth/2fa/disable', null, {
      params: { password }
    })
    return response.data
  },

  resend2FA: async (tempToken) => { 
    const response = await apiClient.post('/auth/2fa/resend', {
      temp_token:  tempToken  
    })
    return response.data
  },

  login2FA: async (code, tempToken) => {
    const response = await apiClient.post('/auth/login/2fa', null, {
      params: { code, temp_token: tempToken }
    })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('userId', response.data.user_id)
      localStorage.setItem('username', response.data.username)
    }
    return response.data
  }
}