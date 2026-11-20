/* telas3.js: Painel do partido e Registro de atividades. */
'use strict';
(() => {
const { $, $$, fN, fP, fDH, DIA, esc, T, G } = CIC;

const linhaMini = (serie) => {
  const W = 120, H = 30; const max = Math.max(...serie, 1), min = Math.min(...serie);
  const x = (i) => (i / (serie.length - 1)) * (W - 4) + 2; const y = (v) => H - 3 - ((v - min) / (max - min || 1)) * (H - 6);
  return `<svg class="mini" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path class="linha-s1" d="${serie.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')}"/><circle class="ponto-fim" cx="${x(serie.length - 1)}" cy="${y(serie[serie.length - 1])}" r="2.5"/></svg>`;
};

/* ---------- PAINEL DO PARTIDO ---------- */
T.partido = (main) => {
  const ids = Object.keys(CIC.CAMPANHAS_BASE);
  const R = ids.map(CIC.resumoCamp);
  const tot = R.reduce((a, r) => a + r.total, 0), d7 = R.reduce((a, r) => a + r.d7, 0), p7 = R.reduce((a, r) => a + r.p7, 0);
  const ativos = R.reduce((a, r) => a + r.ativos, 0), lid = R.reduce((a, r) => a + r.lid, 0);
  const ufs = new Set(R.flatMap((r) => r.ufs));
  main.innerHTML = `${CIC.cabecalho('Campanhas do partido', esc(CIC.PARTIDO), 'Os números de cada campanha, lado a lado. O partido só vê números: não vê nomes, telefones, contratos nem pagamentos, e não muda nada.',
    '<div class="cab-acoes"><button class="bt sec" id="csv-partido">Baixar desempenho (CSV)</button></div>')}
  <section class="grade-kpi">
    <article class="kpi heroi"><p class="rotulo">Contatos de todas as candidaturas</p><p class="numero">${fN.format(tot)}</p><p class="sub"><b>+${fN.format(d7)}</b> em 7 dias · ${p7 ? `${d7 >= p7 ? '+' : ''}${fP.format((d7 / p7 - 1) * 100)}% sobre os 7 dias anteriores` : ''}</p></article>
    <article class="kpi"><p class="rotulo">Candidaturas</p><p class="numero">${fN.format(R.length)}</p><p class="sub">Em ${fN.format(ufs.size)} estados: ${[...ufs].map(esc).join(', ')}.</p></article>
    <article class="kpi"><p class="rotulo">Lideranças ativas</p><p class="numero">${fN.format(ativos)}<small> de ${fN.format(lid)}</small></p><p class="sub">Com 1 cadastro novo ou mais em 14 dias.</p></article>
    <article class="kpi"><p class="rotulo">Cadastros suspeitos</p><p class="numero">${fN.format(R.reduce((a, r) => a + r.susp, 0))}</p><p class="sub">Somados em todas as candidaturas.</p></article>
    <article class="kpi"><p class="rotulo">Meta somada</p><p class="numero">${fP.format((tot / R.reduce((a, r) => a + r.meta, 0)) * 100)}%</p><p class="sub">Dos ${fN.format(R.reduce((a, r) => a + r.meta, 0))} contatos de meta das candidaturas.</p></article>
  </section>
  <section class="cartao"><header><h2>Desempenho por campanha</h2><p>Toque em "Ver números" para abrir o início da campanha, só para leitura.</p></header>
  <div class="tab-rolagem"><table class="tab"><thead><tr><th>Candidatura</th><th>Estados</th><th class="n">Contatos</th><th class="n">+7 dias</th><th class="n">Ritmo</th><th class="n">Lideranças ativas</th><th class="n">Municípios com rede</th><th class="n">Meta</th><th>Últimos 60 dias</th><th></th></tr></thead><tbody>
  ${R.sort((a, b) => b.total - a.total).map((r) => `<tr><td><b>${esc(r.nome)}</b><small>${esc(CIC.CARGOS[r.cargo].nome)}</small></td><td>${r.ufs.map(esc).join(', ')}</td><td class="n">${fN.format(r.total)}</td><td class="n">+${fN.format(r.d7)}</td>
    <td class="n">${r.p7 ? `<span class="${r.d7 < r.p7 * 0.8 ? 'ruim' : ''}">${r.d7 >= r.p7 ? '+' : ''}${fP.format((r.d7 / r.p7 - 1) * 100)}%</span>` : '-'}</td><td class="n">${fN.format(r.ativos)} / ${fN.format(r.lid)}</td>
    <td class="n">${fP.format((r.munRede / r.munTotal) * 100)}%</td><td class="n">${fP.format((r.total / r.meta) * 100)}%</td><td data-serie="${r.id}">${linhaMini(r.serie)}</td><td><button class="bt peq" data-abrir="${r.id}">Ver números</button></td></tr>`).join('')}</tbody></table></div>
  <p class="ajuda">Ritmo: cadastros dos últimos 7 dias sobre os 7 dias anteriores. Em vermelho: queda de mais de 20%. Municípios com rede: parte dos municípios dos estados da candidatura com 1 contato ou mais.</p></section>
  <section class="grade-2 mt">
    <article class="cartao"><header><h2>Contatos por candidatura</h2><p>Parte de cada candidatura no total do partido.</p></header><div id="g-camp"></div></article>
    <article class="cartao"><header><h2>Quem vê o quê</h2><p>Regra de acesso entre o partido e as candidaturas.</p></header>
      <ul class="controles"><li><b>Partido</b>: vê os números de todas as campanhas. Não muda nada. Não vê nomes, telefones, contratos nem pagamentos.</li>
      <li><b>Primeiro acesso</b>: o partido cria o primeiro administrador de cada campanha, em <a href="#/acessos">Acessos das campanhas</a>.</li>
      <li><b>Campanha</b>: cada uma vê só os próprios dados. O administrador cria a equipe e escolhe o que cada perfil vê.</li>
      <li><b>Histórico</b>: cada consulta do partido fica gravada com usuário e horário.</li></ul></article>
  </section>`;
  G.barrasH($('#g-camp'), R.map((r) => ({ rotulo: r.nome, valor: r.total })), { base: 'dos contatos do partido' });
  main.querySelectorAll('[data-serie]').forEach((td) => { const r = R.find((x) => x.id === td.dataset.serie);
    td.addEventListener('pointermove', (ev) => CIC.dica.mostrar(`<b>${esc(r.nome)}</b><br>Há 60 dias: ${fN.format(r.serie[0])} contatos<br>Hoje: ${fN.format(r.serie[60])} contatos`, ev));
    td.addEventListener('pointerleave', () => CIC.dica.esconder()); });
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-abrir]'); if (!b) return;
    CIC.ativar(b.dataset.abrir); T._terr = null; CIC.audit('Partido abriu os números da campanha', CIC.campAtual().nome); CIC.ir('painel');
  });
  $('#csv-partido').addEventListener('click', () => {
    CIC.baixarCSV(`desempenho-candidaturas.csv`, ['candidatura', 'cargo', 'estados', 'contatos', 'novos_7d', 'novos_7d_anteriores', 'liderancas_ativas', 'liderancas', 'municipios_com_rede', 'municipios', 'meta_contatos', 'suspeitos'],
      R.map((r) => [r.nome, CIC.CARGOS[r.cargo].nome, r.ufs.join(' '), r.total, r.d7, r.p7, r.ativos, r.lid, r.munRede, r.munTotal, r.meta, r.susp]));
  });
};

