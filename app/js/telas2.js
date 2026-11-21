/* telas2.js: Contatos, Lideranças, Acordos e pagamentos, Cenários, Alertas, Relatórios, Configurações e Cadastro público. */
'use strict';
(() => {
const { $, $$, fN, fP, fR, fD, fDA, fDH, DIA, esc, T, G } = CIC;

/* ---------- CONTATOS ---------- */
T.contatos = (main, r) => {
  const st = { q: r.p.q || '', papel: r.p.papel || '', status: r.p.status || '', rede: r.p.rede || '', pag: 0 };
  const lider = !!CIC.PERFIS[CIC.s.perfil].soPropriaRede; const eu = lider ? CIC.eu() : null;
  main.innerHTML = `${CIC.cabecalho(lider ? 'Minha rede' : 'Pessoas', 'Lista de pessoas', lider ? 'Todas as pessoas da sua rede, das mais novas para as mais antigas. Toque em um nome para ver a ficha.' : 'Todas as pessoas que entraram na rede, das mais novas para as mais antigas. Toque em um nome para ver a ficha. Quem não autorizou mensagem não recebe mensagem.')}
  <div class="filtros">
    <input id="f-q" type="search" placeholder="Nome ou município" value="${esc(st.q)}">
    <select id="f-papel"><option value="">Todos os papéis</option><option value="lideranca">Lideranças</option><option value="apoiador">Apoiadores</option></select>
    <select id="f-status"><option value="">Todas as situações</option><option value="confirmado">Confirmado</option><option value="pendente">Celular a confirmar</option></select>
    <select id="f-rede"><option value="">Qualquer rede social</option>${Object.entries(CIC.REDES).map(([k, v]) => `<option value="${k}">Tem ${esc(v.nome)}</option>`).join('')}</select>
    <span class="contagem" id="f-n"></span>
  </div>
  ${CIC.PERFIS[CIC.s.perfil].mascara ? '<p class="faixa">O seu perfil vê o nome abreviado e o telefone escondido.</p>' : ''}
  <div class="tab-rolagem"><table class="tab clicavel" data-propria-pagina><thead><tr><th>Pessoa</th><th>Município</th><th>Convidado por</th><th>Redes</th><th>Entrada</th><th>Celular</th></tr></thead><tbody id="t-cont"></tbody></table></div>
  <div class="paginas" id="paginas"></div>`;
  $('#f-papel').value = st.papel; $('#f-status').value = st.status; $('#f-rede').value = st.rede;
  const filtrar = () => {
    const q = st.q.toLowerCase();
    return CIC.noEscopo().filter((p) => (!st.papel || p.papel === st.papel) && (!st.status || p.status === st.status) && (!st.rede || p.redes.some((x) => x.rede === st.rede)) && (!q || p.nome.toLowerCase().includes(q) || CIC.nomeMun(p.mun).toLowerCase().includes(q))).sort((a, b) => b.entrada - a.entrada);
  };
  const desenhar = () => {
    const v = filtrar(); const por = st.por || 40; const pags = Math.max(1, Math.ceil(v.length / por)); st.pag = Math.min(st.pag, pags - 1);
    $('#f-n').textContent = `${fN.format(v.length)} contatos`;
    $('#t-cont').innerHTML = v.slice(st.pag * por, st.pag * por + por).map((p) => { const pai = p.pai != null ? CIC.idx.porId.get(p.pai) : null;
      return `<tr data-id="${p.id}" tabindex="0"><td><b>${esc(CIC.nomeVisivel(p))}</b><small>${p.papel === 'lideranca' ? 'Liderança' : 'Apoiador'} · nível ${p.gen}</small></td><td>${esc(CIC.nomeMun(p.mun))}</td><td>${pai ? esc(pai.papel === 'candidato' ? pai.nome : CIC.nomeVisivel(pai)) : '-'}${!lider || CIC.fonte(p) !== eu ? `<small>fonte: ${esc(CIC.rotuloFonte(p))}</small>` : ''}</td><td><span class="siglas">${p.redes.map((x) => `<abbr title="${esc(CIC.REDES[x.rede].nome)}">${CIC.REDES[x.rede].sigla}</abbr>`).join('')}</span></td><td>${fD.format(p.entrada)}</td><td><span class="situ s-${p.status}">${p.status === 'pendente' ? 'a confirmar' : esc(p.status)}</span></td></tr>`; }).join('') || '<tr><td colspan="6" class="vazio">Nenhum contato com estes filtros.</td></tr>';
    $('#paginas').innerHTML = pags > 1 ? `<button class="bt sec peq" data-p="-1" ${st.pag ? '' : 'disabled'}>Anterior</button><span>Página ${st.pag + 1} de ${fN.format(pags)}</span><button class="bt sec peq" data-p="1" ${st.pag < pags - 1 ? '' : 'disabled'}>Próxima</button>` : '';
  };
  const url = () => { const q = new URLSearchParams(Object.entries({ q: st.q, papel: st.papel, status: st.status, rede: st.rede }).filter(([, v]) => v)); history.replaceState(null, '', '#/contatos' + (q.toString() ? '?' + q : '')); };
  $('#f-q').addEventListener('input', (e) => { st.q = e.target.value; st.pag = 0; url(); desenhar(); });
  ['papel', 'status', 'rede'].forEach((k) => $('#f-' + k).addEventListener('change', (e) => { st[k] = e.target.value; st.pag = 0; url(); desenhar(); }));
  $('#paginas').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { st.pag += +b.dataset.p; desenhar(); } });
  const abrir = (e) => { const tr = e.target.closest('tr[data-id]'); if (tr && (e.type === 'click' || e.key === 'Enter')) T.fichaContato(CIC.idx.porId.get(+tr.dataset.id), desenhar); };
  $('#t-cont').addEventListener('click', abrir); $('#t-cont').addEventListener('keydown', abrir);
  desenhar();
  requestAnimationFrame(() => { const t = $('#t-cont'); const tr = t?.querySelector('tr'); if (!tr) return; const m = $('#principal'); const livre = m.getBoundingClientRect().bottom - t.getBoundingClientRect().top - $('#paginas').offsetHeight - 40; const n = Math.max(5, Math.floor(livre / tr.offsetHeight)); if (n !== 40) { st.por = n; desenhar(); } });
};
T.formRede = (aoSalvar) => {
  const op = Object.entries(CIC.REDES).map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('');
  return { html: `<div class="form-rede"><div class="linha-campos"><label>Rede<select class="fr-rede">${op}</select></label><label class="cresce">Conta<input class="fr-valor" autocomplete="off"></label></div>
    <p class="fr-dica ajuda"></p><p class="fr-saida" aria-live="polite"></p><button type="button" class="bt peq fr-add" disabled>Adicionar rede</button></div>`,
    ligar(el) {
      const sel = el.querySelector('.fr-rede'), inp = el.querySelector('.fr-valor'), dica = el.querySelector('.fr-dica'), saida = el.querySelector('.fr-saida'), add = el.querySelector('.fr-add');
      let atual = null;
      const ver = () => { const R = CIC.REDES[sel.value]; dica.textContent = R.dica; inp.placeholder = R.exemplo; if (!inp.value.trim()) { saida.textContent = ''; saida.className = 'fr-saida'; add.disabled = true; return; }
        const n = R.norm(inp.value); atual = n.erro ? null : { rede: sel.value, ...n };
        saida.innerHTML = n.erro ? esc(n.erro) : `Fica gravado assim: <b>${esc(R.nome)}</b> <code>${esc(n.rotulo || n.id)}</code>`; saida.className = 'fr-saida ' + (n.erro ? 'erro' : 'ok'); add.disabled = !atual; };
      sel.addEventListener('change', ver); inp.addEventListener('input', ver);
      add.addEventListener('click', () => { if (atual) { aoSalvar({ rede: atual.rede, id: atual.id, url: atual.url, verif: false }); inp.value = ''; ver(); } });
      ver();
    } };
};
T.fichaContato = (p, depois) => {
  const pai = p.pai != null ? CIC.idx.porId.get(p.pai) : null;
  const cam = CIC.caminho(p.id).slice(0, -1);
  const masc = CIC.PERFIS[CIC.s.perfil].mascara;
  const html = () => `<p class="rotulo">${p.papel === 'lideranca' ? 'Liderança' : 'Apoiador'} · código ${esc(p.cod)}</p><h2>${esc(CIC.nomeVisivel(p))}</h2>
    <dl class="dados"><div><dt>Município</dt><dd>${esc(CIC.nomeMun(p.mun))}</dd></div><div><dt>Celular</dt><dd>${esc(CIC.telVisivel(p))}</dd></div>
      <div><dt>Entrada</dt><dd>${fDH.format(p.entrada)}</dd></div><div><dt>Canal</dt><dd>${esc(p.canal || '-')}</dd></div>
      <div><dt>Celular</dt><dd><span class="situ s-${p.status}">${p.status === 'pendente' ? 'a confirmar' : esc(p.status)}</span></dd></div><div><dt>Rede própria</dt><dd>${fN.format(p.rede)} pessoas</dd></div></dl>
    <p class="rotulo mt">De onde veio</p><p class="fonte-ini">Fonte inicial: <b>${esc(CIC.rotuloFonte(p))}</b></p><p class="trilha-txt">${cam.map((x) => esc(x.papel === 'candidato' ? x.nome : CIC.nomeVisivel(x))).join(' › ')} › <b>${esc(CIC.nomeVisivel(p))}</b></p>
    <p class="rotulo mt">Autorizações (LGPD)</p><ul class="cons"><li class="${p.consContato ? 'sim' : 'nao'}">${p.consContato ? 'Autorizou' : 'Não autorizou'} mensagens da campanha</li><li class="${p.consPartido ? 'sim' : 'nao'}">${p.consPartido ? 'Autorizou' : 'Não autorizou'} o partido a ver o cadastro</li></ul>
    <p class="rotulo mt">Redes sociais</p>
    <ul class="redes-lista">${p.redes.map((x, i) => `<li><abbr>${CIC.REDES[x.rede].sigla}</abbr><span><b>${esc(CIC.REDES[x.rede].nome)}</b><code>${masc ? '••••' : esc(x.rede === 'whatsapp' ? CIC.telVisivel(p) : x.id)}</code></span><em>${x.verif ? 'verificada' : 'não verificada'}</em>${masc ? '' : `<button class="bt peq sec" data-tira="${i}" aria-label="Remover">Remover</button>`}</li>`).join('')}</ul>
    ${masc ? '' : `<div id="nova-rede"></div>
    <p class="rotulo mt">Contato</p><div class="pilha-h">
      <a class="bt ${p.consContato ? '' : 'desab'}" ${p.consContato ? `href="https://wa.me/55${p.tel}?text=${encodeURIComponent('Olá, ' + p.nome.split(' ')[0] + '! Aqui é da campanha.')}" target="_blank" rel="noopener"` : 'aria-disabled="true"'}>Abrir conversa no WhatsApp</a>
      <button class="bt sec" id="reg-contato">Registrar contato feito</button></div>
    <p class="ajuda">Número fictício nesta demonstração. Na versão completa, cada mensagem usa um modelo aprovado e fica no histórico.</p>
    <ul class="historico" id="hist">${(p.hist || []).map((h) => `<li><time>${fDH.format(h.t)}</time> ${esc(h.txt)}</li>`).join('')}</ul>`}`;
  CIC.gaveta(`<div id="ficha">${html()}</div>`, (corpo) => {
    const ligar = () => {
      const alvo = corpo.querySelector('#nova-rede');
      if (alvo) { const f = T.formRede((nova) => { if (p.redes.some((x) => x.rede === nova.rede && x.id === nova.id)) { CIC.aviso('Esta conta já está no cadastro.'); return; } if (CIC.duplicado({ redes: [nova] })) { CIC.aviso('Esta conta já está no cadastro de outra pessoa. Cada conta pertence a uma pessoa só.'); return; } p.redes.push(nova); CIC.audit('Incluiu rede social no cadastro', p.cod, CIC.REDES[nova.rede].nome); CIC.gravar(); corpo.querySelector('#ficha').innerHTML = html(); ligar(); depois && depois(); }); alvo.innerHTML = f.html; f.ligar(alvo); }
      corpo.querySelectorAll('[data-tira]').forEach((b) => b.addEventListener('click', () => { const [tirada] = p.redes.splice(+b.dataset.tira, 1); CIC.audit('Tirou rede social do cadastro', p.cod, CIC.REDES[tirada.rede].nome); CIC.gravar(); corpo.querySelector('#ficha').innerHTML = html(); ligar(); depois && depois(); }));
      corpo.querySelector('#reg-contato')?.addEventListener('click', () => { (p.hist = p.hist || []).unshift({ t: Date.now(), txt: `Contato registrado por ${CIC.PERFIS[CIC.s.perfil].nome}` }); CIC.audit('Registrou contato', p.cod); corpo.querySelector('#ficha').innerHTML = html(); ligar(); });
    };
    ligar();
  });
};

