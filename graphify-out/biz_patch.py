"""
Patch biz_graph.html:
  - Replace title
  - Inject CommissionPro domain color palette
  - Add legend
"""
import re
from pathlib import Path

html = Path('graphify-out/biz_graph.html').read_text(encoding='utf-8')

# Check content
has_equipo = 'Equipo' in html
has_protocol = 'Protocolo' in html
has_cp = 'CommissionPro' in html
print(f"Has Equipo: {has_equipo}, Protocolo: {has_protocol}, CommissionPro: {has_cp}")
print(f"HTML size: {len(html)} bytes")

# Domain color palette (community labels → hex colors)
# These must match the community labels assigned by biz_build.py
DOMAIN_COLORS = {
    "Entidades de Dominio":           "#3498db",   # blue
    "Protocolos de Comisionamiento":  "#2ecc71",   # green
    "Procesos de Ingenieria":         "#e67e22",   # orange
    "Fases del Producto":             "#9b59b6",   # purple
    "Plataforma CommissionPro":       "#e74c3c",   # red
}

# ----- 1. Patch title -----
html = re.sub(r'<title>.*?</title>', '<title>CommissionPro — Grafo de Conocimiento de Negocio</title>', html)

# ----- 2. Patch page heading if present -----
html = re.sub(r'(<h1[^>]*>)[^<]*(</h1>)', r'\1CommissionPro — Knowledge Graph de Negocio\2', html)

# ----- 3. Inject legend + brand header after <body> -----
legend_html = '''
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  #cp-brand {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white; padding: 10px 20px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
  }
  #cp-brand h2 { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; }
  #cp-brand small { opacity: 0.65; font-size: 11px; }
  #cp-legend {
    position: fixed; bottom: 20px; left: 20px; z-index: 999;
    background: rgba(20,20,35,0.92); border-radius: 10px;
    padding: 12px 16px; color: white; font-size: 12px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  #cp-legend h4 { margin: 0 0 8px 0; font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
  .legend-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  canvas { margin-top: 44px; }
</style>
<div id="cp-brand">
  <div>
    <h2>CommissionPro &mdash; Business Knowledge Graph</h2>
    <small>30 conceptos &nbsp;&bull;&nbsp; 158 relaciones &nbsp;&bull;&nbsp; Generado desde Obsidian Vault</small>
  </div>
  <small style="opacity:0.5">Grafo de conocimiento de negocio &mdash; CommissionPro v1.0</small>
</div>
<div id="cp-legend">
  <h4>Categorías</h4>
  <div class="legend-item"><div class="legend-dot" style="background:#3498db"></div>Entidades de Dominio</div>
  <div class="legend-item"><div class="legend-dot" style="background:#2ecc71"></div>Protocolos de Comisionamiento</div>
  <div class="legend-item"><div class="legend-dot" style="background:#e67e22"></div>Procesos de Ingeniería</div>
  <div class="legend-item"><div class="legend-dot" style="background:#9b59b6"></div>Fases del Producto</div>
  <div class="legend-item"><div class="legend-dot" style="background:#e74c3c"></div>Plataforma</div>
</div>
'''

if '<body>' in html:
    html = html.replace('<body>', '<body>' + legend_html, 1)
elif '<body ' in html:
    html = re.sub(r'<body [^>]+>', lambda m: m.group(0) + legend_html, html, count=1)
else:
    # inject before first div
    html = html.replace('<div', legend_html + '<div', 1)

# ----- 4. Inject community color overrides in JS -----
# Find where colors are defined and inject domain palette
color_patch = '''
// CommissionPro domain color override
const CP_COMMUNITY_COLORS = {
  "Entidades de Dominio":          "#3498db",
  "Protocolos de Comisionamiento": "#2ecc71",
  "Procesos de Ingenieria":        "#e67e22",
  "Fases del Producto":            "#9b59b6",
  "Plataforma CommissionPro":      "#e74c3c"
};
'''

# Inject before closing </script> of the last script block that contains graph rendering
if '</script>' in html:
    last_script = html.rfind('</script>')
    html = html[:last_script] + color_patch + html[last_script:]

Path('graphify-out/biz_graph.html').write_text(html, encoding='utf-8')
print("biz_graph.html patched successfully")
print(f"Final size: {len(html)} bytes")
