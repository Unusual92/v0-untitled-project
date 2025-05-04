"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCustomToast } from "@/components/ui/custom-toast"
import { Loader2 } from "lucide-react"

export default function NewKitchenPage() {
  const { user, userRole } = useUser()
  const router = useRouter()
  const { showSuccess, showError } = useCustomToast()
  const supabase = getSupabaseClient()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [district, setDistrict] = useState("")
  const [pricePerHour, setPricePerHour] = useState("")
  const [areaSqm, setAreaSqm] = useState("")
  const [kitchenType, setKitchenType] = useState("")
  const [hasProjector, setHasProjector] = useState(false)
  const [hasPhotoZone, setHasPhotoZone] = useState(false)
  const [hasDishwasher, setHasDishwasher] = useState(false)
  const [category, setCategory] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files)
      setImages(fileArray)

      // Create preview URLs for the images
      const newImageUrls = fileArray.map((file) => URL.createObjectURL(file))
      setImagePreviewUrls(newImageUrls)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showError("Пожалуйста, войдите в систему для добавления кухни")
      router.push("/login")
      return
    }

    if (userRole !== "owner") {
      showError("Только владельцы могут добавлять кухни")
      return
    }

    // Validate form
    if (!title || !address || !city || !pricePerHour || !areaSqm || !kitchenType || !category) {
      showError("Пожалуйста, заполните все обязательные поля")
      return
    }

    setLoading(true)

    try {
      // Insert kitchen
      const { data: kitchenData, error: kitchenError } = await supabase
        .from("kitchens")
        .insert({
          owner_id: user.id,
          title,
          description,
          address,
          city,
          district: district || null,
          price_per_hour: Number.parseFloat(pricePerHour),
          area_sqm: Number.parseInt(areaSqm),
          kitchen_type: kitchenType,
          has_projector: hasProjector,
          has_photo_zone: hasPhotoZone,
          has_dishwasher: hasDishwasher,
          category,
        })
        .select()

      if (kitchenError) throw kitchenError

      const kitchenId = kitchenData[0].id

      // Upload images if any
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          const fileExt = image.name.split(".").pop()
          const fileName = `${kitchenId}/${Date.now()}-${i}.${fileExt}`

          // Upload image to storage
          const { error: uploadError } = await supabase.storage.from("kitchen-images").upload(fileName, image)

          if (uploadError) throw uploadError

          // Get public URL
          const { data: urlData } = supabase.storage.from("kitchen-images").getPublicUrl(fileName)

          // Insert image record
          const { error: imageError } = await supabase.from("kitchen_images").insert({
            kitchen_id: kitchenId,
            image_url: urlData.publicUrl,
            is_primary: i === 0, // First image is primary
          })

          if (imageError) throw imageError
        }
      }

      showSuccess("Ваша кухня успешно добавлена")

      router.push(`/kitchens/${kitchenId}`)
    } catch (error) {
      console.error("Error adding kitchen:", error)
      showError("Не удалось добавить кухню")
    } finally {
      setLoading(false)
    }
  }

  // Clean up object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviewUrls])

  if (!user) {
    router.push("/login")
    return null
  }

  if (userRole !== "owner") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Доступ запрещен</h2>
            <p className="text-muted-foreground mt-2">Только владельцы могут добавлять кухни</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              На главную
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-1 py-8">
        <h1 className="text-3xl font-bold mb-8">Добавить новую кухню</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
            <div className="space-y-8">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Основная информация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Название кухни *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Например: Современная кухня в центре города"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Подробное описание кухни, особенности, преимущества..."
                      rows={5}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="address">Адрес *</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Улица, дом"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Город *</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Город"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Район</Label>
                    <Input
                      id="district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Район города (необязательно)"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Характеристики</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pricePerHour">Цена за час (₽) *</Label>
                      <Input
                        id="pricePerHour"
                        type="number"
                        value={pricePerHour}
                        onChange={(e) => setPricePerHour(e.target.value)}
                        placeholder="1000"
                        min="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="areaSqm">Площадь (м²) *</Label>
                      <Input
                        id="areaSqm"
                        type="number"
                        value={areaSqm}
                        onChange={(e) => setAreaSqm(e.target.value)}
                        placeholder="50"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="kitchenType">Тип кухни *</Label>
                      <Select value={kitchenType} onValueChange={setKitchenType} required>
                        <SelectTrigger id="kitchenType">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Открытая</SelectItem>
                          <SelectItem value="island">Островная</SelectItem>
                          <SelectItem value="industrial">Промышленная</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Категория *</Label>
                      <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="events">Для мероприятий</SelectItem>
                          <SelectItem value="professional">Профессиональная</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label>Дополнительные опции</Label>
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
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Фотографии</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="images">Загрузите фотографии кухни</Label>
                    <Input
                      id="images"
                      type="file"
                      onChange={handleImageChange}
                      accept="image/*"
                      multiple
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Первая фотография будет использоваться как основная. Рекомендуемый размер: 1200x800 пикселей.
                    </p>
                  </div>

                  {imagePreviewUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative aspect-[4/3] bg-muted rounded-md overflow-hidden">
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              Основное фото
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Публикация</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Проверьте правильность заполнения всех полей перед публикацией кухни.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Название:</span>
                      <span className="font-medium truncate max-w-[200px]">{title || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Адрес:</span>
                      <span className="font-medium truncate max-w-[200px]">{address || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Цена за час:</span>
                      <span className="font-medium">{pricePerHour ? `${pricePerHour} ₽` : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Площадь:</span>
                      <span className="font-medium">{areaSqm ? `${areaSqm} м²` : "—"}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Публикация...
                      </>
                    ) : (
                      "Опубликовать объявление"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
