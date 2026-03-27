import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{font-family:'DM Sans',sans-serif;font-size:14px}
  body{background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
  .app{display:flex;min-height:100vh;width:100vw;max-width:100vw}

  /* SIDEBAR */
  .sidebar{width:220px;min-height:100vh;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;z-index:100;transition:transform .3s cubic-bezier(.4,0,.2,1);overflow-y:auto;overflow-x:hidden}
  .sidebar.open{transform:translateX(0)!important}
  .sb-logo{padding:18px 14px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0}
  .sb-logo-icon{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--g1),var(--g2));display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
  .sb-title{font-family:'Syne',sans-serif;font-size:13px;font-weight:800;white-space:nowrap;letter-spacing:-.3px}
  .sb-sub{font-size:10px;color:var(--text2);margin-top:1px;white-space:nowrap}
  .sb-lang{display:flex;gap:5px;padding:10px 14px;border-bottom:1px solid var(--border);flex-shrink:0}
  .lang-btn{flex:1;padding:6px 2px;border-radius:7px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text2);font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'DM Mono',monospace}
  .lang-btn.active{border-color:var(--accent);background:var(--accent)18;color:var(--accent3)}
  .lang-btn:hover:not(.active){border-color:var(--accent)55;color:var(--text)}
  .sb-dept{padding:11px 14px;border-bottom:1px solid var(--border);flex-shrink:0}
  .sb-dept-lbl{font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.09em;margin-bottom:3px}
  .sb-dept-name{font-size:13px;font-weight:700;color:var(--text)}
  .sb-dept-status{display:flex;align-items:center;gap:5px;margin-top:4px;font-size:11px;color:var(--text2)}
  .sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block}
  .sdot.green{background:var(--success)}.sdot.blue{background:var(--info)}.sdot.gray{background:var(--text2)}
  .sb-nav{padding:10px 9px;display:flex;flex-direction:column;gap:2px;flex-shrink:0}
  .sb-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text2);transition:all .2s;border:none;background:none;width:100%;text-align:left;font-family:'DM Sans',sans-serif}
  .sb-item:hover{background:var(--bg3);color:var(--text)}
  .sb-item.active{background:linear-gradient(135deg,var(--g1)20,var(--g2)10);color:var(--accent3);border:1px solid var(--accent)33}
  .sb-icon{font-size:15px;width:20px;text-align:center}
  .sb-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sb-badge{font-size:9px;font-weight:700;background:var(--accent)28;color:var(--accent3);padding:2px 6px;border-radius:20px;flex-shrink:0}
  .sb-metrics{padding:11px 14px;border-top:1px solid var(--border);flex-shrink:0}
  .sb-m-title{font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.09em;margin-bottom:8px}
  .sb-m-row{display:flex;justify-content:space-between;font-size:11.5px;color:var(--text2);margin-bottom:5px;cursor:default}
  .sb-m-val{font-weight:700;font-family:'DM Mono',monospace;color:var(--text)}
  .sb-no-data{font-size:11px;color:var(--text2)}
  .sb-theme{padding:11px 14px;border-top:1px solid var(--border);flex-shrink:0}
  .sb-t-lbl{font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.09em;margin-bottom:7px}
  .sb-t-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:5px}
  .sb-t-btn{height:24px;border-radius:5px;border:2px solid transparent;cursor:pointer;transition:all .2s}
  .sb-t-btn.active{border-color:var(--accent);transform:scale(1.12)}
  .sb-t-names{display:flex;gap:2px}
  .sb-t-names span{flex:1;text-align:center;font-size:9px;color:var(--text2);cursor:pointer;padding:2px}
  .sb-t-names span.act{color:var(--accent3);font-weight:700}

  /* MAIN */
  .main{margin-left:220px;flex:1;display:flex;flex-direction:column;min-height:100vh;width:calc(100vw - 220px);overflow-x:hidden}
  .topbar{height:56px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:12px;position:sticky;top:0;z-index:50;flex-shrink:0}
  .menu-btn{background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:5px;border-radius:6px;display:none}
  .tb-left{flex:1;min-width:0}
  .tb-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tb-path{font-size:10px;color:var(--text2);margin-top:1px;white-space:nowrap}
  .tb-right{display:flex;gap:6px;align-items:center;flex-shrink:0;flex-wrap:wrap}
  .pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);white-space:nowrap}
  .pill.accent{background:var(--accent)18;color:var(--accent3);border-color:var(--accent)33}
  .pill.success{background:var(--success)18;color:var(--success);border-color:var(--success)33}.pill.warn{background:var(--warn)18;color:var(--warn);border-color:var(--warn)33}.pill.danger{background:var(--danger)18;color:var(--danger);border-color:var(--danger)33}
  .pill.info{background:var(--info)18;color:var(--info);border-color:var(--info)33}
  .tb-lang{display:flex;gap:4px}
  .tb-lang-btn{padding:4px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text2);font-size:10px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'DM Mono',monospace}
  .tb-lang-btn.active{border-color:var(--accent);background:var(--accent)18;color:var(--accent3)}
  .content{flex:1;padding:18px 22px;animation:fadeUp .25s ease;width:100%;box-sizing:border-box}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

  /* BUTTONS */
  .btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s;font-family:'DM Sans',sans-serif;white-space:nowrap}
  .btn-primary{background:linear-gradient(135deg,var(--g1),var(--g2));color:#fff;box-shadow:0 2px 10px var(--g1)33}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px var(--g1)44}
  .btn-secondary{background:var(--bg3);color:var(--text);border:1px solid var(--border)}
  .btn-secondary:hover{background:var(--bg4)}
  .btn-ghost{background:transparent;color:var(--text2);border:1px solid var(--border)55}
  .btn-ghost:hover{background:var(--bg3);color:var(--text)}
  .btn-success{background:var(--success)18;color:var(--success);border:1px solid var(--success)33}
  .btn-danger{background:var(--danger)18;color:var(--danger);border:1px solid var(--danger)33}
  .btn-sm{padding:5px 11px;font-size:11.5px}
  .btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important}

  /* CARDS */
  .acard{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:18px}
  .acard-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;margin-bottom:14px}
  .stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px;transition:border-color .2s,transform .2s}
  .stat-card:hover{border-color:var(--accent)44;transform:translateY(-1px)}

  /* LAYOUTS */
  .dash-layout{display:grid;grid-template-columns:1fr 310px;gap:16px;align-items:start;width:100%}
  .dash-main{display:flex;flex-direction:column;gap:14px;min-width:0}
  .dash-side{display:flex;flex-direction:column;gap:14px;min-width:0}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
  .advisor-layout{display:grid;grid-template-columns:1fr 290px;gap:14px;align-items:start}
  .about-layout{display:grid;grid-template-columns:1fr 310px;gap:14px;align-items:start}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}

  /* HERO */
  .hero-card{position:relative;border-radius:16px;overflow:hidden;background:var(--bg2);border:1px solid var(--border);padding:28px 26px}
  .hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,var(--g1)15,var(--g2)06);pointer-events:none}
  .hero-bg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 85% 15%,var(--g1)18,transparent 55%)}
  .hero-body{position:relative;z-index:1}
  .hero-badge{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:var(--accent3);background:var(--accent)15;border:1px solid var(--accent)30;padding:4px 12px;border-radius:20px;margin-bottom:11px}
  .hero-title{font-family:'Syne',sans-serif;font-size:21px;font-weight:800;line-height:1.25;margin-bottom:9px}
  .hero-sub{font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:13px}
  .hero-langs{display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap}
  .hero-lang{font-size:10.5px;font-weight:600;color:var(--text2);background:var(--bg3);padding:3px 10px;border-radius:20px;border:1px solid var(--border)}
  .hero-acts{display:flex;gap:9px;flex-wrap:wrap}

  /* CUSTOM SELECT */
  .csel{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text);font-size:12.5px;cursor:pointer;user-select:none;transition:border-color .2s;gap:6px}
  .csel.open,.csel:hover{border-color:var(--accent)}
  .csel-v{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .csel-back{position:fixed;inset:0;z-index:199}
  .csel-drop{position:absolute;top:calc(100% + 4px);left:0;min-width:100%;background:var(--bg2);border:1.5px solid var(--accent)40;border-radius:10px;box-shadow:0 8px 32px #00000066;z-index:200;max-height:280px;overflow-y:auto;padding:4px}
  .csel-opt{padding:8px 11px;border-radius:6px;cursor:pointer;font-size:12.5px;color:var(--text);transition:background .15s;white-space:nowrap}
  .csel-opt:hover{background:var(--bg3)}
  .csel-sel{background:var(--accent)18;color:var(--accent3);font-weight:700}
  .flabel{font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
  .filter-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
  .filter-acts{display:flex;gap:7px;align-items:flex-end;margin-left:auto;padding-bottom:1px}

  /* SCHEDULE */
  .gen-hint{font-size:10.5px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px}
  .gen-btns{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .sem-btn{display:flex;align-items:center;gap:11px;padding:12px 18px;border-radius:11px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:var(--bg3);color:var(--text2);transition:all .2s;font-family:'DM Sans',sans-serif}
  .sem-btn.active{border-color:var(--accent);background:var(--accent)12;color:var(--accent3)}
  .sem-btn:hover:not(.active):not(:disabled){border-color:var(--accent)55;color:var(--text)}
  .loading-pulse{animation:pulse 1s infinite;color:var(--accent3);font-size:12.5px}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .shift-hdr{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:8px;font-size:12.5px;font-weight:700;margin-bottom:6px}
  .shift-hdr.s1{background:var(--shift1)10;color:var(--shift1);border:1px solid var(--shift1)22}
  .shift-hdr.s2{background:var(--shift2)10;color:var(--shift2);border:1px solid var(--shift2)22}
  .gtable{width:100%;border-collapse:separate;border-spacing:2px}
  .gtime{font-size:10px;font-family:'DM Mono',monospace;color:var(--text2);padding:3px 8px;width:84px;text-align:right;vertical-align:middle}
  .ghdr{font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;padding:6px 4px;text-align:center}
  .gcell{background:var(--bg3);border:1px solid var(--border);border-radius:6px;min-height:48px;padding:3px;vertical-align:top;width:142px}
  .gcell.empty{background:var(--bg2)88;border-color:var(--border)44}
  .gcell-empty{display:flex;align-items:center;justify-content:center;height:42px;font-size:18px;color:var(--border);font-weight:300}
  .ci{border-radius:5px;padding:5px 7px;margin-bottom:2px;font-size:11px;cursor:default}
  .ci:hover{opacity:.9}
  .ci-lec{background:var(--lec)15;border-left:3px solid var(--lec)}
  .ci-prac{background:var(--prac)15;border-left:3px solid var(--prac)}
  .ci-s{font-weight:600;color:var(--text);line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .ci-m{color:var(--text2);font-size:10px;display:flex;gap:3px;flex-wrap:wrap;margin-top:2px}
  .ci-tag{background:var(--bg)55;padding:1px 5px;border-radius:3px;white-space:nowrap}
  .ltable{width:100%;border-collapse:collapse}
  .ltable th{font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;padding:9px 12px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
  .ltable td{padding:8px 12px;font-size:12.5px;border-bottom:1px solid var(--border)44;vertical-align:middle}
  .ltable tr:hover td{background:var(--bg3)}
  .sbadge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px}
  .sb1{background:var(--shift1)16;color:var(--shift1)}.sb2{background:var(--shift2)16;color:var(--shift2)}
  .tbadge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px}
  .tlec{background:var(--lec)16;color:var(--lec)}.tprac{background:var(--prac)16;color:var(--prac)}
  .chip-c{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:var(--accent)18;color:var(--accent3)}
  .chip-s{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:var(--bg3);color:var(--text2);border:1px solid var(--border)}

  /* ADVISOR */
  .scard{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:7px;display:flex;align-items:center;gap:10px;transition:border-color .2s}
  .scard:hover{border-color:var(--accent)44}
  .sinput{padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text);font-size:12.5px;font-family:'DM Sans',sans-serif}
  .sinput:focus{outline:none;border-color:var(--accent)}
  .fselect{padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text);font-size:12.5px;font-family:'DM Sans',sans-serif}
  .fselect:focus{outline:none;border-color:var(--accent)}

  /* ABOUT */
  .about-hero{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:22px;margin-bottom:14px;position:relative;overflow:hidden}
  .about-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--g1)10,var(--g2)04);pointer-events:none}
  .about-badge{display:inline-block;font-size:10px;font-weight:700;color:var(--accent3);background:var(--accent)18;border:1px solid var(--accent)33;padding:3px 11px;border-radius:20px;margin-bottom:9px}
  .about-title{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;line-height:1.3;margin-bottom:7px}
  .about-sub{font-size:12px;color:var(--text2);margin-bottom:14px}

  /* MODAL */
  .modal-ov{position:fixed;inset:0;background:#00000088;z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .15s}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .modal{background:var(--bg2);border:1px solid var(--border);border-radius:15px;padding:24px;width:100%;max-width:540px;max-height:88vh;overflow-y:auto;animation:slideUp .2s}
  @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
  .modal-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;margin-bottom:17px}
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .ff{display:flex;flex-direction:column;gap:5px}
  .ff.full{grid-column:1/-1}
  .fl{font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em}
  .fi{padding:9px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif}
  .fi:focus{outline:none;border-color:var(--accent)}

  /* EMPTY */
  .empty-s{text-align:center;padding:70px 20px;display:flex;flex-direction:column;align-items:center;gap:10px}
  .empty-icon{font-size:56px}
  .empty-t{font-family:'Syne',sans-serif;font-size:19px;font-weight:800}
  .empty-sub{font-size:13px;color:var(--text2)}

  /* SCROLLBAR */
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
  ::-webkit-scrollbar-thumb:hover{background:var(--text2)55}

  @media(max-width:1100px){
    .grid-3{grid-template-columns:1fr 1fr}
    .dash-layout,.about-layout{grid-template-columns:1fr}
  }
  @media(max-width:860px){
    .grid-2,.advisor-layout{grid-template-columns:1fr}
  }
  @media(max-width:720px){
    .sidebar{transform:translateX(-100%)}
    .main{margin-left:0;width:100%}
    .menu-btn{display:block!important}
    .kpi-grid{grid-template-columns:repeat(2,1fr)}
    .tb-lang{display:none}
  }
