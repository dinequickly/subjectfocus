import { handleCanvasRequest } from '../../server/canvasProxy.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const result = await handleCanvasRequest(req.body || {})

    res.status(result.statusCode).json(JSON.parse(result.body))
  } catch (error) {
    console.error('Canvas proxy handler error', error)
    res.status(500).json({ error: error.message || 'Canvas proxy failed' })
  }
}
