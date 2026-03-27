from sqlalchemy.orm import Session
from app import models
from ortools.sat.python import cp_model
import collections

SHIFT_1_SLOTS = [
    "08:00-08:50", "09:00-09:50", "10:00-10:50",
    "11:10-12:00", "12:10-13:00", "13:10-14:00"
]
SHIFT_2_SLOTS = [
    "14:10-15:00", "15:10-16:00", "16:10-17:00",
    "17:10-18:00", "18:10-19:00", "19:10-20:00"
]
TIME_SLOTS = SHIFT_1_SLOTS + SHIFT_2_SLOTS
DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
N_DAYS = len(DAYS)

COURSE_TO_SHIFT = {1: 1, 2: 2, 3: 1, 4: 2}
SHIFT_1_INDICES = list(range(0, 6))
SHIFT_2_INDICES = list(range(6, 12))

MAX_PAIRS_PER_DAY = 4


def _solve_for_semesters(db, rooms, teachers, groups, target_sems):
    # Only use active rooms
    active_rooms = [r for r in rooms if getattr(r, 'is_active', True)]

    subjects = [
        s for s in db.query(models.Subject)
                     .filter(models.Subject.semester.in_(target_sems))
                     .all()
        if s.lectures_per_week > 0 or s.practices_per_week > 0
    ]
    print(f"  Семестры {target_sems}: {len(subjects)} предметов, "
          f"аудиторий: {len(active_rooms)}")

    room_map    = {r.id: r for r in active_rooms}
    teacher_map = {t.id: t for t in teachers}
    group_map   = {g.id: g for g in groups}

    batches = collections.defaultdict(list)
    for g in groups:
        batches[(g.course, g.language)].append(g)

    tcounters = collections.defaultdict(int)
    def pick_teacher(s_obj):
        if not s_obj.teachers:
            return None
        t = s_obj.teachers[tcounters[s_obj.id] % len(s_obj.teachers)]
        tcounters[s_obj.id] += 1
        return t.id

    classes = []
    # sport_pairs: list of (idx1, idx2) — пары физкультуры которые идут подряд
    sport_pair_indices = []

    for (course, lang_val), batch in batches.items():
        for s_obj in [s for s in subjects if s.course == course]:
            if s_obj.lectures_per_week == 0:
                continue
            t_id = pick_teacher(s_obj)
            if not t_id:
                continue
            is_sport = "физическая культура" in s_obj.name.lower()
            for _ in range(s_obj.lectures_per_week):
                classes.append({
                    "group_ids": [g.id for g in batch],
                    "subject_id": s_obj.id,
                    "subject_semester": s_obj.semester,
                    "teacher": t_id,
                    "is_lecture": True,
                    "course": course,
                    "required_shift": COURSE_TO_SHIFT[course],
                    "is_sport": is_sport,
                })

    for group in groups:
        for s_obj in [s for s in subjects if s.course == group.course]:
            if s_obj.practices_per_week == 0:
                continue
            t_id = pick_teacher(s_obj)
            if not t_id:
                continue
            is_sport = "физическая культура" in s_obj.name.lower()
            # Физкультура: 2 пары подряд в 1 день
            # Создаём их как пару связанных занятий
            if is_sport and s_obj.practices_per_week >= 2:
                # Создаём ровно одну пару из 2 слотов
                idx1 = len(classes)
                classes.append({
                    "group_ids": [group.id],
                    "subject_id": s_obj.id,
                    "subject_semester": s_obj.semester,
                    "teacher": t_id,
                    "is_lecture": False,
                    "course": group.course,
                    "required_shift": COURSE_TO_SHIFT[group.course],
                    "is_sport": True,
                    "sport_slot": "first",
                })
                idx2 = len(classes)
                classes.append({
                    "group_ids": [group.id],
                    "subject_id": s_obj.id,
                    "subject_semester": s_obj.semester,
                    "teacher": t_id,
                    "is_lecture": False,
                    "course": group.course,
                    "required_shift": COURSE_TO_SHIFT[group.course],
                    "is_sport": True,
                    "sport_slot": "second",
                })
                sport_pair_indices.append((idx1, idx2))
            else:
                for _ in range(s_obj.practices_per_week):
                    classes.append({
                        "group_ids": [group.id],
                        "subject_id": s_obj.id,
                        "subject_semester": s_obj.semester,
                        "teacher": t_id,
                        "is_lecture": False,
                        "course": group.course,
                        "required_shift": COURSE_TO_SHIFT[group.course],
                        "is_sport": is_sport,
                    })

    if not classes:
        return []
    print(f"  Занятий: {len(classes)} (пар физкультуры: {len(sport_pair_indices)})")

    model = cp_model.CpModel()
    all_vars = {}

    for c_idx, task in enumerate(classes):
        s_obj    = db.query(models.Subject).get(task["subject_id"])
        is_sport = task.get("is_sport", False)
        is_lec   = task["is_lecture"]
        allowed  = (SHIFT_1_INDICES if task["required_shift"] == 1
                    else SHIFT_2_INDICES)

        valid_rooms = []
        for r in active_rooms:
            if is_sport:
                if r.name == "Спортзал":
                    valid_rooms.append(r)
            else:
                if r.name == "Спортзал":
                    continue
                if is_lec and r.room_type == models.RoomTypeEnum.LECTURE_HALL:
                    valid_rooms.append(r)
                elif not is_lec and r.room_type in (
                        models.RoomTypeEnum.PC_LAB,
                        models.RoomTypeEnum.PRACTICE):
                    valid_rooms.append(r)

        if not valid_rooms and not is_sport:
            valid_rooms = [r for r in active_rooms if r.name != "Спортзал"]
        if not valid_rooms:
            continue

        task_vars = []
        for d in range(N_DAYS):
            for s in allowed:
                for r in valid_rooms:
                    var = model.NewBoolVar(f'x{c_idx}_{d}_{s}_{r.id}')
                    all_vars[(c_idx, d, s, r.id)] = var
                    task_vars.append(var)
        if task_vars:
            model.AddExactlyOne(task_vars)

    # ── Конфликты ────────────────────────────────────────────────
    room_use    = collections.defaultdict(list)
    teacher_use = collections.defaultdict(list)
    group_use   = collections.defaultdict(list)

    for (c_idx, d, s, r_id), var in all_vars.items():
        task = classes[c_idx]
        room_use[(r_id, d, s)].append(var)
        teacher_use[(task["teacher"], d, s)].append(var)
        for g_id in task["group_ids"]:
            group_use[(g_id, d, s)].append(var)

    for v in room_use.values():    model.AddAtMostOne(v)
    for v in teacher_use.values(): model.AddAtMostOne(v)
    for v in group_use.values():   model.AddAtMostOne(v)

    # ── ФИЗКУЛЬТУРА: 2 пары подряд в один день ───────────────────
    for idx1, idx2 in sport_pair_indices:
        # Собираем переменные первой и второй пары
        vars1 = {(d, s, r_id): var
                 for (ci, d, s, r_id), var in all_vars.items() if ci == idx1}
        vars2 = {(d, s, r_id): var
                 for (ci, d, s, r_id), var in all_vars.items() if ci == idx2}

        allowed = (SHIFT_1_INDICES
                   if classes[idx1]["required_shift"] == 1
                   else SHIFT_2_INDICES)

        for d in range(N_DAYS):
            for s in allowed:
                # Если первая пара в слоте s, вторая должна быть в s+1
                s_next = s + 1
                if s_next not in allowed:
                    # Нет следующего слота в смене — запрещаем первую пару здесь
                    for r_id in room_map:
                        if (d, s, r_id) in vars1:
                            model.Add(vars1[(d, s, r_id)] == 0)
                    continue

                for r_id in room_map:
                    if (d, s, r_id) not in vars1:
                        continue
                    v1 = vars1[(d, s, r_id)]
                    # Если v1=1, то вторая пара должна быть в (d, s+1, r_id)
                    v2 = vars2.get((d, s_next, r_id))
                    if v2 is None:
                        model.Add(v1 == 0)
                    else:
                        model.Add(v2 == 1).OnlyEnforceIf(v1)

        # Обе пары должны быть в один день
        day_vars1 = collections.defaultdict(list)
        day_vars2 = collections.defaultdict(list)
        for (d, s, r_id), var in vars1.items():
            day_vars1[d].append(var)
        for (d, s, r_id), var in vars2.items():
            day_vars2[d].append(var)

        for d in range(N_DAYS):
            d1_on = model.NewBoolVar(f'sp1_{idx1}_{d}')
            d2_on = model.NewBoolVar(f'sp2_{idx2}_{d}')
            if day_vars1[d]:
                model.AddMaxEquality(d1_on, day_vars1[d])
            else:
                model.Add(d1_on == 0)
            if day_vars2[d]:
                model.AddMaxEquality(d2_on, day_vars2[d])
            else:
                model.Add(d2_on == 0)
            # Если первая пара в день d, вторая тоже должна быть в день d
            model.Add(d1_on == d2_on)

    # ── ФИЗКУЛЬТУРА: буфер 1 слот (≈60 мин) до и после ─────────
    # Пара физкультуры занимает слоты (s, s+1).
    # Требуем: слот s-1 свободен (60 мин до) и слот s+2 свободен (60 мин после).
    for idx1, idx2 in sport_pair_indices:
        task = classes[idx1]
        allowed = (SHIFT_1_INDICES if task["required_shift"] == 1
                   else SHIFT_2_INDICES)
        for (ci, d, s, r_id), sport_var in all_vars.items():
            if ci != idx1:
                continue
            # Слот ПЕРЕД физкультурой (s-1) должен быть свободен у группы
            s_before = s - 1
            if s_before in allowed:
                for g_id in task["group_ids"]:
                    blocked = group_use.get((g_id, d, s_before), [])
                    for bv in blocked:
                        # sport_var=1 → bv=0
                        model.Add(bv + sport_var <= 1)
            # Слот ПОСЛЕ второй пары физкультуры (s+2) должен быть свободен
            s_after = s + 2   # s+1 занят второй парой, s+2 = первый после
            if s_after in allowed:
                for g_id in task["group_ids"]:
                    blocked = group_use.get((g_id, d, s_after), [])
                    for bv in blocked:
                        model.Add(bv + sport_var <= 1)

    # ── busy[(g_id, d, s)] ───────────────────────────────────────
    busy = {}
    for g in groups:
        allowed_s = (SHIFT_1_INDICES if COURSE_TO_SHIFT[g.course] == 1
                     else SHIFT_2_INDICES)
        for d in range(N_DAYS):
            for s in allowed_s:
                vars_here = group_use.get((g.id, d, s), [])
                if not vars_here:
                    continue
                bv = model.NewBoolVar(f'b_{g.id}_{d}_{s}')
                busy[(g.id, d, s)] = bv
                model.AddMaxEquality(bv, vars_here)

    # ── Максимум MAX_PAIRS_PER_DAY пар ───────────────────────────
    for g in groups:
        allowed_s = (SHIFT_1_INDICES if COURSE_TO_SHIFT[g.course] == 1
                     else SHIFT_2_INDICES)
        for d in range(N_DAYS):
            day_bvs = [busy[(g.id, d, s)]
                       for s in allowed_s if (g.id, d, s) in busy]
            if day_bvs:
                model.Add(sum(day_bvs) <= MAX_PAIRS_PER_DAY)

    # ── Нет окон ─────────────────────────────────────────────────
    for g in groups:
        allowed_s = (SHIFT_1_INDICES if COURSE_TO_SHIFT[g.course] == 1
                     else SHIFT_2_INDICES)
        for d in range(N_DAYS):
            for idx, s in enumerate(allowed_s):
                prev_bv = [busy[(g.id, d, ps)]
                           for ps in allowed_s[:idx] if (g.id, d, ps) in busy]
                next_bv = [busy[(g.id, d, ns)]
                           for ns in allowed_s[idx+1:] if (g.id, d, ns) in busy]
                if not prev_bv or not next_bv:
                    continue
                has_prev = model.NewBoolVar(f'hp_{g.id}_{d}_{s}')
                has_next = model.NewBoolVar(f'hn_{g.id}_{d}_{s}')
                model.AddMaxEquality(has_prev, prev_bv)
                model.AddMaxEquality(has_next, next_bv)
                bv_curr = busy.get((g.id, d, s))
                if bv_curr is None:
                    model.Add(has_prev + has_next <= 1)
                else:
                    model.Add(has_prev + has_next <= 1 + bv_curr)

    # ── Целевая: поощряем больше активных дней ───────────────────
    day_on_vars = []
    for g in groups:
        allowed_s = (SHIFT_1_INDICES if COURSE_TO_SHIFT[g.course] == 1
                     else SHIFT_2_INDICES)
        for d in range(N_DAYS):
            day_bvs = [busy[(g.id, d, s)]
                       for s in allowed_s if (g.id, d, s) in busy]
            if day_bvs:
                day_on = model.NewBoolVar(f'don_{g.id}_{d}')
                model.AddMaxEquality(day_on, day_bvs)
                day_on_vars.append(day_on)

    if day_on_vars:
        model.Minimize(-3 * sum(day_on_vars))

    # ── Решение ──────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 180.0
    solver.parameters.num_search_workers  = 4
    solver.parameters.log_search_progress = False
    status = solver.Solve(model)
    print(f"  Solver: {solver.StatusName(status)}")

    result = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (c_idx, d, s, r_id), var in all_vars.items():
            if solver.Value(var):
                task  = classes[c_idx]
                s_obj = db.query(models.Subject).get(task["subject_id"])
                t_obj = teacher_map[task["teacher"]]
                r_obj = room_map[r_id]
                shift = 1 if s in SHIFT_1_INDICES else 2
                for g_id in task["group_ids"]:
                    g_obj = group_map[g_id]
                    result.append({
                        "day":             DAYS[d],
                        "time":            TIME_SLOTS[s],
                        "time_index":      s,
                        "group":           g_obj.name,
                        "subject":         s_obj.name,
                        "teacher":         t_obj.full_name,
                        "room":            r_obj.name,
                        "class_type":      "Лекция" if task["is_lecture"] else "Практика",
                        "shift":           shift,
                        "course":          g_obj.course,
                        "language":        g_obj.language.value,
                        "semester":        task["subject_semester"],
                    })

        # Статистика
        from collections import defaultdict
        gd = defaultdict(lambda: defaultdict(list))
        for r in result:
            gd[r["group"]][r["day"]].append(r["time_index"])
        total_gaps, day_counts, ppd = 0, [], []
        for grp, days in gd.items():
            day_counts.append(len(days))
            for day, slots in days.items():
                sl = sorted(set(slots))
                ppd.append(len(sl))
                for i in range(len(sl)-1):
                    total_gaps += sl[i+1]-sl[i]-1
        if day_counts:
            print(f"  Окон: {total_gaps} | "
                  f"Дней/группа: {sum(day_counts)/len(day_counts):.1f} | "
                  f"Пар/день: {sum(ppd)/len(ppd):.1f}")
    else:
        print(f"  WARN: не найдено для {target_sems}")
    return result


