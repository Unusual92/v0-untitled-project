"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Clock, CalendarIcon, ChefHat, Ruler, MessageSquare } from "lucide-react"

export default function KitchenDetailPage({ params }: { params: { id: string } }) {
  const { user, userRole } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [kitchen, setKitchen] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [bookedSlots, setBookedSlots] = useState<any[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)

  useEffect(() => {
    const fetchKitchenDetails = async () => {
      setLoading(true)

      try {
        // Fetch kitchen details
        const { data: kitchenData, error: kitchenError } = await supabase
          .from("kitchens")
          .select(`
            *,
            kitchen_images (
              id,
              image_url,
              is_primary
            )
          `)
          .eq("id", params.id)
          .single()

        if (kitchenError) throw kitchenError

        setKitchen(kitchenData)

        // Fetch owner details
        if (kitchenData.owner_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", kitchenData.owner_id)
            .single()

          if (ownerError) throw ownerError

          setOwner(ownerData)
        }

        // Fetch booked slots for the selected date
        await fetchBookedSlots(new Date())
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
  }, [params.id, supabase, toast, router])

  const fetchBookedSlots = async (date: Date) => {
    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("kitchen_id", params.id)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString())
        .not("status", "eq", "cancelled")

      if (error) throw error

      setBookedSlots(data || [])
    } catch (error) {
      console.error("Error fetching booked slots:", error)
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedTimeSlot(null)
    if (date) {
      fetchBookedSlots(date)
    }
  }

  const getTimeSlots = () => {
    if (!selectedDate) return []

    const slots = []
    const startHour = 8 // 8 AM
    const endHour = 22 // 10 PM

    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = new Date(selectedDate)
      slotStart.setHours(hour, 0, 0, 0)

      const slotEnd = new Date(selectedDate)
      slotEnd.setHours(hour + 1, 0, 0, 0)

      const isBooked = bookedSlots.some((booking) => {
        const bookingStart = new Date(booking.start_time)
        const bookingEnd = new Date(booking.end_time)

        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        )
      })

      const isPast = slotStart < new Date()

      slots.push({
        time: `${hour}:00 - ${hour + 1}:00`,
        start: slotStart,
        end: slotEnd,
        isBooked,
        isPast,
      })
    }

    return slots
  }

  const handleBooking = () => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Пожалуйста, войдите в систему для бронирования",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!selectedTimeSlot) {
      toast({
        title: "Выберите время",
        description: "Пожалуйста, выберите время для бронирования",
        variant: "destructive",
      })
      return
    }

    const [startHour] = selectedTimeSlot.split(":")

    const startTime = new Date(selectedDate!)
    startTime.setHours(Number.parseInt(startHour), 0, 0, 0)

    const endTime = new Date(startTime)
    endTime.setHours(startTime.getHours() + 1)

    router.push(`/bookings/new?kitchen=${params.id}&start=${startTime.toISOString()}&end=${endTime.toISOString()}`)
  }

  const handleContactOwner = async () => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Пожалуйста, войдите в систему для отправки сообщений",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    router.push(`/messages?receiver=${kitchen.owner_id}`)
  }

  const getOwnerInitials = () => {
    if (owner?.first_name && owner?.last_name) {
      return `${owner.first_name[0]}${owner.last_name[0]}`.toUpperCase()
    }
    return "ВК" // Владелец Кухни
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

  if (!kitchen) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Кухня не найдена</h2>
            <p className="text-muted-foreground mt-2">Данная кухня не существует или была удалена</p>
            <Button onClick={() => router.push("/kitchens")} className="mt-4">
              Вернуться к списку
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const kitchenImages = kitchen.kitchen_images || []
  const timeSlots = getTimeSlots()

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-1 container py-8">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            {/* Kitchen Images */}
            <div className="mb-8">
              {kitchenImages.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {kitchenImages.map((image: any) => (
                      <CarouselItem key={image.id}>
                        <div className="aspect-[16/9] relative rounded-lg overflow-hidden">
                          <img
                            src={image.image_url || "/placeholder.svg"}
                            alt={kitchen.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="aspect-[16/9] relative rounded-lg overflow-hidden bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ChefHat className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                </div>
              )}
            </div>

            {/* Kitchen Details */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{kitchen.title}</h1>
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                <span>
                  {kitchen.address}, {kitchen.city}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="secondary">
                  {kitchen.kitchen_type === "open"
                    ? "Открытая кухня"
                    : kitchen.kitchen_type === "island"
                      ? "Островная кухня"
                      : kitchen.kitchen_type === "industrial"
                        ? "Промышленная кухня"
                        : kitchen.kitchen_type}
                </Badge>
                <Badge variant="secondary">
                  <Ruler className="h-3 w-3 mr-1" />
                  {kitchen.area_sqm} м²
                </Badge>
                <Badge variant="secondary">
                  {kitchen.category === "events" ? "Для мероприятий" : "Профессиональная"}
                </Badge>
                {kitchen.has_projector && <Badge variant="outline">Проектор</Badge>}
                {kitchen.has_photo_zone && <Badge variant="outline">Фото-зона</Badge>}
                {kitchen.has_dishwasher && <Badge variant="outline">Посудомоечная машина</Badge>}
              </div>

              <Tabs defaultValue="description">
                <TabsList>
                  <TabsTrigger value="description">Описание</TabsTrigger>
                  <TabsTrigger value="equipment">Оборудование</TabsTrigger>
                  <TabsTrigger value="rules">Правила</TabsTrigger>
                </TabsList>
                <TabsContent value="description" className="mt-4">
                  <div className="prose max-w-none">
                    <p>{kitchen.description || "Описание отсутствует"}</p>
                  </div>
                </TabsContent>
                <TabsContent value="equipment" className="mt-4">
                  <div className="prose max-w-none">
                    <p>Информация об оборудовании будет добавлена позднее.</p>
                  </div>
                </TabsContent>
                <TabsContent value="rules" className="mt-4">
                  <div className="prose max-w-none">
                    <p>Правила использования кухни будут добавлены позднее.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Owner Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={owner?.avatar_url || ""} alt={owner?.first_name || ""} />
                    <AvatarFallback>{getOwnerInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {owner?.first_name && owner?.last_name
                        ? `${owner.first_name} ${owner.last_name}`
                        : "Владелец кухни"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Владелец</p>
                  </div>
                  <Button variant="outline" className="ml-auto" onClick={handleContactOwner}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Связаться
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Card */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-2xl font-bold">{kitchen.price_per_hour} ₽</p>
                    <p className="text-muted-foreground">в час</p>
                  </div>
                  {userRole === "owner" && user?.id === kitchen.owner_id ? (
                    <Button onClick={() => router.push(`/kitchens/${params.id}/edit`)}>Редактировать</Button>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Забронировать</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Бронирование кухни</DialogTitle>
                          <DialogDescription>Выберите дату и время для бронирования</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">Выберите дату</span>
                            </div>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleDateChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              className="rounded-md border"
                            />
                          </div>

                          <div className="grid gap-2">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">Выберите время</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {timeSlots.map((slot) => (
                                <Button
                                  key={slot.time}
                                  variant={selectedTimeSlot === slot.time ? "default" : "outline"}
                                  disabled={slot.isBooked || slot.isPast}
                                  onClick={() => setSelectedTimeSlot(slot.time)}
                                  className="w-full"
                                >
                                  {slot.time}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleBooking}>Продолжить бронирование</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Минимальное время бронирования: 1 час</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Доступно для бронирования: ежедневно</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
