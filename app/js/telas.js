/* telas.js: navegação, gráficos e as telas Painel, Território e Rede. */
'use strict';
(() => {

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const { fN, fP, fR, fD, fDA, fDH, DIA, esc } = CIC;
CIC.$ = $; CIC.$$ = $$;
const T = (CIC.T = {});

/* ---------- rotas ---------- */
CIC.rota = () => {
  const h = location.hash.replace(/^#\/?/, '') || 'painel';
  const [nome, q] = h.split('?');
  return { nome: nome.split('/')[0], sub: nome.split('/')[1] || '', p: Object.fromEntries(new URLSearchParams(q || '')) };
};
CIC.ir = (h) => { location.hash = '#/' + h; };
/* Menu em 4 grupos, com nomes do dia a dia. "Pessoas" junta 3 telas em abas: lista, quem trouxe quem e lideranças. */
CIC.MENU = [
  ['partido', 'Campanhas do partido', 'Partido'], ['acessos', 'Acessos das campanhas', 'Partido'],
  ['painel', 'Início', 'Dia a dia'], ['alertas', 'Avisos', 'Dia a dia'], ['pessoas', 'Pessoas', 'Dia a dia'],
  ['territorio', 'Mapa e regiões', 'Planejar'], ['cenarios', 'Simular votos', 'Planejar'],
  ['acordos', 'Gastos e pagamentos', 'Administrar'], ['relatorios', 'Baixar planilhas', 'Administrar'], ['auditoria', 'Histórico de ações', 'Administrar'],
  ['equipe', 'Equipe e acessos', 'Administrar'], ['config', 'Ajustes da campanha', 'Administrar'],
];
CIC.PESSOAS = [['contatos', 'Lista de pessoas'], ['rede', 'Quem trouxe quem'], ['liderancas', 'Melhores lideranças']];
CIC.rotaPessoas = () => CIC.PESSOAS.map((x) => x[0]).find((k) => CIC.pode(k));
CIC.abasPessoas = (atual) => {
  const L = CIC.PESSOAS.filter(([k]) => CIC.pode(k));
  if (L.length < 2) return '';
  return `<nav class="abas" aria-label="Pessoas">${L.map(([k, v]) => `<a href="#/${k}" ${k === atual ? 'aria-selected="true"' : ''}>${v}</a>`).join('')}</nav>`;
};

CIC.render = () => {
  const r = CIC.rota();
  const main = $('#principal');
  const s = CIC.s;
  if (!s.usuario && !['entrar', 'cadastro'].includes(r.nome)) { CIC.ir('entrar'); return; }
  document.body.classList.toggle('modo-cadastro', r.nome === 'cadastro' || r.nome === 'entrar');
  document.body.classList.toggle('modo-entrar', r.nome === 'entrar');
  CIC.dica.esconder();
  if (!['cadastro', 'entrar'].includes(r.nome)) CIC.montarTopo();
  const emPessoas = CIC.PESSOAS.some(([k]) => k === r.nome);
  $$('#menu a').forEach((a) => {
    const nome = a.dataset.rota;
    if (nome === 'pessoas') {
      const alvo = CIC.rotaPessoas();
      a.hidden = !alvo; if (alvo) a.href = '#/' + alvo;
      a.querySelector('span').textContent = CIC.PERFIS[s.perfil]?.soPropriaRede ? 'Minha rede' : 'Pessoas';
      a.toggleAttribute('aria-current', emPessoas);
    } else {
      a.toggleAttribute('aria-current', nome === r.nome);
      a.hidden = !CIC.pode(nome);
    }
  });
  $$('#menu .menu-grupo').forEach((g) => { g.hidden = !g.querySelector('a:not([hidden])'); });
  if (!T[r.nome]) { CIC.ir(s.perfil === 'partido' ? 'partido' : 'painel'); return; }
  if (!CIC.pode(r.nome)) {
    main.innerHTML = `<section class="bloqueio"><p class="rotulo">Sem acesso</p><h1>O seu perfil não abre esta tela.</h1><p>Perfil ${esc(CIC.PERFIS[s.perfil].nome)}: ${esc(CIC.PERFIS[s.perfil].desc)} Se precisar desta tela, peça ao administrador da campanha.</p><a class="bt" href="#/${s.perfil === 'partido' ? 'partido' : 'painel'}">Voltar ao início</a></section>`;
    return;
  }
  main.innerHTML = '';
  main.scrollTop = 0; scrollTo(0, 0);
  T[r.nome](main, r);
  if (emPessoas) { const cab = main.querySelector('.cab'); const abas = CIC.abasPessoas(r.nome); if (cab && abas) cab.insertAdjacentHTML('afterend', abas); }
  const alvo = main.querySelector('h1'); if (alvo) alvo.setAttribute('tabindex', '-1');
  requestAnimationFrame(() => CIC.ajustar(main));
};

/* ---------- topo: usuário, campanha, região, tema ---------- */
CIC.opcoesEscopo = (sel) => {
  const s = CIC.s; const out = [`<option value="">${esc(CIC.base.estados.find((e) => e.sigla === s.uf).nome)} (estado inteiro)</option>`];
  const desc = (pai, nv) => s.grupos.filter((g) => (g.pai || null) === pai && g.nivel === nv).sort((a, b) => a.nome.localeCompare(b.nome)).forEach((g) => {
    out.push(`<option value="${g.id}" ${sel === g.id ? 'selected' : ''}>${' '.repeat(nv)}${esc(g.nome)} · ${esc(s.niveis[g.nivel])}</option>`);
    if (nv + 1 < s.niveis.length) desc(g.id, nv + 1);
  });
  desc(null, 0);
  s.grupos.filter((g) => g.nivel > 0 && (!g.pai || !CIC.grupo(g.pai))).forEach((g) => out.push(`<option value="${g.id}" ${sel === g.id ? 'selected' : ''}>${esc(g.nome)} · ${esc(s.niveis[g.nivel])} (sem pai)</option>`));
  return out.join('');
};
CIC.montarTopo = () => {
  const s = CIC.s; const p = CIC.PERFIS[s.perfil];
  const esc0 = $('#escopo');
  esc0.innerHTML = CIC.opcoesEscopo(s.escopo);
  esc0.disabled = !!p.travaEscopo;
  $('#campo-escopo').hidden = !!p.soPropriaRede || s.perfil === 'partido';
  const c = CIC.campAtual();
  $('#campo-camp').hidden = s.perfil !== 'partido';
  $('#campanha').innerHTML = Object.keys(CIC.CAMPANHAS_BASE).map((k) => { const x = s.store[k] || CIC.CAMPANHAS_BASE[k]; return `<option value="${k}" ${k === s.camp ? 'selected' : ''}>${esc(x.nome)} · ${esc(CIC.CARGOS[x.cargo].nome)}</option>`; }).join('');
  $('#uf-topo').innerHTML = c.ufs.map((u) => `<option value="${u}" ${u === s.uf ? 'selected' : ''}>${esc(CIC.nomeUF(u))}</option>`).join('');
  $('#campo-uf').hidden = c.ufs.length < 2;
  $('#usuario-nome').textContent = CIC.usuarioAtual();
  $('#usuario-perfil').textContent = p.nome;
  const n = CIC.pode('alertas') ? CIC.alertas().filter((a) => a.sev === 'critico' || a.sev === 'grave').length : 0;
  const b = $('#menu a[data-rota="alertas"] .contador'); if (b) { b.textContent = n || ''; b.hidden = !n; }
  const sino = $('#sino'); sino.hidden = !CIC.pode('alertas'); sino.querySelector('b').textContent = n || ''; sino.querySelector('b').hidden = !n;
  sino.setAttribute('aria-label', n ? `Avisos: ${n} urgentes` : 'Avisos');
  $('#cargo-topo').textContent = s.perfil === 'partido' ? CIC.PARTIDO : `${c.nome} · ${CIC.CARGOS[s.cargo].nome} · 2026`;
};
CIC.ligarTopo = () => {
  $('#escopo').addEventListener('change', (e) => { CIC.s.escopo = e.target.value || null; CIC.gravar(); CIC.render(); });
  $('#campanha').addEventListener('change', (e) => { CIC.ativar(e.target.value); CIC.audit('Partido abriu os números da campanha', CIC.campAtual().nome); T._terr = null; CIC.ir('painel'); CIC.render(); });
  $('#uf-topo').addEventListener('change', (e) => { CIC.ativar(CIC.s.camp, e.target.value); CIC.audit('Trocou o estado em uso', CIC.nomeUF(e.target.value)); CIC.render(); });
  $('#sair').addEventListener('click', () => CIC.sair());
  const temas = ['auto', 'light', 'dark']; const nomes = { auto: 'Tema do sistema', light: 'Tema claro', dark: 'Tema escuro' };
  let t = 'auto'; try { t = localStorage.getItem('cic.tema') || 'auto'; } catch {}
  const aplicar = () => { if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; $('#tema').setAttribute('aria-label', nomes[t]); $('#tema').title = nomes[t]; };
  aplicar();
  $('#tema').addEventListener('click', () => { t = temas[(temas.indexOf(t) + 1) % 3]; try { localStorage.setItem('cic.tema', t); } catch {} aplicar(); CIC.render(); });
  const grupos = [...new Set(CIC.MENU.map((m) => m[2]))];
  $('#menu').innerHTML = grupos.map((g) => `<div class="menu-grupo"><p class="menu-titulo">${esc(g)}</p>${CIC.MENU.filter((m) => m[2] === g).map(([k, v]) => `<a href="#/${k}" data-rota="${k}"><span>${v}</span>${k === 'alertas' ? '<b class="contador" hidden></b>' : ''}</a>`).join('')}</div>`).join('');
  $('#abrir-menu').addEventListener('click', () => document.body.classList.toggle('menu-aberto'));
  $('#menu').addEventListener('click', () => document.body.classList.remove('menu-aberto'));
};

/* ---------- utilidades de tela ---------- */
CIC.aviso = (texto, acoes = []) => {
  let el = $('#avisos'); const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status');
  d.innerHTML = `<p>${texto}</p>${acoes.length ? `<div class="acoes">${acoes.map((a, i) => `<button class="bt ${i ? 'sec' : ''}" data-i="${i}">${esc(a[0])}</button>`).join('')}</div>` : ''}`;
  el.appendChild(d);
  const fechar = () => { d.classList.add('sai'); setTimeout(() => d.remove(), 220); };
  d.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; acoes[+b.dataset.i][1](); fechar(); });
  setTimeout(fechar, acoes.length ? 12000 : 4200);
};
CIC.gaveta = (html, aoMontar) => {
  const g = $('#gaveta');
  g.innerHTML = `<div class="gaveta-fundo" data-fechar></div><aside class="gaveta-corpo" role="dialog" aria-modal="true"><button class="fechar" data-fechar aria-label="Fechar">×</button>${html}</aside>`;
  g.hidden = false; requestAnimationFrame(() => g.classList.add('aberta'));
  const fechar = () => { g.classList.remove('aberta'); setTimeout(() => { g.hidden = true; g.innerHTML = ''; }, 200); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', tecla);
  g.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fechar));
  const corpo = g.querySelector('.gaveta-corpo'); corpo.querySelector('button, input, select, a')?.focus();
  if (aoMontar) aoMontar(corpo, fechar);
  return fechar;
};
CIC.dialogo = (html, aoMontar) => {
  let m = $('#modal'); if (!m) { m = document.createElement('div'); m.id = 'modal'; document.body.appendChild(m); }
  const antes = document.activeElement;
  m.innerHTML = `<div class="modal-fundo" data-fechar></div><div class="modal-corpo" role="dialog" aria-modal="true"><button class="fechar" data-fechar aria-label="Fechar">×</button>${html}</div>`;
  m.hidden = false; requestAnimationFrame(() => m.classList.add('aberto'));
  const fechar = () => { m.classList.remove('aberto'); document.removeEventListener('keydown', tecla, true); setTimeout(() => { m.hidden = true; m.innerHTML = ''; antes?.focus?.(); }, 160); };
  const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
  document.addEventListener('keydown', tecla, true);
  m.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fechar));
  const corpo = m.querySelector('.modal-corpo');
  if (aoMontar) aoMontar(corpo, fechar);
  (corpo.querySelector('input[type="radio"]:checked') || corpo.querySelector('#dl-ok') || corpo.querySelector('button'))?.focus();
  return fechar;
};
CIC.cabecalho = (rotulo, titulo, texto, extra = '') => `<header class="cab"><div><p class="rotulo">${esc(rotulo)}</p><h1>${titulo}</h1>${texto ? `<p class="lead">${texto}</p>` : ''}</div>${extra}</header>`;
CIC.mun = (cod) => CIC.demo.mun.get(cod);
CIC.nomeMun = (cod) => CIC.mun(cod)?.nome || CIC.munBR?.().porCod.get(cod)?.nome || 'Município';
CIC.linkPessoal = (p) => `${location.origin}${location.pathname}#/cadastro?ref=${p.cod}`;
CIC.linkMarca = (p) => `multipliqueai.com.br/${String(p.cod).toLowerCase()}`;
CIC.SIMBOLO = '<svg class="marca-simbolo" viewBox="0 0 64 64" aria-hidden="true"><path d="M15 53 L40 28" stroke="#14b8a6" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="50" cy="16" r="7.5" fill="#14b8a6"/><path d="M49 53 L24 28" stroke="#ff7a59" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="14" cy="16" r="7.5" fill="#ff7a59"/></svg>';
CIC.textoConvite = (link) => `Uma boa ideia precisa de gente. Entre na rede pelo meu link e multiplique aí: ${link}`;
CIC.multiplicacao = () => '<div class="multiplicacao" aria-hidden="true">' + [[1, 20], [2, 14], [4, 10], [8, 6]].map(([n, d], k) => '<div class="col">' + Array.from({ length: n }, (_, j) => `<i style="--d:${d}px;--t:${k * 380 + j * 40}ms;--c:${k ? 'var(--vivo)' : 'var(--coral)'}"></i>`).join('') + '</div>').join('') + '</div>';
CIC.qr = (texto, cel = 4) => { try { const q = qrcode(0, 'M'); q.addData(texto); q.make(); return q.createSvgTag({ cellSize: cel, margin: 2, scalable: true }); } catch { return ''; } };
const SEV = { critico: ['Crítico', '!'], grave: ['Grave', '!'], alerta: ['Atenção', '›'], info: ['Informação', 'i'] };
CIC.selo = (sev) => `<span class="sev sev-${sev}"><i aria-hidden="true">${SEV[sev][1]}</i>${SEV[sev][0]}</span>`;

