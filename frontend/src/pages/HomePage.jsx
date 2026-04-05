// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import SwipeCard from '../components/SwipeCard'

function HomePage() {
  const [candidates, setCandidates] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(1)

  // Получаем ID текущего пользователя при загрузке
  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (userId) {
      setCurrentUserId(parseInt(userId))
    }
  }, [])

  // Загрузка кандидатов при старте
  useEffect(() => {
    loadCandidates()
  }, [currentUserId])

  const loadCandidates = async () => {
    try {
      setLoading(true)
      const data = await api.getCandidates(currentUserId, 10)
      setCandidates(data)
      setCurrentIndex(0)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (userId) => {
    try {
      const result = await api.makeSwipe(currentUserId, userId, true)
      
      if (result.is_match) {
        setMatch({ message: '🎉 Мэтч!', userId })
        setTimeout(() => setMatch(null), 3000)
      }
      
      nextCard()
    } catch (error) {
      console.error('Ошибка свайпа:', error)
      nextCard()
    }
  }

  const handleDislike = async (userId) => {
    try {
      await api.makeSwipe(currentUserId, userId, false)
      nextCard()
    } catch (error) {
      console.error('Ошибка свайпа:', error)
      nextCard()
    }
  }

  const nextCard = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Загрузить ещё кандидатов
      loadCandidates()
    }
  }

  const currentUser = candidates[currentIndex]

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔥 Swipe Match</h1>
      
      {match && (
        <div style={styles.matchPopup}>
          {match.message}
        </div>
      )}
      
      {loading ? (
        <div style={styles.loading}>Загрузка...</div>
      ) : (
        <SwipeCard
          user={currentUser}
          onLike={handleLike}
          onDislike={handleDislike}
        />
      )}
      
      <div style={styles.counter}>
        {candidates.length > 0 ? `${currentIndex + 1} из ${candidates.length}` : 'Нет анкет'}
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
    fontSize: '36px',
    marginBottom: '20px'
  },
  loading: {
    textAlign: 'center',
    fontSize: '20px',
    padding: '50px'
  },
  matchPopup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#ff6b6b',
    color: 'white',
    padding: '30px 60px',
    borderRadius: '20px',
    fontSize: '32px',
    fontWeight: 'bold',
    zIndex: 1000,
    animation: 'pulse 0.5s ease-in-out'
  },
  counter: {
    textAlign: 'center',
    color: '#666',
    marginTop: '20px',
    fontSize: '16px'
  }
}

export default HomePage