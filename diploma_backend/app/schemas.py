from pydantic import BaseModel
from typing import List, Optional

# --- РАСПИСАНИЕ ---
class ScheduleSlot(BaseModel):
    day: str
    time: str
    time_index: int = 0
    group: str
    subject: str
    teacher: str
    room: str
    class_type: str
    shift: int = 1
    course: int = 1
    language: str = "RU"
    semester: Optional[int] = None   # ← добавлено

    class Config:
        from_attributes = True

class ScheduleResponse(BaseModel):
    schedule: List[ScheduleSlot]
    generated_at: str
    semester: Optional[int] = None

# --- ПРЕПОДАВАТЕЛИ ---
class TeacherBase(BaseModel):
    full_name: str
    max_hours_per_week: int = 20

class TeacherCreate(TeacherBase):
    pass

class TeacherResponse(TeacherBase):
    id: int

    class Config:
        from_attributes = True

# --- ПРЕДМЕТЫ ---
class SubjectBase(BaseModel):
    name: str
    credits: int = 5
    lectures_per_week: int = 1
    practices_per_week: int = 2
    course: int = 1
    semester: int = 1
    teacher_ids: List[int] = []

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    teachers: List[TeacherResponse] = []

    class Config:
        from_attributes = True