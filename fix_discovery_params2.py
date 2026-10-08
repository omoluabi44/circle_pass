with open(r'src/components/sections/DiscoverySection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import2 = 'import { useState, useEffect } from "react";\nimport { useSearchParams } from "next/navigation";'
import1 = 'import { useState, useEffect, Suspense } from "react";'
text = text.replace(import2, import1)

func2 = '''export function DiscoverySection({ limit, searchParams }: DiscoverySectionProps) {
  const params = useSearchParams();
  const catParam = params?.get('category')?.toUpperCase();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [activeCategory, setActiveCategory] = useState<string>(
    catParam && CATEGORIES.includes(catParam) ? catParam : "ALL"
  );'''

func1 = '''// Wrap the internal logic in a component that can safely use searchParams if needed
export function DiscoverySection({ limit, searchParams }: DiscoverySectionProps) {
  const catParam = searchParams?.category?.toUpperCase();
  
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [activeCategory, setActiveCategory] = useState<string>(
    catParam && CATEGORIES.includes(catParam) ? catParam : "ALL"
  );'''

text = text.replace(func2, func1)

with open(r'src/components/sections/DiscoverySection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