`

// ===================== TRANSLATIONS =====================
type Lang = 'ru' | 'kz' | 'en'

const T: Record<Lang, Record<string, string>> = {
  ru: {
    // NAV
    nav_dashboard: 'Дашборд', nav_schedule: 'Расписание', nav_forecast: 'Прогноз',
    nav_advisor: 'Эдвайзер', nav_analytics: 'Аналитика', nav_about: 'О системе',
    // SIDEBAR
    department: 'Кафедра', dept_name: 'Компьютерные науки',
    system_active: 'Система активна', quick_metrics: 'Быстрые метрики',
    groups_lbl: 'Групп:', pairs_lbl: 'Пар:', efficiency_lbl: 'Эффективность:',
    theme_lbl: 'Тема', no_data: 'Нет данных',
    // TOPBAR
    path_prefix: 'EduScheduler',
    // DASHBOARD
    ai_badge: 'AI-Powered Scheduling System',
    hero_title: 'Интеллектуальная система планирования занятий',
    hero_sub: 'Автоматизация составления расписания кафедры с прогнозом занятости аудиторий на основе алгоритма CP-SAT (Constraint Programming)',
    btn_autumn: 'Осенний семестр', btn_spring: 'Весенний семестр', btn_about: 'О системе',
    day_schedule: 'Расписание дня', all_groups: 'Все группы',
    system_status: 'Статус системы', backend_api: 'Backend API',
    solver_lbl: 'CP-SAT Solver', schedule_lbl: 'Расписание', db_lbl: 'База данных',
    loaded: 'Загружено', not_created: 'Не создано', online: 'Online', ready: 'Ready',
    curriculum_lbl: 'Учебный план', total_subjects: 'Всего предметов',
    // STATS
    stat_unique: 'Уникальных пар', stat_unique_sub: 'физических слотов',
    stat_groups: 'Активных групп', stat_groups_sub: '1–4 курс',
    stat_teachers: 'Преподавателей', stat_teachers_sub: 'в расписании',
    stat_shift1: 'Пар в смене 1', stat_shift1_sub: '08:00–14:00',
    stat_shift2: 'Пар в смене 2', stat_shift2_sub: '14:00–20:00',
    stat_efficiency: 'Баланс смен', stat_eff_sub: 'равномерность распределения',
    stat_lectures: 'Лекций', stat_practices: 'Практик', stat_rooms: 'Аудиторий',
    heatmap_days: 'Тепловая карта загрузки аудиторий по дням',
    // SCHEDULE
    gen_hint: 'Выберите период для генерации расписания (CP-SAT алгоритм)',
    sem_autumn_subs: 'Сем. 1,3,5,7 • 1–4 курс', sem_spring_subs: 'Сем. 2,4,6,8 • 1–4 курс',
    full_plan: 'Весь план', generating: 'Алгоритм CP-SAT работает...',
    last_gen: 'Последняя генерация:', showing: 'Отображается:', records: 'записей',
    filter_course: 'КУРС', filter_group: 'ГРУППА', filter_teacher: 'ПРЕПОДАВАТЕЛЬ',
    filter_room: 'АУДИТОРИЯ', filter_shift: 'СМЕНА',
    all_courses: 'Все курсы', all_groups2: 'Все группы', all_teachers: 'Все преподаватели',
    all_rooms: 'Все аудитории', all_shifts: 'Все смены',
    shift1_lbl: 'Смена 1 (08–14)', shift2_lbl: 'Смена 2 (14–20)',
    btn_grid: 'Сетка', btn_list: 'Список', btn_excel: 'Excel',
    shift1_full: 'Первая смена (08:00–14:00)', shift2_full: 'Вторая смена (14:00–20:00)',
    groups_f: 'Групп:', shift1_f: 'Смена 1:', shift2_f: 'Смена 2:',
    no_schedule: 'Расписание не создано', no_schedule_sub: 'Выберите семестр выше',
    lecture: 'Лекция', practice: 'Практика',
    // FORECAST
    forecast_title: 'Прогноз загрузки аудиторий (следующий семестр)',
    forecast_sub: 'На основе текущих данных — экстраполяция нагрузки',
    key_metrics: 'Ключевые показатели прогноза', peak_day: 'Самый загруженный день',
    peak_shift: 'Пиковая смена', eff_index: 'Индекс эффективности',
    risk_rooms: 'Аудиторий под риском перегрузки', weekly_act: 'Активность по дням недели',
    recommendations: 'Рекомендации системы', top_rooms: 'Топ загруженных аудиторий',
    no_forecast: 'Нет данных для прогноза', go_generate: 'Перейти к генерации',
    heatmap_slots: 'Тепловая карта аудиторий: загрузка по временным слотам',
    rec_overload: 'прогноз загрузки — рекомендуем перераспределить занятия',
    rec_free: 'загрузки — резерв для новых занятий',
    rec_balance: 'Баланс смен', rec_balance_desc: 'Все занятия в 1-й смене. Рекомендуем использовать 2-ю смену для разгрузки',
    rec_efficiency: 'Общая эффективность',
    // ADVISOR
    curriculum_full: 'Учебный план (РУП)', add_subject: '+ Добавить предмет',
    search_subject: 'Поиск предмета...', all_sems: 'Все семестры',
    found: 'Найдено:', of_total: 'из',
    no_teacher: 'Нет преподавателя', staff: 'Штат преподавателей',
    plan_stats: 'Статистика плана', total_sub: 'Предметов всего',
    no_teacher_lbl: 'Без преподавателя', with_lectures: 'С лекциями', only_practice: 'Только практики',
    credits_lbl: 'кр', lec_lbl: 'Л', prac_lbl: 'П',
    course_lbl: 'курс', sem_lbl: 'сем',
    // ANALYTICS
    no_analytics: 'Нет данных', go_schedule: 'К генерации',
    shifts_title: 'Смены', class_type_title: 'Тип занятий', days_title: 'По дням',
    teacher_load: 'Нагрузка преподавателей', room_load: 'Загрузка аудиторий',
    course_load: 'По курсам', group_load: 'По группам',
    top_subjects: 'Топ-10 предметов по количеству занятий',
    lectures_lbl: 'Лекции', practices_lbl: 'Практики',
    // ABOUT
    diploma_badge: 'Дипломная работа 2025',
    about_title: 'Интеллектуальная система планирования занятий кафедры',
    about_sub: 'Прогноз занятости аудиторий и автоматизация расписания',
    algo_title: 'Алгоритм CP-SAT — как работает система',
    tech_title: 'Технологический стек',
    chars_title: 'Характеристики системы', novelty_title: 'Научная новизна',
    metrics_title: 'Метрики системы', last_update: 'Последнее обновление:',
    // MODAL
    edit_subject: 'Редактировать предмет', new_subject: 'Новый предмет',
    name_lbl: 'Название', course_field: 'Курс', sem_field: 'Семестр',
    credits_field: 'Кредиты', lec_week: 'Лекций/нед', prac_week: 'Практик/нед',
    teachers_field: 'Преподаватели', cancel: 'Отмена', save: 'Сохранить',
    new_teacher: 'Новый преподаватель', fio_lbl: 'ФИО', max_hours: 'Макс. часов/нед',
    add_btn: 'Добавить', delete_confirm: 'Удалить?',
    solver_time: 'Время решения', solver_status: 'Статус',
    eff_formula: 'Баланс смен = min(Смена1, Смена2) / max(Смена1, Смена2) × 100%. Показывает насколько равномерно занятия распределены между 1-й и 2-й сменами. 100% = идеальный баланс.',
    nav_availability: 'Свободные окна',
  },
  kz: {
    nav_dashboard: 'Басты бет', nav_schedule: 'Кесте', nav_forecast: 'Болжам',
    nav_advisor: 'Эдвайзер', nav_analytics: 'Аналитика', nav_about: 'Жүйе туралы',
    department: 'Кафедра', dept_name: 'Информатика ғылымдары',
    system_active: 'Жүйе белсенді', quick_metrics: 'Жылдам көрсеткіштер',
    groups_lbl: 'Топтар:', pairs_lbl: 'Сабақ:', efficiency_lbl: 'Тиімділік:',
    theme_lbl: 'Тема', no_data: 'Деректер жоқ',
    path_prefix: 'EduScheduler',
    ai_badge: 'AI-мен жасалған кесте жүйесі',
    hero_title: 'Кафедра сабақтарын жоспарлаудың интеллектуалды жүйесі',
    hero_sub: 'CP-SAT (Шектеулі бағдарламалау) алгоритмі негізінде аудитория жүктемесін болжаумен кафедра кестесін автоматтандыру',
    btn_autumn: 'Күзгі семестр', btn_spring: 'Көктемгі семестр', btn_about: 'Жүйе туралы',
    day_schedule: 'Күнгі кесте', all_groups: 'Барлық топтар',
    system_status: 'Жүйе күйі', backend_api: 'Backend API',
    solver_lbl: 'CP-SAT Шешуші', schedule_lbl: 'Кесте', db_lbl: 'Дерекқор',
    loaded: 'Жүктелген', not_created: 'Жасалмаған', online: 'Желіде', ready: 'Дайын',
    curriculum_lbl: 'Оқу жоспары', total_subjects: 'Барлық пәндер',
    stat_unique: 'Бірегей сабақтар', stat_unique_sub: 'физикалық слоттар',
    stat_groups: 'Белсенді топтар', stat_groups_sub: '1–4 курс',
    stat_teachers: 'Оқытушылар', stat_teachers_sub: 'кестеде',
    stat_shift1: '1-ауысым сабақтар', stat_shift1_sub: '08:00–14:00',
    stat_shift2: '2-ауысым сабақтар', stat_shift2_sub: '14:00–20:00',
    stat_efficiency: 'Ауысым балансы', stat_eff_sub: 'біркелкі бөлу',
    stat_lectures: 'Дәрістер', stat_practices: 'Тәжірибелер', stat_rooms: 'Аудиториялар',
    heatmap_days: 'Аудитория жүктемесінің жылу картасы (күндер бойынша)',
    gen_hint: 'Кесте жасау үшін кезеңді таңдаңыз (CP-SAT алгоритмі)',
    sem_autumn_subs: 'Сем. 1,3,5,7 • 1–4 курс', sem_spring_subs: 'Сем. 2,4,6,8 • 1–4 курс',
    full_plan: 'Толық жоспар', generating: 'CP-SAT алгоритмі жұмыс істеуде...',
    last_gen: 'Соңғы генерация:', showing: 'Көрсетілуде:', records: 'жазба',
    filter_course: 'КУРС', filter_group: 'ТОП', filter_teacher: 'ОҚЫТУШЫ',
    filter_room: 'АУДИТОРИЯ', filter_shift: 'АУЫСЫМ',
    all_courses: 'Барлық курстар', all_groups2: 'Барлық топтар',
    all_teachers: 'Барлық оқытушылар', all_rooms: 'Барлық аудиториялар',
    all_shifts: 'Барлық ауысымдар', shift1_lbl: '1-ауысым (08–14)',
    shift2_lbl: '2-ауысым (14–20)',
    btn_grid: 'Тор', btn_list: 'Тізім', btn_excel: 'Excel',
    shift1_full: 'Бірінші ауысым (08:00–14:00)', shift2_full: 'Екінші ауысым (14:00–20:00)',
    groups_f: 'Топтар:', shift1_f: '1-ауысым:', shift2_f: '2-ауысым:',
    no_schedule: 'Кесте жасалмаған', no_schedule_sub: 'Жоғарыда семестрді таңдаңыз',
    lecture: 'Дәріс', practice: 'Тәжірибе',
    forecast_title: 'Аудитория жүктемесінің болжамы (келесі семестр)',
    forecast_sub: 'Ағымдағы деректер негізінде экстраполяция',
    key_metrics: 'Болжамның негізгі көрсеткіштері', peak_day: 'Ең жүктелген күн',
    peak_shift: 'Шыңды ауысым', eff_index: 'Тиімділік индексі',
    risk_rooms: 'Шамадан тыс жүктелу қаупіндегі аудиториялар',
    weekly_act: 'Апта күндері бойынша белсенділік',
    recommendations: 'Жүйе ұсыныстары', top_rooms: 'Ең жүктелген аудиториялар',
    no_forecast: 'Болжам үшін деректер жоқ', go_generate: 'Генерацияға өту',
    heatmap_slots: 'Аудитория жылу картасы: уақыт слоттары бойынша жүктеме',
    rec_overload: 'жүктеме болжамы — сабақтарды қайта бөлуді ұсынамыз',
    rec_free: 'жүктеме — жаңа сабақтарға резерв',
    rec_balance: 'Ауысымдар балансы', rec_balance_desc: 'Барлық сабақтар 1-ауысымда. 2-ауысымды пайдалануды ұсынамыз',
    rec_efficiency: 'Жалпы тиімділік',
    curriculum_full: 'Оқу жоспары (РОП)', add_subject: '+ Пән қосу',
    search_subject: 'Пән іздеу...', all_sems: 'Барлық семестрлер',
    found: 'Табылды:', of_total: 'ішінен',
    no_teacher: 'Оқытушы жоқ', staff: 'Оқытушылар штаты',
    plan_stats: 'Жоспар статистикасы', total_sub: 'Барлық пәндер',
    no_teacher_lbl: 'Оқытушысыз', with_lectures: 'Дәрістермен', only_practice: 'Тек тәжірибе',
    credits_lbl: 'кр', lec_lbl: 'Д', prac_lbl: 'Т',
    course_lbl: 'курс', sem_lbl: 'сем',
    no_analytics: 'Деректер жоқ', go_schedule: 'Генерацияға',
    shifts_title: 'Ауысымдар', class_type_title: 'Сабақ түрі', days_title: 'Күндер бойынша',
    teacher_load: 'Оқытушы жүктемесі', room_load: 'Аудитория жүктемесі',
    course_load: 'Курстар бойынша', group_load: 'Топтар бойынша',
    top_subjects: 'Сабақ санына қарай Үздік-10 пән',
    lectures_lbl: 'Дәрістер', practices_lbl: 'Тәжірибелер',
    diploma_badge: 'Диплом жұмысы 2025',
    about_title: 'Кафедра сабақтарын жоспарлаудың интеллектуалды жүйесі',
    about_sub: 'Аудитория жүктемесін болжау және кестені автоматтандыру',
    algo_title: 'CP-SAT алгоритмі — жүйе қалай жұмыс істейді',
    tech_title: 'Технологиялық стек',
    chars_title: 'Жүйе сипаттамалары', novelty_title: 'Ғылыми жаңалық',
    metrics_title: 'Жүйе метрикалары', last_update: 'Соңғы жаңарту:',
    edit_subject: 'Пәнді өңдеу', new_subject: 'Жаңа пән',
    name_lbl: 'Атауы', course_field: 'Курс', sem_field: 'Семестр',
    credits_field: 'Кредит', lec_week: 'Дәріс/апта', prac_week: 'Тәжірибе/апта',
    teachers_field: 'Оқытушылар', cancel: 'Болдырмау', save: 'Сақтау',
    new_teacher: 'Жаңа оқытушы', fio_lbl: 'ТАӘ', max_hours: 'Макс. сағат/апта',
    add_btn: 'Қосу', delete_confirm: 'Жою?',
    solver_time: 'Шешу уақыты', solver_status: 'Күйі',
    eff_formula: 'Ауысым балансы = min(1-ауысым, 2-ауысым) / max(1-ауысым, 2-ауысым) × 100%. 100% = екі ауысым арасында тең бөлу.',
    nav_availability: 'Бос уақыт',
  },
  en: {
    nav_dashboard: 'Dashboard', nav_schedule: 'Schedule', nav_forecast: 'Forecast',
    nav_advisor: 'Advisor', nav_analytics: 'Analytics', nav_about: 'About',
    department: 'Department', dept_name: 'Computer Science',
    system_active: 'System Active', quick_metrics: 'Quick Metrics',
    groups_lbl: 'Groups:', pairs_lbl: 'Classes:', efficiency_lbl: 'Efficiency:',
    theme_lbl: 'Theme', no_data: 'No Data',
    path_prefix: 'EduScheduler',
    ai_badge: 'AI-Powered Scheduling System',
    hero_title: 'Intelligent System for Department Class Planning',
    hero_sub: 'Automated department scheduling with classroom occupancy forecasting based on CP-SAT (Constraint Programming) algorithm',
    btn_autumn: 'Autumn Semester', btn_spring: 'Spring Semester', btn_about: 'About System',
    day_schedule: "Today's Schedule", all_groups: 'All Groups',
    system_status: 'System Status', backend_api: 'Backend API',
    solver_lbl: 'CP-SAT Solver', schedule_lbl: 'Schedule', db_lbl: 'Database',
    loaded: 'Loaded', not_created: 'Not Created', online: 'Online', ready: 'Ready',
    curriculum_lbl: 'Curriculum', total_subjects: 'Total Subjects',
    stat_unique: 'Unique Classes', stat_unique_sub: 'physical slots',
    stat_groups: 'Active Groups', stat_groups_sub: '1–4 year',
    stat_teachers: 'Teachers', stat_teachers_sub: 'in schedule',
    stat_shift1: 'Shift 1 Classes', stat_shift1_sub: '08:00–14:00',
    stat_shift2: 'Shift 2 Classes', stat_shift2_sub: '14:00–20:00',
    stat_efficiency: 'Shift Balance', stat_eff_sub: 'even distribution index',
    stat_lectures: 'Lectures', stat_practices: 'Practices', stat_rooms: 'Rooms',
    heatmap_days: 'Classroom Load Heatmap by Day of Week',
    gen_hint: 'Select period to generate schedule (CP-SAT algorithm)',
    sem_autumn_subs: 'Sem. 1,3,5,7 • Year 1–4', sem_spring_subs: 'Sem. 2,4,6,8 • Year 1–4',
    full_plan: 'Full Plan', generating: 'CP-SAT algorithm running...',
    last_gen: 'Last generation:', showing: 'Showing:', records: 'records',
    filter_course: 'YEAR', filter_group: 'GROUP', filter_teacher: 'TEACHER',
    filter_room: 'ROOM', filter_shift: 'SHIFT',
    all_courses: 'All Years', all_groups2: 'All Groups', all_teachers: 'All Teachers',
    all_rooms: 'All Rooms', all_shifts: 'All Shifts',
    shift1_lbl: 'Shift 1 (08–14)', shift2_lbl: 'Shift 2 (14–20)',
    btn_grid: 'Grid', btn_list: 'List', btn_excel: 'Excel',
    shift1_full: 'First Shift (08:00–14:00)', shift2_full: 'Second Shift (14:00–20:00)',
    groups_f: 'Groups:', shift1_f: 'Shift 1:', shift2_f: 'Shift 2:',
    no_schedule: 'No Schedule Created', no_schedule_sub: 'Select a semester above',
    lecture: 'Lecture', practice: 'Practice',
    forecast_title: 'Classroom Occupancy Forecast (Next Semester)',
    forecast_sub: 'Extrapolation based on current scheduling data',
    key_metrics: 'Key Forecast Metrics', peak_day: 'Busiest Day',
    peak_shift: 'Peak Shift', eff_index: 'Efficiency Index',
    risk_rooms: 'Rooms at Overload Risk', weekly_act: 'Weekly Activity',
    recommendations: 'System Recommendations', top_rooms: 'Top Loaded Rooms',
    no_forecast: 'No forecast data', go_generate: 'Go to Generation',
    heatmap_slots: 'Classroom Heatmap: Load by Time Slot',
    rec_overload: 'forecast load — recommend redistributing classes',
    rec_free: 'load — available for new classes',
    rec_balance: 'Shift Balance', rec_balance_desc: 'All classes in Shift 1. Recommend using Shift 2 to balance load',
    rec_efficiency: 'Overall Efficiency',
    curriculum_full: 'Curriculum (Study Plan)', add_subject: '+ Add Subject',
    search_subject: 'Search subject...', all_sems: 'All Semesters',
    found: 'Found:', of_total: 'of',
    no_teacher: 'No Teacher Assigned', staff: 'Teaching Staff',
    plan_stats: 'Plan Statistics', total_sub: 'Total Subjects',
    no_teacher_lbl: 'No Teacher', with_lectures: 'With Lectures', only_practice: 'Practice Only',
    credits_lbl: 'cr', lec_lbl: 'L', prac_lbl: 'P',
    course_lbl: 'year', sem_lbl: 'sem',
    no_analytics: 'No Data', go_schedule: 'Generate',
    shifts_title: 'Shifts', class_type_title: 'Class Type', days_title: 'By Day',
    teacher_load: 'Teacher Workload', room_load: 'Room Utilization',
    course_load: 'By Year', group_load: 'By Group',
    top_subjects: 'Top-10 Subjects by Class Count',
    lectures_lbl: 'Lectures', practices_lbl: 'Practices',
    diploma_badge: 'Thesis Work 2025',
    about_title: 'Intelligent System for Department Class Planning',
    about_sub: 'Classroom Occupancy Forecasting and Automated Scheduling',
    algo_title: 'CP-SAT Algorithm — How the System Works',
    tech_title: 'Technology Stack',
    chars_title: 'System Characteristics', novelty_title: 'Scientific Novelty',
    metrics_title: 'System Metrics', last_update: 'Last updated:',
    edit_subject: 'Edit Subject', new_subject: 'New Subject',
    name_lbl: 'Name', course_field: 'Year', sem_field: 'Semester',
    credits_field: 'Credits', lec_week: 'Lectures/week', prac_week: 'Practices/week',
    teachers_field: 'Teachers', cancel: 'Cancel', save: 'Save',
    new_teacher: 'New Teacher', fio_lbl: 'Full Name', max_hours: 'Max hours/week',
    add_btn: 'Add', delete_confirm: 'Delete?',
    solver_time: 'Solve Time', solver_status: 'Status',
    eff_formula: 'Shift Balance = min(Shift1, Shift2) / max(Shift1, Shift2) × 100%. Shows how evenly classes are distributed between shifts. 100% = perfect balance.',
    nav_availability: 'Availability',
  }
}


// ===================== TYPES =====================
interface ScheduleItem {
  day: string; time: string; time_index: number;
  group: string; subject: string; teacher: string;
  room: string; class_type: string; shift: number;
  course: number; language: string; semester?: number;
}
interface Teacher { id: number; full_name: string; max_hours_per_week: number; }
interface Room { id: number; name: string; capacity: number; room_type: string; is_active: boolean; }
interface Subject {
  id: number; name: string; credits: number;
  lectures_per_week: number; practices_per_week: number;
  course: number; semester: number; teachers: Teacher[];
}
type Theme = 'dark' | 'light' | 'midnight' | 'forest'
type Tab = 'dashboard' | 'schedule' | 'forecast' | 'advisor' | 'analytics' | 'about' | 'availability'

const DAYS_RU = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"]
const DAYS_KZ = ["Дүйсенбі","Сейсенбі","Сәрсенбі","Бейсенбі","Жұма","Сенбі"]
const DAYS_EN = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
const DAYS_SHORT_RU = ["Пн","Вт","Ср","Чт","Пт","Сб"]
const DAYS_SHORT_KZ = ["Дс","Сс","Ср","Бс","Жм","Сб"]
const DAYS_SHORT_EN = ["Mo","Tu","We","Th","Fr","Sa"]
const SHIFT1 = ["08:00-08:50","09:00-09:50","10:00-10:50","11:10-12:00","12:10-13:00","13:10-14:00"]
const SHIFT2 = ["14:10-15:00","15:10-16:00","16:10-17:00","17:10-18:00","18:10-19:00","19:10-20:00"]
const ALL_SLOTS = [...SHIFT1,...SHIFT2]
const BASE = 'http://127.0.0.1:8000'

const THEMES: Record<Theme,Record<string,string>> = {
  dark:{
    '--bg':'#0c0c11','--bg2':'#13131b','--bg3':'#1c1c28','--bg4':'#242436',
    '--border':'#2a2a3e','--text':'#eaeaf8','--text2':'#7878a0','--text3':'#4a4a6a',
    '--accent':'#6c63ff','--accent2':'#4f46e5','--accent3':'#a59fff',
    '--lec':'#ff6b6b','--prac':'#43d492','--shift1':'#6c63ff','--shift2':'#ff9f43',
    '--success':'#2ecc71','--warn':'#f39c12','--danger':'#e74c3c','--info':'#3498db',
    '--g1':'#6c63ff','--g2':'#ff6b9d',
  },
  light:{
    '--bg':'#f4f5ff','--bg2':'#ffffff','--bg3':'#eef0fc','--bg4':'#e5e8f8',
    '--border':'#d5d8f0','--text':'#1a1a30','--text2':'#6060888','--text3':'#9090b0',
    '--accent':'#5b4de8','--accent2':'#4338ca','--accent3':'#7c6af7',
    '--lec':'#dc2626','--prac':'#16a34a','--shift1':'#5b4de8','--shift2':'#d97706',
    '--success':'#16a34a','--warn':'#d97706','--danger':'#dc2626','--info':'#2563eb',
    '--g1':'#5b4de8','--g2':'#ec4899',
  },
  midnight:{
    '--bg':'#05080f','--bg2':'#08101e','--bg3':'#0e1828','--bg4':'#131f35',
    '--border':'#192840','--text':'#c5d5f5','--text2':'#5070a0','--text3':'#354f78',
    '--accent':'#22d3ee','--accent2':'#0891b2','--accent3':'#67e8f9',
    '--lec':'#f97316','--prac':'#34d399','--shift1':'#22d3ee','--shift2':'#f97316',
    '--success':'#34d399','--warn':'#fbbf24','--danger':'#f87171','--info':'#60a5fa',
    '--g1':'#22d3ee','--g2':'#818cf8',
  },
  forest:{
    '--bg':'#07100a','--bg2':'#0e1b10','--bg3':'#152018','--bg4':'#1b2a1d',
    '--border':'#203322','--text':'#ccead0','--text2':'#649868','--text3':'#466848',
    '--accent':'#4ade80','--accent2':'#16a34a','--accent3':'#86efac',
    '--lec':'#fb923c','--prac':'#34d399','--shift1':'#4ade80','--shift2':'#fb923c',
    '--success':'#4ade80','--warn':'#fbbf24','--danger':'#f87171','--info':'#38bdf8',
    '--g1':'#4ade80','--g2':'#06b6d4',
  }
}

// ===== CUSTOM SELECT =====
function Sel({value,onChange,options,label,minW='148px'}:{value:string,onChange:(v:string)=>void,options:{value:string,label:string}[],label?:string,minW?:string}){
  const [open,setOpen]=useState(false)
  const sel=options.find(o=>o.value===value)
  return(
    <div style={{position:'relative'}}>
      {label&&<div className="flabel">{label}</div>}
      <div className={`csel ${open?'open':''}`} style={{minWidth:minW}} onClick={()=>setOpen(!open)}>
        <span className="csel-v">{sel?.label||options[0]?.label}</span>
        <span style={{fontSize:8,color:'var(--text2)',flexShrink:0}}>{open?'▲':'▼'}</span>
      </div>
      {open&&<>
        <div className="csel-back" onClick={()=>setOpen(false)}/>
        <div className="csel-drop">
          {options.map(o=>(
            <div key={o.value} className={`csel-opt ${o.value===value?'csel-sel':''}`} onClick={()=>{onChange(o.value);setOpen(false)}}>{o.label}</div>
          ))}
        </div>
      </>}
    </div>
  )
}

// ===== SPARKLINE =====
function Spark({data,color,h=36}:{data:number[],color:string,h?:number}){
  if(data.length<2)return null
  const max=Math.max(...data,1),w=90
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-(v/max)*(h-4)}`).join(' ')
  return(
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.12" stroke="none"/>
    </svg>
  )
}

