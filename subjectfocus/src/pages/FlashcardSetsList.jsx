import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function FlashcardSetsList() {
  const { id } = useParams() // study_set_id
  const navigate = useNavigate()
  const { user } = useAuth()

  const [studySet, setStudySet] = useState(null)
  const [flashcardSets, setFlashcardSets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFlashcardSets()
  }, [id])

  async function fetchFlashcardSets() {
    setLoading(true)

    // Fetch study set
    const { data: setData, error: setError } = await supabase
      .from('study_sets')
      .select('*')
      .eq('id', id)
      .single()

    if (setError) {
      console.error('Error fetching study set:', setError)
      setLoading(false)
      return
    }

    setStudySet(setData)

    // Fetch flashcard sets
    const { data: setsData, error: setsError } = await supabase
      .from('flashcard_sets')
      .select('*')
      .eq('study_set_id', id)
      .order('is_default', { ascending: false }) // Default first
      .order('created_at', { ascending: true })

    if (setsError) {
      console.error('Error fetching flashcard sets:', setsError)
      setLoading(false)
      return
    }

    setFlashcardSets(setsData || [])

    // Phase 1: Auto-redirect to default set
    if (setsData && setsData.length > 0) {
      const defaultSet = setsData.find(s => s.is_default) || setsData[0]
      navigate(`/study-set/${id}/flashcard-set/${defaultSet.id}`, { replace: true })
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="p-6">Loading flashcard sets...</div>
  }

  if (!studySet) {
    return <div className="p-6 text-red-600">Study set not found</div>
  }

  // Phase 1: This won't render since we auto-redirect above
  // Phase 2: Will show list of all sets with create button
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate(`/study-set/${id}`)}
          className="text-gray-600 hover:text-gray-900 mb-4"
        >
          ← Back to {studySet.title}
        </button>

        <h1 className="text-2xl font-bold mb-6">Flashcard Sets</h1>

        {flashcardSets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <p className="text-gray-500">No flashcard sets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flashcardSets.map(set => (
              <button
                key={set.id}
                onClick={() => navigate(`/study-set/${id}/flashcard-set/${set.id}`)}
                className="w-full bg-white rounded-lg shadow-sm border p-6 text-left hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{set.title}</h3>
                      {set.is_default && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                          Default
                        </span>
                      )}
                    </div>
                    {set.description && (
                      <p className="text-sm text-gray-600 mb-2">{set.description}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      📚 {set.card_count} cards
                    </div>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
