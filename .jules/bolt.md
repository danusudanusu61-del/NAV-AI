## 2025-03-09 - Memoizing Chat Message Item Rendering
**Learning:** In chat interfaces with an active prompt input (`textarea`), state updates on every keystroke cause parent component re-renders. If message text parsing (e.g. regular expressions for code fences and markdown) runs inline in the render loop, every single past message is re-parsed on every character typed.
**Action:** Extract chat message items into dedicated `React.memo` components with localized state (such as code block copy status). This ensures $O(1)$ keystroke render cost regardless of message history size.
