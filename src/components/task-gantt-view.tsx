"use client"

import * as React from "react"
import { Gantt, Willow, WillowDark } from "@svar-ui/react-gantt"
import "@svar-ui/react-gantt/all.css"
import { useTheme } from "next-themes"
import { addDays } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

interface Task {
  id: string | number
  name: string
  description?: string
  startAt?: string | Date | null
  endAt?: string | Date | null
  status: string
}

interface TaskDateChange {
  taskId: string | number
  startAt: Date
  endAt: Date
}

interface TaskGanttViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  selectedTaskId?: string | number | null
  getStatusBadge: (status: string) => string
  starredTaskIds?: Set<string>
  onToggleStar?: (taskId: string) => void
  onTaskDateChange?: (change: TaskDateChange) => void
  /** Increment this to clear pending changes (e.g., on cancel) */
  resetKey?: number
}



export function TaskGanttView({ tasks, onTaskClick, selectedTaskId, getStatusBadge, starredTaskIds, onToggleStar, onTaskDateChange, resetKey }: TaskGanttViewProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState<number | undefined>(undefined)

  // Use a key to force Gantt remount when we need to reset (on cancel)
  // This lets SVAR manage its own internal state during dragging
  const [ganttKey, setGanttKey] = React.useState(0)

  // Track the previous resetKey to detect when cancel is clicked
  const prevResetKeyRef = React.useRef(resetKey)
  React.useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      // Force Gantt to remount and reset to original task data
      setGanttKey(prev => prev + 1)
      prevResetKeyRef.current = resetKey
    }
  }, [resetKey])

  // Avoid hydration mismatch and measure container
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Measure container width on mount and resize
  React.useEffect(() => {
    if (!containerRef.current) return

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [mounted])

  // Filter tasks that have dates for the Gantt chart
  const tasksWithDates = React.useMemo(() => tasks.filter(t => t.startAt || t.endAt), [tasks])
  const tasksWithoutDates = React.useMemo(() => tasks.filter(t => !t.startAt && !t.endAt), [tasks])

  // Map task status to bar color (matching the status badge colors)
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'NOT_STARTED':
        return '#5D664D'
      case 'OPEN':
        return '#335c8c'
      case 'COMPLETED':
        return '#25693e'
      case 'CLOSED':
        return '#ad423f'
      default:
        return '#5D664D'
    }
  }

  // Custom task template for colored bars
  const TaskTemplate: React.FC<{ data: any }> = ({ data }) => {
    const originalTask = data.$original as Task | undefined
    const status = originalTask?.status || 'NOT_STARTED'
    const color = getStatusColor(status)

    return (
      <div
        className="wx-content"
        style={{
          backgroundColor: color,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '8px',
          borderRadius: '4px',
          color: 'white',
          fontSize: '13px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {data.text}
      </div>
    )
  }

  // Convert tasks to SVAR Gantt format
  // Using useMemo to create stable references - SVAR manages its own state during dragging
  // The key prop on Gantt forces remount when resetKey changes (on cancel)
  const ganttTasks = React.useMemo(() => {
    const today = new Date()

    return tasksWithDates.map((task, index) => {
      const start = task.startAt ? new Date(task.startAt) : today
      const end = task.endAt ? new Date(task.endAt) : addDays(start, 1)

      // Use index + 1 to ensure unique numeric IDs (SVAR requires numeric IDs)
      const numericId = index + 1

      return {
        id: numericId,
        text: task.name,
        start,
        end,
        duration: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
        progress: 0,
        type: "task" as const,
        lazy: false,
        starred: starredTaskIds?.has(String(task.id)) ?? false,
        // Store original task for click handler
        $original: task,
      }
    })
  }, [tasksWithDates, starredTaskIds])

  // Time scales configuration
  const scales = React.useMemo(() => [
    { unit: "month" as const, step: 1, format: "%F %Y" },
    { unit: "week" as const, step: 1, format: "Week %W" },
    { unit: "day" as const, step: 1, format: "%j" },
  ], [])

  // Custom Star cell component
  const StarCell = React.useCallback(({ row }: { row: any }) => {
    const task = row.$original
    const isStarred = starredTaskIds?.has(String(task?.id)) ?? false

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (task && onToggleStar) {
        onToggleStar(String(task.id))
      }
    }

    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-center w-full h-full hover:scale-110 transition-transform"
      >
        <Star
          className={`h-4 w-4 ${
            isStarred
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground hover:text-yellow-400'
          }`}
        />
      </button>
    )
  }, [starredTaskIds, onToggleStar])

  // Column configuration - only include the columns we want
  const columns = React.useMemo(() => [
    { id: "text", header: "Task Name", flexgrow: 1, sort: true },
    { id: "start", header: "Start Date", width: 100, align: "center" as const, sort: true },
    { id: "duration", header: "Duration", width: 80, align: "center" as const, sort: true },
    { id: "starred", header: "", width: 40, align: "center" as const, sort: true, cell: StarCell },
  ], [StarCell])

  // Handle task selection
  const handleTaskClick = React.useCallback((ev: { id: number }) => {
    const ganttTask = ganttTasks.find(t => t.id === ev.id)
    if (ganttTask && onTaskClick) {
      onTaskClick((ganttTask as any).$original)
    }
  }, [ganttTasks, onTaskClick])

  // Handle task date updates from dragging
  // SVAR manages its own internal state, so the bar stays where the user dragged it
  // We only notify about date changes - task selection is handled by clicking
  const handleTaskUpdate = React.useCallback((ev: { id: number; task: { start?: Date; end?: Date } }) => {
    const ganttTask = ganttTasks.find(t => t.id === ev.id)
    if (ganttTask && ev.task) {
      const originalTask = (ganttTask as any).$original as Task
      const newStart = ev.task.start || ganttTask.start
      const newEnd = ev.task.end || ganttTask.end

      // Notify about the date change
      if (onTaskDateChange) {
        onTaskDateChange({
          taskId: originalTask.id,
          startAt: newStart,
          endAt: newEnd,
        })
      }
    }
  }, [ganttTasks, onTaskDateChange])

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        Loading Gantt chart...
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No tasks to display
      </div>
    )
  }

  const isDark = resolvedTheme === 'dark'
  const ThemeWrapper = isDark ? WillowDark : Willow

  return (
    <div ref={containerRef} className="space-y-4 w-full">
      {/* SVAR Gantt Chart */}
      {tasksWithDates.length > 0 && containerWidth ? (
        <div
          className="gantt-wrapper border rounded-lg"
          style={{ height: '500px', width: `${containerWidth}px` }}
        >
          <ThemeWrapper fonts={false}>
            <Gantt
              key={ganttKey}
              tasks={ganttTasks}
              scales={scales}
              columns={columns}
              cellWidth={40}
              cellHeight={38}
              readonly={false}
              taskTemplate={TaskTemplate}
              onSelectTask={handleTaskClick}
              onUpdateTask={handleTaskUpdate}
            />
          </ThemeWrapper>
        </div>
      ) : tasksWithDates.length > 0 ? (
        <div className="h-96 flex items-center justify-center text-muted-foreground border rounded-lg">
          Loading Gantt chart...
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No tasks with dates to display in Gantt view.
          <br />
          <span className="text-sm">Add start/end dates to tasks to see them on the timeline.</span>
        </div>
      )}

      {/* Tasks without dates */}
      {tasksWithoutDates.length > 0 && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">
            Tasks without dates ({tasksWithoutDates.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {tasksWithoutDates.map((task) => {
              const isStarred = starredTaskIds?.has(String(task.id)) ?? false
              return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-2 text-left px-3 py-2 rounded-md border hover:bg-muted/50 transition-colors",
                  selectedTaskId === task.id && "bg-muted border-primary"
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStar?.(String(task.id))
                  }}
                  className="mt-0.5 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-4 w-4 ${
                      isStarred
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground hover:text-yellow-400'
                    }`}
                  />
                </button>
                <button
                  onClick={() => onTaskClick?.(task)}
                  className="flex-1 text-left"
                >
                  <div className="text-sm font-medium">{task.name}</div>
                  <Badge
                    variant="secondary"
                    className={cn("mt-1 text-[10px] px-1.5 py-0", getStatusBadge(task.status))}
                  >
                    {task.status.replace('_', ' ')}
                  </Badge>
                </button>
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  )
}
