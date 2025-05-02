"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user, profile, refreshProfile, userRole } = useUser()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState<any[]>([])
  const [kitchens, setKitchens] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "")
      setLastName(profile.last_name || "")
      setPhone(profile.phone || "")
    }
  }, [profile])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoadingData(true)

        // Fetch bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            *,
            kitchens:kitchen_id (
              title,
              address,
              city
            )
          `)
          .eq("renter_id", user.id)
          .order("start_time", { ascending: false })

        if (bookingsError) throw bookingsError
        setBookings(bookingsData || [])

        // Fetch kitchens
        const { data: kitchensData, error: kitchensError } = await supabase
          .from("kitchens")
          .select(`
            *,
            kitchen_images (
              image_url,
              is_primary
            )
          `)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })

        if (kitchensError) throw kitchensError
        setKitchens(kitchensData || [])
      } catch (error) {
        console.error("Error fetching profile data:", error)
        toast({
          title: "Ошибка загрузки данных",
          description: "Не удалось загрузить данные профиля",
          variant: "destructive",
        })
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [user, supabase, toast, userRole])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      await refreshProfile()

      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно сохранены",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Ошибка обновления",
        description: "Не удалось обновить профиль",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    return user?.email?.substring(0, 2).toUpperCase() || "U"
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">Мой профиль</h1>

        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.first_name || ""} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-center">
                  {firstName && lastName ? `${firstName} ${lastName}` : user.email}
                </CardTitle>
                <CardDescription className="text-center">{user.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Сохранить"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <Tabs defaultValue="bookings">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bookings">Мои бронирования</TabsTrigger>
                <TabsTrigger value="kitchens">Мои кухни</TabsTrigger>
              </TabsList>
              <TabsContent value="bookings" className="mt-4">
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : bookings.length > 0 ? (
                  <div className="grid gap-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardHeader className="pb-2">
                          <CardTitle>{booking.kitchens.title}</CardTitle>
                          <CardDescription>
                            {booking.kitchens.address}, {booking.kitchens.city}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Дата и время:</span>
                              <span>
                                {new Date(booking.start_time).toLocaleDateString()}{" "}
                                {new Date(booking.start_time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {new Date(booking.end_time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Статус:</span>
                              <span
                                className={`font-medium ${
                                  booking.status === "confirmed"
                                    ? "text-green-600"
                                    : booking.status === "pending"
                                      ? "text-amber-600"
                                      : booking.status === "cancelled"
                                        ? "text-red-600"
                                        : ""
                                }`}
                              >
                                {booking.status === "confirmed"
                                  ? "Подтверждено"
                                  : booking.status === "pending"
                                    ? "Ожидает подтверждения"
                                    : booking.status === "cancelled"
                                      ? "Отменено"
                                      : booking.status === "completed"
                                        ? "Завершено"
                                        : booking.status}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Стоимость:</span>
                              <span>{booking.total_price} ₽</span>
                            </div>
                          </div>
                          <div className="flex justify-end mt-4">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/bookings/${booking.id}`)}>
                              Подробнее
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">У вас пока нет бронирований</div>
                )}
              </TabsContent>
              <TabsContent value="kitchens" className="mt-4">
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : kitchens.length > 0 ? (
                  <div className="grid gap-4">
                    {kitchens.map((kitchen) => {
                      const primaryImage =
                        kitchen.kitchen_images?.find((img: any) => img.is_primary)?.image_url ||
                        kitchen.kitchen_images?.[0]?.image_url ||
                        "/placeholder.svg?height=100&width=200"

                      return (
                        <Card key={kitchen.id} className="overflow-hidden">
                          <div className="flex flex-col sm:flex-row">
                            <div className="w-full sm:w-1/3 h-48 sm:h-auto relative">
                              <img
                                src={primaryImage || "/placeholder.svg"}
                                alt={kitchen.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 p-4">
                              <h3 className="text-xl font-bold">{kitchen.title}</h3>
                              <p className="text-muted-foreground">
                                {kitchen.address}, {kitchen.city}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                  {kitchen.kitchen_type === "open"
                                    ? "Открытая"
                                    : kitchen.kitchen_type === "island"
                                      ? "Островная"
                                      : kitchen.kitchen_type === "industrial"
                                        ? "Промышленная"
                                        : kitchen.kitchen_type}
                                </span>
                                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                  {kitchen.area_sqm} м²
                                </span>
                                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                  {kitchen.price_per_hour} ₽/час
                                </span>
                              </div>
                              <div className="mt-4 flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/kitchens/${kitchen.id}/edit`)}
                                >
                                  Редактировать
                                </Button>
                                <Button size="sm" onClick={() => router.push(`/kitchens/${kitchen.id}`)}>
                                  Просмотр
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    У вас пока нет добавленных кухонь
                    <div className="mt-4">
                      <Button onClick={() => router.push("/kitchens/new")}>Добавить кухню</Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
