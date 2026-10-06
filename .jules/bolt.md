## 2025-05-18 - Chat Input Keystroke Re-renders & Markdown Parsing
**Learning:** Re-rendering message histories on every keystroke when typing in input textareas causes heavy main-thread lag when messages contain regex-parsed code fences or inline markdown.
**Action:** Extract chat message rendering into a `React.memo` wrapped component and pass memoized callbacks with `useCallback` to prevent re-parsing message history during typing.
