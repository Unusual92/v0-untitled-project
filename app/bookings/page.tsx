"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Clock } from "lucide-react"

export default function BookingsPage() {
  const { user, userRole } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchBookings = async () => {
      setLoading(true)

      try {
        let query = supabase
          .from("bookings")
          .select(`
            *,
            kitchens:kitchen_id (
              id,
              title,
              address,
              city,
              kitchen_images (
                image_url,
                is_primary
              )
            ),
            profiles:renter_id (
              first_name,
              last_name,
              email
            )
          `)
          .order("start_time", { ascending: false })

        if (userRole === "renter") {
          query = query.eq("renter_id", user.id)
        } else {
          // For owners, get bookings for their kitchens
          const { data: ownedKitchens, error: kitchensError } = await supabase
            .from("kitchens")
            .select("id")
            .eq("owner_id", user.id)

          if (kitchensError) throw kitchensError

          if (ownedKitchens && ownedKitchens.length > 0) {
            const kitchenIds = ownedKitchens.map((k) => k.id)
            query = query.in("kitchen_id", kitchenIds)
          } else {
            setBookings([])
            setLoading(false)
            return
          }
        }

        const { data, error } = await query

        if (error) throw error

        setBookings(data || [])
      } catch (error) {
        console.error("Error fetching bookings:", error)
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить список бронирований",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [user, userRole, supabase, toast, router])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-600">Подтверждено</Badge>
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            Ожидает подтверждения
          </Badge>
        )
      case "cancelled":
        return <Badge variant="destructive">Отменено</Badge>
      case "completed":
        return <Badge variant="secondary">Завершено</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">Мои бронирования</h1>

        <Tabs defaultValue="upcoming">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">Предстоящие</TabsTrigger>
            <TabsTrigger value="past">Прошедшие</TabsTrigger>
            <TabsTrigger value="cancelled">Отмененные</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length > 0 ? (
            <>
              <TabsContent value="upcoming">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {bookings
                    .filter(
                      (booking) =>
                        (booking.status === "confirmed" || booking.status === "pending") &&
                        new Date(booking.end_time) >= new Date(),
                    )
                    .map((booking) => {
                      const primaryImage =
                        booking.kitchens.kitchen_images?.find((img: any) => img.is_primary)?.image_url ||
                        booking.kitchens.kitchen_images?.[0]?.image_url ||
                        "/placeholder.svg?height=150&width=300"

                      return (
                        <Card
                          key={booking.id}
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                        >
                          <div className="aspect-[16/9] relative">
                            <img
                              src={primaryImage || "/placeholder.svg"}
                              alt={booking.kitchens.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{booking.kitchens.title}</CardTitle>
                              {getStatusBadge(booking.status)}
                            </div>
                            <CardDescription>
                              {booking.kitchens.address}, {booking.kitchens.city}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{new Date(booking.start_time).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>
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
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-muted-foreground">Стоимость:</span>
                                <span className="font-bold">{booking.total_price} ₽</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
                {bookings.filter(
                  (booking) =>
                    (booking.status === "confirmed" || booking.status === "pending") &&
                    new Date(booking.end_time) >= new Date(),
                ).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">У вас нет предстоящих бронирований</p>
                    <Button onClick={() => router.push("/kitchens")} className="mt-4">
                      Найти кухню
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {bookings
                    .filter((booking) => booking.status !== "cancelled" && new Date(booking.end_time) < new Date())
                    .map((booking) => {
                      const primaryImage =
                        booking.kitchens.kitchen_images?.find((img: any) => img.is_primary)?.image_url ||
                        booking.kitchens.kitchen_images?.[0]?.image_url ||
                        "/placeholder.svg?height=150&width=300"

                      return (
                        <Card
                          key={booking.id}
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                        >
                          <div className="aspect-[16/9] relative">
                            <img
                              src={primaryImage || "/placeholder.svg"}
                              alt={booking.kitchens.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{booking.kitchens.title}</CardTitle>
                              <Badge variant="secondary">Завершено</Badge>
                            </div>
                            <CardDescription>
                              {booking.kitchens.address}, {booking.kitchens.city}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{new Date(booking.start_time).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>
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
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-muted-foreground">Стоимость:</span>
                                <span className="font-bold">{booking.total_price} ₽</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
                {bookings.filter((booking) => booking.status !== "cancelled" && new Date(booking.end_time) < new Date())
                  .length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">У вас нет прошедших бронирований</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cancelled">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {bookings
                    .filter((booking) => booking.status === "cancelled")
                    .map((booking) => {
                      const primaryImage =
                        booking.kitchens.kitchen_images?.find((img: any) => img.is_primary)?.image_url ||
                        booking.kitchens.kitchen_images?.[0]?.image_url ||
                        "/placeholder.svg?height=150&width=300"

                      return (
                        <Card
                          key={booking.id}
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                        >
                          <div className="aspect-[16/9] relative">
                            <img
                              src={primaryImage || "/placeholder.svg"}
                              alt={booking.kitchens.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{booking.kitchens.title}</CardTitle>
                              <Badge variant="destructive">Отменено</Badge>
                            </div>
                            <CardDescription>
                              {booking.kitchens.address}, {booking.kitchens.city}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{new Date(booking.start_time).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>
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
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-muted-foreground">Стоимость:</span>
                                <span className="font-bold">{booking.total_price} ₽</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
                {bookings.filter((booking) => booking.status === "cancelled").length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">У вас нет отмененных бронирований</p>
                  </div>
                )}
              </TabsContent>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">У вас пока нет бронирований</p>
              <Button onClick={() => router.push("/kitchens")} className="mt-4">
                Найти кухню
              </Button>
            </div>
          )}
        </Tabs>
      </main>

      <MobileNav />
    </div>
  )
}
