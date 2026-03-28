# PHP / Symfony Example

## Bootstrap

```bash
cd your-symfony-project
qwx --bootstrap
```

## Detected Stack

- PHP (composer.json)
- Symfony (symfony.lock)
- Docker (compose.yaml)
- Git (.git)

## Example Session

```bash
# Search existing patterns
qwx --search "doctrine repository"

# Add new controller
qwx "create a ProductController with list and show actions"

# Continue session
qwx --continue "add pagination to the list"

# Search memory
qwx --search "entity manager"
```

## Typical Shared Memory

```json
{
  "decisions": [
    "Use Doctrine ORM for database",
    "Repository pattern for all queries",
    "Symfony Validator for forms"
  ],
  "patterns": [
    "Entities in src/Entity/",
    "Repositories in src/Repository/",
    "Templates in templates/"
  ],
  "integrations": [
    "Doctrine ORM",
    "Symfony Security",
    "Twig"
  ]
}
```
