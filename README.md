# CNI — College Notes Index

> **A quiet, editorial, and open-source study dashboard for university notes, PYQs, and reference materials.**

CNI is designed with a calm, high-craft aesthetic (inspired by Linear, Vercel docs, and Readwise) — focusing on content readability, fast keyboard-driven navigation, and zero visual clutter.

---

## ✨ Design Principles & Features

- **Quiet, Editorial Typography**: Google Fonts **Newsreader** (classic serif display for headlines and subject titles) paired with **Inter** (refined sans for UI and file listings) and tabular numbers.
- **Warm-Neutral Themes**: Carefully tuned dark mode (`#0E0F11` background, `#15171A` surface) and warm light mode (`#FAFAF8` background, `#FFFFFF` surface) with zero-flash persistence and manual toggle.
- **Fast Command Palette (`⌘K` / `Ctrl K`)**: Quick keyboard search across all 14 subjects, units, and individual files with instant selection and preview.
- **Subject Directory & Dedicated Views**:
  - **Index View**: 2-column clean editorial cards with subject codes, serif titles, categories, and material counts.
  - **Dedicated Subject View (`#/subject/:code`)**: Deep-linkable routes with breadcrumb navigation, Course Units and Previous Year Papers (PYQs) tabs, and clean table-like file listings.
- **Accessible Document Viewer**: Clean bottom sheet / modal with PDF iframe preview, download action, and native share.
- **Zero Mocked Clutter**: No neon glow effects, no purple-blue gradient buttons, no decorative pill overload, and no vanity metrics. Real dynamic statistics computed from the filesystem tree.
- **GitHub-Only Contribution Model**: Clean and predictable repository workflow without in-app upload forms or distracting banners.

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Bulbule-Tanmay/StudySite.git
cd StudySite

# Start local server
npm run dev

# Open http://localhost:3000 in your browser
```

---

## 📂 Project Structure

```
├── index.html          # Clean semantic single-page layout & modals
├── styles.css          # Editorial design system (4/8px grid, tokens, dark/light)
├── app.js              # Routing, command palette (⌘K), subject view & state
├── tree.json           # Active index of all subjects, units, and files
├── server.js           # Built-in zero-dependency server & analytics endpoints
├── scripts/
│   └── build-tree.js   # Scans Files/ directory and regenerates tree.json
├── Files/              # University notes & PYQs
│   ├── DSA/
│   │   ├── DSA_UNIT_1/
│   │   ├── DSA_UNIT_2/
│   │   └── DSA_PYQS/
│   ├── DBMS/
│   ├── OS/
│   └── ...
├── CONTRIBUTING.md     # GitHub contribution guidelines
└── package.json
```

---

## 🤝 Contributing via GitHub

CNI uses a purely repository-driven contribution model:

1. Drop your notes/files into `Files/<SUBJECT>/<GROUP>/`
2. Run `npm run build:tree` to regenerate `tree.json`
3. Submit a Pull Request on GitHub

See [CONTRIBUTING.md](CONTRIBUTING.md) for full instructions.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
