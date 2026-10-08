# CNI — College Notes Index

> **A quiet, editorial, and open-source study dashboard for university notes, PYQs, and reference materials.**

CNI is designed with a calm, high-craft aesthetic (inspired by Linear, Vercel docs, and Readwise) — focusing on content readability, fast keyboard-driven navigation, and zero visual clutter.

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
