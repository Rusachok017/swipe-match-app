// frontend/src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useNavigate } from 'react-router-dom'

function ProfilePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keywords, setKeywords] = useState([])
  const [profile, setProfile] = useState(null)
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      setLoading(true)
      const [profileData, filtersData] = await Promise.all([
        api.getProfile(),
        api.getFilters()
      ])
      setProfile(profileData)
      setKeywords(filtersData.keywords || [])
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
  
  if (loading) {
    return <div style={styles.loading}>Загрузка...</div>
  }
  
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>👤 Мой профиль</h1>
      
      {/* Основная информация */}
      <div style={styles.section}>
        <h2>📝 Информация</h2>
        <p><strong>Имя:</strong> {profile?.username}</p>
        <p><strong>Возраст:</strong> {profile?.age}</p>
        <p><strong>Био:</strong> {profile?.bio || 'Не указано'}</p>
        <button onClick={() => navigate('/profile/edit')} style={styles.editBtn}>
          ✏️ Редактировать
        </button>
      </div>
      
      {/* 🔥 Фильтры по ключевым словам 🔥 */}
      <div style={styles.section}>
        <h2>🔍 Фильтры анкет</h2>
        <p style={styles.hint}>
          <strong>🟢 Белый список:</strong> показывать только анкеты с этим словом<br/>
          <strong>🔴 Чёрный список:</strong> скрыть анкеты с этим словом<br/>
          <strong>⚪ Нейтрально:</strong> не влияет на фильтрацию<br/>
        </p>
        
        {/* Сетка ключевых слов */}
        <div style={styles.keywordsGrid}>
          {keywords.map((item) => (
            <div key={item.keyword} style={styles.keywordCard}>
              <span style={styles.keywordText}>{item.keyword}</span>
              
              <div style={styles.keywordButtons}>
                {/* Белый список */}
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
                
                {/* Нейтрально */}
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
                
                {/* Чёрный список */}
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
        
        {/* Статистика */}
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
      
      {/* Навигация */}
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
  }
}

export default ProfilePage