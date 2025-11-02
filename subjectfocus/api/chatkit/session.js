export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const defaultWorkflow = process.env.CHATKIT_WORKFLOW_ID || 'wf_6907e8b911c881909b036fee34d733300fde86d3184a9aa3'
    if (!apiKey) {
      res.status(500).send('Missing OPENAI_API_KEY')
      return
    }
    const { workflowId, userId, deviceId } = req.body || {}
    const user = userId || deviceId || 'anonymous'
    const res2 = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'chatkit_beta=v1',
      },
      body: JSON.stringify({ workflow: { id: workflowId || defaultWorkflow }, user }),
    })
    const data = await res2.json()
    if (!res2.ok) {
      res.status(res2.status).send(data)
      return
    }
    res.status(200).json({ client_secret: data.client_secret })
  } catch (e) {
    res.status(500).send(String(e))
  }
}

