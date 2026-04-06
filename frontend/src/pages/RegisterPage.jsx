import React, { useState } from 'react'
import { api } from '../services/api'
import { useNavigate, Link } from 'react-router-dom'

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    age: '',
    gender: 'male',
    bio: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.register(
        formData.username,
        formData.password,
        parseInt(formData.age),
        formData.gender,
        formData.bio
      )
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔥 Swipe Match</h1>
        <h2 style={styles.subtitle}>Регистрация</h2>
        
        <form onSubmit={handleRegister} style={styles.form}>
          <input
            type="text"
            name="username"
            placeholder="Имя пользователя"
            value={formData.username}
            onChange={handleChange}
            style={styles.input}
            required
          />
          
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            required
          />
          
          <input
            type="number"
            name="age"
            placeholder="Возраст"
            value={formData.age}
            onChange={handleChange}
            style={styles.input}
            min="18"
            max="100"
            required
          />
          
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
          
          <textarea
            name="bio"
            placeholder="О себе"
            value={formData.bio}
            onChange={handleChange}
            style={{...styles.input, minHeight: '100px'}}
          />
          
          {error && <p style={styles.error}>{error}</p>}
          
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <p style={styles.text}>
          Уже есть аккаунт? <Link to="/login" style={styles.link}>Войти</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    color: '#ff6b6b',
    fontSize: '32px',
    marginBottom: '10px'
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '15px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    outline: 'none'
  },
  button: {
    padding: '15px',
    fontSize: '18px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '10px'
  },
  error: {
    color: '#f44336',
    fontSize: '14px',
    textAlign: 'center'
  },
  text: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666'
  },
  link: {
    color: '#ff6b6b',
    textDecoration: 'none',
    fontWeight: 'bold'
  }
}

export default RegisterPage