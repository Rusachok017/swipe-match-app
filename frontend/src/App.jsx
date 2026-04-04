import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from './services/api'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage.jsx'

function App() {
  const [isAuth, setIsAuth] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (api.isAuthenticated()) {
      try {
        const userData = await api.getCurrentUser()
        setUser(userData)
        setIsAuth(true)
      } catch (error) {
        api.logout()
        setIsAuth(false)
      }
    }
  }

  const handleLogout = () => {
    api.logout()
    setIsAuth(false)
    setUser(null)
  }

  return (
    <Router>
      <div>
        {isAuth && (
          <nav style={styles.nav}>
            <Link to="/" style={styles.link}>🏠 Главная</Link>
            <span style={styles.username}>👤 {user?.username}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Выйти</button>
          </nav>
        )}
        <Routes>
          <Route path="/login" element={isAuth ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/register" element={isAuth ? <Navigate to="/" /> : <RegisterPage />} />
          <Route path="/" element={isAuth ? <HomePage /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  )
}

const styles = {
  nav: {
    padding: '15px',
    background: '#ff6b6b',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  username: {
    color: 'white',
    fontSize: '18px'
  },
  logoutBtn: {
    padding: '8px 20px',
    backgroundColor: 'white',
    color: '#ff6b6b',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
}

export default App