"""
Generate force-directed HTML for the CommissionPro business knowledge graph.
Uses graphify's HTML export with the biz_graph.json built from Obsidian notes.
"""
import json
import shutil
from pathlib import Path

# Swap graph.json temporarily so graphify export html picks up the biz graph
biz_graph = Path('graphify-out/biz_graph.json')
main_graph = Path('graphify-out/graph.json')
backup = Path('graphify-out/graph.json.bak')

# Backup existing code graph
shutil.copy(main_graph, backup)
shutil.copy(biz_graph, main_graph)

# Write labels for the viz
labels_src = Path('graphify-out/.graphify_biz_labels.json')
labels_dst = Path('graphify-out/.graphify_labels.json.bak_code')
code_labels = Path('graphify-out/.graphify_labels.json')
if code_labels.exists():
    shutil.copy(code_labels, labels_dst)
shutil.copy(labels_src, code_labels)

try:
    from graphify.viz import export_html
    export_html('graphify-out', output_path='graphify-out/biz_graph.html')
    print("HTML generated via graphify.viz.export_html")
except Exception as e1:
    print(f"viz.export_html failed: {e1}")
    try:
        import subprocess, sys
        r = subprocess.run(
            [sys.executable, '-m', 'graphify', 'export', 'html'],
            capture_output=True, text=True, timeout=60
        )
        print(r.stdout)
        if r.returncode == 0:
            # Move the generated graph.html to biz_graph.html
            src = Path('graphify-out/graph.html')
            dst = Path('graphify-out/biz_graph.html')
            if src.exists():
                shutil.copy(src, dst)
                print(f"Copied to biz_graph.html")
        else:
            print(r.stderr)
    except Exception as e2:
        print(f"subprocess failed: {e2}")

finally:
    # Restore original graph
    shutil.copy(backup, main_graph)
    backup.unlink(missing_ok=True)
    if labels_dst.exists():
        shutil.copy(labels_dst, code_labels)
        labels_dst.unlink(missing_ok=True)
    print("Original graph restored")
