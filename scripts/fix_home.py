import re

with open('src/pages/Home.js', 'r') as f:
    content = f.read()

# Remove the duplicate old auth form that's stuck between the new simple buttons and the ') : (' separator.
# The old form starts with the tab buttons div (flex gap-3) after the new code's closing </div>
# and ends just before the ) : ( that leads to the logged-in view.

# Strategy: find the unique pattern that marks the start of the old orphaned form
# and replace everything from there to the ') : (' with just ') : ('

# The old form's starting signature (after our new code's closing </div>):
# '                                    <div className="flex gap-3">'
# The end of the old form is: '                                </div>\n                            ) : ('

# Use a regex to remove the orphaned old form block
# Pattern: from the orphaned <div className="flex gap-3"> to the last </div> before ) : (
pattern = r'(\n                                </div>)\n                                    <div className="flex gap-3">.*?</div>\n(\s+\) : \()'

# Try with DOTALL
match = re.search(pattern, content, re.DOTALL)
if match:
    print(f"Found match at positions {match.start()}-{match.end()}")
    print(f"Match preview: {content[match.start():match.start()+100]}")
    content = re.sub(pattern, r'\1\n\2', content, count=1, flags=re.DOTALL)
    print("Replacement done")
else:
    print("Pattern not found, trying alternative...")
    # Find the line numbers
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'flex gap-3' in line:
            print(f"Line {i+1}: {repr(line[:80])}")

with open('src/pages/Home.js', 'w') as f:
    f.write(content)

print("File written.")