/* ---------- REGISTRO DE ATIVIDADES ---------- */
T.auditoria = (main) => {
  const s = CIC.s; const ehPartido = s.perfil === 'partido';
  const st = { q: '', perfil: '', camp: ehPartido ? '' : s.camp };
  const base = () => s.auditoria.filter((a) => (ehPartido || a.camp === s.camp));
  main.innerHTML = `${CIC.cabecalho('Histórico de ações', 'Quem fez o quê e quando', `Toda ação fica gravada: grupos e municípios do território, perfis, cadastros, redes sociais, contatos, acordos, pagamentos, aprovações e exportações. Você vê só o histórico desta campanha. Ninguém apaga o histórico.`,
    '<div class="cab-acoes"><button class="bt sec" id="csv-aud">Baixar registro (CSV)</button></div>')}
  <div class="filtros"><input type="search" id="a-q" placeholder="Buscar ação, grupo ou município">
    <select id="a-perfil"><option value="">Todos os perfis</option>${[...new Set(base().map((a) => a.perfil))].map((p) => `<option>${esc(p)}</option>`).join('')}</select>
    ${ehPartido ? `<select id="a-camp"><option value="">Todas as candidaturas</option>${Object.keys(CIC.CAMPANHAS_BASE).map((k) => `<option value="${k}">${esc((s.store[k] || CIC.CAMPANHAS_BASE[k]).nome)}</option>`).join('')}</select>` : ''}
    <span class="contagem" id="a-n"></span></div>
  <div class="tab-rolagem"><table class="tab"><thead><tr><th>Quando</th><th>Quem</th><th>Candidatura · estado</th><th>Ação</th><th>Sobre</th></tr></thead><tbody id="a-t"></tbody></table></div>`;
  const filtrar = () => { const q = st.q.toLowerCase(); return base().filter((a) => (!st.perfil || a.perfil === st.perfil) && (!st.camp || a.camp === st.camp) && (!q || `${a.acao} ${a.alvo} ${a.detalhe} ${a.quem}`.toLowerCase().includes(q))); };
  const desenhar = () => {
    const L = filtrar(); $('#a-n').textContent = `${fN.format(L.length)} registros`;
    $('#a-t').innerHTML = L.slice(0, 400).map((a) => `<tr><td class="n">${fDH.format(a.quando)}</td><td><b>${esc(a.quem)}</b><small>${esc(a.perfil)}</small></td><td>${esc(a.campNome)}<small>${esc(a.uf || '')}</small></td><td>${esc(a.acao)}</td><td>${esc(a.alvo)}${a.detalhe ? `<small>${esc(a.detalhe)}</small>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Nenhum registro com estes filtros. Mude algo no Território e volte aqui.</td></tr>';
  };
  $('#a-q').addEventListener('input', (e) => { st.q = e.target.value; desenhar(); });
  $('#a-perfil').addEventListener('change', (e) => { st.perfil = e.target.value; desenhar(); });
  $('#a-camp')?.addEventListener('change', (e) => { st.camp = e.target.value; desenhar(); });
  $('#csv-aud').addEventListener('click', () => CIC.baixarCSV('registro-de-atividades.csv', ['quando', 'quem', 'perfil', 'candidatura', 'estado', 'acao', 'sobre', 'detalhe'], filtrar().map((a) => [new Date(a.quando).toISOString(), a.quem, a.perfil, a.campNome, a.uf, a.acao, a.alvo, a.detalhe])));
  desenhar();
};
})();
