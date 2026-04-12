// ================================================================
// ФАЙЛ: diploma_frontend/src/ScheduleEditModal.tsx
// Компонент модала редактирования занятия с проверкой конфликтов
// ================================================================

import { useState, useEffect } from 'react'
import axios from 'axios'

const BASE = 'http://127.0.0.1:8000'

const DAYS_RU = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"]
const SHIFT_1_SLOTS = [
  "08:00-08:50","09:00-09:50","10:00-10:50",
  "11:10-12:00","12:10-13:00","13:10-14:00"
]
const SHIFT_2_SLOTS = [
  "14:10-15:00","15:10-16:00","16:10-17:00",
  "17:10-18:00","18:10-19:00","19:10-20:00"
]
const ALL_SLOTS = [...SHIFT_1_SLOTS, ...SHIFT_2_SLOTS]
const COURSE_TO_SHIFT: Record<number, number> = {1:1, 2:2, 3:1, 4:2}

export interface ScheduleItem {
  day: string; time: string; time_index: number
  group: string; subject: string; teacher: string
  room: string; class_type: string; shift: number
  course: number; language: string; semester?: number
}

interface ConflictInfo {
  type: string
  entity: string
  conflict_with: string
}

interface ValidationResult {
  valid: boolean
  conflicts: ConflictInfo[]
  warnings: string[]
  message: string
}

interface Props {
  item: ScheduleItem
  itemIndex: number
  schedule: ScheduleItem[]
  allRooms: string[]
  allTeachers: string[]
  lang: 'ru' | 'kz' | 'en'
  onClose: () => void
  onApply: (updated: ScheduleItem) => void
}

const LABELS = {
  ru: {
    title: 'Редактирование занятия',
    subject: 'Предмет', group: 'Группа', current: 'Текущие данные',
    new_vals: 'Новые значения', day: 'День', time: 'Время',
    room: 'Аудитория', teacher: 'Преподаватель',
    check: 'Проверить конфликты', apply: 'Применить изменение',
    cancel: 'Отмена', checking: 'Проверка...',
    no_changes: 'Нет изменений для проверки',
    conflicts: 'Конфликты', warnings: 'Предупреждения',
    type_room: 'Аудитория занята', type_teacher: 'Преподаватель занят',
    type_group: 'Группа занята', type_shift: 'Нарушение смены',
    shift_info: 'Смена', shift1: 'Смена 1 (08–14)', shift2: 'Смена 2 (14–20)',
    course: 'курс', valid_msg: '✓ Конфликтов не найдено — можно применить',
    legend_title: 'Типы конфликтов',
  },
  kz: {
    title: 'Сабақты өңдеу',
    subject: 'Пән', group: 'Топ', current: 'Ағымдағы деректер',
    new_vals: 'Жаңа мәндер', day: 'Күн', time: 'Уақыт',
    room: 'Аудитория', teacher: 'Оқытушы',
    check: 'Қақтығыстарды тексеру', apply: 'Өзгерісті қолдану',
    cancel: 'Болдырмау', checking: 'Тексеру...',
    no_changes: 'Тексеруге өзгерістер жоқ',
    conflicts: 'Қақтығыстар', warnings: 'Ескертулер',
    type_room: 'Аудитория бос емес', type_teacher: 'Оқытушы бос емес',
    type_group: 'Топ бос емес', type_shift: 'Ауысым бұзылды',
    shift_info: 'Ауысым', shift1: '1-ауысым (08–14)', shift2: '2-ауысым (14–20)',
    course: 'курс', valid_msg: '✓ Қақтығыс табылмады — қолдануға болады',
    legend_title: 'Қақтығыс түрлері',
  },
  en: {
    title: 'Edit Class',
    subject: 'Subject', group: 'Group', current: 'Current Values',
    new_vals: 'New Values', day: 'Day', time: 'Time',
    room: 'Room', teacher: 'Teacher',
    check: 'Check Conflicts', apply: 'Apply Change',
    cancel: 'Cancel', checking: 'Checking...',
    no_changes: 'No changes to check',
    conflicts: 'Conflicts', warnings: 'Warnings',
    type_room: 'Room occupied', type_teacher: 'Teacher busy',
    type_group: 'Group busy', type_shift: 'Wrong shift',
    shift_info: 'Shift', shift1: 'Shift 1 (08–14)', shift2: 'Shift 2 (14–20)',
    course: 'year', valid_msg: '✓ No conflicts — safe to apply',
    legend_title: 'Conflict Types',
  }
}

