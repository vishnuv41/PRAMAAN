import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, AlertTriangle, Download, FileSpreadsheet } from 'lucide-react'
import { api, getErrorMessage, Student, ApiPage } from '../api'
import { PageHeader, StateMessage, EmptyState, maskId } from '../components/Common'

export default function StudentsPage() {
  const [searchParams] = useSearchParams()
  const sessionUser = (() => {
    try {
      const raw = sessionStorage.getItem('pramaan_session_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()
  const initialInst = searchParams.get('institution') || searchParams.get('institution_id') || sessionUser?.institution_id || ''
  const [data, setData] = useState<ApiPage<Student> | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [institution, setInstitution] = useState(initialInst)
  const [identityRoute, setIdentityRoute] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const buildFilterParams = () => {
    const params: Record<string, any> = {}
    if (search.trim()) params.search = search.trim()
    if (institution) params.institution_id = institution
    if (identityRoute) params.identity_route = identityRoute
    if (academicYear) params.academic_year = academicYear
    return params
  }

  const load = () => {
    setLoading(true)
    setError('')
    const params: Record<string, any> = { ...buildFilterParams(), page, limit }

    api
      .get<ApiPage<Student>>('/students', { params })
      .then((res) => setData(res.data))
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const q = searchParams.get('search')
    if (q !== null && q !== search) setSearch(q)
    const inst = searchParams.get('institution') || searchParams.get('institution_id')
    if (inst !== null && inst !== institution) setInstitution(inst)
  }, [searchParams])

  useEffect(() => {
    load()
  }, [page, limit, institution, identityRoute, academicYear])

  useEffect(() => {
    window.addEventListener('pramaan:records_updated', load)
    return () => window.removeEventListener('pramaan:records_updated', load)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  // Fetch full population (up to 2000 records) for complete export
  const fetchAllForExport = async (): Promise<Student[]> => {
    setExporting(true)
    try {
      const res = await api.get<ApiPage<Student>>('/students', {
        params: { ...buildFilterParams(), page: 1, limit: 2000 },
      })
      return res.data.items || []
    } catch {
      return data?.items || []
    } finally {
      setExporting(false)
    }
  }

  const handleExportCsv = async () => {
    const items = await fetchAllForExport()
    if (!items.length) return
    const headers = ['Student Ref', 'APAAR ID', 'Full Name', 'Institution ID', 'Identity Route', 'Nationality', 'Enrolments Count', 'Open Alerts']
    const rows = items.map((s) => [
      `"${s.student_ref}"`,
      `"${s.apaar_id}"`,
      `"${s.full_name.replace(/"/g, '""')}"`,
      `"${s.primary_institution_id || ''}"`,
      `"${s.identity_route}"`,
      `"${s.nationality}"`,
      s.enrolment_count,
      s.open_alerts_count,
    ].join(','))
    const csvContent = [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Student_Records_${institution || 'All'}_2026.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = async () => {
    const items = await fetchAllForExport()
    if (!items.length) return
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F1830" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Enrolled Students">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Student Ref</Data></Cell>
    <Cell><Data ss:Type="String">APAAR ID</Data></Cell>
    <Cell><Data ss:Type="String">Full Name</Data></Cell>
    <Cell><Data ss:Type="String">Primary Institution</Data></Cell>
    <Cell><Data ss:Type="String">Identity Route</Data></Cell>
    <Cell><Data ss:Type="String">Nationality</Data></Cell>
    <Cell><Data ss:Type="Number">Enrolments</Data></Cell>
    <Cell><Data ss:Type="Number">Open Alerts</Data></Cell>
   </Row>
   ${items.map((s) => `<Row>
    <Cell><Data ss:Type="String">${s.student_ref}</Data></Cell>
    <Cell><Data ss:Type="String">${s.apaar_id}</Data></Cell>
    <Cell><Data ss:Type="String">${s.full_name.replace(/&/g, '&amp;')}</Data></Cell>
    <Cell><Data ss:Type="String">${s.primary_institution_id || ''}</Data></Cell>
    <Cell><Data ss:Type="String">${s.identity_route}</Data></Cell>
    <Cell><Data ss:Type="String">${s.nationality}</Data></Cell>
    <Cell><Data ss:Type="Number">${s.enrolment_count}</Data></Cell>
    <Cell><Data ss:Type="Number">${s.open_alerts_count}</Data></Cell>
   </Row>`).join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Student_Records_${institution || 'All'}_2026.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1
  const startRow = data && data.total > 0 ? (page - 1) * limit + 1 : 0
  const endRow = data ? Math.min(page * limit, data.total) : 0

  return (
    <>
      <PageHeader
        eyebrow="STUDENT REGISTRY"
        title="Student Records"
        description="Searchable, authority-backed student database with masked APAAR identifiers, timeline tracking, and anomaly linkages."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="button-secondary" onClick={handleExportCsv} disabled={exporting} title="Download CSV report of all students">
              <Download size={14} /> {exporting ? 'Preparing CSV...' : 'Export CSV (All)'}
            </button>
            <button className="button-secondary" onClick={handleExportExcel} disabled={exporting} title="Download Excel spreadsheet of all students">
              <FileSpreadsheet size={14} /> {exporting ? 'Preparing Excel...' : 'Export Excel (All)'}
            </button>
          </div>
        }
      />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <form className="table-search" onSubmit={handleSearchSubmit}>
            <Search size={16} />
            <input
              placeholder="Search by student reference, name, or APAAR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <div className="filter-row compact-filters">
            {sessionUser?.role === 'institution_officer' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--workspace)',
                  border: '1px solid var(--line)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                }}
              >
                <span>Campus:</span> {institution || sessionUser?.institution_id || "St. Joseph's College"}
              </div>
            ) : (
              <select
                aria-label="Filter institution"
                value={institution}
                onChange={(e) => {
                  setInstitution(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All institutions</option>
                <option value="INST-CHENNAI-SJC">St. Joseph's College of Engineering (SJC)</option>
                <option value="INST-DELHI-DTU">Delhi Tech Univ (DTU)</option>
                <option value="INST-DELHI-IIITD">IIIT Delhi</option>
                <option value="INST-PUNE-COEP">COEP Tech Univ</option>
                <option value="INST-DELHI-NSUT">NSUT Delhi</option>
                <option value="INST-TRICHY-NITT">NIT Trichy</option>
                <option value="INST-MUMBAI-IITB">IIT Bombay External</option>
              </select>
            )}

            <select
              aria-label="Filter identity route"
              value={identityRoute}
              onChange={(e) => {
                setIdentityRoute(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All identity routes</option>
              <option value="AADHAAR_APAAR">Standard APAAR</option>
              <option value="PASSPORT_INTERNATIONAL">Foreign National</option>
              <option value="HISTORICAL_LEGACY">Historical Legacy (Pre-APAAR)</option>
            </select>

            <select
              aria-label="Filter academic year"
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All academic years</option>
              <option value="2025-2026">2025–2026</option>
              <option value="2024-2025">2024–2025</option>
            </select>
          </div>
        </div>

        {error ? (
          <StateMessage error={error} retry={load} />
        ) : loading ? (
          <StateMessage />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Ref</th>
                    <th>APAAR ID</th>
                    <th>Full Name</th>
                    <th>Institution</th>
                    <th>Enrolments</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((student) => (
                    <tr key={student.student_ref}>
                      <td>
                        <span className="mono strong">{student.student_ref}</span>
                      </td>
                      <td>
                        <span className="mono">{maskId(student.apaar_id)}</span>
                      </td>
                      <td>{student.full_name}</td>
                      <td>
                        <span className="muted-text">
                          {student.primary_institution_id === 'INST-CHENNAI-SJC' || student.primary_institution_id === 'INST-DEMO-01'
                            ? "St. Joseph's College"
                            : student.primary_institution_id || 'DTU Delhi'}
                        </span>
                      </td>
                      <td>
                        <span className="count-pill">{student.enrolment_count}</span>
                      </td>
                      <td>
                        {student.open_alerts_count > 0 ? (
                          <span className="status-badge amber">
                            <AlertTriangle size={12} /> {student.open_alerts_count} open
                          </span>
                        ) : (
                          <span className="status-badge green">
                            <ShieldCheck size={12} /> Clear
                          </span>
                        )}
                      </td>
                      <td>
                        <Link
                          className="button-small button-outline"
                          to={`/students/${student.student_ref}`}
                        >
                          View record <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="page-summary">
                  Showing <b>{startRow}</b>–<b>{endRow}</b> of <b>{data.total}</b> students (Page {page} of {totalPages})
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--mut)' }}>
                  <span>Rows:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1)
                    }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--workspace)', fontSize: '12px' }}
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500 (All)</option>
                  </select>
                </div>
              </div>

              <div className="pagination-controls">
                <button
                  className="icon-button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="page-number">Page {page} of {totalPages}</span>
                <button
                  className="icon-button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No students found"
            message="No student records matched the specified search and filter criteria."
          />
        )}
      </section>
    </>
  )
}
