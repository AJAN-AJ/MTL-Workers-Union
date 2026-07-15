import { supabaseServer } from '@/lib/supabase'

export default async function TestConnection() {
  const { data, error } = await supabaseServer.from('regions').select('*')

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Connection test</h1>
      <ul>
        {data.map((region) => (
          <li key={region.id}>{region.name}</li>
        ))}
      </ul>
    </div>
  )
}