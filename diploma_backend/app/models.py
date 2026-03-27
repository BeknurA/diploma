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

teacher_subject_association = Table(
    'teacher_subject',
    Base.metadata,
    Column('teacher_id', Integer, ForeignKey('teachers.id')),
    Column('subject_id', Integer, ForeignKey('subjects.id'))
)

class Room(Base):
    __tablename__ = "rooms"
    id        = Column(Integer, primary_key=True, index=True)
    name      = Column(String, unique=True, index=True)
    capacity  = Column(Integer)
    room_type = Column(SQLEnum(RoomTypeEnum))
    is_active = Column(Boolean, default=True)   # False = закрыта (ремонт и т.д.)

class Teacher(Base):
    __tablename__ = "teachers"
    id                  = Column(Integer, primary_key=True, index=True)
    full_name           = Column(String, index=True)
    max_hours_per_week  = Column(Integer, default=20)
    subjects = relationship("Subject", secondary=teacher_subject_association, back_populates="teachers")

class StudentGroup(Base):
    __tablename__ = "student_groups"
    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String, unique=True, index=True)
    students_count = Column(Integer)
    language       = Column(SQLEnum(LanguageEnum))
    course         = Column(Integer)

class Subject(Base):
    __tablename__ = "subjects"
    id                 = Column(Integer, primary_key=True, index=True)
    name               = Column(String, unique=True, index=True)
    credits            = Column(Integer, default=5)
    lectures_per_week  = Column(Integer, default=1)
    practices_per_week = Column(Integer, default=2)
    course             = Column(Integer, default=1)
    semester           = Column(Integer, default=1)
    teachers = relationship("Teacher", secondary=teacher_subject_association, back_populates="subjects")