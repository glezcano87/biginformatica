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
    var antes=serie.filter(function(b){return b.s===a.s && b.n<a.n;}), maxB=antes.reduce(function(m,b){return (!m||b.f>m.f)?b:m;},null);
    if(maxB && a.f<maxB.f && dias(a.f,maxB.f)>15) add('media','Factura fuera de secuencia','Venta',a.r,'N.º '+a.n+' con fecha anterior al N.º '+maxB.n+' ('+fch(maxB.f)+')');
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
      var hp=RX_PROD.test(dd), hs=RX_SERV.test(t==='Compra'?dd.replace(/\bcambio\b/ig,''):dd), fuerte=RX_PROD_FUERTE.test(dd);
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
      '<table class="aud"><thead><tr><th style="width:62px">Fecha</th><th style="width:56px">Registro</th><th>Cliente / proveedor</th><th>Concepto</th><th>Comprob. / presup.</th><th class="r">Monto</th>'+(conDet?'<th>Detalle</th>':'')+'<th class="no-print"></th></tr></thead><tbody>'+
      r.items.map(function(x){
        var ed=x.id?'<button class="edit" onclick="var w=window.parent!==window?window.parent:window.opener;if(w&&w.rptEditar)w.rptEditar(\''+x.tipo+'\',\''+String(x.id).replace(/[^\w-]/g,'')+'\')">Editar</button>':'';
        var ref=[x.comp,presKey(x.pres)?'P '+presKey(x.pres):''].filter(Boolean).join(' · ');
        return '<tr><td class="num">'+fch(x.fecha)+'</td><td>'+x.tipo+'</td><td>'+esc(corto(x.parte,24)||'—')+'</td><td>'+esc(corto(x.concepto,46)||'—')+'</td><td class="num">'+esc(corto(ref,26)||'—')+'</td><td class="r">'+gs(x.monto)+'</td>'+(conDet?'<td>'+esc(x.det)+'</td>':'')+'<td class="no-print">'+ed+'</td></tr>';
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

