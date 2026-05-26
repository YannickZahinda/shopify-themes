with open('sections/custom-product-display.liquid', 'r') as f:
    text = f.read()

import re
style_block = re.search(r'<style>(.*?)</style>', text, flags=re.DOTALL)
if style_block:
    css = style_block.group(1)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL) # remove comments
    # remove liquid tags
    css = re.sub(r'{%.*?%}', '', css)
    css = re.sub(r'{{.*?}}', '', css)
    
    opens = css.count('{')
    closes = css.count('}')
    print(f"CSS Opens: {opens}")
    print(f"CSS Closes: {closes}")
