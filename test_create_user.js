import dotenv from 'dotenv'

dotenv.config()

const test = async () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test_create_user@example.com',
      password: 'password123',
      email_confirm: true
    })
  })
  
  const data = await res.json()
  console.log('Status:', res.status)
  console.log('Response:', data)
}

test()
