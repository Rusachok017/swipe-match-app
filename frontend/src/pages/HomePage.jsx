const [currentUserId, setCurrentUserId] = useState(1)

useEffect(() => {
  const userId = localStorage.getItem('userId')
  if (userId) {
    setCurrentUserId(parseInt(userId))
  }
}, [])

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