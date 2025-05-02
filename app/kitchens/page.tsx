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
  

  const sosihui = async() => {
    // let query = supabase
    //     .from("kitchens")
    //     .select(
    //       `
    //       *,
    //       kitchen_images!inner (
    //         image_url,
    //         is_primary
    //       )
    //     `,
    //       { count: "exact" },
    //     )
    //     .order("created_at", { ascending: false })
    //     .limit(20)
    let { data: kitchens, error } = await supabase.from('kitchens').select('*')
    console.log(kitchens, error)
  }

  // Debounced fetch function to prevent too many requests
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
    ],
  )

  useEffect(() => {
    debouncedFetch()
    return () => {
      debouncedFetch.cancel()
    }
  }, [debouncedFetch])

  const fetchKitchens = async () => {
    setLoading(true)

    try {
      // First, fetch all cities for the filter if needed
      if (cities.length === 0) {
        const { data: citiesData } = await supabase.from("kitchens").select("city").order("city")

        if (citiesData) {
          const uniqueCities = Array.from(new Set(citiesData.map((item) => item.city)))
            .filter(Boolean)
            .sort() as string[]
          setCities(uniqueCities)
        }
      }

      // Build the query with pagination
      let query = supabase
        .from("kitchens")
        .select(
          `
          *,
          kitchen_images!inner (
            image_url,
            is_primary
          )
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .limit(20)

      // Apply filters
      if (selectedCategory && selectedCategory !== "all") {
        query = query.eq("category", selectedCategory)
      }

      if (selectedCity && selectedCity !== "all") {
        query = query.eq("city", selectedCity)
      }

      if (selectedType && selectedType !== "all") {
        query = query.eq("kitchen_type", selectedType)
      }

      if (priceRange[0] > 0) {
        query = query.gte("price_per_hour", priceRange[0])
      }

      if (priceRange[1] < 10000) {
        query = query.lte("price_per_hour", priceRange[1])
      }

      if (areaRange[0] > 0) {
        query = query.gte("area_sqm", areaRange[0])
      }

      if (areaRange[1] < 200) {
        query = query.lte("area_sqm", areaRange[1])
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
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`,
        )
      }

      const { data, error } = await query

      if (error) throw error

      // Process the data
      const processedData =
        data?.map((kitchen) => {
          const primaryImage =
            kitchen.kitchen_images?.find((img: any) => img.is_primary)?.image_url ||
            kitchen.kitchen_images?.[0]?.image_url ||
            "/placeholder.svg?height=200&width=300"

          return {
            ...kitchen,
            primaryImage,
          }
        }) || []
      let { data: kitchens} = await supabase.from('kitchens').select('*')
      setKitchens(kitchens)
    } catch (error) {
      console.error("Error fetching kitchens:", error)
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
                <Button onClick={sosihui} className="mt-4">
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
