# Contributing to CNI — College Notes Index

Thanks for your interest in contributing! CNI is a community-driven project — every contribution helps students study better.

---

## 📂 Adding Notes / Files

This is the most common way to contribute. You don't need to write any code.

### Step-by-step:

1. **Fork** the repository and clone it locally.

2. **Add your files** to the correct folder:
   ```
   Files/
   └── SUBJECT_CODE/
       ├── SUBJECT_UNIT_1/
       │   ├── your-notes.pdf
       │   └── handwritten-notes.pdf
       ├── SUBJECT_UNIT_2/
       │   └── lecture-slides.pptx
       └── SUBJECT_PYQS/
           └── question-bank.pdf
   ```

3. **Naming conventions:**
   - **Subject folder:** Use the subject abbreviation (e.g., `DSA`, `DBMS`, `CN`)
   - **Unit folders:** Use `SUBJECT_UNIT_1`, `SUBJECT_UNIT_2`, etc.
   - **PYQ folders:** Use `SUBJECT_PYQS` or `SUBJECT_PYQ`
   - **Files:** Use descriptive names (e.g., `Unit 1 Introduction.pdf`, not `notes.pdf`)

4. **Regenerate the tree:**
   ```bash
   npm run build:tree
   ```
   This scans the `Files/` directory and updates `tree.json` automatically.

5. **Commit and submit a Pull Request.**

### Example: Adding a new subject

```bash
# Create the subject folder structure
mkdir -p Files/NEWSUBJECT/NEWSUBJECT_UNIT_1
mkdir -p Files/NEWSUBJECT/NEWSUBJECT_UNIT_2
mkdir -p Files/NEWSUBJECT/NEWSUBJECT_PYQS

# Add your files
cp ~/Downloads/unit1-notes.pdf Files/NEWSUBJECT/NEWSUBJECT_UNIT_1/
cp ~/Downloads/question-bank.pdf Files/NEWSUBJECT/NEWSUBJECT_PYQS/

# Rebuild the index
npm run build:tree
```

> **Note:** New subjects will appear automatically on the site after running `build:tree`. To customize the icon and color, edit the `ICONS` and `FULL_NAMES` objects in `app.js`.

---

## 🎨 Improving the Website

The site is built with vanilla HTML, CSS, and JavaScript — no frameworks needed.

### Project structure:

```
├── index.html        # Main HTML shell
├── styles.css        # Design system & all styles
├── app.js            # Application logic & rendering
├── tree.json         # Auto-generated file index (don't edit manually)
├── scripts/
│   └── build-tree.js # Script to regenerate tree.json
└── Files/            # All study material organized by subject
```

### Running locally:

```bash
npm run dev
```

This starts a local server. Open [http://localhost:3000](http://localhost:3000).

### Key areas to improve:

- **Design & UX** — The site uses a custom CSS design system in `styles.css`. All design tokens (colors, spacing, radii) are CSS custom properties in `:root`.
- **Features** — `app.js` handles views, search, navigation, and favorites. It's vanilla JS with no dependencies.
- **Performance** — The site loads `tree.json` at startup. For very large collections, consider lazy loading.

---

## 🐛 Reporting Issues

Open a [GitHub Issue](https://github.com/Bulbule-Tanmay/StudySite/issues) with:
- What you expected to happen
- What actually happened
- Browser and device info
- Screenshots if applicable

---

## 📋 Pull Request Guidelines

1. **Keep PRs focused** — one feature or fix per PR.
2. **Test locally** — make sure the site works before submitting.
3. **Describe your changes** — explain what you changed and why.
4. **Don't edit `tree.json` manually** — always use `npm run build:tree`.

---

## 🤝 Code of Conduct

Be respectful and constructive. We're all here to help each other learn.

---

## Supported File Types

The build script indexes these file types:
`.pdf`, `.docx`, `.doc`, `.pptx`, `.ppt`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.txt`, `.md`, `.xlsx`, `.xls`, `.csv`

---

Thank you for contributing! 🎓
