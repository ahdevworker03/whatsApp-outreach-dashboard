const token = '24656a1b671802213d9dde22b6f1346c78691f5051dbe2f1'
const API_BASE = 'http://localhost:3000/api/v1'

async function testApiClient() {
  try {
    const response = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('✓ API Client test successful')
    console.log('Dashboard stats:', data)
    process.exit(0)
  } catch (error) {
    console.error('✗ API Client test failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

testApiClient()
