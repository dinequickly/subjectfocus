import { ChatKit, useChatKit } from '@openai/chatkit-react'
import { useAuth } from '../hooks/useAuth'

export default function ChatKitWidget({ workflowId }) {
  const { user } = useAuth()
  const { control } = useChatKit({
    api: {
      async getClientSecret() {
        const res = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowId, userId: user?.id }),
        })
        const { client_secret } = await res.json()
        return client_secret
      },
    },
  })

  return (
    <div className="border rounded">
      <ChatKit control={control} className="h-[520px] w-full" />
    </div>
  )
}

