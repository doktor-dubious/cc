'use client';

import { useRouter, usePathname }   from 'next/navigation';
import { useState, useEffect }      from 'react';
import Link                         from 'next/link'
import { Button }                   from "@/components/ui/button"
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
}                                   from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback }   from "@/components/ui/avatar"

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
import { useLocale, useTranslations } from 'next-intl';
import { locales, localeConfig, type Locale } from '@/i18n/locales';
import { setLocale } from '@/app/actions/locale';

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
    const locale = useLocale();
    const t = useTranslations('Sidebar');
    const [openSubmenu, setOpenSubmenu] = useState<string | null>('tasks1'); // ← Set initial value here
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const [pollingInterval, setPollingInterval] = useState(30000); // Default 30 seconds

    const handleSubmenuToggle = (menuName: string) => {
    setOpenSubmenu(prev => prev === menuName ? null : menuName);
};

let pathname = usePathname();

// Map routes to titles
const getPageTitle = () => 
{
    if (pathname.includes('/asset'))            return t('assets');
    if (pathname.includes('/task'))             return t('tasks');
    if (pathname.includes('/organization'))     return t('organizations');
    if (pathname.includes('/profile'))          return t('profiles');
    if (pathname.includes('/upload-files'))     return t('uploadFiles');
    if (pathname.includes('/incomming-files'))  return t('incommingFiles');
    if (pathname.includes('/settings'))         return t('profileSettings');
    if (pathname.includes('/home'))             return t('home');

    return 'Dashboard';
};

