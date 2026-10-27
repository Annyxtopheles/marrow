# Marrow

<p align="center">
  <strong>A focused, minimalist prose editor and non-linear knowledge engine designed for novelists, essayists, and long-form storytellers.</strong>
</p>

---

## Philosophy

Marrow is built on a simple premise: **writing tools should feel like sanctuaries, not databases.**

Modern note-taking software has become bloated with relational databases, Kanban boards, noisy tagging systems, and saturated dashboard widgets. Marrow strips away the noise to leave only what matters—the rhythm of the cursor, the architecture of the manuscript, and the texture of prose.

- **Zero Clutter**: No database tags blocking the view between chapter title and the opening line.
- **Acquired-Taste Typography**: Proportional, authentic literary typography (Newsreader, Jakarta Sans, and Space Grotesk) without monospace distractions.
- **Fail-Safe & Local-First**: Your manuscript lives in your browser’s IndexedDB and LocalStorage with continuous snapshot history. It opens instantly, works 100% offline, and never locks you into a proprietary cloud.

---

## Key Features

### 1. Immersive Prose Canvas
- **Semantic Title Heading**: Clean `<h1>` heading with seamless keyboard transitions—press <kbd>Enter</kbd> to drop directly into your opening sentence.
- **Typewriter Mode**: Keeps your active line centered vertically at natural eye level as you type.
- **Dual Writing Modes**: Toggle between formatted **Live Preview** and raw **Markdown Source** with one click.
- **Native Dictation & Read-Aloud**: Voice speech-to-text dictation and text-to-speech auditory proofreading built directly on native browser APIs with zero external service latency.
- **Full Screen Toggle**: Instant header button (<kbd>Maximize</kbd>) to eliminate OS and browser chrome for pure immersion.

### 2. Atmosphere Themes
Eight deeply considered color spaces tailored for varying lighting conditions and aesthetic sensibilities:

| Theme | Mood & Description |
| :--- | :--- |
| **Marrow Charcoal** | Deep graphite and obsidian warmth for night sessions. |
| **Canvas Linen** | Warm textured paper and rich ink for daytime clarity. |
| **Modern Studio** | Cool slate with subtle azure highlights. |
| **Sakura Dawn** | Bone-white minimal canvas with soft rose accents. |
| **Vintage Sepia** | Warm parchment and aged book leaves. |
| **Nordic Pine** | Deep evergreen forest dark with sage mint accents. |
| **Dreamscape** | Frosted glass panels, dynamic aurora gradient background, and organic paper grain noise. |
| **Brutalist Grunge** | Solid matte asphalt (`#121214`) with stark industrial amber accents and crisp geometry. |

### 3. Manuscript Hierarchy & Compilation
- **Nested Folder Architecture**: Organize into Acts, Chapters, Scenes, Character Dossiers, and Worldbuilding lore with fluid drag-and-drop reordering.
- **Manuscript Compiler**: Export the complete manuscript or a single folder into formatted `.md` or `.txt` with customizable scene dividers, chapter heading formatting, and real-time word count estimates.
- **Global Search**: Search instantly across titles, manuscript content, and metadata tags from a unified search bar.

### 4. Non-Linear Knowledge Graph
- **Bi-Directional `[[Wikilinks]]`**: Connect notes, characters, and locations with intuitive bracket syntax.
- **Interactive Graph**: Visualize your narrative's interconnected world with an interactive physics-driven relationship graph.
- **Backlink Inspector**: See every mention and reference pointing back to the current scene in real time.

### 5. Cadence, Sprints & Target Goals
- **Word Count Goals**: Set granular targets per chapter or across daily sessions.
- **Live Stats Bar**: Displays words, characters, estimated reading time, and goal pacing percentages without cluttering the canvas.
- **Scene Beats Checklist**: Interactive scene outline checklist embedded directly into the chapter drawer to track narrative progression beat-by-beat.
- **Writing Sprints**: Configurable sprint timers to build writing momentum.

### 6. Lumen — The Quiet Editorial Sounding Board
Lumen is a craft-focused AI editorial partner powered by the Google Gemini API. It acts as an experienced developmental editor rather than a generic text generator:
- **Three Focused Personas**:
  - *Editorial Partner*: Diagnoses pacing, subtext, character agency, and structure.
  - *Sensory Visionary*: Recommends evocative sensory textures (sight, sound, scent, touch) and metaphors.
  - *Sharp Critic*: Stress-tests scenes for narrative stakes, passive dialogue, and plot holes.
- **One-Click Editorial Chips**: Instant scene critique, sensory detailing, brainstorm next move, and beat generation.
- **Restrained Output**: Rendered in clean, understated Markdown with 1-click import into your scene beats drawer.

### 7. Version History & Fail-Safe Protection
- **Vault Undo & Redo**: Global action history with <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> recovery for note deletions, renames, and folder moves.
- **Time Machine Slider**: Inspect prior historical snapshots of any note and restore previous revisions with one click.
- **Trash Recovery**: Soft-delete system prevents accidental data loss.
- **Cloud Backup**: Optional one-click Google Drive synchronization with versioned JSON vault archives.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or later)
- `npm`

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Annyxtopheles/marrow.git
cd marrow
npm install
```

### Development
Start the local Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Testing
Run the automated test suite (verifying storage, themes, wikilinks, compiler, and undo/redo logic):
```bash
npm test
```

### Linting
Run the fast Oxlint linter:
```bash
npm run lint
```

### Production Build
Compile and bundle the production release:
```bash
npm run build
```

---

## Technical Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Editor Engine**: [TipTap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai)
- **Local Storage**: IndexedDB + LocalStorage dual-layer persistence

---

## License

This project is open source and available under the [MIT License](LICENSE).
