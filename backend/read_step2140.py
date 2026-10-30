with open('C:/Users/VISHNU/.gemini/antigravity/brain/9c2ca289-9fdc-496c-b919-3356d99cd2ca/.system_generated/logs/transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if '"step_index":2140' in line or '"step_index": 2140' in line:
            import json
            obj = json.loads(line)
            print("THINKING:", obj.get("thinking", "")[:600])
            print("CONTENT:", obj.get("content", "")[:600])
            break
