"use client"
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useCustomToast } from "@/components/ui/custom-toast"
import { Loader2, Search, MapPin, ChefHat } from "lucide-react"
import { debounce } from "lodash"

export default function KitchensPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showError } = useCustomToast()
  const supabase = getSupabaseClient()

  const [kitchens, setKitchens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") || ""
  )
  const [selectedType, setSelectedType] = useState<string>("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 200])
  const [hasProjector, setHasProjector] = useState(false)
  const [hasPhotoZone, setHasPhotoZone] = useState(false)
  const [hasDishwasher, setHasDishwasher] = useState(false)
  const [cities, setCities] = useState<string[]>([])

  // Загрузка списка городов
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data: citiesData, error: citiesError } = await supabase
          .from("kitchens")
          .select("city")
          .order("city")

        if (citiesError) throw citiesError

        const uniqueCities = Array.from(
          new Set(citiesData?.map((item) => item.city).filter(Boolean))
        ).sort() as string[]

        setCities(uniqueCities)
      } catch (error) {
        console.error("Ошибка при загрузке городов:", error)
      }
    }

    fetchCities()
  }, [])

  // Debounced функция для запроса кухонь
  const debouncedFetch = useCallback(
    debounce(() => {
      fetchKitchens()
    }, 300),
    [
      selectedCategory,
      selectedCity,
      selectedType,
      priceRange,
      areaRange,
      hasProjector,
      hasPhotoZone,
      hasDishwasher,
      searchQuery,
    ]
  )

  useEffect(() => {
    debouncedFetch()
    return () => debouncedFetch.cancel()
  }, [debouncedFetch])

  useEffect(() => {
    fetchKitchens()
  }, [])

  // Основная функция загрузки кухонь и изображений
  const fetchKitchens = async () => {
    setLoading(true)
    try {
      // Строим запрос с учетом фильтров
      let query = supabase.from("kitchens").select("*")

      if (selectedType && selectedType !== "all") {
        query = query.eq("kitchen_type", selectedType)
      }

      if (selectedCategory && selectedCategory !== "all") {
        query = query.eq("category", selectedCategory)
      }

      if (selectedCity && selectedCity !== "all") {
        query = query.eq("city", selectedCity)
      }

      if (priceRange[0] > 0 || priceRange[1] < 10000) {
        query = query.gte("price_per_hour", priceRange[0]).lte("price_per_hour", priceRange[1])
      }

      if (areaRange[0] > 0 || areaRange[1] < 200) {
        query = query.gte("area_sqm", areaRange[0]).lte("area_sqm", areaRange[1])
      }

      if (hasProjector) {
        query = query.eq("has_projector", true)
      }

      if (hasPhotoZone) {
        query = query.eq("has_photo_zone", true)
      }

      if (hasDishwasher) {
        query = query.eq("has_dishwasher", true)
      }

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`)
      }

      const { data: kitchensData, error: kitchensError } = await query.limit(20)

      if (kitchensError) throw kitchensError

      if (!kitchensData || kitchensData.length === 0) {
        setKitchens([])
        return
      }

      // Получаем изображения для найденных кухонь
      const kitchenIds = kitchensData.map((kitchen) => kitchen.id)
      const { data: imagesData, error: imagesError } = await supabase
        .from("kitchen_images")
        .select("id, kitchen_id, image_data, is_primary")
        .in("kitchen_id", kitchenIds)

      if (imagesError) {
        console.error("Ошибка при загрузке изображений:", imagesError)
      }

      // Создаем карту изображений для быстрого доступа
      const imagesMap: Record<string, any[]> = {}
      if (imagesData && imagesData.length > 0) {
        imagesData.forEach((img) => {
          if (!imagesMap[img.kitchen_id]) {
            imagesMap[img.kitchen_id] = []
          }
          imagesMap[img.kitchen_id].push(img)
        })
      }

      // Обрабатываем данные кухонь с изображениями
      const processedData = kitchensData.map((kitchen) => {
        const kitchenImages = imagesMap[kitchen.id] || []
        const primaryImageObj = kitchenImages.find((img) => img.is_primary) || kitchenImages[0]

        let primaryImage = "/placeholder.svg?height=200&width=300"
        if (primaryImageObj && typeof primaryImageObj.image_data === "string") {
          if (primaryImageObj.image_data.startsWith("data:image")) {
            primaryImage = primaryImageObj.image_data
          } else {
            primaryImage = `data:image/jpeg;base64,${primaryImageObj.image_data}`
          }
        }

        return {
          ...kitchen,
          primaryImage,
          kitchen_images: kitchenImages,
        }
      })

      setKitchens(processedData)
    } catch (error) {
      console.error("Ошибка при загрузке кухонь:", error)
      showError("Не удалось загрузить список кухонь")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    debouncedFetch()
  }

  const handleClearFilters = () => {
    setSelectedCategory("")
    setSelectedCity("")
    setSelectedType("")
    setPriceRange([0, 10000])
    setAreaRange([0, 200])
    setHasProjector(false)
    setHasPhotoZone(false)
    setHasDishwasher(false)
    setSearchQuery("")
    fetchKitchens()
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1 py-8">
        <h1 className="text-3xl font-bold mb-8">Поиск кухонь</h1>
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Фильтры */}
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Поиск кухонь..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Accordion type="single" collapsible defaultValue="category">
              <AccordionItem value="category">
                <AccordionTrigger>Категория</AccordionTrigger>
                <AccordionContent>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      <SelectItem value="events">Для мероприятий</SelectItem>
                      <SelectItem value="professional">Профессиональные</SelectItem>
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="location">
                <AccordionTrigger>Местоположение</AccordionTrigger>
                <AccordionContent>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все города" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все города</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="type">
                <AccordionTrigger>Тип кухни</AccordionTrigger>
                <AccordionContent>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все типы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      <SelectItem value="open">Открытая</SelectItem>
                      <SelectItem value="island">Островная</SelectItem>
                      <SelectItem value="industrial">Промышленная</SelectItem>
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="price">
                <AccordionTrigger>Цена за час</AccordionTrigger>
                <AccordionContent>
                  <Slider
                    value={priceRange}
                    min={0}
                    max={10000}
                    step={100}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span>{priceRange[0]} ₽</span>
                    <span>{priceRange[1]} ₽</span>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="area">
                <AccordionTrigger>Площадь</AccordionTrigger>
                <AccordionContent>
                  <Slider
                    value={areaRange}
                    min={0}
                    max={200}
                    step={5}
                    onValueChange={(value) => setAreaRange(value as [number, number])}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span>{areaRange[0]} м²</span>
                    <span>{areaRange[1]} м²</span>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="features">
                <AccordionTrigger>Дополнительно</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasProjector"
                        checked={hasProjector}
                        onCheckedChange={(checked) => setHasProjector(checked === true)}
                      />
                      <Label htmlFor="hasProjector">Проектор</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasPhotoZone"
                        checked={hasPhotoZone}
                        onCheckedChange={(checked) => setHasPhotoZone(checked === true)}
                      />
                      <Label htmlFor="hasPhotoZone">Фото-зона</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasDishwasher"
                        checked={hasDishwasher}
                        onCheckedChange={(checked) => setHasDishwasher(checked === true)}
                      />
                      <Label htmlFor="hasDishwasher">Посудомоечная машина</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Button variant="outline" onClick={handleClearFilters} className="w-full">
              Сбросить фильтры
            </Button>
          </div>

          {/* Список кухонь */}
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : kitchens.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {kitchens.map((kitchen) => (
                  <Card
                    key={kitchen.id}
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/kitchens/${kitchen.id}`)}
                  >
                    <div className="aspect-[16/9] relative">
                      <img
                        src={kitchen.primaryImage || "/placeholder.svg"}
                        alt={kitchen.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg line-clamp-1">{kitchen.title}</h3>
                          <div className="flex items-center text-muted-foreground text-sm mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>
                              {kitchen.address}, {kitchen.city}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{kitchen.price_per_hour} ₽</div>
                          <div className="text-xs text-muted-foreground">в час</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary">
                          {kitchen.kitchen_type === "open"
                            ? "Открытая"
                            : kitchen.kitchen_type === "island"
                            ? "Островная"
                            : "Промышленная"}
                        </Badge>
                        <Badge variant="secondary">{kitchen.area_sqm} м²</Badge>
                        <Badge variant="outline">
                          {kitchen.category === "events" ? "Для мероприятий" : "Профессиональная"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-bold mt-4">Кухни не найдены</h2>
                <p className="text-muted-foreground mt-2">
                  Попробуйте изменить параметры поиска или сбросить фильтры
                </p>
                <Button onClick={handleClearFilters} className="mt-4">
                  Сбросить фильтры
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
