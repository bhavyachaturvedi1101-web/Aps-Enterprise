const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      checkDir(full);
    } else if (f.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const hooks = ['useEffect', 'useState', 'useMemo', 'useCallback', 'useRef', 'useContext'];
      for (const hook of hooks) {
        const usageRegex = new RegExp('\\b' + hook + '\\s*\\(');
        const importRegex = new RegExp('\\b' + hook + '\\b[\\s\\S]*?from\\s+[\'"]react[\'"]');
        const reactPrefix = new RegExp('React\\.' + hook);
        if (usageRegex.test(content) && !importRegex.test(content) && !reactPrefix.test(content)) {
          console.log(`[ALERT] Missing ${hook} in ${full}`);
        }
      }
    }
  }
}

checkDir(path.join(__dirname, '../frontend/src'));
console.log('Hook audit complete. No further issues found.');
