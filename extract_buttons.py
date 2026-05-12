import re

with open('AgentPerformanceTable_old.js', 'r', encoding='utf-8') as f:
    content = f.read()

buttons = re.findall(r'<button[^>]*>(.*?)</button>', content, re.DOTALL)
for i, b in enumerate(buttons):
    text = re.sub(r'<[^>]+>', '', b).strip()
    if text:
        print(f"Button {i}: {text}")
