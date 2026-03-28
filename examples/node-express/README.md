# Node.js / Express Example

## Bootstrap

```bash
cd your-node-project
qwx --bootstrap
```

## Detected Stack

- Node.js (package.json)
- TypeScript (tsconfig.json)
- Docker (Dockerfile)
- Git (.git)

## Example Session

```bash
# Search existing patterns
qwx --search "middleware authentication"

# Add new route
qwx "create a POST /api/users endpoint with validation"

# Continue session
qwx --continue "add JWT authentication"

# Search memory
qwx --search "express router"
```

## Typical Shared Memory

```json
{
  "decisions": [
    "Use Express for REST API",
    "JWT for stateless auth",
    "Mongoose for MongoDB"
  ],
  "patterns": [
    "Routes in src/routes/",
    "Controllers in src/controllers/",
    "Middleware in src/middleware/"
  ],
  "integrations": [
    "Express",
    "Mongoose",
    "JWT",
    "dotenv"
  ]
}
```
