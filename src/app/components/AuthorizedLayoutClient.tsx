'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  SidebarSeparator,
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarInset,
  SidebarContent,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar"

import { 
  Moon, 
  Sun, 
  ChevronDown, 
  Home, 
  FileText, 
  User, 
  LogOut,
  PanelLeft,
  ChevronUp,

  Settings,
  Bell,
  HelpCircle,
  Palette,

  CheckSquare,
  ListTodo,
  ClipboardList,
  FileCheck,
  Target,

  Plus,
  PlusCircle,
  PlusSquare,

  Hexagon,
  Building2,
  Settings2,
  UserCog,

  Bot,
  Cpu,
  CircuitBoard,
  Lightbulb,

  Gear,
  Cog,
  ExternalLink
  
} from "lucide-react"
import { useTheme } from "next-themes"

import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  CircleChevronDownIcon,
  CogIcon,
  PanelLeftCloseIcon
} from "@/components/ui/cc/icons/animated-icons"

import { UserProvider }         from '@/context/UserContext';
import { TaskProvider }         from '@/context/TaskContext';
import { OrganizationProvider } from '@/context/OrganizationContext';
import type { organizationData } from '@/lib/database/organization';

import { useTasks } from '@/context/TaskContext';
import type { UserRole } from '@prisma/client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/context/OrganizationContext';

interface User
{
    name          : string;
    email         : string;
    role          : UserRole;
    nickname      : string;
    workFunction? : string;
}