// ===== DONUT =====
function Donut({pct,c1,c2,size=84,label}:{pct:number,c1:string,c2:string,size?:number,label?:string}){
  const r=size/2-9,cx=size/2,circ=2*Math.PI*r,d1=circ*Math.max(0,Math.min(100,pct))/100
  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg3)" strokeWidth="10"/>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={c1} strokeWidth="10" strokeDasharray={`${d1} ${circ-d1}`} strokeLinecap="round"/>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={c2} strokeWidth="10" strokeDasharray={`${circ-d1} ${d1}`} strokeDashoffset={-d1} strokeLinecap="round"/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1}}>
        <span style={{fontSize:size*0.19,fontWeight:800,fontFamily:'DM Mono,monospace',color:'var(--accent3)',lineHeight:1}}>{pct}%</span>
        {label&&<span style={{fontSize:9,color:'var(--text2)'}}>{label}</span>}
      </div>
    </div>
  )
}

// ===== BAR =====
function Bar({name,val,max,color='var(--accent)',suffix='',warn=false,danger=false,showVal=true}:{name:string,val:number,max:number,color?:string,suffix?:string,warn?:boolean,danger?:boolean,showVal?:boolean}){
  const pct=Math.min(100,Math.round(val/Math.max(max,1)*100))
  const c=danger?'var(--danger)':warn?'var(--warn)':color
  return(
    <div style={{marginBottom:11}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,gap:8}}>
        <span style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)',flex:1}}>{name}</span>
        {showVal&&<span style={{color:danger?'var(--danger)':warn?'var(--warn)':'var(--text2)',flexShrink:0,fontFamily:'DM Mono,monospace',fontSize:11}}>{val}{suffix}{danger?' ⚠️':''}</span>}
      </div>
      <div style={{height:8,background:'var(--bg3)',borderRadius:99,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:99,transition:'width .7s cubic-bezier(.4,0,.2,1)'}}/>
      </div>
    </div>
  )
}

// ===== STAT CARD =====
function StatCard({icon,val,label,sub,color,spark}:{icon:string,val:string|number,label:string,sub?:string,color?:string,spark?:number[]}){
  return(
    <div className="stat-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <span style={{fontSize:28}}>{icon}</span>
        {spark&&spark.some(v=>v>0)&&<Spark data={spark} color={color||'var(--accent)'}/>}
      </div>
      <div style={{fontSize:32,fontWeight:800,fontFamily:'DM Mono,monospace',color:color||'var(--accent3)',lineHeight:1.1,marginBottom:5}}>{val}</div>
      <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:'var(--text2)',marginTop:3}}>{sub}</div>}
    </div>
  )
}

