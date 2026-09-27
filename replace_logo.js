const fs = require('fs');

function updateFile(file, regex, replacement, imports) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('import { Logo }')) {
        content = content.replace(/import Link from 'next\/link';/, `import Link from 'next/link';\nimport { Logo } from '@/components/ui/Logo';`);
    }
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log("Updated " + file);
}

// Navbar
updateFile(
    'src/components/layout/Navbar.tsx',
    /<Link href="\/" className="flex items-center space-x-2">[\s\S]*?<img src="\/logo\.png"[\s\S]*?<span className="text-xl[\s\S]*?CirclePass<\/span>[\s\S]*?<\/Link>/,
    '<Logo />'
);

// Footer
updateFile(
    'src/components/layout/Footer.tsx',
    /<Link href="\/" className="flex items-center space-x-2 mb-4">[\s\S]*?<img src="\/logo\.png"[\s\S]*?<span className="text-xl[\s\S]*?CirclePass<\/span>[\s\S]*?<\/Link>/,
    '<Logo className="flex items-center space-x-2 mb-4" />'
);

// Layouts (Dashboard, Admin, Organizer)
const layouts = [
    'src/app/dashboard/layout.tsx',
    'src/app/admin/layout.tsx',
    'src/app/organizer/layout.tsx'
];

layouts.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('import { Logo }')) {
        content = content.replace(/import Link from "next\/link";/, `import Link from "next/link";\nimport { Logo } from "@/components/ui/Logo";`);
    }
    content = content.replace(/<div className="text-2xl font-bold text-logo font-logo mb-8 px-4">CirclePass<\/div>/, '<Logo withLink={false} className="flex items-center space-x-2 mb-8 px-4" textClassName="text-2xl font-bold text-logo font-logo" />');
    fs.writeFileSync(file, content);
    console.log("Updated " + file);
});
