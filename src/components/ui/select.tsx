import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within a Select")
  }
  return context
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelectContext()

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-nexa-border bg-nexa-surface px-3 py-2 text-sm text-white ring-offset-background placeholder:text-nexa-muted focus:outline-none focus:ring-2 focus:ring-nexa-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps {
  placeholder?: string
}

const SelectValue = ({ placeholder }: SelectValueProps) => {
  const { value } = useSelectContext()
  return <span>{value || placeholder}</span>
}

interface SelectContentProps {
  children: React.ReactNode
}

const SelectContent = ({ children }: SelectContentProps) => {
  const { open, setOpen } = useSelectContext()

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
      />
      {/* Content */}
      <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-nexa-border bg-nexa-surface shadow-lg">
        <div className="max-h-60 overflow-y-auto p-1">
          {children}
        </div>
      </div>
    </>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

const SelectItem = ({ value, children }: SelectItemProps) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext()

  const handleSelect = () => {
    onValueChange(value)
    setOpen(false)
  }

  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm text-white outline-none hover:bg-nexa-accent/10 focus:bg-nexa-accent/10",
        selectedValue === value && "bg-nexa-accent/20"
      )}
      onClick={handleSelect}
    >
      {children}
    </div>
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}







