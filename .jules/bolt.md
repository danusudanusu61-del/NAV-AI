## 2025-10-29 - Stat mtime Validated In-Memory Cache for JSON Persistence
**Learning:** Re-parsing JSON and reading disk files on every Express request or polling interval creates significant CPU and file I/O overhead. Validating `fs.statSync(file).mtimeMs` before returning the in-memory cache allows instant O(1) cached reads while seamlessly invalidating if the file on disk is modified externally or between test runs.
**Action:** Cache parsed JSON in memory and compare `fs.statSync(file).mtimeMs` against cached timestamp to avoid unneeded disk reads and JSON parsing.
