'use client'

import { useState } from 'react'
import { Check, Circle, ListChecks } from 'lucide-react'
import type { ProjectTask } from '@/features/projects/types/project'
import { formatProjectDate } from '@/features/projects/utils/projectUtils'
import { Card, CardHeader } from '@/components/ui/Card'

type TaskListProps = { tasks: ProjectTask[] }
const priorityStyles = { Low: 'text-[#9CA3AF]', Medium: 'text-sky-300', High: 'text-amber-300' }

export function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const toggleTask = (id: string) => setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task))
  return <Card className="overflow-hidden"><CardHeader title="Project tasks" description={`${tasks.filter((task) => !task.completed).length} items need attention`} action={<ListChecks size={17} className="text-[#7187ff]" />} /><div className="divide-y divide-white/[0.05] px-5 sm:px-6">{tasks.length ? tasks.map((task) => <div className="flex items-start gap-3 py-4" key={task.id}><button type="button" onClick={() => toggleTask(task.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${task.completed ? 'border-emerald-400 bg-emerald-400 text-[#0B0B0D]' : 'border-white/[0.14] text-transparent hover:border-[#163DFF] hover:bg-[#163DFF] hover:text-white'}`} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`}>{task.completed ? <Check size={12} strokeWidth={2.5} /> : <Circle size={8} fill="currentColor" />}</button><div className="min-w-0 flex-1"><p className={`text-xs font-medium ${task.completed ? 'text-[#646873] line-through' : 'text-[#d5d7df]'}`}>{task.title}</p><p className="mt-1 text-[10px] text-[#646873]">{task.assignee} · Due {formatProjectDate(task.dueDate)}</p></div><span className={`shrink-0 text-[10px] font-semibold ${priorityStyles[task.priority]}`}>{task.priority}</span></div>) : <p className="py-8 text-center text-xs text-[#646873]">No tasks have been added to this project.</p>}</div></Card>
}
