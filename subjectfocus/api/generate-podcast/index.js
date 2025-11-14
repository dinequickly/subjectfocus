/**
 * Generate Podcast API Endpoint
 * Forwards pre-recorded podcast generation requests to n8n webhook
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      podcastId,
      title,
      type,
      durationMinutes,
      userGoal,
      flashcards
    } = req.body

    if (!podcastId) {
      return res.status(400).json({ error: 'Missing podcastId' })
    }

    console.log('[Generate Podcast] Starting generation for:', podcastId)

    // Forward to n8n webhook
    const n8nWebhookUrl = 'https://maxipad.app.n8n.cloud/webhook/generate-podcast'

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcast_id: podcastId,
        title,
        type,
        duration_minutes: durationMinutes,
        user_goal: userGoal,
        flashcards: flashcards || []
      })
    })

    if (!response.ok) {
      console.error('[Generate Podcast] n8n webhook failed:', response.status)
      throw new Error(`n8n webhook returned ${response.status}`)
    }

    console.log('[Generate Podcast] Successfully triggered n8n workflow')

    return res.status(200).json({
      success: true,
      message: 'Podcast generation started'
    })

  } catch (error) {
    console.error('[Generate Podcast] Error:', error)
    return res.status(500).json({
      error: error.message || 'Failed to start podcast generation'
    })
  }
}
