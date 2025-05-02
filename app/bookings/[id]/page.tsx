"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, MapPin, Clock, CalendarIcon, MessageSquare, CheckCircle, XCircle } from "lucide-react"

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const { user, userRole } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [booking, setBooking] = useState<any>(null)
  const [kitchen, setKitchen] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [renter, setRenter] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchBookingDetails = async () => {
      setLoading(true)

      try {
        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", params.id)
          .single()

        if (bookingError) throw bookingError

        setBooking(bookingData)

        // Fetch kitchen details
        const { data: kitchenData, error: kitchenError } = await supabase
          .from("kitchens")
          .select(`
            *,
            kitchen_images (
              image_url,
              is_primary
            )
          `)
          .eq("id", bookingData.kitchen_id)
          .single()

        if (kitchenError) throw kitchenError

        setKitchen(kitchenData)

        // Fetch owner details
        const { data: ownerData, error: ownerError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", kitchenData.owner_id)
          .single()

        if (ownerError) throw ownerError

        setOwner(ownerData)

        // Fetch renter details
        const { data: renterData, error: renterError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", bookingData.renter_id)
          .single()

        if (renterError) throw renterError

        setRenter(renterData)

        // Check if user has access to this booking
        if (user.id !== kitchenData.owner_id && user.id !== bookingData.renter_id) {
          toast({
            title: "Доступ запрещен",
            description: "У вас нет доступа к этому бронированию",
            variant: "destructive",
          })
          router.push("/")
        }
      } catch (error) {
        console.error("Error fetching booking details:", error)
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить информацию о бронировании",
          variant: "destructive",
        })
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [user, params.id, supabase, toast, router])

  const updateBookingStatus = async (status: string) => {
    if (!booking) return

    setUpdating(true)

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)

      if (error) throw error

      setBooking({
        ...booking,
        status,
      })

      toast({
        title: "Статус обновлен",
        description: `Бронирование ${status === "confirmed" ? "подтверждено" : "отменено"}`,
      })
    } catch (error) {
      console.error("Error updating booking status:", error)
      toast({
        title: "Ошибка обновления",
        description: "Не удалось обновить статус бронирования",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleContactUser = (userId: string) => {
    router.push(`/messages?receiver=${userId}`)
  }

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

  const getInitials = (profile: any) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    return profile?.email?.substring(0, 2).toUpperCase() || "U"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!booking || !kitchen) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Бронирование не найдено</h2>
            <p className="text-muted-foreground mt-2">Данное бронирование не существует или было удалено</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              На главную
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === kitchen.owner_id
  const isRenter = user?.id === booking.renter_id
  const canConfirm = isOwner && booking.status === "pending"
  const canCancel = (isOwner || isRenter) && (booking.status === "pending" || booking.status === "confirmed")
  const startTime = new Date(booking.start_time)
  const endTime = new Date(booking.end_time)
  const primaryImage =
    kitchen.kitchen_images?.find((img: any) => img.is_primary)?.image_url ||
    kitchen.kitchen_images?.[0]?.image_url ||
    "/placeholder.svg?height=200&width=300"

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-1 container py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Бронирование #{booking.id.substring(0, 8)}</h1>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(booking.status)}
              <span className="text-muted-foreground">Создано {new Date(booking.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {canConfirm && (
              <Button
                variant="default"
                className="flex items-center gap-2"
                onClick={() => updateBookingStatus("confirmed")}
                disabled={updating}
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Подтвердить
              </Button>
            )}

            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2" disabled={updating}>
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Отменить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Отменить бронирование?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Вы уверены, что хотите отменить это бронирование? Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => updateBookingStatus("cancelled")}>Да, отменить</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="space-y-8">
            {/* Kitchen Details */}
            <Card>
              <CardHeader>
                <CardTitle>Информация о кухне</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/3 h-48 sm:h-auto relative">
                    <img
                      src={primaryImage || "/placeholder.svg"}
                      alt={kitchen.title}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{kitchen.title}</h3>
                    <div className="flex items-center text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>
                        {kitchen.address}, {kitchen.city}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{startTime.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <Button variant="outline" className="mt-4" onClick={() => router.push(`/kitchens/${kitchen.id}`)}>
                      Подробнее о кухне
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Контактная информация</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={owner?.avatar_url || ""} alt={owner?.first_name || ""} />
                      <AvatarFallback>{getInitials(owner)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {owner?.first_name && owner?.last_name
                          ? `${owner.first_name} ${owner.last_name}`
                          : "Владелец кухни"}
                      </h3>
                      <p className="text-sm text-muted-foreground">Владелец</p>
                    </div>
                    {!isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => handleContactUser(owner.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Написать
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={renter?.avatar_url || ""} alt={renter?.first_name || ""} />
                      <AvatarFallback>{getInitials(renter)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {renter?.first_name && renter?.last_name
                          ? `${renter.first_name} ${renter.last_name}`
                          : "Арендатор"}
                      </h3>
                      <p className="text-sm text-muted-foreground">Арендатор</p>
                    </div>
                    {!isRenter && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => handleContactUser(renter.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Написать
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Детали оплаты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Стоимость аренды</span>
                  <span>{kitchen.price_per_hour} ₽/час</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Длительность</span>
                  <span>{Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))} ч</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Итого</span>
                  <span>{booking.total_price} ₽</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground mb-2">
                  Статус оплаты: <span className="font-medium">Ожидает оплаты</span>
                </p>
                <Button className="w-full" disabled>
                  Оплатить онлайн
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center w-full">
                  Онлайн оплата временно недоступна. Оплата производится на месте.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
