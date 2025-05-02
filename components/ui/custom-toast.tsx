"use client"

import { useToast } from "@/components/ui/use-toast"
import { useEffect } from "react"

interface ToastProps {
  title?: string
  message: string
  type?: "default" | "success" | "error" | "warning" | "info"
  duration?: number
}

export function useCustomToast() {
  const { toast } = useToast()

  const showToast = ({ title, message, type = "default", duration = 5000 }: ToastProps) => {
    let variant: "default" | "destructive" = "default"

    if (type === "error") {
      variant = "destructive"
    }

    toast({
      title: title,
      description: message,
      variant: variant,
      duration: duration,
    })
  }

  return {
    showToast,
    showSuccess: (message: string, title?: string) =>
      showToast({ title: title || "Успешно", message, type: "success" }),
    showError: (message: string, title?: string) => showToast({ title: title || "Ошибка", message, type: "error" }),
    showWarning: (message: string, title?: string) =>
      showToast({ title: title || "Внимание", message, type: "warning" }),
    showInfo: (message: string, title?: string) => showToast({ title: title || "Информация", message, type: "info" }),
  }
}

export function ToastHandler({ message, type }: { message?: string; type?: string }) {
  const { showSuccess, showError, showInfo, showWarning } = useCustomToast()

  useEffect(() => {
    if (!message) return

    switch (type) {
      case "success":
        showSuccess(message)
        break
      case "error":
        showError(message)
        break
      case "warning":
        showWarning(message)
        break
      case "info":
        showInfo(message)
        break
      default:
        showInfo(message)
    }
  }, [message, type, showSuccess, showError, showInfo, showWarning])

  return null
}
