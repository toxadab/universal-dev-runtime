# Universal Dev Runtime - Web Interface

## Quick Start

### Запуск веб-интерфейса

```bash
# Запуск веб-сервера
npm run web

# Или с указанием порта
QWX_WEB_PORT=8080 npm run web
```

После запуска откройте в браузере: **http://localhost:3000**

## Возможности

### 🧵 Thread State (Оперативная память)
- Просмотр и редактирование текущей задачи
- Управление активными артефактами
- Recent decisions и open questions
- Correction notes
- Очистка thread state
- Promote в shared memory

### 👥 Shared Memory (Общая память)
- **Team Members** - управление командой проекта
- **Team Decisions** - долгосрочные решения команды
- **Patterns & Conventions** - паттерны и соглашения

### 🔍 Semantic Search
- Полнотекстовый поиск по всем документам
- TF-IDF + cosine similarity
- Показывает процент совпадения

### 📄 Documents
- Просмотр всех семантических документов
- Добавление новых документов
- Удаление устаревших
- Типы: decision, correction, note, architecture, convention

### 📊 Dashboard
- Статистика по всем видам памяти
- Быстрый доступ ко всем функциям
- Автообновление

## API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/dashboard` | Общая сводка |
| GET | `/api/thread-state` | Получить thread state |
| PUT | `/api/thread-state` | Обновить thread state |
| POST | `/api/thread-state/clear` | Очистить thread state |
| GET | `/api/shared-memory` | Получить shared memory |
| PUT | `/api/shared-memory` | Обновить shared memory |
| GET | `/api/team` | Получить команду |
| POST | `/api/team` | Добавить участника |
| DELETE | `/api/team/:index` | Удалить участника |
| GET | `/api/semantic-search?q=query` | Поиск |
| GET | `/api/semantic-documents` | Все документы |
| POST | `/api/semantic-documents` | Добавить документ |
| DELETE | `/api/semantic-documents/:id` | Удалить документ |
| POST | `/api/decisions` | Добавить решение |
| DELETE | `/api/decisions/:index` | Удалить решение |
| POST | `/api/patterns` | Добавить паттерн |
| DELETE | `/api/patterns/:index` | Удалить паттерн |
| POST | `/api/promote` | Promote thread → shared |
| GET | `/api/runtime-memory` | Runtime memory MD |

## Интеграция с CLI

Веб-интерфейс работает с теми же файлами памяти, что и CLI:

```bash
# Bootstrap проекта (создаст .qwen директорию)
npx qwx --bootstrap

# Запуск веб-интерфейса
npm run web
```

Все изменения в веб-интерфейсе сразу доступны через CLI и наоборот!

## Структура файлов

```
.qwen/
├── state/
│   ├── current-thread.json      # Thread State
│   ├── project-manifest.json    # Проект
│   └── artifact-index.json      # Артефакты
└── shared/
    ├── shared-memory.json       # Shared Memory
    └── semantic-index.json      # Semantic Index
```
