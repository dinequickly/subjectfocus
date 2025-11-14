/**
 * Generate Podcast Netlify Function
 * Forwards pre-recorded podcast generation requests to n8n webhook
 */

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const {
      podcastId,
      title,
      type,
      durationMinutes,
      userGoal,
      flashcards
    } = JSON.parse(event.body)

    if (!podcastId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing podcastId' })
      }
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Podcast generation started'
      })
    }

  } catch (error) {
    console.error('[Generate Podcast] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to start podcast generation'
      })
    }
  }
}
