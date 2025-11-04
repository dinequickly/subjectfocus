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
            <span className="font-medium text-gray-900">{flashcardSet.title}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{flashcardSet.title}</h1>
              <div className="text-sm text-gray-600">{cards.length} cards</div>
              {flashcardSet.description && <p className="mt-2 text-gray-800 whitespace-pre-wrap">{flashcardSet.description}</p>}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="font-medium">Flashcards</div>
              {cards.length > 0 && (
                <button
                  onClick={() => navigate(`/study-set/${id}/flashcard-set/${setId}/practice`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                >
                  Practice Flashcards
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
                    className={`border rounded p-3 flex items-start justify-between ${editingId === card.id ? 'ring-2 ring-indigo-500' : ''}`}
                  >
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
                        <div>
                          <div className="font-medium">Term: {card.question}</div>
                          <div className="text-gray-700">Definition: {card.answer}</div>
                        </div>
                        <div className="flex items-center gap-2">
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
    </div>
  )
}
