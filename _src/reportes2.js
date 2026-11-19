/* ══════════════════════════════════════════════════════════════════════
   BIGSYS · REPORTES PROFESIONALES v2 + AUDITORÍA DE LIBROS
   - Estado de Resultados y Flujo de Caja
   - Análisis de Márgenes (línea, cliente, trabajo, punto de equilibrio)
   - Balance General (estado de situación estimado, base caja, con IVA arrastrado)
   - Libros IVA de Ventas y Compras
   - Auditoría de libros (reglas automáticas de control)
   Todos los montos del sistema están en ₲ con IVA incluido (10%).
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var K = {navy:'#045478', navyD:'#033a52', green:'#8CC540', greenD:'#4e7a1c', red:'#b42318', amber:'#b54708', ink:'#1d2939', muted:'#667085', line:'#e4e7ec', soft:'#f5f8fa'};
var EMPRESA = {
  nombre:'Big Informática',
  lema:'Servicios y soluciones tecnológicas',
  datos:'Mariano Roque Alonso, Paraguay · biginformatica.com.py · big@biginformatica.com.py · WhatsApp (0981) 861 046'
};

/* ───────────── utilidades ───────────── */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function gs(n){ var v=Math.round(n||0); return (v<0?'− ':'')+'₲ '+Math.abs(v).toLocaleString('es-PY'); }
function gsp(n){ return '<span class="'+((n||0)<0?'neg':'')+'">'+gs(n)+'</span>'; }
function pct(n){ if(!isFinite(n)) n=0; return n.toFixed(1).replace('.',',')+'%'; }
function num(n){ return Math.round(n||0).toLocaleString('es-PY'); }
function mto(r){ return +r.monto||0; }
function neto(r){ return r.iva ? mto(r)/1.1 : mto(r); }
function ivaDe(r){ return r.iva ? mto(r)/11 : 0; }
function sum(a,f){ var s=0; for(var i=0;i<a.length;i++) s+=f(a[i]); return s; }
function mesLbl(m){ var p=String(m).split('-'); return MES[+p[1]-1]+' '+p[0]; }
function fch(d){ if(!d) return '—'; var p=String(d).slice(0,10).split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function corto(s,n){ s=String(s||'').replace(/\s+/g,' ').trim(); return s.length>n ? s.slice(0,n-1)+'…' : s; }
function dias(a,b){ return Math.abs((new Date(a)-new Date(b))/864e5); }
function curMesR(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function V(){ return (typeof VD!=='undefined' && VD) ? VD : []; }
function Cc(){ return (typeof CD!=='undefined' && CD) ? CD : []; }
function P(){ return (typeof PD!=='undefined' && PD) ? PD : []; }
function G(){ return (typeof GD!=='undefined' && GD) ? GD : []; }
function COB(){ return (typeof cobrosData!=='undefined' && cobrosData) ? cobrosData : []; }

function normName(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
    .replace(/\b(sr|sra|srta|ing|ingeniero|lic|dr|dra)\b\.?/g,' ')
    .replace(/\b(s\.?\s?a\.?\s?s?|e\.?\s?a\.?\s?s|s\.?\s?r\.?\s?l|ltda)\.?(?=\s|$)/g,' ')
    .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
var STOP={de:1,la:1,el:1,para:1,por:1,y:1,en:1,con:1,del:1,los:1,las:1,un:1,una:1,al:1,a:1,mes:1};
function tokens(s){ return normName(s).split(' ').filter(function(t){ return t.length>=2 && !STOP[t]; }); }
function solap(a,b){ var A=tokens(a),B=tokens(b); if(!A.length||!B.length) return 0; var n=0; A.forEach(function(t){ if(B.indexOf(t)>=0) n++; }); return n/Math.min(A.length,B.length); }

/* N.º de presupuesto normalizado (para agrupar trabajos) */
function presKey(p){
  if(!p) return '';
  var s=String(p).trim();
  if(/xx|prueba/i.test(s)) return '';
  s=s.replace(/^(presupuesto|ppto\.?)\s*(nro\.?|n[º°.]*)?\s*/i,'').trim();
  if(/^\d{1,3}$/.test(s)) s=s.padStart(4,'0');
  return s.toUpperCase();
}
/* N.º de comprobante normalizado 001-001-0000001 */
function factKey(f){
  if(!f) return '';
  var s=String(f).trim(), parts=s.split(/[-\s]+/).filter(Boolean), est,pto,nro;
  if(parts.length>=3){ est=parts[0]; pto=parts[1]; nro=parts.slice(2).join(''); }
  else if(parts.length===2 && parts[0].replace(/\D/g,'').length===6){ var d=parts[0].replace(/\D/g,''); est=d.slice(0,3); pto=d.slice(3); nro=parts[1]; }
  else { var dd=s.replace(/\D/g,''); if(dd.length<13) return 'X'+dd; est=dd.slice(0,3); pto=dd.slice(3,6); nro=dd.slice(6); }
  est=est.replace(/\D/g,'').padStart(3,'0'); pto=pto.replace(/\D/g,'').padStart(3,'0'); nro=String(parseInt(nro.replace(/\D/g,''),10)||0).padStart(7,'0');
  return est+'-'+pto+'-'+nro;
}
function factValida(f){ return /^\d{3}-\d{3}-\d{7}$/.test(String(f||'').trim()); }

/* Clasificación de conceptos */
var RX_PROD=/\b(provisi[oó]n|equipos?|equipamiento|memorias?|ram|ssd|nvme|hdd|discos?|notebooks?|nb|laptop|pc|monitor|impresoras?|t[oó]ner|cartuchos?|tintas?|cables?|router|switch|swicht|access ?point|ap|acces|c[aá]maras?|nvr|dvr|ups|bater[ií]as?|teclados?|mouse|mousepad|licencias?|fuente|placa|procesador|mikrotik|unifi|rack|patch|conector|rj45|antena|litebeam|repuestos?|cargador|pantalla|auricular|airpods|tablet|proyector|gaveta|gavetas|pila|almohadilla|tarjeta|adaptador|insumos|productos?|herramientas?|visagra|bisagra|programador)\b/i;
var RX_SERV=/\b(servicios?|mano de obra|instalaci[oó]n|configuraci[oó]n|mantenimiento|reparaci[oó]n|asistencia|soporte|formateo|hosting|alojamiento|cableado|honorarios?|recuperaci[oó]n|diagn[oó]stico|montaje|mudanza|cambio|re ?programaci[oó]n|activaci[oó]n|sistema|desarrollo|p[aá]gina|clonaci[oó]n|trabajo|limpieza|visita|upgrade|ampliaci[oó]n|adecuaci[oó]n|relevamiento|capacitaci[oó]n|dise[nñ]o|reset)\b/i;
var RX_PROD_FUERTE=/^(venta|compra|provisi[oó]n)\s+de\b|anticipo de compra/i;
var RX_SERV_INICIO=/^(servicios?\b|mano de obra|asistencia|instalaci[oó]n|configuraci[oó]n|mantenimiento|reparaci[oó]n|soporte|formateo)/i;
var RX_GENERICO=/^(servicios?|servicios? inform[aá]ticos?|servicios? varios|productos?|varios|mantenimiento|compras?( (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre))?( \d+)?)\.?$/i;
var RX_ACTIVO=/herramient|programador para bios|mobiliario|para uso propio|equipo propio|para el taller/i;
var RX_RECURRENTE=/mensual|hosting|alojamiento|abono|cuota/i;
function esActivoFijo(r){ return RX_ACTIVO.test(r.descripcion||''); }

/* ───────────── períodos ───────────── */
function mesesConDatos(){
  var s={}; V().concat(Cc()).forEach(function(r){ if(r.fecha) s[String(r.fecha).slice(0,7)]=1; });
  return Object.keys(s).sort();
}
function resolverPeriodo(per, mes){
  var todos=mesesConDatos(); mes=mes||todos[todos.length-1]||curMesR();
  var y=+mes.slice(0,4), m=+mes.slice(5,7), arr=[], i, lbl;
  function mm(k){ return y+'-'+String(k).padStart(2,'0'); }
  if(per==='todo'){ arr=todos.slice(); lbl='Historial completo'+(arr.length?' ('+mesLbl(arr[0])+' – '+mesLbl(arr[arr.length-1])+')':''); }
  else if(per==='trimestre'){ var q=Math.ceil(m/3); for(i=(q-1)*3+1;i<=m;i++) arr.push(mm(i)); lbl=q+'.º trimestre '+y+' ('+mesLbl(arr[0]).split(' ')[0]+(arr.length>1?' – '+mesLbl(arr[arr.length-1]).split(' ')[0]:'')+')'; }
  else if(per==='semestre'){ var h=m<=6?1:7; for(i=h;i<=m;i++) arr.push(mm(i)); lbl=(h===1?'1.er':'2.º')+' semestre '+y+' ('+mesLbl(arr[0]).split(' ')[0]+(arr.length>1?' – '+mesLbl(arr[arr.length-1]).split(' ')[0]:'')+')'; }
  else if(per==='anual'){ for(i=1;i<=m;i++) arr.push(mm(i)); lbl='Ejercicio '+y+' (Enero – '+MES[m-1]+')'; }
  else { arr=[mes]; lbl=mesLbl(mes); }
  return {meses:arr, label:lbl, desde:arr[0], hasta:arr[arr.length-1]};
}
function enMeses(r, meses){ return !!r.fecha && meses.indexOf(String(r.fecha).slice(0,7))>=0; }
function gastosMes(m){ return (typeof gfMes==='function') ? gfMes(m) : G().filter(function(r){return r.activo;}); }
function esPersonal(g){ return /personal/i.test(g.categoria||''); }

/* ───────────── documento base ───────────── */
function logoUrl(){ try{ return new URL('logo.png', location.href).href; }catch(e){ return 'logo.png'; } }
function css(landscape){
  return '@page{size:A4 '+(landscape?'landscape':'portrait')+';margin:13mm 12mm 15mm 12mm;'+
      '@bottom-left{content:"'+EMPRESA.nombre+' · BIGSYS — Documento de uso interno";font:7.5pt Arial,sans-serif;color:#98a2b3}'+
      '@bottom-right{content:"Página " counter(page) " de " counter(pages);font:7.5pt Arial,sans-serif;color:#98a2b3}}'+
    '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    'html,body{margin:0;padding:0}'+
    'body{font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:9.6pt;color:'+K.ink+';line-height:1.38;background:#e9edf2}'+
    '.sheet{background:#fff;max-width:'+(landscape?'297mm':'210mm')+';margin:14px auto;padding:12mm 12mm 14mm;box-shadow:0 2px 14px rgba(16,24,40,.12)}'+
    '@media print{body{background:#fff}.sheet{margin:0;padding:0;box-shadow:none;max-width:none}.no-print{display:none!important}thead{display:table-header-group}tr,.keep{break-inside:avoid}h2{break-after:avoid}}'+
    /* encabezado */
    '.hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:10px}'+
    '.brand{display:flex;gap:12px;align-items:center}.brand img{height:46px;width:auto}'+
    '.brand .n{font-size:14pt;font-weight:800;color:'+K.navy+';letter-spacing:-.2px}.brand .l{font-size:8pt;color:'+K.muted+'}.brand .d{font-size:7.5pt;color:'+K.muted+';margin-top:2px;max-width:330px}'+
    '.doc{text-align:right;flex:1 1 auto}.doc .t{font-size:15pt;font-weight:800;color:'+K.navy+';line-height:1.15}.doc .p{font-size:10pt;font-weight:600;color:'+K.ink+';margin-top:3px}.doc .g{font-size:7.5pt;color:'+K.muted+';margin-top:3px}'+
    '.rule{height:4px;background:linear-gradient(90deg,'+K.navy+' 0,'+K.navy+' 72%,'+K.green+' 72%,'+K.green+' 100%);margin-bottom:12px;border-radius:2px}'+
    /* KPI */
    '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}.kpis.k3{grid-template-columns:repeat(3,1fr)}.kpis.k5{grid-template-columns:repeat(5,1fr)}'+
    '.kpi{border:1px solid '+K.line+';border-top:3px solid '+K.navy+';border-radius:6px;padding:7px 9px;background:#fff}'+
    '.kpi.g{border-top-color:'+K.green+'}.kpi.r{border-top-color:'+K.red+'}.kpi.a{border-top-color:#f79009}'+
    '.kpi .l{font-size:7pt;text-transform:uppercase;letter-spacing:.5px;color:'+K.muted+';font-weight:700}'+
    '.kpi .v{font-size:12.5pt;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap}.kpi .s{font-size:7.5pt;color:'+K.muted+'}'+
    /* secciones */
    'h2{font-size:9.5pt;text-transform:uppercase;letter-spacing:.6px;color:'+K.navy+';margin:16px 0 6px;padding-left:8px;border-left:4px solid '+K.green+'}'+
    'h3{font-size:9pt;color:'+K.ink+';margin:10px 0 4px}'+
    '.lead{font-size:8.5pt;color:'+K.muted+';margin:-2px 0 6px}'+
    /* tablas */
    'table{width:100%;border-collapse:collapse;font-size:8.4pt}'+
    'th{background:'+K.navy+';color:#fff;font-weight:700;text-align:left;padding:5px 6px;font-size:7.4pt;text-transform:uppercase;letter-spacing:.3px}'+
    'td{padding:4px 6px;border-bottom:1px solid '+K.line+';vertical-align:top}'+
    'tbody tr:nth-child(even) td{background:#f9fafb}'+
    '.r,.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.c{text-align:center}'+
    'tr.tot td{font-weight:800;background:#eaf2f7!important;border-top:1.5px solid '+K.navy+';border-bottom:none;color:'+K.navyD+'}'+
    '.neg{color:'+K.red+'}.pos{color:'+K.greenD+'}.mut{color:'+K.muted+'}.sm{font-size:7.6pt}'+
    /* estado contable */
    'table.fs td{background:#fff!important;border-bottom:1px solid #f0f2f5;padding:4px 6px}'+
    'table.fs td.i1{padding-left:18px}table.fs tr.sub td{font-weight:700;border-top:1px solid #98a2b3;background:#f8fafc!important}'+
    'table.fs tr.grand td{font-weight:800;font-size:9.4pt;border-top:1.5px solid '+K.navy+';border-bottom:3px double '+K.navy+';background:#eef5f9!important;color:'+K.navyD+'}'+
    'table.fs tr.hd td{font-weight:800;color:'+K.navy+';text-transform:uppercase;font-size:7.8pt;letter-spacing:.4px;padding-top:9px;border-bottom:1px solid '+K.navy+'}'+
    /* varios */
    '.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}'+
    '.note{background:'+K.soft+';border:1px solid '+K.line+';border-left:3px solid '+K.navy+';border-radius:4px;padding:7px 10px;font-size:7.8pt;color:#475467;margin-top:10px}'+
    '.note b{color:'+K.ink+'}.note ul{margin:3px 0 0 14px;padding:0}'+
    '.bar{height:7px;background:#eef1f4;border-radius:4px;overflow:hidden;min-width:60px}.bar i{display:block;height:100%;background:'+K.navy+'}.bar i.g{background:'+K.green+'}'+
    '.badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}'+
    '.b-alta{background:#fee4e2;color:#912018}.b-media{background:#fef0c7;color:#93370d}.b-baja{background:#eaecf0;color:#344054}.b-ok{background:#dcfae6;color:#085d3a}'+
    '.check{display:flex;justify-content:space-between;align-items:center;border:1.5px solid '+K.green+';background:#f6fbef;border-radius:6px;padding:7px 12px;margin-top:10px;font-weight:700;font-size:8.6pt}'+
    '.check.bad{border-color:'+K.red+';background:#fff5f4}'+
    '.eq{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:6px;border:1px solid '+K.line+';border-radius:6px;padding:8px 12px;margin-bottom:12px;text-align:center}'+
    '.eq .l{font-size:7pt;text-transform:uppercase;color:'+K.muted+';font-weight:700;letter-spacing:.5px}.eq .v{font-size:13pt;font-weight:800;color:'+K.navy+'}.eq .op{font-size:14pt;color:#98a2b3}'+
    '.sign{display:flex;gap:40px;margin-top:34px}.sign div{flex:1;border-top:1px solid #98a2b3;padding-top:4px;text-align:center;font-size:7.6pt;color:'+K.muted+'}'+
    '.edit{border:1px solid '+K.line+';background:#fff;border-radius:4px;font-size:7pt;padding:1px 6px;cursor:pointer;color:'+K.navy+'}'+
    '.ctl{margin:12px 0 4px;padding:6px 9px;background:'+K.soft+';border:1px solid '+K.line+';border-radius:5px 5px 0 0;border-bottom:none}.ctl-h{font-size:8.8pt}.ctl-a{font-size:7.8pt;color:#475467;margin-top:2px}'+
    'table.aud{font-size:7.6pt;margin-bottom:4px;table-layout:fixed}table.aud td{overflow:hidden}table.aud td.el{white-space:nowrap;text-overflow:ellipsis}.ctl{break-after:avoid}table.aud th{font-size:6.9pt;padding:4px 5px}table.aud td{padding:3px 5px}'+
    '.toolbar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid '+K.line+';padding:6px 12px;font:12px Arial;color:'+K.muted+'}';
}
function encabezado(titulo, periodo){
  var now=new Date();
  return '<div class="hdr">'+
      '<div class="brand"><img src="'+logoUrl()+'" alt="Big Informática" onerror="this.style.display=\'none\'">'+
        '<div><div class="n">'+EMPRESA.nombre+'</div><div class="l">'+EMPRESA.lema+'</div><div class="d">'+EMPRESA.datos+'</div></div></div>'+
      '<div class="doc"><div class="t">'+esc(titulo)+'</div><div class="p">'+esc(periodo)+'</div>'+
        '<div class="g">Emitido el '+now.toLocaleDateString('es-PY')+' a las '+now.toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})+'<br>Cifras en guaraníes (₲)</div></div>'+
    '</div><div class="rule"></div>';
}
function documento(titulo, periodo, cuerpo, opts){
  opts=opts||{};
  var nombreArchivo='BIGSYS - '+titulo+' - '+periodo.replace(/[\/\\:*?"<>|]/g,'-');
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>'+esc(nombreArchivo)+'</title><style>'+css(opts.landscape)+'</style></head><body>'+
    '<div class="sheet">'+encabezado(titulo, periodo)+cuerpo+'</div></body></html>';
}
function kpi(l,v,s,cls){ return '<div class="kpi '+(cls||'')+'"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'; }
function fila(c, vals, cls){ return '<tr class="'+(cls||'')+'"><td class="'+(cls==='i1'?'i1':'')+'">'+c+'</td>'+vals.map(function(v){return '<td class="r">'+v+'</td>';}).join('')+'</tr>'; }

/* ───────────── cálculos contables ───────────── */
function resultado(meses){
  var v=V().filter(function(r){return enMeses(r,meses);}), c=Cc().filter(function(r){return enMeses(r,meses);});
  var cOp=c.filter(function(r){return !esActivoFijo(r);}), cAf=c.filter(esActivoFijo);
  var o={v:v,c:c,
    vServ:sum(v.filter(function(r){return r.tipo!=='Producto';}),neto), vProd:sum(v.filter(function(r){return r.tipo==='Producto';}),neto),
    cServ:sum(cOp.filter(function(r){return r.tipo!=='Producto';}),neto), cProd:sum(cOp.filter(function(r){return r.tipo==='Producto';}),neto),
    activoFijo:sum(cAf,neto), activoFijoBruto:sum(cAf,mto),
    cobros:sum(v,mto), pagos:sum(cOp,mto), debito:sum(v,ivaDe), credito:sum(c,ivaDe), gastosCat:{}, gastosOp:0, retiros:0, gastosDet:[]};
  o.ventas=o.vServ+o.vProd; o.costo=o.cServ+o.cProd; o.bruta=o.ventas-o.costo;
  meses.forEach(function(m){ gastosMes(m).forEach(function(g){
    var k=g.categoria||'Otros', mm=+g.monto_mensual||0;
    if(esPersonal(g)) o.retiros+=mm; else { o.gastosOp+=mm; o.gastosCat[k]=(o.gastosCat[k]||0)+mm; }
    var d=o.gastosDet.find(function(x){return x.concepto===g.concepto&&x.categoria===g.categoria;});
    if(d){ d.total+=mm; d.meses++; } else o.gastosDet.push({concepto:g.concepto,categoria:g.categoria||'Otros',personal:esPersonal(g),mensual:mm,total:mm,meses:1});
  }); });
  o.operativo=o.bruta-o.gastosOp; o.neto=o.operativo-o.retiros;
  return o;
}
/* Liquidación mensual de IVA con arrastre de saldo a favor */
function ivaMensual(meses){
  var favor=0;
  return meses.map(function(m){
    var deb=sum(V().filter(function(r){return enMeses(r,[m]);}),ivaDe), cre=sum(Cc().filter(function(r){return enMeses(r,[m]);}),ivaDe);
    var s=deb-cre-favor, fila={mes:m,debito:deb,credito:cre,favorAnt:favor,aPagar:Math.max(0,s),favor:Math.max(0,-s)};
    favor=fila.favor; return fila;
  });
}

/* ═══════════════ 1. ESTADO DE RESULTADOS Y FLUJO DE CAJA ═══════════════ */
function repResultados(per, mes, detalle){
  var P0=resolverPeriodo(per, mes), R=resultado(P0.meses), b='';
  var iva=ivaMensual(P0.meses), ivaPag=sum(iva,function(x){return x.aPagar;});
  b+='<div class="kpis">'+
    kpi('Ventas netas (sin IVA)',gs(R.ventas),R.v.length+' operaciones','')+
    kpi('Utilidad bruta',gs(R.bruta),'Margen bruto '+pct(R.ventas?R.bruta/R.ventas*100:0),'g')+
    kpi('Resultado operativo',gsp(R.operativo),'Margen operativo '+pct(R.ventas?R.operativo/R.ventas*100:0),R.operativo>=0?'g':'r')+
    kpi('Resultado neto',gsp(R.neto),'Después de retiros del propietario',R.neto>=0?'g':'r')+
  '</div>';

  function p(x){ return '<span class="mut">'+(R.ventas?pct(x/R.ventas*100):'—')+'</span>'; }
  b+='<div class="two"><div class="keep"><h2>Estado de resultados</h2><div class="lead">Montos netos de IVA. Base percibido (las ventas se registran al cobrarse).</div>'+
    '<table class="fs"><tbody>'+
    '<tr class="hd"><td>Ingresos</td><td class="r">₲</td><td class="r">% vtas.</td></tr>'+
    fila('Venta de servicios',[gs(R.vServ),p(R.vServ)],'i1')+
    fila('Venta de productos',[gs(R.vProd),p(R.vProd)],'i1')+
    fila('Ventas netas',[gs(R.ventas),p(R.ventas)],'sub')+
    '<tr class="hd"><td>Costo de ventas</td><td></td><td></td></tr>'+
    fila('Costo de productos vendidos',[gs(-R.cProd),p(R.cProd)],'i1')+
    fila('Servicios tercerizados y mano de obra',[gs(-R.cServ),p(R.cServ)],'i1')+
    fila('Utilidad bruta',[gsp(R.bruta),p(R.bruta)],'sub')+
    '<tr class="hd"><td>Gastos operativos</td><td></td><td></td></tr>'+
    Object.keys(R.gastosCat).sort().map(function(k){ return fila(esc(k),[gs(-R.gastosCat[k]),p(R.gastosCat[k])],'i1'); }).join('')+
    fila('Resultado operativo',[gsp(R.operativo),p(R.operativo)],'sub')+
    fila('Remuneración y gastos personales del propietario',[gs(-R.retiros),p(R.retiros)],'i1')+
    fila('Resultado neto del período',[gsp(R.neto),p(R.neto)],'grand')+
    '</tbody></table></div>';

  var flujo=R.cobros-R.pagos-R.activoFijoBruto-R.gastosOp-R.retiros-ivaPag;
  b+='<div class="keep"><h2>Flujo de caja</h2><div class="lead">Movimientos con IVA incluido, tal como entran y salen de caja.</div>'+
    '<table class="fs"><tbody>'+
    '<tr class="hd"><td>Entradas</td><td class="r">₲</td></tr>'+
    fila('Cobros por ventas',[gs(R.cobros)],'i1')+
    fila('Total entradas',[gs(R.cobros)],'sub')+
    '<tr class="hd"><td>Salidas</td><td></td></tr>'+
    fila('Pagos a proveedores (compras)',[gs(-R.pagos)],'i1')+
    (R.activoFijoBruto?fila('Inversión en herramientas / bienes de uso',[gs(-R.activoFijoBruto)],'i1'):'')+
    fila('Gastos fijos operativos',[gs(-R.gastosOp)],'i1')+
    fila('Retiros del propietario',[gs(-R.retiros)],'i1')+
    fila('IVA liquidado del período (estimado)',[gs(-ivaPag)],'i1')+
    fila('Total salidas',[gs(-(R.pagos+R.activoFijoBruto+R.gastosOp+R.retiros+ivaPag))],'sub')+
    fila('Flujo neto de caja',[gsp(flujo)],'grand')+
    '</tbody></table>'+
    '<h3>Posición de IVA</h3><table class="fs"><tbody>'+
    fila('IVA débito (ventas)',[gs(R.debito)],'i1')+fila('IVA crédito (compras)',[gs(-R.credito)],'i1')+
    fila('IVA a pagar estimado',[gs(ivaPag)],'sub')+
    (iva.length&&iva[iva.length-1].favor?fila('Saldo a favor al cierre',[gs(iva[iva.length-1].favor)],'i1'):'')+
    '</tbody></table></div></div>';

  if(P0.meses.length>1){
    b+='<h2>Evolución mensual</h2><table><thead><tr><th>Mes</th><th class="r">Ventas netas</th><th class="r">Costo de ventas</th><th class="r">Utilidad bruta</th><th class="r">Margen</th><th class="r">Gastos + retiros</th><th class="r">Resultado neto</th></tr></thead><tbody>'+
      P0.meses.map(function(m){ var x=resultado([m]); return '<tr><td class="num">'+mesLbl(m)+'</td><td class="r">'+gs(x.ventas)+'</td><td class="r">'+gs(x.costo)+'</td><td class="r">'+gsp(x.bruta)+'</td><td class="r">'+pct(x.ventas?x.bruta/x.ventas*100:0)+'</td><td class="r">'+gs(x.gastosOp+x.retiros)+'</td><td class="r">'+gsp(x.neto)+'</td></tr>'; }).join('')+
      '<tr class="tot"><td>Total</td><td class="r">'+gs(R.ventas)+'</td><td class="r">'+gs(R.costo)+'</td><td class="r">'+gs(R.bruta)+'</td><td class="r">'+pct(R.ventas?R.bruta/R.ventas*100:0)+'</td><td class="r">'+gs(R.gastosOp+R.retiros)+'</td><td class="r">'+gs(R.neto)+'</td></tr></tbody></table>';
  }

  b+='<h2>Gastos fijos del período</h2><table><thead><tr><th>Concepto</th><th>Categoría</th><th>Tratamiento</th><th class="r">Mensual</th><th class="c">Meses</th><th class="r">Total</th></tr></thead><tbody>'+
    (R.gastosDet.length?R.gastosDet.sort(function(a,b){return (a.personal-b.personal)||(b.total-a.total);}).map(function(g){
      return '<tr><td>'+esc(g.concepto)+'</td><td>'+esc(g.categoria)+'</td><td class="sm">'+(g.personal?'Retiro del propietario':'Gasto operativo')+'</td><td class="r">'+gs(g.mensual)+'</td><td class="c">'+g.meses+'</td><td class="r">'+gs(g.total)+'</td></tr>';
    }).join(''):'<tr><td colspan="6" class="mut c">Sin gastos fijos en el período</td></tr>')+
    '<tr class="tot"><td colspan="5">Total gastos fijos</td><td class="r">'+gs(R.gastosOp+R.retiros)+'</td></tr></tbody></table>';

  if(detalle){
    b+=tablaMovs('Detalle de ventas', R.v, 'cliente', 'Cliente');
    b+=tablaMovs('Detalle de compras', R.c, 'proveedor', 'Proveedor');
  }
  b+='<div class="note"><b>Criterios:</b> ventas y compras se toman netas de IVA (monto ÷ 1,1 cuando están gravadas). Los gastos de categoría «Personal» (sueldo del propietario, suscripciones personales) se muestran como retiros del propietario, separados del resultado operativo. '+
     (R.activoFijoBruto?'Las compras de herramientas se tratan como inversión (bien de uso), no como costo de ventas. ':'')+
     'El IVA liquidado es una estimación según los registros del sistema; la liquidación oficial es la del Formulario 120.</div>';
  return documento('Resultados y Flujo de Caja', P0.label, b);
}
function tablaMovs(titulo, rows, campo, etiqueta){
  rows=rows.slice().sort(function(a,b){return String(a.fecha).localeCompare(String(b.fecha));});
  var tot=sum(rows,mto), totN=sum(rows,neto);
  return '<h2>'+titulo+' ('+rows.length+')</h2><table><thead><tr><th>Fecha</th><th>Comprobante</th><th>'+etiqueta+'</th><th>Concepto</th><th>Tipo</th><th class="c">IVA</th><th class="r">Neto</th><th class="r">Total</th></tr></thead><tbody>'+
    (rows.length?rows.map(function(r){
      return '<tr><td class="num">'+fch(r.fecha)+'</td><td class="sm">'+esc(r.factura||'—')+'</td><td>'+esc(corto(r[campo],28)||'—')+'</td><td>'+esc(corto(r.descripcion,52)||'—')+'</td><td class="sm">'+esc(r.tipo||'')+'</td><td class="c sm">'+(r.iva?'10%':'Exenta')+'</td><td class="r">'+gs(neto(r))+'</td><td class="r">'+gs(mto(r))+'</td></tr>';
    }).join(''):'<tr><td colspan="8" class="mut c">Sin registros</td></tr>')+
    '<tr class="tot"><td colspan="6">Total</td><td class="r">'+gs(totN)+'</td><td class="r">'+gs(tot)+'</td></tr></tbody></table>';
}

/* ═══════════════ 2. ANÁLISIS DE MÁRGENES ═══════════════ */
function repMargenes(per, mes){
  var P0=resolverPeriodo(per, mes), R=resultado(P0.meses), b='';
  var vP=R.v;
  /* trabajos (presupuestos): ventas del período + todos sus costos (costeo por trabajo) */
  var jobs={};
  vP.forEach(function(r){ var k=presKey(r.presupuesto); if(!k) return; var j=jobs[k]||(jobs[k]={k:k,cl:{},desc:'',i:0,c:0,nc:0}); j.i+=neto(r); j.cl[(r.cliente||'').trim()]=1; if(!j.desc&&r.descripcion) j.desc=r.descripcion; });
  Cc().forEach(function(r){ var k=presKey(r.presupuesto); if(!k||!jobs[k]||esActivoFijo(r)) return; jobs[k].c+=neto(r); jobs[k].nc++; });
  var pdesc={}; P().forEach(function(p){ var k=presKey(p.numero); if(k&&p.descripcion&&!pdesc[k]) pdesc[k]=p.descripcion; });
  var lista=Object.keys(jobs).map(function(k){ var j=jobs[k]; j.u=j.i-j.c; j.m=j.i?j.u/j.i*100:0; j.desc=pdesc[k]||j.desc; return j; });
  var conCosto=lista.filter(function(j){return j.c>0;}).sort(function(a,b){return b.u-a.u;});
  var sinCostoJobs=lista.filter(function(j){return j.c===0;});
  var sinCostoMonto=sum(sinCostoJobs,function(j){return j.i;})+sum(vP.filter(function(r){return !presKey(r.presupuesto);}),neto);
  /* costos sin venta en el período */
  var huerfanos={}; Cc().filter(function(r){return enMeses(r,P0.meses)&&!esActivoFijo(r);}).forEach(function(r){ var k=presKey(r.presupuesto); if(k && !V().some(function(v){return presKey(v.presupuesto)===k;})){ var h=huerfanos[k]||(huerfanos[k]={k:k,c:0,prov:{},desc:r.descripcion}); h.c+=neto(r); h.prov[r.proveedor||'—']=1; } });
  var huerf=Object.keys(huerfanos).map(function(k){return huerfanos[k];});

  b+='<div class="kpis">'+
    kpi('Ventas netas',gs(R.ventas),R.v.length+' ventas')+
    kpi('Costo de ventas',gs(R.costo),pct(R.ventas?R.costo/R.ventas*100:0)+' de las ventas','r')+
    kpi('Utilidad bruta',gsp(R.bruta),'','g')+
    kpi('Margen bruto',pct(R.ventas?R.bruta/R.ventas*100:0),'Objetivo sugerido ≥ 35%',(R.ventas&&R.bruta/R.ventas>=.35)?'g':'a')+
  '</div>';

  /* por línea */
  function linea(n,vv,cc){ var u=vv-cc,m=vv?u/vv*100:0; return '<tr><td><b>'+n+'</b></td><td class="r">'+gs(vv)+'</td><td class="r">'+pct(R.ventas?vv/R.ventas*100:0)+'</td><td class="r">'+gs(cc)+'</td><td class="r">'+gsp(u)+'</td><td class="r"><b>'+pct(m)+'</b></td><td style="width:22%"><div class="bar"><i class="'+(m>=35?'g':'')+'" style="width:'+Math.max(0,Math.min(100,m))+'%"></i></div></td></tr>'; }
  b+='<h2>Margen por línea de negocio</h2><table><thead><tr><th>Línea</th><th class="r">Ventas netas</th><th class="r">Particip.</th><th class="r">Costo</th><th class="r">Utilidad</th><th class="r">Margen</th><th>Margen visual</th></tr></thead><tbody>'+
    linea('Servicios',R.vServ,R.cServ)+linea('Productos',R.vProd,R.cProd)+
    '<tr class="tot"><td>Total</td><td class="r">'+gs(R.ventas)+'</td><td class="r">100,0%</td><td class="r">'+gs(R.costo)+'</td><td class="r">'+gs(R.bruta)+'</td><td class="r">'+pct(R.ventas?R.bruta/R.ventas*100:0)+'</td><td></td></tr></tbody></table>';

  /* por cliente */
  var cli={};
  vP.forEach(function(r){ var k=normName(r.cliente)||'(sin cliente)'; var c=cli[k]||(cli[k]={n:{},i:0,c:0,ops:0,jobs:{}}); c.n[(r.cliente||'(sin cliente)').trim()]=(c.n[(r.cliente||'(sin cliente)').trim()]||0)+1; c.i+=neto(r); c.ops++; var pk=presKey(r.presupuesto); if(pk) c.jobs[pk]=1; });
  Object.keys(cli).forEach(function(k){ var c=cli[k]; Object.keys(c.jobs).forEach(function(pk){ if(jobs[pk]){ var share=jobs[pk].i? (sum(vP.filter(function(r){return presKey(r.presupuesto)===pk&&(normName(r.cliente)||'(sin cliente)')===k;}),neto)/jobs[pk].i):0; c.c+=jobs[pk].c*share; } }); var best=Object.keys(c.n).sort(function(a,b){return c.n[b]-c.n[a];})[0]; c.nom=best; });
  var cl=Object.keys(cli).map(function(k){return cli[k];}).sort(function(a,b){return b.i-a.i;});
  var top=cl.slice(0,12), resto=cl.slice(12);
  b+='<h2>Ventas y margen por cliente</h2><div class="lead">El costo se asigna a través del N.º de presupuesto; las ventas sin presupuesto vinculado figuran sin costo.</div>'+
    '<table><thead><tr><th>#</th><th>Cliente</th><th class="c">Oper.</th><th class="r">Ventas netas</th><th class="r">Particip.</th><th class="r">Costo vinculado</th><th class="r">Utilidad</th><th class="r">Margen</th></tr></thead><tbody>'+
    top.map(function(c,i){ var u=c.i-c.c; return '<tr><td class="mut">'+(i+1)+'</td><td>'+esc(corto(c.nom,40))+'</td><td class="c">'+c.ops+'</td><td class="r">'+gs(c.i)+'</td><td class="r">'+pct(R.ventas?c.i/R.ventas*100:0)+'</td><td class="r">'+gs(c.c)+'</td><td class="r">'+gsp(u)+'</td><td class="r">'+pct(c.i?u/c.i*100:0)+'</td></tr>'; }).join('')+
    (resto.length?'<tr><td></td><td class="mut">Otros '+resto.length+' clientes</td><td class="c">'+sum(resto,function(c){return c.ops;})+'</td><td class="r">'+gs(sum(resto,function(c){return c.i;}))+'</td><td class="r">'+pct(R.ventas?sum(resto,function(c){return c.i;})/R.ventas*100:0)+'</td><td class="r">'+gs(sum(resto,function(c){return c.c;}))+'</td><td class="r">'+gs(sum(resto,function(c){return c.i-c.c;}))+'</td><td></td></tr>':'')+
    '<tr class="tot"><td></td><td>Total</td><td class="c">'+vP.length+'</td><td class="r">'+gs(R.ventas)+'</td><td class="r">100,0%</td><td class="r">'+gs(sum(cl,function(c){return c.c;}))+'</td><td class="r">'+gs(sum(cl,function(c){return c.i-c.c;}))+'</td><td></td></tr></tbody></table>';
  if(cl.length>=3){ var t3=sum(cl.slice(0,3),function(c){return c.i;}); b+='<div class="note"><b>Concentración:</b> los 3 principales clientes representan el '+pct(R.ventas?t3/R.ventas*100:0)+' de las ventas del período.</div>'; }

  /* por trabajo */
  b+='<h2>Rentabilidad por trabajo (presupuestos con costo)</h2><div class="lead">Ventas del período y todos los costos cargados al mismo N.º de presupuesto.</div>'+
    '<table><thead><tr><th>Presup.</th><th>Cliente</th><th>Trabajo</th><th class="r">Ventas netas</th><th class="r">Costo</th><th class="r">Utilidad</th><th class="r">Margen</th><th class="c">Estado</th></tr></thead><tbody>'+
    (conCosto.length?conCosto.map(function(j){ var est=j.m<0?'<span class="badge b-alta">Pérdida</span>':j.m<20?'<span class="badge b-media">Bajo</span>':j.m<35?'<span class="badge b-baja">Regular</span>':'<span class="badge b-ok">Bueno</span>';
      return '<tr><td class="sm">'+esc(j.k)+'</td><td>'+esc(corto(Object.keys(j.cl).join(', '),26))+'</td><td>'+esc(corto(j.desc,40))+'</td><td class="r">'+gs(j.i)+'</td><td class="r">'+gs(j.c)+'</td><td class="r">'+gsp(j.u)+'</td><td class="r"><b>'+pct(j.m)+'</b></td><td class="c">'+est+'</td></tr>'; }).join(''):'<tr><td colspan="8" class="mut c">No hay trabajos con costos vinculados en el período</td></tr>')+
    (conCosto.length?'<tr class="tot"><td colspan="3">Total trabajos con costo</td><td class="r">'+gs(sum(conCosto,function(j){return j.i;}))+'</td><td class="r">'+gs(sum(conCosto,function(j){return j.c;}))+'</td><td class="r">'+gs(sum(conCosto,function(j){return j.u;}))+'</td><td class="r">'+pct(sum(conCosto,function(j){return j.i;})?sum(conCosto,function(j){return j.u;})/sum(conCosto,function(j){return j.i;})*100:0)+'</td><td></td></tr>':'')+
    '</tbody></table>'+
    '<div class="note">Ventas sin costo directo asignado (mano de obra propia o sin presupuesto vinculado): <b>'+gs(sinCostoMonto)+'</b> ('+pct(R.ventas?sinCostoMonto/R.ventas*100:0)+' de las ventas). Para medir el margen real de cada trabajo, cargá el N.º de presupuesto también en las compras.</div>';
  if(huerf.length){
    b+='<h3>Costos cargados a presupuestos sin venta registrada</h3><table><thead><tr><th>Presup.</th><th>Proveedor</th><th>Concepto</th><th class="r">Costo neto</th></tr></thead><tbody>'+
      huerf.map(function(h){return '<tr><td class="sm">'+esc(h.k)+'</td><td>'+esc(corto(Object.keys(h.prov).join(', '),30))+'</td><td>'+esc(corto(h.desc,50))+'</td><td class="r">'+gs(h.c)+'</td></tr>';}).join('')+
      '<tr class="tot"><td colspan="3">Total</td><td class="r">'+gs(sum(huerf,function(h){return h.c;}))+'</td></tr></tbody></table>'+
      '<div class="lead" style="margin-top:4px">Pueden ser trabajos aún no cobrados o compras con el N.º de presupuesto distinto al de la venta.</div>';
  }

  /* punto de equilibrio */
  var nm=P0.meses.length||1, mb=R.ventas?R.bruta/R.ventas:0, gfm=R.gastosOp/nm, rtm=R.retiros/nm;
  var pe1=mb>0?gfm/mb:0, pe2=mb>0?(gfm+rtm)/mb:0, vm=R.ventas/nm;
  b+='<div class="keep"><h2>Punto de equilibrio mensual</h2><table class="fs"><tbody>'+
    fila('Margen bruto promedio',[pct(mb*100)],'i1')+
    fila('Gastos operativos fijos por mes',[gs(gfm)],'i1')+
    fila('Remuneración del propietario por mes',[gs(rtm)],'i1')+
    fila('Ventas netas necesarias para cubrir gastos operativos',[gs(pe1)],'sub')+
    fila('Ventas netas necesarias incluyendo la remuneración del propietario',[gs(pe2)],'sub')+
    fila('Ventas netas promedio por mes en el período',[gsp(vm)],'grand')+
    '</tbody></table>'+
    '<div class="note">'+(vm>=pe2?'Las ventas promedio <b>cubren</b> los gastos fijos y la remuneración del propietario, con un excedente de '+gs(vm-pe2)+' por mes.':'Las ventas promedio <b>no alcanzan</b> a cubrir gastos fijos y remuneración del propietario: faltan '+gs(pe2-vm)+' de ventas netas por mes (al margen actual).')+'</div></div>';

  if(P0.meses.length>1){
    b+='<h2>Evolución del margen</h2><table><thead><tr><th>Mes</th><th class="r">Servicios</th><th class="r">Productos</th><th class="r">Ventas netas</th><th class="r">Costo</th><th class="r">Utilidad bruta</th><th class="r">Margen</th><th style="width:18%"></th></tr></thead><tbody>'+
      P0.meses.map(function(m){ var x=resultado([m]), mg=x.ventas?x.bruta/x.ventas*100:0; return '<tr><td class="num">'+mesLbl(m)+'</td><td class="r">'+gs(x.vServ)+'</td><td class="r">'+gs(x.vProd)+'</td><td class="r">'+gs(x.ventas)+'</td><td class="r">'+gs(x.costo)+'</td><td class="r">'+gsp(x.bruta)+'</td><td class="r"><b>'+pct(mg)+'</b></td><td><div class="bar"><i class="'+(mg>=35?'g':'')+'" style="width:'+Math.max(0,Math.min(100,mg))+'%"></i></div></td></tr>'; }).join('')+
      '</tbody></table>';
  }
  b+='<div class="note"><b>Criterios:</b> montos sin IVA. Línea según el campo «Tipo» de cada venta y compra. Los presupuestos se agrupan por número normalizado (p. ej. «834» = «0834»); los registros con «Ppto. Nro xx» se consideran sin presupuesto. La calidad de este análisis depende de que el tipo y el N.º de presupuesto estén bien cargados (ver Auditoría de libros).</div>';
  return documento('Análisis de Márgenes', P0.label, b);
}

/* ═══════════════ 3. BALANCE GENERAL ═══════════════ */
function cajaInicial(y){ try{ return +(localStorage.getItem('bi_caja_ini_'+y)||0)||0; }catch(e){ return 0; } }
function repBalance(mes){
  var todos=mesesConDatos(); mes=mes||todos[todos.length-1]||curMesR();
  var y=mes.slice(0,4), meses=[], i;
  for(i=1;i<=+mes.slice(5,7);i++) meses.push(y+'-'+String(i).padStart(2,'0'));
  var R=resultado(meses), iva=ivaMensual(meses), last=iva[iva.length-1]||{aPagar:0,favor:0};
  var pagadoPrev=sum(iva.slice(0,-1),function(x){return x.aPagar;});
  var ci=cajaInicial(y);
  var caja=ci+R.cobros-R.pagos-R.activoFijoBruto-R.gastosOp-R.retiros-pagadoPrev;
  var bienesUso=R.activoFijo;
  var actCorr=caja+last.favor, activo=actCorr+bienesUso;
  var pasivo=last.aPagar;
  var resEj=R.operativo, patr=ci+resEj-R.retiros;
  var dif=Math.round(activo-(pasivo+patr));
  var cob=COB().filter(function(c){return c.estado!=='Cobrado';}), cobT=sum(cob,mto);
  var b='';
  b+='<div class="eq"><div><div class="l">Activo</div><div class="v">'+gs(activo)+'</div></div><div class="op">=</div><div><div class="l">Pasivo</div><div class="v">'+gs(pasivo)+'</div></div><div class="op">+</div><div><div class="l">Patrimonio neto</div><div class="v">'+gsp(patr)+'</div></div></div>';
  b+='<div class="two"><div class="keep"><h2>Activo</h2><table class="fs"><tbody>'+
    '<tr class="hd"><td>Activo corriente</td><td class="r">₲</td></tr>'+
    fila('Caja y bancos (estimado)',[gsp(caja)],'i1')+
    fila('Crédito fiscal IVA (saldo a favor)',[gs(last.favor)],'i1')+
    fila('Total activo corriente',[gsp(actCorr)],'sub')+
    '<tr class="hd"><td>Activo no corriente</td><td></td></tr>'+
    fila('Herramientas y bienes de uso (al costo)',[gs(bienesUso)],'i1')+
    fila('Total activo no corriente',[gs(bienesUso)],'sub')+
    fila('TOTAL ACTIVO',[gsp(activo)],'grand')+
    '</tbody></table></div>'+
    '<div class="keep"><h2>Pasivo y patrimonio</h2><table class="fs"><tbody>'+
    '<tr class="hd"><td>Pasivo corriente</td><td class="r">₲</td></tr>'+
    fila('IVA a pagar ('+MES[+mes.slice(5,7)-1]+')',[gs(last.aPagar)],'i1')+
    fila('Cuentas por pagar a proveedores',[gs(0)],'i1')+
    fila('TOTAL PASIVO',[gs(pasivo)],'sub')+
    '<tr class="hd"><td>Patrimonio neto</td><td></td></tr>'+
    fila('Capital / caja inicial del ejercicio',[gs(ci)],'i1')+
    fila('Resultado del ejercicio (operativo)',[gsp(resEj)],'i1')+
    fila('Retiros del propietario',[gs(-R.retiros)],'i1')+
    fila('TOTAL PATRIMONIO NETO',[gsp(patr)],'sub')+
    fila('TOTAL PASIVO + PATRIMONIO',[gsp(pasivo+patr)],'grand')+
    '</tbody></table></div></div>'+
    '<div class="check'+(dif?' bad':'')+'"><span>Control de cuadre: Activo − (Pasivo + Patrimonio)</span><span>'+(dif?gs(dif)+' ✗':'₲ 0 ✓ Balance cuadrado')+'</span></div>';

  b+='<div class="two"><div class="keep"><h2>Resultados del ejercicio</h2><table class="fs"><tbody>'+
    fila('Ventas netas',[gs(R.ventas)],'i1')+fila('Costo de ventas',[gs(-R.costo)],'i1')+fila('Utilidad bruta',[gsp(R.bruta)],'sub')+
    fila('Gastos operativos',[gs(-R.gastosOp)],'i1')+fila('Resultado operativo',[gsp(R.operativo)],'sub')+
    fila('Retiros del propietario',[gs(-R.retiros)],'i1')+fila('Resultado después de retiros',[gsp(R.neto)],'grand')+
    '</tbody></table></div>'+
    '<div class="keep"><h2>Indicadores</h2><table class="fs"><tbody>'+
    fila('Margen bruto',[pct(R.ventas?R.bruta/R.ventas*100:0)],'i1')+
    fila('Margen operativo',[pct(R.ventas?R.operativo/R.ventas*100:0)],'i1')+
    fila('Margen neto después de retiros',[pct(R.ventas?R.neto/R.ventas*100:0)],'i1')+
    fila('Ventas netas promedio mensual',[gs(R.ventas/meses.length)],'i1')+
    fila('Retiros / resultado operativo',[R.operativo>0?pct(R.retiros/R.operativo*100):'—'],'i1')+
    '</tbody></table>'+
    '<h3>Cuentas de orden (no incluidas en el balance)</h3><table class="fs"><tbody>'+
    fila('Cobros pendientes registrados ('+cob.length+')',[gs(cobT)],'i1')+
    '</tbody></table></div></div>';

  b+='<h2>Liquidación mensual de IVA del ejercicio</h2><table><thead><tr><th>Mes</th><th class="r">IVA débito</th><th class="r">IVA crédito</th><th class="r">Saldo a favor anterior</th><th class="r">IVA a pagar</th><th class="r">Saldo a favor</th><th class="c">Estado</th></tr></thead><tbody>'+
    iva.map(function(x,ix){ var ult=ix===iva.length-1; return '<tr><td class="num">'+mesLbl(x.mes)+'</td><td class="r">'+gs(x.debito)+'</td><td class="r">'+gs(x.credito)+'</td><td class="r">'+gs(x.favorAnt)+'</td><td class="r">'+gs(x.aPagar)+'</td><td class="r">'+gs(x.favor)+'</td><td class="c">'+(x.aPagar?(ult?'<span class="badge b-media">Pendiente</span>':'<span class="badge b-baja">Liquidado</span>'):'<span class="badge b-ok">A favor</span>')+'</td></tr>'; }).join('')+
    '<tr class="tot"><td>Total</td><td class="r">'+gs(sum(iva,function(x){return x.debito;}))+'</td><td class="r">'+gs(sum(iva,function(x){return x.credito;}))+'</td><td></td><td class="r">'+gs(sum(iva,function(x){return x.aPagar;}))+'</td><td></td><td></td></tr></tbody></table>';

  b+='<div class="note"><b>Notas al balance</b><ul>'+
    '<li>Estado de situación <b>estimado</b> al '+fch(mes+'-'+new Date(+y,+mes.slice(5,7),0).getDate())+', elaborado con los registros del sistema (base percibido). No reemplaza al balance impositivo firmado por un contador.</li>'+
    '<li>La caja se calcula como: caja inicial + cobros − pagos a proveedores − gastos fijos − retiros − IVA de meses anteriores (se asume pagado el mes siguiente).'+(ci?'':' <b>Caja inicial del ejercicio no cargada (₲ 0)</b>: indicala en la tarjeta del reporte para un saldo más preciso.')+'</li>'+
    '<li>No se registran cuentas por pagar: se asume que las compras se pagan al contado.</li>'+
    (bienesUso?'<li>Las compras de herramientas se activan como bienes de uso al costo, sin depreciación.</li>':'')+
    '<li>Los cobros pendientes figuran en cuentas de orden porque, en base percibido, la venta se registra recién al cobrarse.</li></ul></div>'+
    '<div class="sign"><div>Preparado por</div><div>Revisado por (Contador/a)</div></div>';
  return documento('Balance General', 'Al '+fch(mes+'-'+String(new Date(+y,+mes.slice(5,7),0).getDate()).padStart(2,'0')), b);
}

/* ═══════════════ 4. LIBROS IVA ═══════════════ */
function repLibros(per, mes, soloComprobante){
  var P0=resolverPeriodo(per, mes), b='';
  function libro(titulo, rows, campo, etq){
    var todos=rows.filter(function(r){return enMeses(r,P0.meses);}).sort(function(a,b){return String(a.fecha).localeCompare(String(b.fecha))||String(a.factura||'').localeCompare(String(b.factura||''));});
    var inc=soloComprobante?todos.filter(function(r){return r.factura;}):todos, exc=todos.length-inc.length, excM=sum(todos.filter(function(r){return !r.factura;}),mto);
    var g=sum(inc.filter(function(r){return r.iva;}),neto), iv=sum(inc,ivaDe), ex=sum(inc.filter(function(r){return !r.iva;}),mto);
    var h='<h2>'+titulo+'</h2><table><thead><tr><th>#</th><th>Fecha</th><th>Comprobante</th><th>'+etq+'</th><th>Concepto</th><th class="r">Gravada 10%</th><th class="r">IVA 10%</th><th class="r">Exenta</th><th class="r">Total</th></tr></thead><tbody>'+
      (inc.length?inc.map(function(r,i){ return '<tr><td class="mut">'+(i+1)+'</td><td class="num">'+fch(r.fecha)+'</td><td class="num">'+esc(r.factura||'— sin comprobante —')+'</td><td>'+esc(corto(r[campo],34)||'—')+'</td><td>'+esc(corto(r.descripcion,46)||'—')+'</td><td class="r">'+(r.iva?gs(neto(r)):'')+'</td><td class="r">'+(r.iva?gs(ivaDe(r)):'')+'</td><td class="r">'+(r.iva?'':gs(mto(r)))+'</td><td class="r">'+gs(mto(r))+'</td></tr>'; }).join(''):'<tr><td colspan="9" class="mut c">Sin registros</td></tr>')+
      '<tr class="tot"><td colspan="5">Totales ('+inc.length+' registros)</td><td class="r">'+gs(g)+'</td><td class="r">'+gs(iv)+'</td><td class="r">'+gs(ex)+'</td><td class="r">'+gs(g+iv+ex)+'</td></tr></tbody></table>'+
      (soloComprobante&&exc?'<div class="lead" style="margin-top:4px">Excluidos '+exc+' registros sin N.º de comprobante por '+gs(excM)+'.</div>':'');
    return {html:h, iva:iv, base:g, ex:ex};
  }
  var lv=libro('Libro de ventas', V(), 'cliente', 'Cliente'), lc=libro('Libro de compras', Cc(), 'proveedor', 'Proveedor');
  b+='<div class="kpis">'+kpi('Ventas gravadas (base)',gs(lv.base),'Exentas '+gs(lv.ex))+kpi('IVA débito',gs(lv.iva),'','')+kpi('IVA crédito',gs(lc.iva),'Compras gravadas '+gs(lc.base),'g')+kpi('Saldo IVA del período',gsp(lv.iva-lc.iva),lv.iva-lc.iva>=0?'A pagar':'A favor',lv.iva-lc.iva>=0?'r':'g')+'</div>';
  b+=lv.html+lc.html;
  b+='<div class="note"><b>Criterio:</b> '+(soloComprobante?'solo se incluyen registros con N.º de comprobante cargado.':'se incluyen todos los registros del sistema, con o sin comprobante.')+' Gravada = monto ÷ 1,1; IVA = monto ÷ 11. Verificar contra los comprobantes emitidos en e-Kuatia\'i y los recibidos antes de presentar el Formulario 120.</div>';
  return documento('Libros IVA de Ventas y Compras', P0.label, b, {landscape:true});
}

/* ═══════════════ 5. AUDITORÍA DE LIBROS ═══════════════ */
var SEV={alta:3,media:2,baja:1};
/* Explicación y acción por control (se muestra una sola vez por grupo) */
var CTRL={
  'Monto inválido o registro de prueba':'Registros con monto menor a ₲ 1.000. Suelen ser pruebas: eliminarlos o corregir el monto.',
  'N.º de factura repetido en distintos clientes':'Un mismo número de factura no puede corresponder a dos clientes. Corregir el número del registro marcado según el comprobante emitido.',
  'Posible registro duplicado':'Mismo cliente o proveedor, mismo monto y concepto (o misma factura) en pocos días. Si fueron dos cobros parciales de una misma factura está bien; si no, eliminar el duplicado.',
  'Ventas superan el presupuesto':'Lo cobrado con ese N.º de presupuesto supera el monto presupuestado: posible venta duplicada o vinculada al presupuesto equivocado.',
  'Venta facturada marcada como exenta':'Tiene N.º de factura pero figura «Exento de IVA». Si la factura se emitió con IVA 10%, el débito fiscal del sistema queda subestimado: marcar «Gravado con IVA».',
  'Venta gravada sin N.º de factura':'Marcadas con IVA pero sin comprobante. Cargar el N.º de factura; si fue una venta sin factura, marcarla «Exento» para que no se sume al IVA del sistema.',
  'Crédito fiscal sin comprobante':'Compras marcadas con IVA sin N.º de factura del proveedor: sin comprobante el crédito fiscal no es deducible. Cargar la factura o marcarla «Exento».',
  'Compra con factura marcada como exenta':'Si la factura del proveedor discrimina IVA 10%, marcarla «Gravado con IVA» para no perder el crédito fiscal.',
  'Misma factura con fechas distintas':'La misma factura aparece en varios registros con fechas separadas. Correcto si son cobros parciales; si no, corregir la fecha o el número.',
  'Misma factura de proveedor con fechas distintas':'Una factura de proveedor tiene una sola fecha: corregir el número o la fecha.',
  'Factura fuera de secuencia':'La numeración de facturas no coincide con el orden de fechas (número bajo con fecha posterior, o al revés). Revisar número o fecha.',
  'Concepto de producto cargado como «Servicio»':'El concepto describe un bien. Cambiar el tipo a «Producto»: afecta el margen por línea y el costo de productos.',
  'Concepto de servicio cargado como «Producto»':'El concepto describe un servicio. Corregir el tipo, o la descripción si en realidad se vendió o compró un bien.',
  'Compra cargada con la factura de venta propia':'El N.º de factura de la compra es una factura de venta de Big Informática y el «proveedor» es el cliente. Cargar el proveedor real y su factura.',
  'Proveedor coincide con un cliente':'El proveedor figura como cliente en ventas. Si es el destino del trabajo, el proveedor real debería ser quien vendió el bien o servicio.',
  'Compra sin proveedor':'Sin proveedor no se puede respaldar el gasto ni el crédito fiscal.',
  'Posible bien de uso cargado como costo':'Herramientas y equipos propios no son costo de ventas. Los reportes los tratan como inversión (bien de uso).',
  'Presupuesto «Pendiente» con ventas registradas':'Ya tiene cobros registrados: cambiar el estado a «Aprobado».',
  'Presupuesto duplicado':'Mismo número, cliente, concepto y monto que otro presupuesto. Eliminar el que sobra.',
  'Campo cliente con un concepto':'El campo cliente tiene un concepto en lugar de un nombre. Separar las ventas por cliente real.',
  'Monto idéntico, mismo cliente':'Mismo monto exacto que otro registro cercano con distinto concepto. Verificar que no sea un error de copia.',
  'Monto idéntico, mismo proveedor':'Mismo monto exacto que otro registro cercano con distinto concepto. Verificar que no sea un error de copia.',
  'Fecha futura':'La fecha del registro es posterior a hoy.',
  'Formato de comprobante no estándar':'Usar siempre el formato 001-001-0000000 para que el sistema detecte repetidos y la secuencia.',
  'Concepto genérico':'Conceptos como «Servicios» o «Compra marzo» no identifican el bien o servicio. Detallarlos.',
  'Concepto vacío':'Detallar el bien o servicio.',
  'Venta sin cliente':'Completar el cliente (razón social o nombre).',
  'N.º de presupuesto repetido':'El mismo número se usó en presupuestos distintos: ventas y compras de trabajos distintos se mezclan en el análisis de márgenes.',
  'N.º de presupuesto no estándar':'Usar la numeración de 4 dígitos (0001…) para que ventas y compras se vinculen bien.'
};
function auditar(meses){
  var H=[], vs=V().filter(function(r){return !meses||enMeses(r,meses);}), cs=Cc().filter(function(r){return !meses||enMeses(r,meses);});
  var todosV=V(), esV={}; vs.forEach(function(r){esV[r.id]=1;});
  function tipoDe(r){ return esV[r.id]?'Venta':'Compra'; }
  function add(sev, regla, tipo, r, det, impacto){
    H.push({sev:sev, regla:regla, tipo:tipo, id:r?r.id:null, fecha:r?r.fecha:'', parte:r?(tipo==='Compra'?r.proveedor:r.cliente):'', concepto:r?(r.descripcion||''):'',
      comp:r?(tipo==='Presupuesto'?(r.numero||''):(r.factura||'')):'', pres:r&&tipo!=='Presupuesto'?(r.presupuesto||''):'', monto:r?mto(r):0, det:det||'', impacto:impacto||0});
  }
  var nombresCli={}; todosV.forEach(function(r){ var n=normName(r.cliente); if(n) nombresCli[n]=1; });
  var factVentas={}; todosV.forEach(function(r){ if(r.factura) factVentas[factKey(r.factura)]=1; });
  var hoy=new Date(Date.now()+864e5*2).toISOString().slice(0,10);

  /* — registros anómalos — */
  vs.concat(cs).forEach(function(r){ var t=tipoDe(r);
    if(mto(r)<1000) add('alta','Monto inválido o registro de prueba',t,r,'',mto(r));
    if(r.fecha && r.fecha>hoy) add('media','Fecha futura',t,r,'');
  });

  /* — facturas de venta repetidas — */
  var porFact={}; vs.forEach(function(r){ if(r.factura){ var k=factKey(r.factura); (porFact[k]=porFact[k]||[]).push(r); } });
  Object.keys(porFact).forEach(function(k){ var g=porFact[k]; if(g.length<2) return;
    var noms={}; g.forEach(function(r){ var n=normName(r.cliente); if(n) noms[n]=(noms[n]||0)+1; });
    var ns=Object.keys(noms).sort(function(a,b){return noms[b]-noms[a];});
    if(ns.length>1){
      var mayor=noms[ns[0]]>noms[ns[1]]?ns[0]:null, nomMayor=mayor?(g.find(function(r){return normName(r.cliente)===mayor;})||{}).cliente:'';
      g.forEach(function(r){ var n=normName(r.cliente); if(mayor && (n===mayor||!n)) return;
        var otros=mayor?['«'+corto(nomMayor,22)+'»']:g.filter(function(x){return x!==r&&normName(x.cliente)!==n;}).map(function(x){return '«'+corto(x.cliente||'sin cliente',22)+'» '+fch(x.fecha);});
        add('alta','N.º de factura repetido en distintos clientes','Venta',r,'También cargada a '+otros.join(', '));
      });
      if(mayor) g=g.filter(function(r){ var n=normName(r.cliente); return n===mayor||!n; });
    }
    if(g.length<2) return;
    var fechas=g.map(function(r){return r.fecha;}).sort(), span=dias(fechas[0],fechas[fechas.length-1]);
    if(span<=5) return;
    var dup={};
    g.forEach(function(a,i){ g.forEach(function(b,j){ if(j>i && a.fecha!==b.fecha && mto(a)===mto(b)){ var rec=a.fecha>=b.fecha?a:b, otro=rec===a?b:a; dup[rec.id]=1;
      add('alta','Posible registro duplicado','Venta',rec,'Misma factura y monto que la venta del '+fch(otro.fecha),mto(rec)); } }); });
    g.forEach(function(r){ if(!dup[r.id]) add('media','Misma factura con fechas distintas','Venta',r,g.length+' registros entre '+fch(fechas[0])+' y '+fch(fechas[fechas.length-1])); });
  });
  var porFC={}; cs.forEach(function(r){ if(r.factura){ var k=normName(r.proveedor)+'|'+factKey(r.factura); (porFC[k]=porFC[k]||[]).push(r); } });
  Object.keys(porFC).forEach(function(k){ var g=porFC[k]; if(g.length<2) return; var f=g.map(function(r){return r.fecha;}).sort();
    if(dias(f[0],f[f.length-1])>5) g.forEach(function(r){ add('media','Misma factura de proveedor con fechas distintas','Compra',r,g.length+' compras entre '+fch(f[0])+' y '+fch(f[f.length-1])); });
  });
  vs.forEach(function(r){ if(r.factura && !factValida(r.factura)) add('baja','Formato de comprobante no estándar','Venta',r,'Correcto: '+factKey(r.factura).replace(/^X/,'?')); });
  cs.forEach(function(r){ if(r.factura && !factValida(r.factura)) add('baja','Formato de comprobante no estándar','Compra',r,'Correcto: '+factKey(r.factura).replace(/^X/,'?')); });
  /* secuencia */
  var serie=todosV.filter(function(r){return r.factura && factKey(r.factura).charAt(0)!=='X';}).map(function(r){var k=factKey(r.factura);return {r:r,s:k.slice(0,7),n:+k.slice(8),f:r.fecha};});
  serie.forEach(function(a){ if(!esV[a.r.id]) return;
    var vec=serie.filter(function(b){return b.s===a.s && b.n!==a.n && Math.abs(b.n-a.n)<=8;}).sort(function(x,y){return Math.abs(x.n-a.n)-Math.abs(y.n-a.n);}).slice(0,6);
    if(vec.length<3) return;
    var ts=vec.map(function(b){return +new Date(b.f);}).sort(function(x,y){return x-y;}), med=ts[Math.floor(ts.length/2)];
    var ns=vec.map(function(b){return b.n;}), lo=Math.min.apply(null,ns), hi=Math.max.apply(null,ns);
    if(Math.abs(+new Date(a.f)-med)/864e5>30) add('media','Factura fuera de secuencia','Venta',a.r,'Las facturas vecinas (N.º '+lo+'–'+hi+') son de ~'+fch(new Date(med).toISOString().slice(0,10)));
  });
  /* IVA */
  vs.forEach(function(r){ if(r.factura && !r.iva && mto(r)>=1000) add('alta','Venta facturada marcada como exenta','Venta',r,'IVA no computado '+gs(mto(r)/11),mto(r)/11); });
  vs.forEach(function(r){ if(r.iva && !r.factura && mto(r)>=1000) add('media','Venta gravada sin N.º de factura','Venta',r,'IVA '+gs(mto(r)/11),mto(r)/11); });
  cs.forEach(function(r){ if(r.factura && !r.iva) add('media','Compra con factura marcada como exenta','Compra',r,'Crédito posible '+gs(mto(r)/11),mto(r)/11); });
  cs.forEach(function(r){ if(r.iva && !r.factura && mto(r)>=1000) add('media','Crédito fiscal sin comprobante','Compra',r,'IVA '+gs(mto(r)/11),mto(r)/11); });
  /* compras con datos de la venta */
  cs.forEach(function(r){
    var fv=r.factura && factVentas[factKey(r.factura)], pc=normName(r.proveedor), esCli=pc && nombresCli[pc];
    if(fv) add('media','Compra cargada con la factura de venta propia','Compra',r,'');
    else if(esCli) add('media','Proveedor coincide con un cliente','Compra',r,'');
    if(!(r.proveedor||'').trim()) add('media','Compra sin proveedor','Compra',r,'');
    if(esActivoFijo(r)) add('media','Posible bien de uso cargado como costo','Compra',r,'');
  });
  /* tipo vs concepto */
  function splitJob(r, lista){ var k=presKey(r.presupuesto); return k && lista.some(function(x){return x!==r && presKey(x.presupuesto)===k && x.tipo==='Producto';}); }
  [['Venta',vs],['Compra',cs]].forEach(function(par){ var t=par[0];
    par[1].forEach(function(r){ var d=(r.descripcion||'').trim(); if(!d) return;
      var dd=d.normalize('NFD').replace(/[̀-ͯ]/g,'');
      var hp=RX_PROD.test(dd), hs=RX_SERV.test(t==='Compra'?dd.replace(/\bcambio\b/ig,''):dd);
      var fuerte=RX_PROD_FUERTE.test(dd) && RX_PROD.test(dd.replace(/^.*?(venta|compra|provisi[oó]n)\s+de\s+/i,'').split(/\s+/).slice(0,3).join(' '));
      if(r.tipo!=='Producto' && (fuerte || (hp && !hs && !(t==='Venta' && splitJob(r,par[1]))))) add('media','Concepto de producto cargado como «Servicio»',t,r,'');
      if(r.tipo==='Producto' && RX_SERV_INICIO.test(dd) && !fuerte) add('media','Concepto de servicio cargado como «Producto»',t,r,'');
    });
  });
  /* conceptos y partes */
  vs.forEach(function(r){
    if(!(r.cliente||'').trim()) add('baja','Venta sin cliente','Venta',r,'');
    else if(RX_GENERICO.test(normName(r.cliente)) || /^disco|^servicios? varios/.test(normName(r.cliente))) add('media','Campo cliente con un concepto','Venta',r,'');
  });
  vs.concat(cs).forEach(function(r){ var t=tipoDe(r), d=(r.descripcion||'').trim();
    if(!d) add('baja','Concepto vacío',t,r,'');
    else if(RX_GENERICO.test(normName(d))) add('baja','Concepto genérico',t,r,'');
  });
  /* posibles duplicados */
  function dupes(lista, t, campo){
    for(var i=0;i<lista.length;i++) for(var j=i+1;j<lista.length;j++){
      var a=lista[i], b=lista[j], na=normName(a[campo]), nb=normName(b[campo]);
      if(!na || na!==nb || dias(a.fecha,b.fecha)>20) continue;
      if(RX_RECURRENTE.test(a.descripcion||'')||RX_RECURRENTE.test(b.descripcion||'')) continue;
      if(a.factura && b.factura && factKey(a.factura)===factKey(b.factura)) continue;
      var ka=presKey(a.presupuesto), kb=presKey(b.presupuesto); if(ka && kb && ka!==kb) continue;
      if(ka && kb && ka===kb && a.tipo!==b.tipo) continue;
      var ma=mto(a), mb=mto(b); if(Math.abs(ma-mb)>Math.max(ma,mb)*0.01) continue;
      var sim=solap(a.descripcion,b.descripcion), rec=a.fecha>=b.fecha?a:b, otro=rec===a?b:a;
      if(ka && ka===kb && sim<0.6) continue; /* cuotas del mismo presupuesto */
      if(sim>=0.6) add('alta','Posible registro duplicado',t,rec,'Igual al del '+fch(otro.fecha)+(otro.factura?' (fact. '+otro.factura+')':' (sin factura)'),mto(rec));
      else if(ma>=1000000 && ma===mb) add('media','Monto idéntico, mismo '+(t==='Venta'?'cliente':'proveedor'),t,rec,'Igual monto que «'+corto(otro.descripcion,30)+'» del '+fch(otro.fecha));
    }
  }
  function porFecha(a,b){return String(a.fecha).localeCompare(String(b.fecha));}
  dupes(vs.slice().sort(porFecha),'Venta','cliente');
  dupes(cs.slice().sort(porFecha),'Compra','proveedor');

  /* presupuestos */
  if(!meses){
    var porNum={}; P().forEach(function(p){ var k=presKey(p.numero); if(!k) return; (porNum[k]=porNum[k]||[]).push(p); });
    Object.keys(porNum).forEach(function(k){ var g=porNum[k]; if(g.length<2) return;
      var exacto=g.every(function(p){return normName(p.cliente)===normName(g[0].cliente)&&normName(p.descripcion)===normName(g[0].descripcion)&&+p.monto===+g[0].monto;});
      g.forEach(function(p){ add(exacto?'media':'baja',exacto?'Presupuesto duplicado':'N.º de presupuesto repetido','Presupuesto',p,exacto?'Estados: '+g.map(function(x){return x.estado;}).join(' / '):g.length+' presupuestos con el N.º '+k); });
    });
    P().forEach(function(p){ var n=String(p.numero||'').trim(); if(!/^\d{4}$/.test(n)) add('baja','N.º de presupuesto no estándar','Presupuesto',p,n?'':'Sin número'); });
    P().forEach(function(p){ var k=presKey(p.numero); if(!k) return; var cn=tokens(p.cliente);
      var vend=todosV.filter(function(v){ if(presKey(v.presupuesto)!==k) return false; var vt=tokens(v.cliente); return !cn.length||!vt.length||cn.some(function(t){return vt.indexOf(t)>=0;}); });
      var tv=sum(vend,mto);
      if(p.estado==='Pendiente' && vend.length) add('media','Presupuesto «Pendiente» con ventas registradas','Presupuesto',p,vend.length+' venta(s) por '+gs(tv));
      if(+p.monto>0 && tv>+p.monto*1.02) add('alta','Ventas superan el presupuesto','Presupuesto',p,'Cobrado '+gs(tv)+' (exceso '+gs(tv-p.monto)+')',tv-p.monto);
    });
  }
  /* nombres a unificar */
  var nomb={}; todosV.forEach(function(r){ var n=normName(r.cliente); if(n){ nomb[n]=nomb[n]||{}; nomb[n][(r.cliente||'').trim()]=1; } });
  var pares=[], keys=Object.keys(nomb);
  keys.forEach(function(a){ var A=a.split(' '); keys.forEach(function(b){ if(a===b||a.length<4) return; var B=b.split(' '); if(A.length<B.length && A.every(function(t){return B.indexOf(t)>=0;})) pares.push([a,b]); }); });
  keys.forEach(function(k){ if(Object.keys(nomb[k]).length>1) pares.push([k]); });
  var grupos=[]; pares.forEach(function(p){ var g=grupos.find(function(x){return p.some(function(k){return x.indexOf(k)>=0;});}); if(g) p.forEach(function(k){ if(g.indexOf(k)<0) g.push(k); }); else grupos.push(p.slice()); });
  var nombres=grupos.map(function(g){ var s={}; g.forEach(function(k){ Object.keys(nomb[k]).forEach(function(x){s[x]=1;}); }); return Object.keys(s); }).filter(function(x){return x.length>1;});
  /* gastos fijos personales que no son la remuneración */
  var gp=G().filter(function(g){return g.activo && esPersonal(g) && !/sueldo|salario|retiro|remuneraci/i.test(g.concepto||'');});

  H.sort(function(a,b){ return (SEV[b.sev]-SEV[a.sev]) || a.regla.localeCompare(b.regla) || String(b.fecha).localeCompare(String(a.fecha)); });
  return {h:H, nombres:nombres, gastosPersonales:gp, nV:vs.length, nC:cs.length, nP:meses?0:P().length};
}
function repAuditoria(per, mes, nivel){
  var P0=per==='todo'?{meses:null,label:'Todos los registros'}:resolverPeriodo(per,mes);
  var A=auditar(P0.meses), H=A.h, b='';
  var nA=H.filter(function(x){return x.sev==='alta';}).length, nM=H.filter(function(x){return x.sev==='media';}).length, nB=H.filter(function(x){return x.sev==='baja';}).length;
  var riesgo=sum(H.filter(function(x){return x.sev==='alta';}),function(x){return x.impacto||0;});
  var ivaR=sum(H.filter(function(x){return /sin comprobante|sin N\.º de factura|exenta/.test(x.regla);}),function(x){return x.impacto||0;});
  var regs={}, orden=[]; H.forEach(function(x){ var r=regs[x.regla]; if(!r){ r=regs[x.regla]={regla:x.regla,sev:x.sev,n:0,imp:0,items:[]}; orden.push(r); } r.n++; r.imp+=x.impacto||0; r.items.push(x); });
  orden.sort(function(a,c){return (SEV[c.sev]-SEV[a.sev])||(c.imp-a.imp)||(c.n-a.n);});
  b+='<div class="kpis k5">'+kpi('Registros revisados',num(A.nV+A.nC+A.nP),A.nV+' ventas · '+A.nC+' compras'+(A.nP?' · '+A.nP+' presup.':''))+
    kpi('Prioridad alta',nA,'Afectan montos o IVA','r')+kpi('Prioridad media',nM,'Clasificación y respaldo','a')+kpi('Prioridad baja',nB,'Calidad de datos','')+
    kpi('Monto a revisar',gs(riesgo),'Duplicados y excesos','r')+'</div>';
  b+='<h2>Resumen de hallazgos</h2><table><thead><tr><th>#</th><th>Control</th><th class="c">Prioridad</th><th class="c">Casos</th><th class="r">Impacto estimado</th></tr></thead><tbody>'+
    orden.map(function(r,i){ return '<tr><td class="mut">'+(i+1)+'</td><td>'+esc(r.regla)+'</td><td class="c"><span class="badge b-'+r.sev+'">'+r.sev+'</span></td><td class="c">'+r.n+'</td><td class="r">'+(r.imp?gs(r.imp):'<span class="mut">—</span>')+'</td></tr>'; }).join('')+
    (H.length?'':'<tr><td colspan="5" class="c">Sin hallazgos ✓</td></tr>')+'</tbody></table>';
  if(ivaR) b+='<div class="note"><b>IVA:</b> los controles de IVA involucran '+gs(ivaR)+' de impuesto mal respaldado o mal marcado. Conviene corregirlos antes de preparar el Formulario 120.</div>';

  var vis=orden.filter(function(r){ return nivel!=='am' || r.sev!=='baja'; });
  b+='<h2 style="margin-top:18px">Detalle por control</h2><div class="lead">Cada hallazgo es una alerta para revisar, no una certeza. En la vista previa, «Editar» abre el registro para corregirlo; después volvé a ejecutar la auditoría.</div>';
  vis.forEach(function(r,i){
    var conDet=r.items.some(function(x){return x.det;});
    b+='<div class="ctl keep"><div class="ctl-h"><span class="badge b-'+r.sev+'">'+r.sev+'</span> <b>'+(orden.indexOf(r)+1)+'. '+esc(r.regla)+'</b> <span class="mut">· '+r.n+' caso'+(r.n>1?'s':'')+(r.imp?' · '+gs(r.imp):'')+'</span></div>'+
      '<div class="ctl-a">'+esc(CTRL[r.regla]||'')+'</div></div>'+
      '<table class="aud"><colgroup><col style="width:66px"><col style="width:52px"><col style="width:'+(conDet?'17%':'21%')+'"><col><col style="width:'+(conDet?'15%':'18%')+'"><col style="width:76px">'+(conDet?'<col style="width:22%">':'')+'<col class="no-print" style="width:42px"></colgroup><thead><tr><th>Fecha</th><th>Registro</th><th>Cliente / proveedor</th><th>Concepto</th><th>Comprob. / presup.</th><th class="r">Monto</th>'+(conDet?'<th>Detalle</th>':'')+'<th class="no-print"></th></tr></thead><tbody>'+
      r.items.map(function(x){
        var ed=x.id?'<button class="edit" onclick="var w=window.parent!==window?window.parent:window.opener;if(w&&w.rptEditar)w.rptEditar(\''+x.tipo+'\',\''+String(x.id).replace(/[^\w-]/g,'')+'\')">Editar</button>':'';
        var ref=[x.comp,presKey(x.pres)?'P '+presKey(x.pres):''].filter(Boolean).join(' · ');
        return '<tr><td class="num">'+fch(x.fecha)+'</td><td>'+(x.tipo==='Presupuesto'?'Presup.':x.tipo)+'</td><td class="el">'+esc(corto(x.parte,30)||'—')+'</td><td class="el" title="'+esc(x.concepto)+'">'+esc(corto(x.concepto,70)||'—')+'</td><td class="el">'+esc(corto(ref,34)||'—')+'</td><td class="r">'+gs(x.monto)+'</td>'+(conDet?'<td>'+esc(x.det)+'</td>':'')+'<td class="no-print">'+ed+'</td></tr>';
      }).join('')+'</tbody></table>';
  });
  if(nivel==='am' && nB) b+='<div class="note">Se omitieron '+nB+' hallazgos de prioridad baja (calidad de datos). Elegí «Todos los hallazgos» para verlos.</div>';
  if(A.nombres.length){
    b+='<h2>Nombres de clientes a unificar ('+A.nombres.length+')</h2><div class="lead">El mismo cliente escrito de distintas formas divide sus ventas en los reportes. Elegir un nombre (idealmente la razón social de la factura) y usarlo siempre.</div><table><thead><tr><th>Variantes encontradas</th></tr></thead><tbody>'+
      A.nombres.map(function(g){return '<tr><td>'+g.map(esc).join(' &nbsp;·&nbsp; ')+'</td></tr>';}).join('')+'</tbody></table>';
  }
  if(A.gastosPersonales.length){
    b+='<h2>Gastos fijos de categoría «Personal»</h2><table><thead><tr><th>Concepto</th><th>Categoría</th><th class="r">Mensual</th><th>Observación</th></tr></thead><tbody>'+
      A.gastosPersonales.map(function(g){ return '<tr><td>'+esc(g.concepto)+'</td><td>'+esc(g.categoria)+'</td><td class="r">'+gs(g.monto_mensual)+'</td><td>'+(/canva|software|hosting|dominio|office|adobe/i.test(g.concepto)?'Si se usa para el negocio, pasarlo a una categoría operativa (p. ej. «Software»).':'Gasto personal: no es del negocio. Los reportes lo muestran como retiro del propietario.')+'</td></tr>'; }).join('')+'</tbody></table>';
  }
  b+='<div class="note"><b>Controles aplicados:</b> comprobantes repetidos, fuera de secuencia o con formato no estándar; coherencia del IVA con el comprobante; tipo (producto/servicio) frente al concepto; posibles duplicados (mismo cliente o proveedor, monto y concepto dentro de 20 días); compras cargadas con datos de la venta; bienes de uso; estado y monto de presupuestos; calidad de datos y nombres de clientes.</div>';
  return documento('Auditoría de Libros', P0.label, b);
}

/* ═══════════════ interfaz ═══════════════ */
window.rptEditar=function(tipo,id){
  try{
    var src=tipo==='Venta'?V():tipo==='Compra'?Cc():P(), r=src.find(function(x){return String(x.id)===String(id);});
    if(!r){ if(typeof toast==='function') toast('Registro no encontrado (¿ya se eliminó?)','e'); return; }
    if(tipo==='Venta'&&typeof edV==='function') edV(r.id);
    else if(tipo==='Compra'&&typeof edC==='function') edC(r.id);
    else if(tipo==='Presupuesto'&&typeof edP==='function') edP(r.id);
    window.focus();
  }catch(e){ console.error(e); }
};
function opts(sel){
  var ms=mesesConDatos().slice().reverse(), cm=curMesR();
  return ms.map(function(m){return '<option value="'+m+'"'+(m===(sel||cm)?' selected':'')+'>'+mesLbl(m)+'</option>';}).join('');
}
window.rptPopSel=function(){
  ['rp2ResMes','rp2MarMes','rp2BalMes','rp2LibMes','rp2AudMes'].forEach(function(id){ var s=document.getElementById(id); if(!s) return; var v=s.value; s.innerHTML=opts(v||null); });
  var ci=document.getElementById('rp2CajaIni'), bm=document.getElementById('rp2BalMes');
  if(ci&&bm&&bm.value){ var c=cajaInicial(bm.value.slice(0,4)); ci.value=c?c.toLocaleString('es-PY'):''; }
  rptPerChange();
  try{ var A=auditar(null), na=A.h.filter(function(x){return x.sev==='alta';}).length, el=document.getElementById('rp2AudBadge');
    if(el){ el.textContent=na?na+' hallazgos de prioridad alta':'Sin hallazgos de prioridad alta'; el.style.background=na?'rgba(220,38,38,.15)':'rgba(22,163,74,.15)'; el.style.color=na?'#f87171':'#4ade80'; } }catch(e){ console.error(e); }
};
window.rptPerChange=function(){
  [['rp2ResPer','rp2ResMesW'],['rp2MarPer','rp2MarMesW'],['rp2LibPer','rp2LibMesW'],['rp2AudPer','rp2AudMesW']].forEach(function(p){ var s=document.getElementById(p[0]), w=document.getElementById(p[1]); if(s&&w) w.style.display=s.value==='todo'?'none':''; });
};
window.rptCajaIni=function(el){
  var bm=document.getElementById('rp2BalMes'); if(!bm||!bm.value) return;
  var v=parseInt(String(el.value).replace(/\D/g,''),10)||0;
  try{ localStorage.setItem('bi_caja_ini_'+bm.value.slice(0,4), String(v)); }catch(e){}
  el.value=v?v.toLocaleString('es-PY'):'';
};
function val(id,d){ var e=document.getElementById(id); return e?e.value:d; }
window.rptGenerar=function(tipo){
  if(!V().length && !Cc().length){ if(typeof toast==='function') toast('No hay datos cargados todavía','e'); return; }
  var html='', titulo='';
  try{
    if(tipo==='resultados'){ html=repResultados(val('rp2ResPer','mes'), val('rp2ResMes'), (document.getElementById('rp2ResDet')||{checked:true}).checked); titulo='Estado de Resultados y Flujo de Caja'; }
    else if(tipo==='margenes'){ html=repMargenes(val('rp2MarPer','anual'), val('rp2MarMes')); titulo='Análisis de Márgenes'; }
    else if(tipo==='balance'){ html=repBalance(val('rp2BalMes')); titulo='Balance General'; }
    else if(tipo==='libros'){ html=repLibros(val('rp2LibPer','mes'), val('rp2LibMes'), val('rp2LibInc','comp')==='comp'); titulo='Libros IVA'; }
    else if(tipo==='auditoria'){ html=repAuditoria(val('rp2AudPer','todo'), val('rp2AudMes'), val('rp2AudNivel','todos')); titulo='Auditoría de Libros'; }
  }catch(e){ console.error(e); if(typeof toast==='function') toast('Error al generar el reporte: '+e.message,'e'); return; }
  window._rptHtml=html;
  var t=html.match(/<title>([^<]*)<\/title>/); titulo=t?t[1].replace(/&amp;/g,'&'):titulo;
  var pt=document.getElementById('rpPreviewTitle'); if(pt) pt.textContent=titulo;
  var body=document.getElementById('rpPreviewBody');
  body.innerHTML='<iframe id="rp2Frame" title="Vista previa del reporte" style="width:100%;height:78vh;border:0;background:#e9edf2;border-radius:0 0 12px 12px;display:block"></iframe>';
  document.getElementById('rp2Frame').srcdoc=html;
  var pn=document.getElementById('rpPreviewPanel'); pn.style.display='block'; pn.scrollIntoView({behavior:'smooth'});
};
window.rptImprimir=function(){
  if(window._rptHtml && typeof abrirEImprimirHtml==='function'){ abrirEImprimirHtml(window._rptHtml); return; }
  if(typeof imprimirReporteNuevoTab==='function') imprimirReporteNuevoTab();
};
window.rptCerrar=function(){ var pn=document.getElementById('rpPreviewPanel'); if(pn) pn.style.display='none'; var b=document.getElementById('rpPreviewBody'); if(b) b.innerHTML=''; window._rptHtml=null; };

/* exportar para pruebas */
window.BIGSYS_RPT={auditar:auditar, resultado:resultado, ivaMensual:ivaMensual, resolverPeriodo:resolverPeriodo, presKey:presKey, factKey:factKey, normName:normName,
  repResultados:repResultados, repMargenes:repMargenes, repBalance:repBalance, repLibros:repLibros, repAuditoria:repAuditoria};
})();
