import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ChefHat, Calendar, ShoppingBag } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-primary/20 to-background py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Аренда кухонь для мероприятий и профессионального использования
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Найдите идеальную кухню для вашего мероприятия или профессиональной деятельности. Бронируйте онлайн
                    и заказывайте продукты.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/kitchens?category=events">Для мероприятий</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/kitchens?category=professional">Профессиональные</Link>
                  </Button>
                </div>
              </div>
              <div className="mx-auto lg:mx-0 relative">
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  alt="Modern kitchen"
                  width={600}
                  height={400}
                  className="rounded-lg object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Как это работает</h2>
              <p className="max-w-[600px] mx-auto text-muted-foreground">
                Простой процесс аренды кухни для любых целей
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <ChefHat className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Выберите кухню</h3>
                <p className="text-muted-foreground">
                  Просмотрите каталог кухонь и выберите подходящую для ваших целей
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Забронируйте время</h3>
                <p className="text-muted-foreground">Выберите удобную дату и время для аренды кухни</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <ShoppingBag className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Закажите продукты</h3>
                <p className="text-muted-foreground">При желании закажите продукты, которые будут ждать вас на кухне</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 md:py-24 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Категории кухонь</h2>
              <p className="max-w-[600px] mx-auto text-muted-foreground">
                Выберите тип кухни, который подходит для ваших целей
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Link href="/kitchens?category=events" className="group relative overflow-hidden rounded-lg">
                <Image
                  src="/placeholder.svg?height=300&width=600"
                  alt="Event kitchen"
                  width={600}
                  height={300}
                  className="w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">Для мероприятий</h3>
                    <p>Уютные пространства с декором для праздников и встреч</p>
                  </div>
                </div>
              </Link>
              <Link href="/kitchens?category=professional" className="group relative overflow-hidden rounded-lg">
                <Image
                  src="/placeholder.svg?height=300&width=600"
                  alt="Professional kitchen"
                  width={600}
                  height={300}
                  className="w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">Профессиональные</h3>
                    <p>Кухни с профессиональным оборудованием для работы</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MobileNav />
    </div>
  )
}
