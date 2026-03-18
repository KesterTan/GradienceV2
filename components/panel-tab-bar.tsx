"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PanelTab {
  id: string
  label: string
  icon?: React.ReactNode
  closable?: boolean
}

interface PanelTabBarProps {
  tabs: PanelTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  className?: string
  trailing?: React.ReactNode
}

export function PanelTabBar({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  className,
  trailing,
}: PanelTabBarProps) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-0 border-b bg-zinc-900 px-0",
        className
      )}
      role="tablist"
      aria-label="Panel tabs"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex h-full items-center gap-1.5 border-r border-zinc-700/50 px-3.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
            )}
          >
            {tab.icon && (
              <span className="flex size-3.5 items-center justify-center">
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.closable && (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Close ${tab.label}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose?.(tab.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.stopPropagation()
                    onTabClose?.(tab.id)
                  }
                }}
                className="ml-1 flex size-4 items-center justify-center rounded-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                <X className="size-3" />
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
            )}
          </button>
        )
      })}
      {trailing && (
        <div className="ml-auto flex items-center gap-1 px-2">
          {trailing}
        </div>
      )}
    </div>
  )
}
