import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useNavigate, useSearchParams } from 'react-router-dom'

function ProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keywords, setKeywords] = useState([])
  const [profile, setProfile] = useState(null)
  
  const [twoFA, setTwoFA] = useState({
    enabled: false,
    email: '',
    step: 'view', 
    code: '',
    password: '',
    error: '',
    success: '',
    resendTimer: 0
  })
  
  useEffect(() => {
    loadData()
  }, [])
  
  
  useEffect(() => {
    if (searchParams.get('setup2fa') === 'true') {
      setTwoFA(prev => ({ ...prev, step: 'enable-email' }))
    }
  }, [searchParams])
  
  const loadData = async () => {
    try {
      setLoading(true)
      const [profileData, filtersData, twoFAStatus] = await Promise.all([
        api.getProfile(),
        api.getFilters(),
        api.check2FAStatus().catch(() => ({ email_2fa_enabled: false, email: '' }))
      ])
      setProfile(profileData)
      setKeywords(filtersData.keywords || [])
      setTwoFA(prev => ({
        ...prev,
        enabled: twoFAStatus.email_2fa_enabled,
        email: twoFAStatus.email || ''
      }))
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleKeywordChange = async (keyword, newStatus) => {
    try {
      setSaving(true)
      await api.setFilterStatus(keyword, newStatus)
      setKeywords(keywords.map(k => 
        k.keyword === keyword ? { ...k, status: newStatus } : k
      ))
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Не удалось сохранить фильтр')
    } finally {
      setSaving(false)
    }
  }
  
  const handleEnable2FAStart = () => {
    setTwoFA(prev => ({ ...prev, step: 'enable-email', error: '', success: '' }))
  }
  
  const handleSendCode = async () => {
    const email = twoFA.email.trim()
    if (!email || !email.includes('@')) {
      setTwoFA(prev => ({ ...prev, error: 'Введите корректный email' }))
      return
    }
    
    try {
      setSaving(true)
      setTwoFA(prev => ({ ...prev, error: '' }))
      await api.enable2FA(email)
      setTwoFA(prev => ({ 
        ...prev, 
        step: 'enable-code', 
        success: 'Код отправлен на email!',
        resendTimer: 30 
      }))
      
      const timer = setInterval(() => {
        setTwoFA(prev => {
          if (prev.resendTimer <= 1) {
            clearInterval(timer)
            return { ...prev, resendTimer: 0 }
          }
          return { ...prev, resendTimer: prev.resendTimer - 1 }
        })
      }, 1000)
      
    } catch (err) {
      setTwoFA(prev => ({ 
        ...prev, 
        error: err.response?.data?.detail || 'Не удалось отправить код' 
      }))
    } finally {
      setSaving(false)
    }
  }
  
  const handleVerifyCode = async () => {
    if (!twoFA.code || twoFA.code.length !== 6) {
      setTwoFA(prev => ({ ...prev, error: 'Введите 6-значный код' }))
      return
    }
    
    try {
      setSaving(true)
      setTwoFA(prev => ({ ...prev, error: '' }))
      await api.verify2FA(twoFA.code)
      setTwoFA(prev => ({ 
        ...prev, 
        enabled: true, 
        step: 'view', 
        success: '✅ 2FA активирована!',
        code: '' 
      }))
      setTimeout(() => setTwoFA(prev => ({ ...prev, success: '' })), 3000)
    } catch (err) {
      setTwoFA(prev => ({ 
        ...prev, 
        error: err.response?.data?.detail || 'Неверный код' 
      }))
    } finally {
      setSaving(false)
    }
  }
  
  const handleDisable2FAStart = () => {
    setTwoFA(prev => ({ ...prev, step: 'disable', error: '', password: '' }))
  }
  
  const handleConfirmDisable = async () => {
    if (!twoFA.password) {
      setTwoFA(prev => ({ ...prev, error: 'Введите пароль для подтверждения' }))
      return
    }
    
    try {
      setSaving(true)
      setTwoFA(prev => ({ ...prev, error: '' }))
      await api.disable2FA(twoFA.password)
      setTwoFA(prev => ({ 
        ...prev, 
        enabled: false, 
        step: 'view', 
        success: '🔓 2FA отключена',
        password: '' 
      }))
      setTimeout(() => setTwoFA(prev => ({ ...prev, success: '' })), 3000)
    } catch (err) {
      setTwoFA(prev => ({ 
        ...prev, 
        error: err.response?.data?.detail || 'Неверный пароль' 
      }))
    } finally {
      setSaving(false)
    }
  }
  
  const handleResendCode = async () => {
    if (twoFA.resendTimer > 0) return
    
    try {
      setSaving(true)
      await api.enable2FA(twoFA.email)
      setTwoFA(prev => ({ ...prev, success: 'Код отправлен повторно!', resendTimer: 30 }))
      
      const timer = setInterval(() => {
        setTwoFA(prev => {
          if (prev.resendTimer <= 1) {
            clearInterval(timer)
            return { ...prev, resendTimer: 0 }
          }
          return { ...prev, resendTimer: prev.resendTimer - 1 }
        })
      }, 1000)
    } catch (err) {
      setTwoFA(prev => ({ ...prev, error: 'Не удалось отправить код' }))
    } finally {
      setSaving(false)
    }
  }
  
  const handleCancel2FA = () => {
    setTwoFA(prev => ({ ...prev, step: 'view', error: '', success: '', code: '', password: '' }))
  }
  
  if (loading) {
    return <div style={styles.loading}>Загрузка...</div>
  }
  
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>👤 Мой профиль</h1>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔐 Двухфакторная аутентификация</h2>
        
        {twoFA.success && <div style={styles.success}>{twoFA.success}</div>}
        {twoFA.error && <div style={styles.error}>{twoFA.error}</div>}
        
        {twoFA.step === 'view' && (
          <div>
            <div style={styles.twoFAStatus}>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: twoFA.enabled ? '#4CAF50' : '#f44336'
              }}>
                {twoFA.enabled ? '✅ Включена' : '❌ Выключена'}
              </span>
              {twoFA.email && <span style={styles.twoFAEmail}>{twoFA.email}</span>}
            </div>
            
            <p style={styles.twoFADesc}>
              {twoFA.enabled 
                ? 'При каждом входе вам будет приходить код подтверждения на email'
                : 'Включите 2FA для дополнительной защиты аккаунта'}
            </p>
            
            {!twoFA.enabled ? (
              <button onClick={handleEnable2FAStart} style={styles.twoFABtn}>
                🔐 Включить 2FA
              </button>
            ) : (
              <button onClick={handleDisable2FAStart} style={{...styles.twoFABtn, ...styles.dangerBtn}}>
                🔓 Отключить 2FA
              </button>
            )}
          </div>
        )}
        
        {twoFA.step === 'enable-email' && (
          <div>
            <p style={styles.twoFADesc}>Введите email для получения кодов:</p>
            <input
              type="email"
              placeholder="your@email.com"
              value={twoFA.email}
              onChange={(e) => setTwoFA(prev => ({ ...prev, email: e.target.value }))}
              style={styles.input}
              disabled={saving}
            />
            <div style={styles.twoFABtns}>
              <button onClick={handleSendCode} style={styles.twoFABtn} disabled={saving}>
                {saving ? '⏳...' : '📬 Отправить код'}
              </button>
              <button onClick={handleCancel2FA} style={styles.cancelBtn}>Отмена</button>
            </div>
          </div>
        )}
        
        {twoFA.step === 'enable-code' && (
          <div>
            <p style={styles.twoFADesc}>Код отправлен на <strong>{twoFA.email}</strong></p>
            <input
              type="text"
              placeholder="000000"
              value={twoFA.code}
              onChange={(e) => setTwoFA(prev => ({ 
                ...prev, 
                code: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) 
              }))}
              style={{...styles.input, ...styles.codeInput}}
              maxLength="6"
              disabled={saving}
              autoFocus
            />
            <div style={styles.twoFABtns}>
              <button 
                onClick={handleVerifyCode} 
                style={styles.twoFABtn}
                disabled={saving || twoFA.code.length !== 6}
              >
                {saving ? '⏳...' : '✅ Активировать'}
              </button>
              <button 
                onClick={handleResendCode} 
                style={styles.secondaryBtn}
                disabled={twoFA.resendTimer > 0 || saving}
              >
                {twoFA.resendTimer > 0 ? `⏳ ${twoFA.resendTimer}с` : '📬 Повторно'}
              </button>
              <button onClick={handleCancel2FA} style={styles.cancelBtn}>Отмена</button>
            </div>
          </div>
        )}
        
        {twoFA.step === 'disable' && (
          <div>
            <p style={styles.twoFADesc}>Введите пароль для подтверждения:</p>
            <input
              type="password"
              placeholder="••••••••"
              value={twoFA.password}
              onChange={(e) => setTwoFA(prev => ({ ...prev, password: e.target.value }))}
              style={styles.input}
              disabled={saving}
            />
            <div style={styles.twoFABtns}>
              <button 
                onClick={handleConfirmDisable} 
                style={{...styles.twoFABtn, ...styles.dangerBtn}}
                disabled={saving}
              >
                {saving ? '⏳...' : '🔓 Отключить'}
              </button>
              <button onClick={handleCancel2FA} style={styles.cancelBtn}>Отмена</button>
            </div>
          </div>
        )}
      </div>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📝 Информация</h2>
        <p><strong>Имя:</strong> {profile?.username}</p>
        <p><strong>Возраст:</strong> {profile?.age}</p>
        <p><strong>Био:</strong> {profile?.bio || 'Не указано'}</p>
        <button onClick={() => navigate('/profile/edit')} style={styles.editBtn}>
          ✏️ Редактировать
        </button>
      </div>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔍 Фильтры анкет</h2>
        <p style={styles.hint}>
          <strong>🟢 Белый список:</strong> показывать только анкеты с этим словом<br/>
          <strong>🔴 Чёрный список:</strong> скрыть анкеты с этим словом<br/>
          <strong>⚪ Нейтрально:</strong> не влияет на фильтрацию<br/>
        </p>
        
        <div style={styles.keywordsGrid}>
          {keywords.map((item) => (
            <div key={item.keyword} style={styles.keywordCard}>
              <span style={styles.keywordText}>{item.keyword}</span>
              
              <div style={styles.keywordButtons}>
                <button
                  onClick={() => handleKeywordChange(item.keyword, 'white')}
                  style={{
                    ...styles.kbtn,
                    backgroundColor: item.status === 'white' ? '#4CAF50' : '#e0e0e0',
                    color: item.status === 'white' ? 'white' : '#333'
                  }}
                  title="Белый список"
                >
                  ✓
                </button>
                
                <button
                  onClick={() => handleKeywordChange(item.keyword, 'neutral')}
                  style={{
                    ...styles.kbtn,
                    backgroundColor: item.status === 'neutral' ? '#9e9e9e' : '#e0e0e0',
                    color: item.status === 'neutral' ? 'white' : '#333'
                  }}
                  title="Нейтрально"
                >
                  ○
                </button>
                
                <button
                  onClick={() => handleKeywordChange(item.keyword, 'black')}
                  style={{
                    ...styles.kbtn,
                    backgroundColor: item.status === 'black' ? '#f44336' : '#e0e0e0',
                    color: item.status === 'black' ? 'white' : '#333'
                  }}
                  title="Чёрный список"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div style={styles.stats}>
          <span style={styles.statBlack}>
            🔴 Чёрный: {keywords.filter(k => k.status === 'black').length}
          </span>
          <span style={styles.statWhite}>
            🟢 Белый: {keywords.filter(k => k.status === 'white').length}
          </span>
          <span style={styles.statNeutral}>
            ⚪ Нейтрально: {keywords.filter(k => k.status === 'neutral').length}
          </span>
        </div>
      </div>
      
      <div style={styles.navButtons}>
        <button onClick={() => navigate('/')} style={styles.navBtn}>
          ← На главную
        </button>
        <button onClick={() => { api.logout(); navigate('/login') }} style={styles.logoutBtn}>
          Выйти
        </button>
      </div>
      
      {saving && <div style={styles.savingOverlay}>💾 Сохранение...</div>}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    padding: '20px'
  },
  title: {
    textAlign: 'center',
    color: '#ff6b6b',
    fontSize: '32px',
    marginBottom: '30px'
  },
  section: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '15px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  hint: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.8',
    marginBottom: '20px',
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '8px'
  },
  keywordsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  keywordCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#fafafa',
    borderRadius: '10px',
    border: '1px solid #e0e0e0'
  },
  keywordText: {
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '10px',
    color: '#333'
  },
  keywordButtons: {
    display: 'flex',
    gap: '8px'
  },
  kbtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    paddingTop: '15px',
    borderTop: '1px solid #e0e0e0'
  },
  statBlack: { color: '#f44336', fontWeight: 'bold' },
  statWhite: { color: '#4CAF50', fontWeight: 'bold' },
  statNeutral: { color: '#9e9e9e', fontWeight: 'bold' },
  navButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '20px'
  },
  navBtn: {
    padding: '12px 30px',
    fontSize: '16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  logoutBtn: {
    padding: '12px 30px',
    fontSize: '16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  editBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '10px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    fontSize: '20px',
    padding: '50px'
  },
  savingOverlay: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '15px 25px',
    borderRadius: '8px',
    fontWeight: 'bold',
    zIndex: 1000
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  twoFAStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  twoFAEmail: {
    color: '#666',
    fontSize: '14px'
  },
  twoFADesc: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '15px',
    lineHeight: '1.5'
  },
  twoFABtn: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    marginRight: '10px'
  },
  secondaryBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    marginRight: '10px'
  },
  dangerBtn: {
    backgroundColor: '#f44336'
  },
  cancelBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #ccc',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  twoFABtns: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '15px',
    outline: 'none'
  },
  codeInput: {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '8px',
    maxWidth: '200px',
    margin: '0 auto 15px'
  },
  sectionTitle: {
    color: '#ff6b6b',        
    fontSize: '22px',        
    fontWeight: '600',       
    marginBottom: '20px',    
    paddingBottom: '10px',   
    borderBottom: '2px solid #f0f0f0'  
    }
}

export default ProfilePage