# Frontend Pattern

The repo uses a React frontend pattern inspired by the `retro-ref/React-Google-Apps-Script-main.zip` reference.

## Per-Project Structure

```text
projects/<name>/
├── appsscript.json
└── src/
    ├── client/
    │   ├── index.html
    │   ├── main.tsx
    │   └── App.tsx
    └── server/
        └── main.ts
```

## Build Flow

- the client is bundled into a single inline HTML payload
- the server is bundled into `Code.js`
- server code serves `Index.html` through `HtmlService.createHtmlOutputFromFile`

This keeps clasp output simple while preserving a modern frontend authoring flow.
