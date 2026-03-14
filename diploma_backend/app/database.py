# app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ПРОВЕРКА: Если мы на GitHub Actions, используем файл (SQLite)
if os.getenv("TEST_MODE") == "True":
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # Иначе (у тебя дома) используем Docker PostgreSQL
    SQLALCHEMY_DATABASE_URL = "postgresql://postgres:mysecretpassword@localhost:5432/schedule_db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()