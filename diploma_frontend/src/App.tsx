import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'

// ===================== TYPES =====================
interface ScheduleItem {
  day: string; time: string; time_index: number;
  group: string; subject: string; teacher: string;
  room: string; class_type: string; shift: number;
  course: number; language: string;
}
interface Teacher { id: number; full_name: string; max_hours_per_week: number; }
interface Subject {
  id: number; name: string; credits: number;
  lectures_per_week: number; practices_per_week: number;
  course: number; semester: number; teachers: Teacher[];
}

type Theme = 'dark' | 'light' | 'midnight' | 'forest'
type Tab = 'schedule' | 'advisor' | 'analytics'

const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
const SHIFT1 = ["08:00-08:50","09:00-09:50","10:00-10:50","11:10-12:00","12:10-13:00","13:10-14:00"]
const SHIFT2 = ["14:10-15:00","15:10-16:00","16:10-17:00","17:10-18:00","18:10-19:00","19:10-20:00"]
const ALL_SLOTS = [...SHIFT1, ...SHIFT2]
const BASE = 'http://127.0.0.1:8000'

const THEMES: Record<Theme, Record<string,string>> = {
  dark: {
    '--bg': '#0f0f13', '--bg2': '#1a1a22', '--bg3': '#252530',
    '--border': '#2e2e3e', '--text': '#e8e8f0', '--text2': '#9090a8',
    '--accent': '#7c6af7', '--accent2': '#5b4de8', '--accent3': '#a594ff',
    '--lec': '#f97066', '--prac': '#4ade80', '--shift1': '#7c6af7', '--shift2': '#f97066',
    '--success': '#22c55e', '--warn': '#f59e0b', '--danger': '#ef4444',
  },
  light: {
    '--bg': '#f0f2f8', '--bg2': '#ffffff', '--bg3': '#e8eaf2',
    '--border': '#d0d4e8', '--text': '#1e1e2e', '--text2': '#6b7280',
    '--accent': '#5b4de8', '--accent2': '#4338ca', '--accent3': '#7c6af7',
    '--lec': '#dc2626', '--prac': '#16a34a', '--shift1': '#5b4de8', '--shift2': '#dc2626',
    '--success': '#16a34a', '--warn': '#d97706', '--danger': '#dc2626',
  },
  midnight: {
    '--bg': '#070b14', '--bg2': '#0d1525', '--bg3': '#131d30',
    '--border': '#1e2d45', '--text': '#cdd9f5', '--text2': '#6b85b0',
    '--accent': '#38bdf8', '--accent2': '#0284c7', '--accent3': '#7dd3fc',
    '--lec': '#fb923c', '--prac': '#34d399', '--shift1': '#38bdf8', '--shift2': '#fb923c',
    '--success': '#34d399', '--warn': '#fbbf24', '--danger': '#f87171',
  },
  forest: {
    '--bg': '#0a120e', '--bg2': '#111b15', '--bg3': '#172119',
    '--border': '#1f3024', '--text': '#d4edd8', '--text2': '#7aaf82',
    '--accent': '#4ade80', '--accent2': '#16a34a', '--accent3': '#86efac',
    '--lec': '#fb923c', '--prac': '#34d399', '--shift1': '#4ade80', '--shift2': '#fb923c',
    '--success': '#4ade80', '--warn': '#fbbf24', '--danger': '#f87171',
  }
}

// ===================== CUSTOM SELECT =====================
function CustomSelect({ value, onChange, options, label }: {
  value: string, onChange: (v: string) => void,
  options: { value: string, label: string }[], label: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div style={{ position: 'relative' }}>
      <div className="filter-label">{label}</div>
      <div className={`custom-select ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        <span className="cs-value">{selected?.label || options[0]?.label}</span>
        <span className="cs-arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <>
          <div className="cs-backdrop" onClick={() => setOpen(false)} />
          <div className="cs-dropdown">
            {options.map(opt => (
              <div key={opt.value}
                className={`cs-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false) }}>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ===================== MAIN APP =====================
