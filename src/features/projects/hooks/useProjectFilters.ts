'use client'

import { useMemo, useState } from 'react'
import type { Project, ProjectSortKey, ProjectStatus, ProjectType, SortDirection } from '@/features/projects/types/project'

type ProjectFiltersState = {
  status: ProjectStatus | 'all'
  projectType: ProjectType | 'all'
}

const defaultFilters: ProjectFiltersState = { status: 'all', projectType: 'all' }

export function useProjectFilters(projects: Project[]) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ProjectFiltersState>(defaultFilters)
  const [sortKey, setSortKey] = useState<ProjectSortKey>('estimatedCompletion')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesQuery = !normalizedQuery || [project.name, project.client, project.address, project.manager].some((value) => value.toLowerCase().includes(normalizedQuery))
      const matchesStatus = filters.status === 'all' || project.status === filters.status
      const matchesType = filters.projectType === 'all' || project.projectType === filters.projectType
      return matchesQuery && matchesStatus && matchesType
    }).sort((first, second) => {
      const firstValue = first[sortKey]
      const secondValue = second[sortKey]
      const comparison = typeof firstValue === 'number' && typeof secondValue === 'number' ? firstValue - secondValue : String(firstValue).localeCompare(String(secondValue), 'en-US')
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filters, projects, query, sortDirection, sortKey])

  const updateQuery = (value: string) => { setQuery(value); setPage(1) }
  const updateFilters = (value: ProjectFiltersState) => { setFilters(value); setPage(1) }
  const toggleSort = (key: ProjectSortKey) => {
    if (key === sortKey) { setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc'); return }
    setSortKey(key)
    setSortDirection('asc')
  }
  const clearFilters = () => { setQuery(''); setFilters(defaultFilters); setPage(1) }

  return { query, filters, sortKey, sortDirection, page, filteredProjects, setPage, updateQuery, updateFilters, toggleSort, clearFilters }
}

export type { ProjectFiltersState }
