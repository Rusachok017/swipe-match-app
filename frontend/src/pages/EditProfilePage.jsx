// frontend/src/pages/EditProfilePage.jsx
import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useNavigate } from 'react-router-dom'

function EditProfilePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    gender: '',
    bio: ''
  })
  
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)

  // Загрузка текущих данных
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await api.getProfile()
      setFormData({
        username: data.username || '',
        age: data.age || '',
        gender: data.gender || '',
        bio: data.bio || ''
      })
      if (data.photo_url) {
        setAvatarPreview(data.photo_url)
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error)
      setError('Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 5MB)')
      return
    }
    
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError('')
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const updateData = {}
      if (formData.username) updateData.username = formData.username
      if (formData.age) updateData.age = parseInt(formData.age)
      if (formData.gender) updateData.gender = formData.gender
      if (formData.bio !== undefined) updateData.bio = formData.bio
      
      if (Object.keys(updateData).length > 0) {
        await api.updateProfile(updateData)
      }
      
      if (avatarFile) {
        const result = await api.uploadAvatar(avatarFile)
        if (result.photo_url) {
          setAvatarPreview(result.photo_url)
          setFormData(prev => ({
            ...prev,
            photo_url: result.photo_url
          }))
        }
      }
      
      setSuccess('✅ Профиль успешно обновлён!')
      setTimeout(() => {
        navigate('/profile')
      }, 1000)
      
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      setError(error.response?.data?.detail || 'Не удалось сохранить изменения')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('Удалить аватар?')) return
    
    try {
      await api.deleteAvatar()
      setAvatarPreview(null)
      setAvatarFile(null)
      setSuccess('Аватар удалён')
    } catch (error) {
      setError('Не удалось удалить аватар')
    }
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  if (loading) {
    return <div style={styles.loading}>Загрузка...</div>
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>✏️ Редактирование профиля</h1>
      
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}
      
      <div style={styles.form}>
        {/* Аватар */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarPreview}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarPlaceholder}>👤</div>
            )}
          </div>
          
          <div style={styles.avatarButtons}>
            <label style={styles.uploadBtn}>
              📷 Выбрать фото
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </label>
            
            {avatarPreview && (
              <button onClick={handleDeleteAvatar} style={styles.deleteAvatarBtn}>
                🗑️ Удалить
              </button>
            )}
          </div>
          
          {avatarFile && (
            <p style={styles.fileInfo}>📁 {avatarFile.name} ({(avatarFile.size / 1024).toFixed(0)} KB)</p>
          )}
        </div>
        
        {/* Поля формы */}
        <div style={styles.field}>
          <label style={styles.label}>Имя пользователя</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            style={styles.input}
            placeholder="Введите имя"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Возраст</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            style={styles.input}
            placeholder="25"
            min="18"
            max="100"
          />
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>Пол</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            style={styles.select}
          >
            <option value="">Выберите пол</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
            <option value="other">Другой</option>
          </select>
        </div>
        
        <div style={styles.field}>
          <label style={styles.label}>О себе</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            style={styles.textarea}
            placeholder="Расскажите о себе..."
            rows="4"
          />
        </div>
        
        {/* Кнопки */}
        <div style={styles.buttons}>
          <button 
            onClick={handleSave} 
            style={{...styles.btn, ...styles.saveBtn}}
            disabled={saving}
          >
            {saving ? '💾 Сохранение...' : '✅ Сохранить'}
          </button>
          
          <button 
            onClick={handleCancel} 
            style={{...styles.btn, ...styles.cancelBtn}}
          >
            ❌ Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

// Стили
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
  loading: {
    textAlign: 'center',
    fontSize: '20px',
    padding: '50px'
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  form: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  avatarSection: {
    textAlign: 'center',
    marginBottom: '30px',
    paddingBottom: '30px',
    borderBottom: '1px solid #e0e0e0'
  },
  avatarPreview: {
    width: '150px',
    height: '150px',
    margin: '0 auto 15px',
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: '#f5f5f5'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    color: '#ccc'
  },
  avatarButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  uploadBtn: {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  deleteAvatarBtn: {
    padding: '10px 20px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  fileInfo: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#666'
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '12px 15px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    color: '#333', 
  },
  textarea: {
    width: '100%',
    padding: '12px 15px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  buttons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginTop: '30px'
  },
  btn: {
    padding: '15px 40px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
    color: 'white'
  },
  cancelBtn: {
    backgroundColor: '#9e9e9e',
    color: 'white'
  },
  option: {
    color: '#333',
    backgroundColor: 'white',
    padding: '10px'
  }
}

export default EditProfilePage