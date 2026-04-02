import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'

function App() {
  return (
    <Router>
      <div>
        <nav style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px' }}>
          <Link to="/" style={{ marginRight: '10px' }}>🏠 Главная</Link>
          <Link to="/profile">👤 Профиль</Link>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<h1>👤 Профиль (в разработке)</h1>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App