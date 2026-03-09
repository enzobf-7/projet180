import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminMessagerieClient from './AdminMessagerieClient'

export type Message = {
  id:           string
  sender_id:    string
  recipient_id: string
  content:      string
  read:         boolean
  created_at:   string
}

export type ClientConvo = {
  clientId:    string
  firstName:   string
  lastMessage: string
  lastAt:      string
  unread:      number
  messages:    Message[]
}

export default async function AdminMessageriePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()

  // Verify admin role
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch all messages involving admin
  const { data: allMessages } = await admin
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: true })

  const messages: Message[] = (allMessages ?? []) as Message[]

  // Collect unique client IDs
  const clientIds = Array.from(new Set(
    messages
      .map(m => m.sender_id === user.id ? m.recipient_id : m.sender_id)
      .filter(Boolean)
  ))

  // Fetch first names from questionnaire_responses
  const { data: questionnaires } = clientIds.length > 0
    ? await admin
        .from('questionnaire_responses')
        .select('client_id, responses')
        .in('client_id', clientIds)
    : { data: [] }

  const nameMap: Record<string, string> = {}
  for (const q of questionnaires ?? []) {
    const r = (q.responses as Record<string, unknown>) ?? {}
    const raw = (r.full_name as string) ?? ''
    nameMap[q.client_id] = raw.split(' ')[0] || 'Client'
  }

  // Group messages by client, build ClientConvo[]
  const convoMap: Record<string, Message[]> = {}
  for (const msg of messages) {
    const clientId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
    if (!convoMap[clientId]) convoMap[clientId] = []
    convoMap[clientId].push(msg)
  }

  const convos: ClientConvo[] = clientIds.map(clientId => {
    const msgs    = convoMap[clientId] ?? []
    const last    = msgs[msgs.length - 1]
    const unread  = msgs.filter(m => m.sender_id !== user.id && !m.read).length
    return {
      clientId,
      firstName:   nameMap[clientId] ?? 'Client',
      lastMessage: last?.content ?? '',
      lastAt:      last?.created_at ?? '',
      unread,
      messages:    msgs,
    }
  }).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

  return (
    <AdminMessagerieClient
      adminId={user.id}
      convos={convos}
    />
  )
}
