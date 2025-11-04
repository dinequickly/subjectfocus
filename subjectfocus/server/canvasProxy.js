/**
 * Canvas API Proxy
 * Handles Canvas API requests to bypass CORS restrictions
 */

export async function handleCanvasRequest(body) {
  const { endpoint, method = 'GET', canvasToken, canvasDomain } = body

  if (!endpoint) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing endpoint parameter' })
    }
  }

  if (!canvasToken || !canvasDomain) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Canvas credentials not provided' })
    }
  }

  try {
    // Construct full Canvas API URL
    const url = `https://${canvasDomain}${endpoint}`

    // Make request to Canvas API
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Canvas API error:', response.status, errorText)

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `Canvas API error: ${response.statusText}`,
          details: errorText
        })
      }
    }

    const data = await response.json()

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('Canvas proxy error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch from Canvas API',
        message: error.message
      })
    }
  }
}
