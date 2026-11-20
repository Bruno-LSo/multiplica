/* cadastro.js: cadastro do apoiador com dados normalizados e sem duplicidade.
   Chave única: o celular, gravado no formato internacional E.164 (+55 11 91234-5678 vira +5511912345678).
   E-mail, CPF e contas de redes sociais também não se repetem na base da campanha.
   Obrigatórios: nome, celular e cidade. O resto é opcional. */
'use strict';
(() => {
const { $, esc, fN, T } = CIC;

/* ---------- normalização ---------- */
const N = (CIC.norm = {});
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
N.digitos = (s) => String(s || '').replace(/\D/g, '');

// Nome: primeira letra de cada palavra maiúscula; preposições e artigos de ligação em minúsculas.
const MINUSCULAS = new Set(['da', 'das', 'de', 'des', 'di', 'do', 'dos', 'du', 'e', 'em', 'na', 'no', 'nas', 'nos', 'van', 'von', 'der', 'del', 'la', 'le', "d'"]);
N.nome = (s) => {
  const limpo = String(s || '').replace(/[^\p{L}\s'’-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!limpo) return { erro: 'Digite o seu nome.' };
  const partes = limpo.split(' ');
  if (partes.length < 2) return { erro: 'Digite nome e sobrenome.' };
  const cap = (w) => w.split('-').map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join('-');
  const valor = partes.map((w, i) => (i > 0 && MINUSCULAS.has(w) ? w : cap(w))).join(' ');
  return { valor };
};

// Celular: código do país + número. No Brasil, DDD válido + 9 dígitos começando por 9.
CIC.PAISES = [
  ['BR', 'Brasil', '55'], ['PT', 'Portugal', '351'], ['US', 'Estados Unidos', '1'], ['AR', 'Argentina', '54'], ['PY', 'Paraguai', '595'],
  ['UY', 'Uruguai', '598'], ['BO', 'Bolívia', '591'], ['CL', 'Chile', '56'], ['ES', 'Espanha', '34'], ['IT', 'Itália', '39'],
  ['JP', 'Japão', '81'], ['DE', 'Alemanha', '49'], ['FR', 'França', '33'], ['GB', 'Reino Unido', '44'],
];
const DDD = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99]);
N.celular = (ddi, s) => {
  let d = N.digitos(s);
  if (ddi === '55') {
    d = d.replace(/^0+/, '');
    if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
    if (d.length !== 11) return { erro: 'Digite o DDD e o celular: 11 números, por exemplo (11) 91234-5678.' };
    if (!DDD.has(+d.slice(0, 2))) return { erro: `O DDD ${d.slice(0, 2)} não existe. Confira o código da sua cidade.` };
    if (d[2] !== '9') return { erro: 'Celular no Brasil começa com 9 depois do DDD.' };
    return { e164: '+55' + d, nacional: d, rotulo: `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` };
  }
  if (d.startsWith(ddi) && d.length > 9) d = d.slice(ddi.length);
  if (d.length < 6 || d.length + ddi.length > 15) return { erro: 'Número fora do tamanho aceito para este país.' };
  return { e164: '+' + ddi + d, nacional: d, rotulo: `+${ddi} ${d}` };
};
N.mascaraCelular = (ddi, s) => {
  const d = N.digitos(s).slice(0, ddi === '55' ? 11 : 13);
  if (ddi !== '55') return d;
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

N.email = (s) => {
  const v = String(s || '').trim().toLowerCase();
  if (!v) return { valor: null };
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(v)) return { erro: 'E-mail incompleto. Confira o @ e o domínio, por exemplo maria@gmail.com.' };
  return { valor: v };
};

// CPF: aceita pontos e traço; grava só os 11 números, com os 2 dígitos verificadores conferidos.
N.cpf = (s) => {
  const d = N.digitos(s);
  if (!d) return { valor: null };
  if (d.length !== 11) return { erro: `O CPF tem 11 números. Você digitou ${d.length}.` };
  if (/^(\d)\1{10}$/.test(d)) return { erro: 'CPF inválido.' };
  const dv = (n) => { let soma = 0; for (let i = 0; i < n; i++) soma += +d[i] * (n + 1 - i); const r = (soma * 10) % 11; return r === 10 ? 0 : r; };
  if (dv(9) !== +d[9] || dv(10) !== +d[10]) return { erro: 'CPF inválido: os dígitos finais não conferem.' };
  return { valor: d, rotulo: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` };
};
N.mascaraCpf = (s) => { const d = N.digitos(s).slice(0, 11); return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2'); };
N.cep = (s) => { const d = N.digitos(s); if (!d) return { valor: null }; if (d.length !== 8) return { erro: 'O CEP tem 8 números.' }; return { valor: d, rotulo: `${d.slice(0, 5)}-${d.slice(5)}` }; };
N.mascaraCep = (s) => { const d = N.digitos(s).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

/* ---------- unicidade na base da campanha ---------- */
CIC.chaveCelular = (p) => p.e164 || '+55' + p.tel;
CIC.duplicado = ({ e164, email, cpf, redes }) => {
  for (const p of CIC.todas()) {
    if (e164 && CIC.chaveCelular(p) === e164) return { campo: 'celular', p };
    if (email && p.email === email) return { campo: 'email', p };
    if (cpf && p.cpf === cpf) return { campo: 'cpf', p };
    if (redes) for (const r of redes) if (p.redes.some((x) => x.rede === r.rede && x.id === r.id)) return { campo: 'rede', p, rede: r };
  }
  return null;
};

/* ---------- municípios do Brasil inteiro, para a busca de cidade ---------- */
CIC.munBR = () => {
  if (CIC._munBR) return CIC._munBR;
  const lista = [];
  Object.entries(CIC.base.municipios).forEach(([uf, ms]) => ms.forEach((m) => lista.push({ cod: m[0], nome: m[1], uf, busca: semAcento(m[1]).toLowerCase() })));
  CIC._munBR = { lista, porCod: new Map(lista.map((m) => [m.cod, m])) };
  return CIC._munBR;
};
CIC.comboCidade = (raiz, aoEscolher, inicial) => {
  const inp = raiz.querySelector('input'), lista = raiz.querySelector('ul');
  const ufCamp = CIC.s.uf; let itens = [], ativo = -1;
  const mostrar = () => {
    const q = semAcento(inp.value).toLowerCase().trim();
    if (q.length < 2) { lista.hidden = true; return; }
    const { lista: L } = CIC.munBR();
    itens = L.filter((m) => m.busca.includes(q)).sort((a, b) => (a.busca.startsWith(q) ? 0 : 1) - (b.busca.startsWith(q) ? 0 : 1) || (a.uf === ufCamp ? 0 : 1) - (b.uf === ufCamp ? 0 : 1) || a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 8);
    ativo = itens.length ? 0 : -1;
    lista.innerHTML = itens.length ? itens.map((m, i) => `<li role="option" id="cid-${m.cod}" data-i="${i}" aria-selected="${i === ativo}"><b>${esc(m.nome)}</b><span>${esc(m.uf)}</span></li>`).join('') : '<li class="nada">Nenhuma cidade com esse nome.</li>';
    lista.hidden = false; inp.setAttribute('aria-expanded', 'true');
  };
  const escolher = (m) => { inp.value = `${m.nome} - ${m.uf}`; lista.hidden = true; inp.setAttribute('aria-expanded', 'false'); aoEscolher(m); };
  inp.addEventListener('input', () => { aoEscolher(null); mostrar(); });
  inp.addEventListener('focus', () => { if (!inp.dataset.cod) inp.select(); });
  inp.addEventListener('keydown', (e) => {
    if (lista.hidden || !itens.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ativo = (ativo + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length; lista.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', i === ativo)); inp.setAttribute('aria-activedescendant', 'cid-' + itens[ativo].cod); }
    if (e.key === 'Enter') { e.preventDefault(); escolher(itens[ativo]); }
    if (e.key === 'Escape') lista.hidden = true;
  });
  lista.addEventListener('mousedown', (e) => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); escolher(itens[+li.dataset.i]); } });
  inp.addEventListener('blur', () => setTimeout(() => (lista.hidden = true), 120));
  if (inicial) escolher(inicial);
  return { definir: escolher };
};

/* ---------- endereço pelo CEP (ViaCEP, serviço público) ---------- */
CIC.buscarCep = async (cep) => {
  const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!r.ok) throw new Error('falha');
  const j = await r.json();
  if (j.erro) return null;
  return { logradouro: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade, uf: j.uf, ibge: +j.ibge };
};

/* ---------- tela de cadastro ---------- */
T.cadastro = (main, r) => {
  const todas = CIC.todas();
  const ref = todas.find((p) => p.cod === String(r.p.ref || '').toUpperCase()) || CIC.demo.pessoas[0];
  const quem = ref.papel === 'candidato' ? 'a própria campanha' : ref.nome.split(' ')[0] + ', de ' + CIC.nomeMun(ref.mun);
  const quemCurto = ref.papel === 'candidato' ? 'A campanha' : ref.nome.split(' ')[0];
  const ini = ref.papel === 'candidato' ? 'C' : CIC.iniciais(ref.nome);
  const redes = []; let cidade = null;
  main.innerHTML = `<div class="cad"><header class="cad-topo"><div class="marca-cad">${CIC.SIMBOLO}<b>Multiplica</b></div><span class="quem"><span class="av">${esc(ini)}</span>${esc(quemCurto)} te chamou</span><h1>Faça parte da rede</h1>
    <p>Entre na rede de apoio de <b>${esc(CIC.campAtual().nome)}</b> (${esc(CIC.CARGOS[CIC.s.cargo].nome)}). Só 3 campos são obrigatórios: nome, celular e cidade.</p></header>
    <form id="cad" class="form" novalidate autocomplete="on">
      <label for="c-nome">Nome completo <em>obrigatório</em></label>
      <div class="campo"><input id="c-nome" name="nome" autocomplete="name" placeholder="Maria da Silva Souza"><p class="grava" id="g-nome"></p></div>
      <label for="c-tel">Celular com WhatsApp <em>obrigatório</em></label>
      <div class="campo"><div class="tel-linha"><select id="c-pais" aria-label="País do celular">${CIC.PAISES.map(([sig, nome, ddi]) => `<option value="${ddi}" ${sig === 'BR' ? 'selected' : ''}>${esc(nome)} +${ddi}</option>`).join('')}</select>
        <input id="c-tel" name="tel" inputmode="tel" autocomplete="tel-national" placeholder="(11) 91234-5678"></div><p class="grava" id="g-tel"></p></div>
      <label for="c-cidade">Cidade onde vota <em>obrigatório</em></label>
      <div class="campo combo" id="combo-cidade"><input id="c-cidade" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="lista-cidade" autocomplete="off" placeholder="Digite o nome da cidade"><ul id="lista-cidade" role="listbox" hidden></ul><p class="grava" id="g-cidade"></p></div>
      <details class="opcionais"><summary>Mais dados (opcional): e-mail, CPF e endereço</summary>
        <label for="c-email">E-mail</label>
        <div class="campo"><input id="c-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="maria@gmail.com"><p class="grava" id="g-email"></p></div>
        <label for="c-cpf">CPF</label>
        <div class="campo"><input id="c-cpf" name="cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00"><p class="grava" id="g-cpf"></p></div>
        <label for="c-cep">CEP <small>preenche rua, bairro, cidade e estado</small></label>
        <div class="campo"><input id="c-cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000"><p class="grava" id="g-cep"></p></div>
        <div class="end-grade">
          <label class="larga">Rua<input id="c-rua" autocomplete="address-line1"></label>
          <label>Número<input id="c-num" inputmode="numeric"></label>
          <label>Complemento<input id="c-comp"></label>
          <label class="larga">Bairro<input id="c-bairro"></label>
        </div>
      </details>
      <fieldset><legend>Suas redes sociais <small>(opcional)</small></legend><p class="ajuda">Escolha a rede e digite a conta. Pode colar o link do perfil.</p><ul class="redes-lista" id="cad-redes"></ul><div id="cad-form-rede"></div></fieldset>
      <fieldset><legend>Autorização</legend>
        <label class="marca"><input type="checkbox" name="c1"> Autorizo a campanha a falar comigo por mensagem. Posso cancelar quando quiser.</label>
        <label class="marca"><input type="checkbox" name="c2"> Autorizo o partido da candidatura a ver meu cadastro.</label></fieldset>
      <p class="erro" id="cad-erro" role="alert"></p>
      <button class="bt grande">Entrar na rede</button>
      <p class="ajuda">Demonstração: o cadastro fica só neste navegador. Na versão real, um código por SMS confirma o celular.</p>
    </form>${CIC.s.usuario ? '<a class="ligacao" href="#/painel">Voltar ao início</a>' : ''}</div>`;

  const g = (id, texto, ok) => { const el = $('#g-' + id); el.innerHTML = texto; el.className = 'grava' + (texto ? (ok ? ' ok' : ' erro') : ''); };
  const nomeIn = $('#c-nome'), pais = $('#c-pais'), tel = $('#c-tel'), email = $('#c-email'), cpf = $('#c-cpf'), cep = $('#c-cep');
  const verNome = () => { if (!nomeIn.value.trim()) return g('nome', ''); const n = N.nome(nomeIn.value); g('nome', n.erro ? esc(n.erro) : `Fica gravado assim: <b>${esc(n.valor)}</b>`, !n.erro); };
  const verTel = () => { if (!N.digitos(tel.value)) return g('tel', ''); const n = N.celular(pais.value, tel.value); g('tel', n.erro ? esc(n.erro) : `Fica gravado assim: <b>${esc(n.rotulo)}</b>`, !n.erro); };
  const verEmail = () => { const n = N.email(email.value); g('email', n.erro ? esc(n.erro) : n.valor ? `Fica gravado assim: <b>${esc(n.valor)}</b>` : '', !n.erro); };
  const verCpf = () => { if (!N.digitos(cpf.value)) return g('cpf', ''); const n = N.cpf(cpf.value); g('cpf', n.erro ? esc(n.erro) : `CPF válido: <b>${esc(n.rotulo)}</b>`, !n.erro); };
  nomeIn.addEventListener('blur', verNome); nomeIn.addEventListener('input', () => { if ($('#g-nome').textContent) verNome(); });
  tel.addEventListener('input', () => { tel.value = N.mascaraCelular(pais.value, tel.value); verTel(); });
  pais.addEventListener('change', () => { tel.value = N.mascaraCelular(pais.value, tel.value); tel.placeholder = pais.value === '55' ? '(11) 91234-5678' : 'Só números'; verTel(); });
  email.addEventListener('blur', verEmail); email.addEventListener('input', () => { if ($('#g-email').textContent) verEmail(); });
  cpf.addEventListener('input', () => { cpf.value = N.mascaraCpf(cpf.value); if (N.digitos(cpf.value).length === 11) verCpf(); else g('cpf', ''); });
  cpf.addEventListener('blur', verCpf);

  const combo = CIC.comboCidade($('#combo-cidade'), (m) => { cidade = m; g('cidade', m ? `Fica gravado assim: <b>${esc(m.nome)} - ${esc(m.uf)}</b> (código IBGE ${m.cod})` : '', true); }, CIC.munBR().porCod.get(ref.mun));

  cep.addEventListener('input', async () => {
    cep.value = N.mascaraCep(cep.value);
    const n = N.cep(cep.value);
    if (!n.valor) { g('cep', N.digitos(cep.value).length ? '' : ''); return; }
    g('cep', 'Buscando o endereço…', true);
    try {
      const e = await CIC.buscarCep(n.valor);
      if (!e) { g('cep', 'CEP não encontrado. Confira os números ou preencha o endereço à mão.', false); return; }
      $('#c-rua').value = e.logradouro; $('#c-bairro').value = e.bairro;
      const m = CIC.munBR().porCod.get(e.ibge); if (m) combo.definir(m);
      g('cep', `Endereço encontrado: <b>${esc([e.logradouro, e.bairro, `${e.cidade} - ${e.uf}`].filter(Boolean).join(', '))}</b>. Falta o número.`, true);
      $('#c-num').focus();
    } catch { g('cep', 'Não foi possível buscar o CEP agora. Preencha o endereço à mão.', false); }
  });

  const listar = () => { $('#cad-redes').innerHTML = redes.map((x, i) => `<li><abbr>${CIC.REDES[x.rede].sigla}</abbr><span><b>${esc(CIC.REDES[x.rede].nome)}</b><code>${esc(x.id)}</code></span><button type="button" class="bt peq sec" data-i="${i}">Remover</button></li>`).join(''); };
  $('#cad-redes').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { redes.splice(+b.dataset.i, 1); listar(); } });
  const f = T.formRede((n) => {
    if (n.rede === 'whatsapp') { CIC.aviso('O WhatsApp sai do celular informado acima.'); return; }
    if (redes.some((x) => x.rede === n.rede)) { CIC.aviso('Esta rede já está na lista.'); return; }
    const dup = CIC.duplicado({ redes: [n] }); if (dup) { CIC.aviso(`A conta ${esc(n.id)} já está no cadastro de outra pessoa. Cada conta de rede social pertence a uma pessoa só.`); return; }
    redes.push(n); listar();
  });
  $('#cad-form-rede').innerHTML = f.html; f.ligar($('#cad-form-rede'));
  $('#cad-form-rede .fr-rede').value = 'instagram'; $('#cad-form-rede .fr-rede').dispatchEvent(new Event('change'));

  $('#cad').addEventListener('submit', (e) => {
    e.preventDefault(); const erro = $('#cad-erro'); erro.textContent = '';
    const falha = (msg, foco) => { erro.textContent = msg; foco?.focus(); };
    const nome = N.nome(nomeIn.value); if (nome.erro) return falha(nome.erro, nomeIn);
    const cel = N.celular(pais.value, tel.value); if (cel.erro) return falha(cel.erro, tel);
    if (!cidade) return falha('Escolha a cidade na lista: digite o nome e toque na cidade certa.', $('#c-cidade'));
    const em = N.email(email.value); if (em.erro) { $('.opcionais').open = true; return falha(em.erro, email); }
    const cp = N.cpf(cpf.value); if (cp.erro) { $('.opcionais').open = true; return falha(cp.erro, cpf); }
    const ce = N.cep(cep.value); if (ce.erro) { $('.opcionais').open = true; return falha(ce.erro, cep); }
    if (!e.target.c1.checked) return falha('Para entrar na rede, autorize a campanha a falar com você.', e.target.c1);
    const dup = CIC.duplicado({ e164: cel.e164, email: em.valor, cpf: cp.valor, redes });
    if (dup) {
      const msg = { celular: `Este celular já tem cadastro. Cada celular entra uma vez só, e a indicação continua com quem trouxe primeiro. O link desta pessoa: ${CIC.linkMarca(dup.p)}`,
        email: 'Este e-mail já está no cadastro de outra pessoa.', cpf: 'Este CPF já está no cadastro de outra pessoa.',
        rede: `A conta ${dup.rede?.id} já está no cadastro de outra pessoa.` }[dup.campo];
      return falha(msg, dup.campo === 'celular' ? tel : null);
    }
    const rua = $('#c-rua').value.trim().replace(/\s+/g, ' '), num = N.digitos($('#c-num').value) || $('#c-num').value.trim(), comp = $('#c-comp').value.trim(), bairro = $('#c-bairro').value.trim().replace(/\s+/g, ' ');
    const endereco = ce.valor || rua ? { cep: ce.valor, logradouro: rua, numero: num, complemento: comp, bairro } : null;
    const p = { id: 300000 + CIC.s.extras.length, cod: (Date.now() % 2176782336).toString(36).toUpperCase().padStart(6, 'Q').slice(-6), nome: nome.valor,
      tel: cel.nacional, e164: cel.e164, ddi: pais.value, mun: cidade.cod, uf: cidade.uf, email: em.valor, cpf: cp.valor, endereco,
      pai: ref.id, entrada: Date.now(), papel: 'apoiador', canal: 'Link de convite', status: 'pendente',
      redes: [{ rede: 'whatsapp', id: cel.e164, url: 'https://wa.me/' + cel.e164.slice(1), verif: false }, ...redes], consContato: true, consPartido: !!e.target.c2.checked, acoes: 0, acoesOk: 0, sim: false, real: true };
    CIC.s.extras.push(p); CIC.indexar(); CIC.audit('Novo cadastro pelo link', ref.cod, `celular ${cel.e164}`); CIC.gravar();
    const link = CIC.linkPessoal(p);
    main.innerHTML = `<div class="cad"><header class="cad-topo"><div class="marca-cad">${CIC.SIMBOLO}<b>Multiplica</b></div><p class="rotulo">Cadastro feito</p><h1>Agora é sua vez, ${esc(nome.valor.split(' ')[0])}.</h1>
      <p>Você entrou pelo convite de ${esc(quem)}. Mande o seu link para quem você conhece. Cada pessoa que entrar por ele fica ligada a você.</p></header>
      <div class="cartao link-pessoal"><div><p class="rotulo">Seu link</p><span class="link-marca">${esc(CIC.linkMarca(p))}</span><p class="link-nota">No exemplo, o botão copia o link desta demonstração.</p>
      <div class="pilha-h" style="margin-top:10px"><a class="bt" href="https://wa.me/?text=${encodeURIComponent(CIC.textoConvite(link))}" target="_blank" rel="noopener">Multiplique aí</a><button class="bt sec" data-copiar="${esc(link)}">Copiar link</button></div></div><div class="qr">${CIC.qr(link)}</div></div>
      <div class="cartao gravado"><p class="rotulo">Como o seu cadastro ficou gravado</p><dl class="dados">
        <div><dt>Nome</dt><dd>${esc(p.nome)}</dd></div><div><dt>Celular</dt><dd>${esc(cel.rotulo)}</dd></div><div><dt>Cidade</dt><dd>${esc(cidade.nome)} - ${esc(cidade.uf)}</dd></div>
        ${p.email ? `<div><dt>E-mail</dt><dd>${esc(p.email)}</dd></div>` : ''}${p.cpf ? `<div><dt>CPF</dt><dd>${esc(cp.rotulo)}</dd></div>` : ''}${endereco ? `<div><dt>Endereço</dt><dd>${esc([endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, endereco.cep ? N.cep(endereco.cep).rotulo : ''].filter(Boolean).join(', '))}</dd></div>` : ''}
        ${redes.length ? `<div><dt>Redes</dt><dd>${redes.map((x) => esc(CIC.REDES[x.rede].nome + ' ' + x.id)).join(' · ')}</dd></div>` : ''}</dl></div>
      <p class="cadeia">Você é o <b>${fN.format(p.gen)}º elo</b> desta rede. A campanha vê de quem veio cada convite, até a fonte inicial.</p>
      </div>`;
  });
};
})();
