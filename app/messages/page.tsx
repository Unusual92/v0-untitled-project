"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Send } from "lucide-react"

export default function MessagesPage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const receiverId = searchParams.get("receiver")

  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchContacts = async () => {
      setLoading(true)

      try {
        // Get unique contacts from messages
        const { data: sentMessages, error: sentError } = await supabase
          .from("messages")
          .select("receiver_id")
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false })

        if (sentError) throw sentError

        const { data: receivedMessages, error: receivedError } = await supabase
          .from("messages")
          .select("sender_id")
          .eq("receiver_id", user.id)
          .order("created_at", { ascending: false })

        if (receivedError) throw receivedError

        // Combine and get unique user IDs
        const sentUserIds = sentMessages.map((msg) => msg.receiver_id)
        const receivedUserIds = receivedMessages.map((msg) => msg.sender_id)
        const uniqueUserIds = Array.from(new Set([...sentUserIds, ...receivedUserIds]))

        if (uniqueUserIds.length === 0 && !receiverId) {
          setLoading(false)
          return
        }

        // Add receiverId if it exists and not already in the list
        if (receiverId && !uniqueUserIds.includes(receiverId)) {
          uniqueUserIds.push(receiverId)
        }

        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", uniqueUserIds)

        if (profilesError) throw profilesError

        setContacts(profiles || [])

        // If receiverId is provided, select that contact
        if (receiverId) {
          const selectedContact = profiles?.find((profile) => profile.id === receiverId)
          if (selectedContact) {
            setSelectedContact(selectedContact)
            fetchMessages(selectedContact.id)
          }
        } else if (profiles && profiles.length > 0) {
          // Otherwise select the first contact
          setSelectedContact(profiles[0])
          fetchMessages(profiles[0].id)
        }
      } catch (error) {
        console.error("Error fetching contacts:", error)
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить список контактов",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()

    // Set up real-time subscription for new messages
    const messagesSubscription = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.receiver_id === selectedContact?.id) {
            setMessages((prev) => [...prev, payload.new])
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.sender_id === selectedContact?.id) {
            setMessages((prev) => [...prev, payload.new])
            markMessagesAsRead(selectedContact.id)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesSubscription)
    }
  }, [user, receiverId, supabase, toast, router, selectedContact?.id])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchMessages = async (contactId: string) => {
    if (!user) return

    try {
      // Fetch messages between current user and selected contact
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })

      if (error) throw error

      setMessages(data || [])

      // Mark received messages as read
      markMessagesAsRead(contactId)
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить сообщения",
        variant: "destructive",
      })
    }
  }

  const markMessagesAsRead = async (contactId: string) => {
    if (!user) return

    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", contactId)
        .eq("receiver_id", user.id)
        .eq("is_read", false)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !selectedContact || !newMessage.trim()) return

    setSendingMessage(true)

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedContact.id,
        content: newMessage.trim(),
        is_read: false,
      })

      if (error) throw error

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Ошибка отправки",
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSelectContact = (contact: any) => {
    setSelectedContact(contact)
    fetchMessages(contact.id)
  }

  const getContactInitials = (contact: any) => {
    if (contact?.first_name && contact?.last_name) {
      return `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase()
    }
    return contact?.email?.substring(0, 2).toUpperCase() || "U"
  }

  const getContactName = (contact: any) => {
    if (contact?.first_name && contact?.last_name) {
      return `${contact.first_name} ${contact.last_name}`
    }
    return "Пользователь"
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">Сообщения</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">У вас пока нет сообщений</p>
            <p className="text-muted-foreground">Начните общение с владельцем кухни или арендатором</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_2fr] lg:grid-cols-[300px_1fr] h-[calc(100vh-16rem)]">
            {/* Contacts List */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 bg-muted font-medium">Контакты</div>
              <div className="flex-1 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 ${
                      selectedContact?.id === contact.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar_url || ""} alt={getContactName(contact)} />
                      <AvatarFallback>{getContactInitials(contact)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getContactName(contact)}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.email || "Нет email"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <Card className="flex flex-col h-full">
              {selectedContact ? (
                <>
                  <div className="p-4 border-b flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedContact.avatar_url || ""} alt={getContactName(selectedContact)} />
                      <AvatarFallback>{getContactInitials(selectedContact)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getContactName(selectedContact)}</p>
                      <p className="text-xs text-muted-foreground">{selectedContact.email || "Нет email"}</p>
                    </div>
                  </div>

                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">Начните общение</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.sender_id === user.id ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p>{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender_id === user.id ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  <div className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Введите сообщение..."
                        disabled={sendingMessage}
                      />
                      <Button type="submit" disabled={!newMessage.trim() || sendingMessage}>
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Выберите контакт для общения</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  )
}
