/* ajuste.js: faz cada tela caber na área visível, em qualquer tamanho de tela.
   1. Mede a altura livre abaixo do título da tela.
   2. Se o conteúdo não cabe, divide os blocos em partes e mostra uma parte por vez, com abas no alto.
   3. Bloco de uma coluna só que sozinho passa da altura é aberto em blocos menores.
   4. Tabela que ainda passa da altura mostra só as linhas que cabem, com botões de página.
   A rolagem só sobra quando um único bloco não cabe nem sozinho. */
'use strict';
(() => {
const { $, esc } = CIC;
CIC.paginaTela = {};
const NAO_ABRE = '.fazer, .cartao, .kpi, form, table, fieldset, article, header, nav, ul, ol, dl, svg, .mini-mapa, .mapa, .tab-rolagem, .link-pessoal';
const alt = (el) => { const cs = getComputedStyle(el); return el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); };
const umaColuna = (el) => {
  const cs = getComputedStyle(el);
  if (cs.display.includes('grid')) return cs.gridTemplateColumns.trim().split(/\s+/).length === 1;
  if (cs.display.includes('flex')) return cs.flexDirection.startsWith('column');
  return cs.display === 'block';
};
const titulo = (els) => {
  for (const el of els) { const t = el.dataset?.titulo || el.querySelector?.('[data-titulo]')?.dataset.titulo; if (t) return t; }
  for (const sel of ['h2', 'h3', 'legend', '.rotulo']) for (const el of els) { const t = el.matches(sel) ? el : el.querySelector(sel); if (t && t.textContent.trim()) return t.textContent.trim().replace(/\s*\(\d[\d.]*\)$/, ''); }
  for (const el of els) if (el.querySelector('table') || el.matches('table, .tab-rolagem')) return 'Lista';
  return '';
};

/* tabela ou lista com as linhas que cabem e botões de página */
const itensDe = (el) => (el.tagName === 'TABLE' ? (el.tBodies[0] ? [...el.tBodies[0].rows] : []) : [...el.children].filter((x) => x.tagName === 'LI'));
const corpoDe = (el) => (el.tagName === 'TABLE' ? el.tBodies[0] : el);
const paginar = (el, por) => {
  const corpo = corpoDe(el); if (!corpo) return;
  let pag = 0;
  let barra = el._barra;
  if (!barra) { barra = document.createElement('div'); barra.className = 'pager-tab'; (el.closest('.tab-rolagem') || el).after(barra); el._barra = barra; }
  const aplicar = () => {
    const L = itensDe(el); const n = L.length; const pags = Math.max(1, Math.ceil(n / por)); pag = Math.min(pag, pags - 1);
    L.forEach((tr, i) => { tr.hidden = i < pag * por || i >= (pag + 1) * por; });
    barra.hidden = pags < 2;
    barra.innerHTML = `<button class="bt sec peq" data-d="-1" ${pag ? '' : 'disabled'}>Anterior</button><span>${CIC.fN.format(pag * por + 1)} a ${CIC.fN.format(Math.min(n, (pag + 1) * por))} de ${CIC.fN.format(n)}</span><button class="bt sec peq" data-d="1" ${pag < pags - 1 ? '' : 'disabled'}>Próxima</button>`;
  };
  barra.onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) { pag += +b.dataset.d; aplicar(); } };
  el._obs?.disconnect();
  el._obs = new MutationObserver(() => { pag = 0; aplicar(); });
  el._obs.observe(corpo, { childList: true });
  aplicar();
};
const PAGINAVEIS = 'table, ul.lista-alertas, ul.relatorios, ol.historico, ul.controles';
const soltarTabelas = (raiz) => raiz.querySelectorAll(PAGINAVEIS).forEach((t) => { t._obs?.disconnect(); t._obs = null; t._barra?.remove(); t._barra = null; itensDe(t).forEach((x) => { if (x.hidden) x.hidden = false; }); });

const caberTabelas = (main, blocos, H) => {
  const usado = () => blocos.filter((b) => !b.hidden).reduce((a, b) => a + alt(b), 0);
  [...main.querySelectorAll(PAGINAVEIS)].filter((t) => !t.hasAttribute('data-propria-pagina') && t.offsetParent && itensDe(t).length > 4)
    .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height).forEach((t) => {
      const excesso = usado() - H; if (excesso <= 2) return;
      const L = itensDe(t); const h = t.getBoundingClientRect().height / L.length || 40;
      const por = Math.max(3, L.length - Math.ceil((excesso + 44) / h));
      if (por < L.length) paginar(t, por);
    });
};

