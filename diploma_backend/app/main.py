from datetime import datetime
from typing import Optional
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

@app.delete("/rooms/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return {"status": "deleted"}