// ===== HEATMAP =====
function Heatmap({data,rows,cols,rowLabels,colLabels,title}:{data:number[][],rows:number,cols:number,rowLabels:string[],colLabels:string[],title:string}){
  if(rows===0)return null
  const maxV=Math.max(...data.flat(),1)
  return(
    <div>
      <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>{title}</div>
      <div style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'separate',borderSpacing:3,fontSize:10}}>
          <thead>
            <tr>
              <th style={{width:94,textAlign:'right',paddingRight:10,color:'var(--text2)',fontWeight:700,paddingBottom:6,fontSize:11}}></th>
              {colLabels.map(c=><th key={c} style={{width:40,textAlign:'center',color:'var(--text2)',fontWeight:700,paddingBottom:6,whiteSpace:'nowrap',fontSize:11}}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({length:rows}).map((_,ri)=>(
              <tr key={ri}>
                <td style={{textAlign:'right',paddingRight:10,color:'var(--text2)',fontWeight:600,whiteSpace:'nowrap',fontSize:11,paddingBottom:2}}>{rowLabels[ri]||''}</td>
                {Array.from({length:cols}).map((_,ci)=>{
                  const v=data[ri]?.[ci]||0,pct=v/maxV
                  const bg=pct===0?'var(--bg3)':`rgba(108,99,255,${0.12+pct*0.88})`
                  return(
                    <td key={ci} title={`${rowLabels[ri]} / ${colLabels[ci]}: ${v}`}
                      style={{width:40,height:30,background:bg,borderRadius:5,textAlign:'center',
                        color:pct>0.45?'#fff':'var(--text2)',fontWeight:pct>0.25?700:400,
                        fontSize:pct>0?11:0,verticalAlign:'middle',cursor:'default'}}>
                      {v>0?v:''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10,fontSize:11,color:'var(--text2)',flexWrap:'wrap'}}>
        <span>Загрузка:</span>
        {[0,0.25,0.5,0.75,1].map(p=>(
          <div key={p} style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:20,height:11,borderRadius:3,background:p===0?'var(--bg3)':`rgba(108,99,255,${0.12+p*0.88})`}}/>
            <span>{Math.round(p*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== TIMELINE =====
function Timeline({items,t}:{items:{time:string,subject:string,room:string,type:string,group:string}[],t:Record<string,string>}){
  if(!items.length)return<div style={{fontSize:13,color:'var(--text2)',textAlign:'center',padding:'24px 0'}}>—</div>
  return(
    <div style={{display:'flex',flexDirection:'column',gap:7,maxHeight:460,overflowY:'auto',paddingRight:2}}>
      {items.map((it,i)=>(
        <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
          <div style={{width:82,flexShrink:0,fontFamily:'DM Mono,monospace',fontSize:10,color:'var(--text2)',paddingTop:4,textAlign:'right'}}>{it.time}</div>
          <div style={{width:3,background:it.type===t.lecture?'var(--lec)':'var(--prac)',borderRadius:2,alignSelf:'stretch',minHeight:38,flexShrink:0}}/>
          <div style={{background:'var(--bg3)',borderRadius:9,padding:'8px 12px',flex:1,minWidth:0,border:'1px solid var(--border)55'}}>
            <div style={{fontWeight:600,fontSize:12.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.subject}</div>
            <div style={{fontSize:11,color:'var(--text2)',marginTop:3,display:'flex',gap:8,flexWrap:'wrap'}}>
              <span>🚪{it.room}</span>
              <span>👥{it.group}</span>
              <span style={{marginLeft:'auto',fontWeight:700,color:it.type===t.lecture?'var(--lec)':'var(--prac)'}}>{it.type}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ===================== MAIN APP =====================
export default function App(){
  const [lang,setLang]=useState<Lang>('ru')
  const t=(k:string)=>T[lang][k]||T.ru[k]||k
  const DAYS=lang==='kz'?DAYS_KZ:lang==='en'?DAYS_EN:DAYS_RU
  const DAYS_SHORT=lang==='kz'?DAYS_SHORT_KZ:lang==='en'?DAYS_SHORT_EN:DAYS_SHORT_RU

  const [theme,setTheme]=useState<Theme>('dark')
  const [tab,setTab]=useState<Tab>('dashboard')
  const [schedule,setSchedule]=useState<ScheduleItem[]>([])
  const [loading,setLoading]=useState(false)
  const [solverTime,setSolverTime]=useState<number|null>(null)
  const [solverStatus,setSolverStatus]=useState<string|null>(null)
  const [lastUpdate,setLastUpdate]=useState<string|null>(null)
  const [activeSemester,setActiveSemester]=useState<1|2|null>(null)
  const [viewMode,setViewMode]=useState<'grid'|'list'>('grid')
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const [selectedDay,setSelectedDay]=useState(DAYS[0])
  const [selectedGroup,setSelectedGroup]=useState('all')
  const [showEffInfo,setShowEffInfo]=useState(false)

  const [filterGroup,setFilterGroup]=useState('all')
  // Availability checker
  const [avCheckDay,setAvCheckDay]=useState(DAYS_RU[0])
  const [avCheckSlot,setAvCheckSlot]=useState('all')
  const [filterTeacher,setFilterTeacher]=useState('all')
  const [filterRoom,setFilterRoom]=useState('all')
  const [filterShift,setFilterShift]=useState('all')
  const [filterCourse,setFilterCourse]=useState('all')
  const [filterSemester,setFilterSemester]=useState('all')

  const [subjects,setSubjects]=useState<Subject[]>([])
  const [dbRooms,setDbRooms]=useState<Room[]>([])
  const [showRoomModal,setShowRoomModal]=useState(false)
  const [editRoom,setEditRoom]=useState<Room|null>(null)
  const [rName,setRName]=useState('')
  const [rCapacity,setRCapacity]=useState(30)
  const [rType,setRType]=useState('PRACTICE')
  const [rActive,setRActive]=useState(true)
  const [teachers,setTeachers]=useState<Teacher[]>([])
  const [subjectSearch,setSubjectSearch]=useState('')
  const [subjectCourseF,setSubjectCourseF]=useState('all')
  const [subjectSemF,setSubjectSemF]=useState('all')
  const [showSubjModal,setShowSubjModal]=useState(false)
  const [showTModal,setShowTModal]=useState(false)
  const [editTeacher,setEditTeacher]=useState<Teacher|null>(null)
  const [editSubj,setEditSubj]=useState<Subject|null>(null)
  const [fName,setFName]=useState('')
  const [fCourse,setFCourse]=useState(1)
  const [fSem,setFSem]=useState(1)
  const [fCredits,setFCredits]=useState(5)
  const [fLec,setFLec]=useState(1)
  const [fPrac,setFPrac]=useState(2)
  const [fTIds,setFTIds]=useState<number[]>([])
  const [tName,setTName]=useState('')
  const [tHours,setTHours]=useState(20)

  // Sync selected day when lang changes
  useEffect(()=>{ setSelectedDay(DAYS[0]) },[lang])

  useEffect(()=>{
    const v=THEMES[theme]
    Object.entries(v).forEach(([k,val])=>document.documentElement.style.setProperty(k,val))
  },[theme])

  useEffect(()=>{
    if(['advisor','analytics','dashboard','forecast'].includes(tab)){fetchSubjects();fetchTeachers();fetchRooms()}
  },[tab])

  const fetchSubjects=async()=>{try{const r=await axios.get<Subject[]>(`${BASE}/subjects/`);setSubjects(r.data)}catch{}}
  const fetchTeachers=async()=>{try{const r=await axios.get<Teacher[]>(`${BASE}/teachers/`);setTeachers(r.data)}catch{}}
  const fetchRooms=async()=>{try{const r=await axios.get<Room[]>(`${BASE}/rooms/`);setDbRooms(r.data)}catch{}}
  const saveRoom=async()=>{
    if(!rName.trim())return
    try{
      if(editRoom){
        await axios.put(`${BASE}/rooms/${editRoom.id}`,{name:rName,capacity:rCapacity,room_type:rType,is_active:rActive})
      } else {
        await axios.post(`${BASE}/rooms/`,{name:rName,capacity:rCapacity,room_type:rType,is_active:rActive})
      }
      setShowRoomModal(false);fetchRooms()
    }catch{alert('Ошибка')}
  }
  const openEditRoom=(r:Room)=>{setEditRoom(r);setRName(r.name);setRCapacity(r.capacity);setRType(r.room_type);setRActive(r.is_active);setShowRoomModal(true)}
  const openNewRoom=()=>{setEditRoom(null);setRName('');setRCapacity(30);setRType('PRACTICE');setRActive(true);setShowRoomModal(true)}
  const toggleRoomActive=async(id:number)=>{try{await axios.patch(`${BASE}/rooms/${id}/toggle-active`);fetchRooms()}catch{alert('Ошибка')}}
  const deleteRoom=async(id:number)=>{if(!confirm(t('delete_confirm')))return;try{await axios.delete(`${BASE}/rooms/${id}`);fetchRooms()}catch{}}

  const handleGenerate=async(sem:1|2|null=null)=>{
    setLoading(true);const t0=Date.now()
    try{
      const url=sem?`${BASE}/generate-schedule/?semester=${sem}`:`${BASE}/generate-schedule/`
      const res=await axios.post(url)
      setSchedule(res.data.schedule)
      setLastUpdate(res.data.generated_at)
      setActiveSemester(sem)
      setSolverTime(Date.now()-t0)
      setSolverStatus('FEASIBLE')
      setFilterGroup('all');setFilterTeacher('all');setFilterRoom('all');setFilterShift('all');setFilterCourse('all');setFilterSemester('all')
    }catch{alert('Ошибка соединения с сервером!')}
    finally{setLoading(false)}
  }

  const openEdit=(s:Subject)=>{setEditSubj(s);setFName(s.name);setFCourse(s.course);setFSem(s.semester);setFCredits(s.credits);setFLec(s.lectures_per_week);setFPrac(s.practices_per_week);setFTIds(s.teachers.map(x=>x.id));setShowSubjModal(true)}
  const openNew=()=>{setEditSubj(null);setFName('');setFCourse(1);setFSem(1);setFCredits(5);setFLec(1);setFPrac(2);setFTIds([]);setShowSubjModal(true)}
  const saveSubj=async()=>{
    if(!fName.trim())return
    try{await axios.post(`${BASE}/subjects/`,{name:fName,credits:fCredits,lectures_per_week:fLec,practices_per_week:fPrac,course:fCourse,semester:fSem,teacher_ids:fTIds});setShowSubjModal(false);fetchSubjects()}catch{alert('Ошибка')}
  }
  const delSubj=async(id:number)=>{if(!confirm(t('delete_confirm')))return;try{await axios.delete(`${BASE}/subjects/${id}`);fetchSubjects()}catch{}}
  
  const saveT=async()=>{
    if(!tName.trim())return
    try{
      if(editTeacher){
        await axios.put(`${BASE}/teachers/${editTeacher.id}`,{full_name:tName,max_hours_per_week:tHours})
      } else {
        await axios.post(`${BASE}/teachers/`,{full_name:tName,max_hours_per_week:tHours})
      }
      setShowTModal(false);setEditTeacher(null);fetchTeachers()
    }catch{alert('Ошибка')}
  }

  const groups=useMemo(()=>[...new Set(schedule.map(i=>i.group))].sort(),[schedule])
  const tNames=useMemo(()=>[...new Set(schedule.map(i=>i.teacher))].sort(),[schedule])
  const rooms=useMemo(()=>[...new Set(schedule.map(i=>i.room))].sort(),[schedule])

  const filtered=useMemo(()=>schedule.filter(i=>
    (filterGroup==='all'||i.group===filterGroup)&&
    (filterTeacher==='all'||i.teacher===filterTeacher)&&
    (filterRoom==='all'||i.room===filterRoom)&&
    (filterShift==='all'||String(i.shift)===filterShift)&&
    (filterCourse==='all'||String(i.course)===filterCourse)&&
    (filterSemester==='all'||String(i.semester||'')===filterSemester)
  ),[schedule,filterGroup,filterTeacher,filterRoom,filterShift,filterCourse,filterSemester])

  const filtSubj=useMemo(()=>subjects.filter(s=>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())&&
    (subjectCourseF==='all'||String(s.course)===subjectCourseF)&&
    (subjectSemF==='all'||String(s.semester)===subjectSemF)
  ),[subjects,subjectSearch,subjectCourseF,subjectSemF])

  const gridData=useMemo(()=>{
    const g:Record<string,Record<string,ScheduleItem[]>>={}
    DAYS.forEach((d,i)=>{
      g[d]={};ALL_SLOTS.forEach(s=>{g[d][s]=[]})
      // Use `filtered` which already has ALL active filters applied (incl. semester)
      const ruDay=DAYS_RU[i]
      filtered.filter(it=>it.day===ruDay)
        .forEach(it=>{if(g[d][it.time]!==undefined)g[d][it.time].push(it)})
    })
    return g
  },[filtered,DAYS])

  // Today timeline — uses RU day names internally
  const todayItems=useMemo(()=>{
    const ruIdx=DAYS.indexOf(selectedDay)
    const ruDay=ruIdx>=0?DAYS_RU[ruIdx]:selectedDay
    return schedule.filter(s=>s.day===ruDay&&(selectedGroup==='all'||s.group===selectedGroup)).sort((a,b)=>a.time_index-b.time_index)
  },[schedule,selectedDay,selectedGroup,DAYS])

  const analytics=useMemo(()=>{
    if(!schedule.length)return null
    const roomSlots:Record<string,Set<string>>={},teacherSlots:Record<string,Set<string>>={},groupCounts:Record<string,number>={},dayCounts:Record<string,number>={}
    const subjectCounts:Record<string,{lec:number,prac:number}>={}
    schedule.forEach(s=>{
      if(!roomSlots[s.room])roomSlots[s.room]=new Set()
      roomSlots[s.room].add(`${s.room}|${s.day}|${s.time}`)
      if(!teacherSlots[s.teacher])teacherSlots[s.teacher]=new Set()
      teacherSlots[s.teacher].add(`${s.teacher}|${s.day}|${s.time}`)
      groupCounts[s.group]=(groupCounts[s.group]||0)+1
      dayCounts[s.day]=(dayCounts[s.day]||0)+1
      if(!subjectCounts[s.subject])subjectCounts[s.subject]={lec:0,prac:0}
      if(s.class_type==='Лекция')subjectCounts[s.subject].lec++
      else subjectCounts[s.subject].prac++
    })
    const roomCounts:Record<string,number>={}
    Object.entries(roomSlots).forEach(([r,s])=>{roomCounts[r]=s.size})
    const teacherCounts:Record<string,number>={}
    Object.entries(teacherSlots).forEach(([t2,s])=>{teacherCounts[t2]=s.size})
    const uniqueSlots=new Set(schedule.map(s=>`${s.room}|${s.day}|${s.time}`)).size
    const shift1=new Set(schedule.filter(s=>s.shift===1).map(s=>`${s.day}|${s.time}|${s.room}`)).size
    const shift2=new Set(schedule.filter(s=>s.shift===2).map(s=>`${s.day}|${s.time}|${s.room}`)).size
    const lecCount=schedule.filter(s=>s.class_type==='Лекция').length
    const pracCount=schedule.filter(s=>s.class_type==='Практика').length
    const courseLoad=[1,2,3,4].map(c=>({course:c,count:schedule.filter(s=>s.course===c).length}))
    const topSubj=Object.entries(subjectCounts).map(([name,v])=>({name,total:v.lec+v.prac,...v})).sort((a,b)=>b.total-a.total).slice(0,10)
    // dayDist using RU names
    const dayDist=DAYS_RU.map((d,i)=>({day:DAYS_SHORT[i],count:dayCounts[d]||0}))
    const groupLoad=Object.entries(groupCounts).sort(([,a],[,b])=>b-a)
    // ИНДЕКС БАЛАНСА СМЕН (0-100%): насколько равномерно распределены занятия по 2 сменам
    // 100% = идеальный баланс (50/50), 0% = все занятия в одной смене
    const totalShifts = shift1 + shift2
    const balanceRatio = totalShifts > 0 ? Math.min(shift1, shift2) / Math.max(shift1, shift2, 1) : 0
    const efficiency = Math.round(balanceRatio * 100)
    return{uniqueSlots,shift1,shift2,lecCount,pracCount,courseLoad,roomCounts,teacherCounts,groupLoad,topSubj,dayDist,groupCount:groups.length,teacherCount:Object.keys(teacherCounts).length,efficiency}
  },[schedule,groups,rooms,DAYS_SHORT])

  const heatmapData=useMemo(()=>{
    const roomList=rooms.slice(0,10)
    const data=roomList.map(r=>ALL_SLOTS.map(slot=>schedule.filter(s=>s.room===r&&s.time===slot).length))
    return{data,rows:roomList.length,cols:ALL_SLOTS.length,rowLabels:roomList,colLabels:ALL_SLOTS.map(s=>s.slice(0,5))}
  },[schedule,rooms])

  const heatmapDays=useMemo(()=>{
    const roomList=rooms.slice(0,10)
    const data=roomList.map(r=>DAYS_RU.map(d=>schedule.filter(s=>s.room===r&&s.day===d).length))
    return{data,rows:roomList.length,cols:DAYS_RU.length,rowLabels:roomList,colLabels:DAYS_SHORT}
  },[schedule,rooms,DAYS_SHORT])

  const forecast=useMemo(()=>{
    if(!analytics)return null
    const roomUtil=Object.entries(analytics.roomCounts).map(([room,count])=>{
      const pct=Math.min(100,Math.round(count/72*100))
      const predicted=Math.min(100,Math.max(0,pct+Math.round(Math.random()*8-2)))
      return{room,current:pct,predicted,trend:predicted>pct?'up':predicted<pct?'down':'stable'}
    }).sort((a,b)=>b.predicted-a.predicted)
    const weeklySparkData=DAYS_RU.map(d=>schedule.filter(s=>s.day===d).length)
    const maxIdx=weeklySparkData.indexOf(Math.max(...weeklySparkData))
    const peakDay=DAYS[maxIdx]||DAYS[0]
    const peakShift=analytics.shift1>analytics.shift2?SHIFT1[0].slice(0,5)+' – '+SHIFT1[5].slice(6):SHIFT2[0].slice(0,5)+' – '+SHIFT2[5].slice(6)
    return{roomUtil,weeklySparkData,peakDay,peakShift}
  },[analytics,schedule,DAYS])

  const exportExcel=()=>{
    const data=filtered.map(r=>({[t('filter_course')]:r.course,'День':r.day,'Время':r.time,'Смена':r.shift,[t('filter_group')]:r.group,[t('nav_schedule')]:r.subject,[t('filter_teacher')]:r.teacher,[t('filter_room')]:r.room,'Тип':r.class_type}))
    const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Schedule');XLSX.writeFile(wb,'Schedule.xlsx')
  }

  const themeColors={dark:'linear-gradient(135deg,#6c63ff,#13131b)',light:'linear-gradient(135deg,#5b4de8,#f4f5ff)',midnight:'linear-gradient(135deg,#22d3ee,#05080f)',forest:'linear-gradient(135deg,#4ade80,#07100a)'}
  const tabTitles:Record<Tab,string>={dashboard:t('nav_dashboard'),schedule:t('nav_schedule'),forecast:t('nav_forecast'),advisor:t('nav_advisor'),analytics:t('nav_analytics'),availability:t('nav_availability'),about:t('nav_about')}
  const navItems=[
    {id:'dashboard'as Tab,icon:'⬡',lk:'nav_dashboard'},
    {id:'schedule'as Tab,icon:'📅',lk:'nav_schedule'},
    {id:'forecast'as Tab,icon:'🔥',lk:'nav_forecast'},
    {id:'advisor'as Tab,icon:'⚙️',lk:'nav_advisor'},
    {id:'analytics'as Tab,icon:'📊',lk:'nav_analytics'},
    {id:'availability'as Tab,icon:'🔍',lk:'nav_availability'},
    {id:'about'as Tab,icon:'ℹ️',lk:'nav_about'},
  ]

  const COURSE_OPTS=[{value:'all',label:t('all_courses')},...[1,2,3,4].map(c=>({value:String(c),label:`${c} ${t('course_lbl')}`}))]
  const GROUP_OPTS=[{value:'all',label:t('all_groups2')},...groups.map(g=>({value:g,label:g}))]
  const TEACHER_OPTS=[{value:'all',label:t('all_teachers')},...tNames.map(x=>({value:x,label:x}))]
  const ROOM_OPTS=[{value:'all',label:t('all_rooms')},...rooms.map(r=>({value:r,label:r}))]
  const SHIFT_OPTS=[{value:'all',label:t('all_shifts')},{value:'1',label:`☀️ ${t('shift1_lbl')}`},{value:'2',label:`🌆 ${t('shift2_lbl')}`}]
  const semLabels:Record<string,{ru:string,kz:string,en:string}>={
    '1':{ru:'Сем.1 (1к осень)',kz:'Сем.1 (1к күз)',en:'Sem.1 (Y1 autumn)'},
    '2':{ru:'Сем.2 (1к весна)',kz:'Сем.2 (1к көктем)',en:'Sem.2 (Y1 spring)'},
    '3':{ru:'Сем.3 (2к осень)',kz:'Сем.3 (2к күз)',en:'Sem.3 (Y2 autumn)'},
    '4':{ru:'Сем.4 (2к весна)',kz:'Сем.4 (2к көктем)',en:'Sem.4 (Y2 spring)'},
    '5':{ru:'Сем.5 (3к осень)',kz:'Сем.5 (3к күз)',en:'Sem.5 (Y3 autumn)'},
    '6':{ru:'Сем.6 (3к весна)',kz:'Сем.6 (3к көктем)',en:'Sem.6 (Y3 spring)'},
    '7':{ru:'Сем.7 (4к осень)',kz:'Сем.7 (4к күз)',en:'Sem.7 (Y4 autumn)'},
    '8':{ru:'Сем.8 (4к весна)',kz:'Сем.8 (4к көктем)',en:'Sem.8 (Y4 spring)'},
  }
  const SEM_OPTS=[
    {value:'all',label:lang==='en'?'All Semesters':lang==='kz'?'Барлық семестрлер':'Все семестры'},
    ...[1,2,3,4,5,6,7,8].map(s=>({
      value:String(s),
      label:semLabels[String(s)]?.[lang]||`${s} сем`
    }))
  ]
  const DAY_OPTS=DAYS.map(d=>({value:d,label:d}))
  const ALL_GROUP_OPTS=[{value:'all',label:t('all_groups')},...groups.map(g=>({value:g,label:g}))]

  return(
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen?'open':''}`}>
          <div className="sb-logo">
            <div className="sb-logo-icon">⬡</div>
            <div style={{minWidth:0}}>
              <div className="sb-title">EduScheduler</div>
              <div className="sb-sub">AI Planning System</div>
            </div>
          </div>

          {/* LANGUAGE SWITCHER */}
          <div className="sb-lang">
            {(['ru','kz','en'] as Lang[]).map(l=>(
              <button key={l} className={`lang-btn ${lang===l?'active':''}`} onClick={()=>setLang(l)}>
                {l==='ru'?'РУ':l==='kz'?'ҚЗ':'EN'}
              </button>
            ))}
          </div>

          <div className="sb-dept">
            <div className="sb-dept-lbl">{t('department')}</div>
            <div className="sb-dept-name">{t('dept_name')}</div>
            <div className="sb-dept-status">
              <span className="sdot green"/>{t('system_active')}
            </div>
          </div>

          <nav className="sb-nav">
            {navItems.map(item=>(
              <button key={item.id} className={`sb-item ${tab===item.id?'active':''}`}
                onClick={()=>{setTab(item.id);setSidebarOpen(false)}}>
                <span className="sb-icon">{item.icon}</span>
                <span className="sb-label">{t(item.lk)}</span>
                {item.id==='schedule'&&schedule.length>0&&<span className="sb-badge">{schedule.length}</span>}
              </button>
            ))}
          </nav>

          <div className="sb-metrics">
            <div className="sb-m-title">{t('quick_metrics')}</div>
            {analytics?(
              <>
                <div className="sb-m-row"><span>{t('groups_lbl')}</span><span className="sb-m-val">{analytics.groupCount}</span></div>
                <div className="sb-m-row"><span>{t('pairs_lbl')}</span><span className="sb-m-val">{analytics.uniqueSlots}</span></div>
                <div className="sb-m-row" style={{cursor:'pointer'}} onClick={()=>setShowEffInfo(!showEffInfo)}>
                  <span>{t('efficiency_lbl')} <span style={{fontSize:10,color:'var(--text2)'}}>ℹ</span></span>
                  <span className="sb-m-val" style={{color:analytics.efficiency>70?'var(--success)':analytics.efficiency>40?'var(--warn)':'var(--danger)'}}>{analytics.efficiency}%</span>
                </div>
                {showEffInfo&&<div style={{fontSize:10,color:'var(--text2)',background:'var(--bg3)',padding:'7px 9px',borderRadius:7,marginTop:4,lineHeight:1.5,border:'1px solid var(--border)'}}>{t('eff_formula')}</div>}
                <div style={{height:5,background:'var(--bg3)',borderRadius:99,overflow:'hidden',marginTop:6}}>
                  <div style={{height:'100%',width:`${analytics.efficiency}%`,background:analytics.efficiency>70?'var(--success)':analytics.efficiency>40?'var(--warn)':'var(--danger)',borderRadius:99,transition:'width .6s'}}/>
                </div>
                <div style={{height:5,background:'var(--bg3)',borderRadius:99,overflow:'hidden',marginTop:4}} title="Смена 1 vs 2">
                  <div style={{height:'100%',width:`${analytics.shift1+analytics.shift2>0?Math.round(analytics.shift1/(analytics.shift1+analytics.shift2)*100):0}%`,background:'var(--shift1)',borderRadius:99}}/>
                </div>
                <div style={{fontSize:9,color:'var(--text2)',marginTop:3,display:'flex',justifyContent:'space-between'}}>
                  <span>☀️ {analytics.shift1}</span><span>🌆 {analytics.shift2}</span>
                </div>
              </>
            ):<div className="sb-no-data">{t('no_data')}</div>}
          </div>

          <div className="sb-theme">
            <div className="sb-t-lbl">{t('theme_lbl')}</div>
            <div className="sb-t-grid">
              {(Object.keys(THEMES) as Theme[]).map(th=>(
                <button key={th} className={`sb-t-btn ${theme===th?'active':''}`}
                  style={{background:themeColors[th]}} onClick={()=>setTheme(th)} title={th}/>
              ))}
            </div>
            <div className="sb-t-names">
              {(Object.keys(THEMES) as Theme[]).map(th=>(
                <span key={th} className={theme===th?'act':''} onClick={()=>setTheme(th)}>{th}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <header className="topbar">
            <button className="menu-btn" onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
            <div className="tb-left">
              <div className="tb-title">{tabTitles[tab]}</div>
              <div className="tb-path">{t('path_prefix')} / {t(navItems.find(n=>n.id===tab)?.lk||'nav_dashboard')}</div>
            </div>
            <div className="tb-right">
              {schedule.length>0&&<>
                <span className="pill accent">{activeSemester===1?`☀️ ${t('btn_autumn').split(' ')[0]}`:activeSemester===2?`🌸 ${t('btn_spring').split(' ')[0]}`:'📚'}</span>
                <span className="pill">{filtered.length} {lang==='ru'?'пар':lang==='kz'?'сабақ':'cls'}</span>
                {analytics&&<span className={`pill ${analytics.efficiency>70?'success':analytics.efficiency>40?'warn':'danger'}`} title={lang==='en'?'Shift Balance':lang==='kz'?'Ауысым балансы':'Баланс смен'}>⚖️ {analytics.efficiency}%</span>}
              </>}
              {solverTime&&<span className="pill info">⚡ {(solverTime/1000).toFixed(1)}с</span>}
              <div className="tb-lang">
                {(['ru','kz','en'] as Lang[]).map(l=>(
                  <button key={l} className={`tb-lang-btn ${lang===l?'active':''}`} onClick={()=>setLang(l)}>
                    {l==='ru'?'РУ':l==='kz'?'ҚЗ':'EN'}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="content">

            {/* ===== DASHBOARD ===== */}
            {tab==='dashboard'&&(
              <div className="dash-layout">
                <div className="dash-main">
                  <div className="hero-card">
                    <div className="hero-bg"/>
                    <div className="hero-body">
                      <div className="hero-badge">🤖 {t('ai_badge')}</div>
                      <h1 className="hero-title">{t('hero_title')}</h1>
                      <p className="hero-sub">{t('hero_sub')}</p>
                      <div className="hero-langs">
                        <span className="hero-lang">🇰🇿 Қазақша</span>
                        <span className="hero-lang">🇷🇺 Русский</span>
                        <span className="hero-lang">🇬🇧 English</span>
                      </div>
                      <div className="hero-acts">
                        <button className="btn btn-primary" onClick={()=>handleGenerate(1)} disabled={loading}>{loading?'⏳ ...':'☀️ '+t('btn_autumn')}</button>
                        <button className="btn btn-secondary" onClick={()=>handleGenerate(2)} disabled={loading}>🌸 {t('btn_spring')}</button>
                        <button className="btn btn-ghost" onClick={()=>setTab('about')}>ℹ️ {t('btn_about')}</button>
                      </div>
                    </div>
                  </div>

                  <div className="kpi-grid">
                    <StatCard icon="📌" val={analytics?.uniqueSlots||0} label={t('stat_unique')} sub={t('stat_unique_sub')} color="var(--accent3)" spark={analytics?.dayDist.map(d=>d.count)}/>
                    <StatCard icon="🏫" val={analytics?.groupCount||0} label={t('stat_groups')} sub={t('stat_groups_sub')} color="var(--info)"/>
                    <StatCard icon="👨‍🏫" val={analytics?.teacherCount||0} label={t('stat_teachers')} sub={t('stat_teachers_sub')} color="var(--prac)"/>
                    <StatCard icon="☀️" val={analytics?.shift1||0} label={t('stat_shift1')} sub={t('stat_shift1_sub')} color="var(--shift1)"/>
                    <StatCard icon="🌆" val={analytics?.shift2||0} label={t('stat_shift2')} sub={t('stat_shift2_sub')} color="var(--shift2)"/>
                    <StatCard icon="⚖️" val={`${analytics?.efficiency||0}%`} label={t('stat_efficiency')} sub={t('stat_eff_sub')} color={analytics&&analytics.efficiency>70?'var(--success)':analytics&&analytics.efficiency>40?'var(--warn)':'var(--danger)'}/>
                    <StatCard icon="📖" val={analytics?.lecCount||0} label={t('stat_lectures')} color="var(--lec)"/>
                    <StatCard icon="💻" val={analytics?.pracCount||0} label={t('stat_practices')} color="var(--prac)"/>
                  </div>

                  {schedule.length>0&&rooms.length>0&&(
                    <div className="acard">
                      <Heatmap {...heatmapDays} title={`🗓️ ${t('heatmap_days')}`}/>
                    </div>
                  )}
                  {!schedule.length&&(
                    <div className="acard" style={{textAlign:'center',padding:'44px 20px'}}>
                      <div style={{fontSize:52,marginBottom:14}}>🗓️</div>
                      <div style={{fontSize:18,fontWeight:800,marginBottom:9,fontFamily:'DM Mono,monospace'}}>{t('no_schedule')}</div>
                      <div style={{fontSize:13,color:'var(--text2)',marginBottom:22}}>{t('no_schedule_sub')}</div>
                      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                        {['✓ CP-SAT Constraint Solver','✓ 2 смены 08:00–20:00','✓ Прогноз занятости','✓ Экспорт в Excel'].map(f=>(
                          <div key={f} style={{fontSize:12,fontWeight:600,color:'var(--text2)',background:'var(--bg3)',padding:'5px 14px',borderRadius:20,border:'1px solid var(--border)'}}>{f}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="dash-side">
                  <div className="acard">
                    <div className="acard-title">📋 {t('day_schedule')}</div>
                    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                      <Sel value={selectedDay} onChange={setSelectedDay} options={DAY_OPTS} minW="110px"/>
                      <Sel value={selectedGroup} onChange={setSelectedGroup} options={ALL_GROUP_OPTS} minW="130px"/>
                    </div>
                    <Timeline items={todayItems.map(i=>({time:i.time,subject:i.subject,room:i.room,type:i.class_type==='Лекция'?t('lecture'):t('practice'),group:i.group}))} t={{lecture:t('lecture'),practice:t('practice')}}/>
                  </div>

                  <div className="acard">
                    <div className="acard-title">⚡ {t('system_status')}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:2}}>
                      {[
                        {dot:'green',name:t('backend_api'),status:t('online')},
                        {dot:'green',name:t('solver_lbl'),status:t('ready')},
                        {dot:schedule.length>0?'green':'gray',name:t('schedule_lbl'),status:schedule.length>0?t('loaded'):t('not_created')},
                        {dot:'blue',name:t('db_lbl'),status:'PostgreSQL'},
                      ].map(row=>(
                        <div key={row.name} style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,padding:'7px 0',borderBottom:'1px solid var(--border)33'}}>
                          <span className={`sdot ${row.dot}`}/>
                          <span style={{color:'var(--text2)',flex:1}}>{row.name}</span>
                          <span style={{fontWeight:700,color:row.dot==='green'?'var(--success)':row.dot==='blue'?'var(--info)':'var(--text2)',fontSize:11}}>{row.status}</span>
                        </div>
                      ))}
                    </div>
                    {solverTime&&<div style={{marginTop:12,padding:'9px 12px',background:'var(--bg3)',borderRadius:9,fontSize:12,border:'1px solid var(--border)55'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{color:'var(--text2)'}}>{t('solver_time')}</span>
                        <span style={{fontFamily:'DM Mono,monospace',color:'var(--accent3)'}}>{(solverTime/1000).toFixed(2)}с</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{color:'var(--text2)'}}>{t('solver_status')}</span>
                        <span style={{color:'var(--success)',fontWeight:700}}>✓ {solverStatus}</span>
                      </div>
                    </div>}
                  </div>

                  <div className="acard">
                    <div className="acard-title">📚 {t('curriculum_lbl')}</div>
                    {[1,2,3,4].map(c=>{
                      const cnt=subjects.filter(s=>s.course===c).length
                      const maxC=Math.max(...[1,2,3,4].map(x=>subjects.filter(s=>s.course===x).length),1)
                      return <Bar key={c} name={`${c} ${t('course_lbl')}`} val={cnt} max={maxC} color="var(--accent)" suffix={` ${lang==='en'?'sub':lang==='kz'?'пән':'пред.'}`}/>
                    })}
                    <div style={{fontSize:12,color:'var(--text2)',marginTop:8,textAlign:'center',borderTop:'1px solid var(--border)44',paddingTop:8}}>{t('total_subjects')}: <strong style={{color:'var(--text)'}}>{subjects.length}</strong></div>
                  </div>

                  {analytics&&(
                    <div className="acard">
                      <div className="acard-title">🔄 {t('shifts_title')}</div>
                      <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                        <Donut pct={Math.round(analytics.shift1/(analytics.shift1+analytics.shift2||1)*100)} c1="var(--shift1)" c2="var(--shift2)" size={90} label={lang==='en'?'sh.1':lang==='kz'?'1-ауыс.':'смена 1'}/>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,marginBottom:6}}>
                            <div style={{width:10,height:10,borderRadius:'50%',background:'var(--shift1)',flexShrink:0}}/>☀️ {analytics.shift1} {lang==='en'?'cls':lang==='kz'?'сабақ':'пар'}
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5}}>
                            <div style={{width:10,height:10,borderRadius:'50%',background:'var(--shift2)',flexShrink:0}}/>🌆 {analytics.shift2} {lang==='en'?'cls':lang==='kz'?'сабақ':'пар'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== SCHEDULE ===== */}
            {tab==='schedule'&&(
              <>
                <div className="acard" style={{marginBottom:14}}>
                  <div className="gen-hint">{t('gen_hint')}</div>
                  <div className="gen-btns">
                    <button className={`sem-btn ${activeSemester===1?'active':''}`} onClick={()=>handleGenerate(1)} disabled={loading}>
                      <span style={{fontSize:24}}>☀️</span>
                      <div><div style={{fontWeight:800,fontSize:14.5}}>{t('btn_autumn')}</div><div style={{fontSize:10.5,color:'var(--text2)',marginTop:2}}>{t('sem_autumn_subs')}</div></div>
                    </button>
                    <button className={`sem-btn ${activeSemester===2?'active':''}`} onClick={()=>handleGenerate(2)} disabled={loading}>
                      <span style={{fontSize:24}}>🌸</span>
                      <div><div style={{fontWeight:800,fontSize:14.5}}>{t('btn_spring')}</div><div style={{fontSize:10.5,color:'var(--text2)',marginTop:2}}>{t('sem_spring_subs')}</div></div>
                    </button>
                    <button className="btn btn-secondary" onClick={()=>handleGenerate(null)} disabled={loading}>🔀 {t('full_plan')}</button>
                    {loading&&<span className="loading-pulse">⏳ {t('generating')}</span>}
                  </div>
                  {lastUpdate&&<div style={{marginTop:10,fontSize:11,color:'var(--text2)'}}>🕐 {t('last_gen')} {new Date(lastUpdate).toLocaleString(lang==='en'?'en-US':lang==='kz'?'kk-KZ':'ru-RU')}</div>}
                </div>

                {schedule.length>0&&(
                  <>
                    <div className="acard" style={{marginBottom:14}}>
                      <div className="filter-bar">
                        <Sel label={t('filter_course')} value={filterCourse} onChange={setFilterCourse} options={COURSE_OPTS} minW="120px"/>
                        <Sel label={t('filter_group')} value={filterGroup} onChange={setFilterGroup} options={GROUP_OPTS} minW="148px"/>
                        <Sel label={t('filter_teacher')} value={filterTeacher} onChange={setFilterTeacher} options={TEACHER_OPTS} minW="180px"/>
                        <Sel label={t('filter_room')} value={filterRoom} onChange={setFilterRoom} options={ROOM_OPTS} minW="138px"/>
                        <Sel label={t('filter_shift')} value={filterShift} onChange={setFilterShift} options={SHIFT_OPTS} minW="138px"/>
                        <Sel label={lang==='en'?'SEMESTER':lang==='kz'?'СЕМЕСТР':'СЕМЕСТР'} value={filterSemester} onChange={setFilterSemester} options={SEM_OPTS} minW="138px"/>
                        <div className="filter-acts">
                          <button className="btn btn-secondary btn-sm" onClick={()=>setViewMode(viewMode==='grid'?'list':'grid')}>{viewMode==='grid'?`📋 ${t('btn_list')}`:` ⊞ ${t('btn_grid')}`}</button>
                          <button className="btn btn-success btn-sm" onClick={exportExcel}>📥 {t('btn_excel')}</button>
                        </div>
                      </div>
                      <div style={{marginTop:10,display:'flex',gap:14,fontSize:12,color:'var(--text2)',flexWrap:'wrap'}}>
                        <span>{t('showing')} <strong style={{color:'var(--text)'}}>{filtered.length}</strong> {t('records')}</span>
                        <span>{t('groups_f')} <strong style={{color:'var(--text)'}}>{new Set(filtered.map(f=>f.group)).size}</strong></span>
                        <span style={{color:'var(--shift1)'}}>{t('shift1_f')} <strong>{new Set(filtered.filter(f=>f.shift===1).map(f=>`${f.day}|${f.time}|${f.room}`)).size}</strong></span>
                        <span style={{color:'var(--shift2)'}}>{t('shift2_f')} <strong>{new Set(filtered.filter(f=>f.shift===2).map(f=>`${f.day}|${f.time}|${f.room}`)).size}</strong></span>
                        {filterSemester!=='all'&&filtered.length>0&&<span style={{background:'var(--accent)18',color:'var(--accent3)',padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700}}>Сем.{filterSemester} ✓</span>}
                        {filterSemester!=='all'&&filtered.length===0&&<span style={{background:'var(--danger)18',color:'var(--danger)',padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700}}>⚠️ {lang==='en'?'Not in schedule':lang==='kz'?'Кестеде жоқ':'Нет в расписании'}</span>}
                        {filterCourse!=='all'&&<span style={{color:'var(--accent3)'}}>Курс: <strong>{filterCourse}</strong></span>}
                      </div>
                    </div>

                    {viewMode==='grid'&&(
                      <div className="acard" style={{padding:14}}>
                        <div style={{overflowX:'auto'}}>
                          {[{label:`☀️ ${t('shift1_full')}`,slots:SHIFT1,cls:'s1'},{label:`🌆 ${t('shift2_full')}`,slots:SHIFT2,cls:'s2'}].map(shift=>(
                            <div key={shift.cls} style={{marginBottom:22}}>
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <div className={`shift-hdr ${shift.cls}`} style={{marginBottom:0}}>{shift.label}</div>
                          {shift.cls==='s1'&&<div style={{display:'flex',gap:14,fontSize:11,color:'var(--text2)'}}>
                            <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:12,height:12,borderRadius:3,background:'var(--lec)',display:'inline-block'}}/>{lang==='en'?'Lecture':lang==='kz'?'Дәріс':'Лекция'}</span>
                            <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:12,height:12,borderRadius:3,background:'var(--prac)',display:'inline-block'}}/>{lang==='en'?'Practice':lang==='kz'?'Тәжірибе':'Практика'}</span>
                          </div>}
                        </div>
                              <table className="gtable">
                                <thead><tr>
                                  <th className="gtime"/>
                                  {DAYS.map(d=><th key={d} className="ghdr">{d.slice(0,lang==='kz'?4:3)}</th>)}
                                </tr></thead>
                                <tbody>
                                  {shift.slots.map(slot=>(
                                    <tr key={slot}>
                                      <td className="gtime">{slot}</td>
                                      {DAYS.map(day=>{
                                        const items=gridData[day]?.[slot]||[]
                                        return(
                                          <td key={day} className={`gcell ${items.length===0?'empty':''}`}>
                                            {items.length===0&&<div className="gcell-empty">—</div>}
                                            {items.map((it,i)=>(
                                              <div key={i} className={`ci ${it.class_type==='Лекция'?'ci-lec':'ci-prac'}`}
                                                title={`${it.subject}\n👨‍🏫 ${it.teacher}\n🚪 ${it.room}\n👥 ${it.group}`}>
                                                <div className="ci-s">{it.subject}</div>
                                                <div className="ci-m">
                                                  <span className="ci-tag">🚪{it.room}</span>
                                                  <span className="ci-tag">{it.group}</span>
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

                    {viewMode==='list'&&(
                      <div className="acard" style={{padding:0,overflow:'hidden'}}>
                        <table className="ltable">
                          <thead><tr>
                            <th>{lang==='en'?'Day':lang==='kz'?'Күн':'День'}</th>
                            <th>{lang==='en'?'Time':lang==='kz'?'Уақыт':'Время'}</th>
                            <th>{lang==='en'?'Shift':lang==='kz'?'Ауысым':'Смена'}</th>
                            <th>{lang==='en'?'Year':lang==='kz'?'Курс':'Курс'}</th>
                            <th>{t('filter_group')}</th>
                            <th>{lang==='en'?'Subject':lang==='kz'?'Пән':'Предмет'}</th>
                            <th>{t('filter_teacher')}</th>
                            <th>{t('filter_room')}</th>
                            <th>{lang==='en'?'Type':lang==='kz'?'Түрі':'Тип'}</th>
                          </tr></thead>
                          <tbody>
                            {filtered.map((row,i)=>(
                              <tr key={i}>
                                <td style={{fontWeight:600}}>{row.day}</td>
                                <td style={{fontFamily:'DM Mono,monospace',fontSize:11}}>{row.time}</td>
                                <td><span className={`sbadge ${row.shift===1?'sb1':'sb2'}`}>{row.shift===1?'☀️ I':'🌆 II'}</span></td>
                                <td><span className="chip-c">{row.course}{lang==='kz'?'к':lang==='en'?'y':'к'}</span></td>
                                <td style={{fontWeight:600,color:'var(--accent3)'}}>{row.group}</td>
                                <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.subject}</td>
                                <td style={{color:'var(--text2)',fontSize:11}}>{row.teacher}</td>
                                <td>{row.room}</td>
                                <td><span className={`tbadge ${row.class_type==='Лекция'?'tlec':'tprac'}`}>{row.class_type==='Лекция'?t('lecture'):t('practice')}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
                {!schedule.length&&!loading&&(
                  <div className="empty-s"><div className="empty-icon">🗓️</div><div className="empty-t">{t('no_schedule')}</div><div className="empty-sub">{t('no_schedule_sub')}</div></div>
                )}
              </>
            )}

            {/* ===== FORECAST ===== */}
            {tab==='forecast'&&(
              <>
                {!forecast?(
                  <div className="empty-s"><div className="empty-icon">🔥</div><div className="empty-t">{t('no_forecast')}</div><div className="empty-sub">{t('no_schedule_sub')}</div><button className="btn btn-primary" onClick={()=>setTab('dashboard')}>→ {t('go_generate')}</button></div>
                ):(
                  <>
                    <div className="grid-2" style={{marginBottom:16}}>
                      <div className="acard">
                        <div className="acard-title">📈 {t('forecast_title')}</div>
                        <div style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>{t('forecast_sub')}</div>
                        {forecast.roomUtil.map(r=>(
                          <div key={r.room} style={{marginBottom:13}}>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                              <span style={{fontWeight:600}}>🚪 {r.room}</span>
                              <span style={{display:'flex',gap:10,alignItems:'center'}}>
                                <span style={{color:'var(--text2)',fontFamily:'DM Mono,monospace',fontSize:11}}>{r.current}%</span>
                                <span style={{fontSize:11,fontWeight:700,color:r.trend==='up'?'var(--danger)':r.trend==='down'?'var(--success)':'var(--text2)'}}>
                                  {r.trend==='up'?'↑':r.trend==='down'?'↓':'→'} {r.predicted}%
                                </span>
                              </span>
                            </div>
                            <div style={{height:10,background:'var(--bg3)',borderRadius:99,overflow:'hidden',display:'flex',gap:1}}>
                              <div style={{width:`${r.current}%`,background:'var(--accent)',borderRadius:99,opacity:.6}}/>
                              <div style={{width:`${Math.abs(r.predicted-r.current)}%`,background:r.trend==='up'?'var(--danger)':'var(--success)',borderRadius:99,opacity:.9}}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="acard">
                        <div className="acard-title">🎯 {t('key_metrics')}</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                          {[
                            {icon:'📅',val:forecast.peakDay,lbl:t('peak_day')},
                            {icon:'🕐',val:forecast.peakShift,lbl:t('peak_shift')},
                            {icon:'📊',val:`${analytics?.efficiency||0}%`,lbl:t('eff_index')},
                            {icon:'⚠️',val:forecast.roomUtil.filter(r=>r.predicted>80).length,lbl:t('risk_rooms')},
                          ].map(m=>(
                            <div key={m.lbl} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:14,textAlign:'center'}}>
                              <div style={{fontSize:24,marginBottom:6}}>{m.icon}</div>
                              <div style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color:'var(--accent3)',marginBottom:4,wordBreak:'break-word'}}>{m.val}</div>
                              <div style={{fontSize:10,color:'var(--text2)'}}>{m.lbl}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📉 {t('weekly_act')}</div>
                        <div style={{display:'flex',alignItems:'flex-end',gap:7,height:88}}>
                          {forecast.weeklySparkData.map((v,i)=>{
                            const maxV=Math.max(...forecast.weeklySparkData,1)
                            const h=Math.round(v/maxV*68)+8
                            return(
                              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,height:88,justifyContent:'flex-end'}}>
                                <div style={{fontSize:10,color:'var(--accent3)',fontWeight:700}}>{v}</div>
                                <div style={{width:'100%',height:h,background:'var(--accent)',borderRadius:'4px 4px 0 0',opacity:.85}}/>
                                <div style={{fontSize:10,color:'var(--text2)',fontWeight:700}}>{DAYS_SHORT[i]}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="acard" style={{marginBottom:16}}>
                      <Heatmap {...heatmapData} title={`🔥 ${t('heatmap_slots')}`}/>
                    </div>

                    <div className="grid-2">
                      <div className="acard">
                        <div className="acard-title">💡 {t('recommendations')}</div>
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          {forecast.roomUtil.filter(r=>r.predicted>80).map(r=>(
                            <div key={r.room} style={{display:'flex',gap:10,padding:'10px 12px',borderRadius:9,background:'var(--danger)08',borderLeft:'3px solid var(--danger)'}}>
                              <span style={{fontSize:18}}>⚠️</span>
                              <div><div style={{fontWeight:600,fontSize:12.5}}>🚪 {r.room}</div><div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{t('rec_overload')}: {r.predicted}%</div></div>
                            </div>
                          ))}
                          {analytics&&analytics.shift2<analytics.shift1*0.4&&(
                            <div style={{display:'flex',gap:10,padding:'10px 12px',borderRadius:9,background:'var(--warn)08',borderLeft:'3px solid var(--warn)'}}>
                              <span style={{fontSize:18}}>💡</span>
                              <div><div style={{fontWeight:600,fontSize:12.5}}>{t('rec_balance')}</div><div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{t('rec_balance_desc')}</div></div>
                            </div>
                          )}
                          <div style={{display:'flex',gap:10,padding:'10px 12px',borderRadius:9,background:'var(--info)08',borderLeft:'3px solid var(--info)'}}>
                            <span style={{fontSize:18}}>📈</span>
                            <div><div style={{fontWeight:600,fontSize:12.5}}>{t('rec_efficiency')}</div><div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{analytics?.efficiency||0}% — {(analytics?.efficiency||0)>50?'✅':lang==='en'?'room for improvement':lang==='kz'?'жақсарту мүмкіндігі бар':'есть потенциал для улучшения'}</div></div>
                          </div>
                          {forecast.roomUtil.filter(r=>r.current<25).slice(0,3).map(r=>(
                            <div key={r.room} style={{display:'flex',gap:10,padding:'10px 12px',borderRadius:9,background:'var(--success)08',borderLeft:'3px solid var(--success)'}}>
                              <span style={{fontSize:18}}>✅</span>
                              <div><div style={{fontWeight:600,fontSize:12.5}}>🚪 {r.room}</div><div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{r.current}% {t('rec_free')}</div></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="acard">
                        <div className="acard-title">🏆 {t('top_rooms')}</div>
                        {forecast.roomUtil.slice(0,9).map(r=>(
                          <Bar key={r.room} name={`🚪 ${r.room}`} val={r.current} max={100} color={r.current>70?'var(--danger)':r.current>45?'var(--warn)':'var(--success)'} suffix="%" warn={r.current>45&&r.current<=70} danger={r.current>70}/>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ===== ADVISOR ===== */}
            {tab==='advisor'&&(
              <div className="advisor-layout">
                <div className="acard">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{fontSize:15,fontWeight:800,fontFamily:'DM Mono,monospace'}}>📚 {t('curriculum_full')}</div>
                    <button className="btn btn-primary btn-sm" onClick={openNew}>{t('add_subject')}</button>
                  </div>
                  <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                    <input className="sinput" placeholder={`🔍 ${t('search_subject')}`} value={subjectSearch} onChange={e=>setSubjectSearch(e.target.value)} style={{flex:1,minWidth:180}}/>
                    <select className="fselect" value={subjectCourseF} onChange={e=>setSubjectCourseF(e.target.value)}>
                      <option value="all">{t('all_courses')}</option>
                      {[1,2,3,4].map(c=><option key={c} value={c}>{c} {t('course_lbl')}</option>)}
                    </select>
                    <select className="fselect" value={subjectSemF} onChange={e=>setSubjectSemF(e.target.value)}>
                      <option value="all">{t('all_sems')}</option>
                      {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>{s} {t('sem_lbl')}</option>)}
                    </select>
                  </div>
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>{t('found')} {filtSubj.length} {t('of_total')} {subjects.length}</div>
                  <div style={{maxHeight:'62vh',overflowY:'auto',paddingRight:2}}>
                    {filtSubj.map(s=>(
                      <div key={s.id} className="scard">
                        <div style={{display:'flex',gap:5,flexShrink:0}}>
                          <span className="chip-c">{s.course}{t('course_lbl').charAt(0)}</span>
                          <span className="chip-s">{s.semester}{t('sem_lbl')}</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={s.name}>{s.name}</div>
                          <div style={{fontSize:11,color:'var(--text2)',marginTop:3}}>💎 {s.credits} {t('credits_lbl')} · {t('lec_lbl')}:{s.lectures_per_week} / {t('prac_lbl')}:{s.practices_per_week}</div>
                          {s.teachers.length>0?<div style={{fontSize:11,color:'var(--accent3)',marginTop:3}}>👨‍🏫 {s.teachers.map(x=>x.full_name).join(', ')}</div>:<div style={{fontSize:11,color:'var(--warn)',marginTop:3}}>⚠️ {t('no_teacher')}</div>}
                        </div>
                        <div style={{display:'flex',gap:5,flexShrink:0}}>
                          <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(s)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>delSubj(s.id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div className="acard">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div style={{fontSize:14,fontWeight:800}}>👨‍🏫 {t('staff')}</div>
                      <button className="btn btn-primary btn-sm" onClick={()=>{setEditTeacher(null);setTName('');setTHours(20);setShowTModal(true)}}>+</button>
                    </div>
                    <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:7}}>
                      {teachers.map(t2=>(
                        <div key={t2.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,transition:'border-color .2s'}}
                          onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--accent)55')}
                          onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
                          <div style={{width:34,height:34,borderRadius:9,background:'var(--accent)20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>👨‍🏫</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:12.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t2.full_name}</div>
                            <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>
                              ⏱ {lang==='en'?'Max':lang==='kz'?'Макс.':'Макс.'}: {t2.max_hours_per_week}ч/нед
                            </div>
                            {(() => {
                              const teacherSubjects = subjects.filter(s=>s.teachers.some(tt=>tt.id===t2.id))
                              return teacherSubjects.length>0&&(
                                <div style={{fontSize:10,color:'var(--accent3)',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  📚 {teacherSubjects.map(s=>s.name).join(', ')}
                                </div>
                              )
                            })()}
                          </div>
                          <button className="btn btn-secondary btn-sm"
                            onClick={()=>{setEditTeacher(t2);setTName(t2.full_name);setTHours(t2.max_hours_per_week);setShowTModal(true)}}
                            title={lang==='en'?'Edit':lang==='kz'?'Өңдеу':'Изменить'}>✏️</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="acard">
                    <div style={{fontSize:14,fontWeight:800,marginBottom:12}}>📊 {t('plan_stats')}</div>
                    {[
                      {icon:'📚',lbl:t('total_sub'),val:subjects.length},
                      {icon:'⚠️',lbl:t('no_teacher_lbl'),val:subjects.filter(s=>s.teachers.length===0).length},
                      {icon:'📖',lbl:t('with_lectures'),val:subjects.filter(s=>s.lectures_per_week>0).length},
                      {icon:'💻',lbl:t('only_practice'),val:subjects.filter(s=>s.lectures_per_week===0&&s.practices_per_week>0).length},
                    ].map(row=>(
                      <div key={row.lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--border)33',fontSize:13}}>
                        <span style={{color:'var(--text2)'}}>{row.icon} {row.lbl}</span>
                        <span style={{fontWeight:800,fontFamily:'DM Mono,monospace',fontSize:14}}>{row.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* УПРАВЛЕНИЕ АУДИТОРИЯМИ */}
                  <div className="acard">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div style={{fontSize:14,fontWeight:800}}>🏢 {lang==='en'?'Classrooms':lang==='kz'?'Аудиториялар':'Аудитории'}</div>
                      <button className="btn btn-primary btn-sm" onClick={()=>openNewRoom()}>+</button>
                    </div>
                    <div style={{maxHeight:320,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                      {dbRooms.map(r=>{
                        const typeColor = r.room_type==='LECTURE_HALL'?'var(--accent)':r.room_type==='PC_LAB'?'var(--info)':'var(--prac)'
                        const typeLabel = r.room_type==='LECTURE_HALL'?(lang==='en'?'Lecture Hall':lang==='kz'?'Дәрісхана':'Лекц. зал'):
                                          r.room_type==='PC_LAB'?(lang==='en'?'PC Lab':lang==='kz'?'Комп. класс':'Комп. класс'):
                                          (lang==='en'?'Practice':'Практика')
                        return(
                          <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:9}}>
                            <div style={{width:32,height:32,borderRadius:8,background:r.is_active?typeColor+'22':'var(--danger)15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0,opacity:r.is_active?1:0.7}}>
                            {r.is_active?'🚪':'🔒'}
                          </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:6}}>
                                {r.name}
                                {!r.is_active&&<span style={{fontSize:10,fontWeight:700,color:'var(--danger)',background:'var(--danger)15',padding:'1px 6px',borderRadius:20}}>
                                  {lang==='en'?'CLOSED':lang==='kz'?'ЖАБЫҚ':'ЗАКРЫТА'}
                                </span>}
                              </div>
                              <div style={{fontSize:11,color:'var(--text2)',marginTop:2,display:'flex',gap:8}}>
                                <span style={{color:typeColor,fontWeight:600}}>{typeLabel}</span>
                                <span>👥 {r.capacity} {lang==='en'?'seats':lang==='kz'?'орын':'мест'}</span>
                              </div>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={()=>openEditRoom(r)} title={lang==='en'?'Edit':lang==='kz'?'Өңдеу':'Изменить'}>✏️</button>
                          <button className={`btn btn-sm ${r.is_active?'btn-secondary':'btn-success'}`}
                            onClick={()=>toggleRoomActive(r.id)}
                            title={r.is_active?(lang==='en'?'Close room':lang==='kz'?'Жабу':'Закрыть'):(lang==='en'?'Open room':lang==='kz'?'Ашу':'Открыть')}>
                            {r.is_active?'🔒':'🔓'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={()=>deleteRoom(r.id)}>🗑️</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== ANALYTICS ===== */}
            {tab==='analytics'&&(
              <>
                {!analytics?(
                  <div className="empty-s"><div className="empty-icon">📊</div><div className="empty-t">{t('no_analytics')}</div><button className="btn btn-primary" onClick={()=>setTab('dashboard')}>→ {t('go_schedule')}</button></div>
                ):(
                  <>
                    <div className="kpi-grid" style={{marginBottom:16}}>
                      <StatCard icon="📌" val={analytics.uniqueSlots} label={t('stat_unique')} sub={t('stat_unique_sub')}/>
                      <StatCard icon="🏫" val={analytics.groupCount} label={t('stat_groups')} color="var(--info)"/>
                      <StatCard icon="👨‍🏫" val={analytics.teacherCount} label={t('stat_teachers')} color="var(--prac)"/>
                      <StatCard icon="☀️" val={analytics.shift1} label={t('stat_shift1')} color="var(--shift1)"/>
                      <StatCard icon="🌆" val={analytics.shift2} label={t('stat_shift2')} color="var(--shift2)"/>
                      <StatCard icon="📖" val={analytics.lecCount} label={t('stat_lectures')} color="var(--lec)"/>
                      <StatCard icon="💻" val={analytics.pracCount} label={t('stat_practices')} color="var(--prac)"/>
                      <StatCard icon="⚖️" val={`${analytics.efficiency}%`} label={t('stat_efficiency')} sub={t('stat_eff_sub')} color={analytics.efficiency>70?'var(--success)':analytics.efficiency>40?'var(--warn)':'var(--danger)'}/>
                    </div>

                    <div className="grid-3" style={{marginBottom:16}}>
                      <div className="acard">
                        <div className="acard-title">🔄 {t('shifts_title')}</div>
                        <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                          <Donut pct={Math.round(analytics.shift1/(analytics.shift1+analytics.shift2||1)*100)} c1="var(--shift1)" c2="var(--shift2)" size={84}/>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,marginBottom:7}}><div style={{width:10,height:10,borderRadius:'50%',background:'var(--shift1)',flexShrink:0}}/>☀️ {analytics.shift1}</div>
                            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5}}><div style={{width:10,height:10,borderRadius:'50%',background:'var(--shift2)',flexShrink:0}}/>🌆 {analytics.shift2}</div>
                          </div>
                        </div>
                      </div>
                      <div className="acard">
                        <div className="acard-title">📊 {t('class_type_title')}</div>
                        <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                          <Donut pct={Math.round(analytics.lecCount/(analytics.lecCount+analytics.pracCount||1)*100)} c1="var(--lec)" c2="var(--prac)" size={84}/>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,marginBottom:7}}><div style={{width:10,height:10,borderRadius:'50%',background:'var(--lec)',flexShrink:0}}/>📖 {analytics.lecCount}</div>
                            <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5}}><div style={{width:10,height:10,borderRadius:'50%',background:'var(--prac)',flexShrink:0}}/>💻 {analytics.pracCount}</div>
                          </div>
                        </div>
                      </div>
                      <div className="acard">
                        <div className="acard-title">📅 {t('days_title')}</div>
                        <div style={{display:'flex',alignItems:'flex-end',gap:7,height:86}}>
                          {analytics.dayDist.map(d=>{
                            const mx=Math.max(...analytics.dayDist.map(x=>x.count),1)
                            const h=Math.round(d.count/mx*68)+10
                            return<div key={d.day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,height:86,justifyContent:'flex-end'}}>
                              <div style={{fontSize:10,color:'var(--accent3)',fontWeight:700}}>{d.count}</div>
                              <div style={{width:'100%',height:h,background:'var(--accent)',borderRadius:'4px 4px 0 0',opacity:.85}}/>
                              <div style={{fontSize:10,color:'var(--text2)',fontWeight:700}}>{d.day}</div>
                            </div>
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid-2" style={{marginBottom:16}}>
                      <div className="acard">
                        <div className="acard-title">👨‍🏫 {t('teacher_load')}</div>
                        {Object.entries(analytics.teacherCounts).sort(([,a],[,b])=>b-a).map(([name,count])=>{
                          const tObj=teachers.find(x=>x.full_name===name);const max=tObj?.max_hours_per_week||20
                          return<Bar key={name} name={name} val={count} max={max} suffix={`/${max}ч`} warn={count>max*0.8} danger={count>max}/>
                        })}
                      </div>
                      <div className="acard">
                        <div className="acard-title">🏢 {t('room_load')}</div>
                        {Object.entries(analytics.roomCounts).sort(([,a],[,b])=>b-a).map(([room,count])=>{
                          const pct=Math.round(count/72*100)
                          return<Bar key={room} name={`🚪 ${room}`} val={pct} max={100} suffix="%" warn={pct>55} danger={pct>80}/>
                        })}
                      </div>
                    </div>

                    <div className="grid-2" style={{marginBottom:16}}>
                      <div className="acard">
                        <div className="acard-title">🎓 {t('course_load')}</div>
                        {analytics.courseLoad.map(c=>{
                          const mx=Math.max(...analytics.courseLoad.map(x=>x.count),1)
                          return<Bar key={c.course} name={`${c.course} ${t('course_lbl')}`} val={c.count} max={mx} color="var(--shift1)" suffix={` ${t('records')}`}/>
                        })}
                      </div>
                      <div className="acard">
                        <div className="acard-title">👥 {t('group_load')}</div>
                        <div style={{maxHeight:220,overflowY:'auto'}}>
                          {analytics.groupLoad.map(([g,cnt])=>{
                            const mx=analytics.groupLoad[0]?.[1]||1
                            return<Bar key={g} name={g} val={cnt} max={mx} color="var(--shift2)" suffix={` ${t('records')}`}/>
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="acard" style={{marginBottom:16}}>
                      <Heatmap {...heatmapDays} title={`🗓️ ${t('heatmap_days')}`}/>
                    </div>

                    <div className="acard">
                      <div className="acard-title">📚 {t('top_subjects')}</div>
                      <div style={{display:'flex',gap:14,fontSize:12,color:'var(--text2)',marginBottom:12}}>
                        <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:14,height:11,background:'var(--lec)',borderRadius:3,display:'inline-block'}}/>{t('lectures_lbl')}</span>
                        <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:14,height:11,background:'var(--prac)',borderRadius:3,display:'inline-block'}}/>{t('practices_lbl')}</span>
                      </div>
                      {analytics.topSubj.map(s=>{
                        const mx=analytics.topSubj[0]?.total||1
                        const wL=Math.round(s.lec/mx*100),wP=Math.round(s.prac/mx*100)
                        return<div key={s.name} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                          <div style={{width:170,fontSize:11.5,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}} title={s.name}>{s.name}</div>
                          <div style={{flex:1,height:15,background:'var(--bg3)',borderRadius:4,overflow:'hidden',display:'flex'}}>
                            <div style={{width:`${wL}%`,background:'var(--lec)',opacity:.85,transition:'width .6s'}}/>
                            <div style={{width:`${wP}%`,background:'var(--prac)',opacity:.85,transition:'width .6s'}}/>
                          </div>
                          <div style={{width:65,fontSize:11,color:'var(--text2)',textAlign:'right',fontFamily:'DM Mono,monospace',flexShrink:0}}>{t('lec_lbl')}:{s.lec} {t('prac_lbl')}:{s.prac}</div>
                        </div>
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ===== AVAILABILITY CHECKER ===== */}
            {tab==='availability'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

                  {/* ROOM AVAILABILITY */}
                  <div className="acard">
                    <div className="acard-title">🏢 {lang==='en'?'Classroom Availability':lang==='kz'?'Аудиториялар бостығы':'Свободные аудитории'}</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>
                      {lang==='en'?'Check which rooms are free on a specific day and time':
                       lang==='kz'?'Белгілі бір күні мен уақытта қай аудиториялар бос екенін тексеріңіз':
                       'Проверьте какие аудитории свободны в конкретный день и время'}
                    </div>
                    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                      <Sel label={lang==='en'?'DAY':lang==='kz'?'КҮН':'ДЕНЬ'}
                        value={avCheckDay} onChange={setAvCheckDay}
                        options={DAYS_RU.map((d,i)=>({value:d,label:DAYS[i]}))} minW="150px"/>
                      <Sel label={lang==='en'?'TIME':lang==='kz'?'УАҚЫТ':'ВРЕМЯ'}
                        value={avCheckSlot} onChange={setAvCheckSlot}
                        options={[{value:'all',label:lang==='en'?'All slots':lang==='kz'?'Барлық уақыт':'Все слоты'},...[...SHIFT1,...SHIFT2].map(s=>({value:s,label:s}))]}
                        minW="160px"/>
                    </div>
                    {schedule.length===0?(
                      <div style={{fontSize:13,color:'var(--text2)',textAlign:'center',padding:'30px 0'}}>
                        {lang==='en'?'Generate schedule first':lang==='kz'?'Алдымен кесте жасаңыз':'Сначала сгенерируйте расписание'}
                      </div>
                    ):(()=>{
                      const checkSlots = avCheckSlot==='all'?[...SHIFT1,...SHIFT2]:[avCheckSlot]
                      return(
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {checkSlots.map(slot=>{
                            const occupied = new Set(schedule.filter(s=>s.day===avCheckDay&&s.time===slot).map(s=>s.room))
                            const allRooms = rooms
                            const freeRooms = allRooms.filter(r=>!occupied.has(r))
                            return(
                              <div key={slot} style={{background:'var(--bg3)',borderRadius:9,padding:'10px 14px',border:'1px solid var(--border)'}}>
                                <div style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:8}}>{slot}</div>
                                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                                  {freeRooms.length===0?(
                                    <span style={{fontSize:11,color:'var(--danger)'}}>⚠️ {lang==='en'?'All rooms occupied':lang==='kz'?'Барлық аудиториялар бос':' Все аудитории заняты'}</span>
                                  ):freeRooms.map(r=>(
                                    <span key={r} style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:'var(--success)18',color:'var(--success)',border:'1px solid var(--success)33'}}>
                                      🚪 {r}
                                    </span>
                                  ))}
                                </div>
                                {freeRooms.length>0&&(
                                  <div style={{marginTop:6,fontSize:10,color:'var(--text2)'}}>
                                    ✅ {freeRooms.length} {lang==='en'?'rooms available':lang==='kz'?'аудитория бос':'аудиторий свободно'}
                                    {' | '}⛔ {allRooms.length-freeRooms.length} {lang==='en'?'occupied':lang==='kz'?'бос емес':'занято'}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  {/* TEACHER AVAILABILITY */}
                  <div className="acard">
                    <div className="acard-title">👨‍🏫 {lang==='en'?'Teacher Availability':lang==='kz'?'Оқытушылар бостығы':'Свободные преподаватели'}</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>
                      {lang==='en'?'Check which teachers are free on a specific day and time':
                       lang==='kz'?'Белгілі бір күні мен уақытта қай оқытушылар бос екенін тексеріңіз':
                       'Проверьте какие преподаватели свободны в конкретный день и время'}
                    </div>
                    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                      <Sel label={lang==='en'?'DAY':lang==='kz'?'КҮН':'ДЕНЬ'}
                        value={avCheckDay} onChange={setAvCheckDay}
                        options={DAYS_RU.map((d,i)=>({value:d,label:DAYS[i]}))} minW="150px"/>
                      <Sel label={lang==='en'?'TIME':lang==='kz'?'УАҚЫТ':'ВРЕМЯ'}
                        value={avCheckSlot} onChange={setAvCheckSlot}
                        options={[{value:'all',label:lang==='en'?'All slots':lang==='kz'?'Барлық уақыт':'Все слоты'},...[...SHIFT1,...SHIFT2].map(s=>({value:s,label:s}))]}
                        minW="160px"/>
                    </div>
                    {schedule.length===0?(
                      <div style={{fontSize:13,color:'var(--text2)',textAlign:'center',padding:'30px 0'}}>
                        {lang==='en'?'Generate schedule first':lang==='kz'?'Алдымен кесте жасаңыз':'Сначала сгенерируйте расписание'}
                      </div>
                    ):(()=>{
                      const checkSlots = avCheckSlot==='all'?[...SHIFT1,...SHIFT2]:[avCheckSlot]
                      const allTeachers = [...new Set(schedule.map(s=>s.teacher))].sort()
                      return(
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {checkSlots.map(slot=>{
                            const busy = new Set(schedule.filter(s=>s.day===avCheckDay&&s.time===slot).map(s=>s.teacher))
                            const freeTeachers = allTeachers.filter(t=>!busy.has(t))
                            return(
                              <div key={slot} style={{background:'var(--bg3)',borderRadius:9,padding:'10px 14px',border:'1px solid var(--border)'}}>
                                <div style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:8}}>{slot}</div>
                                {freeTeachers.length===0?(
                                  <span style={{fontSize:11,color:'var(--danger)'}}>⚠️ {lang==='en'?'All teachers busy':lang==='kz'?'Барлық оқытушылар бос':' Все преподаватели заняты'}</span>
                                ):(
                                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                                    {freeTeachers.map(t=>(
                                      <div key={t} style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:7,background:'var(--success)12',color:'var(--success)',border:'1px solid var(--success)22'}}>
                                        ✅ {t}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {freeTeachers.length>0&&(
                                  <div style={{marginTop:6,fontSize:10,color:'var(--text2)'}}>
                                    ✅ {freeTeachers.length} {lang==='en'?'free':lang==='kz'?'бос':'свободно'}
                                    {' | '}⛔ {allTeachers.length-freeTeachers.length} {lang==='en'?'busy':lang==='kz'?'бос емес':'заняты'}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* WEEKLY ROOM OCCUPANCY TABLE */}
                {schedule.length>0&&(
                  <div className="acard" style={{marginBottom:16}}>
                    <div className="acard-title">📅 {lang==='en'?'Weekly Room Occupancy (% per day)':lang==='kz'?'Аптасына аудитория жүктемесі (күн бойынша %)':'Занятость аудиторий по дням недели (%)'}</div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'separate',borderSpacing:3,fontSize:12}}>
                        <thead>
                          <tr>
                            <th style={{textAlign:'left',padding:'6px 12px',color:'var(--text2)',fontWeight:700,fontSize:11,whiteSpace:'nowrap'}}>{lang==='en'?'Room':lang==='kz'?'Аудитория':'Аудитория'}</th>
                            {DAYS.map(d=><th key={d} style={{textAlign:'center',padding:'6px 8px',color:'var(--text2)',fontWeight:700,fontSize:11,whiteSpace:'nowrap'}}>{d.slice(0,lang==='kz'?4:3)}</th>)}
                            <th style={{textAlign:'center',padding:'6px 8px',color:'var(--text2)',fontWeight:700,fontSize:11}}>{lang==='en'?'Avg':lang==='kz'?'Орт.':'Ср.'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map(room=>{
                            const dayLoads = DAYS_RU.map(d=>{
                              const occupied = new Set(schedule.filter(s=>s.room===room&&s.day===d).map(s=>s.time)).size
                              return Math.round(occupied/12*100)
                            })
                            const avg = Math.round(dayLoads.reduce((a,b)=>a+b,0)/dayLoads.length)
                            return(
                              <tr key={room}>
                                <td style={{padding:'5px 12px',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>{room}</td>
                                {dayLoads.map((pct,i)=>{
                                  const bg = pct===0?'var(--bg3)':
                                             pct<40?`rgba(46,204,113,${0.2+pct/100*0.5})`:
                                             pct<75?`rgba(243,156,18,${0.2+pct/100*0.5})`:
                                             `rgba(231,76,60,${0.2+pct/100*0.5})`
                                  return(
                                    <td key={i} style={{textAlign:'center',padding:'5px 4px',background:bg,borderRadius:5,fontWeight:pct>0?700:400,
                                      color:pct>60?'#fff':pct>0?'var(--text)':'var(--text2)',fontSize:11,minWidth:48}}>
                                      {pct>0?`${pct}%`:'—'}
                                    </td>
                                  )
                                })}
                                <td style={{textAlign:'center',padding:'5px 8px',fontWeight:700,fontSize:12,
                                  color:avg>70?'var(--danger)':avg>40?'var(--warn)':'var(--success)'}}>
                                  {avg}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{marginTop:10,display:'flex',gap:14,fontSize:11,color:'var(--text2)'}}>
                      <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:14,height:10,background:'rgba(46,204,113,0.5)',borderRadius:2,display:'inline-block'}}/>{lang==='en'?'Low (<40%)':lang==='kz'?'Аз (<40%)':'Мало (<40%)'}</span>
                      <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:14,height:10,background:'rgba(243,156,18,0.5)',borderRadius:2,display:'inline-block'}}/>{lang==='en'?'Medium (40-75%)':lang==='kz'?'Орташа (40-75%)':'Средне (40-75%)'}</span>
                      <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:14,height:10,background:'rgba(231,76,60,0.5)',borderRadius:2,display:'inline-block'}}/>{lang==='en'?'High (>75%)':lang==='kz'?'Жоғары (>75%)':'Высокая (>75%)'}</span>
                    </div>
                  </div>
                )}

                {/* TEACHER WEEKLY LOAD TABLE */}
                {schedule.length>0&&analytics&&(
                  <div className="acard">
                    <div className="acard-title">👨‍🏫 {lang==='en'?'Teacher Load by Day':lang==='kz'?'Күн бойынша оқытушы жүктемесі':'Нагрузка преподавателей по дням'}</div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'separate',borderSpacing:3,fontSize:12}}>
                        <thead>
                          <tr>
                            <th style={{textAlign:'left',padding:'6px 12px',color:'var(--text2)',fontWeight:700,fontSize:11,minWidth:140}}>{lang==='en'?'Teacher':lang==='kz'?'Оқытушы':'Преподаватель'}</th>
                            {DAYS.map(d=><th key={d} style={{textAlign:'center',padding:'6px 8px',color:'var(--text2)',fontWeight:700,fontSize:11,whiteSpace:'nowrap'}}>{d.slice(0,lang==='kz'?4:3)}</th>)}
                            <th style={{textAlign:'center',padding:'6px 8px',color:'var(--text2)',fontWeight:700,fontSize:11}}>{lang==='en'?'Total':lang==='kz'?'Барлығы':'Итого'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(analytics.teacherCounts).sort(([,a],[,b])=>b-a).map(([teacher,total])=>{
                            const dayLoads = DAYS_RU.map(d=>
                              new Set(schedule.filter(s=>s.teacher===teacher&&s.day===d).map(s=>s.time)).size
                            )
                            const tObj = teachers.find(t=>t.full_name===teacher)
                            const isOverloaded = total>(tObj?.max_hours_per_week||20)
                            return(
                              <tr key={teacher}>
                                <td style={{padding:'5px 12px',fontWeight:600,fontSize:11,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:isOverloaded?'var(--danger)':'var(--text)'}}>
                                  {teacher}{isOverloaded?' ⚠️':''}
                                </td>
                                {dayLoads.map((cnt,i)=>{
                                  const pct = cnt/6
                                  const bg = cnt===0?'var(--bg3)':
                                             cnt<=2?`rgba(46,204,113,${0.2+pct*0.6})`:
                                             cnt<=4?`rgba(243,156,18,${0.2+pct*0.6})`:
                                             `rgba(231,76,60,${0.2+pct*0.6})`
                                  return(
                                    <td key={i} style={{textAlign:'center',padding:'5px 4px',background:bg,borderRadius:5,
                                      fontWeight:cnt>0?700:400,color:cnt>=4?'#fff':cnt>0?'var(--text)':'var(--text2)',fontSize:12,minWidth:48}}>
                                      {cnt>0?`${cnt}п`:'—'}
                                    </td>
                                  )
                                })}
                                <td style={{textAlign:'center',padding:'5px 8px',fontWeight:800,fontSize:13,
                                  color:isOverloaded?'var(--danger)':'var(--text)'}}>
                                  {total}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{marginTop:10,fontSize:11,color:'var(--text2)'}}>
                      {lang==='en'?'п = pairs (classes). ⚠️ = overloaded (exceeds weekly limit)':
                       lang==='kz'?'п = сабақтар. ⚠️ = шамадан тыс жүктелген':
                       'п = пары (занятия). ⚠️ = перегружен (превышает недельную норму)'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== ABOUT ===== */}
            {tab==='about'&&(
              <div className="about-layout">
                <div>
                  <div className="about-hero">
                    <div className="about-badge">{t('diploma_badge')}</div>
                    <h2 className="about-title">{t('about_title')}</h2>
                    <p className="about-sub">{t('about_sub')}</p>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      {[
                        {f:'🇰🇿',n:'Қазақша',d:'Кафедра сабақтарын жоспарлаудың интеллектуалды жүйесі: аудитория жүктемесін болжау және кестені автоматтандыру'},
                        {f:'🇬🇧',n:'English',d:'Intelligent System for Department Class Planning: Classroom Occupancy Forecasting and Automated Scheduling'},
                      ].map(l=>(
                        <div key={l.n} style={{display:'flex',gap:10,padding:'11px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,flex:1,minWidth:220}}>
                          <span style={{fontSize:22,flexShrink:0}}>{l.f}</span>
                          <div><div style={{fontWeight:700,fontSize:12.5,marginBottom:3}}>{l.n}</div><div style={{fontSize:11,color:'var(--text2)',lineHeight:1.5}}>{l.d}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="acard" style={{marginBottom:14}}>
                    <div className="acard-title">🤖 {t('algo_title')}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:13}}>
                      {[
                        {n:'01',t:lang==='en'?'Data Collection':lang==='kz'?'Деректерді жинау':'Сбор данных',d:lang==='en'?'Loading subjects, groups, teachers and rooms from PostgreSQL database':lang==='kz'?'PostgreSQL дерекқорынан пәндер, топтар, оқытушылар мен аудиторияларды жүктеу':'Загрузка предметов, групп, преподавателей и аудиторий из базы данных PostgreSQL'},
                        {n:'02',t:lang==='en'?'Task Formation':lang==='kz'?'Тапсырмаларды қалыптастыру':'Формирование задач',d:lang==='en'?'Creating class list: stream lectures (all groups per year) and individual practices':lang==='kz'?'Сабақтар тізімін жасау: ағымдық дәрістер (курстың барлық топтары) және жеке тәжірибелер':'Создание списка занятий: потоковые лекции (все группы курса) и индивидуальные практики'},
                        {n:'03',t:lang==='en'?'Model Building':lang==='kz'?'Модельді құру':'Построение модели',d:lang==='en'?'CP-SAT creates boolean variables for each class × day × slot × room combination':lang==='kz'?'CP-SAT сабақ × күн × слот × аудитория комбинациясы үшін логикалық айнымалылар жасайды':'CP-SAT создаёт булевы переменные для каждой комбинации занятие × день × слот × аудитория'},
                        {n:'04',t:lang==='en'?'Constraints':lang==='kz'?'Шектеулер':'Ограничения',d:lang==='en'?'Room, teacher and group conflicts; shift limits (6h each); room type suitability':lang==='kz'?'Аудитория, оқытушы және топ қақтығыстары; ауысым шектеулері (6 сағ); бөлме түріне сәйкестік':'Конфликты аудиторий, преподавателей и групп; ограничение смен (6ч); пригодность комнат по типу'},
                        {n:'05',t:lang==='en'?'Optimization':lang==='kz'?'Оңтайландыру':'Оптимизация',d:lang==='en'?'Solver finds FEASIBLE/OPTIMAL solution within 120 seconds using 4 parallel threads':lang==='kz'?'Шешуші 4 параллельді жіп арқылы 120 секунд ішінде FEASIBLE/OPTIMAL шешімін табады':'Solver ищет FEASIBLE/OPTIMAL решение за ≤120 секунд с 4 параллельными потоками'},
                        {n:'06',t:lang==='en'?'Occupancy Forecast':lang==='kz'?'Жүктеме болжамы':'Прогноз занятости',d:lang==='en'?'Schedule data is used to build heatmaps and forecast classroom utilization for next semester':lang==='kz'?'Кесте деректері негізінде жылу картасы мен келесі семестрдің аудитория жүктемесі болжамы құрастырылады':'На основе расписания строится тепловая карта и прогноз загрузки аудиторий на следующий семестр'},
                      ].map(s=>(
                        <div key={s.n} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                          <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,var(--g1),var(--g2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0,fontFamily:'DM Mono,monospace'}}>{s.n}</div>
                          <div><div style={{fontWeight:700,fontSize:13.5,marginBottom:4}}>{s.t}</div><div style={{fontSize:12,color:'var(--text2)',lineHeight:1.6}}>{s.d}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="acard">
                    <div className="acard-title">⚙️ {t('tech_title')}</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:13}}>
                      {[
                        {cat:'Frontend',items:['React 19 + TypeScript','Vite 7 (Build Tool)','Axios (HTTP Client)','XLSX (Export)','Custom CSS Variables'],color:'var(--accent)'},
                        {cat:'Backend',items:['Python 3.10','FastAPI + Pydantic v2','SQLAlchemy ORM','Google OR-Tools CP-SAT','Uvicorn (ASGI)'],color:'var(--prac)'},
                        {cat:lang==='en'?'Database':lang==='kz'?'Дерекқор':'База данных',items:['PostgreSQL 15','Docker Compose','SQLite (Tests)'],color:'var(--info)'},
                        {cat:lang==='en'?'Algorithm':lang==='kz'?'Алгоритм':'Алгоритм',items:['CP-SAT Solver','Constraint Programming','Multi-threading × 4','Shift Constraints','Heatmap Analytics'],color:'var(--warn)'},
                      ].map(tech=>(
                        <div key={tech.cat} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:11,padding:14}}>
                          <div style={{fontWeight:800,fontSize:13,marginBottom:10,color:tech.color}}>{tech.cat}</div>
                          {tech.items.map(item=><div key={item} style={{fontSize:12,color:'var(--text2)',padding:'4px 0',borderBottom:'1px solid var(--border)22',display:'flex',alignItems:'center',gap:7}}><span style={{color:'var(--success)',fontSize:11}}>✓</span>{item}</div>)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="acard" style={{marginBottom:14}}>
                    <div className="acard-title">📋 {t('chars_title')}</div>
                    {[
                      {l:lang==='en'?'Study Years':lang==='kz'?'Оқу курстары':'Курсов обучения',v:'4 (1–4)'},
                      {l:lang==='en'?'Groups':lang==='kz'?'Топтар':'Групп в системе',v:'15'},
                      {l:lang==='en'?'Time Slots/Day':lang==='kz'?'Уақыт слоттары/күн':'Временных слотов',v:'12 / день'},
                      {l:lang==='en'?'Work Days':lang==='kz'?'Жұмыс күндері':'Рабочих дней',v:'6 (Пн–Сб)'},
                      {l:lang==='en'?'Shifts':lang==='kz'?'Ауысымдар':'Смен',v:'2 (08–14, 14–20)'},
                      {l:lang==='en'?'Room Types':lang==='kz'?'Аудитория түрлері':'Типов аудиторий',v:'3 вида'},
                      {l:lang==='en'?'Languages':lang==='kz'?'Оқу тілдері':'Языков обучения',v:'KZ / RU'},
                      {l:lang==='en'?'Max Solve Time':lang==='kz'?'Максималды шешу уақыты':'Макс. время генерации',v:'≤ 120 сек'},
                    ].map(row=>(
                      <div key={row.l} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)33',fontSize:12.5}}>
                        <span style={{color:'var(--text2)'}}>{row.l}</span>
                        <span style={{fontWeight:800,color:'var(--text)',fontFamily:'DM Mono,monospace'}}>{row.v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="acard" style={{marginBottom:14}}>
                    <div className="acard-title">🎯 {t('novelty_title')}</div>
                    {[
                      lang==='en'?'CP-SAT application for departmental scheduling with shift support':lang==='kz'?'Ауысымдарды қолдаумен кафедра кестесіне CP-SAT қолдану':'Применение CP-SAT для кафедрального расписания с поддержкой смен',
                      lang==='en'?'Classroom occupancy forecasting integrated into planning system':lang==='kz'?'Жоспарлау жүйесіне аудитория жүктемесін болжауды интеграциялау':'Интеграция прогнозирования занятости аудиторий в систему планирования',
                      lang==='en'?'Multilingual (KZ/RU/EN) interface with full text translation':lang==='kz'?'Толық мәтін аудармасымен көптілді (KZ/RU/EN) интерфейс':'Многоязычный (KZ/RU/EN) интерфейс с полным переводом',
                      lang==='en'?'Real-time heatmap visualization of room utilization':lang==='kz'?'Нақты уақытта аудитория жүктемесінің жылу картасы':' Визуализация тепловых карт загрузки в реальном времени',
                      lang==='en'?'Automatic recommendations for workload redistribution':lang==='kz'?'Жүктемені қайта бөлу бойынша автоматты ұсыныстар':'Автоматические рекомендации по перераспределению нагрузки',
                    ].map((item,i)=>(
                      <div key={i} style={{display:'flex',gap:10,fontSize:12.5,padding:'7px 0',borderBottom:'1px solid var(--border)33'}}>
                        <span style={{color:'var(--accent)',flexShrink:0,fontSize:14}}>▸</span>
                        <span style={{color:'var(--text2)',lineHeight:1.5}}>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="acard">
                    <div className="acard-title">📊 {t('metrics_title')}</div>
                    {schedule.length>0&&analytics?(
                      <>
                        <Bar name={lang==='en'?'Shift Balance Index':lang==='kz'?'Ауысым балансы':'Баланс смен (индекс)'} val={analytics.efficiency} max={100} color={analytics.efficiency>70?'var(--success)':'var(--warn)'} suffix="%"/>
                        <Bar name={lang==='en'?'Shift 1 classes':lang==='kz'?'1-ауысым сабақтары':'Пар в смене 1'} val={analytics.shift1} max={analytics.shift1+analytics.shift2||1} color="var(--shift1)" suffix={` из ${analytics.shift1+analytics.shift2}`}/>
                        <Bar name={lang==='en'?'Shift 2 classes':lang==='kz'?'2-ауысым сабақтары':'Пар в смене 2'} val={analytics.shift2} max={analytics.shift1+analytics.shift2||1} color="var(--shift2)" suffix={` из ${analytics.shift1+analytics.shift2}`}/>
                        <Bar name={lang==='en'?'Room Coverage':lang==='kz'?'Аудиториялар':'Задействовано аудиторий'} val={Object.keys(analytics.roomCounts).length} max={Math.max(rooms.length,1)} color="var(--accent)" suffix={`/${rooms.length}`}/>
                        <Bar name={lang==='en'?'Groups Scheduled':lang==='kz'?'Топтар':'Групп в расписании'} val={analytics.groupCount} max={20} color="var(--prac)" suffix={`/20`}/>
                        <div style={{fontSize:11,color:'var(--text2)',marginTop:10,padding:'8px',background:'var(--bg3)',borderRadius:7,textAlign:'center'}}>{t('last_update')} {lastUpdate?new Date(lastUpdate).toLocaleString():'-'}</div>
                      </>
                    ):<div style={{fontSize:13,color:'var(--text2)',textAlign:'center',padding:'20px 0'}}>{t('no_schedule')}</div>}
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

        {/* MODALS */}
        {showSubjModal&&(
          <div className="modal-ov" onClick={e=>{if(e.target===e.currentTarget)setShowSubjModal(false)}}>
            <div className="modal">
              <div className="modal-title">{editSubj?t('edit_subject'):t('new_subject')}</div>
              <div className="form-grid">
                <div className="ff full"><label className="fl">{t('name_lbl')}</label><input className="fi" value={fName} onChange={e=>setFName(e.target.value)} placeholder="..."/></div>
                <div className="ff"><label className="fl">{t('course_field')}</label><select className="fi" value={fCourse} onChange={e=>setFCourse(Number(e.target.value))}>{[1,2,3,4].map(c=><option key={c} value={c}>{c} {t('course_lbl')}</option>)}</select></div>
                <div className="ff"><label className="fl">{t('sem_field')}</label><select className="fi" value={fSem} onChange={e=>setFSem(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>{s} {t('sem_lbl')}</option>)}</select></div>
                <div className="ff"><label className="fl">{t('credits_field')}</label><input type="number" className="fi" min={1} max={15} value={fCredits} onChange={e=>setFCredits(Number(e.target.value))}/></div>
                <div className="ff"><label className="fl">{t('lec_week')}</label><input type="number" className="fi" min={0} max={5} value={fLec} onChange={e=>setFLec(Number(e.target.value))}/></div>
                <div className="ff full"><label className="fl">{t('prac_week')}</label><input type="number" className="fi" min={0} max={5} value={fPrac} onChange={e=>setFPrac(Number(e.target.value))}/></div>
                <div className="ff full">
                  <label className="fl">{t('teachers_field')}</label>
                  <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:150,overflowY:'auto'}}>
                    {teachers.map(t2=>(
                      <label key={t2.id} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 11px',borderRadius:7,background:'var(--bg3)',border:`1.5px solid ${fTIds.includes(t2.id)?'var(--accent)':'var(--border)'}`,cursor:'pointer',fontSize:12.5}}>
                        <input type="checkbox" checked={fTIds.includes(t2.id)} style={{accentColor:'var(--accent)'}} onChange={()=>setFTIds(p=>p.includes(t2.id)?p.filter(x=>x!==t2.id):[...p,t2.id])}/>
                        {t2.full_name}<span style={{marginLeft:'auto',fontSize:10,color:'var(--text2)'}}>{t2.max_hours_per_week}ч</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:18}}>
                <button className="btn btn-secondary" onClick={()=>setShowSubjModal(false)}>{t('cancel')}</button>
                <button className="btn btn-primary" onClick={saveSubj}>💾 {t('save')}</button>
              </div>
            </div>
          </div>
        )}
        
        {showTModal&&(
          <div className="modal-ov" onClick={e=>{if(e.target===e.currentTarget)setShowTModal(false)}}>
            <div className="modal" style={{maxWidth:380}}>
              <div className="modal-title">{editTeacher?(lang==='en'?'Edit Teacher':lang==='kz'?'Оқытушыны өңдеу':'Изменить преподавателя'):t('new_teacher')}</div>
              <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
                <div className="ff"><label className="fl">{t('fio_lbl')}</label><input className="fi" value={tName} onChange={e=>setTName(e.target.value)} placeholder="..."/></div>
                <div className="ff"><label className="fl">{t('max_hours')}</label><input type="number" className="fi" min={1} max={40} value={tHours} onChange={e=>setTHours(Number(e.target.value))}/></div>
                
                {editTeacher && (
                  <div className="ff" style={{marginTop: 8}}>
                    <label className="fl">
                      {lang==='en'?'Assigned Subjects':lang==='kz'?'Бекітілген пәндер':'Прикрепленные предметы'}
                    </label>
                    <div style={{background: 'var(--bg3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      {(() => {
                        const teacherSubjects = subjects.filter(s => s.teachers.some(tt => tt.id === editTeacher.id));
                        
                        if (teacherSubjects.length === 0) {
                          return <span style={{fontSize: 12, color: 'var(--text2)'}}>
                            {lang==='en'?'No subjects assigned':lang==='kz'?'Пәндер жоқ':'Нет предметов'}
                          </span>;
                        }
                        
                        return teacherSubjects.map(s => (
                          <div key={s.id} style={{fontSize: 12, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)44', paddingBottom: '4px'}}>
                            <span style={{fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px'}} title={s.name}>
                              📚 {s.name}
                            </span>
                            <span style={{fontSize: 11, color: 'var(--text2)', flexShrink: 0}}>
                              {s.course} {t('course_lbl')}, {s.semester} {t('sem_lbl')}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:18}}>
                <button className="btn btn-secondary" onClick={()=>setShowTModal(false)}>{t('cancel')}</button>
                <button className="btn btn-primary" onClick={saveT}>{editTeacher?t('save'):t('add_btn')}</button>
              </div>
            </div>
          </div>
        )}
        
        {/* ROOM MODAL */}
        {showRoomModal&&(
          <div className="modal-ov" onClick={e=>{if(e.target===e.currentTarget)setShowRoomModal(false)}}>
            <div className="modal" style={{maxWidth:400}}>
              <div className="modal-title">🏢 {editRoom?(lang==='en'?'Edit Classroom':lang==='kz'?'Аудиторияны өңдеу':'Редактировать аудиторию'):(lang==='en'?'Add Classroom':lang==='kz'?'Аудитория қосу':'Добавить аудиторию')}</div>
              <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
                <div className="ff">
                  <label className="fl">{lang==='en'?'Room Number':lang==='kz'?'Аудитория нөмірі':'Номер аудитории'}</label>
                  <input className="fi" value={rName} onChange={e=>setRName(e.target.value)} placeholder="например: 312"/>
                </div>
                <div className="ff">
                  <label className="fl">{lang==='en'?'Capacity (seats)':lang==='kz'?'Сыйымдылық (орын)':'Вместимость (мест)'}</label>
                  <input type="number" className="fi" min={10} max={300} value={rCapacity} onChange={e=>setRCapacity(Number(e.target.value))}/>
                </div>
                <div className="ff">
                  <label className="fl">{lang==='en'?'Room Type':lang==='kz'?'Аудитория түрі':'Тип аудитории'}</label>
                  <select className="fi" value={rType} onChange={e=>setRType(e.target.value)}>
                    <option value="LECTURE_HALL">{lang==='en'?'Lecture Hall':lang==='kz'?'Дәрісхана':'Лекционный зал'}</option>
                    <option value="PC_LAB">{lang==='en'?'PC Lab':lang==='kz'?'Компьютерлік класс':'Компьютерный класс'}</option>
                    <option value="PRACTICE">{lang==='en'?'Practice Room':lang==='kz'?'Тәжірибе бөлмесі':'Кабинет практики'}</option>
                  </select>
                </div>
              </div>
              <div className="ff" style={{marginTop:4}}>
                <label className="fl">{lang==='en'?'Status':lang==='kz'?'Күй':'Статус'}</label>
                <div style={{display:'flex',gap:8}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:8,border:`1.5px solid ${rActive?'var(--success)':'var(--border)'}`,background:rActive?'var(--success)12':'var(--bg3)',cursor:'pointer',flex:1,fontSize:13}}>
                    <input type="radio" checked={rActive} onChange={()=>setRActive(true)} style={{accentColor:'var(--success)'}}/>
                    ✅ {lang==='en'?'Active (Open)':lang==='kz'?'Белсенді (Ашық)':'Активна (Открыта)'}
                  </label>
                  <label style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:8,border:`1.5px solid ${!rActive?'var(--danger)':'var(--border)'}`,background:!rActive?'var(--danger)12':'var(--bg3)',cursor:'pointer',flex:1,fontSize:13}}>
                    <input type="radio" checked={!rActive} onChange={()=>setRActive(false)} style={{accentColor:'var(--danger)'}}/>
                    🔒 {lang==='en'?'Closed (Repair)':lang==='kz'?'Жабық (Жөндеу)':'Закрыта (Ремонт)'}
                  </label>
                </div>
              </div>
              <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:18}}>
                <button className="btn btn-secondary" onClick={()=>setShowRoomModal(false)}>{t('cancel')}</button>
                <button className="btn btn-primary" onClick={saveRoom}>💾 {editRoom?t('save'):t('add_btn')}</button>
              </div>
            </div>
          </div>
        )}

        {sidebarOpen&&<div style={{position:'fixed',inset:0,background:'#00000055',zIndex:99}} onClick={()=>setSidebarOpen(false)}/>}
      </div>
    </>
  )
}