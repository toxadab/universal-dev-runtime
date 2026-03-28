# Ruby on Rails Example

## Bootstrap

```bash
cd your-rails-project
qwx --bootstrap
```

## Detected Stack

- Ruby (Gemfile)
- Rails (Gemfile.lock)
- Docker (docker-compose.yml)
- Git (.git)

## Example Session

```bash
# Search existing patterns
qwx --search "active record scope"

# Add new controller
qwx "create a ProductsController with CRUD actions"

# Continue session
qwx --continue "add pagination with kaminari"

# Search memory
qwx --search "rails concern"
```

## Typical Shared Memory

```json
{
  "decisions": [
    "Use Active Record for all queries",
    "Concerns for shared logic",
    "PostgreSQL for database"
  ],
  "patterns": [
    "Models in app/models/",
    "Controllers in app/controllers/",
    "Concerns in app/models/concerns/"
  ],
  "integrations": [
    "PostgreSQL",
    "Redis",
    "Sidekiq"
  ]
}
```
