## 2026-10-20 - Unmemoized Chat Message Formatting on Keystroke Input
**Learning:** In interactive AI playground applications, controlled input state (`inputText`) re-renders the parent component on every keystroke. Rendering historical chat messages inline with multi-pass regex Markdown parsing (`renderFormattedText`) causes unnecessary O(N) re-parses on every single character typed.
**Action:** Always extract individual message items into a memoized `React.memo` component (`ChatMessageItem`) and wrap copy/action handlers in `useCallback` to prevent re-parsing message history during typing.