def generate_schedule(db: Session, semester: int = None):
    print(f"\n--- ГЕНЕРАЦИЯ (полугодие={semester}) ---")
    print(f"  Смена 1: курсы 1,3  |  Смена 2: курсы 2,4  |  Макс. пар/день: {MAX_PAIRS_PER_DAY}")

    rooms    = db.query(models.Room).all()
    teachers = db.query(models.Teacher).all()
    groups   = db.query(models.StudentGroup).all()

    if semester == 1:
        result = _solve_for_semesters(db, rooms, teachers, groups, [1,3,5,7])
    elif semester == 2:
        result = _solve_for_semesters(db, rooms, teachers, groups, [2,4,6,8])
    else:
        print("  Полный план: два прогона")
        r1 = _solve_for_semesters(db, rooms, teachers, groups, [1,3,5,7])
        r2 = _solve_for_semesters(db, rooms, teachers, groups, [2,4,6,8])
        result = r1 + r2
        print(f"  Итого: {len(r1)}+{len(r2)}={len(result)}")

    day_map = {d: i for i, d in enumerate(DAYS)}
    result.sort(key=lambda x: (
        x.get("semester", 0), day_map[x["day"]],
        x["time_index"], x["course"], x["group"]
    ))
    s1 = len(set(f"{r['day']}|{r['time']}|{r['room']}" for r in result if r["shift"]==1))
    s2 = len(set(f"{r['day']}|{r['time']}|{r['room']}" for r in result if r["shift"]==2))
    print(f"  Записей: {len(result)} | Смена1={s1} | Смена2={s2}")
    return result