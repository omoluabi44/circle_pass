import json
path = r"C:\Users\adeta\.gemini\antigravity\brain\0254edfa-2f52-479e-8c55-bebd536391dd\.system_generated\logs\transcript_full.jsonl"
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        if "sendgrid" in line.lower():
            try:
                data = json.loads(line)
                if data.get("source") == "USER_EXPLICIT" or data.get("source") == "MODEL":
                    content = data.get("content", "")
                    if content and "sendgrid" in content.lower():
                        print(f"[{data.get('created_at')}] {data.get('source')}: {content[:200]}...")
                    
                    thinking = data.get("thinking", "")
                    if thinking and "sendgrid" in thinking.lower():
                        print(f"[{data.get('created_at')}] MODEL THOUGHT: {thinking[:200]}...")
            except:
                pass
