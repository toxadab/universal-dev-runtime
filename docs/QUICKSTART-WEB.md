# Web Interface Quick Start

## 🚀 Запуск

```bash
# 1. Перейди в директорию проекта
cd /path/to/your/project

# 2. Инициализируй демо-данные (опционально, для теста)
node /path/to/universal-dev-runtime/init-demo.js

# 3. Запусти веб-сервер
cd /path/to/universal-dev-runtime
npm run web

# 4. Открой браузер
http://localhost:3000
```

## 📊 Что внутри

### Dashboard
- **4 карточки статистики** - Decisions, Patterns, Documents, Team Members
- **Быстрый refresh** - кнопка в navbar

### Thread State (Вкладка 1)
- **Current Task** - текущая задача (редактируемая)
- **Active Artifacts** - активные файлы
- **Recent Decisions** - последние решения
- **Open Questions** - открытые вопросы
- **Correction Notes** - заметки-исправления
- **Кнопки**: Clear Thread State, Promote to Shared

### Shared Memory (Вкладка 2)
- **Team Members** - команда (добавление/удаление)
- **Team Decisions** - решения команды
- **Patterns & Conventions** - паттерны и соглашения

### Semantic Search (Вкладка 3)
- **Поисковая строка** - введи запрос
- **Результаты** - с процентом совпадения
- **TF-IDF алгоритм** - без внешних API

### Documents (Вкладка 4)
- **Список документов** - все семантические документы
- **Добавить документ** - тип, текст, категория
- **Удалить документ** - кнопка delete

### Runtime Memory (Вкладка 5)
- **Просмотр** - auto-generated контекст
- **Refresh** - обновить

## 🎨 UI Features

- **Тёмная тема** - приятна для глаз
- **Bootstrap 5** - адаптивный дизайн
- **Иконки Bootstrap** - визуальная навигация
- **Уведомления** - success/error/warning
- **Модальные окна** - для добавления данных

## 🔧 API

Все операции доступны через REST API:

```bash
# Получить dashboard
curl http://localhost:3000/api/dashboard

# Обновить thread state
curl -X PUT http://localhost:3000/api/thread-state \
  -H "Content-Type: application/json" \
  -d '{"currentTask": "New task"}'

# Добавить team member
curl -X POST http://localhost:3000/api/team \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "role": "Developer"}'

# Поиск
curl "http://localhost:3000/api/semantic-search?q=database"
```

## 💡 Советы

1. **Promote регулярно** - переноси решения из thread state в shared memory
2. **Используй семантический поиск** - быстро находи нужную информацию
3. **Добавляй документы** - чем больше контекста, тем лучше поиск
4. **Командная работа** - добавь всех участников проекта

## 📁 Структура файлов

```
.your-project/
└── .qwen/
    ├── runtime-memory.md          # Auto-generated
    ├── state/
    │   ├── current-thread.json    # Thread State
    │   ├── project-manifest.json  # Project info
    │   └── artifact-index.json    # Artifacts
    └── shared/
        ├── shared-memory.json     # Team memory
        └── semantic-index.json    # Search index
```

## 🎯 Примеры использования

### Добавить решение команды
1. Открой вкладку **Shared Memory**
2. Click **Add** возле Team Decisions
3. Введи текст решения
4. Click **Add Decision**

### Найти информацию
1. Открой вкладку **Semantic Search**
2. Введи запрос (например, "authentication jwt")
3. Посмотри результаты с процентом совпадения

### Продолжить задачу
1. Открой вкладку **Thread State**
2. Введи текущую задачу
3. Добавь активные артефакты
4. Работай с Qwen Code CLI

## 🆘 Troubleshooting

**Сервер не запускается:**
```bash
# Проверь порт
lsof -i :3000

# Используй другой порт
QWX_WEB_PORT=8080 npm run web
```

**Нет данных в интерфейсе:**
```bash
# Инициализируй проект
node /path/to/universal-dev-runtime/init-demo.js

# Или через CLI
qwx --bootstrap
```

**Поиск не находит:**
```bash
# Добавь документы
curl -X POST http://localhost:3000/api/semantic-documents \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here", "type": "note"}'
```
