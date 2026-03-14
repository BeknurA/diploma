from sqlalchemy.orm import Session
from app import models
from ortools.sat.python import cp_model
import collections

# --- КОНФИГУРАЦИЯ ---
TIME_SLOTS = [
    "08:00-08:50", "09:00-09:50", "10:00-10:50", "11:10-12:00",
    "12:10-13:00", "13:10-14:00", "14:10-15:00", "15:10-16:00",
    "16:10-17:00", "17:10-18:00", "18:10-19:00", "19:10-20:00"
]
DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]

def generate_schedule(db: Session):
    print("\n--- 🎓 ГЕНЕРАЦИЯ: ПОЛНАЯ ИНТЕЛЛЕКТУАЛЬНАЯ СИСТЕМА ---")
    
    rooms = db.query(models.Room).all()
    teachers = db.query(models.Teacher).all()
    groups = db.query(models.StudentGroup).all()
    subjects = db.query(models.Subject).all()

    room_map = {r.id: r for r in rooms}
    teacher_map = {t.id: t for t in teachers}
    group_map = {g.id: g for g in groups}

    classes_to_schedule = [] 
    
    batches = collections.defaultdict(list)
    for g in groups:
        batches[(g.course, g.language)].append(g)

    # Счетчик для равномерного распределения преподов (если их несколько на один предмет)
    teacher_counters = collections.defaultdict(int)

    def get_teacher_id(s_obj):
        if not s_obj.teachers:
            return None # Нет препода
        # Равномерно чередуем преподавателей
        idx = teacher_counters[s_obj.id]
        t = s_obj.teachers[idx % len(s_obj.teachers)]
        teacher_counters[s_obj.id] += 1
        return t.id

    # --- А) ЛЕКЦИИ (Потоковые) ---
    for (course, lang), batch_groups in batches.items():
        course_subjects = [s for s in subjects if s.course == course]
        
        for s_obj in course_subjects:
            if s_obj.lectures_per_week == 0: continue
            
            t_id = get_teacher_id(s_obj)
            if not t_id:
                print(f"⚠️ Пропуск лекции '{s_obj.name}': не назначен преподаватель!")
                continue

            for _ in range(s_obj.lectures_per_week):
                classes_to_schedule.append({
                    "group_ids": [g.id for g in batch_groups], 
                    "subject": s_obj.id, 
                    "teacher": t_id, 
                    "is_lecture": True, 
                    "duration": 1 
                })

    # --- Б) ПРАКТИКИ (Индивидуальные) ---
    for group in groups:
        course_subjects = [s for s in subjects if s.course == group.course]
        
        for s_obj in course_subjects:
            if s_obj.practices_per_week == 0: continue
            
            t_id = get_teacher_id(s_obj)
            if not t_id:
                print(f"⚠️ Пропуск практики '{s_obj.name}' для {group.name}: не назначен преподаватель!")
                continue

            for _ in range(s_obj.practices_per_week):
                classes_to_schedule.append({
                    "group_ids": [group.id], 
                    "subject": s_obj.id, 
                    "teacher": t_id, 
                    "is_lecture": False, 
                    "duration": 1 
                })

    print(f"✅ Всего занятий сформировано: {len(classes_to_schedule)}")
    if len(classes_to_schedule) == 0:
        return [] 

    # 4. МОДЕЛЬ И ФИЛЬТРАЦИЯ КОМНАТ
    model = cp_model.CpModel()
    all_vars = {} 

    for c_idx, task in enumerate(classes_to_schedule):
        is_lec = task["is_lecture"]
        subj_obj = db.query(models.Subject).get(task["subject"])
        subj_name = subj_obj.name

        valid_rooms = []
        is_sport = ("физическая культура" in subj_name.lower())

        for r in rooms:
            if is_sport:
                if r.name == "Спортзал":
                    valid_rooms.append(r)
            else:
                if r.name == "Спортзал":
                    continue
                
                if is_lec:
                    if r.room_type == models.RoomTypeEnum.LECTURE_HALL:
                        valid_rooms.append(r)
                else:
                    if r.room_type == models.RoomTypeEnum.PC_LAB or r.room_type == models.RoomTypeEnum.PRACTICE:
                        valid_rooms.append(r)
        
        if not valid_rooms and not is_sport:
            valid_rooms = [r for r in rooms if r.name != "Спортзал"]

        if not valid_rooms:
            print(f"❌ Пропуск: Нет места для {subj_name}")
            continue

        task_vars = []
        for d in range(len(DAYS)):
            for s in range(len(TIME_SLOTS) - task["duration"] + 1):
                for r in valid_rooms:
                    var = model.NewBoolVar(f'c{c_idx}_{d}_{s}_{r.id}')
                    all_vars[(c_idx, d, s, r.id)] = var
                    task_vars.append(var)
        
        if task_vars:
            model.AddExactlyOne(task_vars)

    # 5. КОНФЛИКТЫ
    room_usage = collections.defaultdict(list)
    teacher_usage = collections.defaultdict(list)
    group_usage = collections.defaultdict(list)

    for (c_idx, d, s, r_id), var in all_vars.items():
        task = classes_to_schedule[c_idx]
        for delta in range(task["duration"]):
            slot = s + delta
            room_usage[(r_id, d, slot)].append(var)
            teacher_usage[(task["teacher"], d, slot)].append(var)
            for g_id in task["group_ids"]:
                group_usage[(g_id, d, slot)].append(var)

    for v in room_usage.values(): model.AddAtMostOne(v)
    for v in teacher_usage.values(): model.AddAtMostOne(v)
    for v in group_usage.values(): model.AddAtMostOne(v)

    # 6. РЕШЕНИЕ
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60.0
    status = solver.Solve(model)

    final_schedule = []
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        for (c_idx, d, s, r_id), var in all_vars.items():
            if solver.Value(var):
                task = classes_to_schedule[c_idx]
                s_obj = db.query(models.Subject).get(task["subject"])
                t_obj = teacher_map[task["teacher"]]
                r_obj = room_map[r_id]
                
                for g_id in task["group_ids"]:
                    g_obj = group_map[g_id]
                    final_schedule.append({
                        "day": DAYS[d],
                        "time": TIME_SLOTS[s],
                        "group": g_obj.name,
                        "subject": s_obj.name,
                        "teacher": t_obj.full_name,
                        "room": r_obj.name,
                        "class_type": "Лекция" if task["is_lecture"] else "Практика"
                    })
    
    day_map = {d: i for i, d in enumerate(DAYS)}
    final_schedule.sort(key=lambda x: (day_map[x["day"]], x["time"], x["group"]))

    return final_schedule