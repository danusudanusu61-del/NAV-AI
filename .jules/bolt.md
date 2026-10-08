# Bolt's Journal - Critical Learnings

## 2025-05-15 - In-Memory Caching for Synchronous File Operations
**Learning:** In Node.js Express servers reading persistent data from JSON files, calling `fs.readFileSync` and `JSON.parse` inside request handlers or polling endpoints blocks the event loop and incurs unnecessary I/O overhead on every request.
**Action:** Load persistent JSON data into in-memory data structures at startup, serve reads directly from memory, and perform writes asynchronously without blocking the request pipeline.
