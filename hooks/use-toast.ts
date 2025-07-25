import { useState, useEffect } from 'react'

type ToastVariant = 'default' | 'destructive'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  id?: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, variant = 'default', id }: ToastOptions) => {
    const newId = id || Math.random().toString(36).substr(2, 9)
    
    const newToast: Toast = {
      id: newId,
      title,
      description,
      variant,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newId))
    }, 5000)
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toast,
    dismiss,
    toasts,
  }
}
