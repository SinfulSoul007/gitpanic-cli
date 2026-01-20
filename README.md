# Git Panic CLI

**Big friendly buttons for common Git disasters - Terminal Edition**

[![npm version](https://img.shields.io/npm/v/gitpanic-cli.svg)](https://www.npmjs.com/package/gitpanic-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

Git Panic CLI brings the power of the [Git Panic VS Code extension](https://github.com/SinfulSoul007/gitpanic) to your terminal. Fix Git disasters with interactive prompts instead of memorizing arcane commands.

```
$ gitpanic

  Git Panic - What went wrong?

  ── Commit Operations ──
  ❯ Undo Last Commit(s)          git reset --soft/mixed/hard HEAD~N
    Fix Commit Message           git commit --amend -m "..."
    Add Files to Last Commit     git add && git commit --amend
    Squash Commits               git reset --soft && git commit
  ── Branch Operations ──
    Recover Deleted Branch       git reflog && git checkout -b
  ── Staging Operations ──
    Unstage Files                git reset HEAD <file>
    Discard Local Changes        git checkout -- <file>
    Clean Untracked Files        git clean -fd
  ── Recovery Operations ──
    Recover File from History    git checkout <commit> -- <file>
    Stash Operations             git stash push/pop/apply
```

---

## Installation

### npm (Recommended)

```bash
npm install -g gitpanic-cli
```

### npx (No Install)

```bash
npx gitpanic-cli
```

### Homebrew (macOS/Linux)

```bash
brew tap SinfulSoul007/gitpanic
brew install gitpanic
```

---

## Usage

### Interactive Menu (Default)

Simply run `gitpanic` to open the interactive menu:

```bash
gitpanic
```

Use arrow keys to navigate, Enter to select.

### Direct Commands

Skip the menu and run commands directly:

```bash
# Undo commits
gitpanic undo          # Undo last commit
gitpanic undo 3        # Undo last 3 commits

# Fix commit message
gitpanic fix-message   # Interactive prompt
gitpanic fix-message "New message"

# Add files to last commit
gitpanic add-files     # Select files to add

# Squash commits
gitpanic squash        # Interactive prompt
gitpanic squash 3      # Squash last 3 commits

# Branch operations
gitpanic recover-branch    # Recover deleted branch

# Staging operations
gitpanic unstage       # Unstage files
gitpanic discard       # Discard changes
gitpanic clean         # Clean untracked files

# Recovery operations
gitpanic abort         # Abort merge/rebase/cherry-pick
gitpanic recover-file  # Recover file from history
gitpanic stash         # Stash operations menu

# Status and history
gitpanic status        # Show repo status with issues
gitpanic history       # Show GitPanic action history
gitpanic undo-action   # Undo last GitPanic action
```

---

## Commands Reference

| Command | Alias | Description |
|---------|-------|-------------|
| `gitpanic` | `gitpanic menu` | Open interactive menu |
| `gitpanic undo [count]` | - | Undo last N commits |
| `gitpanic fix-message [msg]` | `amend-message` | Fix last commit message |
| `gitpanic add-files` | `amend` | Add files to last commit |
| `gitpanic squash [count]` | - | Squash N commits into one |
| `gitpanic recover-branch` | `rb` | Recover deleted branch |
| `gitpanic unstage` | - | Unstage files |
| `gitpanic discard` | - | Discard local changes |
| `gitpanic clean` | - | Clean untracked files |
| `gitpanic abort` | - | Abort ongoing operation |
| `gitpanic recover-file` | `rf` | Recover file from history |
| `gitpanic stash` | - | Stash operations |
| `gitpanic status` | `s` | Show repo status |
| `gitpanic history` | `h` | Show action history |
| `gitpanic undo-action` | - | Undo last GitPanic action |

---

## Features

### Interactive Prompts

Every command guides you through the process with clear prompts:

```
$ gitpanic undo

📋 Recent commits:

1. abc1234 Add new feature (John)
2. def5678 Fix bug (John)
3. ghi9012 Initial commit (John)

? How many commits do you want to undo? 1
? How do you want to handle the changes?
  ❯ Keep changes staged (soft reset)
    Keep changes unstaged (mixed reset)
    Discard all changes (hard reset)
```

### Safety Checks

Git Panic warns you before dangerous operations:

```
⚠️  Warnings:
  • Commit "Add new feature" has been pushed. Undoing will require force push.

? Continue anyway? (y/N)
```

### Action History

Every action is recorded and can be undone:

```
$ gitpanic history

📜 GitPanic Action History

12345abc Undo 1 commit(s) with soft reset  1/19/2025, 3:30 PM [undoable]
  abc1234 → def5678

$ gitpanic undo-action
✓ Undid "Undo 1 commit(s) with soft reset"
```

### Educational Tooltips

Every menu item shows the equivalent Git command:

```
  Undo Last Commit(s)          git reset --soft/mixed/hard HEAD~N
  Fix Commit Message           git commit --amend -m "..."
```

---

## Configuration

Git Panic stores configuration in `~/.gitpanic/config.json`:

```json
{
  "confirmDangerousActions": true,
  "maxActionHistory": 50,
  "verbose": false
}
```

Action history is stored in `~/.gitpanic/history.json`.

---

## Comparison with VS Code Extension

| Feature | CLI | VS Code Extension |
|---------|-----|-------------------|
| All 16 recovery operations | ✓ | ✓ |
| Interactive prompts | ✓ | ✓ |
| Action history/undo | ✓ | ✓ |
| Educational tooltips | ✓ | ✓ |
| Safety confirmations | ✓ | ✓ |
| Diff preview | - | ✓ |
| Status bar integration | - | ✓ |

---

## Related Projects

- [gitpanic](https://github.com/SinfulSoul007/gitpanic) - VS Code extension
- [homebrew-gitpanic](https://github.com/SinfulSoul007/homebrew-gitpanic) - Homebrew formula

---

## Contributing

```bash
# Clone the repository
git clone https://github.com/SinfulSoul007/gitpanic-cli.git
cd gitpanic-cli

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm link
gitpanic --version
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Stop panicking. Start recovering.**
