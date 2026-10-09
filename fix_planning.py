with open(r'src/components/sections/PlanningVotingSplit.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace left side
text = text.replace(
    'bg-white p-8 md:p-12 rounded-3xl border border-gray-200 shadow-sm',
    'bg-card text-card-foreground p-8 md:p-12 rounded-3xl border border-border shadow-sm'
)
text = text.replace(
    'text-gray-600 mb-8',
    'text-muted-foreground mb-8'
)

# Replace right side
text = text.replace(
    'bg-secondary p-8 md:p-12 rounded-3xl border border-gray-200 shadow-sm',
    'bg-secondary text-secondary-foreground p-8 md:p-12 rounded-3xl border border-border shadow-sm'
)

with open(r'src/components/sections/PlanningVotingSplit.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
