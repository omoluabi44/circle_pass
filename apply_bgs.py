import re

# 1. Section 2: TrendingEvents (A)
with open("src/components/sections/TrendingEvents.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("url('/trendingEventBG.PNG')", "url('/background_A.jpg')")
with open("src/components/sections/TrendingEvents.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# 2. Section 4: PlanningVotingSplit (A)
with open("src/components/sections/PlanningVotingSplit.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("url('/planning_your_first_events_section.PNG')", "url('/background_A.jpg')")
with open("src/components/sections/PlanningVotingSplit.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# 3. Section 7: LiveVotingNominations (A)
with open("src/components/sections/LiveVotingNominations.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("url('/voting_section.PNG')", "url('/background_A.jpg')")
with open("src/components/sections/LiveVotingNominations.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# 4. Section 9: Pricing (A)
with open("src/components/sections/Pricing.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("url(\"/pricing_section.JPG\")", "url('/background_A.jpg')")
content = content.replace("url('/pricing_section.JPG')", "url('/background_A.jpg')")
with open("src/components/sections/Pricing.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# 5. Section 11: FAQ (B)
with open("src/components/sections/FAQ.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("className=\"py-24 px-4 bg-secondary\"", "className=\"py-24 px-4 bg-cover bg-center bg-no-repeat\" style={{ backgroundImage: \"url('/background_B.jpg')\" }}")
with open("src/components/sections/FAQ.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# 6. Section 12: Footer (C)
with open("src/components/layout/Footer.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("url(\"/circlepass_bg.png\")", "url('/background_C.jpg')")
content = content.replace("url('/circlepass_bg.png')", "url('/background_C.jpg')")
with open("src/components/layout/Footer.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# 7. Section 6: EventMedia (White)
with open("src/components/sections/EventMedia.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("bg-secondary/10", "bg-background")
with open("src/components/sections/EventMedia.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# 8. Section 8: Features (White - remove blobs)
with open("src/components/sections/Features.tsx", "r", encoding="utf-8") as f:
    content = f.read()
# Remove blobs
content = re.sub(r'<div className="absolute top-\[-10%\][^>]+/>\n\s*<div className="absolute bottom-\[-10%\][^>]+/>', '', content)
with open("src/components/sections/Features.tsx", "w", encoding="utf-8") as f:
    f.write(content)

