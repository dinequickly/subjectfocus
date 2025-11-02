export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY
    const defaultWorkflow = process.env.CHATKIT_WORKFLOW_ID || 'wf_6907e8b911c881909b036fee34d733300fde86d3184a9aa3'
    if (!apiKey) {
      return { statusCode: 500, body: 'Missing OPENAI_API_KEY' }
    }

    const body = event.body ? JSON.parse(event.body) : {}
    const workflowId = body.workflowId || defaultWorkflow
    const user = body.userId || body.deviceId || 'anonymous'

    const res = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'chatkit_beta=v1',
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { statusCode: res.status, body: text }
    }

    const data = await res.json()
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_secret: data.client_secret }),
    }
  } catch (err) {
    return { statusCode: 500, body: String(err) }
  }
}

