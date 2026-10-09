import re

def rep(filename, old, new):
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace(old, new)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

rep("src/components/sections/TrendingEvents.tsx", "url('/trendingEventBG.PNG')", "url('/background_A.jpg')")
rep("src/components/sections/TrendingEvents.tsx", "url(\\'/trendingEventBG.PNG\\')", "url('/background_A.jpg')")
rep("src/components/sections/PlanningVotingSplit.tsx", "url('/planning_your_first_events_section.PNG')", "url('/background_A.jpg')")
rep("src/components/sections/PlanningVotingSplit.tsx", "url(\\'/planning_your_first_events_section.PNG\\')", "url('/background_A.jpg')")

