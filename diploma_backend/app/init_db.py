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
        Room(name="108",     capacity=30,  room_type=RoomTypeEnum.PRACTICE),
        Room(name="221",     capacity=120, room_type=RoomTypeEnum.LECTURE_HALL),
        Room(name="509",     capacity=25,  room_type=RoomTypeEnum.PC_LAB),
        Room(name="605",     capacity=25,  room_type=RoomTypeEnum.PC_LAB),
        Room(name="607",     capacity=25,  room_type=RoomTypeEnum.PC_LAB),
        Room(name="608",     capacity=25,  room_type=RoomTypeEnum.PC_LAB),
        Room(name="614",     capacity=30,  room_type=RoomTypeEnum.PRACTICE),
        Room(name="616",     capacity=30,  room_type=RoomTypeEnum.PRACTICE),
        Room(name="618",     capacity=30,  room_type=RoomTypeEnum.PRACTICE),
        Room(name="710",     capacity=150, room_type=RoomTypeEnum.LECTURE_HALL),
        Room(name="711",     capacity=150, room_type=RoomTypeEnum.LECTURE_HALL),
        Room(name="Спортзал",capacity=100, room_type=RoomTypeEnum.PRACTICE),
    ]
    db.add_all(rooms)

    print("👨‍🏫 Добавление преподавателей (полные ФИО)...")
    # Мужчины (казахские и русские имена)
    t_ivanov      = Teacher(full_name="Досжанов Бауыржан Маратович",       max_hours_per_week=24)
    t_smagulov    = Teacher(full_name="Черепанов Геннадий Фёдорович",       max_hours_per_week=24)
    t_tarikhov    = Teacher(full_name="Тасболатов Дәурен Қайратович",       max_hours_per_week=18)
    t_sport       = Teacher(full_name="Власенко Роман Евгеньевич",          max_hours_per_week=30)
    t_tsoy        = Teacher(full_name="Мұқанов Алибек Сейітжанович",        max_hours_per_week=24)
    t_akhmetov    = Teacher(full_name="Зубарев Константин Михайлович",      max_hours_per_week=24)
    t_nurmagambetov = Teacher(full_name="Қалиев Ерлан Бекзатович",         max_hours_per_week=20)
    t_dzhaksybekov = Teacher(full_name="Байжанов Санжар Нұрланович",        max_hours_per_week=20)
    t_omarov      = Teacher(full_name="Жүнісов Арман Серікұлы",             max_hours_per_week=22)
    # Женщины (казахские и русские имена)
    t_alieva      = Teacher(full_name="Нұрғазина Ақмарал Бекқызы",         max_hours_per_week=22)
    t_sambetbaeva = Teacher(full_name="Щербакова Ирина Вячеславовна",       max_hours_per_week=20)
    t_saukhanova  = Teacher(full_name="Әбдіқадырова Дина Маратқызы",       max_hours_per_week=18)
    t_kim         = Teacher(full_name="Воронцова Наталья Сергеевна",        max_hours_per_week=18)
    t_bekova      = Teacher(full_name="Омарова Жансая Тоқтарқызы",         max_hours_per_week=18)
    t_petrenko    = Teacher(full_name="Сейтқали Гүлнар Оразқызы",          max_hours_per_week=20)

    all_teachers = [t_ivanov, t_smagulov, t_tarikhov, t_sport, t_alieva,
                    t_sambetbaeva, t_saukhanova, t_tsoy, t_akhmetov, t_kim,
                    t_nurmagambetov, t_bekova, t_dzhaksybekov, t_omarov, t_petrenko]
    db.add_all(all_teachers)

    print("🎓 Добавление групп (2 RU + 3 KZ на каждый курс)...")
    groups = [
        # 1 КУРС
        StudentGroup(name="CS-101-RU", students_count=15, language=LanguageEnum.RU, course=1),
        StudentGroup(name="CS-102-RU", students_count=15, language=LanguageEnum.RU, course=1),
        StudentGroup(name="CS-103-KZ", students_count=20, language=LanguageEnum.KZ, course=1),
        StudentGroup(name="CS-104-KZ", students_count=20, language=LanguageEnum.KZ, course=1),
        StudentGroup(name="CS-105-KZ", students_count=20, language=LanguageEnum.KZ, course=1),
        # 2 КУРС
        StudentGroup(name="CS-201-RU", students_count=15, language=LanguageEnum.RU, course=2),
        StudentGroup(name="CS-202-RU", students_count=15, language=LanguageEnum.RU, course=2),
        StudentGroup(name="CS-203-KZ", students_count=20, language=LanguageEnum.KZ, course=2),
        StudentGroup(name="CS-204-KZ", students_count=20, language=LanguageEnum.KZ, course=2),
        StudentGroup(name="CS-205-KZ", students_count=20, language=LanguageEnum.KZ, course=2),
        # 3 КУРС
        StudentGroup(name="CS-301-RU", students_count=15, language=LanguageEnum.RU, course=3),
        StudentGroup(name="CS-302-RU", students_count=15, language=LanguageEnum.RU, course=3),
        StudentGroup(name="CS-303-KZ", students_count=20, language=LanguageEnum.KZ, course=3),
        StudentGroup(name="CS-304-KZ", students_count=20, language=LanguageEnum.KZ, course=3),
        StudentGroup(name="CS-305-KZ", students_count=20, language=LanguageEnum.KZ, course=3),
        # 4 КУРС
        StudentGroup(name="CS-401-RU", students_count=15, language=LanguageEnum.RU, course=4),
        StudentGroup(name="CS-402-RU", students_count=15, language=LanguageEnum.RU, course=4),
        StudentGroup(name="CS-403-KZ", students_count=20, language=LanguageEnum.KZ, course=4),
        StudentGroup(name="CS-404-KZ", students_count=20, language=LanguageEnum.KZ, course=4),
        StudentGroup(name="CS-405-KZ", students_count=20, language=LanguageEnum.KZ, course=4),
    ]
    db.add_all(groups)

    print("📚 Добавление предметов (~50 штук, по курсам и семестрам)...")
    subjects = [
        # =========================================================
        # 1 КУРС — СЕМЕСТР 1 (осень)
        # =========================================================
        Subject(name="Математический анализ 1",
                course=1, semester=1, credits=8,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_ivanov, t_smagulov]),
        Subject(name="Линейная алгебра",
                course=1, semester=1, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_smagulov]),
        Subject(name="История и философия науки",
                course=1, semester=1, credits=4,
                lectures_per_week=2, practices_per_week=0,
                teachers=[t_tarikhov]),
        Subject(name="Иностранный язык 1",
                course=1, semester=1, credits=5,
                lectures_per_week=0, practices_per_week=3,
                teachers=[t_alieva, t_petrenko]),
        Subject(name="Основы программирования",
                course=1, semester=1, credits=6,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_tsoy, t_kim]),
        Subject(name="Физическая культура 1",
                course=1, semester=1, credits=2,
                lectures_per_week=0, practices_per_week=2,
                teachers=[t_sport]),

        # =========================================================
        # 1 КУРС — СЕМЕСТР 2 (весна)
        # =========================================================
        Subject(name="Математический анализ 2",
                course=1, semester=2, credits=8,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_ivanov, t_smagulov]),
        Subject(name="Дискретная математика",
                course=1, semester=2, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_smagulov, t_nurmagambetov]),
        Subject(name="Алгоритмы и структуры данных",
                course=1, semester=2, credits=6,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_tsoy, t_kim]),
        Subject(name="Казахский/Русский язык",
                course=1, semester=2, credits=4,
                lectures_per_week=0, practices_per_week=2,
                teachers=[t_alieva]),
        Subject(name="Введение в специальность",
                course=1, semester=2, credits=3,
                lectures_per_week=1, practices_per_week=1,
                teachers=[t_sambetbaeva]),
        Subject(name="Физическая культура 2",
                course=1, semester=2, credits=2,
                lectures_per_week=0, practices_per_week=2,
                teachers=[t_sport]),

        # =========================================================
        # 2 КУРС — СЕМЕСТР 3 (осень)
        # =========================================================
        Subject(name="Объектно-ориентированное программирование",
                course=2, semester=3, credits=7,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_tsoy, t_kim]),
        Subject(name="Базы данных",
                course=2, semester=3, credits=6,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_akhmetov, t_dzhaksybekov]),
        Subject(name="Теория вероятностей и математическая статистика",
                course=2, semester=3, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_ivanov, t_nurmagambetov]),
        Subject(name="Компьютерные сети",
                course=2, semester=3, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_akhmetov]),
        Subject(name="Иностранный язык 2",
                course=2, semester=3, credits=4,
                lectures_per_week=0, practices_per_week=2,
                teachers=[t_alieva, t_petrenko]),
        Subject(name="Физическая культура 3",
                course=2, semester=3, credits=2,
                lectures_per_week=0, practices_per_week=2,
                teachers=[t_sport]),

        # =========================================================
        # 2 КУРС — СЕМЕСТР 4 (весна)
        # =========================================================
        Subject(name="Операционные системы",
                course=2, semester=4, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_akhmetov, t_omarov]),
        Subject(name="Web-разработка",
                course=2, semester=4, credits=7,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_tsoy, t_bekova]),
        Subject(name="Численные методы",
                course=2, semester=4, credits=4,
                lectures_per_week=1, practices_per_week=2,
                teachers=[t_ivanov, t_smagulov]),
        Subject(name="Социология и политология",
                course=2, semester=4, credits=4,
                lectures_per_week=2, practices_per_week=0,
                teachers=[t_tarikhov]),
        Subject(name="Компьютерная графика",
                course=2, semester=4, credits=4,
                lectures_per_week=1, practices_per_week=2,
                teachers=[t_kim, t_bekova]),
        Subject(name="Физическая культура 4",
                course=2, semester=4, credits=2,
                lectures_per_week=0, practices_per_week=2,
                teachers=[t_sport]),

        # =========================================================
        # 3 КУРС — СЕМЕСТР 5 (осень)
        # =========================================================
        Subject(name="Искусственный интеллект",
                course=3, semester=5, credits=6,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_saukhanova, t_nurmagambetov]),
        Subject(name="Машинное обучение",
                course=3, semester=5, credits=6,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_saukhanova, t_dzhaksybekov]),
        Subject(name="Software Engineering",
                course=3, semester=5, credits=6,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_sambetbaeva, t_omarov]),
        Subject(name="Мобильная разработка",
                course=3, semester=5, credits=5,
                lectures_per_week=1, practices_per_week=2,
                teachers=[t_akhmetov, t_bekova]),
        Subject(name="Математические основы информатики",
                course=3, semester=5, credits=4,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_smagulov, t_nurmagambetov]),
        Subject(name="Анализ данных и визуализация",
                course=3, semester=5, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_nurmagambetov, t_dzhaksybekov]),

        # =========================================================
        # 3 КУРС — СЕМЕСТР 6 (весна)
        # =========================================================
        Subject(name="Глубокое обучение (Deep Learning)",
                course=3, semester=6, credits=5,
                lectures_per_week=2, practices_per_week=2,
                teachers=[t_saukhanova, t_dzhaksybekov]),
        Subject(name="Кибербезопасность",
                course=3, semester=6, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_tsoy, t_omarov]),
        Subject(name="Обработка естественного языка (NLP)",
                course=3, semester=6, credits=5,
                lectures_per_week=1, practices_per_week=2,
                teachers=[t_saukhanova, t_nurmagambetov]),
        Subject(name="Распределённые системы",
                course=3, semester=6, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_akhmetov, t_omarov]),
        Subject(name="Методы оптимизации",
                course=3, semester=6, credits=4,
                lectures_per_week=1, practices_per_week=1,
                teachers=[t_ivanov, t_smagulov]),
        Subject(name="Тестирование программного обеспечения",
                course=3, semester=6, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_omarov, t_bekova]),

        # =========================================================
        # 4 КУРС — СЕМЕСТР 7 (осень)
        # =========================================================
        Subject(name="Управление IT-проектами",
                course=4, semester=7, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_sambetbaeva, t_omarov]),
        Subject(name="Cloud Computing и DevOps",
                course=4, semester=7, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_tsoy, t_dzhaksybekov]),
        Subject(name="Корпоративные информационные системы",
                course=4, semester=7, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_akhmetov, t_bekova]),
        Subject(name="Системный анализ и принятие решений",
                course=4, semester=7, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_sambetbaeva, t_nurmagambetov]),
        Subject(name="Компьютерное зрение (Computer Vision)",
                course=4, semester=7, credits=5,
                lectures_per_week=1, practices_per_week=2,
                teachers=[t_saukhanova, t_kim]),
        Subject(name="Большие данные (Big Data)",
                course=4, semester=7, credits=5,
                lectures_per_week=2, practices_per_week=1,
                teachers=[t_akhmetov, t_dzhaksybekov]),

        # =========================================================
        # 4 КУРС — СЕМЕСТР 8 (весна) — преддипломный
        # =========================================================
        Subject(name="Преддипломная практика",
                course=4, semester=8, credits=10,
                lectures_per_week=0, practices_per_week=3,
                teachers=[t_sambetbaeva, t_saukhanova]),
        Subject(name="Написание и защита дипломной работы",
                course=4, semester=8, credits=15,
                lectures_per_week=0, practices_per_week=0,
                teachers=[]),
    ]
    db.add_all(subjects)
    db.commit()

    total = db.query(Subject).count()
    total_groups = db.query(StudentGroup).count()
    print(f"✅ БД инициализирована!")
    print(f"   Предметов: {total}")
    print(f"   Групп: {total_groups} (по 5 на каждый курс: 2 RU + 3 KZ)")
    print(f"   Преподавателей: {len(all_teachers)}")
    db.close()

if __name__ == "__main__":
    init_db()