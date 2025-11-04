// src/pages/PodcastPlayer.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

const GENERATION_WEBHOOK = 'https://maxipad.app.n8n.cloud/webhook/generate-prerecorded-podcast'

export default function PodcastPlayer() {
  const { id, podcastId } = useParams() // study_set_id (route param "id"), podcast_id
  const navigate = useNavigate()
  const { user } = useAuth()

  const [podcast, setPodcast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [genMsg, setGenMsg] = useState('')
  const genStartedRef = useRef(false)

  useEffect(() => {
    fetchPodcast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcastId])

  async function fetchPodcast() {
    setLoading(true)
    setError('')
    const { data, error: fetchErr } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', podcastId)
      .single()

    if (fetchErr) {
      setError(fetchErr.message)
      setLoading(false)
      return
    }

    setPodcast(data)
    setLoading(false)

    if (data.status === 'generating') {
      await maybeTriggerGeneration(data)
    }
  }

  async function maybeTriggerGeneration(current) {
    if (genStartedRef.current) return
    genStartedRef.current = true

    try {
      setGenMsg('contacting generator')

      // Build payload expected by backend
      const payload = {
        podcast_id: current.id || podcastId,
        user_id: user?.id || current.user_id || null,
        study_set_id: current.study_set_id || id || null,
        type: current.type,
        title: current.title,
        duration_minutes: current.duration_minutes,
        user_goal: current.user_goal || '',
        reference_set: !!current.reference_set
      }

      // Kick off generation
      const resp = await fetch(GENERATION_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // Handle non-200
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`generation request failed: ${resp.status} ${text}`)
      }

      // Expect JSON with at least { status } and maybe { audio_url }
      const body = await resp.json().catch(() => ({}))
      const nextStatus = body.status || 'ready'
      const audioUrl = body.audio_url || body.audio || null

      // If ready and audio_url present, persist
      if (nextStatus === 'ready' && audioUrl) {
        setGenMsg('saving audio url')
        const { error: upErr } = await supabase
          .from('podcasts')
          .update({ status: 'ready', audio_url: audioUrl })
          .eq('id', podcastId)

        if (upErr) throw upErr

        // Refresh local state
        setPodcast((p) => (p ? { ...p, status: 'ready', audio_url: audioUrl, updated_at: new Date().toISOString() } : p))
        setGenMsg('ready')
        return
      }

      // If still generating, leave status as is. Optional polling hook:
      setGenMsg(typeof body.message === 'string' ? body.message : 'generation in progress')
      // You can add polling here if your webhook returns a job id.
    } catch (e) {
      console.error(e)
      setError(e.message || 'generation failed')
      setGenMsg('marking failed')

      // Mark failed
      await supabase.from('podcasts').update({ status: 'failed' }).eq('id', podcastId)
      setPodcast((p) => (p ? { ...p, status: 'failed', updated_at: new Date().toISOString() } : p))
    }
  }

  async function deletePodcast() {
    if (!confirm('Delete this podcast?')) return

    const { error: deleteErr } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', podcastId)

    if (deleteErr) {
      alert('Failed to delete: ' + deleteErr.message)
    } else {
      navigate(`/study-set/${id}/podcasts`)
    }
  }

  function getTypeLabel(type) {
    const labels = {
      'pre-recorded': 'Pre-Recorded',
      'live-tutor': 'Live Tutor',
      'live-interactive': 'Live Interactive'
    }
    return labels[type] || type
  }

  if (loading) return <div className="p-6">Loading podcast...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!podcast) return <div className="p-6">Podcast not found</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Top Bar */}
        <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/study-set/${id}/podcasts`)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-bold">{podcast.title}</h1>
                <div className="text-sm text-gray-500">
                  {getTypeLabel(podcast.type)} · {podcast.duration_minutes} min
                </div>
              </div>
            </div>
            <button
              onClick={deletePodcast}
              className="px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Player Area */}
        <div className="bg-white rounded-b-lg shadow-sm border border-t-0 p-6">
          {podcast.status === 'generating' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-medium mb-2">Generating Podcast...</h2>
              <p className="text-gray-600">
                Your podcast is being created based on your preferences.
              </p>
              {genMsg && <div className="mt-2 text-xs text-gray-500">Status: {genMsg}</div>}
              {podcast.user_goal && (
                <div className="mt-4 p-4 bg-gray-50 rounded max-w-md mx-auto text-left">
                  <div className="text-sm font-medium text-gray-700 mb-1">Your Goal:</div>
                  <div className="text-sm text-gray-600">{podcast.user_goal}</div>
                </div>
              )}
            </div>
          )}

          {podcast.status === 'ready' && podcast.audio_url && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-medium mb-2">Ready to Listen</h2>
                <p className="text-gray-600">Your podcast is ready.</p>
              </div>

              {/* Audio Player */}
              <div className="bg-gray-50 rounded-lg p-6">
                <audio controls className="w-full" src={podcast.audio_url}>
                  Your browser does not support audio playback.
                </audio>
              </div>

              {podcast.user_goal && (
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-700 mb-1">Your Goal:</div>
                  <div className="text-sm text-gray-600">{podcast.user_goal}</div>
                </div>
              )}
            </div>
          )}

          {podcast.status === 'failed' && (
            <div className="text-center py-12">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-medium mb-2">Generation Failed</h2>
              <p className="text-gray-600 mb-6">
                Something went wrong while generating your podcast. Please try again.
              </p>
              <button
                onClick={() => navigate(`/study-set/${id}/podcasts/create`)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Create New Podcast
              </button>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t text-xs text-gray-500">
            <div>Created {new Date(podcast.created_at).toLocaleString()}</div>
            <div>Last updated {new Date(podcast.updated_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
