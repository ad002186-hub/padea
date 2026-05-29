export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json()
  console.error('Fillout webhook payload:', JSON.stringify(body, null, 2))
  return Response.json({ received: true }, { status: 200 })
}
