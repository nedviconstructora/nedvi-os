'use client'

import { useState } from 'react'
import { importLocalPurchasingToCloud, previewLocalPurchasing } from '@/features/purchasing/purchasingCloud'

// Migration is intentionally opt-in: it never clears localStorage.
export function PurchasingCloudMigration() {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function start() {
    const summary = previewLocalPurchasing()
    if (!window.confirm(
      '¿Ya exportaste un respaldo del navegador? Se enviarán a tu cuenta de Supabase los registros locales que aún no existan en la nube. Proveedores: '+
      summary.suppliers+', requisiciones: '+summary.requisitions+', órdenes: '+summary.purchaseOrders+
      '. No se eliminarán datos locales. ¿Continuar?'
    )) return
    setBusy(true)
    setNotice('')
    try {
      const result = await importLocalPurchasingToCloud()
      setNotice('Migración completada: '+result.suppliers.uploaded+' proveedores, '+
        result.requisitions.uploaded+' requisiciones, '+result.purchaseOrders.uploaded+' órdenes nuevas. '+
        'Se conservaron los registros locales. Esto aún no activa sincronización automática.')
    } catch (error) {
      setNotice('No se pudo completar la importación: '+(error instanceof Error ? error.message : 'error desconocido')+
        '. Ningún dato local fue eliminado. Comprueba la sesión de Supabase.')
    } finally {
      setBusy(false)
    }
  }
  return <section aria-label="Copia a Supabase" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-semibold text-sm">Respaldo de Compras en Supabase (prueba)</p>
        <p className="text-xs text-[var(--muted)]">Importación manual de registros nuevos. No reemplaza los datos locales ni sincroniza ediciones.</p></div>
      <button type="button" onClick={start} disabled={busy}
        className="rounded-lg bg-[#5496CC] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? 'Importando...' : 'Copiar registros a Supabase'}
      </button>
    </div>
    {notice && <p role="status" className="text-sm text-[var(--foreground)]">{notice}</p>}
  </section>
}
