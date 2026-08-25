const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [search, replace] of replacements) {
    content = content.split(search).join(replace);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

const dir = path.join(__dirname, '../frontend/src');

function walkDir(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      replaceInFile(fullPath, [
        [
          "const API = 'http://localhost:5000/api';", 
          "const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';"
        ],
        [
          "const API = 'http://localhost:5000/api/a3';",
          "const API = import.meta.env.PROD ? '/api/a3' : 'http://localhost:5000/api/a3';"
        ],
        [
          "'http://localhost:5000/api/notifications",
          "(import.meta.env.PROD ? '/api' : 'http://localhost:5000/api') + '/notifications"
        ],
        [
          "`http://localhost:5000/api/a3/export",
          "`${import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'}/a3/export"
        ]
      ]);
    }
  }
}

walkDir(dir);
console.log('Done updating URLs.');
