import React from 'react'

function SwipeCard({ user, onLike, onDislike }) {
  if (!user) {
    return (
      <div style={styles.noUsers}>
        <h2>Анкеты закончились</h2>
        <p>Заходи позже!</p>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      {/* Фото пользователя */}
      <img 
        src={user.photo_url?.startsWith('http') ? user.photo_url : `http://127.0.0.1:8001${user.photo_url}`}
        alt={user.username}
        style={styles.photo}
        onError={(e) => {
          e.target.src = `https://i.pravatar.cc/150?img=${user.id % 50}`
  }}
      />
      
      {/* Информация */}
      <div style={styles.info}>
        <h2 style={styles.name}>
          {user.username}, {user.age}
        </h2>
        <p style={styles.bio}>{user.bio || 'Нет био'}</p>
      </div>
      
      {/* Кнопки */}
      <div style={styles.buttons}>
        <button 
          onClick={() => onDislike(user.id)}
          style={{...styles.button, ...styles.dislike}}
        >
          Дизлайк
        </button>
        
        <button 
          onClick={() => onLike(user.id)}
          style={{...styles.button, ...styles.like}}
        >
          Лайк
        </button>
      </div>
    </div>
  )
}

// Стили
const styles = {
  card: {
    maxWidth: '400px',
    margin: '20px auto',
    padding: '20px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    backgroundColor: 'white',
    textAlign: 'center'
  },
  photo: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    borderRadius: '15px',
    marginBottom: '15px'
  },
  info: {
    marginBottom: '20px'
  },
  name: {
    fontSize: '28px',
    margin: '10px 0',
    color: '#333'
  },
  bio: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.5'
  },
  buttons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px'
  },
  button: {
    padding: '15px 40px',
    fontSize: '18px',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    fontWeight: 'bold'
  },
  like: {
    backgroundColor: '#4CAF50',
    color: 'white'
  },
  dislike: {
    backgroundColor: '#f44336',
    color: 'white'
  },
  noUsers: {
    textAlign: 'center',
    padding: '50px',
    backgroundColor: 'white',
    borderRadius: '20px',
    maxWidth: '400px',
    margin: '20px auto'
  }
}

export default SwipeCard