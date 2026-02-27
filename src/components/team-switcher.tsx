"use client"

import * as React from "react"
import { Building2, ChevronsUpDown, Plus, Search } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useOrganization } from "@/context/OrganizationContext"
import { Input } from "@/components/ui/input"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { sortedOrganizations, activeOrganization, setActiveOrganization } = useOrganization()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  // Reset search when dropdown closes
  React.useEffect(() => {
    if (!isOpen) setSearchQuery("")
  }, [isOpen])

  if (!activeOrganization) {
    return null
  }

  // Sort: active org first, then by recency (already handled by sortedOrganizations)
  const orderedOrganizations = React.useMemo(() => {
    const withoutActive = sortedOrganizations.filter(org => org.id !== activeOrganization.id)
    return [activeOrganization, ...withoutActive]
  }, [sortedOrganizations, activeOrganization])

  // Filter by search query
  const filteredOrganizations = React.useMemo(() => {
    if (!searchQuery.trim()) return orderedOrganizations
    const query = searchQuery.toLowerCase()
    return orderedOrganizations.filter(org =>
      org.name.toLowerCase().includes(query)
    )
  }, [orderedOrganizations, searchQuery])

  const showSearch = sortedOrganizations.length > 8

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrganization.name}</span>
                <span className="truncate text-xs">{activeOrganization.size}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {showSearch && (
              <div className="px-2 py-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto">
              {filteredOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setActiveOrganization(org)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Building2 className="size-3.5 shrink-0" />
                  </div>
                  <span className={org.id === activeOrganization.id ? "font-medium" : ""}>
                    {org.name}
                  </span>
                </DropdownMenuItem>
              ))}
              {filteredOrganizations.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No organizations found
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add organization</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