/* ---------- LIDERANÇAS ---------- */
T.liderancas = (main) => {
  const st = { classe: '', ord: 'iel' };
  const NOMES = { vol: 'Volume', qua: 'Qualidade', ade: 'Adesão', mul: 'Multiplicação', rit: 'Ritmo', con: 'Conversão em voto' };
  const perfil = CIC.PERFIS[CIC.s.perfil]; const lider = !!perfil.soPropriaRede; const ajusta = !!perfil.edita;
  main.innerHTML = `${CIC.cabecalho(lider ? 'Minha rede' : 'Pessoas', lider ? 'Lideranças da sua rede' : 'Melhores lideranças', `Nota de 0 a 100 para cada liderança${lider ? ' da sua rede' : ''} com 3 indicações ou mais. Quanto maior a nota, mais a liderança traz gente boa e constante. A nota se chama IEL (Índice de Eficácia da Liderança).`)}
  <div class="filtros"><select id="f-classe" aria-label="Classe"><option value="">Todas as classes</option><option value="A">Classe A (75 ou mais)</option><option value="B">Classe B (55 a 74)</option><option value="C">Classe C (35 a 54)</option><option value="D">Classe D (abaixo de 35)</option></select><select id="f-ord" aria-label="Ordem"><option value="iel">Ordenar por IEL</option><option value="rede">Ordenar por rede</option><option value="n14">Ordenar por novos em 14 dias</option></select><span class="contagem" id="n-lid"></span></div>
  <div class="tab-rolagem" data-titulo="Lideranças"><table class="tab clicavel"><thead><tr><th>Liderança</th><th>Município</th><th class="n">Rede</th><th class="n">Novos 14 dias</th><th>Componentes</th><th class="n">IEL</th></tr></thead><tbody id="t-lid"></tbody></table></div>
  <section class="grade-iel">
    <article class="cartao"><header><h2>Distribuição por classe</h2><p>Lideranças${lider ? ' da sua rede' : ''} em cada classe. A: 75 ou mais · B: 55 a 74 · C: 35 a 54 · D: abaixo de 35.</p></header><div id="g-classes"></div></article>
    <article class="cartao"><header><h2>Como a nota é feita</h2><p>${ajusta ? 'Mude o peso e veja a classificação mudar.' : 'Pesos definidos por quem tem acesso total.'}</p></header>
      <ul class="pesos">${Object.entries(CIC.PESOS_IEL).map(([k, w]) => `<li><label for="w-${k}">${NOMES[k]}</label><input type="range" id="w-${k}" min="0" max="40" value="${w}" ${k === 'con' || !ajusta ? 'disabled' : ''}><output>${k === 'con' ? 'após a eleição' : w}</output></li>`).join('')}</ul>
      <dl class="def"><dt>Volume</dt><dd>Pessoas na rede inteira abaixo da liderança.</dd><dt>Qualidade</dt><dd>Parte da rede com celular confirmado.</dd><dt>Adesão</dt><dd>Tarefas cumpridas sobre tarefas pedidas, puxada para 65% quando há poucas tarefas.</dd><dt>Multiplicação</dt><dd>Parte das indicações diretas que também indicaram alguém.</dd><dt>Ritmo</dt><dd>Cadastros dos últimos 14 dias sobre os 14 dias anteriores.</dd><dt>Conversão</dt><dd>Votos nas seções da rede acima do esperado, medido depois da eleição.</dd></dl></article>
  </section>`;
  const desenhar = () => {
    CIC.calcularIEL();
    const dentro = new Set(CIC.noEscopo()); let L = CIC.lideres.filter((p) => dentro.has(p));
    G.colunas($('#g-classes'), ['A', 'B', 'C', 'D'].map((c) => ({ rotulo: c, valor: L.filter((p) => p.ielClasse === c).length })), { prefixo: 'Classe ', base: 'das lideranças do recorte' });
    if (st.classe) L = L.filter((p) => p.ielClasse === st.classe);
    L.sort((a, b) => b[st.ord] - a[st.ord]);
    $('#n-lid').textContent = `${fN.format(L.length)} ${L.length === 1 ? 'liderança' : 'lideranças'}`;
    $('#t-lid').innerHTML = L.slice(0, 150).map((p) => `<tr data-ir="rede?p=${p.id}" tabindex="0"><td><b>${esc(CIC.nomeVisivel(p))}</b><small>nível ${p.gen} · ${fN.format(p.diretos)} diretas</small></td><td>${esc(CIC.nomeMun(p.mun))}</td><td class="n">${fN.format(p.rede)}</td><td class="n">${fN.format(p.n14)}</td>
      <td><span class="comp">${['vol', 'qua', 'ade', 'mul', 'rit'].map((k) => `<i title="${NOMES[k]}: ${p.ielComp[k]}" style="--v:${p.ielComp[k]}%"></i>`).join('')}</span></td><td class="n"><span class="classe c${p.ielClasse}">${p.iel}</span></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Nenhuma liderança neste recorte.</td></tr>';
  };
  Object.keys(CIC.PESOS_IEL).forEach((k) => { const i = $('#w-' + k); i.addEventListener('input', () => { CIC.PESOS_IEL[k] = +i.value; i.nextElementSibling.textContent = i.value; desenhar(); }); });
  $('#f-classe').addEventListener('change', (e) => { st.classe = e.target.value; desenhar(); });
  $('#f-ord').addEventListener('change', (e) => { st.ord = e.target.value; desenhar(); });
  $('#t-lid').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-ir]'); if (tr && CIC.pode('rede')) CIC.ir(tr.dataset.ir); });
  desenhar();
};

/* ---------- ACORDOS E PAGAMENTOS ---------- */
const nomeObj = (k) => (CIC.OBJETOS.find((o) => o[0] === k) || [, k])[1];
const pago = (a) => a.pagamentos.reduce((s, p) => s + p.valor, 0);
const situacao = (a) => (!a.negociado ? 'sem valor' : pago(a) >= a.negociado ? 'quitado' : pago(a) ? 'parcial' : 'a pagar');
T.acordos = (main) => {
  const perfil = CIC.PERFIS[CIC.s.perfil]; const escreve = perfil.financeiro === true;
  const usuario = CIC.usuarioAtual();
  const ms = CIC.munisEscopo();
  const lista = () => CIC.s.acordos.filter((a) => { const p = CIC.idx.porId.get(a.pessoa); return p && (!ms || ms.has(p.mun)); });
  const desenhar = () => {
    const A = lista(); const neg = A.reduce((s, a) => s + a.negociado, 0), pg = A.reduce((s, a) => s + pago(a), 0);
    const semC = A.filter((a) => a.negociado && !a.contrato).length;
    const porMun = d3.rollups(A.filter((a) => ['coordenacao', 'mobilizacao'].includes(a.objeto)), (x) => x.length, (a) => CIC.idx.porId.get(a.pessoa).mun).sort((a, b) => b[1] - a[1]).slice(0, 8);
    main.innerHTML = `${CIC.cabecalho('Gastos e pagamentos', 'Para onde foi o dinheiro', `Registre cada gasto: com quem, em quê, quanto e quando foi pago. Contrato e comprovante são opcionais, mas ajudam na prestação de contas. Toda mudança fica no histórico.`,
      escreve ? '<div class="cab-acoes"><button class="bt" id="novo-acordo">Registrar gasto</button></div>' : '<div class="cab-acoes"><span class="faixa">O seu perfil só vê, sem mudar</span></div>')}
    <section class="grade-kpi cinco">
      <article class="kpi"><p class="rotulo">Combinado</p><p class="numero">${fR.format(neg)}</p><p class="sub">${fN.format(A.length)} gastos nesta região.</p></article>
      <article class="kpi"><p class="rotulo">Pago</p><p class="numero">${fR.format(pg)}</p><p class="sub">${fP.format(neg ? (pg / neg) * 100 : 0)}% do valor combinado.</p></article>
      <article class="kpi"><p class="rotulo">A pagar</p><p class="numero">${fR.format(neg - pg)}</p><p class="sub">${fN.format(A.filter((a) => ['a pagar', 'parcial'].includes(situacao(a))).length)} gastos com saldo a pagar.</p></article>
      <article class="kpi"><p class="rotulo">Com documento</p><p class="numero">${fN.format(A.filter((a) => a.negociado && a.contrato).length)}<small> de ${fN.format(A.filter((a) => a.negociado).length)}</small></p><p class="sub">Gastos com contrato ou recibo anexado. É opcional.</p></article>
      <article class="kpi"><p class="rotulo">Na prestação de contas</p><p class="numero">${fP.format(A.length ? (A.filter((a) => a.spce).length / A.length) * 100 : 0)}%</p><p class="sub">Dos gastos já lançados no sistema de contas do TSE (SPCE).</p></article>
    </section>
    <section class="cartao"><header><h2>Para onde foi o dinheiro</h2><p>Valor pago por tipo de gasto e nas cidades que mais receberam.</p></header><div class="grade-2 sem-margem"><div><p class="rotulo">Por tipo de gasto</p><div id="g-gasto-tipo"></div></div><div><p class="rotulo">Por cidade</p><div id="g-gasto-cid"></div></div></div></section>
    <div class="tab-rolagem" data-titulo="Gastos registrados"><table class="tab clicavel"><thead><tr><th>Com quem</th><th>Tipo de gasto</th><th class="n">Combinado</th><th class="n">Pago</th><th>Situação</th><th>Documento</th><th>Aprovação</th></tr></thead><tbody id="t-ac">
    ${A.map((a) => { const p = CIC.idx.porId.get(a.pessoa); return `<tr data-id="${a.id}" tabindex="0"><td><b>${esc(CIC.nomeVisivel(p))}</b><small>${esc(CIC.nomeMun(p.mun))}</small></td><td>${esc(nomeObj(a.objeto))}</td><td class="n">${fR.format(a.negociado)}</td><td class="n">${fR.format(pago(a))}</td><td><span class="situ a-${situacao(a).replace(' ', '-')}">${esc(situacao(a))}</span></td><td>${a.negociado ? (a.contrato ? 'anexado' : '<span class="pend">sem</span>') : '-'}</td><td>${a.aprovou ? (a.aprovou === a.registrou ? '<b class="ruim">mesma pessoa</b>' : esc(a.aprovou)) : '<span class="pend">aguardando</span>'}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="faixa lei">O tipo de cada gasto vem de uma lista fechada de gastos que a campanha pode fazer e declarar. Não existe campo para voto. Oferecer vantagem em troca de voto é crime eleitoral (Lei 9.504/1997, art. 41-A).</p>
    <section class="cartao"><header><h2>Pessoal contratado por município</h2><p>Coordenação e mobilização contratadas, contra o limite de referência da Lei 9.504/1997, art. 100-A: até 30 mil eleitores, 1% do eleitorado; acima, 300 mais 1 a cada mil eleitores que passam de 30 mil.</p></header>
      <table class="tab"><thead><tr><th>Município</th><th class="n">Contratados</th><th class="n">Limite de referência</th></tr></thead><tbody>${porMun.map(([c, n]) => `<tr><td>${esc(CIC.nomeMun(c))}</td><td class="n">${fN.format(n)}</td><td class="n">${fN.format(CIC.limiteContratacao(CIC.mun(c).eleit))}</td></tr>`).join('') || '<tr><td colspan="3" class="vazio">Nenhuma contratação no recorte.</td></tr>'}</tbody></table>
      <p class="ajuda">Para Deputado, Senador, Governador e Presidente, o limite oficial sai da tabela que o TSE publica a cada eleição (em 2026, a Portaria TSE nº 444/2026). A versão completa carrega essa tabela. Aqui, o eleitorado é estimado.</p></section>`;
    const abrir = (e) => { const tr = e.target.closest('tr[data-id]'); if (tr && (e.type === 'click' || e.key === 'Enter')) ficha(CIC.s.acordos.find((a) => a.id === tr.dataset.id)); };
    $('#t-ac').addEventListener('click', abrir); $('#t-ac').addEventListener('keydown', abrir);
    $('#novo-acordo')?.addEventListener('click', novo);
    const porTipo = d3.rollups(A.filter((a) => pago(a)), (x) => d3.sum(x, pago), (a) => nomeObj(a.objeto).replace(/ \(.*\)$/, '')).map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
    const porCid = d3.rollups(A.filter((a) => pago(a)), (x) => d3.sum(x, pago), (a) => CIC.nomeMun(CIC.idx.porId.get(a.pessoa).mun)).map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor).slice(0, 6);
    CIC.G.barrasH($('#g-gasto-tipo'), porTipo, { fmt: (v) => fR.format(v), base: 'do valor pago' });
    CIC.G.barrasH($('#g-gasto-cid'), porCid, { fmt: (v) => fR.format(v), total: pg, base: 'do valor pago' });
  };
  const ficha = (a) => {
    const p = CIC.idx.porId.get(a.pessoa);
    const html = () => `<p class="rotulo">Gasto ${esc(a.id)} · ${esc(situacao(a))}</p><h2>${esc(CIC.nomeVisivel(p))}</h2>
      <dl class="dados"><div><dt>Tipo de gasto</dt><dd>${esc(nomeObj(a.objeto))}</dd></div><div><dt>Cidade</dt><dd>${esc(CIC.nomeMun(p.mun))}</dd></div>
      <div><dt>Combinado</dt><dd>${fR.format(a.negociado)}</dd></div><div><dt>Pago</dt><dd>${fR.format(pago(a))}</dd></div>
      <div><dt>Documento</dt><dd>${a.contrato ? 'anexado' : 'sem documento (opcional)'}</dd></div><div><dt>Prestação de contas</dt><dd>${a.spce ? 'lançado' : 'falta lançar'}</dd></div>
      <div><dt>Registrado por</dt><dd>${esc(a.registrou)}</dd></div><div><dt>Aprovado por</dt><dd>${esc(a.aprovou || 'aguardando')}</dd></div></dl>
      <p class="rotulo mt">O que foi combinado</p><p>${esc(a.obs)}</p>
      <p class="rotulo mt">Pagamentos</p><ul class="historico">${a.pagamentos.map((x) => `<li><time>${fDA.format(x.data)}</time> ${fR.format(x.valor)} · ${esc(x.forma)} · ${x.comprovante ? 'com comprovante' : 'sem comprovante'}</li>`).join('') || '<li class="vazio">Nenhum pagamento.</li>'}</ul>
      ${escreve && a.negociado ? `<form class="form-pag" id="f-pag"><div class="linha-campos"><label>Valor (R$)<input name="valor" type="number" min="1" step="1" required inputmode="numeric"></label><label>Forma<select name="forma"><option>PIX</option><option>Transferência</option><option>Espécie</option></select></label></div>
        <label class="marca"><input type="checkbox" name="comp"> Comprovante anexado</label><button class="bt">Registrar pagamento</button></form>` : ''}
      ${escreve && !a.aprovou ? (usuario === a.registrou ? '<p class="ajuda mt">Você registrou este gasto. Outra pessoa com acesso total aprova.</p>' : `<button class="bt sec mt" id="aprovar">Aprovar como ${esc(usuario)}</button><p class="ajuda">Quem registrou o gasto não aprova o mesmo gasto.</p>`) : ''}`;
    CIC.gaveta(`<div id="fa">${html()}</div>`, (corpo) => {
      const ligar = () => {
        corpo.querySelector('#f-pag')?.addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); const v = Math.round(+f.get('valor')); if (!(v > 0)) return;
          if (pago(a) + v > a.negociado) { CIC.aviso(`O pagamento passa o valor combinado em ${fR.format(pago(a) + v - a.negociado)}. Registre um aditivo antes.`); return; }
          a.pagamentos.push({ data: Date.now(), valor: v, forma: f.get('forma'), comprovante: !!f.get('comp') }); CIC.audit('Registrou pagamento', `${a.id}, ${fR.format(v)}`); CIC.gravar(); corpo.querySelector('#fa').innerHTML = html(); ligar(); desenhar(); });
        corpo.querySelector('#aprovar')?.addEventListener('click', () => { const quem = usuario; if (quem === a.registrou) { CIC.aviso('Quem registrou não pode aprovar.'); return; } a.aprovou = quem; CIC.audit('Aprovou gasto', a.id); CIC.gravar(); corpo.querySelector('#fa').innerHTML = html(); ligar(); desenhar(); });
      };
      ligar();
    });
  };
  const novo = () => {
    const L = CIC.lideres.filter((p) => !ms || ms.has(p.mun)).sort((a, b) => a.nome.localeCompare(b.nome));
    CIC.gaveta(`<p class="rotulo">Novo gasto</p><h2>Registrar um gasto da campanha</h2>
      <form id="f-novo" class="form">
        <label>Com quem (pessoa da rede)<select name="pessoa" required>${L.map((p) => `<option value="${p.id}">${esc(CIC.nomeVisivel(p))} · ${esc(CIC.nomeMun(p.mun))}</option>`).join('')}</select></label>
        <label>Tipo de gasto<select name="objeto">${CIC.OBJETOS.map((o) => `<option value="${o[0]}">${esc(o[1])}</option>`).join('')}</select></label>
        <label>Valor combinado (R$)<input name="valor" type="number" min="0" step="1" value="0" inputmode="numeric"></label>
        <label>Descrição<textarea name="obs" rows="2" required placeholder="O que foi comprado ou contratado, prazo e forma de pagamento"></textarea></label>
        <label class="marca"><input type="checkbox" name="contrato"> Contrato ou recibo anexado (opcional)</label>
        <label class="marca"><input type="checkbox" name="spce"> Lançado na prestação de contas</label>
        <p class="ajuda">O gasto fica "aguardando aprovação" até outra pessoa com acesso ao dinheiro aprovar.</p>
        <button class="bt">Registrar gasto</button></form>`, (corpo, fechar) => {
      corpo.querySelector('#f-novo').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target);
        const a = { id: 'c' + (CIC.s.acordos.length + 1), pessoa: +f.get('pessoa'), objeto: f.get('objeto'), negociado: Math.round(+f.get('valor') || 0), pagamentos: [], contrato: !!f.get('contrato'), spce: !!f.get('spce'), registrou: usuario, aprovou: null, obs: f.get('obs'), criado: Date.now() };
        if (a.objeto === 'apoio') a.negociado = 0;
        CIC.s.acordos.unshift(a); CIC.audit('Registrou gasto', a.id); CIC.gravar(); fechar(); desenhar(); });
    });
  };
  desenhar();
};

