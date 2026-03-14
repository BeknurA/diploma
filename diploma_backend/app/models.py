from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum as SQLEnum, Table
from sqlalchemy.orm import relationship
import enum
from .database import Base

class LanguageEnum(str, enum.Enum):
    KZ = "KZ"
    RU = "RU"
    EN = "EN"

class RoomTypeEnum(str, enum.Enum):
    LECTURE_HALL = "Лекционный зал"
    PC_LAB = "Компьютерный класс"
    PRACTICE = "Кабинет практики"

# --- НОВАЯ ТАБЛИЦА-СВЯЗКА (Преподаватель <-> Предмет) ---
# Она нужна, чтобы Эдвайзер мог назначить нескольких преподов на один предмет
teacher_subject_association = Table(
    'teacher_subject',
    Base.metadata,
    Column('teacher_id', Integer, ForeignKey('teachers.id')),
    Column('subject_id', Integer, ForeignKey('subjects.id'))
)

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    capacity = Column(Integer)
    room_type = Column(SQLEnum(RoomTypeEnum))

class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    max_hours_per_week = Column(Integer, default=20)
    
    # Связь с предметами, которые он может вести
    subjects = relationship("Subject", secondary=teacher_subject_association, back_populates="teachers")

class StudentGroup(Base):
    __tablename__ = "student_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    students_count = Column(Integer)
    language = Column(SQLEnum(LanguageEnum))
    course = Column(Integer)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    # Кредитная технология
    credits = Column(Integer, default=5) 
    lectures_per_week = Column(Integer, default=1) 
    practices_per_week = Column(Integer, default=2)
    
    # --- НОВЫЕ ПОЛЯ (ДЛЯ ЭДВАЙЗЕРА) ---
    course = Column(Integer, default=1)   # Для какого курса этот предмет
    semester = Column(Integer, default=1) # Для какого семестра (1-8)
    
    # Связь с преподавателями
    teachers = relationship("Teacher", secondary=teacher_subject_association, back_populates="subjects")