from datetime import datetime
from typing import Optional
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


@app.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.delete(teacher)
    db.commit()
    return {"status": "deleted"}