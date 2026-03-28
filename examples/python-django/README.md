# Python / Django Example

## Bootstrap

```bash
cd your-django-project
qwx --bootstrap
```

## Detected Stack

- Python (requirements.txt)
- Django (manage.py)
- Docker (docker-compose.yml)
- Git (.git)

## Example Session

```bash
# Search existing patterns
qwx --search "model queryset"

# Add new view
qwx "create a ListView for Article model"

# Continue session
qwx --continue "add filtering by category"

# Search memory
qwx --search "django orm"
```

## Typical Shared Memory

```json
{
  "decisions": [
    "Use Django ORM for all queries",
    "Class-based views for REST API",
    "PostgreSQL for database"
  ],
  "patterns": [
    "Models in app/models.py",
    "Views in app/views.py",
    "Templates in app/templates/"
  ],
  "integrations": [
    "Django REST Framework",
    "PostgreSQL",
    "Celery"
  ]
}
```
