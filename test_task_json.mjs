import fs from 'fs';
const tasks = JSON.parse(fs.readFileSync('tasks_output.json', 'utf8')).tasks;
const missing = [];
const tsFiles = Array.from(new Set(fs.readFileSync('target_files_unique.txt', 'utf8').split('\n').filter(Boolean)));
for (const file of tsFiles) {
  if (!tasks.find(t => t.filePath === file) && !file.endsWith('README.md') && !file.endsWith('AGENTS.md')) {
    missing.push(file);
  }
}
console.log('Missing files:', missing.length);
