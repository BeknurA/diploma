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
SHIFT_1_INDICES = list(range(0, 6))   # 08:00-14:00
SHIFT_2_INDICES = list(range(6, 12))  # 14:00-20:00

# 1 и 3 курс → смена 1 (08:00-14:00)
# 2 и 4 курс → смена 2 (14:00-20:00)
COURSE_TO_SHIFT = {1: 1, 2: 2, 3: 1, 4: 2}


def _solve_for_semesters(db, rooms, teachers, groups, target_sems):
    """Генерирует расписание для указанных семестров."""
    subjects = [
        s for s in db.query(models.Subject)
                     .filter(models.Subject.semester.in_(target_sems))
                     .all()
        if s.lectures_per_week > 0 or s.practices_per_week > 0
    ]
    print(f"  Семестры {target_sems}: {len(subjects)} предметов")

    room_map    = {r.id: r for r in rooms}
    teacher_map = {t.id: t for t in teachers}
    group_map   = {g.id: g for g in groups}

    batches = collections.defaultdict(list)
    for g in groups:
        batches[(g.course, g.language)].append(g)

    tcounters = collections.defaultdict(int)

    def pick_teacher(s_obj):
        if not s_obj.teachers:
            return None
        idx = tcounters[s_obj.id] % len(s_obj.teachers)
        t = s_obj.teachers[idx]
        tcounters[s_obj.id] += 1
        return t.id

    classes = []

    # ЛЕКЦИИ — потоковые
    for (course, lang_val), batch in batches.items():
        for s_obj in [s for s in subjects if s.course == course]:
            if s_obj.lectures_per_week == 0:
                continue
            t_id = pick_teacher(s_obj)
            if not t_id:
                continue
            for _ in range(s_obj.lectures_per_week):
                classes.append({
                    "group_ids":        [g.id for g in batch],
                    "subject_id":       s_obj.id,
                    "subject_semester": s_obj.semester,
                    "teacher":          t_id,
                    "is_lecture":       True,
                    "course":           course,
                    "required_shift":   COURSE_TO_SHIFT[course],
                })

    # ПРАКТИКИ — индивидуальные
    for group in groups:
        for s_obj in [s for s in subjects if s.course == group.course]:
            if s_obj.practices_per_week == 0:
                continue
            t_id = pick_teacher(s_obj)
            if not t_id:
                continue
            for _ in range(s_obj.practices_per_week):
                classes.append({
                    "group_ids":        [group.id],
                    "subject_id":       s_obj.id,
                    "subject_semester": s_obj.semester,
                    "teacher":          t_id,
                    "is_lecture":       False,
                    "course":           group.course,
                    "required_shift":   COURSE_TO_SHIFT[group.course],
                })

    if not classes:
        return []

    print(f"  Занятий к размещению: {len(classes)}")

    model = cp_model.CpModel()
    all_vars = {}

    for c_idx, task in enumerate(classes):
        s_obj     = db.query(models.Subject).get(task["subject_id"])
        is_sport  = "физическая культура" in s_obj.name.lower()
        is_lec    = task["is_lecture"]
        allowed   = SHIFT_1_INDICES if task["required_shift"] == 1 else SHIFT_2_INDICES

        valid_rooms = []
        for r in rooms:
            if is_sport:
                if r.name == "Спортзал":
                    valid_rooms.append(r)
            else:
                if r.name == "Спортзал":
                    continue
                if is_lec and r.room_type == models.RoomTypeEnum.LECTURE_HALL:
                    valid_rooms.append(r)
                elif not is_lec and r.room_type in (
                        models.RoomTypeEnum.PC_LAB, models.RoomTypeEnum.PRACTICE):
                    valid_rooms.append(r)

        if not valid_rooms and not is_sport:
            valid_rooms = [r for r in rooms if r.name != "Спортзал"]
        if not valid_rooms:
            continue

        task_vars = []
        for d in range(len(DAYS)):
            for s in allowed:
                for r in valid_rooms:
                    var = model.NewBoolVar(f'c{c_idx}_{d}_{s}_{r.id}')
                    all_vars[(c_idx, d, s, r.id)] = var
                    task_vars.append(var)
        if task_vars:
            model.AddExactlyOne(task_vars)

    # Конфликты
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

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 120.0
    solver.parameters.num_search_workers  = 4
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
    else:
        print(f"  WARN: Не удалось найти решение для семестров {target_sems}")

    return result


def generate_schedule(db: Session, semester: int = None):
    """
    semester=1  -> осень: семестры 1,3,5,7
    semester=2  -> весна: семестры 2,4,6,8
    None        -> полное расписание (осень + весна, два отдельных прогона)
    """
    print(f"\n--- ГЕНЕРАЦИЯ (полугодие={semester}) ---")
    print(f"  Смена 1 (08-14): курсы 1, 3")
    print(f"  Смена 2 (14-20): курсы 2, 4")

    rooms    = db.query(models.Room).all()
    teachers = db.query(models.Teacher).all()
    groups   = db.query(models.StudentGroup).all()

    if semester == 1:
        result = _solve_for_semesters(db, rooms, teachers, groups, [1, 3, 5, 7])
    elif semester == 2:
        result = _solve_for_semesters(db, rooms, teachers, groups, [2, 4, 6, 8])
    else:
        # Полный план: запускаем два отдельных прогона и объединяем
        print("  Полный план: осень + весна (2 отдельных прогона)")
        result_autumn = _solve_for_semesters(db, rooms, teachers, groups, [1, 3, 5, 7])
        result_spring = _solve_for_semesters(db, rooms, teachers, groups, [2, 4, 6, 8])
        result = result_autumn + result_spring
        print(f"  Объединено: {len(result_autumn)} (осень) + {len(result_spring)} (весна)")

    day_map = {d: i for i, d in enumerate(DAYS)}
    result.sort(key=lambda x: (
        x.get("semester", 0),
        day_map[x["day"]],
        x["time_index"],
        x["course"],
        x["group"],
    ))

    s1 = len(set(f"{r['day']}|{r['time']}|{r['room']}" for r in result if r["shift"] == 1))
    s2 = len(set(f"{r['day']}|{r['time']}|{r['room']}" for r in result if r["shift"] == 2))
    print(f"  Итого: {len(result)} записей | Смена1={s1} слотов | Смена2={s2} слотов")
    return result