// check_const_declarations.js (Filtering Directories)
const glob = require('glob').sync;
const fs = require('fs');
const path = require('path');

const searchTerms = ['const initialLoad', 'const totalRecords'];
const excludeDirs = ['node_modules', '.git'];

const files = glob('**/*.js', { ignore: excludeDirs });

if (files) {
    files.forEach(file => {
        const filePath = path.resolve(file);

        // Check if it's a file before attempting to read it
        if (fs.statSync(filePath).isFile()) { // Add this check
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, lineNumber) => {
                searchTerms.forEach(term => {
                    if (line.includes(term)) {
                        console.log(`Found "${term}" in ${file}:${lineNumber + 1}`);
                        console.log(`  Line: ${line.trim()}`);
                        console.log('-----------------------');
                    }
                });
            });
        } else {
            console.log(`Skipping directory: ${filePath}`); // Optional: Log skipped directories
        }
    });
} else {
    console.error("Glob.sync error or no files found.");
}