import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import AIChatPanel from '../components/AIChatPanel'

export default function FlashcardSetDetail() {
  const { id, setId } = useParams() // study_set_id, flashcard_set_id
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [studySet, setStudySet] = useState(null)
  const [flashcardSet, setFlashcardSet] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // New card fields
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [creatingCard, setCreatingCard] = useState(false)

  // Edit existing card state
  const [editingId, setEditingId] = useState(null)
  const [editTerm, setEditTerm] = useState('')
  const [editDefinition, setEditDefinition] = useState('')

  // Edit set modal
  const [showEditSetModal, setShowEditSetModal] = useState(false)
  const [editSetTitle, setEditSetTitle] = useState('')
  const [editSetDescription, setEditSetDescription] = useState('')
  const [updatingSet, setUpdatingSet] = useState(false)

  // Bulk selection and move
  const [selectedCards, setSelectedCards] = useState([])
  const [availableSets, setAvailableSets] = useState([])
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [targetSetId, setTargetSetId] = useState('')
  const [movingCards, setMovingCards] = useState(false)

  const addTermRef = useRef(null)

  const canRender = useMemo(() => !!id && !!setId, [id, setId])

  useEffect(() => {
    if (!canRender) return
    let mounted = true
    ;(async () => {
      // Fetch study set
      const { data: studySetData, error: studySetErr } = await supabase
        .from('study_sets')
        .select('id, title, subject_area')
        .eq('id', id)
        .single()
      if (!mounted) return
      if (studySetErr) { setError(studySetErr.message); setLoading(false); return }
      setStudySet(studySetData)

      // Fetch flashcard set
      const { data: setData, error: setErr } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', setId)
        .single()
      if (!mounted) return
      if (setErr) { setError(setErr.message); setLoading(false); return }
      setFlashcardSet(setData)

      // Fetch flashcards for this set
      const { data: cardsData } = await supabase
        .from('flashcards')
        .select('id, question, answer, starred')
        .eq('flashcard_set_id', setId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      setCards(cardsData || [])

      // If editCard param exists, scroll to that card
      const editCardId = searchParams.get('editCard')
      if (editCardId) {
        setTimeout(() => {
          const cardElement = document.getElementById(`card-${editCardId}`)
          if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setEditingId(editCardId)
          }
        }, 100)
      }

      setLoading(false)
    })()
    return () => { mounted = false }
  }, [id, setId, canRender, searchParams])

  // Fetch available sets for move functionality
  useEffect(() => {
    if (!id) return
    async function fetchAvailableSets() {
      const { data } = await supabase
        .from('flashcard_sets')
        .select('id, title, is_default')
        .eq('study_set_id', id)
        .order('is_default', { ascending: false })
        .order('title', { ascending: true })
      setAvailableSets(data || [])
    }
    fetchAvailableSets()
  }, [id])

  async function addCard(e) {
    e.preventDefault()
    if (!term.trim() || !definition.trim()) return
    setCreatingCard(true)
    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        study_set_id: id,
        flashcard_set_id: setId,
        question: term.trim(),
        answer: definition.trim()
      })
      .select('id, question, answer')
      .single()
    setCreatingCard(false)
    if (error) setError(error.message)
    else {
      setCards(c => [...c, data])
      setTerm(''); setDefinition('')
      addTermRef.current?.focus()
    }
  }

  function startEdit(card) {
    setEditingId(card.id)
    setEditTerm(card.question || '')
    setEditDefinition(card.answer || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTerm('')
    setEditDefinition('')
  }

  async function saveEdit() {
    if (!editingId) return
    if (!editTerm.trim() || !editDefinition.trim()) return
    const { data, error } = await supabase
      .from('flashcards')
      .update({ question: editTerm.trim(), answer: editDefinition.trim() })
      .eq('id', editingId)
      .select('id, question, answer')
      .single()
    if (!error && data) {
      setCards(cs => cs.map(c => (c.id === editingId ? data : c)))
      cancelEdit()
    } else if (error) {
      setError(error.message)
    }
  }

  async function deleteCard(card) {
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', card.id)
    if (!error) setCards(cs => cs.filter(c => c.id !== card.id))
  }

  async function toggleStar(card) {
    const newStarred = !card.starred
    const { error } = await supabase
      .from('flashcards')
      .update({ starred: newStarred })
      .eq('id', card.id)
    if (!error) {
      setCards(cs => cs.map(c => c.id === card.id ? { ...c, starred: newStarred } : c))
    }
  }

  const chatContext = useMemo(() => ({
    study_set_id: id,
    flashcard_set_id: setId,
    user_id: user?.id,
    title: studySet?.title,
    set_title: flashcardSet?.title,
    subject: studySet?.subject_area,
    cards: cards.map(card => ({ term: card.question, definition: card.answer })),
  }), [studySet, flashcardSet, cards, user, id, setId])

  async function handleAIFlashcard(card) {
    if (card.error) throw new Error(card.error)
    const term = card.term?.trim()
    const definition = card.definition?.trim()
    if (!term || !definition) throw new Error('Missing term or definition')

    if (card.id) {
      setCards(prev => [...prev, { id: card.id, question: term, answer: definition }])
      return
    }

    const payload = {
      study_set_id: id,
      flashcard_set_id: setId,
      question: term,
      answer: definition,
    }
    const { data, error } = await supabase
      .from('flashcards')
      .insert(payload)
      .select('id, question, answer')
      .single()
    if (error) throw new Error(error.message)
    setCards(prev => [...prev, data])
  }

  function openEditSetModal() {
    setEditSetTitle(flashcardSet.title)
    setEditSetDescription(flashcardSet.description || '')
    setShowEditSetModal(true)
  }

  async function updateSetInfo(e) {
    e.preventDefault()
    if (!editSetTitle.trim()) return

    setUpdatingSet(true)
    const { error } = await supabase
      .from('flashcard_sets')
      .update({
        title: editSetTitle.trim(),
        description: editSetDescription.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', setId)

    setUpdatingSet(false)

    if (error) {
      console.error('Error updating set:', error)
      alert('Failed to update flashcard set')
      return
    }

    setFlashcardSet(prev => ({
      ...prev,
      title: editSetTitle.trim(),
      description: editSetDescription.trim() || null
    }))
    setShowEditSetModal(false)
  }

  async function deleteSet() {
    if (flashcardSet.is_default) {
      alert("Cannot delete the default flashcard set")
      return
    }

    const confirmed = confirm(
      `Delete "${flashcardSet.title}"?\n\nAll ${cards.length} cards in this set will be permanently deleted. This action cannot be undone.`
    )
    if (!confirmed) return

    const { error } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', setId)

    if (error) {
      console.error('Error deleting set:', error)
      alert('Failed to delete flashcard set')
      return
    }

    navigate(`/study-set/${id}/flashcard-sets`)
  }

  function toggleCardSelection(cardId) {
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  function selectAllCards() {
    if (selectedCards.length === cards.length) {
      setSelectedCards([])
    } else {
      setSelectedCards(cards.map(c => c.id))
    }
  }

  function openMoveModal() {
    if (selectedCards.length === 0) return
    setTargetSetId('')
    setShowMoveModal(true)
  }

  async function moveCards(e) {
    e.preventDefault()
    if (!targetSetId || selectedCards.length === 0) return

    setMovingCards(true)
    const { error } = await supabase
      .from('flashcards')
      .update({ flashcard_set_id: targetSetId })
      .in('id', selectedCards)

    setMovingCards(false)

    if (error) {
      console.error('Error moving cards:', error)
      alert('Failed to move cards')
      return
    }

    // Remove moved cards from UI (trigger will update card_count)
    setCards(prev => prev.filter(card => !selectedCards.includes(card.id)))
    setSelectedCards([])
    setShowMoveModal(false)
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!studySet || !flashcardSet) return <div className="p-6">Not found</div>

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {/* Breadcrumb */}
          <div className="text-sm text-gray-600">
            <button onClick={() => navigate(`/study-set/${id}`)} className="hover:text-gray-900">
              {studySet.title}
            </button>
            {' > '}
            <button onClick={() => navigate(`/study-set/${id}/flashcard-sets`)} className="hover:text-gray-900">
              Flashcard Sets
            </button>
            {' > '}
            <span className="font-medium text-gray-900">{flashcardSet.title}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{flashcardSet.title}</h1>
                {flashcardSet.is_default && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-medium">
                    Default Set
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">{cards.length} cards</div>
              {flashcardSet.description && <p className="mt-2 text-gray-800 whitespace-pre-wrap">{flashcardSet.description}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={openEditSetModal}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
              >
                ✏️ Edit Set
              </button>
              {!flashcardSet.is_default && (
                <button
                  onClick={deleteSet}
                  className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="font-medium">Flashcards</div>
                {cards.length > 0 && (
                  <>
                    <button
                      onClick={() => navigate(`/study-set/${id}/flashcard-set/${setId}/practice`)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                    >
                      Practice Flashcards
                    </button>
                    {availableSets.length > 1 && (
                      <button
                        onClick={selectAllCards}
                        className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
                      >
                        {selectedCards.length === cards.length ? '☑️ Deselect All' : '☐ Select All'}
                      </button>
                    )}
                  </>
                )}
              </div>
              {selectedCards.length > 0 && availableSets.length > 1 && (
                <button
                  onClick={openMoveModal}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
                >
                  Move {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} →
                </button>
              )}
            </div>
            {cards.length === 0 ? (
              <div className="text-sm text-gray-700">No flashcards yet. Add your first card!</div>
            ) : (
              <ul className="space-y-2">
                {cards.map(card => (
                  <li
                    key={card.id}
                    id={`card-${card.id}`}
                    className={`border rounded p-3 flex items-start gap-3 ${
                      editingId === card.id ? 'ring-2 ring-indigo-500' : ''
                    } ${
                      selectedCards.includes(card.id) ? 'bg-purple-50 border-purple-300' : ''
                    }`}
                  >
                    {/* Checkbox for bulk selection */}
                    {availableSets.length > 1 && editingId !== card.id && (
                      <input
                        type="checkbox"
                        checked={selectedCards.includes(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                    )}

                    {editingId === card.id ? (
                      <div className="w-full">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input className="border rounded px-3 py-2" placeholder="Term" value={editTerm} onChange={e=>setEditTerm(e.target.value)} />
                          <input className="border rounded px-3 py-2" placeholder="Definition" value={editDefinition} onChange={e=>setEditDefinition(e.target.value)} />
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={saveEdit} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">Save</button>
                          <button onClick={cancelEdit} className="px-3 py-1.5 border rounded text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium">Term: {card.question}</div>
                          <div className="text-gray-700">Definition: {card.answer}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => toggleStar(card)}
                            className="text-xl"
                            title={card.starred ? 'Unstar' : 'Star'}
                          >
                            {card.starred ? '⭐' : '☆'}
                          </button>
                          <button onClick={() => startEdit(card)} className="text-sm underline">Edit</button>
                          <button onClick={() => deleteCard(card)} className="text-sm text-red-600 underline">Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={addCard} className="mt-4 grid gap-2 sm:grid-cols-2">
              <input ref={addTermRef} className="border rounded px-3 py-2" placeholder="Term" value={term} onChange={e=>setTerm(e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="Definition" value={definition} onChange={e=>setDefinition(e.target.value)} />
              <div className="sm:col-span-2">
                <button disabled={creatingCard} className="bg-indigo-600 text-white px-4 py-2 rounded">Add Flashcard</button>
              </div>
            </form>
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="border rounded p-4 sticky top-4 space-y-4">
            <div className="font-medium">Quick Actions</div>

            <div className="space-y-2">
              <button onClick={() => addTermRef.current?.focus()} className="w-full px-3 py-2 border rounded text-left">+ Add Flashcard</button>
              <button onClick={() => navigate(`/study-set/${id}`)} className="w-full px-3 py-2 border rounded text-left">← Back to Overview</button>
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="text-sm text-gray-600">AI Assistant</div>
              <AIChatPanel context={chatContext} onFlashcard={handleAIFlashcard} />
            </div>
          </div>
        </aside>
      </div>

      {/* Edit Set Modal */}
      {showEditSetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Edit Flashcard Set</h2>
            <form onSubmit={updateSetInfo}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Set Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSetTitle}
                  onChange={(e) => setEditSetTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editSetDescription}
                  onChange={(e) => setEditSetDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditSetModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={updatingSet}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingSet || !editSetTitle.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingSet ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Cards Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              Move {selectedCards.length} Card{selectedCards.length !== 1 ? 's' : ''}
            </h2>
            <form onSubmit={moveCards}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select destination flashcard set:
                </label>
                <select
                  value={targetSetId}
                  onChange={(e) => setTargetSetId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  autoFocus
                >
                  <option value="">-- Choose a set --</option>
                  {availableSets
                    .filter(set => set.id !== setId)
                    .map(set => (
                      <option key={set.id} value={set.id}>
                        {set.title} {set.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  The selected cards will be moved from "{flashcardSet.title}" to the destination set.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoveModal(false)
                    setTargetSetId('')
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={movingCards}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={movingCards || !targetSetId}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {movingCards ? 'Moving...' : 'Move Cards'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
