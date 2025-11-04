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

  // Create new set modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSetTitle, setNewSetTitle] = useState('')
  const [newSetDescription, setNewSetDescription] = useState('')
  const [creating, setCreating] = useState(false)

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
    setLoading(false)
  }

  async function createNewSet(e) {
    e.preventDefault()
    if (!newSetTitle.trim()) return

    setCreating(true)
    const { data, error } = await supabase
      .from('flashcard_sets')
      .insert({
        study_set_id: id,
        user_id: user.id,
        title: newSetTitle.trim(),
        description: newSetDescription.trim() || null,
        is_default: false,
        card_count: 0
      })
      .select()
      .single()

    setCreating(false)

    if (error) {
      console.error('Error creating flashcard set:', error)
      alert('Failed to create flashcard set')
      return
    }

    // Navigate to new set
    navigate(`/study-set/${id}/flashcard-set/${data.id}`)
  }

  if (loading) {
    return <div className="p-6">Loading flashcard sets...</div>
  }

  if (!studySet) {
    return <div className="p-6 text-red-600">Study set not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => navigate(`/study-set/${id}`)}
          className="text-gray-600 hover:text-gray-900 mb-4"
        >
          ← Back to {studySet.title}
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">📚 Flashcard Sets</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            + Create New Set
          </button>
        </div>

        {flashcardSets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <p className="text-gray-500 mb-4">No flashcard sets found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Your First Set
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flashcardSets.map(set => (
              <button
                key={set.id}
                onClick={() => navigate(`/study-set/${id}/flashcard-set/${set.id}`)}
                className={`bg-white rounded-lg shadow-sm border p-6 text-left hover:shadow-md transition-all ${
                  set.is_default ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg flex-1">{set.title}</h3>
                  {set.is_default && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-medium">
                      Default
                    </span>
                  )}
                </div>
                {set.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{set.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">📚 {set.card_count} cards</span>
                  <span className="text-indigo-600 font-medium">View →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create New Set Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Flashcard Set</h2>
            <form onSubmit={createNewSet}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Set Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSetTitle}
                  onChange={(e) => setNewSetTitle(e.target.value)}
                  placeholder="e.g., Chapter 5 Vocab, Midterm Review"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                  placeholder="Add notes about this flashcard set..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewSetTitle('')
                    setNewSetDescription('')
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newSetTitle.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Set'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
