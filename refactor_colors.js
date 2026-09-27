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

    // Replacements mapping
    content = content
        // Colors mapping
        .replace(/\btext-gray-[89]00\b/g, 'text-foreground')
        .replace(/\btext-gray-[4567]00\b/g, 'text-muted-foreground')
        .replace(/\btext-gray-[123]00\b/g, 'text-muted-foreground')
        .replace(/\bbg-gray-[5]0\b/g, 'bg-secondary')
        .replace(/\bbg-gray-100\b/g, 'bg-muted')
        .replace(/\bborder-gray-[1234]00\b/g, 'border-border')
        
        // bg-white -> bg-background
        // BUT only when it's bg-white, avoid bg-white/something
        .replace(/\bbg-white\b(?!\/)/g, 'bg-background')
        
        // bg-primary text-white -> bg-primary text-primary-foreground
        .replace(/\bbg-primary\b([\s\S]*?)\btext-white\b/g, 'bg-primary$1text-primary-foreground')
        .replace(/\btext-white\b([\s\S]*?)\bbg-primary\b/g, 'text-primary-foreground$1bg-primary')

        // Fix any remaining text-white (unless it's in specific overlays, but user said ALL)
        // Wait, text-white on bg-black/60 (like Hero video) should probably stay text-white or text-primary-foreground. Let's make it text-primary-foreground or text-background for now.
        // Actually, let's map text-white to text-background when it's standalone, except in Hero where it should just be text-primary-foreground. Let's map it to text-primary-foreground since primary-foreground is white.
        .replace(/\btext-white\b/g, 'text-primary-foreground')
        .replace(/\bborder-white\b/g, 'border-primary-foreground')
        .replace(/\bbg-indigo-500\b/g, 'bg-primary');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

walkDir(path.join(__dirname, 'src', 'app'), processFile);
