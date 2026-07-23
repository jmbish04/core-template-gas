#!/bin/bash

echo "Collecting files..."

# 1. Scripts
find scripts -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" | sort > target_files.txt

# 2. Shared Source
find shared/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | sort >> target_files.txt

# 3. Projects
find projects -type f -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*" \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | sort >> target_files.txt

# 4. Project-Level Documentation
for dir in projects/*; do
  if [ -d "$dir" ]; then
    echo "$dir/README.md" >> target_files.txt
    echo "$dir/AGENTS.md" >> target_files.txt
  fi
done

# 5. Shared Library Documentation
for dir in shared/src/*; do
  if [ -d "$dir" ]; then
    echo "$dir/README.md" >> target_files.txt
    echo "$dir/AGENTS.md" >> target_files.txt
  fi
done

# 6. Root Documentation
echo "README.md" >> target_files.txt
echo "AGENTS.md" >> target_files.txt

# Remove duplicates
sort -u target_files.txt > target_files_unique.txt
wc -l target_files_unique.txt
cat target_files_unique.txt
