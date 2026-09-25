'use client'

import { useMemo, useState } from 'react'
import type {
  Customer,
  CustomerSortKey,
  CustomerStatus,
  LeadSource,
  ProjectType,
  SortDirection,
} from '@/features/crm/types/customer'

type CustomerFiltersState = {
  status: CustomerStatus | 'all'
  projectType: ProjectType | 'all'
  leadSource: LeadSource | 'all'
}

const defaultFilters: CustomerFiltersState = {
  status: 'all',
  projectType: 'all',
  leadSource: 'all',
}

export function useCustomerFilters(customers: Customer[]) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<CustomerFiltersState>(defaultFilters)
  const [sortKey, setSortKey] = useState<CustomerSortKey>('lastContact')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const result = customers.filter((customer) => {
      const searchableValues = [
        customer.folio ?? '',
        customer.company,
        customer.contact,
        customer.email,
        customer.rfc,
      ]

      const matchesQuery =
        !normalizedQuery ||
        searchableValues.some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        )

      const matchesStatus =
        filters.status === 'all' || customer.status === filters.status
      const matchesProjectType =
        filters.projectType === 'all' ||
        customer.projectType === filters.projectType
      const matchesLeadSource =
        filters.leadSource === 'all' || customer.leadSource === filters.leadSource

      return (
        matchesQuery &&
        matchesStatus &&
        matchesProjectType &&
        matchesLeadSource
      )
    })

    return result.sort((first, second) => {
      const firstValue = first[sortKey]
      const secondValue = second[sortKey]
      const comparison = String(firstValue).localeCompare(
        String(secondValue),
        'es-MX'
      )

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [customers, filters, query, sortDirection, sortKey])

  const updateQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  const updateFilters = (nextFilters: CustomerFiltersState) => {
    setFilters(nextFilters)
    setPage(1)
  }

  const toggleSort = (nextSortKey: CustomerSortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((direction) =>
        direction === 'asc' ? 'desc' : 'asc'
      )
      return
    }

    setSortKey(nextSortKey)
    setSortDirection('asc')
  }

  const clearFilters = () => {
    setQuery('')
    setFilters(defaultFilters)
    setPage(1)
  }

  return {
    query,
    filters,
    sortKey,
    sortDirection,
    page,
    filteredCustomers,
    setPage,
    updateQuery,
    updateFilters,
    toggleSort,
    clearFilters,
  }
}

export type { CustomerFiltersState }
