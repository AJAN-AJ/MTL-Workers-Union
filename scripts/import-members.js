// scripts/import-members.js
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  // 1. Load the spreadsheet — place Union_Membership.xlsx in your project root
  const workbook = XLSX.readFile('Union_Membership.xlsx')
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)

  // 2. Get region IDs from the database
  const { data: regions, error: regionError } = await supabase
    .from('regions')
    .select('id, name')

  if (regionError) {
    console.error('Failed to fetch regions:', regionError.message)
    return
  }

  const regionMap = {}
  regions.forEach((r) => { regionMap[r.name] = r.id })

  // 3. Build the insert payload
  const members = rows.map((row) => ({
    employee_code: String(row['Employee Code']),
    surname: row['Surname'],
    first_name: row['First name'],
    gender: row['Gender'],
    region_id: regionMap[row['Region']]
  }))

  // 4. Sanity check before inserting — catch bad region names early
  const badRows = members.filter((m) => !m.region_id)
  if (badRows.length > 0) {
    console.error(`${badRows.length} rows have an unrecognized region:`, badRows)
    return
  }

  // 5. Insert all at once
  const { data, error } = await supabase.from('members').insert(members).select()

  if (error) {
    console.error('Insert failed:', error.message)
  } else {
    console.log(`Successfully imported ${data.length} members.`)
  }
}

run()