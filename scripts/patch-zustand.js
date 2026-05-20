const fs = require('fs');
const path = require('path');

// ==================== Patch 1: zustand ====================
const zustandPath = path.join(__dirname, '..', 'node_modules', 'zustand', 'package.json');
if (fs.existsSync(zustandPath)) {
  const pkg = JSON.parse(fs.readFileSync(zustandPath, 'utf8'));

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

  fs.writeFileSync(zustandPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Patched zustand: removed all "import" export conditions');
} else {
  console.log('zustand not found, skipping patch');
}

// ==================== Patch 2: react-native-track-player TurboModule + Kotlin fixes ====================
const kotlinPath = path.join(
  __dirname, '..', 'node_modules', 'react-native-track-player',
  'android', 'src', 'main', 'java', 'com', 'doublesymmetry', 'trackplayer',
  'module', 'MusicModule.kt'
);

if (fs.existsSync(kotlinPath)) {
  let content = fs.readFileSync(kotlinPath, 'utf8');
  let patched = false;

  // === Fix 1: TurboModule compatibility ===
  // `fun method(params) = scope.launch { ... }` returns Job, but TurboModule requires void/Unit.
  // Convert to block body: `fun method(params) { scope.launch { ... } }`
  // This requires re-indenting the method body by 4 extra spaces.

  const lines = content.split('\n');
  const result = [];
  let i = 0;
  let turboModulePatched = false;

  while (i < lines.length) {
    const line = lines[i];

    // Pattern: `    fun name(params) = scope.launch {` on one line
    const singleLineMatch = line.match(/^(\s+)(fun \w+\(.*\)) = scope\.launch \{$/);
    // Pattern: `    fun name(params) =` then `        scope.launch {` on next line
    const multiLineStartMatch = line.match(/^(\s+)(fun \w+\(.*\)) =$/);

    if (singleLineMatch) {
      const indent = singleLineMatch[1];
      const funcSig = singleLineMatch[2];
      result.push(indent + funcSig + ' {');
      result.push(indent + '    scope.launch {');
      i++;
      // Now read the body until the matching closing brace
      let depth = 1; // entered scope.launch {
      while (i < lines.length && depth > 0) {
        const bodyLine = lines[i];
        const opens = (bodyLine.match(/\{/g) || []).length;
        const closes = (bodyLine.match(/\}/g) || []).length;
        depth += opens - closes;
        if (depth === 0) {
          // This closing } is for scope.launch
          // Re-indent it 4 spaces deeper, then add function's closing }
          result.push(indent + '    ' + bodyLine.trim());
          result.push(indent + '}');
        } else {
          // Re-indent body 4 spaces deeper
          if (bodyLine.trim().length > 0) {
            result.push('    ' + bodyLine);
          } else {
            result.push(bodyLine);
          }
        }
        i++;
      }
      turboModulePatched = true;
      continue;
    }

    if (multiLineStartMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine.match(/^\s+scope\.launch \{$/)) {
        const indent = multiLineStartMatch[1];
        const funcSig = multiLineStartMatch[2];
        result.push(indent + funcSig + ' {');
        result.push(indent + '    scope.launch {');
        i += 2;
        // Read the body
        let depth = 1;
        while (i < lines.length && depth > 0) {
          const bodyLine = lines[i];
          const opens = (bodyLine.match(/\{/g) || []).length;
          const closes = (bodyLine.match(/\}/g) || []).length;
          depth += opens - closes;
          if (depth === 0) {
            result.push(indent + '    ' + bodyLine.trim());
            result.push(indent + '}');
          } else {
            if (bodyLine.trim().length > 0) {
              result.push('    ' + bodyLine);
            } else {
              result.push(bodyLine);
            }
          }
          i++;
        }
        turboModulePatched = true;
        continue;
      }
    }

    result.push(line);
    i++;
  }

  if (turboModulePatched) {
    content = result.join('\n');
    patched = true;
  }

  // === Fix 2: Kotlin 2.1.20 strict null safety ===
  // Arguments.fromBundle(arguments?.bundle) where arguments?.bundle is nullable → arguments?.bundle!!
  if (content.includes('Arguments.fromBundle(arguments?.bundle)')) {
    content = content.replace(
      /Arguments\.fromBundle\(arguments\?\.bundle\)/g,
      'Arguments.fromBundle(arguments?.bundle!!)'
    );
    patched = true;
  }

  // Note: Do NOT add !! to local variables like `bundle` that are already non-null (e.g., `var bundle = Bundle()`)
  // Only `arguments?.bundle` needs !! because it's a nullable access chain

  if (patched) {
    fs.writeFileSync(kotlinPath, content);
    console.log('Patched react-native-track-player: TurboModule + Kotlin null safety fixes');
  } else {
    console.log('react-native-track-player: patches already applied or not needed');
  }
} else {
  console.log('react-native-track-player Kotlin source not found, skipping patch');
}