const CONFLICT_COLORS: Record<string, string> = {
  room: '#ef5350',
  teacher: '#fb8c00',
  group: '#ab47bc',
  shift: '#e53935',
}
const CONFLICT_ICONS: Record<string, string> = {
  room: '🏫', teacher: '👤', group: '👥', shift: '⏰'
}

export default function ScheduleEditModal({
  item, itemIndex, schedule, allRooms, allTeachers, lang, onClose, onApply
}: Props) {
  const L = LABELS[lang]

  const [newDay, setNewDay]       = useState(item.day)
  const [newTime, setNewTime]     = useState(item.time)
  const [newRoom, setNewRoom]     = useState(item.room)
  const [newTeacher, setNewTeacher] = useState(item.teacher)

  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [checked, setChecked]       = useState(false)

  const requiredShift = COURSE_TO_SHIFT[item.course] || 1
  const allowedSlots  = requiredShift === 1 ? SHIFT_1_SLOTS : SHIFT_2_SLOTS

  // Сбросить результат проверки при изменении любого поля
  useEffect(() => { setValidation(null); setChecked(false) },
    [newDay, newTime, newRoom, newTeacher])

  const hasChanges = (
    newDay !== item.day ||
    newTime !== item.time ||
    newRoom !== item.room ||
    newTeacher !== item.teacher
  )

  const handleCheck = async () => {
    if (!hasChanges) return
    setLoading(true)
    try {
      const resp = await axios.post<ValidationResult>(
        `${BASE}/schedule/validate-change`,
        {
          current_schedule: schedule,
          target_index: itemIndex,
          new_day: newDay,
          new_time: newTime,
          new_room: newRoom,
          new_teacher: newTeacher,
        }
      )
      setValidation(resp.data)
      setChecked(true)
    } catch {
      setValidation({
        valid: false,
        conflicts: [],
        warnings: [],
        message: lang === 'en' ? 'Server error. Check backend.' :
                 lang === 'kz' ? 'Сервер қатесі.' : 'Ошибка сервера. Проверьте backend.'
      })
      setChecked(true)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!validation?.valid) return
    const timeIdx = ALL_SLOTS.indexOf(newTime)
    const newShift = SHIFT_1_SLOTS.includes(newTime) ? 1 : 2
    onApply({
      ...item,
      day: newDay,
      time: newTime,
      time_index: timeIdx >= 0 ? timeIdx : item.time_index,
      room: newRoom,
      teacher: newTeacher,
      shift: newShift,
    })
  }

  // ── Стили ────────────────────────────────────────────────
  const S: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)',
      zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn .15s',
    },
    modal: {
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      width: '100%', maxWidth: 680,
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      animation: 'slideUp .18s',
    },
    header: {
      padding: '18px 22px 14px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 12,
    },
    body: { padding: '18px 22px' },
    footer: {
      padding: '14px 22px',
      borderTop: '1px solid var(--border)',
      display: 'flex', gap: 10, justifyContent: 'flex-end',
      flexWrap: 'wrap',
    },
    sectionTitle: {
      fontSize: 10, fontWeight: 700, color: 'var(--text3)',
      textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10,
    },
    infoGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 8, marginBottom: 18,
      background: 'var(--bg3)', borderRadius: 8,
      padding: '12px 14px', border: '1px solid var(--border)',
    },
    infoRow: { display: 'flex', flexDirection: 'column', gap: 2 },
    infoLabel: { fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' },
    infoVal: { fontSize: 12.5, fontWeight: 600, color: 'var(--text)' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    label: { fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' },
    select: {
      padding: '8px 10px', borderRadius: 6,
      border: '1px solid var(--border)',
      background: 'var(--bg3)', color: 'var(--text)',
      fontSize: 12.5, fontFamily: 'inherit',
      outline: 'none', cursor: 'pointer',
    },
    conflictBox: {
      background: 'rgba(239,83,80,0.06)',
      border: '1px solid rgba(239,83,80,0.25)',
      borderRadius: 8, padding: '12px 14px', marginBottom: 10,
    },
    warnBox: {
      background: 'rgba(251,140,0,0.06)',
      border: '1px solid rgba(251,140,0,0.25)',
      borderRadius: 8, padding: '12px 14px', marginBottom: 10,
    },
    successBox: {
      background: 'rgba(38,166,154,0.08)',
      border: '1px solid rgba(38,166,154,0.3)',
      borderRadius: 8, padding: '12px 14px', marginBottom: 10,
    },
    shiftPill: {
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 700,
      padding: '3px 10px', borderRadius: 20,
      background: requiredShift === 1 ? 'rgba(92,107,192,0.15)' : 'rgba(251,140,0,0.15)',
      color: requiredShift === 1 ? 'var(--shift1)' : 'var(--shift2)',
      border: `1px solid ${requiredShift === 1 ? 'rgba(92,107,192,0.3)' : 'rgba(251,140,0,0.3)'}`,
      marginBottom: 14,
    },
  }

  const ConflictItem = ({ c }: { c: ConflictInfo }) => (
    <div style={{
      display: 'flex', gap: 10, padding: '8px 0',
      borderBottom: '1px solid rgba(239,83,80,0.12)', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{CONFLICT_ICONS[c.type] || '⚠️'}</span>
      <div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: CONFLICT_COLORS[c.type] || 'var(--danger)', marginBottom: 2,
        }}>
          {c.type === 'room'    ? L.type_room    :
           c.type === 'teacher' ? L.type_teacher  :
           c.type === 'group'   ? L.type_group    : L.type_shift}
          {' '}— {c.entity}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
          {c.conflict_with}
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={S.modal}>

        {/* HEADER */}
        <div style={S.header}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 4 }}>
              {L.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              {item.subject} · {item.group} · {item.class_type === 'Лекция' ? (lang === 'en' ? 'Lecture' : lang === 'kz' ? 'Дәріс' : 'Лекция') : (lang === 'en' ? 'Practice' : lang === 'kz' ? 'Тәжірибе' : 'Практика')}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1,
              borderRadius: 4, flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* BODY */}
        <div style={S.body}>

          {/* Смена */}
          <div style={S.shiftPill}>
            ⏱ {L.shift_info} {requiredShift}: {requiredShift === 1 ? L.shift1 : L.shift2}
            &nbsp;·&nbsp;{item.course} {L.course}
          </div>

          {/* Текущие данные */}
          <div style={S.sectionTitle}>{L.current}</div>
          <div style={S.infoGrid}>
            {[
              [L.day, item.day],
              [L.time, item.time],
              [L.room, item.room],
              [L.teacher, item.teacher],
            ].map(([label, val]) => (
              <div style={S.infoRow} key={label}>
                <span style={S.infoLabel}>{label}</span>
                <span style={S.infoVal}>{val}</span>
              </div>
            ))}
          </div>

          {/* Новые значения */}
          <div style={S.sectionTitle}>{L.new_vals}</div>
          <div style={S.grid2}>

            {/* День */}
            <div style={S.field}>
              <label style={S.label}>{L.day}</label>
              <select
                style={{
                  ...S.select,
                  borderColor: newDay !== item.day ? 'var(--accent)' : 'var(--border)',
                }}
                value={newDay}
                onChange={e => setNewDay(e.target.value)}
              >
                {DAYS_RU.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Время */}
            <div style={S.field}>
              <label style={S.label}>{L.time}</label>
              <select
                style={{
                  ...S.select,
                  borderColor: newTime !== item.time ? 'var(--accent)' : 'var(--border)',
                }}
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
              >
                <optgroup label={lang === 'en' ? 'Shift 1 (08–14)' : lang === 'kz' ? '1-ауысым (08–14)' : 'Смена 1 (08–14)'}>
                  {SHIFT_1_SLOTS.map(s => (
                    <option
                      key={s} value={s}
                      style={{ color: requiredShift !== 1 ? '#f87171' : 'inherit' }}
                    >
                      {s}{requiredShift !== 1 ? ' ⚠' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={lang === 'en' ? 'Shift 2 (14–20)' : lang === 'kz' ? '2-ауысым (14–20)' : 'Смена 2 (14–20)'}>
                  {SHIFT_2_SLOTS.map(s => (
                    <option
                      key={s} value={s}
                      style={{ color: requiredShift !== 2 ? '#f87171' : 'inherit' }}
                    >
                      {s}{requiredShift !== 2 ? ' ⚠' : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Аудитория */}
            <div style={S.field}>
              <label style={S.label}>{L.room}</label>
              <select
                style={{
                  ...S.select,
                  borderColor: newRoom !== item.room ? 'var(--accent)' : 'var(--border)',
                }}
                value={newRoom}
                onChange={e => setNewRoom(e.target.value)}
              >
                {allRooms.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Преподаватель */}
            <div style={S.field}>
              <label style={S.label}>{L.teacher}</label>
              <select
                style={{
                  ...S.select,
                  borderColor: newTeacher !== item.teacher ? 'var(--accent)' : 'var(--border)',
                }}
                value={newTeacher}
                onChange={e => setNewTeacher(e.target.value)}
              >
                {allTeachers.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Подсветка изменений */}
          {hasChanges && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14,
            }}>
              {newDay !== item.day && (
                <span style={{ fontSize: 11, background: 'var(--accent)15', color: 'var(--accent3)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
                  {item.day} → {newDay}
                </span>
              )}
              {newTime !== item.time && (
                <span style={{ fontSize: 11, background: 'var(--accent)15', color: 'var(--accent3)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
                  {item.time} → {newTime}
                </span>
              )}
              {newRoom !== item.room && (
                <span style={{ fontSize: 11, background: 'var(--prac)15', color: 'var(--prac)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
                  {item.room} → {newRoom}
                </span>
              )}
              {newTeacher !== item.teacher && (
                <span style={{ fontSize: 11, background: 'var(--info)15', color: 'var(--info)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
                  {item.teacher} → {newTeacher}
                </span>
              )}
            </div>
          )}

          {/* Результат валидации */}
          {checked && validation && (
            <div>
              {/* Конфликты */}
              {validation.conflicts.length > 0 && (
                <div style={S.conflictBox}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--danger)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>🚫</span> {L.conflicts} ({validation.conflicts.length})
                  </div>
                  {validation.conflicts.map((c, i) => (
                    <ConflictItem key={i} c={c} />
                  ))}
                </div>
              )}

              {/* Предупреждения */}
              {validation.warnings.length > 0 && (
                <div style={S.warnBox}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warn)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>⚠️</span> {L.warnings} ({validation.warnings.length})
                  </div>
                  {validation.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: 'var(--text2)', padding: '4px 0', borderBottom: '1px solid rgba(251,140,0,0.12)', lineHeight: 1.5 }}>
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Успех */}
              {validation.valid && (
                <div style={S.successBox}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--success)' }}>
                    {L.valid_msg}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={S.footer}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontSize: 12.5,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {L.cancel}
          </button>

          <button
            onClick={handleCheck}
            disabled={!hasChanges || loading}
            style={{
              padding: '8px 18px', borderRadius: 6,
              border: `1px solid ${hasChanges ? 'var(--accent)' : 'var(--border)'}`,
              background: hasChanges ? 'var(--accent)15' : 'transparent',
              color: hasChanges ? 'var(--accent3)' : 'var(--text3)',
              fontSize: 12.5, fontWeight: 700, cursor: hasChanges ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', opacity: (!hasChanges || loading) ? 0.5 : 1,
              transition: 'all .15s',
            }}
          >
            {loading ? L.checking : L.check}
          </button>

          <button
            onClick={handleApply}
            disabled={!checked || !validation?.valid}
            style={{
              padding: '8px 18px', borderRadius: 6,
              background: (checked && validation?.valid) ? 'var(--success)' : 'var(--bg3)',
              border: `1px solid ${(checked && validation?.valid) ? 'var(--success)' : 'var(--border)'}`,
              color: (checked && validation?.valid) ? '#fff' : 'var(--text3)',
              fontSize: 12.5, fontWeight: 700,
              cursor: (checked && validation?.valid) ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              opacity: (!checked || !validation?.valid) ? 0.45 : 1,
              transition: 'all .2s',
            }}
          >
            {L.apply}
          </button>
        </div>
      </div>
    </div>
  )
}