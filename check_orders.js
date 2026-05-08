import dotenv from 'dotenv'

dotenv.config()

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

const check = async () => {
  const res = await fetch(`${url}/rest/v1/orders?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  })
  const data = await res.json()
  if (data.length) console.log(Object.keys(data[0]))
}
check()