export default function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [tab, setTab] = useState<Tab>('schedule')
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [activeSemester, setActiveSemester] = useState<1|2|null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [filterGroup, setFilterGroup] = useState('all')
  const [filterTeacher, setFilterTeacher] = useState('all')
  const [filterRoom, setFilterRoom] = useState('all')
  const [filterShift, setFilterShift] = useState('all')

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjectSearch, setSubjectSearch] = useState('')
  const [subjectCourseFilter, setSubjectCourseFilter] = useState('all')
  const [subjectSemFilter, setSubjectSemFilter] = useState('all')
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [editSubject, setEditSubject] = useState<Subject | null>(null)

  const [fName, setFName] = useState('')
  const [fCourse, setFCourse] = useState(1)
  const [fSem, setFSem] = useState(1)
  const [fCredits, setFCredits] = useState(5)
  const [fLec, setFLec] = useState(1)
  const [fPrac, setFPrac] = useState(2)
  const [fTeacherIds, setFTeacherIds] = useState<number[]>([])
  const [tName, setTName] = useState('')
  const [tHours, setTHours] = useState(20)

  useEffect(() => {
    const vars = THEMES[theme]
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
  }, [theme])

  useEffect(() => {
    if (tab === 'advisor' || tab === 'analytics') { fetchSubjects(); fetchTeachers() }
  }, [tab])

  const fetchSubjects = async () => {
    try { const r = await axios.get<Subject[]>(`${BASE}/subjects/`); setSubjects(r.data) } catch {}
  }
  const fetchTeachers = async () => {
    try { const r = await axios.get<Teacher[]>(`${BASE}/teachers/`); setTeachers(r.data) } catch {}
  }

  const handleGenerate = async (semester: 1|2|null = null) => {
    setLoading(true)
    try {
      const url = semester ? `${BASE}/generate-schedule/?semester=${semester}` : `${BASE}/generate-schedule/`
      const res = await axios.post(url)
      setSchedule(res.data.schedule)
      setLastUpdate(res.data.generated_at)
      setActiveSemester(semester)
      setFilterGroup('all'); setFilterTeacher('all'); setFilterRoom('all'); setFilterShift('all')
    } catch { alert('Ошибка соединения с сервером!') }
    finally { setLoading(false) }
  }

  const openEditSubject = (s: Subject) => {
    setEditSubject(s); setFName(s.name); setFCourse(s.course); setFSem(s.semester)
    setFCredits(s.credits); setFLec(s.lectures_per_week); setFPrac(s.practices_per_week)
    setFTeacherIds(s.teachers.map(t => t.id)); setShowSubjectModal(true)
  }
  const openNewSubject = () => {
    setEditSubject(null); setFName(''); setFCourse(1); setFSem(1)
    setFCredits(5); setFLec(1); setFPrac(2); setFTeacherIds([]); setShowSubjectModal(true)
  }
  const handleSaveSubject = async () => {
    if (!fName.trim()) return
    try {
      await axios.post(`${BASE}/subjects/`, { name: fName, credits: fCredits, lectures_per_week: fLec, practices_per_week: fPrac, course: fCourse, semester: fSem, teacher_ids: fTeacherIds })
      setShowSubjectModal(false); fetchSubjects()
    } catch { alert('Ошибка при сохранении') }
  }
  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Удалить предмет?')) return
    try { await axios.delete(`${BASE}/subjects/${id}`); fetchSubjects() } catch { alert('Ошибка') }
  }
  const handleSaveTeacher = async () => {
    if (!tName.trim()) return
    try {
      await axios.post(`${BASE}/teachers/`, { full_name: tName, max_hours_per_week: tHours })
      setShowTeacherModal(false); fetchTeachers()
    } catch { alert('Ошибка') }
  }

  const groups = useMemo(() => [...new Set(schedule.map(i => i.group))].sort(), [schedule])
  const teacherNames = useMemo(() => [...new Set(schedule.map(i => i.teacher))].sort(), [schedule])
  const rooms = useMemo(() => [...new Set(schedule.map(i => i.room))].sort(), [schedule])

  const filtered = useMemo(() => schedule.filter(i =>
    (filterGroup === 'all' || i.group === filterGroup) &&
    (filterTeacher === 'all' || i.teacher === filterTeacher) &&
    (filterRoom === 'all' || i.room === filterRoom) &&
    (filterShift === 'all' || String(i.shift) === filterShift)
  ), [schedule, filterGroup, filterTeacher, filterRoom, filterShift])

  const filteredSubjects = useMemo(() => subjects.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(subjectSearch.toLowerCase())
    const matchCourse = subjectCourseFilter === 'all' || String(s.course) === subjectCourseFilter
    const matchSem = subjectSemFilter === 'all' || String(s.semester) === subjectSemFilter
    return matchSearch && matchCourse && matchSem
  }), [subjects, subjectSearch, subjectCourseFilter, subjectSemFilter])

  const gridData = useMemo(() => {
    const grid: Record<string, Record<string, ScheduleItem[]>> = {}
    DAYS.forEach(d => { grid[d] = {}; ALL_SLOTS.forEach(s => { grid[d][s] = [] }) })
    filtered.forEach(item => { if (grid[item.day]?.[item.time] !== undefined) grid[item.day][item.time].push(item) })
    return grid
  }, [filtered])

  // ===== FULL ANALYTICS =====
  const analytics = useMemo(() => {
    if (!schedule.length) return null
    const uniqueSlots = new Set(schedule.map(s => `${s.room}|${s.day}|${s.time}`))
    const roomCounts: Record<string, number> = {}
    const teacherCounts: Record<string, number> = {}
    const groupCounts: Record<string, number> = {}
    const dayCounts: Record<string, number> = {}
    const subjectCounts: Record<string, { lec: number, prac: number }> = {}

    schedule.forEach(s => {
      const slot = `${s.room}|${s.day}|${s.time}`
      roomCounts[s.room] = (roomCounts[s.room]||0) + (uniqueSlots.has(slot) ? 1 : 0)
    })
    const uniqueTeacherSlots = new Set<string>()
    schedule.forEach(s => {
      const k = `${s.teacher}|${s.day}|${s.time}`
      if (!uniqueTeacherSlots.has(k)) { uniqueTeacherSlots.add(k); teacherCounts[s.teacher] = (teacherCounts[s.teacher]||0)+1 }
      groupCounts[s.group] = (groupCounts[s.group]||0)+1
      dayCounts[s.day] = (dayCounts[s.day]||0)+1
      if (!subjectCounts[s.subject]) subjectCounts[s.subject] = { lec: 0, prac: 0 }
      if (s.class_type === 'Лекция') subjectCounts[s.subject].lec++
      else subjectCounts[s.subject].prac++
    })

    // Room unique slots (physical)
    const roomUnique: Record<string, number> = {}
    uniqueSlots.forEach(slot => { const r = slot.split('|')[0]; roomUnique[r] = (roomUnique[r]||0)+1 })

    const shift1 = new Set(schedule.filter(s=>s.shift===1).map(s=>`${s.day}|${s.time}|${s.room}`)).size
    const shift2 = new Set(schedule.filter(s=>s.shift===2).map(s=>`${s.day}|${s.time}|${s.room}`)).size
    const lecCount = schedule.filter(s=>s.class_type==='Лекция').length
    const pracCount = schedule.filter(s=>s.class_type==='Практика').length
    const courseLoad = [1,2,3,4].map(c => ({ course: c, count: schedule.filter(s=>s.course===c).length }))

    // Top subjects by frequency
    const topSubjects = Object.entries(subjectCounts)
      .map(([name, v]) => ({ name, total: v.lec + v.prac, lec: v.lec, prac: v.prac }))
      .sort((a,b) => b.total - a.total).slice(0, 10)

    // Day distribution
    const dayDist = DAYS.map(d => ({ day: d.slice(0,3), count: dayCounts[d]||0 }))

    // Group load
    const groupLoad = Object.entries(groupCounts).sort(([,a],[,b]) => b-a)

    return {
      total: schedule.length, uniqueSlots: uniqueSlots.size,
      shift1, shift2, lecCount, pracCount, courseLoad,
      roomCounts: roomUnique, teacherCounts, groupLoad, topSubjects, dayDist,
      groupCount: new Set(schedule.map(s=>s.group)).size,
      teacherCount: Object.keys(teacherCounts).length,
    }
  }, [schedule])

  const exportExcel = () => {
    const data = filtered.map(r => ({ День: r.day, Время: r.time, Смена: r.shift, Группа: r.group, Предмет: r.subject, Преподаватель: r.teacher, Аудитория: r.room, Тип: r.class_type }))
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Расписание'); XLSX.writeFile(wb, 'Расписание.xlsx')
  }

  const themeColors = {
    dark: 'linear-gradient(135deg,#7c6af7,#1a1a22)', light: 'linear-gradient(135deg,#5b4de8,#f0f2f8)',
    midnight: 'linear-gradient(135deg,#38bdf8,#070b14)', forest: 'linear-gradient(135deg,#4ade80,#0a120e)',
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { font-family: 'Outfit', sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }

    .app { display: flex; min-height: 100vh; }

    /* SIDEBAR */
    .sidebar {
      width: 220px; min-height: 100vh; background: var(--bg2);
      border-right: 1px solid var(--border); display: flex; flex-direction: column;
      position: fixed; top: 0; left: 0; z-index: 100;
      transition: transform .3s cubic-bezier(.4,0,.2,1);
    }
    .sidebar.closed { transform: translateX(-100%); }
    .sidebar-logo { padding: 20px 16px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
    .logo-text { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.2; }
    .logo-sub { font-size: 10px; color: var(--text2); }
    .sidebar-nav { flex: 1; padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 9px; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--text2); transition: all .2s; border: none; background: none; width: 100%; text-align: left; }
    .nav-item:hover { background: var(--bg3); color: var(--text); }
    .nav-item.active { background: var(--accent); color: #fff; }
    .nav-icon { font-size: 17px; width: 22px; text-align: center; }
    .sidebar-bottom { padding: 14px 10px; border-top: 1px solid var(--border); }
    .theme-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-top: 7px; }
    .theme-btn { height: 26px; border-radius: 5px; border: 2px solid transparent; cursor: pointer; transition: all .2s; }
    .theme-btn.active { border-color: var(--accent); transform: scale(1.1); }
    .theme-label { font-size: 11px; color: var(--text2); margin-bottom: 5px; }
    .theme-names { display: flex; gap: 3px; margin-top: 5px; }
    .theme-names span { flex: 1; text-align: center; font-size: 9px; color: var(--text2); cursor: pointer; }
    .theme-names span.active { color: var(--accent3); font-weight: 600; }

    /* MAIN */
    .main { margin-left: 220px; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
    .topbar { height: 60px; background: var(--bg2); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 22px; gap: 14px; position: sticky; top: 0; z-index: 50; }
    .menu-btn { background: none; border: none; color: var(--text2); cursor: pointer; font-size: 19px; padding: 5px; border-radius: 5px; display: none; }
    .topbar-title { font-size: 17px; font-weight: 700; flex: 1; }
    .topbar-pills { display: flex; gap: 6px; align-items: center; }
    .pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; background: var(--accent)22; color: var(--accent3); }

    .content { flex: 1; padding: 22px; }

    /* BUTTONS */
    .btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all .2s; font-family: inherit; white-space: nowrap; }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: var(--accent2); box-shadow: 0 3px 10px var(--accent)44; }
    .btn-secondary { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--border); }
    .btn-success { background: var(--success)22; color: var(--success); border: 1px solid var(--success)33; }
    .btn-danger { background: var(--danger)22; color: var(--danger); border: 1px solid var(--danger)33; }
    .btn-sm { padding: 5px 11px; font-size: 12px; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    /* CARD */
    .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 13px; padding: 18px; }

    /* CUSTOM SELECT */
    .custom-select {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 13px; border-radius: 9px; border: 1.5px solid var(--border);
      background: var(--bg3); color: var(--text); font-size: 13px; cursor: pointer;
      min-width: 150px; user-select: none; transition: border-color .2s;
    }
    .custom-select.open, .custom-select:hover { border-color: var(--accent); }
    .cs-value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
    .cs-arrow { font-size: 9px; color: var(--text2); flex-shrink: 0; }
    .cs-backdrop { position: fixed; inset: 0; z-index: 199; }
    .cs-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; min-width: 100%;
      background: var(--bg2); border: 1.5px solid var(--accent)55; border-radius: 10px;
      box-shadow: 0 8px 30px #00000055; z-index: 200; max-height: 280px; overflow-y: auto;
      padding: 4px;
    }
    .cs-option {
      padding: 9px 13px; border-radius: 7px; cursor: pointer; font-size: 13px;
      color: var(--text); transition: background .15s; white-space: nowrap;
    }
    .cs-option:hover { background: var(--bg3); }
    .cs-option.selected { background: var(--accent)22; color: var(--accent3); font-weight: 600; }

    /* FILTER BAR */
    .filter-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; align-items: flex-end; }
    .filter-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
    .filter-label { font-size: 10px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; }
    .filter-actions { display: flex; gap: 7px; margin-left: auto; align-items: flex-end; padding-bottom: 1px; }

    /* SEMESTER BUTTONS */
    .gen-btns { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .semester-btn { display: flex; align-items: center; gap: 10px; padding: 11px 18px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border); background: var(--bg3); color: var(--text2); transition: all .2s; font-family: inherit; }
    .semester-btn.active { border-color: var(--accent); background: var(--accent)18; color: var(--accent3); }
    .semester-btn:hover:not(.active) { border-color: var(--accent)55; color: var(--text); }
    .sem-num { font-size: 20px; font-weight: 800; line-height: 1; }
    .sem-sub { font-size: 10px; color: var(--text2); }
    .semester-btn.active .sem-sub { color: var(--accent3); }
    .loading-pulse { animation: pulse 1s infinite; color: var(--accent3); font-size: 13px; }
    @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }

    /* GRID */
    .schedule-wrapper { overflow-x: auto; }
    .shift-sep { display: flex; align-items: center; gap: 10px; margin: 8px 0 5px; padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; letter-spacing: .03em; }
    .shift-sep.s1 { background: var(--shift1)12; color: var(--shift1); border: 1px solid var(--shift1)25; }
    .shift-sep.s2 { background: var(--shift2)12; color: var(--shift2); border: 1px solid var(--shift2)25; }
    .grid-table { width: 100%; border-collapse: separate; border-spacing: 2px; }
    .grid-time { font-size: 10px; font-family: 'JetBrains Mono',monospace; color: var(--text2); padding: 3px 9px; white-space: nowrap; width: 86px; text-align: right; vertical-align: middle; }
    .grid-day-hdr { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .07em; padding: 7px 5px; text-align: center; }
    .grid-cell { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; min-height: 50px; padding: 3px; vertical-align: top; width: 148px; }
    .grid-cell.empty { background: var(--bg2)88; border-color: var(--border)55; }
    .cell-item { border-radius: 5px; padding: 5px 7px; margin-bottom: 2px; font-size: 11px; transition: transform .1s; }
    .cell-item:hover { transform: scale(1.02); cursor: default; }
    .cell-lec { background: var(--lec)18; border-left: 3px solid var(--lec); }
    .cell-prac { background: var(--prac)18; border-left: 3px solid var(--prac); }
    .cell-subj { font-weight: 600; color: var(--text); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; max-width: 136px; }
    .cell-meta { color: var(--text2); font-size: 10px; display: flex; gap: 3px; flex-wrap: wrap; margin-top: 2px; }
    .cell-tag { background: var(--bg)55; padding: 1px 5px; border-radius: 3px; white-space: nowrap; }

    /* LIST TABLE */
    .list-table { width: 100%; border-collapse: collapse; }
    .list-table th { font-size: 10px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; padding: 9px 13px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .list-table td { padding: 9px 13px; font-size: 12.5px; border-bottom: 1px solid var(--border)55; vertical-align: middle; }
    .list-table tr:hover td { background: var(--bg3); }
    .type-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px; }
    .type-lec { background: var(--lec)18; color: var(--lec); }
    .type-prac { background: var(--prac)18; color: var(--prac); }
    .shift-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
    .shift1-b { background: var(--shift1)18; color: var(--shift1); }
    .shift2-b { background: var(--shift2)18; color: var(--shift2); }

    /* EMPTY */
    .empty-state { text-align: center; padding: 70px 20px; }
    .empty-icon { font-size: 60px; margin-bottom: 14px; }
    .empty-title { font-size: 20px; font-weight: 700; margin-bottom: 7px; }
    .empty-sub { font-size: 13px; color: var(--text2); margin-bottom: 22px; }

    /* ADVISOR */
    .advisor-layout { display: grid; grid-template-columns: 1fr 320px; gap: 18px; }
    .section-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .section-title { font-size: 15px; font-weight: 700; }
    .search-input { padding: 8px 13px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg3); color: var(--text); font-size: 13px; font-family: inherit; width: 100%; }
    .search-input:focus { outline: none; border-color: var(--accent); }
    .subj-filters { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .subj-count { font-size: 11px; color: var(--text2); margin-bottom: 10px; }
    .subject-list { max-height: 65vh; overflow-y: auto; padding-right: 2px; }
    .subject-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 7px; display: flex; align-items: center; gap: 10px; transition: border-color .2s; }
    .subject-card:hover { border-color: var(--accent)55; }
    .subj-badges { display: flex; gap: 5px; flex-shrink: 0; }
    .subj-info { flex: 1; min-width: 0; }
    .subj-name { font-weight: 600; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .subj-meta { font-size: 11px; color: var(--text2); margin-top: 2px; }
    .subj-teachers { font-size: 11px; color: var(--accent3); margin-top: 3px; }
    .subj-no-t { font-size: 11px; color: var(--warn); }
    .chip { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
    .chip-c { background: var(--accent)20; color: var(--accent3); }
    .chip-s { background: var(--bg)55; color: var(--text2); border: 1px solid var(--border); }
    .teacher-list { max-height: 65vh; overflow-y: auto; }
    .teacher-card { display: flex; align-items: center; gap: 10px; padding: 10px 13px; background: var(--bg3); border: 1px solid var(--border); border-radius: 9px; margin-bottom: 7px; }
    .t-avatar { width: 34px; height: 34px; border-radius: 9px; background: var(--accent)22; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
    .t-info { flex: 1; min-width: 0; }
    .t-name { font-weight: 600; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .t-hours { font-size: 10px; color: var(--text2); }

    /* MODAL */
    .modal-overlay { position: fixed; inset: 0; background: #00000088; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn .15s; }
    @keyframes fadeIn { from{opacity:0}to{opacity:1} }
    .modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 15px; padding: 26px; width: 100%; max-width: 540px; max-height: 88vh; overflow-y: auto; animation: slideUp .2s; }
    @keyframes slideUp { from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1} }
    .modal-title { font-size: 17px; font-weight: 700; margin-bottom: 18px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; }
    .form-field.full { grid-column: 1/-1; }
    .form-label { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .05em; }
    .form-input,.form-select { padding: 9px 12px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg3); color: var(--text); font-size: 13px; font-family: inherit; }
    .form-input:focus,.form-select:focus { outline: none; border-color: var(--accent); }
    .teacher-checks { display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; }
    .t-check { display: flex; align-items: center; gap: 9px; padding: 7px 11px; border-radius: 7px; background: var(--bg3); border: 1.5px solid var(--border); cursor: pointer; font-size: 12.5px; transition: border-color .2s; }
    .t-check.checked { border-color: var(--accent); background: var(--accent)10; }
    .t-check input { accent-color: var(--accent); }
    .modal-actions { display: flex; gap: 9px; justify-content: flex-end; margin-top: 18px; }

    /* ANALYTICS */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(160px,1fr)); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 11px; padding: 16px; }
    .stat-icon { font-size: 22px; margin-bottom: 5px; }
    .stat-val { font-size: 30px; font-weight: 800; font-family: 'JetBrains Mono',monospace; color: var(--accent3); line-height: 1; }
    .stat-lbl { font-size: 11px; color: var(--text2); margin-top: 4px; }
    .analytics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .analytics-row.three { grid-template-columns: 1fr 1fr 1fr; }
    .analytics-row.full { grid-template-columns: 1fr; }
    .a-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .a-title { font-size: 13px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
    .bar-row { margin-bottom: 11px; }
    .bar-hdr { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px; }
    .bar-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; }
    .bar-count { color: var(--text2); flex-shrink: 0; }
    .bar-track { height: 7px; background: var(--bg3); border-radius: 99px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 99px; transition: width .7s cubic-bezier(.4,0,.2,1); }
    .bg-green { background: var(--success); }
    .bg-yellow { background: var(--warn); }
    .bg-red { background: var(--danger); }
    .bg-accent { background: var(--accent); }
    .bg-shift1 { background: var(--shift1); }
    .bg-shift2 { background: var(--shift2); }
    .donut-wrap { display: flex; align-items: center; gap: 18px; }
    .donut { position: relative; width: 96px; height: 96px; flex-shrink: 0; }
    .donut svg { transform: rotate(-90deg); }
    .donut-lbl { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .donut-pct { font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono',monospace; color: var(--accent3); }
    .donut-sub { font-size: 9px; color: var(--text2); }
    .legend { display: flex; flex-direction: column; gap: 7px; }
    .leg-item { display: flex; align-items: center; gap: 7px; font-size: 12px; }
    .leg-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .day-bars { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
    .day-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .day-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; transition: height .5s; }
    .day-bar-lbl { font-size: 9px; color: var(--text2); font-weight: 700; }
    .day-bar-val { font-size: 9px; color: var(--accent3); font-weight: 700; }
    .alert-box { padding: 12px 15px; border-radius: 9px; margin-bottom: 14px; border-left: 3px solid; font-size: 13px; }
    .alert-warn { background: var(--warn)12; border-color: var(--warn); color: var(--warn); }
    .alert-ok { background: var(--success)12; border-color: var(--success); color: var(--success); }
    .subj-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .subj-bar-name { font-size: 11px; font-weight: 600; width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
    .subj-bar-track { flex: 1; height: 14px; background: var(--bg3); border-radius: 4px; overflow: hidden; display: flex; }
    .subj-bar-lec { height: 100%; transition: width .6s; }
    .subj-bar-prac { height: 100%; transition: width .6s; }
    .subj-bar-val { font-size: 10px; color: var(--text2); width: 40px; text-align: right; flex-shrink: 0; }

    /* SCROLLBAR */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text2)66; }

    @media (max-width: 900px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .main { margin-left: 0; }
      .menu-btn { display: block !important; }
      .advisor-layout { grid-template-columns: 1fr; }
      .analytics-row { grid-template-columns: 1fr; }
      .analytics-row.three { grid-template-columns: 1fr; }
    }
  `

  // ===== RENDER =====
  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div className="logo-icon">🎓</div>
            <div>
              <div className="logo-text">UniScheduler</div>
              <div className="logo-sub">Smart Timetable v2.0</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {([
              { id: 'schedule' as Tab, icon: '📅', label: 'Расписание' },
              { id: 'advisor' as Tab, icon: '⚙️', label: 'Эдвайзер' },
              { id: 'analytics' as Tab, icon: '📊', label: 'Аналитика' },
            ]).map(item => (
              <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`}
                onClick={() => { setTab(item.id); setSidebarOpen(false) }}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="theme-label">Тема оформления</div>
            <div className="theme-grid">
              {(Object.keys(THEMES) as Theme[]).map(t => (
                <button key={t} className={`theme-btn ${theme === t ? 'active' : ''}`}
                  style={{ background: themeColors[t] }} onClick={() => setTheme(t)} title={t} />
              ))}
            </div>
            <div className="theme-names">
              {(Object.keys(THEMES) as Theme[]).map(t => (
                <span key={t} className={theme === t ? 'active' : ''} onClick={() => setTheme(t)}>{t}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <header className="topbar">
            <button className="menu-btn" style={{display:'none'}} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <span className="topbar-title">
              {tab === 'schedule' && '📅 Расписание занятий'}
              {tab === 'advisor' && '⚙️ Панель эдвайзера'}
              {tab === 'analytics' && '📊 Аналитика и статистика'}
            </span>
            <div className="topbar-pills">
              {activeSemester && <span className="pill">{activeSemester === 1 ? '☀️ Осенний' : '🌸 Весенний'} (все курсы)</span>}
              {schedule.length > 0 && <span className="pill">{filtered.length} пар</span>}
            </div>
          </header>

          <div className="content">

            {/* ===== SCHEDULE ===== */}
            {tab === 'schedule' && (
              <>
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 11 }}>
                    Выберите семестр и сгенерируйте расписание
                  </div>
                  <div className="gen-btns">
                    <button className={`semester-btn ${activeSemester === 1 ? 'active' : ''}`}
                      onClick={() => handleGenerate(1)} disabled={loading}>
                      <div>
                        <div className="sem-num">☀️</div>
                        <div className="sem-sub">Осенний</div>
                      </div>
                      <div style={{ textAlign: 'left', fontSize: 10, color: 'var(--text2)', lineHeight: 1.7 }}>
                        <div style={{fontWeight:600}}>Сем. 1, 3, 5, 7</div>
                        <div>все 4 курса</div>
                      </div>
                    </button>
                    <button className={`semester-btn ${activeSemester === 2 ? 'active' : ''}`}
                      onClick={() => handleGenerate(2)} disabled={loading}>
                      <div>
                        <div className="sem-num">🌸</div>
                        <div className="sem-sub">Весенний</div>
                      </div>
                      <div style={{ textAlign: 'left', fontSize: 10, color: 'var(--text2)', lineHeight: 1.7 }}>
                        <div style={{fontWeight:600}}>Сем. 2, 4, 6, 8</div>
                        <div>все 4 курса</div>
                      </div>
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleGenerate(null)} disabled={loading}>
                      🔀 Весь учебный план
                    </button>
                    {loading && <span className="loading-pulse">⏳ ИИ составляет расписание...</span>}
                  </div>
                  {lastUpdate && (
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text2)' }}>
                      🕐 {new Date(lastUpdate).toLocaleString('ru-RU')}
                    </div>
                  )}
                </div>

                {schedule.length > 0 && (
                  <>
                    <div className="card" style={{ marginBottom: 14 }}>
                      <div className="filter-bar">
                        <div className="filter-group">
                          <CustomSelect
                            label="ГРУППА"
                            value={filterGroup}
                            onChange={setFilterGroup}
                            options={[{ value: 'all', label: 'Все группы' }, ...groups.map(g => ({ value: g, label: g }))]}
                          />
                        </div>
                        <div className="filter-group">
                          <CustomSelect
                            label="ПРЕПОДАВАТЕЛЬ"
                            value={filterTeacher}
                            onChange={setFilterTeacher}
                            options={[{ value: 'all', label: 'Все преподаватели' }, ...teacherNames.map(t => ({ value: t, label: t }))]}
                          />
                        </div>
                        <div className="filter-group">
                          <CustomSelect
                            label="АУДИТОРИЯ"
                            value={filterRoom}
                            onChange={setFilterRoom}
                            options={[{ value: 'all', label: 'Все аудитории' }, ...rooms.map(r => ({ value: r, label: r }))]}
                          />
                        </div>
                        <div className="filter-group">
                          <CustomSelect
                            label="СМЕНА"
                            value={filterShift}
                            onChange={setFilterShift}
                            options={[
                              { value: 'all', label: 'Все смены' },
                              { value: '1', label: '☀️ Смена 1 (08–14)' },
                              { value: '2', label: '🌆 Смена 2 (14–20)' },
                            ]}
                          />
                        </div>
                        <div className="filter-actions">
                          <button className={`btn btn-secondary btn-sm`} onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                            {viewMode === 'grid' ? '📋 Список' : '⊞ Сетка'}
                          </button>
                          <button className="btn btn-success btn-sm" onClick={exportExcel}>📥 Excel</button>
                        </div>
                      </div>
                    </div>

                    {/* GRID VIEW */}
                    {viewMode === 'grid' && (
                      <div className="card" style={{ padding: 14 }}>
                        <div className="schedule-wrapper">
                          {[{ label: '☀️ Первая смена (08:00–14:00)', slots: SHIFT1, cls: 's1' },
                            { label: '🌆 Вторая смена (14:00–20:00)', slots: SHIFT2, cls: 's2' }].map(shift => (
                            <div key={shift.cls}>
                              <div className={`shift-sep ${shift.cls}`}>{shift.label}</div>
                              <table className="grid-table">
                                <thead>
                                  <tr>
                                    <th className="grid-time" />
                                    {DAYS.map(d => <th key={d} className="grid-day-hdr">{d.slice(0,3)}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {shift.slots.map(slot => (
                                    <tr key={slot}>
                                      <td className="grid-time">{slot}</td>
                                      {DAYS.map(day => {
                                        const items = gridData[day]?.[slot] || []
                                        return (
                                          <td key={day} className={`grid-cell ${items.length === 0 ? 'empty' : ''}`}>
                                            {items.map((item, i) => (
                                              <div key={i} className={`cell-item ${item.class_type === 'Лекция' ? 'cell-lec' : 'cell-prac'}`}
                                                title={`${item.subject}\n👨‍🏫 ${item.teacher}\n🚪 ${item.room}\n👥 ${item.group}`}>
                                                <div className="cell-subj">{item.subject}</div>
                                                <div className="cell-meta">
                                                  <span className="cell-tag">🚪{item.room}</span>
                                                  <span className="cell-tag">{item.group}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LIST VIEW */}
                    {viewMode === 'list' && (
                      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="list-table">
                          <thead>
                            <tr>
                              <th>День</th><th>Время</th><th>Смена</th><th>Группа</th>
                              <th>Предмет</th><th>Преподаватель</th><th>Ауд.</th><th>Тип</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((row, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{row.day}</td>
                                <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11 }}>{row.time}</td>
                                <td><span className={`shift-badge ${row.shift === 1 ? 'shift1-b' : 'shift2-b'}`}>{row.shift === 1 ? '☀️ I' : '🌆 II'}</span></td>
                                <td style={{ fontWeight: 600, color: 'var(--accent3)' }}>{row.group}</td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subject}</td>
                                <td style={{ color: 'var(--text2)', fontSize: 11 }}>{row.teacher}</td>
                                <td>{row.room}</td>
                                <td><span className={`type-badge ${row.class_type === 'Лекция' ? 'type-lec' : 'type-prac'}`}>{row.class_type}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {schedule.length === 0 && !loading && (
                  <div className="empty-state">
                    <div className="empty-icon">🗓️</div>
                    <div className="empty-title">Расписание не создано</div>
                    <div className="empty-sub">Выберите семестр выше и нажмите кнопку</div>
                  </div>
                )}
              </>
            )}

            {/* ===== ADVISOR ===== */}
            {tab === 'advisor' && (
              <div className="advisor-layout">
                <div className="card">
                  <div className="section-hdr">
                    <div className="section-title">📚 Учебный план (РУП)</div>
                    <button className="btn btn-primary btn-sm" onClick={openNewSubject}>+ Добавить</button>
                  </div>
                  <div className="subj-filters">
                    <input className="search-input" placeholder="🔍 Поиск предмета..." value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} />
                    <select className="form-select" style={{ minWidth: 120 }} value={subjectCourseFilter} onChange={e => setSubjectCourseFilter(e.target.value)}>
                      <option value="all">Все курсы</option>
                      {[1,2,3,4].map(c => <option key={c} value={c}>{c} курс</option>)}
                    </select>
                    <select className="form-select" style={{ minWidth: 130 }} value={subjectSemFilter} onChange={e => setSubjectSemFilter(e.target.value)}>
                      <option value="all">Все семестры</option>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s} семестр</option>)}
                    </select>
                  </div>
                  <div className="subj-count">Найдено: {filteredSubjects.length} из {subjects.length} предметов</div>
                  <div className="subject-list">
                    {filteredSubjects.map(s => (
                      <div key={s.id} className="subject-card">
                        <div className="subj-badges">
                          <span className="chip chip-c">{s.course}к</span>
                          <span className="chip chip-s">{s.semester}сем</span>
                        </div>
                        <div className="subj-info">
                          <div className="subj-name" title={s.name}>{s.name}</div>
                          <div className="subj-meta">💎 {s.credits} кр · 📖 Л:{s.lectures_per_week} / П:{s.practices_per_week}</div>
                          {s.teachers.length > 0
                            ? <div className="subj-teachers">👨‍🏫 {s.teachers.map(t => t.full_name).join(', ')}</div>
                            : <div className="subj-no-t">⚠️ Не назначен преподаватель</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditSubject(s)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSubject(s.id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="section-hdr">
                    <div className="section-title">👨‍🏫 Штат преподавателей</div>
                    <button className="btn btn-primary btn-sm" onClick={() => { setTName(''); setTHours(20); setShowTeacherModal(true) }}>+</button>
                  </div>
                  <div className="teacher-list">
                    {teachers.map(t => (
                      <div key={t.id} className="teacher-card">
                        <div className="t-avatar">👨‍🏫</div>
                        <div className="t-info">
                          <div className="t-name">{t.full_name}</div>
                          <div className="t-hours">⏱ макс. {t.max_hours_per_week} ч/нед</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== ANALYTICS ===== */}
            {tab === 'analytics' && (
              <>
                {!analytics ? (
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <div className="empty-title">Нет данных для анализа</div>
                    <div className="empty-sub">Сначала сгенерируйте расписание на вкладке «Расписание»</div>
                    <button className="btn btn-primary" onClick={() => setTab('schedule')}>Перейти к расписанию</button>
                  </div>
                ) : (
                  <>
                    {/* ALERT */}
                    {analytics.shift2 === 0
                      ? <div className="alert-box alert-warn">⚠️ Все занятия распределены в 1-ю смену. Возможно, слишком мало ресурсов для 2-й смены.</div>
                      : <div className="alert-box alert-ok">✅ Расписание успешно распределено по двум сменам</div>}

                    {/* STAT CARDS */}
                    <div className="stats-grid">
                      {[
                        { icon: '📌', val: analytics.uniqueSlots, lbl: 'Уникальных пар' },
                        { icon: '🏫', val: analytics.groupCount, lbl: 'Групп в расписании' },
                        { icon: '👨‍🏫', val: analytics.teacherCount, lbl: 'Преподавателей' },
                        { icon: '☀️', val: analytics.shift1, lbl: 'Пар в 1-й смене' },
                        { icon: '🌆', val: analytics.shift2, lbl: 'Пар во 2-й смене' },
                        { icon: '📖', val: analytics.lecCount, lbl: 'Лекций (записей)' },
                        { icon: '💻', val: analytics.pracCount, lbl: 'Практик (записей)' },
                        { icon: '🏢', val: Object.keys(analytics.roomCounts).length, lbl: 'Задействовано аудиторий' },
                      ].map(s => (
                        <div key={s.lbl} className="stat-card">
                          <div className="stat-icon">{s.icon}</div>
                          <div className="stat-val">{s.val}</div>
                          <div className="stat-lbl">{s.lbl}</div>
                        </div>
                      ))}
                    </div>

                    {/* ROW 1: Смены + День недели + Тип занятий */}
                    <div className="analytics-row three">
                      {/* Смены donut */}
                      <div className="a-card">
                        <div className="a-title">🔄 Распределение по сменам</div>
                        <div className="donut-wrap">
                          {(() => {
                            const total = analytics.shift1 + analytics.shift2 || 1
                            const pct = Math.round(analytics.shift1/total*100)
                            const r=38, c=48, circ=2*Math.PI*r, d1=circ*pct/100
                            return <>
                              <div className="donut">
                                <svg viewBox="0 0 96 96" width="96" height="96">
                                  <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg3)" strokeWidth="11"/>
                                  <circle cx={c} cy={c} r={r} fill="none" stroke="var(--shift1)" strokeWidth="11" strokeDasharray={`${d1} ${circ-d1}`} strokeLinecap="round"/>
                                  <circle cx={c} cy={c} r={r} fill="none" stroke="var(--shift2)" strokeWidth="11" strokeDasharray={`${circ-d1} ${d1}`} strokeDashoffset={-d1} strokeLinecap="round"/>
                                </svg>
                                <div className="donut-lbl">
                                  <div className="donut-pct">{pct}%</div>
                                  <div className="donut-sub">смена 1</div>
                                </div>
                              </div>
                              <div className="legend">
                                <div className="leg-item"><div className="leg-dot" style={{background:'var(--shift1)'}}/>☀️ Смена 1: {analytics.shift1}</div>
                                <div className="leg-item"><div className="leg-dot" style={{background:'var(--shift2)'}}/>🌆 Смена 2: {analytics.shift2}</div>
                              </div>
                            </>
                          })()}
                        </div>
                      </div>

                      {/* По дням */}
                      <div className="a-card">
                        <div className="a-title">📅 Занятия по дням недели</div>
                        <div className="day-bars">
                          {analytics.dayDist.map(d => {
                            const max = Math.max(...analytics.dayDist.map(x=>x.count), 1)
                            const h = Math.round(d.count/max*70)
                            return (
                              <div key={d.day} className="day-bar-wrap">
                                <div className="day-bar-val">{d.count}</div>
                                <div className="day-bar" style={{height: h+10, background: 'var(--accent)', opacity: d.count>0?1:.2}}/>
                                <div className="day-bar-lbl">{d.day}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Лекции vs Практики */}
                      <div className="a-card">
                        <div className="a-title">📊 Лекции vs Практики</div>
                        <div className="donut-wrap">
                          {(() => {
                            const total = analytics.lecCount + analytics.pracCount || 1
                            const pct = Math.round(analytics.lecCount/total*100)
                            const r=38,c=48,circ=2*Math.PI*r,d1=circ*pct/100
                            return <>
                              <div className="donut">
                                <svg viewBox="0 0 96 96" width="96" height="96">
                                  <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg3)" strokeWidth="11"/>
                                  <circle cx={c} cy={c} r={r} fill="none" stroke="var(--lec)" strokeWidth="11" strokeDasharray={`${d1} ${circ-d1}`} strokeLinecap="round"/>
                                  <circle cx={c} cy={c} r={r} fill="none" stroke="var(--prac)" strokeWidth="11" strokeDasharray={`${circ-d1} ${d1}`} strokeDashoffset={-d1} strokeLinecap="round"/>
                                </svg>
                                <div className="donut-lbl">
                                  <div className="donut-pct">{pct}%</div>
                                  <div className="donut-sub">лекции</div>
                                </div>
                              </div>
                              <div className="legend">
                                <div className="leg-item"><div className="leg-dot" style={{background:'var(--lec)'}}/>📖 Лекции: {analytics.lecCount}</div>
                                <div className="leg-item"><div className="leg-dot" style={{background:'var(--prac)'}}/>💻 Практики: {analytics.pracCount}</div>
                              </div>
                            </>
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* ROW 2: Нагрузка преподавателей + Аудитории */}
                    <div className="analytics-row">
                      <div className="a-card">
                        <div className="a-title">👨‍🏫 Нагрузка преподавателей</div>
                        {Object.entries(analytics.teacherCounts).sort(([,a],[,b])=>b-a).map(([name,count]) => {
                          const t = teachers.find(x=>x.full_name===name)
                          const max = t?.max_hours_per_week||20
                          const pct = Math.min(100, Math.round(count/max*100))
                          const over = count > max
                          return (
                            <div key={name} className="bar-row">
                              <div className="bar-hdr">
                                <span className="bar-name">{name}</span>
                                <span className="bar-count" style={{color:over?'var(--danger)':undefined}}>{count}/{max}ч {over?'⚠️':''}</span>
                              </div>
                              <div className="bar-track"><div className={`bar-fill ${over?'bg-red':pct>75?'bg-yellow':'bg-green'}`} style={{width:`${pct}%`}}/></div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="a-card">
                        <div className="a-title">🏢 Загрузка аудиторий</div>
                        {Object.entries(analytics.roomCounts).sort(([,a],[,b])=>b-a).map(([room,count]) => {
                          const max = 72, pct = Math.min(100,Math.round(count/max*100))
                          return (
                            <div key={room} className="bar-row">
                              <div className="bar-hdr">
                                <span className="bar-name">🚪 {room}</span>
                                <span className="bar-count">{count} пар ({pct}%)</span>
                              </div>
                              <div className="bar-track"><div className={`bar-fill ${pct>80?'bg-red':pct>55?'bg-yellow':'bg-accent'}`} style={{width:`${pct}%`}}/></div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* ROW 3: По курсам + По группам */}
                    <div className="analytics-row">
                      <div className="a-card">
                        <div className="a-title">🎓 Нагрузка по курсам</div>
                        {analytics.courseLoad.map(c => {
                          const max = Math.max(...analytics.courseLoad.map(x=>x.count),1)
                          const pct = Math.round(c.count/max*100)
                          return (
                            <div key={c.course} className="bar-row">
                              <div className="bar-hdr">
                                <span className="bar-name">{c.course} курс</span>
                                <span className="bar-count">{c.count} записей</span>
                              </div>
                              <div className="bar-track"><div className="bar-fill bg-shift1" style={{width:`${pct}%`}}/></div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="a-card">
                        <div className="a-title">👥 Нагрузка по группам</div>
                        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                          {analytics.groupLoad.map(([group, count]) => {
                            const max = Math.max(...analytics.groupLoad.map(([,v])=>v),1)
                            const pct = Math.round(count/max*100)
                            return (
                              <div key={group} className="bar-row">
                                <div className="bar-hdr">
                                  <span className="bar-name">{group}</span>
                                  <span className="bar-count">{count}</span>
                                </div>
                                <div className="bar-track"><div className="bar-fill bg-shift2" style={{width:`${pct}%`}}/></div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ROW 4: Топ предметов */}
                    <div className="analytics-row full">
                      <div className="a-card">
                        <div className="a-title">📚 Топ предметов по количеству занятий</div>
                        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'var(--lec)' }}/> Лекции</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'var(--prac)' }}/> Практики</span>
                        </div>
                        {analytics.topSubjects.map(s => {
                          const max = analytics.topSubjects[0]?.total || 1
                          const wLec = Math.round(s.lec/max*100), wPrac = Math.round(s.prac/max*100)
                          return (
                            <div key={s.name} className="subj-bar">
                              <div className="subj-bar-name" title={s.name}>{s.name}</div>
                              <div className="subj-bar-track">
                                <div className="subj-bar-lec" style={{ width: `${wLec}%`, background: 'var(--lec)', opacity: .85 }}/>
                                <div className="subj-bar-prac" style={{ width: `${wPrac}%`, background: 'var(--prac)', opacity: .85 }}/>
                              </div>
                              <div className="subj-bar-val">Л:{s.lec} П:{s.prac}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>

        {/* SUBJECT MODAL */}
        {showSubjectModal && (
          <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setShowSubjectModal(false) }}>
            <div className="modal">
              <div className="modal-title">{editSubject ? '✏️ Редактировать предмет' : '➕ Новый предмет'}</div>
              <div className="form-grid">
                <div className="form-field full">
                  <label className="form-label">Название предмета</label>
                  <input className="form-input" value={fName} onChange={e=>setFName(e.target.value)} placeholder="Введите название..." />
                </div>
                <div className="form-field">
                  <label className="form-label">Курс</label>
                  <select className="form-select" value={fCourse} onChange={e=>setFCourse(Number(e.target.value))}>
                    {[1,2,3,4].map(c=><option key={c} value={c}>{c} курс</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Семестр</label>
                  <select className="form-select" value={fSem} onChange={e=>setFSem(Number(e.target.value))}>
                    {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>{s} семестр</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Кредиты</label>
                  <input type="number" className="form-input" min={1} max={15} value={fCredits} onChange={e=>setFCredits(Number(e.target.value))}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Лекций / нед</label>
                  <input type="number" className="form-input" min={0} max={5} value={fLec} onChange={e=>setFLec(Number(e.target.value))}/>
                </div>
                <div className="form-field full">
                  <label className="form-label">Практик / нед</label>
                  <input type="number" className="form-input" min={0} max={5} value={fPrac} onChange={e=>setFPrac(Number(e.target.value))}/>
                </div>
                <div className="form-field full">
                  <label className="form-label">Преподаватели</label>
                  <div className="teacher-checks">
                    {teachers.map(t => (
                      <label key={t.id} className={`t-check ${fTeacherIds.includes(t.id)?'checked':''}`}>
                        <input type="checkbox" checked={fTeacherIds.includes(t.id)}
                          onChange={()=>setFTeacherIds(prev=>prev.includes(t.id)?prev.filter(x=>x!==t.id):[...prev,t.id])}/>
                        {t.full_name}
                        <span style={{marginLeft:'auto',fontSize:10,color:'var(--text2)'}}>{t.max_hours_per_week}ч/нед</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={()=>setShowSubjectModal(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={handleSaveSubject}>💾 Сохранить</button>
              </div>
            </div>
          </div>
        )}

        {/* TEACHER MODAL */}
        {showTeacherModal && (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowTeacherModal(false)}}>
            <div className="modal" style={{maxWidth:380}}>
              <div className="modal-title">➕ Новый преподаватель</div>
              <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
                <div className="form-field">
                  <label className="form-label">ФИО преподавателя</label>
                  <input className="form-input" value={tName} onChange={e=>setTName(e.target.value)} placeholder="Фамилия И.О."/>
                </div>
                <div className="form-field">
                  <label className="form-label">Макс. часов в неделю</label>
                  <input type="number" className="form-input" min={1} max={40} value={tHours} onChange={e=>setTHours(Number(e.target.value))}/>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={()=>setShowTeacherModal(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={handleSaveTeacher}>💾 Добавить</button>
              </div>
            </div>
          </div>
        )}

        {sidebarOpen && <div style={{position:'fixed',inset:0,background:'#00000055',zIndex:99}} onClick={()=>setSidebarOpen(false)}/>}
      </div>
    </>
  )
}