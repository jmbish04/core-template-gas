import fs from 'fs';

const fileList = fs.readFileSync('target_files_unique.txt', 'utf8').split('\n').filter(Boolean);

const tasks = [];
const fileSet = new Set();

for (const file of fileList) {
  fileSet.add(file);
  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.mjs')) {
    tasks.push({
      filePath: file,
      action: 'JSDoc Addition',
      status: 'pending'
    });
  } else if (file.endsWith('README.md') || file.endsWith('AGENTS.md')) {
    tasks.push({
      filePath: file,
      action: file.endsWith('README.md') ? 'README Creation' : 'AGENTS.md Update',
      status: 'pending'
    });
  }
}

// Ensure missing README/AGENTS are added
const projectsDirs = fs.readdirSync('projects', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => `projects/${d.name}`);
let sharedDirs = [];
if (fs.existsSync('shared/src')) {
  sharedDirs = fs.readdirSync('shared/src', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => `shared/src/${d.name}`);
}

const allDirs = [...projectsDirs, ...sharedDirs];
for (const dir of allDirs) {
  const readme = `${dir}/README.md`;
  const agents = `${dir}/AGENTS.md`;

  if (!fileSet.has(readme)) {
    tasks.push({ filePath: readme, action: 'README Creation', status: 'pending' });
    fileSet.add(readme);
  }
  if (!fileSet.has(agents)) {
    tasks.push({ filePath: agents, action: 'AGENTS.md Update', status: 'pending' });
    fileSet.add(agents);
  }
}

const rootReadme = 'README.md';
const rootAgents = 'AGENTS.md';
if (!fileSet.has(rootReadme)) {
  tasks.push({ filePath: rootReadme, action: 'README Creation', status: 'pending' });
}
if (!fileSet.has(rootAgents)) {
  tasks.push({ filePath: rootAgents, action: 'AGENTS.md Update', status: 'pending' });
}

tasks.sort((a, b) => a.filePath.localeCompare(b.filePath));

fs.writeFileSync('tasks_output.json', JSON.stringify({ tasks }, null, 2));
