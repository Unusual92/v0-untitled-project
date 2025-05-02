"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, MapPin, Clock, CalendarIcon } from "lucide-react"

export default function NewBookingPage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const kitchenId = searchParams.get("kitchen")
  const startTimeParam = searchParams.get("start")
  const endTimeParam = searchParams.get("end")

  const [kitchen, setKitchen] = useState<any>(null)
  const [startTime, setStartTime] = useState<Date | null>(startTimeParam ? new Date(startTimeParam) : null)
  const [endTime, setEndTime] = useState<Date | null>(endTimeParam ? new Date(endTimeParam) : null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!kitchenId || !startTimeParam || !endTimeParam) {
      toast({
        title: "Недостаточно данных",
        description: "Не указаны все необходимые параметры для бронирования",
        variant: "destructive",
      })
      router.push("/kitchens")
      return
    }

    const fetchKitchenDetails = async () => {
      setLoading(true)

      try {
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
          .eq("id", kitchenId)
          .single()

        if (kitchenError) throw kitchenError

        setKitchen(kitchenData)
      } catch (error) {
        console.error("Error fetching kitchen details:", error)
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить информацию о кухне",
          variant: "destructive",
        })
        router.push("/kitchens")
      } finally {
        setLoading(false)
      }
    }

    fetchKitchenDetails()
  }, [user, kitchenId, startTimeParam, endTimeParam, supabase, toast, router])

  const calculateTotalPrice = () => {
    if (!kitchen || !startTime || !endTime) return 0

    const hours = Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)))
    return kitchen.price_per_hour * hours
  }

  const handleCreateBooking = async () => {
    if (!user || !kitchen || !startTime || !endTime) return

    setCreating(true)

    try {
      const totalPrice = calculateTotalPrice()

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          kitchen_id: kitchen.id,
          renter_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "pending",
          total_price: totalPrice,
        })
        .select()

      if (bookingError) throw bookingError

      toast({
        title: "Бронирование создано",
        description: "Ваше бронирование успешно создано и ожидает подтверждения",
      })

      router.push(`/bookings/${bookingData[0].id}`)
    } catch (error) {
      console.error("Error creating booking:", error)
      toast({
        title: "Ошибка бронирования",
        description: "Не удалось создать бронирование",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
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

  if (!kitchen || !startTime || !endTime) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Недостаточно данных</h2>
            <p className="text-muted-foreground mt-2">Не указаны все необходимые параметры для бронирования</p>
            <Button onClick={() => router.push("/kitchens")} className="mt-4">
              Вернуться к списку кухонь
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalPrice = calculateTotalPrice()
  const hours = Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)))
  const primaryImage =
    kitchen.kitchen_images?.find((img: any) => img.is_primary)?.image_url ||
    kitchen.kitchen_images?.[0]?.image_url ||
    "/placeholder.svg?height=200&width=300"

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">Оформление бронирования</h1>

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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Terms */}
            <Card>
              <CardHeader>
                <CardTitle>Условия бронирования</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Бронируя кухню, вы соглашаетесь с правилами использования сервиса и условиями аренды кухонного
                  пространства.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Оплата производится на месте перед началом аренды</li>
                  <li>В случае отмены бронирования менее чем за 24 часа может взиматься штраф</li>
                  <li>Пожалуйста, оставьте кухню в том же состоянии, в котором вы её нашли</li>
                  <li>При возникновении проблем свяжитесь с владельцем кухни или службой поддержки</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Payment Details */}
          <div>
            <Card className="sticky top-24">
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
                  <span>{hours} ч</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Итого</span>
                  <span>{totalPrice} ₽</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground mb-4">
                  Нажимая кнопку "Забронировать", вы соглашаетесь с условиями бронирования и подтверждаете свое
                  намерение арендовать кухню.
                </p>
                <Button className="w-full" onClick={handleCreateBooking} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    "Забронировать"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
