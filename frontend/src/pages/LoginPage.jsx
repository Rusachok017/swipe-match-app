import React, { useState } from 'react'
import { api } from '../services/api'
import { useNavigate, Link } from 'react-router-dom'
import { redirect } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()
  
  const [step1, setStep1] = useState({
    username: '',
    password: ''
  })
  

  const [step2, setStep2] = useState({
    code: '',
    tempToken: '',
    email: ''
  })
  
  const [currentStep, setCurrentStep] = useState(1)  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  const handleStep1Change = (e) => {
    const { name, value } = e.target
    setStep1(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleStep2Change = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
    setStep2(prev => ({ ...prev, code: value }))
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await api.login(step1.username, step1.password)
      
      if (result.status === '2fa_required') {
        setCurrentStep(2)
        setStep2(prev => ({
          ...prev,
          tempToken: result.temp_token,
          email: result.email || ''
        }))
        setResendTimer(15)
        

        const timer = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        return
      }
      
      const status = await api.check2FAStatus()
      
      if (status.email_2fa_enabled) {
        window.location.replace('/profile?setup2fa=true')
      } else {
        window.location.replace('/')
      }
      
    } catch (err) {
      console.error('Ошибка входа:', err)
      setError(err.response?.data?.detail || 'Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e) => {
    e.preventDefault()
    
    if (!step2.code || step2.code.length !== 6) {
      setError('Введите 6-значный код')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      const result = await api.login2FA(step2.code, step2.tempToken)
      
      const status = await api.check2FAStatus()
      
      if (status.email_2fa_enabled) {
        window.location.replace('/profile?setup2fa=true')
      } else {
        window.location.replace('/')
      }
      
    } catch (err) {
      console.error('Ошибка 2FA:', err)
      setError(err.response?.data?.detail || 'Неверный код')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    
    try {
      setLoading(true)
      setError('')
      
      await api.resend2FA(step2.tempToken)
      setResendTimer(30)
      
      const timer = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
    } catch (err) {
      console.error('Ошибка повторной отправки:', err)
      setError('Не удалось отправить код повторно')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
    setStep2({ code: '', tempToken: '', email: '' })
    setError('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔐 Вход</h1>
        
        {error && <div style={styles.error}>{error}</div>}
        
        {currentStep === 1 && (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Логин</label>
              <input
                type="text"
                name="username"
                value={step1.username}
                onChange={handleStep1Change}
                style={styles.input}
                placeholder="Введите логин"
                autoComplete="username"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Пароль</label>
              <input
                type="password"
                name="password"
                value={step1.password}
                onChange={handleStep1Change}
                style={styles.input}
                placeholder="Введите пароль"
                autoComplete="current-password"
              />
            </div>
            
            <button 
              type="submit" 
              style={{...styles.btn, ...styles.primary}}
              disabled={loading}
            >
              {loading ? '⏳ Вход...' : '🚀 Войти'}
            </button>
          </form>
        )}
        
        {currentStep === 2 && (
          <form onSubmit={handleVerify2FA} style={styles.form}>
            <div style={styles.info2fa}>
              <p>Мы отправили 6-значный код на:</p>
              <p style={styles.email}>{step2.email || 'ваш email'}</p>
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Код подтверждения</label>
              <input
                type="text"
                value={step2.code}
                onChange={handleStep2Change}
                style={{...styles.input, ...styles.codeInput}}
                placeholder="000000"
                maxLength="6"
                autoFocus
              />
            </div>
            
            <button 
              type="submit" 
              style={{...styles.btn, ...styles.primary}}
              disabled={loading || step2.code.length !== 6}
            >
              {loading ? '⏳ Проверка...' : '✅ Подтвердить'}
            </button>
            
            <div style={styles.resend}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                style={{
                  ...styles.btn,
                  ...styles.secondary,
                  opacity: resendTimer > 0 ? 0.5 : 1
                }}
              >
                {resendTimer > 0 ? `⏳ Отправить через ${resendTimer}с` : '📬 Отправить код повторно'}
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleBack}
              style={{...styles.btn, ...styles.link}}
            >
              ← Назад
            </button>
          </form>
        )}
        
        <div style={styles.footer}>
          <p>Нет аккаунта? <Link to="/register" style={styles.link}>Зарегистрироваться</Link></p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    color: '#ff6b6b',
    fontSize: '32px',
    marginBottom: '30px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  },
  input: {
    padding: '12px 15px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  codeInput: {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '8px'
  },
  btn: {
    padding: '15px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  primary: {
    backgroundColor: '#ff6b6b',
    color: 'white'
  },
  secondary: {
    backgroundColor: '#e0e0e0',
    color: '#333'
  },
  link: {
    backgroundColor: 'transparent',
    color: '#ff6b6b',
    textDecoration: 'underline'
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px'
  },
  info2fa: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#e3f2fd',
    borderRadius: '8px'
  },
  email: {
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: '16px'
  },
  resend: {
    textAlign: 'center',
    marginTop: '10px'
  },
  footer: {
    textAlign: 'center',
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    color: '#666'
  }
}

export default LoginPage