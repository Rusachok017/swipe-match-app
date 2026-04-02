import axios from 'axios'

const API_URL = 'http://127.0.0.1:8001/api'  

export const api = {
  // Проверка подключения
  healthCheck: () => axios.get(`${API_URL}/health`),
  
  // Получить всех пользователей (тестирование)
  getUsers: () => axios.get(`${API_URL}/users`),
  
  // Получить кандидатов для свайпа
  getCandidates: (userId = 1) => 
    axios.get(`${API_URL}/candidates?current_user_id=${userId}`),
  
  // Сделать свайп
  makeSwipe: (swiperId, swipedId, isLike) =>
    axios.post(`${API_URL}/swipe`, null, {
      params: { 
        swiper_id: swiperId, 
        swiped_id: swipedId, 
        is_like: isLike 
      }
    })
}