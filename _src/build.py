"""Inserta Reportes v2 en index.html (idempotente)."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
idx = root / 'index.html'
s = idx.read_text(encoding='utf-8')
src = root / '_src'
js = (src / 'reportes2.js').read_text(encoding='utf-8')
cards = (src / 'cards.html').read_text(encoding='utf-8')

# 1) tarjetas: reemplaza el bloque de tarjetas viejo o el v2 existente
start = s.index('<div class="page" id="page-reportes">')
prev = s.index('<!-- PREVIEW AREA -->', start)
content_start = s.index('<div class="content">', start) + len('<div class="content">\n')
s = s[:content_start] + '\n' + cards + '\n    ' + s[prev:]

# 2) botones de la vista previa
s = s.replace('onclick="imprimirReporteNuevoTab()"', 'onclick="rptImprimir()"')
s = s.replace("""onclick="gi('rpPreviewPanel').style.display='none';gi('rpPreviewBody').innerHTML=''">Cerrar</button>""",
              """onclick="rptCerrar()">Cerrar</button>""")

# 3) poblar selects al entrar a Reportes
hook = "if(typeof rptPopSel==='function')rptPopSel();"
if hook not in s:
    s = s.replace('function popReportesSel(){', 'function popReportesSel(){\n  ' + hook + '\n  if(!gi(\'rpFlujoMes\'))return;', 1)

# 4) script embebido
block = '<script id="bigsys-reportes-v2">\n' + js + '\n</script>\n'
s = re.sub(r'<script id="bigsys-reportes-v2">.*?</script>\n', '', s, flags=re.S)
# '</body>' también aparece dentro de strings JS: usar el último (el real)
i = s.rfind('</body>')
s = s[:i] + block + s[i:]
idx.write_text(s, encoding='utf-8')
print('ok', len(s))
