"""
Build CommissionPro v2 business graph from the v2 Obsidian vault.
Parses wikilinks, builds graph, exports JSON + HTML + patched HTML.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path('.')
VAULT = Path('graphify-out/obsidian-business-v2')
EXTRACT_OUT = Path('graphify-out/.graphify_v2_extract.json')
GRAPH_OUT   = Path('graphify-out/biz_graph_v2.json')
LABELS_OUT  = Path('graphify-out/.graphify_v2_labels.json')

# ---- Community tag → display label ----
COMM_LABEL = {
    'entidad':      'Entidades de Dominio',
    'protocolo':    'Protocolos de Comisionamiento',
    'proceso':      'Procesos de Ingenieria',
    'fase':         'Fases del Producto',
    'plataforma':   'Plataforma CommissionPro',
    'actor':        'Actores y Organizaciones',
}

# ---- Tag-based override for v2 new notes ----
# Maps first tag in YAML frontmatter to community label
TAG_OVERRIDE = {
    'actor': 'Actores y Organizaciones',
}

# ---- 1. Parse wikilinks from vault ----
def slug(name: str) -> str:
    # Same as graphify's node ID logic: lowercase, replace spaces with _
    return name.lower().replace(' ', '_').replace('/', '_').replace('&', '_').replace('-', '_').replace('(', '').replace(')', '').replace('.', '').replace(',', '').replace("'", "")

def parse_vault(vault: Path):
    nodes = []
    edges = []
    seen_nodes = set()

    for md in sorted(vault.glob('*.md')):
        if md.name.startswith('.'):
            continue
        content = md.read_text(encoding='utf-8')
        node_id = slug(md.stem)

        if node_id not in seen_nodes:
            seen_nodes.add(node_id)
            nodes.append({
                'id': node_id,
                'label': md.stem,
                'file_type': 'document',
                'source_file': str(md),
            })

        # Extract wikilinks: [[Target]] or [[Target|Alias]]
        links = re.findall(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', content)
        for link in links:
            target_id = slug(link)
            if target_id and target_id != node_id:
                edges.append({
                    'source': node_id,
                    'target': target_id,
                    'relation': 'references',
                    'confidence': 'EXTRACTED',
                    'confidence_score': 1.0,
                    'source_file': md.name,
                    'weight': 1.0,
                })

    return {'nodes': nodes, 'edges': edges, 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}

print("Parsing wikilinks from v2 vault...")
extraction = parse_vault(VAULT)
print(f"  {len(extraction['nodes'])} nodes, {len(extraction['edges'])} raw edges")
EXTRACT_OUT.write_text(json.dumps(extraction, ensure_ascii=False, indent=2), encoding='utf-8')

# ---- 2. Build graph with graphify ----
from graphify.build import build_from_json
from graphify.cluster import cluster
from graphify.export import to_json

G = build_from_json(extraction)
print(f"  Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

communities = cluster(G)
print(f"  {len(communities)} communities detected")

# ---- 3. Assign community labels based on first YAML tag ----
tags_map = {}
for md in VAULT.glob('*.md'):
    if md.name.startswith('.'):
        continue
    content = md.read_text(encoding='utf-8')
    tag_match = re.search(r'tags:\s*\[([^\]]+)\]', content)
    tag = tag_match.group(1).split(',')[0].strip() if tag_match else 'entidad'
    node_id = slug(md.stem)
    tags_map[node_id] = tag

label_map = {
    'entidad':   'Entidades de Dominio',
    'protocolo': 'Protocolos de Comisionamiento',
    'proceso':   'Procesos de Ingenieria',
    'fase':      'Fases del Producto',
    'plataforma':'Plataforma CommissionPro',
    'actor':     'Actores y Organizaciones',
}

comm_tags = {}
for cid, members in communities.items():
    tag_counts = {}
    for m in members:
        t = tags_map.get(m, 'entidad')
        tag_counts[t] = tag_counts.get(t, 0) + 1
    dominant = max(tag_counts, key=tag_counts.get)
    comm_tags[cid] = dominant

labels = {cid: label_map.get(comm_tags.get(cid, 'entidad'), 'Entidades de Dominio') for cid in communities}

to_json(G, communities, str(GRAPH_OUT))
LABELS_OUT.write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding='utf-8')
print(f"  Graph saved to {GRAPH_OUT}")

for cid, members in sorted(communities.items(), key=lambda x: -len(x[1])):
    print(f"    [{labels[cid]}] ({len(members)} nodes)")

# ---- 4. Generate HTML via graphify export ----
main_graph = Path('graphify-out/graph.json')
main_labels = Path('graphify-out/.graphify_labels.json')
backup_graph = Path('graphify-out/graph.json.bak2')
backup_labels = Path('graphify-out/.graphify_labels.json.bak2')

shutil.copy(main_graph, backup_graph)
if main_labels.exists():
    shutil.copy(main_labels, backup_labels)

shutil.copy(GRAPH_OUT, main_graph)
shutil.copy(LABELS_OUT, main_labels)

py = sys.executable
try:
    r = subprocess.run([py, '-m', 'graphify', 'export', 'html'],
                       capture_output=True, text=True, timeout=60, cwd=str(ROOT))
    print(r.stdout.strip() or "(no stdout)")
    if r.returncode == 0:
        src = Path('graphify-out/graph.html')
        dst = Path('graphify-out/biz_graph_v2.html')
        if src.exists():
            shutil.copy(src, dst)
            print(f"  Copied to {dst}")
    else:
        print("  ERROR:", r.stderr[:300])
except Exception as e:
    print(f"  HTML generation failed: {e}")
finally:
    shutil.copy(backup_graph, main_graph)
    backup_graph.unlink(missing_ok=True)
    if backup_labels.exists():
        shutil.copy(backup_labels, main_labels)
        backup_labels.unlink(missing_ok=True)
    print("  Original graph restored.")

# ---- 5. Patch HTML ----
html_path = Path('graphify-out/biz_graph_v2.html')
if not html_path.exists():
    print("WARNING: biz_graph_v2.html not found, skipping patch")
    exit(0)

html = html_path.read_text(encoding='utf-8')
import re as _re

# Colors for v2 communities (extended palette)
V2_COLORS = {
    "Entidades de Dominio":           "#3498db",
    "Protocolos de Comisionamiento":  "#2ecc71",
    "Procesos de Ingenieria":         "#e67e22",
    "Fases del Producto":             "#9b59b6",
    "Plataforma CommissionPro":       "#e74c3c",
    "Actores y Organizaciones":       "#1abc9c",
    "Otros":                          "#95a5a6",
}

html = _re.sub(r'<title>.*?</title>', '<title>CommissionPro v2 — Business Knowledge Graph</title>', html)
html = _re.sub(r'(<h1[^>]*>)[^<]*(</h1>)', r'\1CommissionPro v2 — Business Knowledge Graph\2', html)

legend_items = ''.join(
    f'<div class="legend-item"><div class="legend-dot" style="background:{c}"></div>{name}</div>'
    for name, c in V2_COLORS.items()
)

brand_html = f'''
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
  #cp-brand {{
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
    color: white; padding: 10px 20px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
  }}
  #cp-brand h2 {{ margin: 0; font-size: 15px; font-weight: 600; }}
  #cp-brand small {{ opacity: 0.55; font-size: 11px; }}
  #cp-brand .v2tag {{ color: #58a6ff; font-weight: 700; }}
  #cp-legend {{
    position: fixed; bottom: 20px; left: 20px; z-index: 999;
    background: rgba(13,17,23,0.94); border-radius: 10px;
    padding: 12px 16px; color: white; font-size: 12px;
    border: 1px solid rgba(255,255,255,0.08);
  }}
  #cp-legend h4 {{ margin: 0 0 7px 0; font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; }}
  .legend-item {{ display: flex; align-items: center; gap: 8px; margin: 3px 0; }}
  .legend-dot {{ width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }}
  canvas {{ margin-top: 44px; }}
</style>
<div id="cp-brand">
  <div>
    <h2>CommissionPro <span class="v2tag">v2</span> — Business Knowledge Graph</h2>
    <small>72 conceptos &nbsp;·&nbsp; 5+ comunidades &nbsp;·&nbsp; Actores + Gemelo Digital + Seguridad + PTAR + DocIngeniería</small>
  </div>
  <small style="opacity:0.4">Propuesta v2 · PTAR Zipaquirá · CommissionPro</small>
</div>
<div id="cp-legend">
  <h4>Comunidades v2</h4>
  {legend_items}
</div>
'''

if '<body>' in html:
    html = html.replace('<body>', '<body>' + brand_html, 1)
elif '<body ' in html:
    html = _re.sub(r'<body [^>]+>', lambda m: m.group(0) + brand_html, html, count=1)

color_patch = '''
// CommissionPro v2 domain colors
const CP_V2_COLORS = {
  "Entidades de Dominio":           "#3498db",
  "Protocolos de Comisionamiento":  "#2ecc71",
  "Procesos de Ingenieria":         "#e67e22",
  "Fases del Producto":             "#9b59b6",
  "Plataforma CommissionPro":       "#e74c3c",
  "Actores y Organizaciones":       "#1abc9c",
  "Otros":                          "#95a5a6"
};
'''
if '</script>' in html:
    last = html.rfind('</script>')
    html = html[:last] + color_patch + html[last:]

html_path.write_text(html, encoding='utf-8')
print(f"\nbiz_graph_v2.html patched. Size: {len(html):,} bytes")
