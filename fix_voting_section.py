with open(r'src/components/sections/LiveVotingNominations.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old = '''    <section className="py-24 px-4 bg-background bg-cover bg-center bg-no-repeat" id="voting" style={{ backgroundImage: "url(\\'/voting_section.PNG\\')" }}>
      <div className="container mx-auto">'''

new = '''    <section className="py-24 px-4 bg-cover bg-center bg-no-repeat relative" id="voting" style={{ backgroundImage: "url('/voting_section.PNG')" }}>
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="container mx-auto relative z-10">'''

if old in text:
    text = text.replace(old, new)
    print("FOUND and replaced")
else:
    print("NOT FOUND")

with open(r'src/components/sections/LiveVotingNominations.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
