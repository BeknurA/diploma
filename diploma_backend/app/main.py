from datetime import datetime
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware  # <--- ВАЖНЫЙ ИМПОРТ
from sqlalchemy.orm import Session
from app import models, database, schemas
from app.core import scheduler

# Создаем таблицы
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Smart Schedule System")

# --- РАЗРЕШАЕМ ФРОНТЕНД (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем всем (для удобства разработки)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()
# --- ПАНЕЛЬ ОПЕРАТОРА: УПРАВЛЕНИЕ ПРЕДМЕТАМИ ---

@app.get("/subjects/", response_model=list[schemas.SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    """Получить список всех предметов с их кредитами и часами"""
    return db.query(models.Subject).all()

@app.post("/subjects/", response_model=schemas.SubjectResponse)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db)):
    """Добавить или обновить предмет + привязать преподавателей"""
    db_subject = db.query(models.Subject).filter(models.Subject.name == subject.name).first()
    
    # МАГИЯ: Находим в БД объекты преподавателей по тем ID, что прислал сайт
    selected_teachers = []
    if subject.teacher_ids:
        selected_teachers = db.query(models.Teacher).filter(models.Teacher.id.in_(subject.teacher_ids)).all()
    
    if db_subject:
        db_subject.credits = subject.credits
        db_subject.lectures_per_week = subject.lectures_per_week
        db_subject.practices_per_week = subject.practices_per_week
        db_subject.course = subject.course
        db_subject.semester = subject.semester
        db_subject.teachers = selected_teachers # <--- Привязываем!
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
        teachers=selected_teachers # <--- Привязываем!
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject
@app.get("/")
def read_root():
    return {"status": "System Online", "version": "1.0.0"}

@app.post("/generate-schedule/", response_model=schemas.ScheduleResponse)
def generate_schedule_endpoint(db: Session = Depends(get_db)):
    print(">>> Запрос на генерацию расписания получен...")
    schedule_data = scheduler.generate_schedule(db)
    return {
        "schedule": schedule_data,
        "generated_at": str(datetime.now())
    }
# --- ПАНЕЛЬ ЭДВАЙЗЕРА: УПРАВЛЕНИЕ ПРЕПОДАВАТЕЛЯМИ ---

@app.get("/teachers/", response_model=list[schemas.TeacherResponse])
def get_teachers(db: Session = Depends(get_db)):
    """Получить список всех преподавателей"""
    return db.query(models.Teacher).all()

@app.post("/teachers/", response_model=schemas.TeacherResponse)
def create_or_update_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    """Добавить нового или обновить часы существующему преподу"""
    db_teacher = db.query(models.Teacher).filter(models.Teacher.full_name == teacher.full_name).first()
    
    if db_teacher:
        # Если препод уже есть, обновляем ему нагрузку
        db_teacher.max_hours_per_week = teacher.max_hours_per_week
        db.commit()
        db.refresh(db_teacher)
        return db_teacher
    
    # Создаем нового
    new_teacher = models.Teacher(
        full_name=teacher.full_name,
        max_hours_per_week=teacher.max_hours_per_week
    )
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)
    return new_teacher