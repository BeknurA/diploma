from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app import models, database, schemas
from app.core import scheduler

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Smart Schedule System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"status": "System Online", "version": "2.0.0"}


# --- ГЕНЕРАЦИЯ РАСПИСАНИЯ ---
@app.post("/generate-schedule/", response_model=schemas.ScheduleResponse)
def generate_schedule_endpoint(
    semester: Optional[int] = Query(None, description="Семестр (1-8). None = все"),
    db: Session = Depends(get_db)
):
    """
    Генерирует расписание.
    - semester=1 → только предметы 1-го семестра (1 курс)
    - semester=2 → только предметы 2-го семестра (1 курс)
    - без параметра → все предметы
    """
    print(f">>> Запрос на генерацию расписания (семестр={semester})...")
    schedule_data = scheduler.generate_schedule(db, semester=semester)
    return {
        "schedule": schedule_data,
        "generated_at": str(datetime.now()),
        "semester": semester
    }


# --- УПРАВЛЕНИЕ ПРЕДМЕТАМИ ---
@app.get("/subjects/", response_model=list[schemas.SubjectResponse])
def get_subjects(
    course: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Получить список предметов с фильтрацией по курсу и семестру"""
    query = db.query(models.Subject)
    if course is not None:
        query = query.filter(models.Subject.course == course)
    if semester is not None:
        query = query.filter(models.Subject.semester == semester)
    return query.all()


@app.post("/subjects/", response_model=schemas.SubjectResponse)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db)):
    """Добавить или обновить предмет + привязать преподавателей"""
    db_subject = db.query(models.Subject).filter(models.Subject.name == subject.name).first()

    selected_teachers = []
    if subject.teacher_ids:
        selected_teachers = db.query(models.Teacher).filter(
            models.Teacher.id.in_(subject.teacher_ids)
        ).all()

    if db_subject:
        db_subject.credits = subject.credits
        db_subject.lectures_per_week = subject.lectures_per_week
        db_subject.practices_per_week = subject.practices_per_week
        db_subject.course = subject.course
        db_subject.semester = subject.semester
        db_subject.teachers = selected_teachers
        db.commit()
        db.refresh(db_subject)
        return db_subject

    new_subject = models.Subject(
        name=subject.name,
        credits=subject.credits,
        lectures_per_week=subject.lectures_per_week,
        practices_per_week=subject.practices_per_week,
        course=subject.course,
        semester=subject.semester,
        teachers=selected_teachers
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject


@app.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    """Удалить предмет"""
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"status": "deleted"}


# --- УПРАВЛЕНИЕ ПРЕПОДАВАТЕЛЯМИ ---
@app.get("/teachers/", response_model=list[schemas.TeacherResponse])
def get_teachers(db: Session = Depends(get_db)):
    return db.query(models.Teacher).all()


@app.post("/teachers/", response_model=schemas.TeacherResponse)
def create_or_update_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    db_teacher = db.query(models.Teacher).filter(
        models.Teacher.full_name == teacher.full_name
    ).first()

    if db_teacher:
        db_teacher.max_hours_per_week = teacher.max_hours_per_week
        db.commit()
        db.refresh(db_teacher)
        return db_teacher

    new_teacher = models.Teacher(
        full_name=teacher.full_name,
        max_hours_per_week=teacher.max_hours_per_week
    )
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)
    return new_teacher


@app.put("/teachers/{teacher_id}", response_model=schemas.TeacherResponse)
def update_teacher(teacher_id: int, teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    db_teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not db_teacher:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Teacher not found")
    db_teacher.full_name = teacher.full_name
    db_teacher.max_hours_per_week = teacher.max_hours_per_week
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

@app.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.delete(teacher)
    db.commit()
    return {"status": "deleted"}


# --- УПРАВЛЕНИЕ АУДИТОРИЯМИ ---
class RoomCreate(BaseModel):
    name: str
    capacity: int = 30
    room_type: str = "PRACTICE"

class RoomResponse(BaseModel):
    id: int
    name: str
    capacity: int
    room_type: str
    is_active: bool = True

    class Config:
        from_attributes = True
        use_enum_values = True

@app.get("/rooms/", response_model=list[RoomResponse])
def get_rooms(db: Session = Depends(get_db)):
    rooms = db.query(models.Room).order_by(models.Room.name).all()
    # Ensure is_active field exists (backward compat before migration)
    for r in rooms:
        if not hasattr(r, 'is_active') or r.is_active is None:
            r.is_active = True
    return rooms

@app.post("/rooms/", response_model=RoomResponse)
def create_room(room: RoomCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Room).filter(models.Room.name == room.name).first()
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Room already exists")
    # Convert string to enum
    room_type_map = {
        "LECTURE_HALL": models.RoomTypeEnum.LECTURE_HALL,
        "PC_LAB":       models.RoomTypeEnum.PC_LAB,
        "PRACTICE":     models.RoomTypeEnum.PRACTICE,
        # Also accept Russian values directly
        "Лекционный зал":     models.RoomTypeEnum.LECTURE_HALL,
        "Компьютерный класс": models.RoomTypeEnum.PC_LAB,
        "Кабинет практики":   models.RoomTypeEnum.PRACTICE,
    }
    room_type_enum = room_type_map.get(room.room_type, models.RoomTypeEnum.PRACTICE)
    new_room = models.Room(
        name=room.name,
        capacity=room.capacity,
        room_type=room_type_enum
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@app.put("/rooms/{room_id}", response_model=RoomResponse)
def update_room(room_id: int, room: RoomCreate, db: Session = Depends(get_db)):
    db_room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not db_room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Room not found")
    room_type_map = {
        "LECTURE_HALL": models.RoomTypeEnum.LECTURE_HALL,
        "PC_LAB":       models.RoomTypeEnum.PC_LAB,
        "PRACTICE":     models.RoomTypeEnum.PRACTICE,
        "Лекционный зал":     models.RoomTypeEnum.LECTURE_HALL,
        "Компьютерный класс": models.RoomTypeEnum.PC_LAB,
        "Кабинет практики":   models.RoomTypeEnum.PRACTICE,
    }
    db_room.name = room.name
    db_room.capacity = room.capacity
    db_room.room_type = room_type_map.get(room.room_type, models.RoomTypeEnum.PRACTICE)
    if hasattr(db_room, 'is_active') and hasattr(room, 'is_active'):
        db_room.is_active = room.is_active
    db.commit()
    db.refresh(db_room)
    return db_room

@app.patch("/rooms/{room_id}/toggle-active")
def toggle_room_active(room_id: int, db: Session = Depends(get_db)):
    """Переключить активность аудитории (закрыть/открыть)"""
    db_room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not db_room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Room not found")
    if hasattr(db_room, 'is_active'):
        db_room.is_active = not db_room.is_active
        db.commit()
        return {"status": "ok", "is_active": db_room.is_active}
    return {"status": "ok", "is_active": True}
# ============================================================
# РЕДАКТИРОВАНИЕ РАСПИСАНИЯ — валидация изменений
# ============================================================

class ScheduleSlotEdit(BaseModel):
    day: str
    time: str
    group: str
    subject: str
    teacher: str
    room: str
    class_type: str
    shift: int
    course: int
    language: str
    semester: Optional[int] = None
    time_index: int = 0

class ScheduleEditRequest(BaseModel):
    current_schedule: List[ScheduleSlotEdit]
    target_index: int
    new_day: str
    new_time: str
    new_room: str
    new_teacher: str

class ConflictInfo(BaseModel):
    type: str
    entity: str
    conflict_with: str

class ScheduleEditResponse(BaseModel):
    valid: bool
    conflicts: List[ConflictInfo]
    warnings: List[str]
    message: str

@app.post("/schedule/validate-change", response_model=ScheduleEditResponse)
def validate_schedule_change(req: ScheduleEditRequest):
    from app.core.scheduler import TIME_SLOTS, SHIFT_1_SLOTS, SHIFT_2_SLOTS, COURSE_TO_SHIFT

    conflicts: List[ConflictInfo] = []
    warnings: List[str] = []
    schedule = req.current_schedule
    idx = req.target_index

    if idx < 0 or idx >= len(schedule):
        return ScheduleEditResponse(valid=False, conflicts=[], warnings=[], message="Неверный индекс")

    target = schedule[idx]
    new_day = req.new_day
    new_time = req.new_time
    new_room = req.new_room
    new_teacher = req.new_teacher
    group = target.group
    course = target.course

    required_shift = COURSE_TO_SHIFT.get(course, 1)
    allowed_slots = SHIFT_1_SLOTS if required_shift == 1 else SHIFT_2_SLOTS
    shift_name = "1 (08:00–14:00)" if required_shift == 1 else "2 (14:00–20:00)"

    if new_time not in allowed_slots:
        conflicts.append(ConflictInfo(
            type="shift", entity=new_time,
            conflict_with=f"Группа {group} ({course} курс) учится в смене {shift_name}. Выбранное время не входит в эту смену."
        ))

    for i, slot in enumerate(schedule):
        if i == idx:
            continue
        if slot.day != new_day or slot.time != new_time:
            continue
        if slot.room == new_room:
            conflicts.append(ConflictInfo(
                type="room", entity=new_room,
                conflict_with=f"В {new_day} {new_time} аудитория занята: {slot.subject} ({slot.group}, {slot.teacher})"
            ))
        if slot.teacher == new_teacher:
            conflicts.append(ConflictInfo(
                type="teacher", entity=new_teacher,
                conflict_with=f"В {new_day} {new_time} преподаватель занят: {slot.subject} ({slot.group})"
            ))
        if slot.group == group:
            conflicts.append(ConflictInfo(
                type="group", entity=group,
                conflict_with=f"В {new_day} {new_time} группа уже имеет занятие: {slot.subject}"
            ))

    MAX_PAIRS = 4
    day_pairs = sum(1 for i, s in enumerate(schedule) if i != idx and s.group == group and s.day == new_day)
    if day_pairs >= MAX_PAIRS:
        warnings.append(f"У группы {group} уже {day_pairs} пар(ы) в {new_day}. Рекомендуется не более {MAX_PAIRS}.")

    group_day_slots = sorted([
        TIME_SLOTS.index(s.time) for i, s in enumerate(schedule)
        if i != idx and s.group == group and s.day == new_day and s.time in TIME_SLOTS
    ])
    new_slot_idx = TIME_SLOTS.index(new_time) if new_time in TIME_SLOTS else -1
    if new_slot_idx >= 0 and group_day_slots:
        all_day = sorted(group_day_slots + [new_slot_idx])
        for k in range(len(all_day) - 1):
            gap = all_day[k + 1] - all_day[k] - 1
            if gap > 0:
                t1 = TIME_SLOTS[all_day[k]]
                t2 = TIME_SLOTS[all_day[k + 1]]
                warnings.append(f"Возникнет окно ({gap} слот(а)) между {t1} и {t2} у группы {group}")

    if new_room == "Спортзал" and target.class_type != "Практика":
        warnings.append("Спортзал обычно используется только для физкультуры.")
    if new_room != "Спортзал" and "физическая культура" in target.subject.lower():
        warnings.append("Физкультура обычно проводится в Спортзале.")

    valid = len(conflicts) == 0
    message = ("Замена допустима — конфликтов не обнаружено" if not warnings else "Замена допустима, но есть предупреждения") if valid else f"Замена невозможна: {len(conflicts)} конфликт(ов)"

    return ScheduleEditResponse(valid=valid, conflicts=conflicts, warnings=warnings, message=message)

@app.delete("/rooms/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return {"status": "deleted"}