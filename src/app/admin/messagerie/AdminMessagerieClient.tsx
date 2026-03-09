'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { ClientConvo, Message } from './page'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#060606',
  surface: '#0F0F0F',
  sidebar: '#080808',
  border:  '#1E1E1E',
  muted:   '#484848',
  dimmed:  '#161616',
  text:    '#F0F0F0',
  accent:  '#8B1A1A',
  accentL: '#A32020',
  gold:    '#C9A84C',
}
const D = { fontFamily: '"Barlow Condensed", sans-serif' } as const
const M = { fontFamily: '"JetBrains Mono", monospace' }    as const

function fmtTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday)     return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (isYesterday) return `Hier · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDay(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday)     return "Aujourd'hui"
  if (isYesterday) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface Props {
  adminId: string
  convos:  ClientConvo[]
}

export default function AdminMessagerieClient({ adminId, convos: initialConvos }: Props) {
  const router = useRouter()
  const [convos, setConvos]           = useState<ClientConvo[]>(initialConvos)
  const [selectedId, setSelectedId]   = useState<string | null>(initialConvos[0]?.clientId ?? null)
  const [input, setInput]             = useState('')
  const [sending, setSending]         = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selected = convos.find(c => c.clientId === selectedId) ?? null

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.messages.length])

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase
      .channel('admin-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message
          // Only care if Robin is involved
          if (msg.sender_id !== adminId && msg.recipient_id !== adminId) return
          const clientId = msg.sender_id === adminId ? msg.recipient_id : msg.sender_id

          setConvos(prev => {
            const exists = prev.find(c => c.clientId === clientId)
            if (exists) {
              return prev
                .map(c => c.clientId === clientId
                  ? {
                      ...c,
                      messages:    [...c.messages, msg],
                      lastMessage: msg.content,
                      lastAt:      msg.created_at,
                      unread:      msg.sender_id !== adminId ? c.unread + 1 : c.unread,
                    }
                  : c
                )
                .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
            }
            // New client conversation
            const newConvo: ClientConvo = {
              clientId,
              firstName:   'Client',
              lastMessage: msg.content,
              lastAt:      msg.created_at,
              unread:      msg.sender_id !== adminId ? 1 : 0,
              messages:    [msg],
            }
            return [newConvo, ...prev]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [adminId])

  // ── Mark messages as read when opening a conversation ─────────────────────
  useEffect(() => {
    if (!selectedId) return
    const convo = convos.find(c => c.clientId === selectedId)
    if (!convo || convo.unread === 0) return

    const supabase = createClient()
    const unreadIds = convo.messages
      .filter(m => m.sender_id !== adminId && !m.read)
      .map(m => m.id)

    if (unreadIds.length === 0) return

    supabase
      .from('messages')
      .update({ read: true })
      .in('id', unreadIds)
      .then(() => {
        setConvos(prev =>
          prev.map(c => c.clientId === selectedId
            ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
            : c
          )
        )
      })
  }, [selectedId, adminId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed || sending || !selectedId) return

    setSending(true)
    setInput('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id:    adminId,
        recipient_id: selectedId,
        content:      trimmed,
        read:         false,
      })
      .select()
      .single()

    if (!error && data) {
      const msg = data as Message
      setConvos(prev =>
        prev
          .map(c => c.clientId === selectedId
            ? { ...c, messages: [...c.messages, msg], lastMessage: msg.content, lastAt: msg.created_at }
            : c
          )
          .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
      )
    }
    setSending(false)
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await sendMessage()
    }
  }

  // ── Group messages by day ──────────────────────────────────────────────────
  type DayGroup = { day: string; msgs: Message[] }
  const groups: DayGroup[] = []
  for (const msg of selected?.messages ?? []) {
    const day  = new Date(msg.created_at).toDateString()
    const last = groups[groups.length - 1]
    if (!last || last.day !== day) {
      groups.push({ day, msgs: [msg] })
    } else {
      last.msgs.push(msg)
    }
  }

  const totalUnread = convos.reduce((s, c) => s + c.unread, 0)

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: 280, flexShrink: 0,
        background: C.sidebar, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        height: '100vh',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, background: C.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ ...D, fontWeight: 900, fontSize: '12px', color: 'white', letterSpacing: '0.05em' }}>GLC</span>
              </div>
              <div>
                <div style={{ ...D, fontWeight: 900, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted }}>
                  Admin
                </div>
                <div style={{ ...D, fontWeight: 900, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.text }}>
                  Messagerie
                </div>
              </div>
            </div>
            <a
              href="/admin"
              style={{
                ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.15em',
                textTransform: 'uppercase' as const, textDecoration: 'none',
                color: C.muted, padding: '5px 10px',
                border: `1px solid ${C.border}`,
              }}
            >
              ← Admin
            </a>
          </div>
          <div style={{ ...D, fontWeight: 700, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.muted }}>
            {convos.length} conversation{convos.length !== 1 ? 's' : ''}
            {totalUnread > 0 && (
              <span style={{
                marginLeft: 8,
                background: C.accent, color: 'white',
                ...D, fontWeight: 900, fontSize: '9px',
                padding: '1px 6px',
              }}>
                {totalUnread} non lu{totalUnread !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' as const }}>
          {convos.length === 0 ? (
            <div style={{
              padding: 32, textAlign: 'center' as const,
              ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.1em',
              textTransform: 'uppercase' as const, color: C.muted,
            }}>
              Aucun message
            </div>
          ) : (
            convos.map(convo => {
              const isActive = convo.clientId === selectedId
              return (
                <button
                  key={convo.clientId}
                  onClick={() => setSelectedId(convo.clientId)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left' as const,
                    padding: '14px 20px',
                    background: isActive ? C.dimmed : 'transparent',
                    borderLeft: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    border: 'none',
                    borderLeftWidth: 2,
                    borderLeftStyle: 'solid',
                    borderLeftColor: isActive ? C.accent : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomStyle: 'solid',
                    borderBottomColor: C.border,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, flexShrink: 0,
                      background: isActive ? C.accent : C.dimmed,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ ...D, fontWeight: 900, fontSize: '13px', color: 'white' }}>
                        {convo.firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 3,
                      }}>
                        <span style={{
                          ...D, fontWeight: 700, fontSize: '13px',
                          letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                          color: C.text,
                        }}>
                          {convo.firstName}
                        </span>
                        {convo.unread > 0 && (
                          <span style={{
                            background: C.accent, color: 'white',
                            ...D, fontWeight: 900, fontSize: '9px',
                            padding: '1px 6px', flexShrink: 0,
                          }}>
                            {convo.unread}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{
                          ...M, fontSize: '10px', color: C.muted,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                          flex: 1,
                        }}>
                          {convo.lastMessage.slice(0, 40)}{convo.lastMessage.length > 40 ? '…' : ''}
                        </span>
                        <span style={{
                          ...M, fontSize: '9px', color: C.muted, flexShrink: 0,
                        }}>
                          {convo.lastAt ? fmtTime(convo.lastAt) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Main conversation area ────────────────────────────────────────────── */}
      {selected ? (
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
        }}>
          {/* Conversation header */}
          <header style={{
            flexShrink: 0,
            background: `rgba(8,8,8,0.95)`, backdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${C.border}`,
            padding: '14px 32px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 38, height: 38, flexShrink: 0, background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ ...D, fontWeight: 900, fontSize: '15px', color: 'white' }}>
                {selected.firstName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div style={{ ...D, fontWeight: 900, fontSize: '20px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.text, lineHeight: 1 }}>
                {selected.firstName}
              </div>
              <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted, marginTop: 2 }}>
                {selected.messages.length} message{selected.messages.length !== 1 ? 's' : ''}
              </div>
            </div>
          </header>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto' as const,
            padding: '24px 32px',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {groups.map((group) => (
              <div key={group.day}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  margin: '24px 0 16px',
                }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.muted }}>
                    {fmtDay(group.msgs[0].created_at)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.msgs.map((msg, i) => {
                    const isMe = msg.sender_id === adminId
                    const prev = group.msgs[i - 1]
                    const isSameAuthorAsPrev = prev && prev.sender_id === msg.sender_id

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: 10,
                          marginTop: isSameAuthorAsPrev ? 2 : 12,
                        }}
                      >
                        {/* Avatar */}
                        {!isMe && !isSameAuthorAsPrev && (
                          <div style={{
                            width: 28, height: 28, flexShrink: 0, background: C.accent,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ ...D, fontWeight: 900, fontSize: '11px', color: 'white' }}>
                              {selected.firstName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {!isMe && isSameAuthorAsPrev && (
                          <div style={{ width: 28, flexShrink: 0 }} />
                        )}

                        {/* Robin avatar (right side) */}
                        {isMe && !isSameAuthorAsPrev && (
                          <div style={{
                            width: 28, height: 28, flexShrink: 0, background: C.dimmed,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            order: -1,
                          }}>
                            <span style={{ ...D, fontWeight: 900, fontSize: '11px', color: C.text }}>R</span>
                          </div>
                        )}
                        {isMe && isSameAuthorAsPrev && (
                          <div style={{ width: 28, flexShrink: 0, order: -1 }} />
                        )}

                        {/* Bubble */}
                        <div style={{
                          maxWidth: '65%',
                          background: isMe ? C.surface : C.dimmed,
                          border: `1px solid ${isMe ? C.border : 'transparent'}`,
                          padding: '10px 14px',
                        }}>
                          <div style={{
                            ...M, fontSize: '13px',
                            color: C.text, lineHeight: 1.55,
                            whiteSpace: 'pre-wrap' as const,
                            wordBreak: 'break-word' as const,
                          }}>
                            {msg.content}
                          </div>
                          <div style={{
                            ...M, fontSize: '9px', color: C.muted,
                            marginTop: 5, textAlign: isMe ? 'right' as const : 'left' as const,
                          }}>
                            {fmtTime(msg.created_at)}
                            {isMe && (
                              <span style={{ marginLeft: 6 }}>
                                {msg.read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            flexShrink: 0,
            borderTop: `1px solid ${C.border}`,
            background: C.sidebar,
            padding: '16px 32px',
          }}>
            <div style={{
              display: 'flex', gap: 12, alignItems: 'flex-end',
              background: C.surface, border: `1px solid ${C.border}`,
              padding: '10px 14px',
            }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Répondre à ${selected.firstName}… (Entrée pour envoyer)`}
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  resize: 'none', overflow: 'hidden',
                  ...M, fontSize: '13px', color: C.text, lineHeight: 1.55,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                style={{
                  flexShrink: 0,
                  background: input.trim() && !sending ? C.accent : C.dimmed,
                  border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                  color: 'white', padding: '8px 16px',
                  ...D, fontWeight: 700, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                  transition: 'background 0.15s',
                  alignSelf: 'flex-end',
                }}
              >
                {sending ? '...' : 'Envoyer'}
              </button>
            </div>
            <div style={{ ...D, fontWeight: 700, fontSize: '9px', letterSpacing: '0.1em', color: C.muted, marginTop: 8 }}>
              Entrée pour envoyer · Maj+Entrée pour aller à la ligne
            </div>
          </div>
        </main>
      ) : (
        /* Empty state */
        <main style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, background: C.dimmed,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ ...D, fontWeight: 900, fontSize: '28px', color: C.muted }}>✉</span>
          </div>
          <div style={{ ...D, fontWeight: 900, fontSize: '18px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: C.text }}>
            Messagerie clients
          </div>
          <div style={{ ...D, fontWeight: 500, fontSize: '13px', color: C.muted, textAlign: 'center' as const, maxWidth: 320 }}>
            Sélectionne une conversation dans la liste pour y répondre.
          </div>
        </main>
      )}
    </div>
  )
}