/* ---------- gráficos (SVG à mão) ---------- */
const G = (CIC.G = {});
G.linha = (el, pts, op = {}) => {
  const W = el.clientWidth || 600, H = op.altura || 220, m = { t: 14, r: 16, b: 26, l: 50 };
  const x = d3.scaleTime().domain(d3.extent(pts, (d) => d.t)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, d3.max(pts, (d) => d.v) * 1.08 || 1]).nice(4).range([H - m.b, m.t]);
  const linha = d3.line().x((d) => x(d.t)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
  const area = d3.area().x((d) => x(d.t)).y0(y(0)).y1((d) => y(d.v)).curve(d3.curveMonotoneX);
  const yt = y.ticks(4), xt = x.ticks(Math.max(3, Math.floor(W / 120)));
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(op.rotulo || 'Gráfico de linha')}">
    ${yt.map((v) => `<line class="grade" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${m.l - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${fN.format(v)}</text>`).join('')}
    ${xt.map((t) => `<text class="eixo" x="${x(t)}" y="${H - 6}" text-anchor="middle">${fD.format(t)}</text>`).join('')}
    <path class="area-s1" d="${area(pts)}"/><path class="linha-s1" d="${linha(pts)}"/>
    <g class="cruz" style="opacity:0"><line y1="${m.t}" y2="${H - m.b}"/><circle r="4.5"/></g>
    <rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/></svg>`;
  const svg = el.querySelector('svg'), cruz = svg.querySelector('.cruz'), alvo = svg.querySelector('rect');
  const bis = d3.bisector((d) => d.t).center;
  alvo.addEventListener('pointermove', (ev) => {
    const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * (W / r.width);
    const i = bis(pts, x.invert(px)); const d = pts[i]; if (!d) return;
    cruz.style.opacity = 1; cruz.querySelector('line').setAttribute('x1', x(d.t)); cruz.querySelector('line').setAttribute('x2', x(d.t));
    cruz.querySelector('circle').setAttribute('cx', x(d.t)); cruz.querySelector('circle').setAttribute('cy', y(d.v));
    CIC.dica.mostrar(op.dica ? op.dica(d, i) : `<b>${fDA.format(d.t)}</b><br>${fN.format(d.v)}`, ev);
  });
  alvo.addEventListener('pointerleave', () => { cruz.style.opacity = 0; CIC.dica.esconder(); });
};
G.barrasH = (el, itens, op = {}) => {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const total = op.total ?? itens.reduce((a, i) => a + i.valor, 0);
  el.innerHTML = `<ul class="barras" role="list">${itens.map((i, k) => `<li data-k="${k}"><span class="b-rot">${esc(i.rotulo)}</span><span class="b-trilha"><span class="b-barra" style="width:${(i.valor / max) * 100}%"></span></span><span class="b-val">${op.fmt ? op.fmt(i.valor) : fN.format(i.valor)}</span></li>`).join('')}</ul>`;
  el.querySelectorAll('li').forEach((li) => {
    const i = itens[+li.dataset.k];
    li.addEventListener('pointermove', (ev) => CIC.dica.mostrar(`<b>${esc(i.rotulo)}</b><br>${op.fmt ? op.fmt(i.valor) : fN.format(i.valor)}${total ? ` · ${fP.format((i.valor / total) * 100)}% ${esc(op.base || 'do total')}` : ''}`, ev));
    li.addEventListener('pointerleave', () => CIC.dica.esconder());
  });
};
G.colunas = (el, itens, op = {}) => {
  const W = el.clientWidth || 360, H = op.altura || 180, m = { t: 18, r: 6, b: 24, l: 6 };
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const bw = (W - m.l - m.r) / itens.length;
  const total = itens.reduce((a, i) => a + i.valor, 0);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(op.rotulo || 'Gráfico de colunas')}">
    <line class="base" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/>
    ${itens.map((i, k) => { const h = ((H - m.t - m.b) * i.valor) / max; const x0 = m.l + k * bw + 2; const w = Math.max(2, bw - 4);
      return `<g data-k="${k}"><rect class="alvo" x="${m.l + k * bw}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="transparent"/><path class="col-s1" d="M${x0},${H - m.b} v${-Math.max(0, h - 3)} q0,-3 3,-3 h${w - 6} q3,0 3,3 v${Math.max(0, h - 3)} z"/>
      <text class="eixo" x="${x0 + w / 2}" y="${H - 7}" text-anchor="middle">${esc(i.rotulo)}</text>${h > 0 && (op.rotular || itens.length <= 8) ? `<text class="val" x="${x0 + w / 2}" y="${H - m.b - h - 5}" text-anchor="middle">${fN.format(i.valor)}</text>` : ''}</g>`; }).join('')}</svg>`;
  el.querySelectorAll('g[data-k]').forEach((g) => { const i = itens[+g.dataset.k];
    g.addEventListener('pointermove', (ev) => CIC.dica.mostrar(`<b>${esc(op.prefixo || '')}${esc(i.rotulo)}</b><br>${fN.format(i.valor)} · ${fP.format(total ? (i.valor / total) * 100 : 0)}% ${esc(op.base || 'do total')}`, ev));
    g.addEventListener('pointerleave', () => CIC.dica.esconder()); });
};

/* ---------- métricas ---------- */
CIC.metricas = (v) => {
  const ag = Date.now();
  const lid = CIC.lideres.filter((p) => v.includes(p));
  const ativos = lid.filter((p) => p.n14 > 0).length;
  const ms = CIC.munisEscopo(); const listaMun = CIC.demo.lista.filter((m) => !ms || ms.has(m.cod));
  const comRede = new Set(v.map((p) => p.mun));
  const comOutra = v.filter((p) => p.redes.some((r) => r.rede !== 'whatsapp')).length;
  return {
    total: v.length, d1: v.filter((p) => ag - p.entrada < DIA).length, d7: v.filter((p) => ag - p.entrada < 7 * DIA).length,
    lid: lid.length, ativos, munTotal: listaMun.length, munRede: listaMun.filter((m) => comRede.has(m.cod)).length,
    pop: listaMun.reduce((a, m) => a + m.pop, 0), prof: Math.max(0, ...v.map((p) => p.gen)), g2: v.filter((p) => p.gen >= 2).length, comOutra,
    conf: v.filter((p) => p.status === 'confirmado').length,
  };
};
CIC.metaContatos = () => Math.ceil((CIC.demo.pessoas.length * 1.5) / 1000) * 1000;

