with open(r'src/components/sections/DiscoverySection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import1 = 'import { useState, useEffect } from "react";'
import2 = 'import { useState, useEffect } from "react";\nimport { useSearchParams } from "next/navigation";'
text = text.replace(import1, import2)

func1 = 'export function DiscoverySection({ limit = 4, searchParams }: DiscoverySectionProps) {\n  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");\n  const [activeCategory, setActiveCategory] = useState<string>("ALL");'
func2 = '''export function DiscoverySection({ limit, searchParams }: DiscoverySectionProps) {
  const params = useSearchParams();
  const catParam = params?.get('category')?.toUpperCase();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [activeCategory, setActiveCategory] = useState<string>(
    catParam && CATEGORIES.includes(catParam) ? catParam : "ALL"
  );'''
text = text.replace(func1, func2)

with open(r'src/components/sections/DiscoverySection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
