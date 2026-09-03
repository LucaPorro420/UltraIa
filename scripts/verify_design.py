import urllib.request
import re

try:
    r = urllib.request.urlopen('http://127.0.0.1:3000', timeout=5)
    print(f"Status: {r.status}")
    html = r.read().decode('utf-8', errors='replace')
    print(f"HTML length: {len(html)} chars")
    
    # Check for CSS links
    css_links = re.findall(r'href=["\']([^"\']*\.css[^"\']*)["\']', html)
    print(f"CSS links: {css_links[:5]}")
    
    # Check for style tags
    style_tags = re.findall(r'<style[^>]*>', html)
    print(f"Style tags count: {len(style_tags)}")
    
    # Check for CSS custom properties
    if 'var(--color-' in html:
        print("CSS custom properties (var(--color-...)) found in HTML")
    if 'color-mix' in html:
        print("color-mix found in HTML")
    if 'bg-canvas' in html or 'font-display' in html:
        print("Design utility classes found in HTML")
    if 'grid-dots' in html or 'aurora-bg' in html:
        print("Background pattern classes found")
    if 'gradient-neo-text' in html:
        print("Neo Violet gradient found")
    if 'glow-' in html:
        print("Glow classes found")
    
    # Check for Tailwind classes used in design
    design_classes = ['bg-canvas', 'bg-panel', 'bg-panel-header', 'border-border-subtle',
                      'text-neutral-100', 'text-neutral-400', 'font-display', 'gradient-neo-text',
                      'glow-video', 'glow-audio', 'glow-text', 'glow-code', 'glow-web',
                      'glass-panel', 'card-glow-hover', 'aurora-bg', 'grid-dots',
                      'typing-dot', 'stream-caret', 'shimmer', 'ease-ultra']
    found = [c for c in design_classes if c in html]
    print(f"Design classes found in HTML: {found}")
    print(f"Total design classes found: {len(found)}")
    
except Exception as e:
    print(f"Error: {e}")
