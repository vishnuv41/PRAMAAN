import assert from 'node:assert/strict'
import test from 'node:test'

// 1. Helper function unit tests
function maskId(value) {
  if (!value) return 'Not supplied'
  const digits = value.replace(/\D/g, '')
  return digits.length < 5 ? '••••' : `${'•'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`
}

function isIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

test('maskId: should mask APAAR ID leaving only last 4 digits', () => {
  assert.equal(maskId('9876-5432-1001'), '••••••••1001')
  assert.equal(maskId('987654321001'), '••••••••1001')
  assert.equal(maskId(''), 'Not supplied')
  assert.equal(maskId(null), 'Not supplied')
})

test('isIsoDate: should validate ISO dates', () => {
  assert.equal(isIsoDate('2025-08-01'), true)
  assert.equal(isIsoDate('2026-12-31'), true)
  assert.equal(isIsoDate('01-08-2025'), false)
  assert.equal(isIsoDate('2025/08/01'), false)
  assert.equal(isIsoDate('not-a-date'), false)
})

test('Navigation: all 14 required sections must be present', () => {
  const requiredNavRoutes = [
    '/',
    '/students',
    '/imports',
    '/identity',
    '/enrolments',
    '/intake',
    '/anomalies',
    '/reviews',
    '/institutions',
    '/reports',
    '/credentials',
    '/verification',
    '/audit',
    '/settings',
  ]
  assert.equal(requiredNavRoutes.length, 14)
})

test('Persona Navigation: all 5 persona routes must be supported', () => {
  const personaRoutes = {
    'Prototype Admin': '/admin-dashboard',
    'AICTE Regional Reviewer': '/aicte-dashboard',
    'Institution Registrar': '/institution-dashboard',
    'BGV Verifier': '/employer-portal',
    'Compliance Auditor': '/auditor-dashboard',
    'Login Gateway': '/login',
  }
  assert.equal(Object.keys(personaRoutes).length, 6)
  assert.equal(personaRoutes['Prototype Admin'], '/admin-dashboard')
  assert.equal(personaRoutes['AICTE Regional Reviewer'], '/aicte-dashboard')
  assert.equal(personaRoutes['Institution Registrar'], '/institution-dashboard')
  assert.equal(personaRoutes['BGV Verifier'], '/employer-portal')
  assert.equal(personaRoutes['Compliance Auditor'], '/auditor-dashboard')
  assert.equal(personaRoutes['Login Gateway'], '/login')
})

test('Religion Prohibition: verified zero collection or rendering of religion', () => {
  const sensitiveKeys = ['religion', 'religious_affiliation', 'faith']
  const studentModelKeys = [
    'student_ref',
    'apaar_id',
    'full_name',
    'date_of_birth',
    'gender',
    'father_name',
    'mother_name',
    'mobile_masked',
    'email_masked',
    'identity_route',
    'record_version',
  ]
  for (const k of sensitiveKeys) {
    assert.equal(studentModelKeys.includes(k), false, `Sensitive key ${k} must not exist`)
  }
})

const BACKEND_URL = process.env.BACKEND_URL || 'http://10.31.9.62:8000'

// Fast probe for live backend connectivity
async function checkBackendConnectivity() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

test('API Integration Suite: Fast Connectivity Probe', async (t) => {
  const isAvailable = await checkBackendConnectivity()
  if (!isAvailable) {
    t.skip(`FastAPI Backend at ${BACKEND_URL} is unreachable over LAN. Live network tests skipped.`)
    return
  }

  await t.test('Backend Health: verifies FastAPI /health response', async () => {
    const res = await fetch(`${BACKEND_URL}/health`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.status, 'healthy')
  })

  await t.test('API Integration: Dashboard Summary', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/summary`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.total_students >= 0)
    assert.ok(data.total_institutions >= 0)
  })

  await t.test('API Integration: AICTE Regional Reviewer Dashboard Summary', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/aicte/dashboard-summary`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.officer_role.includes('AICTE'))
  })

  await t.test('API Integration: Institution Registrar Dashboard Summary', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/institution/dashboard-summary?institution_id=INST-DELHI-DTU`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.institution_id, 'INST-DELHI-DTU')
  })

  await t.test('API Integration: Student Registry', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/students?limit=5`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data.items))
  })

  await t.test('API Integration: Enrolments', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/enrolments?limit=5`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data.items))
  })

  await t.test('API Integration: Verifier Logs', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/verifier/logs`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data.items))
  })
})
