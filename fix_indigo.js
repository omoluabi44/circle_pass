const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx')) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    content = content
        .replace(/\btext-indigo-500\b mb-8 px-4/g, 'text-logo mb-8 px-4 font-logo')
        .replace(/\btext-2xl font-bold text-indigo-500 mb-8 px-4/g, 'text-2xl font-bold text-logo font-logo mb-8 px-4')
        .replace(/\btext-indigo-[45678]00\b/g, 'text-primary')
        .replace(/\bbg-indigo-[45678]00\b/g, 'bg-primary')
        .replace(/\bhover:bg-indigo-[45678]00\b/g, 'hover:bg-primary/90')
        .replace(/\bbg-indigo-50\b/g, 'bg-primary/10')
        .replace(/\bbg-indigo-100\b/g, 'bg-primary/20')
        .replace(/\bfocus:ring-indigo-[45678]00\b/g, 'focus:ring-primary')
        .replace(/\bfocus:border-indigo-[45678]00\b/g, 'focus:border-primary');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log("Fixed " + filePath);
    }
}

walkDir(path.join(__dirname, 'src'), processFile);
