"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { Home, Search, MessageSquare, User, Plus } from "lucide-react"

export function MobileNav() {
  const { user, userRole } = useUser()
  const pathname = usePathname()

  if (!user) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden">
      <div className="flex items-center justify-around p-2">
        <Link href="/" className="flex flex-col items-center p-2">
          <Home className={`h-5 w-5 ${pathname === "/" ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs mt-1">Главная</span>
        </Link>
        <Link href="/kitchens" className="flex flex-col items-center p-2">
          <Search className={`h-5 w-5 ${pathname === "/kitchens" ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs mt-1">Поиск</span>
        </Link>
        {userRole === "owner" && (
          <Link href="/kitchens/new" className="flex flex-col items-center p-2">
            <Plus className={`h-5 w-5 ${pathname === "/kitchens/new" ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs mt-1">Добавить</span>
          </Link>
        )}
        <Link href="/messages" className="flex flex-col items-center p-2">
          <MessageSquare className={`h-5 w-5 ${pathname === "/messages" ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs mt-1">Чаты</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center p-2">
          <User className={`h-5 w-5 ${pathname === "/profile" ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs mt-1">Профиль</span>
        </Link>
      </div>
    </div>
  )
}
