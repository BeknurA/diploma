import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import './App.css'

interface ScheduleItem {
  day: string;
  time: string;
  group: string;
  subject: string;
  teacher: string;
  room: string;
  class_type: string;
}

interface ScheduleResponse {
  schedule: ScheduleItem[];
  generated_at: string;
}

interface Teacher {
  id: number;
  full_name: string;
  max_hours_per_week: number;
}

interface Subject {
  id: number;
  name: string;
  credits: number;
  lectures_per_week: number;
  practices_per_week: number;
  course: number;
  semester: number;
  teachers: Teacher[];
}

const BASE_SUBJECTS = [
  "Математика 1", "История Казахстана", "Дискретная математика",
  "Физическая культура", "Русский язык", "Казахский язык",
  "Иностранный язык (Англ)", "Жасанды интеллект (AI)",
  "Компьютерлік кескінді өңдеу (Image Processing)",
  "Мультиагенттік жүйелер теориясы",
  "IT жобаларды басқару (Project Management)",
  "Корпоративті ақпараттық жүйелер", "Базы данных",
  "Web-технологии", "Операционные системы"
];

const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

function App() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'admin' | 'analytics'>('schedule')

  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  
  const [selectedGroup, setSelectedGroup] = useState<string>("Все группы")
  const [selectedTeacher, setSelectedTeacher] = useState<string>("Все преподаватели")
  const [selectedRoom, setSelectedRoom] = useState<string>("Все аудитории")
  
  // Новый фильтр для аналитики
  const [analyticsDay, setAnalyticsDay] = useState<string>("Все дни")

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  
  const [subjName, setSubjName] = useState('')
  const [subjCredits, setSubjCredits] = useState<number>(5)
  const [subjLec, setSubjLec] = useState<number>(1)
  const [subjPrac, setSubjPrac] = useState<number>(2)
  const [subjCourse, setSubjCourse] = useState<number>(1)
  const [subjSemester, setSubjSemester] = useState<number>(1)
  const [subjTeacherIds, setSubjTeacherIds] = useState<number[]>([]) 

  const [teacherName, setTeacherName] = useState('')
  const [teacherHours, setTeacherHours] = useState<number>(20)

  useEffect(() => {
    if (activeTab === 'admin' || activeTab === 'analytics') {
      fetchSubjects();
      fetchTeachers();
    }
  }, [activeTab]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await axios.post<ScheduleResponse>('http://127.0.0.1:8000/generate-schedule/');
      setSchedule(response.data.schedule);
      setLastUpdate(response.data.generated_at);
      setSelectedGroup("Все группы"); setSelectedTeacher("Все преподаватели"); setSelectedRoom("Все аудитории");
    } catch (error) {
      console.error(error); alert("Ошибка соединения с сервером!");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try { const res = await axios.get<Subject[]>('http://127.0.0.1:8000/subjects/'); setSubjects(res.data); } catch (e) {}
  };

  const fetchTeachers = async () => {
    try { const res = await axios.get<Teacher[]>('http://127.0.0.1:8000/teachers/'); setTeachers(res.data); } catch (e) {}
  };

  const handleSaveSubject = async () => {
    if (!subjName.trim()) return;
    try {
      await axios.post('http://127.0.0.1:8000/subjects/', {
        name: subjName, credits: subjCredits, lectures_per_week: subjLec, practices_per_week: subjPrac, course: subjCourse, semester: subjSemester, teacher_ids: subjTeacherIds
      });
      alert(`Настройки для "${subjName}" сохранены!`);
      setSubjName(''); setSubjTeacherIds([]); fetchSubjects();
    } catch (e) { alert("Ошибка при сохранении предмета!"); }
  };

  const handleSaveTeacher = async () => {
    if (!teacherName.trim()) return;
    try {
      await axios.post('http://127.0.0.1:8000/teachers/', { full_name: teacherName, max_hours_per_week: teacherHours });
      alert(`Преподаватель "${teacherName}" сохранен!`);
      setTeacherName(''); fetchTeachers();
    } catch (e) { alert("Ошибка при сохранении преподавателя!"); }
  };

  const toggleTeacher = (id: number) => {
    setSubjTeacherIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const exportToExcel = () => {
    const dataToExport = filteredSchedule.map(row => ({
      "День": row.day, "Время": row.time, "Группа": row.group, "Предмет": row.subject, "Преподаватель": row.teacher, "Аудитория": row.room, "Тип": row.class_type
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Расписание");
    XLSX.writeFile(workbook, `Расписание.xlsx`);
  };

  const uniqueGroups = useMemo(() => ["Все группы", ...Array.from(new Set(schedule.map(i => i.group))).sort()], [schedule]);
  const uniqueTeachers = useMemo(() => ["Все преподаватели", ...Array.from(new Set(schedule.map(i => i.teacher))).sort()], [schedule]);
  const uniqueRooms = useMemo(() => ["Все аудитории", ...Array.from(new Set(schedule.map(i => i.room))).sort()], [schedule]);

  const filteredSchedule = useMemo(() => {
    return schedule.filter(item => {
      return (selectedGroup === "Все группы" || item.group === selectedGroup) &&
             (selectedTeacher === "Все преподаватели" || item.teacher === selectedTeacher) &&
             (selectedRoom === "Все аудитории" || item.room === selectedRoom);
    });
  }, [schedule, selectedGroup, selectedTeacher, selectedRoom]);

  const allSubjectOptions = useMemo(() => {
    const dbSubjects = subjects.map(s => s.name);
    return Array.from(new Set([...BASE_SUBJECTS, ...dbSubjects])).sort();
  }, [subjects]);

  // --- МАГИЯ АНАЛИТИКИ (УМНАЯ) ---
  const analytics = useMemo(() => {
    if (schedule.length === 0) return null;

    // Фильтруем данные по выбранному дню
    const data = analyticsDay === "Все дни" ? schedule : schedule.filter(s => s.day === analyticsDay);
    if (data.length === 0) return null;

    const activeGroupsCount = new Set(data.map(s => s.group)).size;

    // ИСПРАВЛЕНИЕ МАТЕМАТИКИ: Считаем уникальные ФИЗИЧЕСКИЕ пары (Препод + День + Время)
    const uniqueTeacherSlots = new Set(data.map(s => `${s.teacher}|${s.day}|${s.time}`));
    const uniqueRoomSlots = new Set(data.map(s => `${s.room}|${s.day}|${s.time}`));

    const totalRealClasses = uniqueRoomSlots.size; // Реальное количество занятых слотов в универе

    const MAX_SLOTS = analyticsDay === "Все дни" ? 72 : 12; // 6 дней * 12 пар ИЛИ 1 день * 12 пар
    
    // Загрузка аудиторий
    const roomCounts: Record<string, number> = {};
    uniqueRoomSlots.forEach(slot => {
      const room = slot.split('|')[0];
      roomCounts[room] = (roomCounts[room] || 0) + 1;
    });

    const roomOccupancy = Object.entries(roomCounts).map(([room, count]) => {
      const percent = Math.min(100, Math.round((count / MAX_SLOTS) * 100));
      return { room, count, percent };
    }).sort((a, b) => b.percent - a.percent);

    // Загрузка преподавателей (Сравниваем с их индивидуальной ставкой из БД!)
    const teacherCounts: Record<string, number> = {};
    uniqueTeacherSlots.forEach(slot => {
      const teacher = slot.split('|')[0];
      teacherCounts[teacher] = (teacherCounts[teacher] || 0) + 1;
    });

    const teacherLoad = Object.entries(teacherCounts).map(([teacherName, count]) => {
      const dbObj = teachers.find(t => t.full_name === teacherName);
      // Если фильтр "Все дни" - берем макс часы, если 1 день - делим ставку примерно на 5
      const maxHours = dbObj ? (analyticsDay === "Все дни" ? dbObj.max_hours_per_week : Math.ceil(dbObj.max_hours_per_week / 5)) : 20;
      const percent = Math.min(100, Math.round((count / maxHours) * 100));
      const isOverloaded = count > maxHours;
      return { teacher: teacherName, count, max: maxHours, percent, isOverloaded };
    }).sort((a, b) => b.percent - a.percent);

    // Умные алерты (Опасности)
    const overloadedTeachers = teacherLoad.filter(t => t.isOverloaded);
    const chokedRooms = roomOccupancy.filter(r => r.percent >= 90);

    return { totalRealClasses, activeGroupsCount, activeTeachersCount: teacherLoad.length, roomOccupancy, teacherLoad, overloadedTeachers, chokedRooms, MAX_SLOTS };
  }, [schedule, analyticsDay, teachers]);

  return (
    <>
      <h1>🎓 Умное Расписание</h1>

      <div className="nav-tabs">
        <button className={`nav-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>📅 Расписание</button>
        <button className={`nav-button ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>⚙️ Панель Эдвайзера</button>
        <button className={`nav-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>📊 Аналитика</button>
      </div>

      {activeTab === 'schedule' && (
        <div className="tab-content">
          <div className="card">
            <button onClick={handleGenerate} disabled={loading} style={{marginBottom: '15px'}}>
              {loading ? '⏳ Генерация (ИИ думает)...' : '🚀 Сгенерировать Расписание'}
            </button>
            {lastUpdate && <p style={{color: '#888', marginBottom: '20px'}}>Сгенерировано: {new Date(lastUpdate).toLocaleString()}</p>}

            {schedule.length > 0 && (
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{display: 'flex', flexDirection: 'column', textAlign: 'left'}}>
                  <label style={{fontSize: '0.85em', color: '#bbb', marginBottom: '5px', fontWeight: 'bold'}}>Группа:</label>
                  <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #555' }}>
                    {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', textAlign: 'left'}}>
                  <label style={{fontSize: '0.85em', color: '#bbb', marginBottom: '5px', fontWeight: 'bold'}}>Преподаватель:</label>
                  <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #555' }}>
                    {uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', textAlign: 'left'}}>
                  <label style={{fontSize: '0.85em', color: '#bbb', marginBottom: '5px', fontWeight: 'bold'}}>Аудитория:</label>
                  <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #555' }}>
                    {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button onClick={exportToExcel} style={{background: '#28a745', color: 'white', padding: '9px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>📥 Скачать в Excel</button>
              </div>
            )}
          </div>

          {filteredSchedule.length > 0 ? (
            <table className="schedule-table">
              <thead><tr><th>День</th><th>Время</th><th>Группа</th><th>Предмет</th><th>Преподаватель</th><th>Аудитория</th><th>Тип</th></tr></thead>
              <tbody>
                {filteredSchedule.map((row, idx) => (
                  <tr key={idx}><td>{row.day}</td><td>{row.time}</td><td style={{fontWeight: 'bold', color: '#4db6ac'}}>{row.group}</td><td>{row.subject}</td><td style={{color: '#e0e0e0'}}>{row.teacher}</td><td>{row.room}</td><td className={row.class_type === 'Лекция' ? 'type-lecture' : 'type-practice'}>{row.class_type}</td></tr>
                ))}
              </tbody>
            </table>
          ) : ( schedule.length > 0 && <p style={{marginTop: '20px', fontSize: '1.1em', color: '#f39c12'}}>Занятий не найдено.</p> )}
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="tab-content">
          <h2 style={{color: '#4db6ac', marginBottom: '15px'}}>📚 Управление предметами (РУП)</h2>
          <div className="admin-form">
            <div className="form-group"><label>Название предмета</label><input type="text" list="subject-options" value={subjName} onChange={(e) => setSubjName(e.target.value)} /><datalist id="subject-options">{allSubjectOptions.map(name => <option key={name} value={name} />)}</datalist></div>
            <div className="form-group"><label>Курс</label><input type="number" min="1" max="4" value={subjCourse} onChange={(e) => setSubjCourse(Number(e.target.value))} /></div>
            <div className="form-group"><label>Семестр</label><input type="number" min="1" max="8" value={subjSemester} onChange={(e) => setSubjSemester(Number(e.target.value))} /></div>
            <div className="form-group"><label>Кредиты</label><input type="number" min="1" max="12" value={subjCredits} onChange={(e) => setSubjCredits(Number(e.target.value))} /></div>
            <div className="form-group"><label>Лекций/нед</label><input type="number" min="0" max="5" value={subjLec} onChange={(e) => setSubjLec(Number(e.target.value))} /></div>
            <div className="form-group"><label>Практик/нед</label><input type="number" min="0" max="5" value={subjPrac} onChange={(e) => setSubjPrac(Number(e.target.value))} /></div>
            <div className="form-group" style={{width: '100%', borderTop: '1px solid #444', paddingTop: '15px', marginTop: '10px'}}><label>👨‍🏫 Кто ведет этот предмет?</label><div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px'}}>{teachers.map(t => (<label key={t.id} style={{display: 'flex', alignItems: 'center', gap: '8px', background: '#2c2c2c', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', border: '1px solid #555'}}><input type="checkbox" checked={subjTeacherIds.includes(t.id)} onChange={() => toggleTeacher(t.id)} />{t.full_name}</label>))}</div></div>
            <button className="btn-save" style={{marginTop: '15px'}} onClick={handleSaveSubject}>💾 Сохранить Предмет</button>
          </div>

          <table className="schedule-table" style={{marginBottom: '50px'}}>
            <thead><tr><th>Предмет</th><th>Курс</th><th>Семестр</th><th>Часы (Л/П)</th><th>Назначенные преподаватели</th></tr></thead>
            <tbody>
              {subjects.map((sub) => (
                <tr key={sub.id}><td style={{fontWeight: 'bold'}}>{sub.name}</td><td>{sub.course}</td><td>{sub.semester}</td><td>{sub.lectures_per_week} / {sub.practices_per_week}</td><td style={{color: '#f39c12'}}>{sub.teachers && sub.teachers.length > 0 ? sub.teachers.map(t => t.full_name).join(', ') : '⚠️ Не назначены!'}</td></tr>
              ))}
            </tbody>
          </table>

          <h2 style={{color: '#4db6ac', marginBottom: '15px'}}>👨‍🏫 Управление преподавателями (Штат)</h2>
          <div className="admin-form" style={{justifyContent: 'flex-start'}}>
             <div className="form-group"><label>ФИО Преподавателя</label><input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} /></div>
             <div className="form-group"><label>Макс. часов в неделю</label><input type="number" min="1" max="40" value={teacherHours} onChange={(e) => setTeacherHours(Number(e.target.value))} /></div>
             <button className="btn-save" onClick={handleSaveTeacher}>➕ Добавить в штат</button>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="tab-content">
          {!analytics ? (
            <div className="card"><p style={{fontSize: '1.2em', color: '#f39c12'}}>⚠️ Сгенерируйте расписание, или выберите день, где есть занятия.</p></div>
          ) : (
            <>
              {/* ПАНЕЛЬ ФИЛЬТРА ДЛЯ АНАЛИТИКИ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #444' }}>
                <h2 style={{margin: 0, color: '#fff'}}>Умный Дашборд</h2>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <label style={{color: '#aaa', fontWeight: 'bold'}}>📅 Анализ за:</label>
                  <select value={analyticsDay} onChange={(e) => setAnalyticsDay(e.target.value)} style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555', fontSize: '1.1em' }}>
                    <option value="Все дни">Вся неделя</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* УМНЫЕ АЛЕРТЫ */}
              {(analytics.overloadedTeachers.length > 0 || analytics.chokedRooms.length > 0) && (
                <div style={{background: '#4a1111', border: '1px solid #e74c3c', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left'}}>
                  <h3 style={{color: '#ff6b6b', marginTop: 0}}>🚨 Внимание: Найдены "Узкие места" (Bottlenecks)</h3>
                  <ul style={{color: '#ddd', margin: 0, paddingLeft: '20px'}}>
                    {analytics.overloadedTeachers.map(t => (
                      <li key={t.teacher}>Преподаватель <b>{t.teacher}</b> перегружен: <b>{t.count}</b> пар (Ставка: {t.max}).</li>
                    ))}
                    {analytics.chokedRooms.map(r => (
                      <li key={r.room}>Аудитория <b>{r.room}</b> работает на износ (Загрузка {r.percent}%).</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="dashboard-grid">
                <div className="stat-card"><h3>Уникальных пар (Часов)</h3><div className="stat-value">{analytics.totalRealClasses}</div></div>
                <div className="stat-card"><h3>Задействовано групп</h3><div className="stat-value">{analytics.activeGroupsCount}</div></div>
                <div className="stat-card"><h3>Работает преподавателей</h3><div className="stat-value">{analytics.activeTeachersCount}</div></div>
              </div>

              <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                
                <div className="analytics-section" style={{flex: '1', minWidth: '300px'}}>
                  <h3 style={{color: '#4db6ac', borderBottom: '1px solid #444', paddingBottom: '10px', marginTop: 0}}>Прогноз занятости аудиторий</h3>
                  {analytics.roomOccupancy.map(room => (
                    <div className="list-stat-item" key={room.room}>
                      <div className="stat-header"><span>🚪 {room.room}</span><span style={{color: '#888'}}>{room.count} из {analytics.MAX_SLOTS} ({room.percent}%)</span></div>
                      <div className="progress-bar-container"><div className={`progress-bar-fill ${room.percent >= 90 ? 'high' : room.percent > 60 ? 'medium' : ''}`} style={{width: `${room.percent}%`}}></div></div>
                    </div>
                  ))}
                </div>

                <div className="analytics-section" style={{flex: '1', minWidth: '300px'}}>
                  <h3 style={{color: '#4db6ac', borderBottom: '1px solid #444', paddingBottom: '10px', marginTop: 0}}>Нагрузка преподавателей (отн. ставки)</h3>
                  {analytics.teacherLoad.map(teacher => (
                    <div className="list-stat-item" key={teacher.teacher}>
                      <div className="stat-header"><span>👨‍🏫 {teacher.teacher}</span>
                        <span style={{color: teacher.isOverloaded ? '#e74c3c' : '#f39c12'}}>
                          {teacher.count} / {teacher.max} {teacher.isOverloaded ? '⚠️' : ''}
                        </span>
                      </div>
                      <div className="progress-bar-container" style={{height: '6px', background: '#222'}}>
                        <div className={`progress-bar-fill ${teacher.isOverloaded ? 'high' : ''}`} style={{width: `${Math.min(100, teacher.percent)}%`, backgroundColor: teacher.isOverloaded ? '#e74c3c' : '#3498db'}}></div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default App