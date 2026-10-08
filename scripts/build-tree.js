#!/usr/bin/env node
/**
 * build-tree.js
 * Scans the Files/ directory and generates tree.json automatically.
 *
 * Usage:  node scripts/build-tree.js
 *
 * Contributors only need to:
 *   1. Drop files into Files/<Subject>/<Group>/
 *   2. Run `npm run build:tree`
 *
 * The generated tree.json is what the website reads at runtime.
 */

const fs = require('fs');
const path = require('path');

const FILES_DIR = path.join(__dirname, '..', 'Files');
const OUTPUT = path.join(__dirname, '..', 'tree.json');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.pptx', '.ppt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.txt', '.md', '.xlsx', '.xls', '.csv',
]);

function scanDirectory() {
  const tree = { Files: {} };

  if (!fs.existsSync(FILES_DIR)) {
    console.error('Error: Files/ directory not found.');
    process.exit(1);
  }

  const subjects = fs.readdirSync(FILES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const subject of subjects) {
    const subjectPath = path.join(FILES_DIR, subject.name);
    const groups = {};

    const entries = fs.readdirSync(subjectPath, { withFileTypes: true });
    const subDirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    const rootFiles = entries
      .filter(e => e.isFile() && ALLOWED_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map(e => e.name)
      .sort();

    for (const dir of subDirs) {
      const groupPath = path.join(subjectPath, dir.name);
      const files = fs.readdirSync(groupPath, { withFileTypes: true })
        .filter(e => e.isFile() && ALLOWED_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
        .map(e => e.name)
        .sort();

      if (files.length > 0) {
        groups[dir.name] = files;
      }
    }

    if (rootFiles.length > 0) {
      groups['root_files'] = rootFiles;
    }

    if (Object.keys(groups).length > 0) {
      tree.Files[subject.name] = groups;
    }
  }

  return tree;
}

const tree = scanDirectory();
fs.writeFileSync(OUTPUT, JSON.stringify(tree, null, 2) + '\n', 'utf8');

const subjectCount = Object.keys(tree.Files).length;
const fileCount = Object.values(tree.Files).reduce((total, groups) => {
  return total + Object.values(groups).reduce((sum, files) => sum + files.length, 0);
}, 0);

console.log(`✓ tree.json generated — ${subjectCount} subjects, ${fileCount} files`);
