'use client'

import { createClient } from '@/lib/supabase/client'
import {
  readSuppliers, readRequisitions, readPurchaseOrders,
  type Supplier, type Requisition, type PurchaseOrder,
} from './purchasingStorage'

type CloudTable = 'nedvi_suppliers' | 'nedvi_requisitions' | 'nedvi_purchase_orders'
type CloudRecord<T> = { id: string; folio: string; payload: T }
export type PurchasingPreview = {
  suppliers: number
  requisitions: number
  purchaseOrders: number
}

// A read-only preview: never sends or changes browser records.
export function previewLocalPurchasing(): PurchasingPreview {
  return {
    suppliers: readSuppliers().length,
    requisitions: readRequisitions().length,
    purchaseOrders: readPurchaseOrders().length,
  }
}

// Requires a real Supabase Auth session, and is deliberately not invoked automatically.
// RLS allows each authenticated user to touch only their own records.
async function ownerId() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Se requiere iniciar sesión con Supabase para sincronizar compras.')
  return data.user.id
}

async function readCloud<T>(table: CloudTable): Promise<T[]> {
  const supabase = createClient()
  const uid = await ownerId()
  const { data, error } = await supabase.from(table).select('payload').eq('owner_id', uid)
  if (error) throw error
  return (data ?? []).map((entry) => entry.payload as T)
}

export async function loadCloudSuppliers() { return readCloud<Supplier>('nedvi_suppliers') }
export async function loadCloudRequisitions() { return readCloud<Requisition>('nedvi_requisitions') }
export async function loadCloudPurchaseOrders() { return readCloud<PurchaseOrder>('nedvi_purchase_orders') }

// Explicit, additive import. Existing IDs are never overwritten or deleted.
// Prevents an empty local cache from deleting records already in Supabase.
async function uploadMissing<T extends { id: string; folio: string }>(
  table: CloudTable,
  records: T[],
): Promise<{ uploaded: number; skipped: number }> {
  const supabase = createClient()
  const uid = await ownerId()
  const { data: existing, error: listError } = await supabase
    .from(table).select('id').eq('owner_id', uid)
  if (listError) throw listError
  const ids = new Set((existing ?? []).map((item) => String(item.id)))
  const missing: CloudRecord<T>[] = records
    .filter((item) => item.id && item.folio && !ids.has(item.id))
    .map((item) => ({ id: item.id, folio: item.folio, payload: item }))
  if (missing.length) {
    const { error } = await supabase.from(table).insert(
      missing.map((item) => ({ ...item, owner_id: uid })),
    )
    if (error) throw error
  }
  return { uploaded: missing.length, skipped: records.length - missing.length }
}

// Run only after an export of localStorage and an explicit user confirmation.
// Local records are retained, including if the upload fails.
export async function importLocalPurchasingToCloud() {
  const suppliers = readSuppliers()
  const requisitions = readRequisitions()
  const purchaseOrders = readPurchaseOrders()
  return {
    suppliers: await uploadMissing('nedvi_suppliers', suppliers),
    requisitions: await uploadMissing('nedvi_requisitions', requisitions),
    purchaseOrders: await uploadMissing('nedvi_purchase_orders', purchaseOrders),
  }
}
