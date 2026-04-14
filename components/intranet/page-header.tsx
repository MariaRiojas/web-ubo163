import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
  normativeRef?: string
  children?: React.ReactNode
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  normativeRef,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm ml-[52px]">{description}</p>
        )}
        {normativeRef && (
          <Badge
            variant="outline"
            className="ml-[52px] mt-2 text-xs text-muted-foreground border-muted-foreground/30"
          >
            {normativeRef}
          </Badge>
        )}
      </div>
      {children && <div className="flex gap-2 shrink-0">{children}</div>}
    </div>
  )
}
