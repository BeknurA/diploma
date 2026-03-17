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
SHIFT_1_INDICES = list(range(0, 6))
SHIFT_2_INDICES = list(range(6, 12))


def generate_schedule(db: Session, semester: int = None):
    """
    semester=1  -> осень: семестры 1,3,5,7 (1-й, 2-й, 3-й, 4-й курсы)
    semester=2  -> весна: семестры 2,4,6,8 (1-й, 2-й, 3-й, 4-й курсы)
    semester=None -> все предметы
    """
    print(f"\n--- ГЕНЕРАЦИЯ РАСПИСАНИЯ (полугодие={semester}) ---")

    rooms    = db.query(models.Room).all()
    teachers = db.query(models.Teacher).all()
    groups   = db.query(models.StudentGroup).all()
    q        = db.query(models.Subject)

    if semester == 1:
        target = [1, 3, 5, 7]
        q = q.filter(models.Subject.semester.in_(target))
        print(f"  Осень: семестры {target} — все 4 курса")
    elif semester == 2:
        target = [2, 4, 6, 8]
        q = q.filter(models.Subject.semester.in_(target))
        print(f"  Весна: семестры {target} — все 4 курса")
    else:
        print("  Все семестры и курсы")

    subjects = q.all()
    print(f"  Предметов загружено: {len(subjects)}")

    room_map    = {r.id: r for r in rooms}
    teacher_map = {t.id: t for t in teachers}
    group_map   = {g.id: g for g in groups}

    classes = []
    batches = collections.defaultdict(list)
    for g in groups:
        batches[(g.course, g.language)].append(g)

    tcounters = collections.defaultdict(int)

    def pick_teacher(s_obj):
        if not s_obj.teachers:
            return None
        idx = tcounters[s_obj.id]
        t = s_obj.teachers[idx % len(s_obj.teachers)]
        tcounters[s_obj.id] += 1
        return t.id

    # Лекции — потоковые (все группы одного курса+языка вместе)
    for (course, lang), batch in batches.items():
        for s_obj in [s for s in subjects if s.course == course]:
            if s_obj.lectures_per_week == 0:
                continue
            t_id = pick_teacher(s_obj)
            if not t_id:
                continue
            for _ in range(s_obj.lectures_per_week):
                classes.append({
                    "group_ids": [g.id for g in batch],
                    "subject": s_obj.id, "teacher": t_id,
                    "is_lecture": True, "duration": 1, "course": course,
                })

    # Практики — индивидуальные (одна группа)
    for group in groups:
        for s_obj in [s for s in subjects if s.course == group.course]:
            if s_obj.practices_per_week == 0:
                continue
            t_id = pick_teacher(s_obj)
            if not t_id:
                continue
            for _ in range(s_obj.practices_per_week):
                classes.append({
                    "group_ids": [group.id],
                    "subject": s_obj.id, "teacher": t_id,
                    "is_lecture": False, "duration": 1, "course": group.course,
                })

    print(f"  Занятий к размещению: {len(classes)}")
    if not classes:
        return []

    model = cp_model.CpModel()
    all_vars = {}

    for c_idx, task in enumerate(classes):
        s_obj = db.query(models.Subject).get(task["subject"])
        subj_name = s_obj.name
        is_sport = "физическая культура" in subj_name.lower()
        is_lec   = task["is_lecture"]

        valid_rooms = []
        for r in rooms:
            if is_sport:
                if r.name == "Спортзал": valid_rooms.append(r)
            else:
                if r.name == "Спортзал": continue
                if is_lec and r.room_type == models.RoomTypeEnum.LECTURE_HALL:
                    valid_rooms.append(r)
                elif not is_lec and r.room_type in (models.RoomTypeEnum.PC_LAB, models.RoomTypeEnum.PRACTICE):
                    valid_rooms.append(r)

        if not valid_rooms and not is_sport:
            valid_rooms = [r for r in rooms if r.name != "Спортзал"]
        if not valid_rooms:
            continue

        task_vars = []
        for d in range(len(DAYS)):
            for s in range(len(TIME_SLOTS)):
                for r in valid_rooms:
                    var = model.NewBoolVar(f'c{c_idx}_{d}_{s}_{r.id}')
                    all_vars[(c_idx, d, s, r.id)] = var
                    task_vars.append(var)
        if task_vars:
            model.AddExactlyOne(task_vars)

    # Группа в один день — только одна смена
    group_day_shift = {}
    for g in groups:
        for d in range(len(DAYS)):
            sv = model.NewBoolVar(f'shift_{g.id}_{d}')
            group_day_shift[(g.id, d)] = sv

    for (c_idx, d, s, r_id), var in all_vars.items():
        task = classes[c_idx]
        for g_id in task["group_ids"]:
            if (g_id, d) in group_day_shift:
                sv = group_day_shift[(g_id, d)]
                if s in SHIFT_1_INDICES:
                    model.Add(sv == 0).OnlyEnforceIf(var)
                else:
                    model.Add(sv == 1).OnlyEnforceIf(var)

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
    solver.parameters.num_search_workers = 4
    status = solver.Solve(model)
    print(f"  Solver: {solver.StatusName(status)}")

    result = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (c_idx, d, s, r_id), var in all_vars.items():
            if solver.Value(var):
                task = classes[c_idx]
                s_obj = db.query(models.Subject).get(task["subject"])
                t_obj = teacher_map[task["teacher"]]
                r_obj = room_map[r_id]
                shift = 1 if s in SHIFT_1_INDICES else 2
                for g_id in task["group_ids"]:
                    g_obj = group_map[g_id]
                    result.append({
                        "day": DAYS[d], "time": TIME_SLOTS[s], "time_index": s,
                        "group": g_obj.name, "subject": s_obj.name,
                        "teacher": t_obj.full_name, "room": r_obj.name,
                        "class_type": "Лекция" if task["is_lecture"] else "Практика",
                        "shift": shift, "course": g_obj.course,
                        "language": g_obj.language.value,
                    })
    else:
        print("  WARN: Решение не найдено. Снизьте кол-во пар в неделю.")

    day_map = {d: i for i, d in enumerate(DAYS)}
    result.sort(key=lambda x: (day_map[x["day"]], x["time_index"], x["course"], x["group"]))
    print(f"  Итого записей: {len(result)}")
    return result