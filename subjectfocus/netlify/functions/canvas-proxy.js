import { handleCanvasRequest } from '../../server/canvasProxy.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const result = await handleCanvasRequest(body)

    return {
      statusCode: result.statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: result.body,
    }
  } catch (error) {
    console.error('Canvas proxy function error', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Canvas proxy failed' }),
    }
  }
}
