"use client"
import { useState, useEffect, use } from "react"
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
import { format } from "date-fns"

type PageParams = {
  id: string
}

export default function KitchenDetailPage({ params }: { params: Promise<PageParams> }) {
  const { user, userRole } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const { id } = use(params)
  
  const [kitchen, setKitchen] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [bookedSlots, setBookedSlots] = useState<any[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [isBookingLoading, setIsBookingLoading] = useState(false)
  const [kitchenImages, setKitchenImages] = useState<string[]>([])

  // Загрузка деталей кухни
  useEffect(() => {
    let mounted = true

    const fetchKitchenDetails = async () => {
      if (!mounted) return
      
      setLoading(true)
      try {
        console.log("Fetching kitchen with ID:", id)
        // Загрузка данных кухни
        const { data: kitchenData, error: kitchenError } = await supabase
          .from("kitchens")
          .select(`
            *,
            kitchen_images (
              id,
              image_data,
              is_primary
            )
          `)
          .eq("id", id)
          .single()
        
        console.log("Kitchen data:", kitchenData)
        console.log("Kitchen error:", kitchenError)
        
        if (kitchenError) throw kitchenError
        
        if (!mounted) return
        
        if (!kitchenData) {
          throw new Error("Kitchen not found")
        }
        
        setKitchen(kitchenData)
        
        // Обработка изображений
        if (kitchenData?.kitchen_images && Array.isArray(kitchenData.kitchen_images)) {
          console.log("Processing kitchen images:", kitchenData.kitchen_images)
          const images = kitchenData.kitchen_images
            .filter((img: any) => img && img.image_data) // Фильтруем невалидные изображения
            .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
            .map((img: any) => {
              try {
                // Проверяем, является ли image_data строкой base64
                if (typeof img.image_data === 'string') {
                  if (img.image_data.startsWith('data:image')) {
                    return img.image_data
                  }
                  // Если это чистый base64 без префикса
                  return `data:image/jpeg;base64,${img.image_data}`
                }
                // Если это бинарные данные, конвертируем в base64
                if (img.image_data instanceof Uint8Array || Array.isArray(img.image_data)) {
                  const binaryData = new Uint8Array(img.image_data)
                  const base64String = btoa(String.fromCharCode(...binaryData))
                  return `data:image/jpeg;base64,${base64String}`
                }
                console.warn("Invalid image data format:", img.image_data)
                return null
              } catch (error) {
                console.error("Error processing image:", error)
                return null
              }
            })
            .filter(Boolean) // Удаляем null значения
        
          console.log("Processed images:", images)
          if (mounted) {
            setKitchenImages(images)
          }
        }
        
        // Загрузка данных владельца
        if (kitchenData.owner_id) {
          console.log("Fetching owner data for ID:", kitchenData.owner_id)
          const { data: ownerData, error: ownerError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", kitchenData.owner_id)
            .single()
          
          console.log("Owner data:", ownerData)
          console.log("Owner error:", ownerError)
          
          if (ownerError) throw ownerError
          
          if (mounted) {
            setOwner(ownerData)
          }
        }
        
        // Загрузка забронированных слотов
        if (kitchenData && mounted) {
          await fetchBookedSlots(new Date())
        }
      } catch (error) {
        console.error("Error fetching kitchen details:", error)
        if (mounted) {
          toast({
            title: "Ошибка загрузки",
            description: "Не удалось загрузить информацию о кухне",
            variant: "destructive",
          })
          router.push("/kitchens")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchKitchenDetails()

    return () => {
      mounted = false
    }
  }, [id, supabase, toast, router])

  // Получение забронированных слотов
  const fetchBookedSlots = async (date: Date) => {
    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("kitchen_id", id)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString())
        .not("status", "eq", "cancelled")
      
      if (error) throw error
      
      setBookedSlots(data || [])
    } catch (error) {
      console.error("Error fetching booked slots:", error)
    }
  }

  // Обработка изменения даты
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedTimeSlot(null)
    
    if (date) {
      fetchBookedSlots(date)
    }
  }

  // Генерация временных слотов
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
        time: `${hour.toString().padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`,
        start: slotStart,
        end: slotEnd,
        isBooked,
        isPast,
      })
    }
    
    return slots
  }

  // Бронирование
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
    
    router.push(`/bookings/new?kitchen=${id}&start=${startTime.toISOString()}&end=${endTime.toISOString()}`)
  }

  // Связь с владельцем
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

  // Инициалы владельца
  const getOwnerInitials = () => {
    if (owner?.first_name && owner?.last_name) {
      return `${owner.first_name[0]}${owner.last_name[0]}`.toUpperCase()
    }
    return "ВК"
  }

  // Обработчик возврата к списку кухонь
  const handleBackToKitchens = () => {
    router.push("/kitchens")
  }

  // Обработчик редактирования кухни
  const handleEditKitchen = () => {
    router.push(`/kitchens/${id}/edit`)
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
            <Button onClick={handleBackToKitchens} className="mt-4">
              Вернуться к списку
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const timeSlots = getTimeSlots()

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1 container py-8">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            {/* Изображения кухни */}
            <div className="mb-8">
              {kitchenImages.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {kitchenImages.map((imageUrl, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-[16/9] relative rounded-lg overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`${kitchen?.title || 'Кухня'} - фото ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              Основное фото
                            </div>
                          )}
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
            
            {/* Детали кухни */}
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
              
              {/* Описание кухни */}
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
            
            {/* Информация о владельце */}
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
                  
                  <Button 
                    variant="outline" 
                    className="ml-auto"
                    onClick={handleContactOwner}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Связаться
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Карточка бронирования */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-2xl font-bold">{kitchen.price_per_hour} ₽</p>
                    <p className="text-muted-foreground">в час</p>
                  </div>
                  
                  {user && userRole === "owner" && user.id === kitchen.owner_id ? (
                    <Button onClick={handleEditKitchen}>Редактировать</Button>
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
                          {/* Выбор даты */}
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
                          
                          {/* Выбор времени */}
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
                          <Button 
                            onClick={handleBooking}
                            disabled={!selectedTimeSlot || isBookingLoading}
                          >
                            {isBookingLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Загрузка...
                              </>
                            ) : (
                              "Продолжить бронирование"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                
                {/* Информация о бронировании */}
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
