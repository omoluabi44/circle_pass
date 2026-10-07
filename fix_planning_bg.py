with open(r'src/components/sections/PlanningVotingSplit.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(
    r'<section className="bg-primary([^"]+)">', 
    r'<section className="\1 bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: "url(\'/planning_your_first_events_section.PNG\')" }}>', 
    text
)

with open(r'src/components/sections/PlanningVotingSplit.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
