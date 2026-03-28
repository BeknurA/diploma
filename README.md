# ⬡ EduScheduler

<div align="center">

**Интеллектуальная система планирования занятий кафедры**  
*Прогноз занятости аудиторий и автоматизация расписания*

[![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://postgresql.org)
[![OR-Tools](https://img.shields.io/badge/OR--Tools-CP--SAT-orange?logo=google)](https://developers.google.com/optimization)

</div>

---

## 📌 О проекте

EduScheduler — дипломная работа бакалавриата, реализующая **интеллектуальную систему автоматического составления расписания** кафедры Computer Science. Система решает задачу составления расписания как задачу удовлетворения ограничений (CSP) с помощью алгоритма **CP-SAT от Google OR-Tools** и визуализирует аналитику занятости аудиторий в реальном времени.

> **Тема:** «Интеллектуальная система планирования занятий кафедры: прогноз занятости аудиторий и автоматизация расписания»  
> **Язык:** Python / TypeScript | Интерфейс: 🇷🇺 RU / 🇰🇿 KZ / 🇬🇧 EN

---

## 🏗️ Архитектура

```
diploma_project/
├── diploma_backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── scheduler.py       ← CP-SAT алгоритм
│   │   ├── main.py                ← FastAPI эндпоинты
│   │   ├── models.py              ← SQLAlchemy модели
│   │   ├── schemas.py             ← Pydantic схемы
│   │   ├── database.py            ← PostgreSQL подключение
│   │   └── init_db.py             ← Инициализация БД
│   ├── migrate_add_is_active.py   ← Миграция БД
│   ├── docker-compose.yml
│   └── requirements.txt
├── diploma_frontend/
│   └── src/
│       └── App.tsx                ← React SPA (2100+ строк)
├── start_system.bat               ← Запуск одной командой
└── stop_system.bat
```

---

## ⚡ Быстрый старт

### Предварительные требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python 3.10+](https://python.org)
- [Node.js 20+](https://nodejs.org)

### Запуск (Windows)

```bat
:: Запустить всё одной командой:
start_system.bat
```

Или вручную:

```bash
# 1. База данных
cd diploma_backend
docker-compose up -d

# 2. Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m app.init_db          # Инициализация данных
uvicorn app.main:app --reload

# 3. Frontend (новый терминал)
cd diploma_frontend
npm install
npm run dev
```

Открыть в браузере: **http://localhost:5173**

---

## 🔧 Миграция (если обновляете существующую БД)

```bash
cd diploma_backend
python migrate_add_is_active.py
```

---

## 🤖 Алгоритм CP-SAT

Система решает задачу составления расписания в 6 этапов:

| Этап | Описание |
|------|----------|
| 1. Сбор данных | Загрузка предметов, групп, преподавателей, аудиторий из PostgreSQL |
| 2. Формирование задач | Потоковые лекции (все группы курса) + индивидуальные практики |
| 3. Булевы переменные | CP-SAT создаёт переменную для каждой комбинации занятие × день × слот × аудитория |
| 4. Ограничения (Hard) | Конфликты аудиторий/преподавателей/групп, смены, физкультура с буфером, нет окон |
| 5. Оптимизация (Soft) | Максимизация активных дней, равномерное распределение нагрузки |
| 6. Прогноз | Тепловые карты занятости, рекомендации системы |

### Жёсткие ограничения

- **Смены:** курсы 1, 3 → смена 1 (08:00–14:00); курсы 2, 4 → смена 2 (14:00–20:00)
- **Нет окон:** если у группы есть занятия до и после слота — слот должен быть занят
- **Максимум 4 пары в день** для каждой группы
- **Физкультура:** 2 пары подряд только в Спортзале + буфер 1 час до и после
- **Типы аудиторий:** лекции → лекционный зал; практики → ПК-класс или практическая аудитория

---

## 📊 Данные в системе

| Сущность | Количество | Детали |
|----------|-----------|--------|
| Группы | 20 | 2 RU (15 чел) + 3 KZ (20 чел) на каждый курс |
| Преподаватели | 15 | Казахские и русские ФИО |
| Предметы | 44 | Семестры 1–8, включая специализированные |
| Аудитории | 12 | Лекц. залы, ПК-классы, практические, Спортзал |

---

## 🖥️ API Endpoints

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| `POST` | `/generate-schedule/` | Генерация расписания (CP-SAT) |
| `GET` | `/subjects/` | Список предметов |
| `POST` | `/subjects/` | Создать / обновить предмет |
| `DELETE` | `/subjects/{id}` | Удалить предмет |
| `GET` | `/teachers/` | Список преподавателей |
| `POST` | `/teachers/` | Создать преподавателя |
| `PUT` | `/teachers/{id}` | Обновить преподавателя |
| `DELETE` | `/teachers/{id}` | Удалить преподавателя |
| `GET` | `/rooms/` | Список аудиторий |
| `POST` | `/rooms/` | Добавить аудиторию |
| `PUT` | `/rooms/{id}` | Обновить аудиторию |
| `PATCH` | `/rooms/{id}/toggle-active` | Закрыть / открыть аудиторию |
| `DELETE` | `/rooms/{id}` | Удалить аудиторию |

Документация Swagger: **http://localhost:8000/docs**

---

## 🎨 Интерфейс — страницы

| Страница | Описание |
|----------|----------|
| **⬡ Дашборд** | KPI карточки, расписание дня, тепловая карта, статус системы |
| **📅 Расписание** | Сетка / список, 6 фильтров (курс, группа, преподаватель, аудитория, смена, семестр), экспорт Excel |
| **🔥 Прогноз** | Прогноз загрузки аудиторий, рекомендации, тепловая карта по слотам |
| **⚙️ Эдвайзер** | Управление предметами, преподавателями и аудиториями (CRUD) |
| **📊 Аналитика** | 8 KPI, донаты, бары, топ предметов, тепловые карты |
| **🔍 Свободные окна** | Поиск свободных аудиторий и преподавателей по дню/времени |
| **ℹ️ О системе** | Алгоритм, стек, характеристики, метрики |

### Темы оформления

`dark` · `light` · `midnight` · `forest`

---

## 🛠️ Технологический стек

**Backend**
- Python 3.10, FastAPI, Pydantic v2
- SQLAlchemy ORM, PostgreSQL 15
- Google OR-Tools (CP-SAT Solver)
- Docker Compose, Uvicorn

**Frontend**
- React 19 + TypeScript, Vite 7
- Axios, XLSX (экспорт)
- Custom CSS Variables (без UI-библиотек)

**Тестирование**
- pytest, SQLite (изолированная тестовая БД)
- GitHub Actions CI/CD

---

## 🧪 Запуск тестов

```bash
cd diploma_backend
TEST_MODE=True pytest
```

---

## 📁 Структура базы данных

```sql
rooms         (id, name, capacity, room_type, is_active)
teachers      (id, full_name, max_hours_per_week)
student_groups(id, name, students_count, language, course)
subjects      (id, name, credits, lectures_per_week, 
               practices_per_week, course, semester)
teacher_subject (teacher_id, subject_id)  -- M2M
```

---

## 🎯 Научная новизна

1. Применение CP-SAT для расписания кафедры с поддержкой двухсменного обучения
2. Интеграция прогнозирования занятости аудиторий непосредственно в систему планирования
3. Многоязычный интерфейс (KZ/RU/EN) с полным переводом ~120 ключей
4. Визуализация тепловых карт загрузки аудиторий в реальном времени
5. Автоматические рекомендации по перераспределению нагрузки

---

## 👤 Автор
Аманжан Бекнұр
**Дипломная работа бакалавриата — 2025**  
Кафедра ИС

---

<div align="center">
<sub>Построено с CP-SAT · FastAPI · React · PostgreSQL</sub>
</div>