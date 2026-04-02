import { useState, useEffect } from 'react'
import { api } from '../services/api'

function HomePage() {
  const [users, setUsers] = useState([])
  const [message, setMessage] = useState('Загрузка...')

  useEffect(() => {
    // Проверка подключения к бэкенду
    api.healthCheck()
      .then(() => setMessage('Бэкенд подключен!'))
      .catch(() => setMessage('Бэкенд не отвечает'))
    
    // Получить пользователей
    api.getUsers()
      .then(response => setUsers(response.data))
      .catch(err => console.error('Ошибка:', err))
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Swipe Match</h1>
      <p>{message}</p>
      
      <h2>Пользователи в базе:</h2>
      {users.length === 0 ? (
        <p>Пока пусто</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.username} ({user.age} лет)
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default HomePage