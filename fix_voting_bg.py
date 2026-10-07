with open(r'src/components/sections/LiveVotingNominations.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(
    r'<section className="([^"]+)" id="voting">', 
    r'<section className="\1 bg-cover bg-center bg-no-repeat" id="voting" style={{ backgroundImage: "url(\'/voting_section.PNG\')" }}>', 
    text
)

with open(r'src/components/sections/LiveVotingNominations.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
