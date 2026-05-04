import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import SwipeCard from '../components/SwipeCard'

function HomePage() {
  const [candidates, setCandidates] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null) 

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    console.log('🔍 UserID из localStorage:', userId)
    
    if (userId) {
      setCurrentUserId(parseInt(userId))
    } else {
      console.error('❌ userId не найден в localStorage!')
    }
  }, [])

  useEffect(() => {
    if (currentUserId) {  
      console.log('✅ Загружаем кандидатов для user_id:', currentUserId)
      loadCandidates()
    }
  }, [currentUserId])  

  const loadCandidates = async () => {
    try {
      setLoading(true)
      console.log('📡 Запрос кандидатов для user_id:', currentUserId)
      const data = await api.getCandidates(currentUserId, 10)
      console.log('📥 Получено кандидатов:', data.length)
      
      setCandidates(data)
      setCurrentIndex(0)
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error)
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
      loadCandidates()
    }
  }

  const currentUser = candidates[currentIndex]

  if (!currentUserId) {
    return <div style={styles.loading}>Загрузка...</div> 
  }

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