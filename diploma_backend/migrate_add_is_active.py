"""
Скрипт миграции: добавляет колонку is_active в таблицу rooms.
Запусти один раз: python migrate_add_is_active.py
Не трогает существующие данные.
"""
from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Проверяем существует ли колонка
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='rooms' AND column_name='is_active'
        """))
        exists = result.fetchone() is not None

        if exists:
            print("✅ Колонка is_active уже существует — миграция не нужна")
        else:
            # Добавляем колонку с дефолтным значением TRUE
            conn.execute(text("""
                ALTER TABLE rooms 
                ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
            """))
            conn.commit()
            print("✅ Колонка is_active успешно добавлена в таблицу rooms")
            print("   Все существующие аудитории установлены как активные (TRUE)")

if __name__ == "__main__":
    migrate()