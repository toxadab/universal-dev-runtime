# Go / Gin Example

## Bootstrap

```bash
cd your-go-project
qwx --bootstrap
```

## Detected Stack

- Go (go.mod)
- Gin (go.sum with gin-gonic)
- Docker (Dockerfile)
- Git (.git)

## Example Session

```bash
# Search existing patterns
qwx --search "handler middleware"

# Add new handler
qwx "create a GetUserHandler with JWT auth"

# Continue session
qwx --continue "add input validation"

# Search memory
qwx --search "gorm repository"
```

## Typical Shared Memory

```json
{
  "decisions": [
    "Use Gin for HTTP server",
    "GORM for database",
    "JWT middleware for auth"
  ],
  "patterns": [
    "Handlers in internal/handler/",
    "Models in internal/model/",
    "Middleware in internal/middleware/"
  ],
  "integrations": [
    "Gin",
    "GORM",
    "golang-jwt"
  ]
}
```