export default function AuthorizedLayout({children, user, organizations, tasks}: 
{
    children: React.ReactNode;
    user    : User;
    organizations: organizationData[];
    tasks: any[];
}) 
{
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [openSubmenu, setOpenSubmenu] = useState<string | null>('tasks1'); // ← Set initial value here

    const handleSubmenuToggle = (menuName: string) => {
    setOpenSubmenu(prev => prev === menuName ? null : menuName);
};

function OrganizationSwitcher()
{
    const { organizations, activeOrganization, setActiveOrganization } = useOrganization();

    if (!activeOrganization) return null;

    // Only one Organiszation → Badge.
    if (organizations.length === 1)
    {
      return (
        <Badge 
          variant="secondary" 
          className="min-w-32 px-3 py-1 rounded-sm text-muted-foreground"
        >
          <Building2 className="mr-2 h-4 w-4" />
          {activeOrganization.name}
        </Badge>
      );
  }

  // Multiple Organiszation → Dropdown.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary" 
          className="h-7 min-w-48 gap-2 px-3 py-1 rounded-sm text-muted-foreground text-xs flex items-center"
        >
          <Building2 className="!h-3 !w-3 shrink-0" />
          <span className="ml-2 flex-1 truncate text-left">
            {activeOrganization.name}
          </span>
          <ChevronDown className="!h-3 !w-3 ml-auto shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="rounded-none min-w-48">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map(org => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setActiveOrganization(org)}
            className="cursor-pointer"
          >
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarLogo()
{
    const { toggleSidebar } = useSidebar()

    return (
      <>
      <div className="bg-(--sidebar) w-full pr-4">
<button
    onClick={toggleSidebar}
    className="
        bg-(--sidebar)
        cursor-pointer
        flex items-center gap-2 w-full
        transition-colors
        group-data-[collapsible=icon]:justify-center
        group-data-[collapsible=icon]:p-2
    "
>
<img
    src="/compliance-circle-logo.png"
    alt="Compliance Circle"
    className="cursor-pointer h-6 w-6 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4"
/>
<span
    className="
        font-thin 
        text-sm
        select-none 
        group-data-[collapsible=icon]:hidden 
        hover:tracking-widest
        duration-800 ease-out
    ">
    Compliance Circle
</span>

  <PanelLeft
    size={18}
    strokeWidth={1.25}
    className="ml-auto -mr-2 group-data-[collapsible=icon]:hidden" />
</button>
</div>
</>
  )
}

  const openTasks = tasks.filter(task => task.status === 'OPEN');
  const waitingTasks = tasks.filter(task => task.status === 'NOT_STARTED');
  const closedTasks = tasks.filter(task => task.status === 'CLOSED');


  return (
    <UserProvider user={user}>
      <OrganizationProvider organizations={organizations}>
      <TaskProvider tasks={tasks}>

    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <Sidebar 
          collapsible="icon" 
          className="border-0 group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0 w-64 text-muted-foreground overflow-x-hidden"
        >

          <SidebarHeader className="h-10 px-2 bg-(--sidebar) border-b flex items-center">
            <SidebarLogo />
          </SidebarHeader>
          
          <SidebarContent className="overflow-x-hidden">
            <Button 
              variant="ghost" 
              className="rounded-none mx-2 mt-2 pl-2"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0"><PlusSquare size={16} className="mr-1" />
                New Task
              </div>
            </Button>
            <SidebarSeparator />

            <SidebarGroup>
              {/* -------------------------------------------------------------------------------------------- */}
              {/* Current Task Section */}
              <Collapsible 
                open={openSubmenu === 'tasks1'} 
                onOpenChange={() => handleSubmenuToggle('tasks1')}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="flex w-full items-center hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none">
                      <Target size={16} />
                      <span>Current Tasks</span>
                      <ChevronDownIcon size={16} className="ml-auto transition-transform duration-200 ease-in-out group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>

                <CollapsibleContent 
                  className="
                    overflow-hidden 
                    transition-all 
                    duration-400 ease-in-out 
                    data-[state=closed]:animate-collapsible-up 
                    data-[state=open]:animate-collapsible-down
                  ">
                    {openTasks.map(task => (
                    <SidebarMenuSub key={task.id}>
                      <SidebarMenuSubItem className="h-auto">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuSubButton asChild className="hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none h-auto py-2">
                                <Link href="/task-overview" title={task.name} className="flex items-start gap-2">
                                  <CheckSquare size={16} className="shrink-0 mt-0.5" />
                                  <div className="line-clamp-3">{task.name}</div>
                                </Link>
                              </SidebarMenuSubButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{task.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                    ))}
                </CollapsibleContent>
              </Collapsible>

              {/* -------------------------------------------------------------------------------------------- */}
              {/* Waiting Task Section */}
              <Collapsible 
                open={openSubmenu === 'tasks2'} 
                onOpenChange={() => handleSubmenuToggle('tasks2')}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="flex w-full items-center hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none rounded-none">
                      <Target size={16} />
                      <span>Waiting Tasks</span>
                      <ChevronDownIcon size={16} className="ml-auto transition-transform duration-200 ease-in-out group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                  
                <CollapsibleContent 
                  className="
                    overflow-hidden 
                    transition-all 
                    duration-400 ease-in-out 
                    data-[state=closed]:animate-collapsible-up 
                    data-[state=open]:animate-collapsible-down
                  ">
                    {waitingTasks.map(task => (
                    <SidebarMenuSub key={task.id}>
                      <SidebarMenuSubItem className="h-auto">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuSubButton asChild className="hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none h-auto py-2">
                                <Link href="/task-overview" title={task.name} className="flex items-start gap-2">
                                  <CheckSquare size={16} className="shrink-0 mt-0.5" />
                                  <div className="line-clamp-3">{task.name}</div>
                                </Link>
                              </SidebarMenuSubButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{task.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                    ))}

                </CollapsibleContent>
              </Collapsible>

              {/* -------------------------------------------------------------------------------------------- */}
              {/* Urgent Task Section */}
              <Collapsible 
                open={openSubmenu === 'tasks3'} 
                onOpenChange={() => handleSubmenuToggle('tasks3')}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="flex w-full items-center hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none">
                      <Target size={16} />
                      <span>Urgent Tasks</span>
                      <ChevronDownIcon size={16} className="ml-auto transition-transform duration-200 ease-in-out group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                  
                <CollapsibleContent 
                  className="
                    overflow-hidden 
                    transition-all 
                    duration-400 ease-in-out 
                    data-[state=closed]:animate-collapsible-up 
                    data-[state=open]:animate-collapsible-down
                  ">
                    {openTasks.map(task => (
                    <SidebarMenuSub key={task.id}>
                      <SidebarMenuSubItem className="h-auto">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuSubButton asChild className="hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none h-auto py-2">
                                <Link href="/task-overview" title={task.name} className="flex items-start gap-2">
                                  <CheckSquare size={16} className="shrink-0 mt-0.5" />
                                  <div className="line-clamp-3">{task.name}</div>
                                </Link>
                              </SidebarMenuSubButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{task.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                    ))}
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="bg-muted/50 p-0 group-data-[collapsible=icon]:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-3 rounded-none hover:bg-muted/80"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted-foreground/20">R</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left flex-1 overflow-hidden">
                      <span className="text-xs font-medium truncate block max-w-full">{user.name}</span>
                      { /* <span className="text-xs font-medium">Skardhamar</span> */ }
                    </div>
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="width: var(----sidebar-width) font-normal bg-white dark:bg-[rgb(38,38,38)] text-muted-foreground">


                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/dashboard')}>
                    Home
                    <DropdownMenuShortcut><Home /></DropdownMenuShortcut>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                    {/* ------------------------------------------------------------- */}
                    {/* Organizations (SUPER_ADMIN) */}
                    {user.role === 'SUPER_ADMIN' && (
                      <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/organization')}>
                        Organizations
                      </DropdownMenuItem>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* Organizations (ADMIN) */}
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/profile')}>
                        Profiles
                      </DropdownMenuItem>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* Tasks (ADMIN) */}
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/task')}>
                        Tasks
                      </DropdownMenuItem>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* Assets (ADMIN) */}
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/asset')}>
                        Assets
                      </DropdownMenuItem>
                    )}

                    </DropdownMenuGroup>
                      </>
                  )}

                  {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuSeparator />
                                        <DropdownMenuLabel
  className="
    text-xs
    font-regular
    text-neutral-300
    leading-[21px]
    uppercase
    tracking-tight
    pt-2 pr-2 pb-1 pl-0
    m-0
  "
>External Asset Management</DropdownMenuLabel>

                      {/* ------------------------------------------------------------- */}
                      {/* Incomming files (SFTP/FTP) (ADMIN) */}
                      {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                        <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/upload-files')}>
                          Upload Files
                        </DropdownMenuItem>
                      )}

                      {/* ------------------------------------------------------------- */}
                      {/* Incomming files (SFTP/FTP) (ADMIN) */}
                      {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                        <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/incomming-files')}>
                          Incomming Files
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/incomming-files')}>
                    Messages
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Reports</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="text-muted-foreground font-normal">
                        <DropdownMenuItem>Status Reports</DropdownMenuItem>
                        <DropdownMenuItem>Status Reports</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/turk')}>
                    Mechanical Turk
                  </DropdownMenuItem>


                  {/* Learning Centre Section */}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel
  className="
    text-xs
    font-regular
    text-neutral-300
    leading-5.25
    uppercase
    tracking-tight
    pt-2 pr-2 pb-1 pl-0
    m-0
  "
>Documentation</DropdownMenuLabel>

                  <DropdownMenuGroup>
                  <DropdownMenuItem>
                    Wheel
                    <DropdownMenuShortcut><Cog /></DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Academy</DropdownMenuItem>
                  <DropdownMenuItem>
                    AI
                    <DropdownMenuShortcut><Bot /></DropdownMenuShortcut>
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Learn More</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="text-muted-foreground font-normal">
                        <DropdownMenuItem>About Compliance Circle</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Privacy Policy</DropdownMenuItem>
                        <DropdownMenuItem>Terms of Service</DropdownMenuItem>
                        <DropdownMenuItem>Blog
                          <DropdownMenuShortcut><ExternalLink /></DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />

                  {/* Settings Section */}
                  <DropdownMenuGroup>
                    {/* Theme Toggle Button */}
                    <DropdownMenuLabel className="flex text-muted-foreground font-normal">Theme
                    <span
                      className="ml-auto"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </span>

                    </DropdownMenuLabel>

                    <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Language</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="text-muted-foreground font-normal">
                          <DropdownMenuItem>English</DropdownMenuItem>
                          <DropdownMenuItem>Dansk</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={async () => {
                      await fetch('/api/user/logout', { method: 'POST' });
                      router.push('/login');
                    }}>
                    Log out
                    <DropdownMenuShortcut><LogOut /></DropdownMenuShortcut>
                  </DropdownMenuItem>
                  </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex-1">
          {/* Header with theme toggle */}
          <header className="flex items-center justify-left h-10">
            <div className="flex items-center gap-2">
              <OrganizationSwitcher />
            </div>
            
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-0 py-4 px-6">
            <p className="text-sm text-muted-foreground text-center">
              © 2026 Compliance Circle. All rights reserved.
            </p>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
       </TaskProvider>
    </OrganizationProvider>
   </UserProvider>
  );
}