// ── Change Organization Drop Down ───────────────────────────────────────
function OrganizationSwitcher()
{
    const { organizations, sortedOrganizations, activeOrganization, setActiveOrganization } = useOrganization();

    if (!activeOrganization) return null;

    // Only one Organization → Badge (icon only when collapsed).
    if (organizations.length === 1)
    {
        return (
<div className="
    flex
    w-full
    my-3
    py-3
    bg-secondary
    text-muted-foreground
    group-data-[collapsible=icon]:justify-center
    group-data-[collapsible=icon]:px-0"
>
  <Building2 className="pl-2 h-6 w-6 group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
  <Badge
    variant="secondary"
    className="group-data-[collapsible=icon]:hidden"
  >
    {activeOrganization.name}
  </Badge>
</div>
        );
    }

    // Multiple Organizations → Dropdown (icon only when collapsed, dropdown on click).
    return (
<div className="
    flex
    w-full
    my-3
    bg-secondary
    text-muted-foreground"
>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="secondary"
        className="
            w-full
            h-7
            min-w-0
            gap-2
            px-3
            py-4
            rounded-none
            bg-secondary
            text-muted-foreground
            text-xs
            flex
            items-center
            group-data-[collapsible=icon]:justify-center
            group-data-[collapsible=icon]:px-0
            group-data-[collapsible=icon]:min-w-0"
      >
        <Building2 className="h-3! w-3! shrink-0" />
        <span className="ml-2 flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
          {activeOrganization.name}
        </span>
        <ChevronDown className="h-31 w-3! ml-auto shrink-0 group-data-[collapsible=icon]:hidden" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="center" className="
        rounded-none
        w-(--sidebar-width)">
      <DropdownMenuLabel>{t('organizations')}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {sortedOrganizations.map(org => (
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
</div>
    );
}

function SidebarLogo()
{
    const { toggleSidebar, state } = useSidebar()
    const router = useRouter()

    const handleLogoClick = () => {
      if (state === 'collapsed') {
        toggleSidebar();
      } else {
        router.push('/home');
      }
    };

    return (
      <div className="bg-(--sidebar) w-full pr-4 flex items-center group-data-[collapsible=icon]:pr-0 group-data-[collapsible=icon]:justify-center">
        <button
          onClick={handleLogoClick}
          className="
            bg-(--sidebar)
            cursor-pointer
            flex items-center gap-2 flex-1 min-w-0
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
        </button>

        <button
          onClick={toggleSidebar}
          className="
            cursor-pointer
            p-1
            hover:bg-muted/50
            rounded
            transition-colors
            group-data-[collapsible=icon]:hidden
          "
        >
          <PanelLeft
            size={18}
            strokeWidth={1.25}
          />
        </button>
      </div>
  )
}

function TaskSidebarSections({
  openSubmenu,
  handleSubmenuToggle,
  openTasks,
  waitingTasks,
  urgentTasks,
  t,
}: {
  openSubmenu: string | null;
  handleSubmenuToggle: (name: string) => void;
  openTasks: any[];
  waitingTasks: any[];
  urgentTasks: any[];
  t: (key: string) => string;
}) {
  const { state, setOpen } = useSidebar();

  const handleSectionClick = (menuName: string) => {
    if (state === 'collapsed') {
      setOpen(true);
      handleSubmenuToggle(menuName);
    } else {
      handleSubmenuToggle(menuName);
    }
  };

  const sections = [
    { key: 'tasks1', label: t('currentTasks'), tasks: openTasks },
    { key: 'tasks2', label: t('waitingTasks'), tasks: waitingTasks },
    { key: 'tasks3', label: t('urgentTasks'), tasks: urgentTasks },
  ];

  return (
    <SidebarGroup>
      {sections.map(({ key, label, tasks }) => (
        <Collapsible
          key={key}
          open={openSubmenu === key}
          onOpenChange={() => handleSectionClick(key)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="flex w-full items-center hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none">
                <Target size={16} />
                <span>{label}</span>
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
              {tasks.map((task: any) => (
              <SidebarMenuSub key={task.id}>
                <SidebarMenuSubItem className="h-auto">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuSubButton asChild className="hover:bg-neutral-800 hover:text-white dark:hover:bg-neutral-800 rounded-none h-auto py-2">
                          <Link href={`/task?id=${task.id}`} title={task.name} className="flex items-start gap-2">
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
      ))}
    </SidebarGroup>
  );
}

  const openTasks = tasks.filter(task => task.status === 'OPEN');
  const waitingTasks = tasks.filter(task => task.status === 'NOT_STARTED');
  const closedTasks = tasks.filter(task => task.status === 'CLOSED');

  const urgentTasks = tasks.filter(task => {
    if (task.status === 'CLOSED' || task.status === 'COMPLETED') return false;
    if (!task.endAt) return false;
    const now = Date.now();
    const end = new Date(task.endAt).getTime();
    if (now >= end) return true; // past due
    if (!task.startAt) return false;
    const start = new Date(task.startAt).getTime();
    const total = end - start;
    if (total <= 0) return true;
    const remaining = end - now;
    return remaining <= total * 0.1;
  });

  // Fetch settings to get polling interval
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data.pollingInterval) {
          setPollingInterval(data.data.pollingInterval);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/message/unread-count');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessageCount(data.data.count);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch settings and unread count on mount
  useEffect(() => {
    fetchSettings();
    fetchUnreadCount();

    const handleRefresh = () => {
      fetchUnreadCount();
    };

    window.addEventListener('refreshPage', handleRefresh);
    return () => window.removeEventListener('refreshPage', handleRefresh);
  }, []);

  // Periodic polling - only check for new unread messages (lightweight)
  // Full page refresh (refreshPage event) is reserved for manual actions only
  useEffect(() => {
    // When user returns to the tab, do a lightweight unread count check
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    };

    // Periodically poll only the unread message count (bell icon)
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        setIsRefreshing(true);
        fetchUnreadCount().finally(() => {
          setTimeout(() => setIsRefreshing(false), 1500);
        });
      }
    }, pollingInterval);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollingInterval]);


  return (
    <UserProvider user={user}>
      <OrganizationProvider organizations={organizations}>
      <TaskProvider tasks={tasks}>

    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <Sidebar 
          collapsible="icon" 
          className="
            border-0 
            group-data-[side=left]:border-r-0 
            group-data-[side=right]:border-l-0 
            w-(--sidebar-width)
            text-muted-foreground 
            overflow-x-hidden
            select-none"
        >

          <SidebarHeader className="h-10 px-2 bg-sidebar border-b flex items-center">
            <SidebarLogo />
          </SidebarHeader>
          
          <SidebarContent className="overflow-x-hidden">

            {/* SELECT ORGANIZATION */}
            <div className="flex items-center gap-2 w-full">
              <OrganizationSwitcher />
            </div>

            <Button
              variant="ghost"
              className="rounded-none mx-2 mt-2 pl-2 group-data-[collapsible=icon]:hidden"
              onClick={() => router.push('/task?new=1')}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0"><PlusSquare size={16} className="mr-1" />
                {t('newTask')}
              </div>
            </Button>
            <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

            <TaskSidebarSections
              openSubmenu={openSubmenu}
              handleSubmenuToggle={handleSubmenuToggle}
              openTasks={openTasks}
              waitingTasks={waitingTasks}
              urgentTasks={urgentTasks}
              t={t}
            />
          </SidebarContent>

          <SidebarFooter className="bg-muted/50 p-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 rounded-none hover:bg-muted/80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:gap-0">
                    <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6">
                      <AvatarFallback className="bg-muted-foreground/20">R</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                      <span className="text-xs font-medium truncate block max-w-full">{user.name}</span>
                    </div>
                    <ChevronUp className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="
                  w-56 
                  font-normal 
                  bg-white 
                  dark:bg-[rgb(38,38,38)] 
                  text-muted-foreground"
                >


                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/home')}>
                    {t('home')}
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
                        {t('organizations')}
                      </DropdownMenuItem>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* Organizations (ADMIN) */}
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/profile')}>
                        {t('profiles')}
                      </DropdownMenuItem>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* Tasks (ADMIN) */}
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/task')}>
                        {t('tasks')}
                      </DropdownMenuItem>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* Assets (ADMIN) */}
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/asset')}>
                        {t('assets')}
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
>{t('externalAssetManagement')}</DropdownMenuLabel>

                      {/* ------------------------------------------------------------- */}
                      {/* Incomming files (SFTP/FTP) (ADMIN) */}
                      {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                        <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/upload-files')}>
                          {t('uploadFiles')}
                        </DropdownMenuItem>
                      )}

                      {/* ------------------------------------------------------------- */}
                      {/* Incomming files (SFTP/FTP) (ADMIN) */}
                      {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                        <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/incomming-files')}>
                          {t('incommingFiles')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/message')}>
                    {t('messages')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/audit-trail')}>
                    {t('auditTrail')}
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>{t('reports')}</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="text-muted-foreground font-normal">
                        <DropdownMenuItem>{t('statusReports')}</DropdownMenuItem>
                        <DropdownMenuItem>{t('statusReports')}</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/turk')}>
                    {t('mechanicalTurk')}
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
>{t('documentation')}</DropdownMenuLabel>

                  <DropdownMenuGroup>
                  <DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/cis/controls')}>
                    {t('cis')}
                    <DropdownMenuShortcut><Cog /></DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>{t('academy')}</DropdownMenuItem>
                  <DropdownMenuItem>
                    {t('ai')}
                    <DropdownMenuShortcut><Bot /></DropdownMenuShortcut>
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>{t('learnMore')}</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="text-muted-foreground font-normal">
                        <DropdownMenuItem>{t('aboutComplianceCircle')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>{t('privacyPolicy')}</DropdownMenuItem>
                        <DropdownMenuItem>{t('termsOfService')}</DropdownMenuItem>
                        <DropdownMenuItem>{t('blog')}
                          <DropdownMenuShortcut><ExternalLink /></DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />

                  {/* Settings Section */}
                  <DropdownMenuGroup>
                    {/* Theme Toggle Button */}
                    <DropdownMenuLabel className="flex text-muted-foreground font-normal">{t('theme')}
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
                      {t('profileSettings')}
                    </DropdownMenuItem>
                    {user.role === 'SUPER_ADMIN' && (
                      <DropdownMenuItem onClick={() => router.push('/settings/application')}>
                        {t('applicationSettings')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t('language')}</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="text-muted-foreground font-normal">
                          {locales.map((code) => {
                            const { label, flag: Flag } = localeConfig[code];
                            return (
                              <DropdownMenuItem
                                key={code}
                                className={`cursor-pointer ${locale === code ? 'font-bold' : ''}`}
                                onClick={async () => { await setLocale(code); router.refresh(); }}
                              >
                                <Flag className="w-4 h-3" />{label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={async () => {
                      await fetch('/api/user/logout', { method: 'POST' });
                      router.push('/login');
                    }}>
                    {t('logOut')}
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
          <header className="flex items-center justify-left h-10">
            <div className="ml-8 w-80">
              <h1 className="text-base font-semibold text-[rgb(245,245,245)] h-[21px] leading-[21px] tracking-[-0.05px] select-none">
                {getPageTitle()}
              </h1>
            </div>

            {/* MOVED:: SELECT ORGANIZATION 
            <div className="flex items-center gap-2">
              <OrganizationSwitcher />
            </div>
            */}

            {/* ACTIONS */ }
            <div className="
                flex
                items-end
                gap-2
                ml-auto
                mr-2">
              {/* Messages/Notifications Icon with Badge */}
              <div className="relative">
                <Bell
                  className="
                    w-6 h-6
                    text-muted-foreground
                    hover:text-foreground
                    cursor-pointer
                    transition-colors
                  "
                  onClick={() => {
                    // Handle message/notification click
                    console.log('Messages clicked');
                  }}
                />
                {/* Notification Badge */}
                {messageCount > 0 && (
                  <span className="
                      absolute
                      -top-1
                      -right-1
                      bg-red-500
                      text-white
                      text-[10px]
                      font-semibold
                      rounded-full
                      h-4
                      w-4
                      flex
                      items-center
                      justify-center
                      pointer-events-none
                    ">
                    {messageCount}
                  </span>
                )}
              </div>
              {/* Refresh Icon */}
              <Cog 
                className={`
                  w-6 h-6
                  ${isRefreshing ? 'text-foreground animate-spin' : 'text-muted-foreground hover:text-foreground'}
                  cursor-pointer
                  transition-transform
                `}
                onClick={() => {
                  setIsRefreshing(true);
                  window.dispatchEvent(new Event('refreshPage'));
                  setTimeout(() => setIsRefreshing(false), 1500);
                }}
              />
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