let ajustando = false;
CIC.ajustar = (main = $('#principal')) => {
  if (document.body.classList.contains('modo-cadastro')) return;
  ajustando = true;
  const rota = CIC.rota().nome;
  main.querySelector(':scope > .paginas-tela')?.remove();
  main.querySelectorAll(':scope > [data-pag]').forEach((b) => { b.hidden = false; delete b.dataset.pag; });
  soltarTabelas(main);
  const filhos = [...main.children].filter((e) => e.tagName !== 'SCRIPT');
  let i = 0; const cab = [];
  while (i < filhos.length && (filhos[i].matches('.cab, nav.abas, .faixa-partido, .bloqueio, .rede-barra'))) cab.push(filhos[i++]);
  let blocos = filhos.slice(i);
  const cs = getComputedStyle(main);
  const H = main.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - cab.reduce((a, e) => a + alt(e), 0) - 52;
  // telas de trabalho em colunas (mapa, simulação) ocupam a altura exata: cada coluna rola por dentro, se precisar
  const util = Math.floor(H + 48);
  if (Math.abs((CIC._altoUtil || 0) - util) > 8) {
    CIC._altoUtil = util; main.style.setProperty('--alto-util', util + 'px');
    if (main.querySelector('.terr, .cen-grade') && innerWidth > 1020 && !CIC._reajuste) { CIC._reajuste = true; ajustando = false; CIC.render(); CIC._reajuste = false; return; }
  }
  // abre blocos de uma coluna que sozinhos passam da altura
  for (let volta = 0; volta < 3; volta++) {
    let mudou = false;
    blocos = blocos.flatMap((b) => {
      const filhosB = [...b.children];
      if (alt(b) <= H || b.matches(NAO_ABRE) || filhosB.length < 2 || filhosB[0].matches('h1, h2, h3, header, legend') || !umaColuna(b)) return [b];
      const novos = filhosB.map((f, k) => { const w = b.cloneNode(false); if (k) w.removeAttribute('id'); w.appendChild(f); return w; });
      b.replaceWith(...novos); mudou = true; return novos;
    });
    if (!mudou) break;
  }
  const total = blocos.reduce((a, b) => a + alt(b), 0);
  if (total <= H + 52 || blocos.length < 2) { caberTabelas(main, blocos, H + 52); ajustando = false; obs.takeRecords(); return; }
  // junta os blocos em partes que cabem na altura
  const partes = []; let atual = []; let soma = 0;
  // altura mínima de um bloco: tabelas e listas longas encolhem até 4 linhas com botões de página
  const minimo = (b) => { let h = alt(b); b.querySelectorAll(PAGINAVEIS).forEach((t) => { const L = itensDe(t); if (L.length > 3) h -= (t.tagName === "TABLE" ? (t.tBodies[0].getBoundingClientRect().height / L.length) : (t.getBoundingClientRect().height / L.length)) * (L.length - 3) - 44; }); return h; };
  blocos.forEach((b) => { const h = alt(b); const hm = minimo(b);
    if (atual.length && soma + hm > H) { partes.push(atual); atual = []; soma = 0; }
    atual.push(b); soma += soma + h > H ? hm : h; });
  if (atual.length) partes.push(atual);
  partes.forEach((p, k) => p.forEach((b) => (b.dataset.pag = k)));
  const nav = document.createElement('nav'); nav.className = 'paginas-tela'; nav.setAttribute('aria-label', 'Partes desta tela');
  nav.innerHTML = partes.map((p, k) => `<button type="button" data-k="${k}"><span>${k + 1}</span>${esc(titulo(p) || 'Parte ' + (k + 1))}</button>`).join('');
  (cab[cab.length - 1] ? cab[cab.length - 1].after(nav) : main.prepend(nav));
  // abas em mais de uma linha: vira seletor compacto com setas
  const nomes = partes.map((p, k) => titulo(p) || 'Parte ' + (k + 1));
  if (nav.offsetHeight > 46) {
    nav.classList.add('compacta');
    nav.innerHTML = `<button type="button" class="seta" data-d="-1" aria-label="Parte anterior">‹</button><label><span class="pt-n"></span><select aria-label="Escolha a parte da tela">${nomes.map((n, k) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label><button type="button" class="seta" data-d="1" aria-label="Próxima parte">›</button>`;
    nav.querySelector('select').addEventListener('change', (e) => mostrar(+e.target.value, true));
  }
  const mostrar = (k, foco) => {
    CIC.paginaTela[rota] = k;
    blocos.forEach((b) => (b.hidden = +b.dataset.pag !== k));
    nav.querySelectorAll('button[data-k]').forEach((b) => b.setAttribute('aria-current', +b.dataset.k === k ? 'true' : 'false'));
    if (nav.classList.contains('compacta')) { nav.querySelector('select').value = k; nav.querySelector('.pt-n').textContent = `Parte ${k + 1} de ${partes.length}`; nav.querySelector('[data-d="-1"]').disabled = k === 0; nav.querySelector('[data-d="1"]').disabled = k === partes.length - 1; }
    soltarTabelas(main); caberTabelas(main, blocos, H);
    main.scrollTop = 0;
    // gráfico ou mapa desenhado com a parte escondida: desenha de novo
    const vazio = blocos.some((b) => !b.hidden && [...b.querySelectorAll('.mini-mapa, [id^="g-"]')].some((el) => el.clientWidth > 0 && el.querySelector('svg') && el.querySelector('svg').getBoundingClientRect().width < 20));
    if (vazio && foco) CIC.render();
    if (foco && !nav.classList.contains('compacta')) nav.querySelector(`[data-k="${k}"]`)?.focus();
  };
  nav.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) mostrar(+b.dataset.k, true); const d = e.target.closest('[data-d]'); if (d) mostrar(Math.max(0, Math.min(partes.length - 1, (CIC.paginaTela[rota] || 0) + +d.dataset.d)), true); });
  mostrar(Math.min(CIC.paginaTela[rota] || 0, partes.length - 1), false);
  ajustando = false; obs.takeRecords();
};

/* telas que se redesenham sozinhas (filtros, edição) também passam pelo ajuste */
let pedido = 0;
const obs = new MutationObserver(() => { if (ajustando) return; cancelAnimationFrame(pedido); pedido = requestAnimationFrame(() => CIC.ajustar()); });
CIC.vigiarAjuste = () => obs.observe($('#principal'), { childList: true });
})();
