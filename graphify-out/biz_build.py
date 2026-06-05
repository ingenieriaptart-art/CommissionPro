import json
import re
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.export import to_json

extraction = json.loads(Path('graphify-out/.graphify_biz_extract.json').read_text(encoding='utf-8'))
G = build_from_json(extraction)
communities = cluster(G)

vault = Path('graphify-out/obsidian-business')
tags_map = {}
for f in vault.glob('*.md'):
    if f.name.startswith('.'):
        continue
    content = f.read_text(encoding='utf-8')
    tag_match = re.search(r'tags: \[([^\]]+)\]', content)
    tag = tag_match.group(1).split(',')[0].strip() if tag_match else 'entidad'
    node_id = f.stem.lower().replace(' ', '_')
    tags_map[node_id] = tag

label_map = {
    'entidad': 'Entidades de Dominio',
    'protocolo': 'Protocolos de Comisionamiento',
    'proceso': 'Procesos de Ingenieria',
    'fase': 'Fases del Producto',
    'plataforma': 'Plataforma CommissionPro',
}

comm_tags = {}
for cid, members in communities.items():
    tag_counts = {}
    for m in members:
        t = tags_map.get(m, 'entidad')
        tag_counts[t] = tag_counts.get(t, 0) + 1
    dominant = max(tag_counts, key=tag_counts.get)
    comm_tags[cid] = dominant

labels = {cid: label_map.get(comm_tags.get(cid, 'entidad'), 'Otros') for cid in communities}

to_json(G, communities, 'graphify-out/biz_graph.json')
Path('graphify-out/.graphify_biz_labels.json').write_text(
    json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False),
    encoding='utf-8'
)

print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")
for cid, members in sorted(communities.items(), key=lambda x: -len(x[1])):
    sample = members[:5]
    print(f"  [{labels[cid]}] ({len(members)} nodes): {sample}")
