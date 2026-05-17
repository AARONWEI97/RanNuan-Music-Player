const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'node_modules', 'zustand', 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.log('zustand package.json not found, skipping patch');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function stripImport(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'import') continue;
    if (typeof value === 'object' && value !== null) {
      result[key] = stripImport(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

if (pkg.exports) {
  pkg.exports = stripImport(pkg.exports);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Patched zustand: removed all "import" export conditions');
