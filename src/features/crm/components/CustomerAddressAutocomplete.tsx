'use client'

import { useEffect, useRef, useState } from 'react'

type SelectedPlace = {
  formattedAddress?: string
  fetchFields: (options: { fields: string[] }) => Promise<void>
}
type SelectEvent = Event & {
  placePrediction?: { toPlace: () => SelectedPlace }
}
type AutocompleteWidget = HTMLElement & {
  placeholder: string
  includedRegionCodes?: string[]
}
type PlacesLibrary = { PlaceAutocompleteElement: new () => AutocompleteWidget }
type MapsWindow = Window & {
  google?: { maps: { importLibrary: (name: string) => Promise<PlacesLibrary> } }
}
let scriptLoad: Promise<void> | undefined

function loadGoogleMaps(apiKey: string): Promise<void> {
  if ((window as MapsWindow).google?.maps?.importLibrary) return Promise.resolve()
  if (!scriptLoad) {
    scriptLoad = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(apiKey) + '&v=weekly&loading=async&libraries=places'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'))
      document.head.appendChild(script)
    }).catch((error: unknown) => {
      scriptLoad = undefined
      throw error
    })
  }
  return scriptLoad
}

type Props = { initialAddress?: string; inputClassName: string; labelClassName: string }

export function CustomerAddressAutocomplete({ initialAddress = '', inputClassName, labelClassName }: Props) {
  const [address, setAddress] = useState(initialAddress)
  const [notice, setNotice] = useState('')
  const hostRef = useRef<HTMLDivElement>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey || !hostRef.current) return
    let cancelled = false
    let widget: AutocompleteWidget | undefined
    let onSelect: ((event: Event) => void) | undefined

    void (async () => {
      try {
        await loadGoogleMaps(apiKey)
        const googleMaps = (window as MapsWindow).google?.maps
        if (!googleMaps || cancelled) return
        const places = await googleMaps.importLibrary('places')
        if (cancelled || !hostRef.current) return
        widget = new places.PlaceAutocompleteElement()
        widget.placeholder = 'Buscar dirección con Google Maps'
        widget.includedRegionCodes = ['mx']
        widget.style.width = '100%'
        onSelect = (event: Event) => {
          void (async () => {
            try {
              const place = (event as SelectEvent).placePrediction?.toPlace()
              if (!place) return
              await place.fetchFields({ fields: ['formattedAddress'] })
              if (!cancelled && place.formattedAddress) {
                setAddress(place.formattedAddress)
                setNotice('Dirección seleccionada de Google. Puedes editarla antes de guardar.')
              }
            } catch {
              if (!cancelled) setNotice('No fue posible obtener esa dirección. Puedes escribirla manualmente.')
            }
          })()
        }
        widget.addEventListener('gmp-select', onSelect)
        hostRef.current.appendChild(widget)
      } catch {
        if (!cancelled) setNotice('Google Maps no está disponible. Escribe la dirección manualmente.')
      }
    })()

    return () => {
      cancelled = true
      if (widget && onSelect) widget.removeEventListener('gmp-select', onSelect)
      widget?.remove()
    }
  }, [apiKey])

  return (
    <div className="md:col-span-2 space-y-2">
      <label htmlFor="customer-address" className={labelClassName}>Dirección</label>
      {apiKey ? <div ref={hostRef} className="mt-2 rounded-xl bg-white p-1 text-slate-900" /> : (
        <p className="text-xs text-[var(--muted)]">Búsqueda de Google pendiente de activar. Puedes capturar la dirección manualmente.</p>
      )}
      <input id="customer-address" name="address" value={address}
        onChange={(event) => { setAddress(event.target.value); setNotice('') }}
        placeholder="Calle, colonia, ciudad y estado" className={inputClassName} />
      {notice && <p role="status" className="text-xs text-[var(--muted)]">{notice}</p>}
    </div>
  )
}
