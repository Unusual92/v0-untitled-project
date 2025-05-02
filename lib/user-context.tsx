"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { clearSupabaseClient, getSupabaseClient } from "./supabase/client"
import { useRouter } from "next/navigation"

type UserContextType = {
  user: User | null
  profile: any | null
  userRole: "renter" | "owner"
  setUserRole: (role: "renter" | "owner") => void
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  userRole: "renter",
  setUserRole: () => {},
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [userRole, setUserRole] = useState<"renter" | "owner">("renter")
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()
  const router = useRouter()

  // Load user role from localStorage
  useEffect(() => {
    try {
      const storedRole = localStorage.getItem("userRole")
      if (storedRole === "renter" || storedRole === "owner") {
        setUserRole(storedRole)
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
  }, [])

  // Save user role to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("userRole", userRole)
    } catch (error) {
      console.error("Error writing to localStorage:", error)
    }
  }, [userRole])

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching profile:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in fetchProfile:", error)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)

      try {
        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        const profileData = await fetchProfile(session.user.id)
        setProfile(profileData)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const refreshProfile = async () => {
    if (!user) return

    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }

  const signOut = async () => {
    try {
      // 1. Выход через Supabase
      // await supabase.auth.signOut();
      
      // 2. Очистка клиента и состояния
      clearSupabaseClient();
      setUser(null);
      setProfile(null);
  
      // 3. Очистка всех хранилищ
      // LocalStorage и SessionStorage
      localStorage.clear();
      sessionStorage.clear();
  
      // 4. Очистка всех cookies
      if (typeof document !== 'undefined') {
        // Основные cookies аутентификации Supabase
        const supabaseCookies = [
          `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '')}-auth-token`,
          'sb-access-token',
          'sb-refresh-token'
        ];
  
        // Удаляем специфичные cookies Supabase
        supabaseCookies.forEach(cookie => {
          document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          document.cookie = `${cookie}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
  
        // Удаляем все остальные cookies для текущего домена
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.trim().split('=');
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          document.cookie = `${name}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
      }
  
      // 5. Перенаправление и обновление
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        userRole,
        setUserRole,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  return useContext(UserContext)
}
