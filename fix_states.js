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
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    content = content
        .replace(/\bbg-red-50\b/g, 'bg-destructive/10')
        .replace(/\bbg-red-500\b/g, 'bg-destructive')
        .replace(/\bborder-red-[123]00\b/g, 'border-destructive/30')
        .replace(/\btext-red-[567]00\b/g, 'text-destructive')
        
        .replace(/\bbg-green-[5]0\b/g, 'bg-success/10')
        .replace(/\bbg-green-100\b/g, 'bg-success/20')
        .replace(/\btext-green-[567]00\b/g, 'text-success')
        
        .replace(/\bbg-yellow-100\b/g, 'bg-warning/20')
        .replace(/\btext-yellow-[57]00\b/g, 'text-warning')
        
        .replace(/\bbg-purple-500\b/g, 'bg-primary')
        .replace(/\bbg-gray-200\b/g, 'bg-muted');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log("Fixed states in " + filePath);
    }
}

walkDir(path.join(__dirname, 'src'), processFile);
