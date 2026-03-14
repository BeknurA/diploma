from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import Base, Room, Teacher, StudentGroup, Subject, RoomTypeEnum, LanguageEnum

def init_db():
    print("⏳ Очистка и создание базы данных...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    print("🏢 Добавление аудиторий...")
    rooms = [
        Room(name="108", capacity=30, room_type=RoomTypeEnum.PRACTICE),
        Room(name="221", capacity=100, room_type=RoomTypeEnum.LECTURE_HALL),
        Room(name="509", capacity=25, room_type=RoomTypeEnum.PC_LAB),
        Room(name="605", capacity=25, room_type=RoomTypeEnum.PC_LAB),
        Room(name="607", capacity=25, room_type=RoomTypeEnum.PC_LAB),
        Room(name="608", capacity=25, room_type=RoomTypeEnum.PC_LAB),
        Room(name="614", capacity=30, room_type=RoomTypeEnum.PRACTICE),
        Room(name="616", capacity=30, room_type=RoomTypeEnum.PRACTICE),
        Room(name="710", capacity=120, room_type=RoomTypeEnum.LECTURE_HALL),
        Room(name="Спортзал", capacity=100, room_type=RoomTypeEnum.PRACTICE),
    ]
    db.add_all(rooms)

    print("👨‍🏫 Добавление преподавателей...")
    # Создаем преподавателей как отдельные переменные, чтобы легко их привязывать
    t_ivanov = Teacher(full_name="Иванов В.П.", max_hours_per_week=20)
    t_smagulov = Teacher(full_name="Смагулов А.С.", max_hours_per_week=20)
    t_tarikhov = Teacher(full_name="Тарихов И.И. (История)", max_hours_per_week=15)
    t_sport = Teacher(full_name="Спортивный Д.Д. (Физра)", max_hours_per_week=30)
    t_alieva = Teacher(full_name="Алиева А.А. (Каз/Рус яз)", max_hours_per_week=20)
    t_sambetbaeva = Teacher(full_name="Самбетбаева М.А.", max_hours_per_week=18)
    t_saukhanova = Teacher(full_name="Сауханова М.С.", max_hours_per_week=15)
    t_tsoy = Teacher(full_name="Цой В.И.", max_hours_per_week=20)
    t_akhmetov = Teacher(full_name="Ахметов К.К.", max_hours_per_week=20)
    t_kim = Teacher(full_name="Ким Е.В.", max_hours_per_week=15)

    db.add_all([t_ivanov, t_smagulov, t_tarikhov, t_sport, t_alieva, t_sambetbaeva, t_saukhanova, t_tsoy, t_akhmetov, t_kim])

    print("🎓 Добавление студенческих групп...")
    groups = [
        # --- 1 КУРС (2 РУС, 3 КАЗ) ---
        StudentGroup(name="CS-101-RU", students_count=20, language=LanguageEnum.RU, course=1),
        StudentGroup(name="CS-102-RU", students_count=20, language=LanguageEnum.RU, course=1),
        StudentGroup(name="CS-103-KZ", students_count=22, language=LanguageEnum.KZ, course=1),
        StudentGroup(name="CS-104-KZ", students_count=22, language=LanguageEnum.KZ, course=1),
        StudentGroup(name="CS-105-KZ", students_count=22, language=LanguageEnum.KZ, course=1),

        # --- 2 КУРС (2 РУС, 3 КАЗ) ---
        StudentGroup(name="CS-201-RU", students_count=18, language=LanguageEnum.RU, course=2),
        StudentGroup(name="CS-202-RU", students_count=18, language=LanguageEnum.RU, course=2),
        StudentGroup(name="CS-203-KZ", students_count=20, language=LanguageEnum.KZ, course=2),
        StudentGroup(name="CS-204-KZ", students_count=20, language=LanguageEnum.KZ, course=2),
        StudentGroup(name="CS-205-KZ", students_count=20, language=LanguageEnum.KZ, course=2),

        # --- 3 КУРС (1 РУС, 2 КАЗ) ---
        StudentGroup(name="CS-301-RU", students_count=15, language=LanguageEnum.RU, course=3),
        StudentGroup(name="CS-302-KZ", students_count=17, language=LanguageEnum.KZ, course=3),
        StudentGroup(name="CS-303-KZ", students_count=17, language=LanguageEnum.KZ, course=3),

        # --- 4 КУРС (1 РУС, 1 КАЗ - выпускников обычно меньше) ---
        StudentGroup(name="CS-401-RU", students_count=14, language=LanguageEnum.RU, course=4),
        StudentGroup(name="CS-402-KZ", students_count=15, language=LanguageEnum.KZ, course=4),
    ]
    db.add_all(groups)

    print("📚 Создание типового учебного плана с ПРИВЯЗКОЙ ПРЕПОДАВАТЕЛЕЙ...")
    subjects = [
        # --- 1 КУРС ---
        Subject(name="Математика 1", course=1, semester=1, credits=8, lectures_per_week=2, practices_per_week=3, teachers=[t_ivanov, t_smagulov]),
        Subject(name="История Казахстана", course=1, semester=1, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_tarikhov]),
        Subject(name="Физическая культура 1", course=1, semester=1, credits=2, lectures_per_week=0, practices_per_week=2, teachers=[t_sport]),
        Subject(name="Информационно-коммуникационные технологии (ICT)", course=1, semester=1, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_kim]),
        Subject(name="Иностранный язык 1 (Англ)", course=1, semester=1, credits=5, lectures_per_week=0, practices_per_week=3, teachers=[t_alieva]),
        
        Subject(name="Математика 2", course=1, semester=2, credits=8, lectures_per_week=2, practices_per_week=3, teachers=[t_ivanov, t_smagulov]),
        Subject(name="Физика", course=1, semester=2, credits=5, lectures_per_week=2, practices_per_week=1, teachers=[t_akhmetov]),
        Subject(name="Алгоритмизация и программирование", course=1, semester=2, credits=8, lectures_per_week=2, practices_per_week=3, teachers=[t_tsoy, t_kim]),
        Subject(name="Философия", course=1, semester=2, credits=5, lectures_per_week=2, practices_per_week=0, teachers=[t_tarikhov]),
        Subject(name="Казахский/Русский язык", course=1, semester=2, credits=5, lectures_per_week=0, practices_per_week=2, teachers=[t_alieva]),
        Subject(name="Физическая культура 2", course=1, semester=2, credits=2, lectures_per_week=0, practices_per_week=2, teachers=[t_sport]),

        # --- 2 КУРС ---
        Subject(name="Дискретная математика", course=2, semester=3, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_kim]),
        Subject(name="Базы данных", course=2, semester=3, credits=8, lectures_per_week=2, practices_per_week=3, teachers=[t_tsoy, t_akhmetov]),
        Subject(name="Объектно-ориентированное программирование", course=2, semester=3, credits=8, lectures_per_week=2, practices_per_week=3, teachers=[t_kim]),
        Subject(name="Социология / Политология", course=2, semester=3, credits=4, lectures_per_week=2, practices_per_week=0, teachers=[t_tarikhov]),
        
        Subject(name="Операционные системы", course=2, semester=4, credits=5, lectures_per_week=2, practices_per_week=1, teachers=[t_akhmetov]),
        Subject(name="Компьютерные сети", course=2, semester=4, credits=5, lectures_per_week=2, practices_per_week=2, teachers=[t_akhmetov]),
        Subject(name="Web-технологии", course=2, semester=4, credits=8, lectures_per_week=2, practices_per_week=3, teachers=[t_tsoy]),
        Subject(name="Математическая статистика", course=2, semester=4, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_ivanov]),

        # --- 3 КУРС ---
        Subject(name="Жасанды интеллект (AI)", course=3, semester=5, credits=5, lectures_per_week=2, practices_per_week=1, teachers=[t_saukhanova]),
        Subject(name="Software Engineering", course=3, semester=5, credits=8, lectures_per_week=2, practices_per_week=2, teachers=[t_sambetbaeva]),
        Subject(name="Machine Learning", course=3, semester=5, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_saukhanova]),
        Subject(name="Компьютерная графика", course=3, semester=5, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_kim]),
        
        Subject(name="Компьютерлік кескінді өңдеу (Image Processing)", course=3, semester=6, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_saukhanova]),
        Subject(name="Мультиагенттік жүйелер теориясы", course=3, semester=6, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_sambetbaeva]),
        Subject(name="Кибербезопасность", course=3, semester=6, credits=5, lectures_per_week=2, practices_per_week=1, teachers=[t_tsoy]),
        Subject(name="Mobile Development", course=3, semester=6, credits=8, lectures_per_week=2, practices_per_week=3, teachers=[t_akhmetov]),

        # --- 4 КУРС ---
        Subject(name="IT жобаларды басқару (Project Management)", course=4, semester=7, credits=5, lectures_per_week=2, practices_per_week=1, teachers=[t_sambetbaeva]),
        Subject(name="Корпоративті ақпараттық жүйелер", course=4, semester=7, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_akhmetov]),
        Subject(name="Cloud Computing", course=4, semester=7, credits=5, lectures_per_week=1, practices_per_week=2, teachers=[t_tsoy]),
        Subject(name="Системный анализ", course=4, semester=7, credits=5, lectures_per_week=2, practices_per_week=1, teachers=[t_sambetbaeva]),
        
        Subject(name="Производственная практика", course=4, semester=8, credits=15, lectures_per_week=0, practices_per_week=0, teachers=[]),
        Subject(name="Преддипломная практика", course=4, semester=8, credits=5, lectures_per_week=0, practices_per_week=0, teachers=[]),
        Subject(name="Написание и защита дипломной работы", course=4, semester=8, credits=10, lectures_per_week=0, practices_per_week=0, teachers=[])
    ]
    db.add_all(subjects)

    db.commit()
    print("✅ База данных успешно инициализирована! Предметы распределены по курсам и ПРЕПОДАВАТЕЛЯМ.")
    db.close()

if __name__ == "__main__":
    init_db()