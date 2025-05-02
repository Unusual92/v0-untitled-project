"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@/lib/user-context"
import { Button } from "@/components/ui/button"
import { RoleSwitcher } from "@/components/ui/role-switcher"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageSquare, LogOut, UserIcon, Plus, ChefHat } from "lucide-react"
import { useRouter } from "next/navigation"

export function Header() {
  const { user, profile, userRole, signOut } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    return user?.email?.substring(0, 2).toUpperCase() || "U"
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            <span className="text-xl font-bold">КухниПро</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/kitchens?category=events"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === "/kitchens" &&
                new URLSearchParams(pathname.split("?")[1] || "").get("category") === "events"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Для мероприятий
            </Link>
            <Link
              href="/kitchens?category=professional"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === "/kitchens" &&
                new URLSearchParams(pathname.split("?")[1] || "").get("category") === "professional"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Профессиональные
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <RoleSwitcher />
              {userRole === "owner" && (
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2" asChild>
                  <Link href="/kitchens/new">
                    <Plus className="h-4 w-4" />
                    Добавить кухню
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ""} alt={profile?.first_name || ""} />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      <span>Профиль</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Сообщения</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
