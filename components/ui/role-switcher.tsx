"use client"

import { useUser } from "@/lib/user-context"
import { Button } from "@/components/ui/button"
import { Home, ChefHat } from "lucide-react"

export function RoleSwitcher() {
  const { userRole, setUserRole } = useUser()

  return (
    <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg">
      <Button
        variant={userRole === "renter" ? "default" : "ghost"}
        size="sm"
        onClick={() => setUserRole("renter")}
        className="flex items-center gap-2"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Арендатор</span>
      </Button>
      <Button
        variant={userRole === "owner" ? "default" : "ghost"}
        size="sm"
        onClick={() => setUserRole("owner")}
        className="flex items-center gap-2"
      >
        <ChefHat className="w-4 h-4" />
        <span className="hidden sm:inline">Владелец</span>
      </Button>
    </div>
  )
}
