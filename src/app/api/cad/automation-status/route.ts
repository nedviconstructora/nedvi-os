import { authorizedAps, apsError } from '@/lib/aps/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await authorizedAps()
    const hasActivity = Boolean(process.env.APS_AUTOMATION_ACTIVITY_ID)
    return Response.json({
      configured: hasActivity,
      automationEnabled: process.env.APS_AUTOMATION_ENABLED === 'true',
      message: hasActivity
        ? 'Activity declarada. Verifica el AppBundle y la conexión antes de convertir.'
        : 'Faltan AppBundle y Activity de AutoCAD Automation. La conversión DWG a DXF no está disponible todavía.',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return apsError(error)
  }
}
