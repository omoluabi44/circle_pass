with open("src/components/layout/FooterNewsletter.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("      )}\n      )}\n    </div>\n  );\n}", "      )}\n    </div>\n  );\n}")

with open("src/components/layout/FooterNewsletter.tsx", "w", encoding="utf-8") as f:
    f.write(content)