/* ---------- PAINEL ---------- */
T.painel = (main) => {
  const s = CIC.s; const perfil = CIC.PERFIS[s.perfil];
  const v = CIC.noEscopo(); const m = CIC.metricas(v);
  const meta = perfil.soPropriaRede ? Math.max(50, Math.ceil((CIC.eu().rede * 1.4) / 10) * 10) : Math.round((CIC.metaContatos() * (m.pop / CIC.demo.lista.reduce((a, x) => a + x.pop, 0))) / 10) * 10;
  const pm = Math.min(100, (m.total / meta) * 100);
  const eu = CIC.eu();
  const ehPartido = s.perfil === 'partido';
  const primeiro = (perfil.soPropriaRede ? eu.nome : CIC.usuarioAtual()).split(' ')[0];
  const h = new Date().getHours(); const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const titulo = ehPartido ? esc(CIC.campAtual().nome) : `${saud}, ${esc(primeiro)}`;
  const onde = perfil.soPropriaRede ? 'da sua rede' : `de ${esc(CIC.nomeEscopo())}`;
  const falta = Math.max(0, meta - m.total);
  // o que fazer agora: os 3 avisos mais graves que o perfil consegue resolver
  const fazer = perfil.soPropriaRede
    ? [{ sev: 'info', regra: 'Convide mais gente', texto: `Mande o seu link para 5 pessoas hoje. Faltam ${fN.format(falta)} pessoas para a meta da sua rede.`, rota: null }]
    : ehPartido ? [] : CIC.alertas().filter((a) => CIC.pode(a.rota.split('?')[0])).slice(0, 3);
  main.innerHTML = `
  ${CIC.cabecalho(ehPartido ? 'Números da campanha' : 'Início', titulo, `Hoje ${m.d1 === 1 ? 'entrou' : 'entraram'} <b>${fN.format(m.d1)}</b> ${m.d1 === 1 ? 'pessoa' : 'pessoas'} ${onde}. Nos últimos 7 dias, <b>${fN.format(m.d7)}</b>.${falta ? ` ${falta === 1 ? 'Falta' : 'Faltam'} <b>${fN.format(falta)}</b> ${falta === 1 ? 'pessoa' : 'pessoas'} para a meta.` : ' A meta foi batida.'}`,
    `<div class="cab-acoes"><label class="chave"><input type="checkbox" id="sim" ${s.sim ? 'checked' : ''}><span>Simular entradas ao vivo</span></label></div>`)}
  ${ehPartido ? `<p class="faixa-partido">O partido vê só os números de <b>${esc(CIC.campAtual().nome)}</b>, sem mudar nada. <a href="#/partido">Voltar às campanhas do partido</a></p>` : ''}
  ${ehPartido ? '' : T.blocoMeuLink(eu)}
  ${ehPartido ? '' : `<section class="fazer"><h2>O que fazer agora</h2>${fazer.length ? `<ol>${fazer.map((a) => `<li>${CIC.selo(a.sev)}<div><b>${esc(a.regra)}</b><p>${esc(a.texto)}</p></div>${a.rota ? `<a class="bt peq" href="#/${a.rota}">Resolver</a>` : `<button class="bt peq" data-copiar="${esc(CIC.linkPessoal(eu))}">Copiar meu link</button>`}</li>`).join('')}</ol>` : '<p class="vazio">Nada urgente agora. Bom trabalho.</p>'}</section>`}
  <section class="grade-kpi">
    <article class="kpi heroi">
      <p class="rotulo">Pessoas na rede</p>
      <p class="numero" id="k-total">${fN.format(m.total)}</p>
      <p class="sub"><b id="k-d1">+${fN.format(m.d1)}</b> hoje · <b id="k-d7">+${fN.format(m.d7)}</b> em 7 dias</p>
      <div class="meta"><div class="meta-trilha"><span style="width:${pm}%"></span></div><p><span id="k-pm">${fP.format(pm)}%</span> da meta de ${fN.format(meta)} pessoas ${perfil.soPropriaRede ? 'da sua rede' : 'desta região'}</p></div>
    </article>
    <article class="kpi"><p class="rotulo">Lideranças trazendo gente</p><p class="numero">${fN.format(m.ativos)}<small> de ${fN.format(m.lid)}</small></p><p class="sub">Trouxeram 1 pessoa ou mais nos últimos 14 dias.</p></article>
    <article class="kpi"><p class="rotulo">Cidades com apoiadores</p><p class="numero">${fN.format(m.munRede)}<small> de ${fN.format(m.munTotal)}</small></p><p class="sub">${fP.format(m.munTotal ? (m.munRede / m.munTotal) * 100 : 0)}% das cidades desta região têm 1 pessoa ou mais.</p></article>
    <article class="kpi"><p class="rotulo">Vieram por indicação</p><p class="numero">${fP.format(m.total ? (m.g2 / m.total) * 100 : 0)}%</p><p class="sub">${fN.format(m.g2)} das ${fN.format(m.total)} pessoas entraram pelo link de quem já estava na rede.</p></article>
    <article class="kpi"><p class="rotulo">Com outra rede social</p><p class="numero">${fP.format(m.total ? (m.comOutra / m.total) * 100 : 0)}%</p><p class="sub">${fN.format(m.comOutra)} das ${fN.format(m.total)} pessoas têm rede social além do WhatsApp.</p></article>
  </section>
  <section class="grade-2">
    <article class="cartao"><header><h2>Crescimento da base</h2><p>Contatos acumulados por dia, nos últimos 120 dias.</p></header><div id="g-cresc"></div></article>
    <article class="cartao"><header><h2>Onde a base está</h2><p>Contatos por 1.000 habitantes (Censo 2022). Clique no mapa para abrir o território.</p></header><div class="mini-mapa" id="g-mapa"></div><div id="g-legenda" class="legenda"></div></article>
  </section>
  <section class="grade-3">
    <article class="cartao"><header><h2>Origem do cadastro</h2><p>Canal pelo qual o link chegou, em contatos.</p></header><div id="g-canal"></div></article>
    <article class="cartao"><header><h2>Nível na rede</h2><p>Contatos por distância até a candidatura: 1 é indicação direta.</p></header><div id="g-nivel"></div></article>
    <article class="cartao"><header><h2>Redes sociais cadastradas</h2><p>Contatos com conta registrada em cada rede.</p></header><div id="g-redes"></div></article>
  </section>
  <section class="grade-3l">
    <article class="cartao"><header><h2>Fontes iniciais que mais cresceram</h2><p>Quem mandou o 1º link de cada ramo da rede, por cadastros novos em 7 dias no ramo inteiros.</p></header><div id="t-cresc"></div></article>
    <article class="cartao"><header><h2>Quem entrou agora</h2><p>Últimas entradas, com quem chamou.</p></header><ol class="feed" id="feed"></ol></article>
    <article class="cartao"><header><h2>Alertas abertos</h2><p>Regras que dispararam neste recorte.</p></header><div id="t-alertas"></div></article>
  </section>`;
  // crescimento
  const ag = Date.now(); const ini = ag - 120 * DIA;
  const dias = []; const ord = v.map((p) => p.entrada).sort((a, b) => a - b); let k = 0;
  const antes = ord.filter((t) => t < ini).length; k = antes;
  for (let t = ini; t <= ag + 1; t += DIA) { let novos = 0; while (k < ord.length && ord[k] < t + DIA) { k++; novos++; } dias.push({ t: new Date(t), v: k, n: novos }); }
  G.linha($('#g-cresc'), dias, { rotulo: 'Contatos acumulados por dia', dica: (d) => `<b>${fDA.format(d.t)}</b><br>${fN.format(d.v)} contatos acumulados<br>+${fN.format(d.n)} no dia` });
  // canais
  const canais = d3.rollups(v, (x) => x.length, (p) => p.canal || 'Direto').map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
  G.barrasH($('#g-canal'), canais, { base: 'dos contatos do recorte' });
  const niveis = d3.rollups(v, (x) => x.length, (p) => Math.min(p.gen, 7)).sort((a, b) => a[0] - b[0]).map(([g, valor]) => ({ rotulo: g === 7 ? '7+' : String(g), valor }));
  G.colunas($('#g-nivel'), niveis, { rotulo: 'Contatos por nível na rede', prefixo: 'Nível ', base: 'dos contatos do recorte' });
  const redes = Object.entries(CIC.REDES).map(([k2, r]) => ({ rotulo: r.nome, valor: v.filter((p) => p.redes.some((x) => x.rede === k2)).length })).filter((x) => x.valor).sort((a, b) => b.valor - a.valor);
  G.barrasH($('#g-redes'), redes, { total: v.length, base: 'dos contatos do recorte' });
  // top crescimento por raiz
  const porRaiz = d3.rollups(v.filter((p) => ag - p.entrada < 7 * DIA && p.raiz != null), (x) => x.length, (p) => p.raiz).sort((a, b) => b[1] - a[1]).slice(0, 6);
  $('#t-cresc').innerHTML = porRaiz.length ? `<table class="tab"><thead><tr><th>Liderança</th><th class="n">+7 dias</th><th class="n">Rede</th><th class="n">IEL</th></tr></thead><tbody>${porRaiz.map(([id, n]) => { const p = CIC.idx.porId.get(id); return `<tr data-ir="rede?p=${p.id}"><td><b>${esc(CIC.nomeVisivel(p))}</b><small>${esc(CIC.nomeMun(p.mun))}</small></td><td class="n">+${fN.format(n)}</td><td class="n">${fN.format(p.rede)}</td><td class="n">${p.iel != null ? `<span class="classe c${p.ielClasse}">${p.iel}</span>` : '-'}</td></tr>`; }).join('')}</tbody></table>` : '<p class="vazio">Nenhum cadastro novo em 7 dias neste recorte.</p>';
  $('#t-cresc').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-ir]'); if (tr && CIC.pode('rede')) CIC.ir(tr.dataset.ir); });
  // feed
  const feed = v.slice().sort((a, b) => b.entrada - a.entrada).slice(0, 7);
  $('#feed').innerHTML = feed.map(T.itemFeed).join('');
  // alertas
  const al = CIC.alertas().slice(0, 4);
  $('#t-alertas').innerHTML = al.length ? `<ul class="lista-alertas">${al.map((a) => `<li>${CIC.selo(a.sev)}<div><b>${esc(a.regra)}</b><p>${esc(a.texto)}</p></div></li>`).join('')}</ul>${CIC.pode("alertas") ? `<a class="ligacao" href="#/alertas">Ver os ${fN.format(CIC.alertas().length)} avisos</a>` : ""}` : '<p class="vazio">Nenhum alerta aberto.</p>';
  // mapa
  T.miniMapa($('#g-mapa'), v, $('#g-legenda'));
  $('#sim').addEventListener('change', (e) => { s.sim = e.target.checked; CIC.gravar(); });
  const kt = $('#k-total'); if (kt && !matchMedia('(prefers-reduced-motion: reduce)').matches && !T._contou) { T._contou = true; const fim = m.total; let t0 = null; const passo = (t) => { t0 = t0 || t; const k = Math.min(1, (t - t0) / 700); kt.textContent = fN.format(Math.round(fim * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(passo); }; requestAnimationFrame(passo); }
};
T.itemFeed = (p) => {
  const pai = p.pai != null ? CIC.idx.porId.get(p.pai) : null;
  return `<li class="${p.sim ? 'novo' : ''}"><time>${fDH.format(p.entrada)}</time><p><b>${esc(CIC.nomeVisivel(p))}</b> entrou em ${esc(CIC.nomeMun(p.mun))}</p><small>${pai ? `pelo link de ${esc(CIC.nomeVisivel(pai))}` : ''}${p.canal ? ` · ${esc(p.canal)}` : ''} · nível ${p.gen}</small></li>`;
};
T.miniMapa = async (el, v, leg) => {
  const cont = new Map(); v.forEach((p) => cont.set(p.mun, (cont.get(p.mun) || 0) + 1));
  const taxa = (c) => { const m = CIC.mun(c); return m && m.pop ? ((cont.get(c) || 0) / m.pop) * 1000 : 0; };
  const ms = CIC.munisEscopo();
  const cl = CIC.classes(CIC.demo.lista.filter((m) => !ms || ms.has(m.cod)).map((m) => taxa(m.cod)));
  const mapa = new CIC.Mapa(el, { dica: (c) => `<b>${esc(CIC.nomeMun(c))}</b><br>${fN.format(cont.get(c) || 0)} contatos<br>${fP.format(taxa(c))} por 1.000 habitantes`, aoClicar: () => CIC.pode('territorio') && CIC.ir('territorio') });
  await mapa.desenhar(CIC.s.uf);
  mapa.pintar((c) => (ms && !ms.has(c) ? 'var(--fora)' : cl.cor(taxa(c))));
  if (ms) mapa.enquadrar([...ms]);
  if (leg) leg.innerHTML = T.legendaClasses(cl, (x) => fP.format(x));
};
T.legendaClasses = (cl, f) => {
  const r = CIC.escuro() ? CIC.RAMPA_ESCURO : CIC.RAMPA;
  return `<span>Sem contato</span><i style="background:var(--vazio)"></i>${r.map((c, i) => `<i style="background:${c}" title="${i === 0 ? 'até ' + f(cl.cortes[0] || 0) : i < cl.cortes.length ? f(cl.cortes[i - 1]) + ' a ' + f(cl.cortes[i]) : 'acima de ' + f(cl.cortes[cl.cortes.length - 1] || 0)}"></i>`).join('')}<span>Mais</span>`;
};
T.blocoPartido = (m) => {
  const r = CIC.rngDe(CIC.hashStr('partido' + CIC.s.uf));
  const contas = [['Candidatura Exemplo', 'Deputado Federal', m.total], ['Candidatura B', 'Deputado Federal', 0], ['Candidatura C', 'Deputado Estadual', 0], ['Candidatura D', 'Deputado Estadual', 0], ['Candidatura E', 'Senador', 0]]
    .map((c, i) => (i ? [c[0], c[1], Math.round(m.total * (0.2 + r() * 0.9))] : c));
  const tot = contas.reduce((a, c) => a + c[2], 0);
  return `<section class="cartao destaque"><header><h2>Campanhas do partido</h2><p>O partido contratante vê o total de cada conta de candidato. Dado pessoal só aparece quando o apoiador autorizou o partido.</p></header>
  <table class="tab"><thead><tr><th>Conta</th><th>Cargo</th><th class="n">Contatos</th><th class="n">Parte do total do partido</th></tr></thead><tbody>${contas.map((c) => `<tr><td><b>${esc(c[0])}</b></td><td>${esc(c[1])}</td><td class="n">${fN.format(c[2])}</td><td class="n">${fP.format((c[2] / tot) * 100)}%</td></tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="2">Total do partido</td><td class="n">${fN.format(tot)}</td><td class="n">100,0%</td></tr></tfoot></table></section>`;
};
T.blocoMeuLink = (eu) => { const link = CIC.linkPessoal(eu); return `<section class="cartao link-pessoal compacto"><div class="lp-txt"><h2>Seu link de convite</h2><p>Cada pessoa que se cadastra pelo seu link fica ligada a você e ganha o próprio link. Quem ela chamar também entra na sua rede.${eu.pai != null && CIC.idx.porId.get(eu.pai)?.papel !== 'candidato' ? ` Você veio da rede de <b>${esc(CIC.rotuloFonte(eu))}</b>.` : ''} Hoje: <b>${fN.format(eu.diretos)}</b> pessoas convidadas por você e <b>${fN.format(eu.rede)}</b> na sua rede inteira.</p></div>
  <div class="lp-acoes"><span class="link-marca" title="Endereço na versão real">${esc(CIC.linkMarca(eu))}</span><div class="pilha-h"><a class="bt peq" href="https://wa.me/?text=${encodeURIComponent(CIC.textoConvite(link))}" target="_blank" rel="noopener">Multiplique aí</a><button class="bt peq sec" data-copiar="${esc(link)}">Copiar link</button><button class="bt peq sec" data-qr="${esc(link)}">Mostrar QR</button>${CIC.pode('rede') ? `<a class="bt peq sec" href="#/rede?p=${eu.id}">Ver minha rede</a>` : ''}</div></div></section>`; };

/* entradas simuladas ao vivo */
CIC.simular = () => {
  if (!CIC.s.sim || CIC.rota().nome !== 'painel' || document.hidden) return;
  const r = Math.random;
  const cand = CIC.lideres.filter((p) => !CIC.munisEscopo() || CIC.munisEscopo().has(p.mun));
  if (!cand.length) return;
  const pai = cand[Math.floor(Math.pow(r(), 2) * cand.length)];
  const base = CIC.demo.pessoas[1 + Math.floor(r() * (CIC.demo.pessoas.length - 1))];
  const tel = '009' + String(Math.floor(r() * 1e8)).padStart(8, '0');
  const p = { id: 200000 + CIC.s.extras.length, cod: (Date.now() % 1e9).toString(36).toUpperCase().slice(-6), nome: base.nome.split(' ')[0] + ' ' + base.nome.split(' ').slice(-1)[0], tel, mun: pai.mun, pai: pai.id, entrada: Date.now(), papel: 'apoiador', canal: ['WhatsApp', 'Instagram', 'QR em evento', 'TikTok'][Math.floor(r() * 4)], status: 'pendente', redes: [{ rede: 'whatsapp', id: '+55' + tel, url: '', verif: false }], consContato: true, consPartido: r() < 0.5, acoes: 0, acoesOk: 0, sim: true };
  CIC.s.extras.push(p); if (CIC.s.extras.length > 400) CIC.s.extras.splice(0, CIC.s.extras.filter((x) => x.sim).length > 300 ? 1 : 0);
  CIC.indexar(); CIC.gravar();
  const v = CIC.noEscopo(); const m = CIC.metricas(v);
  const set = (id, t) => { const el = document.getElementById(id); if (el) { el.textContent = t; el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso'); } };
  set('k-total', fN.format(m.total)); set('k-d1', '+' + fN.format(m.d1)); set('k-d7', '+' + fN.format(m.d7));
  const feed = $('#feed'); if (feed && v.includes(p)) { feed.insertAdjacentHTML('afterbegin', T.itemFeed(p)); while (feed.children.length > 7) feed.lastElementChild.remove(); }
};

/* ---------- TERRITÓRIO ---------- */
const semAcento = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
T.territorio = async (main, r) => {
  const s = CIC.s;
  const st = (T._terr = T._terr && T._terr.chave === s.camp + s.uf ? T._terr : { chave: s.camp + s.uf, nivelVer: 0, modo: 'grupos', indicador: 'taxa', sel: null, editando: false, busca: '', filtro: 'todos' });
  if (r.p.g && CIC.grupo(r.p.g)) st.sel = r.p.g;
  if (st.sel && !CIC.grupo(st.sel)) st.sel = null;
  const podeEditar = CIC.editaConfig() && !CIC.PERFIS[s.perfil].travaEscopo;
  main.innerHTML = `
  ${CIC.cabecalho('Mapa e regiões · ' + CIC.nomeUF(s.uf), 'Regiões e cidades da campanha', `Divida o estado em até ${s.niveis.length} níveis, com os nomes que quiser. Cada nível fica dentro do anterior. Se uma cidade ficar fora da região de cima, a plataforma avisa. Nomes das cidades: IBGE.`,
    s.store[s.camp].ufs.length > 1 ? `<div class="cab-acoes"><span class="faixa">Estado em uso: troque no seletor "Estado", no alto.</span></div>` : '')}
  <div class="terr">
    <aside class="terr-lado">
      <div class="bloco">
        <h2>Níveis</h2>
        <ol class="niveis">${s.niveis.map((n, i) => `<li><span class="nv">${i + 1}</span><input value="${esc(n)}" data-nivel="${i}" aria-label="Nome do nível ${i + 1}" ${podeEditar ? '' : 'disabled'}></li>`).join('')}</ol>
        <p class="ajuda">Exemplos: Regional, Unidade, Posto. Ou GRE, UGI, UOP. Ou Região, Cidade, Bairro.</p>
      </div>
      <div class="bloco">
        <div class="bloco-cab"><h2>Grupos</h2>${podeEditar ? '<button class="bt peq" id="novo-grupo">Novo grupo…</button>' : ''}</div>
        <div class="arvore" id="arvore"></div>
      </div>
      <div class="bloco" id="avisos-terr"></div>
      ${podeEditar ? `<div class="bloco"><h2>Ponto de partida</h2><div class="pilha">
        <button class="bt sec" id="ibge">Usar as regiões do IBGE…</button><button class="bt sec" id="zerar">Começar do zero…</button>
        <button class="bt sec" id="exportar">Exportar divisão (JSON)</button><label class="bt sec arquivo">Importar divisão…<input type="file" id="importar" accept="application/json"></label></div>
        <p class="ajuda">As regiões do IBGE montam 2 níveis de uma vez: regiões intermediárias e imediatas.</p></div>` : ''}
    </aside>
    <section class="terr-mapa">
      <div class="barra-mapa">
        <div class="seletor-mun">
          <button class="bt" id="abrir-sel" aria-expanded="false" aria-controls="sel-pop">Escolher municípios</button>
          <div class="sel-pop" id="sel-pop" hidden role="dialog" aria-label="Escolher municípios">
            <p class="sel-contexto" id="sel-contexto"></p>
            <input type="search" id="sel-busca" placeholder="Buscar município de ${esc(CIC.nomeUF(s.uf))}" autocomplete="off">
            <div class="seg peq" role="tablist" id="sel-filtro"><button data-f="todos" role="tab">Todos</button><button data-f="marcados" role="tab">Marcados</button><button data-f="sem" role="tab">Sem grupo</button></div>
            <div class="sel-lista" id="sel-lista" role="group"></div>
            <p class="ajuda" id="sel-rodape"></p>
          </div>
        </div>
        <div class="seg" role="tablist"><button role="tab" data-modo="grupos" aria-selected="${st.modo === 'grupos'}">Grupos</button><button role="tab" data-modo="indicador" aria-selected="${st.modo === 'indicador'}">Indicadores</button></div>
        <select id="nivel-ver" ${st.modo === 'grupos' ? '' : 'hidden'} aria-label="Nível mostrado no mapa">${s.niveis.map((n, i) => `<option value="${i}" ${st.nivelVer === i ? 'selected' : ''}>Nível ${i + 1}: ${esc(n)}</option>`).join('')}</select>
        <select id="indicador" ${st.modo === 'indicador' ? '' : 'hidden'} aria-label="Indicador do mapa">
          <option value="taxa">Contatos por 1.000 habitantes</option><option value="contatos">Contatos</option><option value="lid">Lideranças</option><option value="pop">População (Censo 2022)</option><option value="novos">Cadastros em 7 dias</option></select>
        <button class="bt sec peq" id="enquadrar">Ver estado inteiro</button>
      </div>
      <div class="mapa" id="mapa"><p class="carregando">Carregando o mapa do IBGE…</p></div>
      <div class="rodape-mapa"><div id="leg-mapa" class="legenda"></div><p class="ajuda" id="ajuda-mapa"></p></div>
    </section>
    <aside class="terr-det" id="detalhe"></aside>
  </div>`;
  const v = CIC.todas().filter((p) => p.gen > 0);
  const cont = new Map(), lidM = new Map(), novos = new Map(); const ag = Date.now();
  v.forEach((p) => { cont.set(p.mun, (cont.get(p.mun) || 0) + 1); if (p.papel === 'lideranca') lidM.set(p.mun, (lidM.get(p.mun) || 0) + 1); if (ag - p.entrada < 7 * DIA) novos.set(p.mun, (novos.get(p.mun) || 0) + 1); });
  const ind = { taxa: (c) => { const m = CIC.mun(c); return m?.pop ? ((cont.get(c) || 0) / m.pop) * 1000 : 0; }, contatos: (c) => cont.get(c) || 0, lid: (c) => lidM.get(c) || 0, pop: (c) => CIC.mun(c)?.pop || 0, novos: (c) => novos.get(c) || 0 };
  const fmtInd = { taxa: (x) => fP.format(x), contatos: (x) => fN.format(Math.round(x)), lid: (x) => fN.format(Math.round(x)), pop: (x) => fN.format(Math.round(x)), novos: (x) => fN.format(Math.round(x)) };
  $('#indicador').value = st.indicador;
  const doNivel = (cod, nv) => s.grupos.filter((g) => g.nivel === nv && g.munis.includes(cod));
  const resumo = (munis) => {
    const set = new Set(munis); const pe = v.filter((p) => set.has(p.mun)); const lid = CIC.lideres.filter((p) => set.has(p.mun));
    const pop = munis.reduce((a, c) => a + (CIC.mun(c)?.pop || 0), 0);
    return { n: munis.length, pop, contatos: pe.length, taxa: pop ? (pe.length / pop) * 1000 : 0, lid: lid.length, iel: lid.length ? Math.round(d3.mean(lid, (p) => p.iel)) : null, cobre: munis.filter((c) => cont.get(c)).length, novos: pe.filter((p) => ag - p.entrada < 7 * DIA).length };
  };
  let mapa;

  /* ações sobre grupos: todas passam pela trilha de auditoria */
  const novoGrupo = (nivel, pai, nome) => {
    const g = { id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 99), nome, nivel, pai, cor: s.grupos.filter((x) => x.nivel === nivel).length % 8, munis: [] };
    s.grupos.push(g); CIC.audit('Criou grupo', `${s.niveis[nivel]}: ${nome}`, pai ? `dentro de ${CIC.grupo(pai)?.nome}` : ''); return g;
  };
  const listaNomes = (cods) => (cods.length <= 3 ? cods.map(CIC.nomeMun).join(', ') : `${cods.slice(0, 3).map(CIC.nomeMun).join(', ')} e mais ${fN.format(cods.length - 3)}`);
  const incluir = (cods, g) => {
    const novos2 = cods.filter((c) => !g.munis.includes(c)); if (!novos2.length) return;
    g.munis.push(...novos2);
    CIC.audit('Incluiu município no grupo', g.nome, listaNomes(novos2));
    const pai = g.pai && CIC.grupo(g.pai); const fora = pai ? novos2.filter((c) => !pai.munis.includes(c)) : [];
    CIC.gravar(); tudo();
    if (fora.length && !g.excecao) CIC.aviso(`${esc(listaNomes(fora))} não ${fora.length > 1 ? 'estão' : 'está'} em "${esc(pai.nome)}", o grupo-pai de "${esc(g.nome)}".`, [['Incluir também no grupo-pai', () => incluir(fora, pai)], ['Manter fora', () => CIC.audit('Manteve município fora do grupo-pai', g.nome, listaNomes(fora))]]);
    else CIC.aviso(`${esc(listaNomes(novos2))} ${novos2.length > 1 ? 'incluídos' : 'incluído'} em "${esc(g.nome)}".`, [['Desfazer', () => { g.munis = g.munis.filter((c) => !novos2.includes(c)); CIC.audit('Desfez inclusão', g.nome, listaNomes(novos2)); CIC.gravar(); tudo(); }]]);
  };
  const tirar = (cods, grupos, comSubs) => {
    const alvo = new Set(grupos);
    if (comSubs) { const desc = (g) => CIC.filhos(g.id).forEach((f) => { alvo.add(f); desc(f); }); grupos.forEach(desc); }
    alvo.forEach((g) => { const antes = g.munis.length; g.munis = g.munis.filter((c) => !cods.includes(c)); if (g.munis.length !== antes) CIC.audit('Tirou município do grupo', g.nome, listaNomes(cods)); });
    CIC.gravar(); tudo();
  };
  /* pergunta em qual grupo incluir, mostrando os que já existem */
  const perguntarInclusao = (cods) => {
    if (!podeEditar) { CIC.aviso('Este perfil não edita o território.'); return; }
    const atual = st.sel && CIC.grupo(st.sel);
    let nv = atual ? atual.nivel : st.nivelVer;
    const titulo = cods.length === 1 ? esc(CIC.nomeMun(cods[0])) : `${fN.format(cods.length)} municípios`;
    const hoje = cods.length === 1 ? s.grupos.filter((g) => g.munis.includes(cods[0])).sort((a, b) => a.nivel - b.nivel) : [];
    CIC.dialogo(`<p class="rotulo">Incluir município</p><h2>Em qual grupo incluir ${titulo}?</h2>
      ${hoje.length ? `<p class="ajuda">Hoje está em: ${hoje.map((g) => `${esc(s.niveis[g.nivel])} ${esc(g.nome)}`).join(' · ')}</p>` : cods.length === 1 ? '<p class="ajuda">Hoje não está em nenhum grupo.</p>' : ''}
      <label class="campo-inline mt">Nível <select id="dl-nivel">${s.niveis.map((n, i) => `<option value="${i}" ${i === nv ? 'selected' : ''}>${i + 1}. ${esc(n)}</option>`).join('')}</select></label>
      <div class="opcoes" id="dl-opcoes" role="radiogroup"></div>
      <div class="acoes-dl"><button class="bt" id="dl-ok">Incluir</button><button class="bt sec" data-fechar>Cancelar</button></div>`, (el, fechar) => {
      const desenhar = () => {
        const gs = s.grupos.filter((g) => g.nivel === nv).sort((a, b) => (b === atual) - (a === atual) || a.nome.localeCompare(b.nome));
        const pais = s.grupos.filter((g) => g.nivel === nv - 1).sort((a, b) => a.nome.localeCompare(b.nome));
        const paiSugerido = cods.length === 1 ? pais.find((p) => p.munis.includes(cods[0])) : null;
        el.querySelector('#dl-opcoes').innerHTML = `${gs.map((g, i) => { const ja = cods.every((c) => g.munis.includes(c));
          return `<label class="opcao ${ja ? 'ja' : ''}"><input type="radio" name="dl-g" value="${g.id}" ${ja ? 'disabled' : ''} ${!ja && (g === atual || (!atual && i === 0)) ? 'checked' : ''}><i class="cor" style="background:var(--cat-${(g.cor % 8) + 1})"></i><span><b>${esc(g.nome)}</b><small>${fN.format(g.munis.length)} municípios${g.pai ? ' · dentro de ' + esc(CIC.grupo(g.pai)?.nome || 'grupo excluído') : ''}${ja ? ' · já contém' : ''}${g === atual ? ' · grupo aberto' : ''}</small></span></label>`; }).join('')}
          <label class="opcao novo"><input type="radio" name="dl-g" value="__novo" ${gs.filter((g) => !cods.every((c) => g.munis.includes(c))).length ? '' : 'checked'}><span><b>Criar novo ${esc(s.niveis[nv].toLowerCase())}</b>
            <input id="dl-nome" placeholder="Nome do novo grupo" aria-label="Nome do novo grupo">
            ${nv > 0 ? `<select id="dl-pai" aria-label="Grupo-pai"><option value="">Sem grupo-pai</option>${pais.map((p) => `<option value="${p.id}" ${p === paiSugerido || (!paiSugerido && atual && p.id === atual.pai) ? 'selected' : ''}>Dentro de ${esc(p.nome)}</option>`).join('')}</select>` : ''}</span></label>`;
        el.querySelector('#dl-nome').addEventListener('focus', () => { el.querySelector('input[value="__novo"]').checked = true; });
      };
      desenhar();
      el.querySelector('#dl-nivel').addEventListener('change', (e) => { nv = +e.target.value; desenhar(); });
      el.querySelector('#dl-ok').addEventListener('click', () => {
        const esc0 = el.querySelector('input[name="dl-g"]:checked'); if (!esc0) { CIC.aviso('Escolha um grupo ou crie um novo.'); return; }
        let g;
        if (esc0.value === '__novo') { const nome = el.querySelector('#dl-nome').value.trim(); if (!nome) { el.querySelector('#dl-nome').focus(); CIC.aviso('Dê um nome ao novo grupo.'); return; } g = novoGrupo(nv, el.querySelector('#dl-pai')?.value || null, nome); }
        else g = CIC.grupo(esc0.value);
        fechar(); incluir(cods, g);
      });
    });
  };
  /* confirma antes de tirar */
  const confirmarRemocao = (cods, grupos) => {
    if (!podeEditar) { CIC.aviso('Este perfil não edita o território.'); return; }
    const titulo = cods.length === 1 ? esc(CIC.nomeMun(cods[0])) : `${fN.format(cods.length)} municípios`;
    const subs = []; const desc = (g) => CIC.filhos(g.id).forEach((f) => { if (cods.some((c) => f.munis.includes(c))) subs.push(f); desc(f); }); grupos.forEach(desc);
    CIC.dialogo(`<p class="rotulo">Confirmar</p><h2>Tirar ${titulo} de ${grupos.length === 1 ? `"${esc(grupos[0].nome)}"` : 'quais grupos'}?</h2>
      ${grupos.length > 1 ? `<div class="opcoes">${grupos.map((g) => `<label class="opcao"><input type="checkbox" value="${g.id}" checked><span><b>${esc(g.nome)}</b><small>${esc(s.niveis[g.nivel])}</small></span></label>`).join('')}</div>` : ''}
      ${subs.length ? `<label class="marca mt"><input type="checkbox" id="dl-subs" checked> Tirar também de ${subs.length} subgrupo(s): ${subs.map((g) => esc(g.nome)).join(', ')}</label>` : ''}
      <p class="ajuda">Os contatos do município não mudam. A ação fica no registro de atividades.</p>
      <div class="acoes-dl"><button class="bt perigo-cheio" id="dl-ok">Tirar</button><button class="bt sec" data-fechar>Cancelar</button></div>`, (el, fechar) => {
      el.querySelector('#dl-ok').addEventListener('click', () => {
        const gs = grupos.length > 1 ? [...el.querySelectorAll('.opcoes input:checked')].map((i) => CIC.grupo(i.value)) : grupos;
        fechar(); if (gs.length) tirar(cods, gs, !!el.querySelector('#dl-subs')?.checked);
      });
    });
  };
  const alternarPeloControle = (cod) => {
    const g = st.sel && CIC.grupo(st.sel);
    if (g) { if (g.munis.includes(cod)) confirmarRemocao([cod], [g]); else perguntarInclusao([cod]); return; }
    const gs = doNivel(cod, st.nivelVer);
    if (gs.length) confirmarRemocao([cod], gs); else perguntarInclusao([cod]);
  };

  /* seletor de municípios com busca */
  const seletor = () => {
    const g = st.sel && CIC.grupo(st.sel);
    const marcado = (c) => (g ? g.munis.includes(c) : doNivel(c, st.nivelVer).length > 0);
    const q = semAcento(st.busca.trim());
    let lista = CIC.demo.lista.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (q) lista = lista.filter((m) => semAcento(m.nome).includes(q));
    if (st.filtro === 'marcados') lista = lista.filter((m) => marcado(m.cod));
    if (st.filtro === 'sem') lista = lista.filter((m) => !s.grupos.some((x) => x.munis.includes(m.cod)));
    $('#sel-contexto').innerHTML = g ? `Grupo aberto: <b>${esc(g.nome)}</b> (${esc(s.niveis[g.nivel])}, ${fN.format(g.munis.length)} municípios). Marcado = está neste grupo.` : `Nenhum grupo aberto. Marcado = está em algum grupo do nível <b>${esc(s.niveis[st.nivelVer])}</b>. Ao marcar, a plataforma pergunta em qual grupo incluir.`;
    $$('#sel-filtro button').forEach((b) => b.setAttribute('aria-selected', b.dataset.f === st.filtro));
    $('#sel-lista').innerHTML = lista.length ? lista.map((m) => { const gs = doNivel(m.cod, g ? g.nivel : st.nivelVer);
      return `<label class="sel-item"><input type="checkbox" data-cod="${m.cod}" ${marcado(m.cod) ? 'checked' : ''} ${podeEditar ? '' : 'disabled'}><span>${esc(m.nome)}</span><small>${gs.map((x) => esc(x.nome)).join(', ')}</small></label>`; }).join('') : '<p class="vazio">Nenhum município com este filtro.</p>';
    $('#sel-rodape').textContent = `${fN.format(lista.length)} de ${fN.format(CIC.demo.lista.length)} municípios de ${CIC.nomeUF(s.uf)} (lista oficial do IBGE).`;
  };
  const abrirSel = (abrir) => { const pop = $('#sel-pop'); pop.hidden = !abrir; $('#abrir-sel').setAttribute('aria-expanded', abrir); if (abrir) { seletor(); $('#sel-busca').focus(); } };

  const pintar = () => {
    if (!mapa) return;
    const g = st.sel && CIC.grupo(st.sel); const selSet = g ? new Set(g.munis) : null;
    const pai = g && g.pai && CIC.grupo(g.pai); const paiSet = pai ? new Set(pai.munis) : null;
    if (st.modo === 'grupos') {
      const nv = st.nivelVer;
      mapa.pintar((c) => { const gs = doNivel(c, nv); return gs.length ? `var(--cat-${(gs[0].cor % 8) + 1})` : 'var(--vazio)'; },
        (c) => [selSet && selSet.has(c) ? 'sel' : '', selSet && !selSet.has(c) ? 'apaga' : '', paiSet && selSet && selSet.has(c) && !paiSet.has(c) ? 'fora-pai' : '', doNivel(c, nv).length > 1 ? 'sobre' : ''].join(' '));
      mapa.rotulos(s.grupos.filter((x) => x.nivel === nv).map((x) => ({ nome: x.nome, munis: x.munis })));
      $('#leg-mapa').innerHTML = `<span>Cor de cada grupo do nível ${esc(s.niveis[nv])}. Cinza: sem grupo. Contorno tracejado vermelho: fora do grupo-pai.</span>`;
    } else {
      const f = ind[st.indicador]; const cl = CIC.classes(CIC.demo.lista.map((m) => f(m.cod)));
      mapa.pintar((c) => cl.cor(f(c)) || 'var(--vazio)', (c) => (selSet ? (selSet.has(c) ? 'sel' : 'apaga') : ''));
      mapa.rotulos(g ? [{ nome: g.nome, munis: g.munis }] : []);
      $('#leg-mapa').innerHTML = T.legendaClasses(cl, fmtInd[st.indicador]);
    }
    $('#ajuda-mapa').textContent = st.editando ? 'Modo de edição: clique para incluir no grupo aberto. Clique num município já incluído para tirar (pede confirmação). Shift + arrastar inclui todos de uma área.' : 'Role para aproximar. Clique num município para ver os dados e incluir num grupo. Shift + arrastar escolhe uma área.';
    $('#mapa').classList.toggle('editando', st.editando);
  };
  const arvore = () => {
    const el = $('#arvore'); const filhosDe = (id, nv) => s.grupos.filter((g) => (g.pai || null) === id && g.nivel === nv).sort((a, b) => a.nome.localeCompare(b.nome));
    const avisos = CIC.verificarTerritorio(); const comAviso = new Set(avisos.filter((a) => a.tipo === 'fora').map((a) => a.grupo));
    const no = (g) => { const fs = g.nivel + 1 < s.niveis.length ? filhosDe(g.id, g.nivel + 1) : [];
      return `<li><button class="no ${st.sel === g.id ? 'ativo' : ''}" data-g="${g.id}"><i class="cor" style="background:var(--cat-${(g.cor % 8) + 1})"></i><span>${esc(g.nome)}</span>${comAviso.has(g.id) ? '<b class="marca-aviso" title="Fora do grupo-pai">!</b>' : ''}<small>${fN.format(g.munis.length)}</small></button>${fs.length ? `<ul>${fs.map(no).join('')}</ul>` : ''}</li>`; };
    const orf = s.grupos.filter((g) => g.nivel > 0 && (!g.pai || !CIC.grupo(g.pai)));
    el.innerHTML = s.grupos.length ? `<ul>${filhosDe(null, 0).map(no).join('')}${orf.map(no).join('')}</ul>` : '<p class="vazio">Nenhum grupo ainda. Crie o primeiro, use o botão "Escolher municípios" ou as regiões do IBGE.</p>';
    const box = $('#avisos-terr');
    box.innerHTML = `<h2>Verificação</h2>${avisos.length ? `<ul class="lista-avisos">${avisos.map((a, i) => `<li><p>${esc(a.texto)}</p><div class="acoes">${a.tipo === 'fora' && podeEditar ? `<button class="bt peq" data-res="incluir" data-i="${i}">Incluir no grupo-pai</button><button class="bt peq sec" data-res="tirar" data-i="${i}">Tirar do subgrupo…</button><button class="bt peq sec" data-res="aceitar" data-i="${i}">Manter assim</button>` : ''}${a.tipo === 'sobre' && podeEditar ? `<button class="bt peq sec" data-res="aceitar-sobre" data-i="${i}">Manter a sobreposição</button>` : ''}${a.tipo === 'cobertura' && podeEditar ? `<button class="bt peq sec" data-res="criar" data-i="${i}">Incluir num grupo…</button>` : ''}${a.grupo ? `<button class="bt peq sec" data-res="abrir" data-i="${i}">Abrir</button>` : ''}</div></li>`).join('')}</ul>` : '<p class="ok">Tudo contido: cada subgrupo está dentro do grupo-pai e não há sobreposição no mesmo nível.</p>'}`;
    box.onclick = (e) => {
      const b = e.target.closest('button[data-res]'); if (!b) return; const a = avisos[+b.dataset.i]; const g = a.grupo && CIC.grupo(a.grupo);
      if (b.dataset.res === 'incluir') { incluir(a.fora, CIC.grupo(g.pai)); return; }
      if (b.dataset.res === 'tirar') { confirmarRemocao(a.fora, [g]); return; }
      if (b.dataset.res === 'aceitar') { g.excecao = true; CIC.audit('Aceitou subgrupo fora do grupo-pai', g.nome, listaNomes(a.fora)); }
      if (b.dataset.res === 'aceitar-sobre') { s.grupos.filter((x) => x.nivel === g.nivel && x.munis.some((c) => a.fora.includes(c))).forEach((x) => (x.sobreposicaoOk = true)); CIC.audit('Aceitou sobreposição de grupos', g.nome, listaNomes(a.fora)); }
      if (b.dataset.res === 'criar') { st.nivelVer = 0; perguntarInclusao(a.fora); return; }
      if (b.dataset.res === 'abrir') st.sel = a.grupo;
      CIC.gravar(); tudo();
    };
  };
  const detalhe = () => {
    const el = $('#detalhe'); const g = st.sel && CIC.grupo(st.sel);
    if (!g) { el.innerHTML = `<div class="bloco"><h2>${esc(CIC.nomeUF(s.uf))} inteiro</h2>${T.htmlResumo(resumo(CIC.demo.lista.map((m) => m.cod)))}<p class="ajuda">Escolha um grupo na lista, clique num município ou use "Escolher municípios".</p></div><div id="det-mun"></div>`; return; }
    const rs = resumo(g.munis); const pais = s.grupos.filter((x) => x.nivel === g.nivel - 1); const subs = CIC.filhos(g.id);
    el.innerHTML = `<div class="bloco">
      <p class="rotulo">${esc(s.niveis[g.nivel])}</p>
      ${podeEditar ? `<input class="titulo-edit" id="g-nome" value="${esc(g.nome)}" aria-label="Nome do grupo">` : `<h2>${esc(g.nome)}</h2>`}
      ${podeEditar ? `<div class="linha-campos">
        <label>Nível<select id="g-nivel">${s.niveis.map((n, i) => `<option value="${i}" ${i === g.nivel ? 'selected' : ''}>${i + 1}. ${esc(n)}</option>`).join('')}</select></label>
        <label>Dentro de<select id="g-pai" ${g.nivel === 0 ? 'disabled' : ''}><option value="">Nenhum</option>${pais.map((p) => `<option value="${p.id}" ${p.id === g.pai ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label></div>
        <div class="cores" role="radiogroup" aria-label="Cor do grupo">${[0, 1, 2, 3, 4, 5, 6, 7].map((c) => `<button role="radio" aria-checked="${g.cor === c}" data-cor="${c}" style="background:var(--cat-${c + 1})" aria-label="Cor ${c + 1}"></button>`).join('')}</div>` : ''}
      ${T.htmlResumo(rs)}
      <div class="pilha">
        <button class="bt" id="ver-painel">Ver o painel deste grupo</button>
        ${podeEditar ? `<button class="bt sec" id="escolher-aqui">Escolher municípios deste grupo</button><button class="bt ${st.editando ? '' : 'sec'}" id="editar" aria-pressed="${st.editando}">${st.editando ? 'Concluir edição no mapa' : 'Editar no mapa'}</button>` : ''}
        ${podeEditar && g.nivel + 1 < s.niveis.length ? `<button class="bt sec" id="novo-sub">Novo ${esc(s.niveis[g.nivel + 1].toLowerCase())} dentro deste…</button>` : ''}
        <button class="bt sec" id="fechar-g">Fechar o grupo</button>
      </div>
      ${subs.length ? `<p class="rotulo mt">${esc(s.niveis[g.nivel + 1] || 'Subgrupos')} dentro deste</p><ul class="chips">${subs.map((x) => `<li><button class="chip" data-g="${x.id}">${esc(x.nome)} · ${fN.format(x.munis.length)}</button></li>`).join('')}</ul>` : ''}
      <p class="rotulo mt">Municípios (${fN.format(g.munis.length)})</p>
      <ul class="chips rolagem">${g.munis.slice().sort((a, b) => CIC.nomeMun(a).localeCompare(CIC.nomeMun(b), 'pt-BR')).map((c) => `<li><span class="chip">${esc(CIC.nomeMun(c))}${podeEditar ? `<button data-tirar="${c}" aria-label="Tirar ${esc(CIC.nomeMun(c))}">×</button>` : ''}</span></li>`).join('')}</ul>
      ${podeEditar ? '<button class="bt perigo peq mt" id="excluir">Excluir grupo…</button>' : ''}
    </div><div id="det-mun"></div>`;
    const on = (id, ev, fn) => { const x = $('#' + id); if (x) x.addEventListener(ev, fn); };
    on('g-nome', 'change', (e) => { const antes = g.nome; g.nome = e.target.value.trim() || g.nome; CIC.audit('Renomeou grupo', g.nome, `antes: ${antes}`); CIC.gravar(); arvore(); pintar(); });
    on('g-nivel', 'change', (e) => { const antes = g.nivel; g.nivel = +e.target.value; g.pai = null; CIC.audit('Mudou o nível do grupo', g.nome, `${s.niveis[antes]} para ${s.niveis[g.nivel]}`); CIC.gravar(); tudo(); });
    on('g-pai', 'change', (e) => { g.pai = e.target.value || null; g.excecao = false; CIC.audit('Mudou o grupo-pai', g.nome, g.pai ? CIC.grupo(g.pai).nome : 'sem grupo-pai'); CIC.gravar(); tudo(); });
    on('ver-painel', 'click', () => { s.escopo = g.id; CIC.gravar(); CIC.ir('painel'); });
    on('escolher-aqui', 'click', () => { st.filtro = 'todos'; abrirSel(true); });
    on('editar', 'click', () => { st.editando = !st.editando; detalhe(); pintar(); });
    on('fechar-g', 'click', () => { st.sel = null; st.editando = false; tudo(); mapa && mapa.enquadrar(null); });
    on('novo-sub', 'click', () => CIC.dialogo(`<p class="rotulo">Novo ${esc(s.niveis[g.nivel + 1].toLowerCase())}</p><h2>Dentro de "${esc(g.nome)}"</h2><label class="mt">Nome<input id="dl-nome" placeholder="Nome do novo grupo"></label><div class="acoes-dl"><button class="bt" id="dl-ok">Criar</button><button class="bt sec" data-fechar>Cancelar</button></div>`, (el2, fechar) => {
      el2.querySelector('#dl-nome').focus();
      const ok = () => { const nome = el2.querySelector('#dl-nome').value.trim(); if (!nome) return; const ng = novoGrupo(g.nivel + 1, g.id, nome); st.sel = ng.id; st.nivelVer = ng.nivel; fechar(); CIC.gravar(); tudo(); abrirSel(true); };
      el2.querySelector('#dl-ok').addEventListener('click', ok); el2.querySelector('#dl-nome').addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    }));
    on('excluir', 'click', () => {
      const subs2 = CIC.filhos(g.id);
      CIC.dialogo(`<p class="rotulo">Confirmar</p><h2>Excluir "${esc(g.nome)}"?</h2><p>${fN.format(g.munis.length)} municípios saem deste grupo. ${subs2.length ? `${subs2.length} subgrupo(s) ficam sem grupo-pai.` : ''} Os contatos não são apagados.</p><div class="acoes-dl"><button class="bt perigo-cheio" id="dl-ok">Excluir</button><button class="bt sec" data-fechar>Cancelar</button></div>`, (el2, fechar) => {
        el2.querySelector('#dl-ok').addEventListener('click', () => { s.grupos = s.grupos.filter((x) => x !== g); if (s.escopo === g.id) s.escopo = null; st.sel = null; st.editando = false; CIC.audit('Excluiu grupo', g.nome, `${g.munis.length} municípios`); CIC.gravar(); fechar(); tudo(); });
      });
    });
    el.querySelectorAll('[data-cor]').forEach((b) => b.addEventListener('click', () => { g.cor = +b.dataset.cor; CIC.audit('Mudou a cor do grupo', g.nome); CIC.gravar(); tudo(); }));
    el.querySelectorAll('[data-tirar]').forEach((b) => b.addEventListener('click', () => confirmarRemocao([+b.dataset.tirar], [g])));
    el.querySelectorAll('.chip[data-g]').forEach((b) => b.addEventListener('click', () => { st.sel = b.dataset.g; st.nivelVer = CIC.grupo(st.sel).nivel; tudo(); }));
  };
  const munCard = (cod) => {
    const m = CIC.mun(cod); const el = $('#det-mun'); if (!el || !m) return;
    const gs = s.grupos.filter((g) => g.munis.includes(cod)).sort((a, b) => a.nivel - b.nivel);
    el.innerHTML = `<div class="bloco cartao-mun"><p class="rotulo">Município · IBGE ${cod}</p><h2>${esc(m.nome)}</h2>
      <dl class="dados"><div><dt>População (Censo 2022)</dt><dd>${fN.format(m.pop)}</dd></div><div><dt>Eleitorado estimado</dt><dd>${fN.format(m.eleit)}</dd></div>
      <div><dt>Contatos</dt><dd>${fN.format(cont.get(cod) || 0)}</dd></div><div><dt>Por 1.000 habitantes</dt><dd>${fP.format(ind.taxa(cod))}</dd></div>
      <div><dt>Lideranças</dt><dd>${fN.format(lidM.get(cod) || 0)}</dd></div><div><dt>Cadastros em 7 dias</dt><dd>${fN.format(novos.get(cod) || 0)}</dd></div></dl>
      <p class="rotulo mt">Grupos que contêm</p>${gs.length ? `<ul class="chips">${gs.map((g) => `<li><span class="chip"><button class="lnk" data-g="${g.id}">${esc(s.niveis[g.nivel])}: ${esc(g.nome)}</button>${podeEditar ? `<button data-tira-g="${g.id}" aria-label="Tirar de ${esc(g.nome)}">×</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="vazio">Em nenhum grupo.</p>'}
      ${podeEditar ? '<button class="bt sec peq mt" id="incluir-mun">Incluir num grupo…</button>' : ''}
      <p class="ajuda">Eleitorado estimado: 74% da população. Na versão completa, entra o eleitorado oficial do TSE.</p></div>`;
    el.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { st.sel = b.dataset.g; st.nivelVer = CIC.grupo(st.sel).nivel; tudo(); }));
    el.querySelectorAll('[data-tira-g]').forEach((b) => b.addEventListener('click', () => confirmarRemocao([cod], [CIC.grupo(b.dataset.tiraG)])));
    el.querySelector('#incluir-mun')?.addEventListener('click', () => perguntarInclusao([cod]));
  };
  const tudo = () => { arvore(); detalhe(); pintar(); if (!$('#sel-pop').hidden) seletor(); CIC.montarTopo(); };

  /* eventos fixos */
  $('#arvore').addEventListener('click', (e) => { const b = e.target.closest('.no'); if (!b) return; st.sel = st.sel === b.dataset.g ? null : b.dataset.g; st.editando = false; if (st.sel) { st.nivelVer = CIC.grupo(st.sel).nivel; $('#nivel-ver').value = st.nivelVer; mapa && mapa.enquadrar(CIC.grupo(st.sel).munis); } tudo(); });
  $$('.niveis input').forEach((i) => i.addEventListener('change', () => { const k = +i.dataset.nivel; const antes = s.niveis[k]; s.niveis[k] = i.value.trim() || antes; CIC.audit('Renomeou nível', s.niveis[k], `antes: ${antes}`); CIC.gravar(); T.territorio(main, CIC.rota()); }));
  $$('.barra-mapa > .seg button').forEach((b) => b.addEventListener('click', () => { st.modo = b.dataset.modo; $$('.barra-mapa > .seg button').forEach((x) => x.setAttribute('aria-selected', x === b)); $('#nivel-ver').hidden = st.modo !== 'grupos'; $('#indicador').hidden = st.modo !== 'indicador'; pintar(); }));
  $('#nivel-ver').addEventListener('change', (e) => { st.nivelVer = +e.target.value; pintar(); if (!$('#sel-pop').hidden) seletor(); });
  $('#indicador').addEventListener('change', (e) => { st.indicador = e.target.value; pintar(); });
  $('#enquadrar').addEventListener('click', () => mapa && mapa.enquadrar(null));
  $('#abrir-sel').addEventListener('click', () => abrirSel($('#sel-pop').hidden));
  $('#sel-busca').value = st.busca;
  $('#sel-busca').addEventListener('input', (e) => { st.busca = e.target.value; seletor(); });
  $('#sel-filtro').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { st.filtro = b.dataset.f; seletor(); } });
  $('#sel-lista').addEventListener('click', (e) => { const i = e.target.closest('input[data-cod]'); if (!i) return; e.preventDefault(); alternarPeloControle(+i.dataset.cod); });
  const fora = (e) => { if (!document.body.contains($('#sel-pop'))) { document.removeEventListener('pointerdown', fora); return; } if ($('#sel-pop').hidden || e.target.closest('.seletor-mun') || e.target.closest('#modal') || e.target.closest('.toast')) return; abrirSel(false); };
  document.addEventListener('pointerdown', fora);
  $('#sel-pop').addEventListener('keydown', (e) => { if (e.key === 'Escape') { abrirSel(false); $('#abrir-sel').focus(); } });
  $('#novo-grupo')?.addEventListener('click', () => CIC.dialogo(`<p class="rotulo">Novo grupo</p><h2>Criar grupo</h2><label class="mt">Nome<input id="dl-nome" placeholder="Ex.: Regional Norte"></label><label>Nível<select id="dl-nivel">${s.niveis.map((n, i) => `<option value="${i}">${i + 1}. ${esc(n)}</option>`).join('')}</select></label><label>Dentro de<select id="dl-pai" disabled><option value="">Nenhum</option></select></label><div class="acoes-dl"><button class="bt" id="dl-ok">Criar e escolher municípios</button><button class="bt sec" data-fechar>Cancelar</button></div>`, (el, fechar) => {
    const nivel = el.querySelector('#dl-nivel'), pai = el.querySelector('#dl-pai');
    nivel.addEventListener('change', () => { const nv = +nivel.value; pai.disabled = nv === 0; pai.innerHTML = '<option value="">Nenhum</option>' + s.grupos.filter((g) => g.nivel === nv - 1).sort((a, b) => a.nome.localeCompare(b.nome)).map((g) => `<option value="${g.id}">${esc(g.nome)}</option>`).join(''); });
    el.querySelector('#dl-nome').focus();
    el.querySelector('#dl-ok').addEventListener('click', () => { const nome = el.querySelector('#dl-nome').value.trim(); if (!nome) { CIC.aviso('Dê um nome ao grupo.'); return; } const g = novoGrupo(+nivel.value, pai.value || null, nome); st.sel = g.id; st.nivelVer = g.nivel; CIC.gravar(); fechar(); tudo(); abrirSel(true); });
  }));
  $('#ibge')?.addEventListener('click', () => CIC.dialogo(`<p class="rotulo">Confirmar</p><h2>Trocar a divisão atual pelas regiões do IBGE?</h2><p>Os ${fN.format(s.grupos.length)} grupos atuais saem. Entram as regiões intermediárias (nível 1) e imediatas (nível 2) de ${esc(CIC.nomeUF(s.uf))}.</p><div class="acoes-dl"><button class="bt perigo-cheio" id="dl-ok">Trocar</button><button class="bt sec" data-fechar>Cancelar</button></div>`, (el, fechar) => el.querySelector('#dl-ok').addEventListener('click', () => { s.grupos = CIC.gruposIBGE(); st.sel = null; s.escopo = null; CIC.audit('Aplicou as regiões do IBGE', CIC.nomeUF(s.uf)); CIC.gravar(); fechar(); tudo(); })));
  $('#zerar')?.addEventListener('click', () => CIC.dialogo(`<p class="rotulo">Confirmar</p><h2>Apagar todos os grupos de ${esc(CIC.nomeUF(s.uf))}?</h2><p>${fN.format(s.grupos.length)} grupos saem. Os contatos ficam. Exporte a divisão antes, se quiser guardar.</p><div class="acoes-dl"><button class="bt perigo-cheio" id="dl-ok">Apagar os grupos</button><button class="bt sec" data-fechar>Cancelar</button></div>`, (el, fechar) => el.querySelector('#dl-ok').addEventListener('click', () => { const n = s.grupos.length; s.grupos = []; st.sel = null; s.escopo = null; CIC.audit('Apagou a divisão do território', CIC.nomeUF(s.uf), `${n} grupos`); CIC.gravar(); fechar(); tudo(); })));
  $('#exportar')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ uf: s.uf, niveis: s.niveis, grupos: s.grupos.map(({ id, nome, nivel, pai, cor, munis, excecao }) => ({ id, nome, nivel, pai, cor, munis, excecao })) }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `divisao-territorio-${s.uf}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    CIC.audit('Exportou a divisão do território', CIC.nomeUF(s.uf));
  });
  $('#importar')?.addEventListener('change', async (e) => {
    try { const d = JSON.parse(await e.target.files[0].text()); if (d.uf !== s.uf) throw new Error(`O arquivo é de ${d.uf}. Troque o estado antes.`); s.niveis = d.niveis; s.grupos = d.grupos; st.sel = null; CIC.audit('Importou a divisão do território', CIC.nomeUF(s.uf), `${d.grupos.length} grupos`); CIC.gravar(); T.territorio(main, CIC.rota()); }
    catch (err) { CIC.aviso('Não importou: ' + esc(err.message || 'arquivo inválido.')); }
  });
  tudo();
  mapa = new CIC.Mapa($('#mapa'), {
    dica: (c) => { const gs = s.grupos.filter((g) => g.munis.includes(c)).sort((a, b) => a.nivel - b.nivel); return `<b>${esc(CIC.nomeMun(c))}</b><br>${st.modo === 'indicador' ? `${fmtInd[st.indicador](ind[st.indicador](c))} · ${esc($('#indicador').selectedOptions[0].text.toLowerCase())}<br>` : ''}${gs.map((g) => `${esc(s.niveis[g.nivel])}: ${esc(g.nome)}`).join('<br>') || 'Sem grupo'}`; },
    aoClicar: (c) => {
      const g = st.sel && CIC.grupo(st.sel);
      if (st.editando && g) { if (g.munis.includes(c)) confirmarRemocao([c], [g]); else incluir([c], g); }
      else munCard(c);
    },
    aoSelecionarArea: (cods) => {
      const g = st.sel && CIC.grupo(st.sel);
      if (st.editando && g) incluir(cods, g); else perguntarInclusao(cods);
    },
  });
  await mapa.desenhar(s.uf);
  pintar();
  if (st.sel) mapa.enquadrar(CIC.grupo(st.sel).munis);
};
T.htmlResumo = (r) => `<dl class="dados">
  <div><dt>Municípios</dt><dd>${fN.format(r.n)}</dd></div><div><dt>População (Censo 2022)</dt><dd>${fN.format(r.pop)}</dd></div>
  <div><dt>Contatos</dt><dd>${fN.format(r.contatos)}</dd></div><div><dt>Por 1.000 habitantes</dt><dd>${fP.format(r.taxa)}</dd></div>
  <div><dt>Lideranças</dt><dd>${fN.format(r.lid)}</dd></div><div><dt>IEL médio</dt><dd>${r.iel ?? '-'}</dd></div>
  <div><dt>Municípios com contato</dt><dd>${fN.format(r.cobre)} <small>(${fP.format(r.n ? (r.cobre / r.n) * 100 : 0)}%)</small></dd></div><div><dt>Cadastros em 7 dias</dt><dd>${fN.format(r.novos)}</dd></div></dl>`;

/* ---------- REDE ---------- */
T.rede = async (main, r) => {
  const perfil = CIC.PERFIS[CIC.s.perfil];
  const raiz = perfil.soPropriaRede ? CIC.eu() : CIC.demo.pessoas[0];
  let p = r.p.p != null ? CIC.idx.porId.get(+r.p.p) : raiz; if (!p) p = raiz;
  const cam = CIC.caminho(p.id);
  if (perfil.soPropriaRede && !cam.includes(raiz)) p = raiz;
  const camVis = perfil.soPropriaRede ? cam.slice(cam.indexOf(raiz)) : cam;
  const filhos = (CIC.idx.filhos.get(p.id) || []).map((id) => CIC.idx.porId.get(id)).sort((a, b) => b.rede - a.rede);
  const ag = Date.now();
  main.innerHTML = `
  ${CIC.cabecalho(perfil.soPropriaRede ? 'Minha rede' : 'Pessoas', 'Quem trouxe quem', perfil.soPropriaRede ? 'Cada pessoa que entrou pelo seu link, e quem ela trouxe depois. Toque em um nome para ver a rede dela.' : 'Cada cadastro guarda quem convidou. Toque em um nome para descer na rede, da candidatura até a última pessoa que entrou.')}
  <div class="busca-rede"><input id="busca-p" type="search" placeholder="Buscar pessoa pelo nome ou pelo código do link" autocomplete="off"><ul id="res-p" class="resultados" hidden></ul></div>
  <nav class="trilha" aria-label="Caminho da fonte inicial até esta pessoa">${camVis.map((x, i) => `${i ? '<span aria-hidden="true">›</span>' : ''}<a href="#/rede?p=${x.id}" ${x === p ? 'aria-current="page"' : ''}>${esc(x.papel === 'candidato' ? x.nome : CIC.nomeVisivel(x))}</a>`).join('')}</nav>
  <section class="grade-2 rede-topo">
    <article class="cartao pessoa">
      <div class="pessoa-cab"><span class="avatar">${esc(CIC.iniciais(p.nome))}</span><div><h2>${esc(p.papel === 'candidato' ? p.nome : CIC.nomeVisivel(p))}</h2><p>${esc({ candidato: 'Candidatura', lideranca: 'Liderança', apoiador: 'Apoiador' }[p.papel])} · ${esc(CIC.nomeMun(p.mun))} · nível ${p.gen}</p></div>${p.iel != null ? `<span class="classe c${p.ielClasse} grande" title="Índice de Eficácia da Liderança">${p.iel}<small>IEL ${p.ielClasse}</small></span>` : ''}</div>
      <dl class="dados seis">
        <div><dt>Indicações diretas</dt><dd>${fN.format(p.diretos)}</dd></div><div><dt>Pessoas na rede</dt><dd>${fN.format(p.rede)}</dd></div>
        <div><dt>Níveis abaixo</dt><dd>${fN.format(p.prof)}</dd></div><div><dt>Municípios alcançados</dt><dd>${fN.format(p.munSet.size)}</dd></div>
        <div><dt>Confirmados</dt><dd>${p.rede ? fP.format((p.conf / p.rede) * 100) + '%' : '-'}</dd></div><div><dt>Novos em 14 dias</dt><dd>${fN.format(p.n14)}</dd></div></dl>
      ${p.papel !== 'candidato' ? `<p class="sub">Entrou em ${fDA.format(p.entrada)}${p.canal ? ` · canal: ${esc(p.canal)}` : ''}${p.pai != null ? ` · indicado por ${esc(CIC.nomeVisivel(CIC.idx.porId.get(p.pai)))}` : ''}</p><p class="fonte-ini">Fonte inicial: <b>${esc(CIC.rotuloFonte(p))}</b> · ${fN.format(Math.max(0, p.gen - 1))} ${p.gen - 1 === 1 ? 'pessoa' : 'pessoas'} entre a fonte e esta pessoa</p>` : ''}
      <div class="link-mini"><div><p class="rotulo">Link de convite</p><code>${esc(CIC.linkMarca(p))}</code><div class="pilha-h"><button class="bt peq" data-copiar="${esc(CIC.linkPessoal(p))}">Copiar</button><a class="bt peq sec" href="#/cadastro?ref=${p.cod}">Abrir a página de cadastro</a></div></div><div class="qr">${CIC.qr(CIC.linkPessoal(p), 3)}</div></div>
    </article>
    <article class="cartao"><header><h2>Onde esta rede está</h2><p>Pessoas da rede abaixo de ${esc(p.papel === 'candidato' ? 'toda a candidatura' : CIC.nomeVisivel(p))}, por município.</p></header><div class="mini-mapa" id="mapa-rede"></div><div class="legenda" id="leg-rede"></div></article>
  </section>
  <section class="cartao"><header><h2>Indicações diretas (${fN.format(filhos.length)})</h2><p>Clique numa pessoa para descer na rede.</p></header>
    ${filhos.length ? `<div class="tab-rolagem"><table class="tab"><thead><tr><th>Pessoa</th><th>Município</th><th class="n">Diretas</th><th class="n">Rede</th><th class="n">Níveis</th><th class="n">Novos 14 dias</th><th>Entrada</th><th class="n">IEL</th></tr></thead><tbody>
    ${filhos.slice(0, 200).map((f) => `<tr data-ir="rede?p=${f.id}" tabindex="0"><td><b>${esc(CIC.nomeVisivel(f))}</b><small>${esc({ lideranca: 'Liderança', apoiador: 'Apoiador' }[f.papel])}${f.status !== 'confirmado' ? ' · ' + esc(f.status) : ''}</small></td><td>${esc(CIC.nomeMun(f.mun))}</td><td class="n">${fN.format(f.diretos)}</td><td class="n">${fN.format(f.rede)}</td><td class="n">${fN.format(f.prof)}</td><td class="n">${fN.format(f.n14)}</td><td>${fD.format(f.entrada)}</td><td class="n">${f.iel != null ? `<span class="classe c${f.ielClasse}">${f.iel}</span>` : '-'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Esta pessoa ainda não indicou ninguém.</p>'}
  </section>`;
  $('tbody')?.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-ir]'); if (tr) CIC.ir(tr.dataset.ir); });
  $('tbody')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-ir]'); if (tr) CIC.ir(tr.dataset.ir); } });
  const busca = $('#busca-p'), res = $('#res-p');
  const base = perfil.soPropriaRede ? CIC.noEscopo().concat([raiz]) : CIC.todas();
  busca.addEventListener('input', () => {
    const q = busca.value.trim().toLowerCase(); if (q.length < 2) { res.hidden = true; return; }
    const ach = base.filter((x) => x.nome.toLowerCase().includes(q) || x.cod.toLowerCase() === q).slice(0, 12);
    res.innerHTML = ach.length ? ach.map((x) => `<li><a href="#/rede?p=${x.id}"><b>${esc(CIC.nomeVisivel(x))}</b><small>${esc(CIC.nomeMun(x.mun))} · nível ${x.gen} · rede ${fN.format(x.rede)}</small></a></li>`).join('') : '<li class="vazio">Nada encontrado.</li>';
    res.hidden = false;
  });
  // mapa da sub-rede
  const cont = new Map(); const pilha = [p.id];
  while (pilha.length) { const id = pilha.pop(); (CIC.idx.filhos.get(id) || []).forEach((f) => { const c = CIC.idx.porId.get(f); cont.set(c.mun, (cont.get(c.mun) || 0) + 1); pilha.push(f); }); }
  const cl = CIC.classes([...cont.values()]);
  const mapa = new CIC.Mapa($('#mapa-rede'), { dica: (c) => `<b>${esc(CIC.nomeMun(c))}</b><br>${fN.format(cont.get(c) || 0)} pessoas desta rede` });
  await mapa.desenhar(CIC.s.uf);
  mapa.pintar((c) => cl.cor(cont.get(c) || 0) || 'var(--vazio)');
  $('#leg-rede').innerHTML = T.legendaClasses(cl, (x) => fN.format(Math.round(x)));
  if (cont.size && cont.size < 60) mapa.enquadrar([...cont.keys()]);
};

/* QR do link em diálogo (delegado) */
document.addEventListener('click', (e) => { const b = e.target.closest('[data-qr]'); if (!b) return; CIC.dialogo(`<p class="rotulo">Seu link em QR</p><h2>Aponte a câmera do celular</h2><div class="qr grande">${CIC.qr(b.dataset.qr, 6)}</div><p class="ajuda">Imprima ou mostre na tela em eventos. Quem ler entra na sua rede.</p><div class="acoes-dl"><button class="bt sec" data-fechar>Fechar</button></div>`); });
/* copiar link (delegado) */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copiar]'); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copiar); const t = b.textContent; b.textContent = 'Copiado'; setTimeout(() => (b.textContent = t), 1600); }
  catch { CIC.aviso('O navegador bloqueou a cópia. Selecione o link e copie à mão.'); }
});
})();