/* ---------- CENÁRIOS ---------- */
const VAGAS_CAMARA = { SP: 70, MG: 53, RJ: 46, BA: 39, RS: 31, PR: 30, PE: 25, CE: 22, MA: 18, GO: 17, PA: 17, SC: 16, PB: 12, ES: 10, PI: 10, AL: 9, AM: 8, MT: 8, MS: 8, DF: 8, RN: 8, SE: 8, RO: 8, TO: 8, AC: 8, AP: 8, RR: 8 };
const vagasDe = (cargo, uf) => { const f = VAGAS_CAMARA[uf]; if (cargo === 'depest') return f <= 12 ? 3 * f : 36 + (f - 12); if (cargo === 'vereador') return 21; return f; };
CIC.distribuir = (partidos, vagas) => {
  const validos = partidos.reduce((s, p) => s + p.votos, 0);
  const qeBruto = validos / vagas; const qe = Math.max(1, qeBruto - Math.floor(qeBruto) > 0.5 ? Math.ceil(qeBruto) : Math.floor(qeBruto));
  const res = partidos.map((p) => ({ ...p, qp: Math.floor(p.votos / qe), sobra: 0 }));
  let livres = vagas - res.reduce((s, p) => s + p.qp, 0);
  const media = (p) => p.votos / (p.qp + p.sobra + 1);
  let aptos = res.filter((p) => p.votos >= 0.8 * qe);
  while (livres > 0 && aptos.length) { const m = aptos.reduce((a, b) => (media(b) > media(a) ? b : a)); m.sobra++; livres--; }
  while (livres > 0) { const m = res.reduce((a, b) => (media(b) > media(a) ? b : a)); m.sobra++; livres--; }
  res.forEach((p) => (p.total = p.qp + p.sobra));
  return { validos, qe, res };
};
T.cenarios = (main, r) => {
  const aba = r.sub || 'quociente';
  const abas = [['quociente', 'Quociente e sobras'], ['aliancas', 'Alianças'], ['dobradinha', 'Dobradinha'], ['meta', 'Meta de votos']];
  main.innerHTML = `${CIC.cabecalho('Simular votos', 'Faça a conta antes de decidir', 'Cada simulação mostra a conta inteira. Mude um número e veja o efeito. Os partidos, aliados e parceiros desta demonstração são fictícios.')}
    <nav class="abas" role="tablist">${abas.map(([k, v]) => `<a role="tab" href="#/cenarios/${k}" aria-selected="${k === aba}">${v}</a>`).join('')}</nav><div id="cen"></div>`;
  ({ quociente: T.cenQuociente, aliancas: T.cenAliancas, dobradinha: T.cenDobradinha, meta: T.cenMeta })[aba]($('#cen'));
};
T.cenQuociente = (el) => {
  const s = CIC.s; const cargo = ['depfed', 'depest', 'vereador'].includes(s.cargo) ? s.cargo : 'depfed';
  const eleit = CIC.demo.lista.reduce((a, m) => a + m.eleit, 0);
  const st = T._quoc = T._quoc && T._quoc.uf === s.uf ? T._quoc : { uf: s.uf, vagas: vagasDe(cargo, s.uf), nosso: 2, partidos: [['Federação Norte (fictícia)', 0.21], ['Partido Azul', 0.16], ['Nosso partido', 0.12], ['Partido Verde-água', 0.11], ['Federação Sul (fictícia)', 0.1], ['Partido Laranja', 0.09], ['Partido Cinza', 0.06], ['Partido Lilás', 0.035], ['Outros (soma)', 0.085]].map(([n, f]) => ({ nome: n, votos: Math.round(eleit * 0.66 * f) })) };
  const desenhar = () => {
    const d = CIC.distribuir(st.partidos, st.vagas);
    const nosso = d.res[st.nosso];
    let falta = null;
    { let lo = 0, hi = d.qe * 2; const alvo = nosso.total + 1;
      const teste = (x) => CIC.distribuir(st.partidos.map((p, i) => (i === st.nosso ? { ...p, votos: p.votos + x } : p)), st.vagas).res[st.nosso].total >= alvo;
      if (teste(hi)) { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (teste(m)) hi = m; else lo = m; } falta = hi; } }
    el.querySelector('#q-saida').innerHTML = `
      <div class="grade-kpi tres"><article class="kpi"><p class="rotulo">Votos válidos</p><p class="numero">${fN.format(d.validos)}</p><p class="sub">Soma dos votos dos partidos e federações da tabela.</p></article>
      <article class="kpi"><p class="rotulo">Quociente eleitoral</p><p class="numero">${fN.format(d.qe)}</p><p class="sub">Votos válidos ÷ ${fN.format(st.vagas)} vagas. Partido com 80% do quociente (${fN.format(Math.ceil(d.qe * 0.8))} votos) entra nas sobras.</p></article>
      <article class="kpi heroi-p"><p class="rotulo">${esc(nosso.nome)}</p><p class="numero">${fN.format(nosso.total)}<small> cadeiras</small></p><p class="sub">${falta != null ? `Faltam <b>${fN.format(falta)} votos</b> para a ${fN.format(nosso.total + 1)}ª cadeira.` : 'Mais uma cadeira pede mais de 2 quocientes de votos.'}</p></article></div>
      <div class="tab-rolagem"><table class="tab"><thead><tr><th>Partido ou federação</th><th class="n">Votos</th><th class="n">Parte dos votos válidos</th><th class="n">Pelo quociente</th><th class="n">Pelas sobras</th><th class="n">Cadeiras</th></tr></thead>
      <tbody>${d.res.map((p, i) => `<tr class="${i === st.nosso ? 'nosso' : ''}"><td>${esc(p.nome)}${p.votos < 0.8 * d.qe ? ' <small>abaixo de 80% do quociente</small>' : ''}</td><td class="n">${fN.format(p.votos)}</td><td class="n">${fP.format((p.votos / d.validos) * 100)}%</td><td class="n">${p.qp}</td><td class="n">${p.sobra}</td><td class="n"><b>${p.total}</b></td></tr>`).join('')}</tbody></table></div>
      <p class="ajuda">Regra simulada: cadeiras pelo quociente partidário; depois, sobras pela maior média entre quem tem 80% do quociente; se ainda sobrar vaga, maior média entre todos (decisão do STF de 2024). A versão completa também aplica o mínimo de votos de cada candidato (10% e 20% do quociente).</p>`;
  };
  el.innerHTML = `<div class="cen-grade"><aside class="cartao"><h2>Entradas</h2>
    <label>Vagas em disputa<input type="number" id="q-vagas" min="1" value="${st.vagas}"></label>
    <label>Seu partido<select id="q-nosso">${st.partidos.map((p, i) => `<option value="${i}" ${i === st.nosso ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label>
    <p class="rotulo mt">Votos por partido ou federação</p>
    <ul class="entradas">${st.partidos.map((p, i) => `<li><span>${esc(p.nome)}</span><input type="number" min="0" data-i="${i}" value="${p.votos}" aria-label="Votos de ${esc(p.nome)}"></li>`).join('')}</ul>
    <p class="ajuda">Votos iniciais: 66% do eleitorado estimado de ${esc(s.uf)}, divididos entre partidos fictícios. Vagas: ${esc(CIC.CARGOS[cargo].nome)} em ${esc(s.uf)}.</p></aside><section id="q-saida"></section></div>`;
  el.querySelector('#q-vagas').addEventListener('input', (e) => { st.vagas = Math.max(1, +e.target.value || 1); desenhar(); });
  el.querySelector('#q-nosso').addEventListener('change', (e) => { st.nosso = +e.target.value; desenhar(); });
  el.querySelectorAll('.entradas input').forEach((i) => i.addEventListener('input', () => { st.partidos[+i.dataset.i].votos = Math.max(0, +i.value || 0); desenhar(); }));
  desenhar();
};
T.cenAliancas = (el) => {
  const s = CIC.s; const taxa = (T._tx = T._tx || { forte: 25, 'média': 15, fraca: 5 });
  const nv0 = s.grupos.filter((g) => g.nivel === 0);
  const desenhar = () => {
    const A = s.aliados; const esp = (a) => Math.round(a.base * taxa[a.forca] / 100);
    const tot = A.reduce((x, a) => x + esp(a), 0);
    const porG = nv0.map((g) => ({ rotulo: g.nome, valor: A.filter((a) => g.munis.includes(a.mun)).reduce((x, a) => x + esp(a), 0) })).filter((x) => x.valor).sort((a, b) => b.valor - a.valor);
    el.querySelector('#al-saida').innerHTML = `<div class="grade-kpi tres"><article class="kpi heroi-p"><p class="rotulo">Votos esperados dos aliados</p><p class="numero">${fN.format(tot)}</p><p class="sub">Soma de base × taxa de transferência de ${fN.format(A.length)} aliados.</p></article>
      <article class="kpi"><p class="rotulo">Aliados fortes</p><p class="numero">${fN.format(A.filter((a) => a.forca === 'forte').length)}</p><p class="sub">Com taxa de ${taxa.forte}% sobre a base.</p></article>
      <article class="kpi"><p class="rotulo">Base somada dos aliados</p><p class="numero">${fN.format(A.reduce((x, a) => x + a.base, 0))}</p><p class="sub">Votos dos aliados na última eleição (fictícios).</p></article></div>
      <div class="grade-2"><article class="cartao"><header><h2>Votos esperados por ${esc(s.niveis[0].toLowerCase())}</h2><p>Grupos do nível 1 do território.</p></header><div id="al-g"></div></article>
      <article class="cartao"><header><h2>Aliados</h2><p>Mude a força de cada um para refazer a conta.</p></header><div class="tab-rolagem"><table class="tab"><thead><tr><th>Aliado</th><th>Município</th><th class="n">Base</th><th>Força</th><th class="n">Esperado</th></tr></thead><tbody>
      ${A.map((a, i) => `<tr><td><b>${esc(a.nome)}</b><small>${esc(a.cargo)} · ${esc(a.partido)}</small></td><td>${esc(CIC.nomeMun(a.mun))}</td><td class="n">${fN.format(a.base)}</td><td><select data-i="${i}" aria-label="Força">${['forte', 'média', 'fraca'].map((f) => `<option ${f === a.forca ? 'selected' : ''}>${f}</option>`).join('')}</select></td><td class="n">${fN.format(esp(a))}</td></tr>`).join('')}</tbody></table></div></article></div>`;
    if (porG.length) G.barrasH(el.querySelector('#al-g'), porG.slice(0, 12), { base: 'dos votos esperados dos aliados' }); else el.querySelector('#al-g').innerHTML = '<p class="vazio">Crie grupos no Território para ver esta divisão.</p>';
    el.querySelectorAll('select[data-i]').forEach((x) => x.addEventListener('change', () => { s.aliados[+x.dataset.i].forca = x.value; CIC.gravar(); desenhar(); }));
  };
  el.innerHTML = `<div class="cen-grade"><aside class="cartao"><h2>Taxa de transferência</h2><p class="ajuda">Parte dos votos do aliado que deve vir para a candidatura. Ajuste pela experiência da região.</p>
    <ul class="pesos">${Object.keys(taxa).map((k) => `<li><label for="tx-${k}">Aliado ${k}</label><input type="range" id="tx-${k}" min="0" max="60" value="${taxa[k]}"><output>${taxa[k]}%</output></li>`).join('')}</ul>
    <p class="rotulo mt">Novo aliado</p><form id="f-al" class="form"><label>Nome<input name="nome" required></label><label>Cargo<select name="cargo"><option>Prefeito</option><option>Vereador</option><option>Liderança comunitária</option><option>Deputado estadual</option></select></label>
    <label>Município<input name="mun" list="al-mun" required></label><datalist id="al-mun">${CIC.demo.lista.map((m) => `<option value="${esc(m.nome)}">`).join('')}</datalist>
    <label>Votos na última eleição<input name="base" type="number" min="0" required></label><label>Força<select name="forca"><option>forte</option><option selected>média</option><option>fraca</option></select></label><button class="bt">Incluir aliado</button></form></aside><section id="al-saida"></section></div>`;
  Object.keys(taxa).forEach((k) => { const i = el.querySelector('#tx-' + k); i.addEventListener('input', () => { taxa[k] = +i.value; i.nextElementSibling.textContent = i.value + '%'; desenhar(); }); });
  el.querySelector('#f-al').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); const m = CIC.demo.lista.find((x) => x.nome.toLowerCase() === String(f.get('mun')).trim().toLowerCase()); if (!m) { CIC.aviso('Escolha um município da lista.'); return; }
    s.aliados.unshift({ id: 'a' + Date.now(), nome: f.get('nome'), cargo: f.get('cargo'), mun: m.cod, base: +f.get('base'), forca: f.get('forca'), partido: 'informado' }); CIC.audit('Incluiu aliado', f.get('nome')); CIC.gravar(); e.target.reset(); desenhar(); });
  desenhar();
};
T.cenDobradinha = (el) => {
  const d = CIC.demo; const st = (T._dob = T._dob || { par: 0, tx: 20 });
  const nv0 = CIC.s.grupos.filter((g) => g.nivel === 0);
  const desenhar = () => {
    const A = d.lista.map((m) => ({ m, a: d.ref[m.cod].nos, b: d.ref[m.cod].parceiros[st.par] }));
    const SA = A.reduce((s, x) => s + x.a, 0), SB = A.reduce((s, x) => s + x.b, 0);
    const sobre = A.reduce((s, x) => s + Math.min(x.a / SA, x.b / SB), 0) * 100;
    const xa = A.map((x) => x.a / x.m.eleit), xb = A.map((x) => x.b / x.m.eleit);
    const corr = d3.mean(xa) && d3.deviation(xa) && d3.deviation(xb) ? d3.sum(xa.map((v, i) => (v - d3.mean(xa)) * (xb[i] - d3.mean(xb)))) / ((xa.length - 1) * d3.deviation(xa) * d3.deviation(xb)) : 0;
    const ganhoM = (x) => Math.max(0, x.b / SB - x.a / SA) * SB * (st.tx / 100);
    const ganho = Math.round(A.reduce((s, x) => s + ganhoM(x), 0));
    const top = A.map((x) => ({ ...x, g: ganhoM(x) })).sort((p, q) => q.g - p.g).slice(0, 10);
    el.querySelector('#d-saida').innerHTML = `<div class="grade-kpi tres">
      <article class="kpi"><p class="rotulo">Base em comum</p><p class="numero">${fP.format(sobre)}%</p><p class="sub">Parte da votação das duas candidaturas que cai nos mesmos municípios. Quanto menor, mais uma completa a outra.</p></article>
      <article class="kpi"><p class="rotulo">Correlação entre as votações</p><p class="numero">${corr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p class="sub">Votos por eleitor, município a município (de -1 a 1). Perto de 1: as duas bases são fortes nos mesmos lugares.</p></article>
      <article class="kpi heroi-p"><p class="rotulo">Ganho estimado</p><p class="numero">+${fN.format(ganho)}<small> votos</small></p><p class="sub">${st.tx}% da votação extra do parceiro nos municípios onde ele é mais forte que a nossa base.</p></article></div>
      <div class="grade-2"><article class="cartao"><header><h2>Onde trabalhar a dobradinha</h2><p>Os 10 municípios com maior ganho estimado.</p></header><table class="tab"><thead><tr><th>Município</th><th class="n">Nossos votos</th><th class="n">Votos do parceiro</th><th class="n">Ganho</th></tr></thead><tbody>${top.map((x) => `<tr><td>${esc(x.m.nome)}</td><td class="n">${fN.format(x.a)}</td><td class="n">${fN.format(x.b)}</td><td class="n">+${fN.format(Math.round(x.g))}</td></tr>`).join('')}</tbody></table></article>
      <article class="cartao"><header><h2>Por ${esc(CIC.s.niveis[0].toLowerCase())}</h2><p>Ganho estimado em cada grupo do nível 1.</p></header><div id="d-g"></div></article></div>`;
    const porG = nv0.map((g) => { const set = new Set(g.munis); return { rotulo: g.nome, valor: Math.round(A.filter((x) => set.has(x.m.cod)).reduce((s, x) => s + ganhoM(x), 0)) }; }).filter((x) => x.valor).sort((a, b) => b.valor - a.valor);
    if (porG.length) G.barrasH(el.querySelector('#d-g'), porG.slice(0, 12), { base: 'do ganho estimado' }); else el.querySelector('#d-g').innerHTML = '<p class="vazio">Crie grupos no Território para ver esta divisão.</p>';
  };
  el.innerHTML = `<div class="cen-grade"><aside class="cartao"><h2>Parceiro</h2><label>Candidatura parceira<select id="d-par">${d.parceiros.map((p, i) => `<option value="${i}" ${i === st.par ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
    <ul class="pesos"><li><label for="d-tx">Transferência</label><input type="range" id="d-tx" min="0" max="60" value="${st.tx}"><output>${st.tx}%</output></li></ul>
    <p class="ajuda">Base: resultado de referência por município (fictício nesta demonstração; na versão completa, a votação oficial do TSE por seção). A dobradinha junta candidaturas de cargos diferentes, como Deputado Federal e Deputado Estadual, que pedem voto juntas.</p></aside><section id="d-saida"></section></div>`;
  el.querySelector('#d-par').addEventListener('change', (e) => { st.par = +e.target.value; desenhar(); });
  el.querySelector('#d-tx').addEventListener('input', (e) => { st.tx = +e.target.value; e.target.nextElementSibling.textContent = st.tx + '%'; desenhar(); });
  desenhar();
};
T.cenMeta = (el) => {
  const s = CIC.s; const st = (T._meta = T._meta || { votos: Math.round(CIC.distribuir([{ votos: CIC.demo.lista.reduce((a, m) => a + m.eleit, 0) * 0.66 }], vagasDe('depfed', s.uf)).qe * 0.9 / 1000) * 1000, vpc: 3, cpl: 40 });
  const nv0 = s.grupos.filter((g) => g.nivel === 0);
  const desenhar = () => {
    const v = CIC.todas().filter((p) => p.gen > 0);
    const pesoG = nv0.map((g) => { const set = new Set(g.munis); const el2 = g.munis.reduce((a, c) => a + (CIC.mun(c)?.eleit || 0), 0); const ref = g.munis.reduce((a, c) => a + (CIC.demo.ref[c]?.nos || 0), 0); return { g, set, el2, ref }; });
    const somaRef = pesoG.reduce((a, x) => a + x.ref, 0) || 1;
    const linhas = pesoG.map((x) => { const meta = Math.round(st.votos * x.ref / somaRef); const cont = v.filter((p) => x.set.has(p.mun)).length; const lid = CIC.lideres.filter((p) => x.set.has(p.mun)).length; const pc = Math.ceil(meta / st.vpc); const pl = Math.ceil(pc / st.cpl); return { ...x, meta, cont, lid, pc, pl, gap: pc - cont }; }).sort((a, b) => b.gap - a.gap);
    el.querySelector('#m-saida').innerHTML = `<div class="grade-kpi tres"><article class="kpi heroi-p"><p class="rotulo">Meta de votos</p><p class="numero">${fN.format(st.votos)}</p><p class="sub">Dividida pelos grupos na proporção da votação de referência.</p></article>
      <article class="kpi"><p class="rotulo">Contatos necessários</p><p class="numero">${fN.format(Math.ceil(st.votos / st.vpc))}</p><p class="sub">Meta ÷ ${st.vpc} votos por contato. Hoje: ${fN.format(v.length)} contatos.</p></article>
      <article class="kpi"><p class="rotulo">Lideranças necessárias</p><p class="numero">${fN.format(Math.ceil(st.votos / st.vpc / st.cpl))}</p><p class="sub">Contatos ÷ ${st.cpl} por liderança. Hoje: ${fN.format(CIC.lideres.length)}.</p></article></div>
      <table class="tab"><thead><tr><th>${esc(s.niveis[0])}</th><th class="n">Meta de votos</th><th class="n">Contatos: meta</th><th class="n">Contatos: hoje</th><th class="n">Falta</th><th class="n">Lideranças: meta / hoje</th></tr></thead>
      <tbody>${linhas.map((x) => `<tr><td>${esc(x.g.nome)}</td><td class="n">${fN.format(x.meta)}</td><td class="n">${fN.format(x.pc)}</td><td class="n">${fN.format(x.cont)}</td><td class="n">${x.gap > 0 ? `<b class="ruim">${fN.format(x.gap)}</b>` : 'meta batida'}</td><td class="n">${fN.format(x.pl)} / ${fN.format(x.lid)}</td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Crie grupos no Território.</td></tr>'}</tbody></table>`;
  };
  el.innerHTML = `<div class="cen-grade"><aside class="cartao"><h2>Entradas</h2><label>Meta de votos<input type="number" id="m-v" min="0" value="${st.votos}"></label>
    <label>Votos por contato<input type="number" id="m-vpc" min="0.5" step="0.5" value="${st.vpc}"></label><label>Contatos por liderança<input type="number" id="m-cpl" min="1" value="${st.cpl}"></label>
    <p class="ajuda">Votos por contato: quantos votos cada contato cadastrado traz, com a família e o círculo próximo. Depois da eleição, a plataforma mede este número por seção e corrige a meta do ciclo seguinte.</p></aside><section id="m-saida"></section></div>`;
  [['m-v', 'votos'], ['m-vpc', 'vpc'], ['m-cpl', 'cpl']].forEach(([id, k]) => el.querySelector('#' + id).addEventListener('input', (e) => { st[k] = Math.max(+e.target.min || 0, +e.target.value || 0) || st[k]; desenhar(); }));
  desenhar();
};

/* ---------- ALERTAS ---------- */
T.alertas = (main) => {
  const A = CIC.alertas(); const perfil = CIC.PERFIS[CIC.s.perfil]; const lider = !!perfil.soPropriaRede;
  const REGRAS = [
    ['Liderança parada', 'Rede com 15 pessoas ou mais e 0 cadastro em 14 dias', 'alerta', 'rede'],
    ['Queda de ritmo', 'Cadastros em 7 dias abaixo de 80% dos 7 dias anteriores', 'alerta', 'rede'],
    ['Celular a confirmar', 'Pessoa que ainda não confirmou o celular pelo código do WhatsApp', 'info', 'rede'],
    ['Sem consentimento de contato', 'Pessoa que não autorizou mensagens', 'info', 'rede'],
    ['Município grande sem rede', 'Município com 50 mil habitantes ou mais e nenhum contato', 'alerta', 'mapa'],
    ['Subgrupo fora do grupo-pai', 'Município do subgrupo não está no grupo-pai e não foi aceito como exceção', 'alerta', 'mapa'],
    ['Sobreposição de grupos', 'Mesmo município em 2 grupos do mesmo nível', 'alerta', 'mapa'],
    ['Aprovação pela mesma pessoa', 'Quem registrou o gasto também aprovou', 'alerta', 'dinheiro'],
    ['Pagamento em dinheiro vivo', 'Pagamento feito em espécie', 'alerta', 'dinheiro'],
    ['Gasto sem documento', 'Gasto pago sem contrato nem recibo anexado (é opcional)', 'info', 'dinheiro'],
    ['Pagamento sem comprovante', 'Pagamento sem arquivo de comprovante', 'info', 'dinheiro'],
  ].filter((r) => r[3] === 'rede' || (!lider && (r[3] === 'mapa' || perfil.financeiro)));
  main.innerHTML = `${CIC.cabecalho('Avisos', 'O que precisa de decisão agora', `${A.length === 1 ? '1 aviso aberto' : `${fN.format(A.length)} avisos abertos`} ${lider ? 'na sua rede' : `em ${esc(CIC.nomeEscopo())}`}. O mais grave vem primeiro.`)}
  <ul class="lista-alertas grande" data-titulo="Avisos abertos">${A.map((a) => `<li>${CIC.selo(a.sev)}<div><b>${esc(a.regra)}</b><p>${esc(a.texto)}</p></div>${CIC.pode(a.rota.split('?')[0]) ? `<a class="bt sec peq" href="#/${a.rota}">Abrir</a>` : ''}</li>`).join('') || '<li class="vazio">Nenhum aviso aberto.</li>'}</ul>
  <section class="cartao"><header><h2>Quando um aviso aparece</h2><p>${lider ? 'Avisos sobre a sua rede.' : 'Cada regra olha a região escolhida no alto.'} Na versão completa, o aviso também chega por e-mail ou notificação.</p></header>
  <table class="tab"><thead><tr><th>Aviso</th><th>Aparece quando</th><th>Gravidade</th></tr></thead><tbody>
  ${REGRAS.map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${CIC.selo(c)}</td></tr>`).join('')}</tbody></table></section>`;
};

/* ---------- RELATÓRIOS ---------- */
const csv = (nome, cab, linhas) => {
  const txt = '﻿' + [cab, ...linhas].map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  CIC.audit('Exportou relatório', nome, `${linhas.length} linhas`);
};
CIC.baixarCSV = csv;
T.relatorios = (main) => {
  const perfil = CIC.PERFIS[CIC.s.perfil]; const lider = !!perfil.soPropriaRede;
  const R = [
    ['contatos', lider ? 'Pessoas da sua rede' : 'Pessoas', 'Uma linha por pessoa: cidade, quem convidou, fonte inicial, caminho completo de links, canal, redes e celular confirmado.', CIC.pode('contatos')],
    ['liderancas', lider ? 'Lideranças da sua rede' : 'Lideranças e IEL', 'Rede, indicações diretas, componentes e nota do IEL.', CIC.pode('liderancas')],
    ['acordos', 'Gastos e pagamentos', 'Cada gasto com tipo, cidade, combinado, pago, documento e aprovação.', CIC.pode('acordos')],
    ['municipios', 'Pessoas por município', 'População, eleitorado estimado, pessoas na rede e pessoas por 1.000 habitantes.', !lider],
    ['grupos', 'Regiões e cidades', 'Cada região com nível, região-mãe e cidades. Serve para conferir a divisão.', CIC.pode('territorio')],
    ['', 'Boletim diário em PDF', 'Resumo do dia para o candidato: números, avisos e as 10 redes que mais cresceram. Sai às 7h.', !lider],
    ['', 'Meta e resultado por seção', 'Depois da apuração: votos por seção contra a meta e o voto atribuído a cada liderança.', !lider],
    ['', 'Prestação de contas', 'Despesas com pessoal e serviços, no formato de lançamento do SPCE.', CIC.pode('acordos')],
  ].filter((x) => x[3]);
  main.innerHTML = `${CIC.cabecalho('Baixar planilhas', lider ? 'A sua rede em planilha' : 'Os dados da campanha em planilha', lider ? 'Só as pessoas da sua rede entram nas planilhas. Cada download fica no histórico com o seu nome.' : 'Cada planilha usa a região escolhida no alto. Cada download fica no histórico com o nome de quem baixou.')}
  <ul class="relatorios">${R.map(([k, t, d]) => `<li><div><b>${t}</b><p>${d}</p></div>${k ? `<button class="bt sec peq" data-r="${k}">Baixar CSV</button>` : '<span class="pend">na versão completa</span>'}</li>`).join('')}</ul>`;
  main.querySelector('.relatorios').addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return; const v = CIC.noEscopo(); const uf = CIC.s.uf;
    if (b.dataset.r === 'partido') { CIC.ir('partido'); return; }
    if (b.dataset.r === 'auditoria') { CIC.ir('auditoria'); return; }
    if (b.dataset.r === 'contatos') csv(`contatos-${uf}.csv`, ['codigo', 'nome', 'municipio', 'papel', 'nivel', 'convidado_por', 'fonte_inicial', 'caminho', 'canal', 'redes', 'celular_confirmado', 'entrada'], v.map((p) => [p.cod, CIC.nomeVisivel(p), CIC.nomeMun(p.mun), p.papel, p.gen, p.pai != null ? CIC.idx.porId.get(p.pai).cod : '', CIC.rotuloFonte(p), CIC.caminho(p.id).map((x) => x.cod).join(' > '), p.canal, p.redes.map((x) => x.rede).join(' '), p.status === 'confirmado' ? 'sim' : 'nao', fDA.format(p.entrada)]));
    if (b.dataset.r === 'municipios') { const c = new Map(); v.forEach((p) => c.set(p.mun, (c.get(p.mun) || 0) + 1)); csv(`municipios-${uf}.csv`, ['ibge', 'municipio', 'populacao_censo_2022', 'eleitorado_estimado', 'pessoas', 'pessoas_por_mil_hab'], CIC.demo.lista.map((m) => [m.cod, m.nome, m.pop, m.eleit, c.get(m.cod) || 0, fP.format(((c.get(m.cod) || 0) / m.pop) * 1000)])); }
    if (b.dataset.r === 'grupos') csv(`territorio-${uf}.csv`, ['grupo', 'nivel', 'grupo_pai', 'ibge', 'municipio'], CIC.s.grupos.flatMap((g) => g.munis.map((c) => [g.nome, CIC.s.niveis[g.nivel], g.pai ? CIC.grupo(g.pai)?.nome : '', c, CIC.nomeMun(c)])));
    if (b.dataset.r === 'liderancas') csv(`liderancas-${uf}.csv`, ['codigo', 'nome', 'municipio', 'diretas', 'rede', 'novos_14d', 'volume', 'qualidade', 'adesao', 'multiplicacao', 'ritmo', 'iel', 'classe'], CIC.lideres.filter((p) => v.includes(p)).map((p) => [p.cod, CIC.nomeVisivel(p), CIC.nomeMun(p.mun), p.diretos, p.rede, p.n14, p.ielComp.vol, p.ielComp.qua, p.ielComp.ade, p.ielComp.mul, p.ielComp.rit, p.iel, p.ielClasse]));
    if (b.dataset.r === 'acordos') csv(`gastos-${uf}.csv`, ['gasto', 'com_quem', 'cidade', 'tipo_de_gasto', 'combinado', 'pago', 'documento', 'registrou', 'aprovou'], CIC.s.acordos.map((a) => { const p = CIC.idx.porId.get(a.pessoa); return [a.id, CIC.nomeVisivel(p), CIC.nomeMun(p.mun), nomeObj(a.objeto), a.negociado, pago(a), a.contrato ? 'sim' : 'nao', a.registrou, a.aprovou || '']; }));
  });
};

/* ---------- CONFIGURAÇÕES ---------- */
T.config = (main) => {
  const s = CIC.s; const ehPartido = s.perfil === 'partido';
  main.innerHTML = `${CIC.cabecalho('Ajustes da campanha', 'Cargo, estados e regras', 'Os dados desta campanha nunca aparecem em outra. O partido vê só os números.')}
  <section class="grade-2">
    <article class="cartao"><header><h2>Estrutura da conta</h2><p>Quem contrata, quem usa, quem vê.</p></header>
      <ol class="hierarquia"><li><b>Contratante</b><span>Partido, federação, entidade ou candidatura avulsa. Paga, abre contas e vê o consolidado.</span></li>
      <li><b>Conta de candidatura</b><span>Um candidato, um cargo, uma eleição. Tem território, metas e equipe próprios.</span></li>
      <li><b>Equipe</b><span>Coordenação geral, coordenação territorial (por grupo), financeiro, jurídico, analistas.</span></li>
      <li><b>Lideranças</b><span>Recebem link e QR próprios. Veem só a própria rede.</span></li>
      <li><b>Apoiadores</b><span>Entram por um link, ganham o próprio link e trazem outros.</span></li></ol>
      <a class="bt sec mt" href="#/equipe">Abrir Equipe e acessos</a></article>
    <article class="cartao"><header><h2>Eleição desta conta</h2><p>O cargo decide a regra de cálculo e a menor unidade do território.</p></header>
      <label>Cargo<select id="cargo" ${CIC.editaConfig() ? '' : 'disabled'}>${Object.entries(CIC.CARGOS).map(([k, v]) => `<option value="${k}" ${k === s.cargo ? 'selected' : ''}>${esc(v.nome)}</option>`).join('')}</select></label>
      <dl class="dados" id="cargo-info"></dl></article>
  </section>
  <section class="cartao"><header><h2>Estados de atuação</h2><p>A candidatura escolhe onde atua. Só os estados marcados aparecem no painel, no território, na rede, nos cenários e nos relatórios. Nomes e municípios: IBGE.</p></header>
    ${CIC.editaConfig() ? '' : '<p class="faixa">O seu perfil não muda os estados. Peça ao administrador.</p>'}
    <div class="filtros"><input type="search" id="uf-busca" placeholder="Buscar estado">${CIC.editaConfig() ? '<button class="bt sec peq" id="uf-todos">Marcar todos…</button>' : ''}<span class="contagem" id="uf-n"></span></div>
    <div class="ufs" id="ufs"></div>
    <p class="ajuda">Cargo estadual (Deputado, Senador, Governador) disputa um estado. Marque mais de um para acompanhar redes de fora, como em eleição de conselho federal ou de Presidente.</p></section>
  <section class="grade-2">
    <article class="cartao"><header><h2>Redes sociais aceitas</h2><p>O apoiador escolhe a rede e digita a conta. A plataforma grava sempre no mesmo formato.</p></header>
      <table class="tab"><thead><tr><th>Rede</th><th>Orientação ao apoiador</th><th>Grava como</th></tr></thead><tbody>${Object.values(CIC.REDES).map((r) => `<tr><td><b>${esc(r.nome)}</b></td><td>${esc(r.dica)}</td><td><code>${esc((r.norm(r.exemplo).rotulo || r.norm(r.exemplo).id) || '')}</code></td></tr>`).join('')}</tbody></table>
      <p class="rotulo mt">Teste a normalização</p><div id="teste-rede"></div></article>
    <article class="cartao"><header><h2>Segurança</h2><p>Controles que valem para todas as contas.</p></header>
      <ul class="controles"><li><b>Login com segundo fator</b> obrigatório para candidato, coordenação e financeiro.</li><li><b>Isolamento por conta</b> no banco (regra por linha): uma campanha nunca lê a base de outra.</li><li><b>Região por usuário</b>: a coordenação de região só lê a própria região.</li><li><b>Dado financeiro e CPF cifrados</b> no banco, com chave fora da aplicação.</li><li><b>Dupla aprovação</b> de pagamento: quem registra não aprova.</li><li><b>Trilha de auditoria</b> sem apagar: quem viu, mudou ou exportou o quê.</li><li><b>Marca d'água</b> com nome e horário em toda exportação.</li><li><b>Sessão curta</b> e saída remota de aparelho perdido.</li><li><b>Consentimento</b> gravado com texto, versão e horário. O apoiador pede a exclusão pelo próprio link.</li></ul></article>
  </section>
  <section class="cartao"><header><h2>Dados desta demonstração</h2><p>O protótipo grava as suas mudanças neste navegador. Nada vai para servidor.</p></header><button class="bt perigo" id="reset">Apagar as mudanças e recomeçar…</button></section>`;
  const desUF = () => {
    const c = CIC.campAtual(); const q = ($('#uf-busca').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const lista = CIC.base.estados.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).filter((e) => !q || e.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) || e.sigla.toLowerCase() === q);
    $('#ufs').innerHTML = lista.map((e) => `<label class="uf-item ${c.ufs.includes(e.sigla) ? 'on' : ''}"><input type="checkbox" value="${e.sigla}" ${c.ufs.includes(e.sigla) ? 'checked' : ''} ${CIC.editaConfig() ? '' : 'disabled'}><span><b>${esc(e.nome)}</b><small>${e.sigla} · ${fN.format(CIC.base.municipios[e.sigla].length)} municípios</small></span></label>`).join('');
    $('#uf-n').textContent = `${fN.format(c.ufs.length)} de 27 marcados`;
  };
  const mudarUFs = (novas, acao, alvo) => {
    const c = CIC.campAtual(); c.ufs = novas; CIC.audit(acao, alvo, `estados: ${novas.join(', ')}`);
    if (!novas.includes(s.uf)) CIC.ativar(s.camp, novas[0]); else CIC.gravar();
    CIC.montarTopo(); desUF();
  };
  desUF();
  $('#uf-busca').addEventListener('input', desUF);
  $('#ufs').addEventListener('click', (e) => {
    const i = e.target.closest('input[type="checkbox"]'); if (!i) return; e.preventDefault();
    const c = CIC.campAtual(); const uf = i.value;
    if (!c.ufs.includes(uf)) { mudarUFs([...c.ufs, uf], 'Incluiu estado de atuação', CIC.nomeUF(uf)); return; }
    if (c.ufs.length === 1) { CIC.aviso('A candidatura precisa de 1 estado pelo menos.'); return; }
    CIC.dialogo(`<p class="rotulo">Confirmar</p><h2>Tirar ${esc(CIC.nomeUF(uf))} dos estados de atuação?</h2><p>O estado some do painel e das outras telas. A divisão do território e os cadastros deste estado ficam guardados e voltam se você marcar de novo.</p><div class="acoes-dl"><button class="bt perigo-cheio" id="dl-ok">Tirar o estado</button><button class="bt sec" data-fechar>Cancelar</button></div>`,
      (el, fechar) => el.querySelector('#dl-ok').addEventListener('click', () => { fechar(); mudarUFs(c.ufs.filter((x) => x !== uf), 'Tirou estado de atuação', CIC.nomeUF(uf)); }));
  });
  $('#uf-todos')?.addEventListener('click', () => CIC.dialogo(`<p class="rotulo">Confirmar</p><h2>Marcar os 27 estados?</h2><p>Serve para Presidente da República e eleição de conselho federal. O seletor "Estado", no alto, passa a listar todos.</p><div class="acoes-dl"><button class="bt" id="dl-ok">Marcar todos</button><button class="bt sec" data-fechar>Cancelar</button></div>`,
    (el, fechar) => el.querySelector('#dl-ok').addEventListener('click', () => { fechar(); mudarUFs(CIC.base.estados.map((e) => e.sigla).sort(), 'Marcou todos os estados de atuação', 'Brasil'); })));
  const info = () => { const c = CIC.CARGOS[s.cargo]; $('#cargo-info').innerHTML = `<div><dt>Sistema</dt><dd>${esc(c.sistema)}</dd></div><div><dt>Abrangência</dt><dd>${esc(c.abrangencia)}</dd></div><div><dt>Menor unidade</dt><dd>${esc(c.unidade)}</dd></div><div><dt>Base de eleitores</dt><dd>${esc(c.fonte)}</dd></div>`; };
  info();
  $('#cargo').addEventListener('change', (e) => { s.cargo = e.target.value; CIC.audit('Mudou o cargo da conta', CIC.CARGOS[s.cargo].nome); CIC.gravar(); info(); CIC.montarTopo(); });
  const f = T.formRede((n) => CIC.aviso(`Gravaria: ${esc(CIC.REDES[n.rede].nome)} ${esc(n.id)}`)); $('#teste-rede').innerHTML = f.html; f.ligar($('#teste-rede'));
  $('#reset').addEventListener('click', () => CIC.aviso('Apagar grupos, gastos, cadastros novos e perfil escolhidos neste navegador?', [['Apagar e recomeçar', () => { CIC.apagarTudo(); location.hash = '#/painel'; location.reload(); }], ['Cancelar', () => {}]]));
  $('#nova-conta')?.addEventListener('click', () => CIC.aviso('Na versão completa, o partido informa o candidato, o cargo e o e-mail. O candidato recebe o convite e cria a senha com segundo fator.'));
};

/* ---------- CADASTRO PÚBLICO ---------- */
T.cadastro = (main, r) => {
  const todas = CIC.todas();
  const ref = todas.find((p) => p.cod === String(r.p.ref || '').toUpperCase()) || CIC.demo.pessoas[0];
  const quem = ref.papel === 'candidato' ? 'a própria campanha' : ref.nome.split(' ')[0] + ', de ' + CIC.nomeMun(ref.mun);
  const quemCurto = ref.papel === 'candidato' ? 'A campanha' : ref.nome.split(' ')[0];
  const ini = ref.papel === 'candidato' ? '×' : CIC.iniciais(ref.nome);
  const redes = [];
  main.innerHTML = `<div class="cad"><header class="cad-topo"><div class="marca-cad">${CIC.SIMBOLO}<b>Multiplica</b></div><span class="quem"><span class="av">${esc(ini)}</span>${esc(quemCurto)} te chamou</span><h1>Faça parte da rede</h1><p>Entre na rede de apoio de <b>${esc(CIC.campAtual().nome)}</b> (${esc(CIC.CARGOS[CIC.s.cargo].nome)}) em 1 minuto. Depois, receba o seu link e chame quem você conhece.</p><p class="cadeia">Você entra como o <b>${fN.format(ref.gen + 1)}º elo</b> desta corrente. Quem te chamou também foi chamado por alguém.</p></header>
    <form id="cad" class="form" novalidate>
      <label>Nome completo<input name="nome" required autocomplete="name"></label>
      <label>Celular com DDD<input name="tel" required inputmode="tel" autocomplete="tel" placeholder="(11) 91234-5678"></label>
      <label>Município onde vota<input name="mun" required list="cad-mun" autocomplete="off" value="${esc(CIC.nomeMun(ref.mun))}"></label><datalist id="cad-mun">${CIC.demo.lista.map((m) => `<option value="${esc(m.nome)}">`).join('')}</datalist>
      <fieldset><legend>Suas redes sociais <small>(opcional)</small></legend><p class="ajuda">Escolha a rede e digite a conta. Pode colar o link do perfil.</p><ul class="redes-lista" id="cad-redes"></ul><div id="cad-form-rede"></div></fieldset>
      <fieldset><legend>Autorizações</legend>
        <label class="marca"><input type="checkbox" name="c1" required> Autorizo a campanha a falar comigo por mensagem. Posso cancelar quando quiser, pelo meu link.</label>
        <label class="marca"><input type="checkbox" name="c2"> Autorizo o partido da candidatura a ver meu cadastro.</label></fieldset>
      <p class="erro" id="cad-erro" role="alert"></p>
      <button class="bt grande">Entrar na rede</button>
      <p class="ajuda">Demonstração: o cadastro fica só neste navegador. Na versão completa, um código por SMS confirma o celular.</p>
    </form>${CIC.s.usuario ? '<a class="ligacao" href="#/painel">Voltar ao início</a>' : ''}</div>`;
  const listar = () => { $('#cad-redes').innerHTML = redes.map((x, i) => `<li><abbr>${CIC.REDES[x.rede].sigla}</abbr><span><b>${esc(CIC.REDES[x.rede].nome)}</b><code>${esc(x.id)}</code></span><button type="button" class="bt peq sec" data-i="${i}">Remover</button></li>`).join(''); };
  $('#cad-redes').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { redes.splice(+b.dataset.i, 1); listar(); } });
  const f = T.formRede((n) => { if (n.rede === 'whatsapp') { CIC.aviso('O WhatsApp sai do celular informado acima.'); return; } if (redes.some((x) => x.rede === n.rede)) { CIC.aviso('Esta rede já está na lista.'); return; } redes.push(n); listar(); });
  $('#cad-form-rede').innerHTML = f.html; f.ligar($('#cad-form-rede'));
  $('#cad-form-rede .fr-rede').value = 'instagram'; $('#cad-form-rede .fr-rede').dispatchEvent(new Event('change'));
  $('#cad').addEventListener('submit', (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const erro = $('#cad-erro'); erro.textContent = '';
    const nome = String(fd.get('nome')).trim().replace(/\s+/g, ' ');
    if (nome.split(' ').length < 2) { erro.textContent = 'Digite nome e sobrenome.'; return; }
    const tel = CIC.REDES.whatsapp.norm(fd.get('tel')); if (tel.erro) { erro.textContent = tel.erro; return; }
    const m = CIC.demo.lista.find((x) => x.nome.toLowerCase() === String(fd.get('mun')).trim().toLowerCase()); if (!m) { erro.textContent = 'Escolha o município na lista.'; return; }
    if (!fd.get('c1')) { erro.textContent = 'Para entrar na rede, autorize o contato da campanha.'; return; }
    const d = tel.id.slice(3);
    const ja = CIC.todas().find((p) => p.tel === d);
    if (ja) { erro.textContent = `Este celular já tem cadastro. A indicação continua com quem trouxe primeiro. Seu link: ${CIC.linkPessoal(ja)}`; return; }
    const p = { id: 300000 + CIC.s.extras.length, cod: (Date.now() % 2176782336).toString(36).toUpperCase().padStart(6, 'Q').slice(-6), nome, tel: d, mun: m.cod, pai: ref.id, entrada: Date.now(), papel: 'apoiador', canal: 'Link personalizado', status: 'pendente',
      redes: [{ rede: 'whatsapp', id: tel.id, url: tel.url, verif: false }, ...redes], consContato: true, consPartido: !!fd.get('c2'), acoes: 0, acoesOk: 0, sim: false, real: true };
    CIC.s.extras.push(p); CIC.indexar(); CIC.audit('Novo cadastro pelo link', ref.cod); CIC.gravar();
    const link = CIC.linkPessoal(p);
    main.innerHTML = `<div class="cad"><header class="cad-topo"><div class="marca-cad">${CIC.SIMBOLO}<b>Multiplica</b></div><p class="rotulo">Cadastro feito</p><h1>Agora é sua vez, ${esc(nome.split(' ')[0])}.</h1><p>Você entrou pelo convite de ${esc(quem)}. Mande o seu link para quem você conhece. Cada pessoa que entrar por ele fica na sua rede.</p></header>
      <div class="cartao link-pessoal"><div><p class="rotulo">Seu link</p><span class="link-marca">${esc(CIC.linkMarca(p))}</span><p class="link-nota">No exemplo, o botão copia o link desta demonstração.</p>
      <div class="pilha-h" style="margin-top:10px"><a class="bt" href="https://wa.me/?text=${encodeURIComponent(CIC.textoConvite(link))}" target="_blank" rel="noopener">Multiplique aí</a><button class="bt sec" data-copiar="${esc(link)}">Copiar link</button></div></div><div class="qr">${CIC.qr(link)}</div></div>
      <p class="cadeia">Você é o <b>${fN.format(p.gen)}º elo</b> desta corrente. A campanha vê o caminho completo até a fonte inicial.</p>
      </div>`;
  });
};
})();
