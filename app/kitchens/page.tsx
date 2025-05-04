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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "")
  const [selectedType, setSelectedType] = useState<string>("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 200])
  const [hasProjector, setHasProjector] = useState(false)
  const [hasPhotoZone, setHasPhotoZone] = useState(false)
  const [hasDishwasher, setHasDishwasher] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  

  // Отдельный эффект для загрузки городов
  useEffect(() => {
    const fetchCities = async () => {
      console.log("🏙️ Starting cities fetch")
      try {
        const { data: citiesData, error: citiesError } = await supabase
          .from("kitchens")
          .select("city")
          .order("city")
        
        console.log("Cities data received:", citiesData)
        
        if (citiesError) {
          console.error("❌ Cities fetch error:", citiesError)
          return
        }

        if (citiesData) {
          const uniqueCities = Array.from(new Set(citiesData.map((item) => item.city)))
            .filter(Boolean)
            .sort() as string[]
          console.log("Unique cities found:", uniqueCities)
          setCities(uniqueCities)
        }
      } catch (error) {
        console.error("❌ Error in fetchCities:", error)
      }
    }

    fetchCities()
  }, [])

  // Debounced fetch function to prevent too many requests
  const debouncedFetch = useCallback(
    debounce(() => {
      console.log("🔄 debouncedFetch called")
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
    ],
  )

  useEffect(() => {
    console.log("🔍 useEffect for debouncedFetch mounted")
    debouncedFetch()
    return () => {
      console.log("🧹 useEffect cleanup - canceling debouncedFetch")
      debouncedFetch.cancel()
    }
  }, [debouncedFetch])

  useEffect(() => {
    console.log("🚀 Initial useEffect mounted")
    fetchKitchens()
  }, [])

  const fetchKitchens = async () => {
    console.log("📥 fetchKitchens started")
    setLoading(true)

    try {
      console.log("🔍 Building query with filters:", {
        selectedCategory,
        selectedCity,
        selectedType,
        priceRange,
        areaRange,
        hasProjector,
        hasPhotoZone,
        hasDishwasher,
        searchQuery
      })

      // Сначала делаем простой запрос без фильтров
      console.log("📡 Executing initial query...")
      const { data: initialData, error: initialError } = await supabase
        .from("kitchens")
        .select("*")
        .limit(20)

      console.log("📦 Initial query result:", { initialData, initialError })

      if (initialError) {
        console.error("❌ Initial query error:", initialError)
        throw initialError
      }

      if (!initialData || initialData.length === 0) {
        console.log("ℹ️ No kitchens found")
        setKitchens([])
        return
      }

      // Затем получаем изображения для найденных кухонь
      console.log("🖼️ Fetching images for kitchens...")
      const kitchenIds = initialData.map(kitchen => kitchen.id)
      const { data: imagesData, error: imagesError } = await supabase
        .from("kitchen_images")
        .select("*")
        .in("kitchen_id", kitchenIds)

      console.log("📸 Images data:", imagesData)

      if (imagesError) {
        console.error("❌ Images fetch error:", imagesError)
      }

      // Обрабатываем данные
      console.log("🔄 Processing data...")
      const processedData = initialData.map((kitchen) => {
        console.log("🍳 Processing kitchen:", kitchen.id)
        
        // Находим изображения для текущей кухни
        const kitchenImages = imagesData?.filter(img => img.kitchen_id === kitchen.id) || []
        
        // Находим основное изображение или берем первое
        const primaryImage = kitchenImages.find(img => img.is_primary)?.image_url ||
                            kitchenImages[0]?.image_url ||
                            "/placeholder.svg?height=200&width=300"

        return {
          ...kitchen,
          primaryImage,
          kitchen_images: kitchenImages
        }
      })

      console.log("✅ Processed data:", processedData)
      setKitchens(processedData)
    } catch (error) {
      console.error("❌ Error in fetchKitchens:", error)
      showError("Не удалось загрузить список кухонь")
    } finally {
      console.log("🏁 fetchKitchens completed")
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    console.log("🔍 handleSearch called")
    e.preventDefault()
    debouncedFetch()
  }

  const handleClearFilters = () => {
    console.log("🧹 handleClearFilters called")
    setSelectedCategory("")
    setSelectedCity("")
    setSelectedType("")
    setPriceRange([0, 10000])
    setAreaRange([0, 200])
    setHasProjector(false)
    setHasPhotoZone(false)
    setHasDishwasher(false)
    setSearchQuery("")
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1 py-8">
        <h1 className="text-3xl font-bold mb-8">Поиск кухонь</h1>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Filters */}
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
                  <div className="space-y-2">
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
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="location">
                <AccordionTrigger>Местоположение</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
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
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="type">
                <AccordionTrigger>Тип кухни</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
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
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="price">
                <AccordionTrigger>Цена за час</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <Slider
                      value={priceRange}
                      min={0}
                      max={10000}
                      step={100}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                    />
                    <div className="flex items-center justify-between">
                      <span>{priceRange[0]} ₽</span>
                      <span>{priceRange[1]} ₽</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="area">
                <AccordionTrigger>Площадь</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <Slider
                      value={areaRange}
                      min={0}
                      max={200}
                      step={5}
                      onValueChange={(value) => setAreaRange(value as [number, number])}
                    />
                    <div className="flex items-center justify-between">
                      <span>{areaRange[0]} м²</span>
                      <span>{areaRange[1]} м²</span>
                    </div>
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

          {/* Kitchen List */}
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
                              : kitchen.kitchen_type === "industrial"
                                ? "Промышленная"
                                : kitchen.kitchen_type}
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
                <p className="text-muted-foreground mt-2">Попробуйте изменить параметры поиска или сбросить фильтры</p>
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
