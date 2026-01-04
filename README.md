# Auto Git Pusher 🚀

**Because typing `git push` is just too much work.**

Let's be real. I’m a developer. You’re a developer. We solve complex problems all day. But you know what’s annoying? Manually committing and pushing code every 5 minutes just to save your work. 

I got tired of it. So I built this. Well, I told an AI to build it, and here we are. It’s the peak of engineering laziness.

## Why Does This Exist?

I have better things to do than babysit my terminal. This tool watches my code like a hawk (or a very bored security guard). When it sees I've done enough work (precisely 5 files worth of "work"), it yeets it to GitHub automatically.

| The Old Way (Boring) | The Auto-Pusher Way (Genius) |
| :--- | :--- |
| Type `git add .` | Do nothing. |
| Type `git commit -m "stuff"` | Still doing nothing. |
| Type `git push` | Sip coffee. |
| Realize you forgot a file | It's already handled. |
| **Effort: 100%** | **Effort: 0%** |

## How I Made This

I literally just asked an AI agent to "make a thing that pushes my code when I'm too lazy to do it." We went back and forth, I told it to handle errors (because obviously things break), and we added a "watch mode" so it runs forever.

It’s not rocket science. It’s just smarter than doing it manually.

## How to Run It

You barely need to do anything.

1. **Install dependencies** (do this once):
   ```bash
   npm install
   ```
2. **Start the magic**:
   ```bash
   npm start
   ```
3. **Select your branch** from the list.
4. **Go back to coding.** 

The tool will sit in the background. When you change 5 files, it wakes up, pushes them, and goes back to sleep.

## Technical Details (For Nerds Only)
*   It uses Node.js.
*   It uses `simple-git`.
*   It has a loop.
*   That’s it. Bye.
