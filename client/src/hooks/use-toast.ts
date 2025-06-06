import {
  ToastActionElement,
  type ToastProps,
} from "../components/ui/toast"

import {
  toast,
  useToast as useToastOriginal,
} from "../components/ui/use-toast"

// Re-export the toast function and hook
export { toast, useToast as useToastOriginal }

// Re-export the types
export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

export const useToast = useToastOriginal