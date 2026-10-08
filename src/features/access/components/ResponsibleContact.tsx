'use client'
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'

export function ResponsibleContact({ name, projectId }: { name: string; projectId?: string }) {
  const [phone,setPhone] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setPhone(null)
    if (!name.trim()) return
    fetch('/api/access/staff-contact?name='+encodeURIComponent(name.trim())+(projectId?'&projectId='+encodeURIComponent(projectId):''),{cache:'no-store'})
      .then(async response => response.ok ? response.json() as Promise<{phone?:string|null}> : null)
      .then(result => { if (active) setPhone(result?.phone?.trim() || null) })
      .catch(() => { if (active) setPhone(null) })
    return () => { active = false }
  },[name,projectId])
  const digits = (phone ?? '').replace(/\D/g,'')
  const whatsapp = digits.length === 10 ? '52'+digits : digits
  if (!phone) return null
  return <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
    <span className="text-[var(--muted)]">Contacto del responsable: {phone}</span>
    {whatsapp.length >= 11 && whatsapp.length <= 15 ? <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hola '+name+', te contacto desde NEDVI OS sobre un asunto del proyecto.')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 px-2.5 py-1.5 font-semibold text-[#25D366] hover:bg-[#25D366]/10"><MessageCircle size={14}/>Enviar WhatsApp</a> : null}
  </div>
}
