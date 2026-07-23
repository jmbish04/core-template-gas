const fs = require('fs');

const fileList = fs.readFileSync('target_files_unique.txt', 'utf8').split('\n').filter(Boolean);

const tasks = [];

for (const file of fileList) {
  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.mjs')) {
    tasks.push({
      filePath: file,
      action: 'JSDoc Addition',
      status: 'pending'
    });
  } else if (file.endsWith('README.md') || file.endsWith('AGENTS.md')) {
    tasks.push({
      filePath: file,
      action: file.includes('README.md') ? 'README Creation' : 'AGENTS.md Update',
      status: 'pending'
    });
  }
}

// Ensure missing README/AGENTS are added
const projectsDirs = fs.readdirSync('projects', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => `projects/${d.name}`);
const sharedDirs = fs.readdirSync('shared/src', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => `shared/src/${d.name}`);

const allDirs = [...projectsDirs, ...sharedDirs];
for (const dir of allDirs) {
  const readme = `${dir}/README.md`;
  const agents = `${dir}/AGENTS.md`;

  if (!tasks.some(t => t.filePath === readme)) {
    tasks.push({ filePath: readme, action: 'README Creation', status: 'pending' });
  }
  if (!tasks.some(t => t.filePath === agents)) {
    tasks.push({ filePath: agents, action: 'AGENTS.md Update', status: 'pending' });
  }
}

const rootReadme = 'README.md';
const rootAgents = 'AGENTS.md';
if (!tasks.some(t => t.filePath === rootReadme)) tasks.push({ filePath: rootReadme, action: 'README Creation', status: 'pending' });
if (!tasks.some(t => t.filePath === rootAgents)) tasks.push({ filePath: rootAgents, action: 'AGENTS.md Update', status: 'pending' });

tasks.sort((a, b) => a.filePath.localeCompare(b.filePath));

fs.writeFileSync('tasks_output.json', JSON.stringify({ tasks }, null, 2));
