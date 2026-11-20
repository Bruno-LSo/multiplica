/* telas4.js: Entrar, Equipe e acessos (administrador da campanha) e Acessos das campanhas (partido). */
'use strict';
(() => {
const { $, fN, fDH, esc, T } = CIC;

const senhaProvisoria = () => { const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let o = ''; for (let i = 0; i < 8; i++) o += c[Math.floor(Math.random() * c.length)]; return o.slice(0, 4) + '-' + o.slice(4); };
const auditCamp = (camp, acao, alvo, detalhe) => {
  const s = CIC.s;
  s.auditoria.unshift({ quando: Date.now(), quem: CIC.usuarioAtual(), perfil: CIC.PERFIS[s.perfil]?.nome || '-', camp, campNome: (s.store[camp] || CIC.CAMPANHAS_BASE[camp]).nome, uf: '', acao, alvo: alvo ?? '', detalhe: detalhe ?? '' });
  CIC.gravar();
};
const mostrarCredencial = (u, senha, quem) => CIC.dialogo(`<p class="rotulo">Acesso criado</p><h2>Entregue estes dados a ${esc(u.nome)}</h2>
  <dl class="dados credencial"><div><dt>Login</dt><dd><code>${esc(u.login)}</code></dd></div><div><dt>Senha provisória</dt><dd><code>${esc(senha)}</code></dd></div></dl>
  <p>${esc(quem)} No primeiro acesso, a pessoa cria a própria senha e liga o código pelo celular.</p>
  <div class="acoes-dl"><button class="bt" data-copiar="${esc(`Login: ${u.login}\nSenha provisória: ${senha}`)}">Copiar os dados</button><button class="bt sec" data-fechar>Fechar</button></div>`);

/* ---------- ENTRAR ---------- */
T.entrar = (main) => {
  const s = CIC.s;
  const camps = Object.keys(CIC.CAMPANHAS_BASE).map((k) => { if (!s.store[k]) s.store[k] = CIC.novaCamp(k); return [k, s.store[k]]; });
  main.innerHTML = `<div class="entrar">
    <header class="cad-topo"><p class="rotulo">Comando Integrado de Campanha</p><h1>Entrar</h1><p>Use o login e a senha que você recebeu. Cada login abre só a campanha da pessoa.</p></header>
    <form class="form" id="f-entrar" novalidate>
      <label>Login<input name="login" autocomplete="username" placeholder="nome@campanha"></label>
      <label>Senha<input name="senha" type="password" autocomplete="current-password" placeholder="Na demonstração, qualquer senha entra"></label>
      <p class="erro" id="e-erro" role="alert"></p>
      <button class="bt grande">Entrar</button>
    </form>
    <section class="demo-usuarios"><h2>Usuários de demonstração</h2><p class="ajuda">Toque em um nome para entrar como essa pessoa. Na versão real, cada pessoa entra com o próprio login, senha e código no celular.</p>
      <div class="cartao-usu"><h3>${esc(CIC.PARTIDO)}</h3><button class="usu" data-camp="partido" data-id="partido"><b>Secretaria do partido</b><small>Partido · vê os números de todas as campanhas</small></button></div>
      ${camps.map(([k, c]) => `<div class="cartao-usu"><h3>${esc(c.nome)} <small>${esc(CIC.CARGOS[c.cargo].nome)}</small></h3>
        ${c.equipe.length ? c.equipe.map((u) => `<button class="usu" data-camp="${k}" data-id="${u.id}"><b>${esc(u.nome)}</b><small>${esc(c.perfis[u.perfil]?.nome || u.perfil)} · ${esc(u.login)}</small></button>`).join('') : '<p class="vazio">Ainda sem acesso. O partido cria o primeiro administrador.</p>'}</div>`).join('')}
    </section></div>`;
  main.querySelector('.demo-usuarios').addEventListener('click', (e) => { const b = e.target.closest('.usu'); if (b) CIC.entrar(b.dataset.camp, b.dataset.id); });
  $('#f-entrar').addEventListener('submit', (e) => {
    e.preventDefault(); const login = String(new FormData(e.target).get('login')).trim().toLowerCase();
    const achou = camps.map(([k, c]) => [k, c.equipe.find((u) => u.login === login)]).find((x) => x[1]);
    if (achou) CIC.entrar(achou[0], achou[1].id); else $('#e-erro').textContent = 'Login não encontrado. Confira o que você digitou ou toque em um nome abaixo.';
  });
};

/* ---------- EQUIPE E ACESSOS (administrador da campanha) ---------- */
T.equipe = (main) => {
  const s = CIC.s; const c = CIC.campAtual();
  const podeMudar = CIC.PERFIS[s.perfil].rotas.includes('equipe');
  const regioes = s.grupos.filter((g) => g.nivel === 0).sort((a, b) => a.nome.localeCompare(b.nome));
  const admins = () => c.equipe.filter((u) => u.perfil === 'admin');
  const salvar = (acao, alvo, detalhe) => { CIC.aplicarPerfis(); CIC.audit(acao, alvo, detalhe); CIC.gravar(); T.equipe(main); CIC.montarTopo(); };
  const opcoesPerfil = (sel) => Object.entries(c.perfis).map(([k, p]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(p.nome)}</option>`).join('');
  const opcoesRegiao = (sel) => regioes.map((g) => `<option value="${g.id}" ${g.id === sel ? 'selected' : ''}>${esc(g.nome)}</option>`).join('');
  main.innerHTML = `${CIC.cabecalho('Equipe e acessos', 'Quem entra na campanha e o que vê', 'Dê acesso a uma pessoa e escolha o perfil dela. O perfil decide as telas que ela abre. Só esta campanha aparece aqui: o partido e as outras campanhas não veem a sua equipe.',
    '<div class="cab-acoes"><button class="bt" id="novo-usu">Dar acesso a uma pessoa</button></div>')}
  <section class="cartao"><header><h2>Pessoas com acesso</h2><p>${fN.format(c.equipe.length)} pessoas. ${fN.format(admins().length)} administradores.</p></header>
    <div class="tab-rolagem"><table class="tab"><thead><tr><th>Pessoa</th><th>Perfil</th><th>Região</th><th>Criado por</th><th></th></tr></thead><tbody>
    ${c.equipe.map((u) => `<tr data-u="${u.id}"><td><b>${esc(u.nome)}</b><small>${esc(u.login)}${u.id === s.usuario.id ? ' · você' : ''}</small></td>
      <td><select class="u-perfil" aria-label="Perfil de ${esc(u.nome)}">${opcoesPerfil(u.perfil)}</select></td>
      <td>${c.perfis[u.perfil]?.travaEscopo ? `<select class="u-regiao" aria-label="Região de ${esc(u.nome)}"><option value="">Escolha a região</option>${opcoesRegiao(u.regiao)}</select>` : '<span class="pend">todas</span>'}</td>
      <td>${esc(u.criadoPor || '-')}</td><td class="n">${u.id === s.usuario.id ? '' : '<button class="bt sec peq u-tirar">Tirar acesso</button>'}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="cartao mt"><header><h2>Perfis e o que cada um vê</h2><p>Marque as telas de cada perfil. A mudança vale na hora para todas as pessoas do perfil. O perfil Administrador vê tudo e não muda, para a campanha nunca ficar sem quem administre.</p></header>
    <div class="perfis-grade">${Object.entries(c.perfis).map(([k, p]) => { const n = c.equipe.filter((u) => u.perfil === k).length; return `<article class="perfil-cartao" data-p="${k}">
      <header><h3>${esc(p.nome)}</h3><small>${fN.format(n)} ${n === 1 ? 'pessoa' : 'pessoas'}</small></header><p class="ajuda">${esc(p.desc || '')}</p>
      <fieldset><legend>Telas</legend>${CIC.AREAS.map(([a, nome]) => `<label class="marca"><input type="checkbox" data-area="${a}" ${p.rotas.includes(a) ? 'checked' : ''} ${p.fixo || a === 'painel' ? 'disabled' : ''}> ${esc(nome)}</label>`).join('')}</fieldset>
      <fieldset><legend>Regras</legend>${CIC.OPCOES_PERFIL.map(([o, nome, dica]) => `<label class="marca" title="${esc(dica)}"><input type="checkbox" data-op="${o}" ${p[o] ? 'checked' : ''} ${p.fixo ? 'disabled' : ''}> ${esc(nome)}</label>`).join('')}</fieldset>
      ${p.fixo ? '' : `<button class="bt sec peq p-apagar" ${n ? 'disabled title="Mude o perfil das pessoas antes"' : ''}>Apagar perfil</button>`}</article>`; }).join('')}
      <button class="perfil-novo" id="novo-perfil"><b>Criar perfil</b><small>Por exemplo: Jurídico, Comunicação, Agenda</small></button></div></section>`;
  if (!podeMudar) return;
  main.querySelectorAll('.u-perfil').forEach((sel) => sel.addEventListener('change', () => {
    const u = c.equipe.find((x) => x.id === sel.closest('tr').dataset.u);
    if (u.perfil === 'admin' && admins().length === 1) { sel.value = 'admin'; CIC.aviso('A campanha precisa de 1 administrador pelo menos. Crie outro antes de mudar este.'); return; }
    if (u.id === s.usuario.id && u.perfil === 'admin') { sel.value = 'admin'; CIC.aviso('Você não pode tirar o próprio perfil de administrador. Peça a outro administrador.'); return; }
    const antes = c.perfis[u.perfil].nome; u.perfil = sel.value; salvar('Mudou o perfil de um usuário', u.nome, `${antes} para ${c.perfis[u.perfil].nome}`);
  }));
  main.querySelectorAll('.u-regiao').forEach((sel) => sel.addEventListener('change', () => {
    const u = c.equipe.find((x) => x.id === sel.closest('tr').dataset.u); u.regiao = sel.value || null; salvar('Mudou a região de um usuário', u.nome, CIC.grupo(u.regiao)?.nome || '');
  }));
  main.querySelectorAll('.u-tirar').forEach((b) => b.addEventListener('click', () => {
    const u = c.equipe.find((x) => x.id === b.closest('tr').dataset.u);
    if (u.perfil === 'admin' && admins().length === 1) { CIC.aviso('A campanha precisa de 1 administrador pelo menos.'); return; }
    CIC.dialogo(`<p class="rotulo">Confirmar</p><h2>Tirar o acesso de ${esc(u.nome)}?</h2><p>A pessoa sai do sistema na hora e não entra mais. O histórico do que ela fez continua guardado.</p><div class="acoes-dl"><button class="bt perigo-cheio" id="dl-ok">Tirar o acesso</button><button class="bt sec" data-fechar>Cancelar</button></div>`,
      (el, fechar) => el.querySelector('#dl-ok').addEventListener('click', () => { fechar(); c.equipe = c.equipe.filter((x) => x !== u); salvar('Tirou o acesso de um usuário', u.nome, u.login); }));
  }));
  main.querySelectorAll('.perfil-cartao input').forEach((i) => i.addEventListener('change', () => {
    const k = i.closest('.perfil-cartao').dataset.p; const p = c.perfis[k];
    if (i.dataset.area) { p.rotas = i.checked ? [...new Set([...p.rotas, i.dataset.area])] : p.rotas.filter((x) => x !== i.dataset.area); salvar(i.checked ? 'Deu acesso a uma tela' : 'Tirou acesso a uma tela', p.nome, CIC.AREAS.find((a) => a[0] === i.dataset.area)[1]); }
    else { p[i.dataset.op] = i.checked; salvar('Mudou uma regra do perfil', p.nome, `${CIC.OPCOES_PERFIL.find((o) => o[0] === i.dataset.op)[1]}: ${i.checked ? 'sim' : 'não'}`); }
  }));
  main.querySelectorAll('.p-apagar').forEach((b) => b.addEventListener('click', () => { const k = b.closest('.perfil-cartao').dataset.p; const nome = c.perfis[k].nome; delete c.perfis[k]; salvar('Apagou um perfil', nome); }));
  $('#novo-perfil').addEventListener('click', () => CIC.dialogo(`<p class="rotulo">Criar perfil</p><h2>Novo perfil</h2>
    <form class="form" id="np"><label>Nome do perfil<input name="nome" required placeholder="Por exemplo: Jurídico"></label>
    <label>Começar igual a<select name="base">${opcoesPerfil('coord')}</select></label><p class="ajuda">Depois, marque e desmarque as telas no cartão do perfil.</p>
    <div class="acoes-dl"><button class="bt">Criar</button><button type="button" class="bt sec" data-fechar>Cancelar</button></div></form>`,
    (el, fechar) => el.querySelector('#np').addEventListener('submit', (e) => {
      e.preventDefault(); const fd = new FormData(e.target); const nome = String(fd.get('nome')).trim(); if (!nome) return;
      const base = c.perfis[fd.get('base')]; const k = 'p' + Date.now().toString(36);
      c.perfis[k] = { ...JSON.parse(JSON.stringify(base)), nome, desc: `Criado pela campanha a partir de ${base.nome}.`, fixo: false };
      fechar(); salvar('Criou um perfil', nome, `a partir de ${base.nome}`);
    })));
  $('#novo-usu').addEventListener('click', () => CIC.dialogo(`<p class="rotulo">Dar acesso</p><h2>Nova pessoa na equipe</h2>
    <form class="form" id="nu"><label>Nome<input name="nome" required autocomplete="off"></label>
    <label>Perfil<select name="perfil">${opcoesPerfil('coord')}</select></label>
    <label id="nu-reg" hidden>Região<select name="regiao">${opcoesRegiao()}</select></label>
    <p class="erro" id="nu-erro" role="alert"></p>
    <div class="acoes-dl"><button class="bt">Criar acesso</button><button type="button" class="bt sec" data-fechar>Cancelar</button></div></form>`,
    (el, fechar) => {
      const f = el.querySelector('#nu'); const reg = () => { el.querySelector('#nu-reg').hidden = !c.perfis[f.perfil.value].travaEscopo; }; reg();
      f.perfil.addEventListener('change', reg);
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const nome = f.nome.value.trim().replace(/\s+/g, ' ');
        if (nome.split(' ').length < 2) { el.querySelector('#nu-erro').textContent = 'Digite nome e sobrenome.'; return; }
        let login = CIC.loginDe(nome, s.camp); let i = 2; while (c.equipe.some((u) => u.login === login)) login = login.replace(/(\d*)@/, `${i++}@`);
        const u = { id: s.camp + 'u' + Date.now().toString(36), nome, perfil: f.perfil.value, login, criadoPor: CIC.usuarioAtual(), regiao: c.perfis[f.perfil.value].travaEscopo ? f.regiao.value : null };
        c.equipe.push(u); fechar(); salvar('Deu acesso a uma pessoa', nome, `${c.perfis[u.perfil].nome} · ${login}`);
        setTimeout(() => mostrarCredencial(u, senhaProvisoria(), 'Entregue por um canal seguro, nunca em grupo.'), 200);
      });
    }));
};

/* ---------- ACESSOS DAS CAMPANHAS (partido) ---------- */
T.acessos = (main) => {
  const s = CIC.s;
  const camps = Object.keys(CIC.CAMPANHAS_BASE).map((k) => { if (!s.store[k]) s.store[k] = CIC.novaCamp(k); return [k, s.store[k]]; });
  main.innerHTML = `${CIC.cabecalho('Acessos das campanhas', 'O primeiro administrador de cada campanha', 'O partido cria só o primeiro administrador. Depois, cada campanha cuida da própria equipe. O partido não vê, não cria e não muda os outros usuários da campanha.')}
  <section class="cartao"><div class="tab-rolagem"><table class="tab"><thead><tr><th>Campanha</th><th>Estados</th><th>Primeiro administrador</th><th>Situação</th><th></th></tr></thead><tbody>
  ${camps.map(([k, c]) => { const a = c.equipe.find((u) => u.criadoPor === 'Partido') || c.equipe.find((u) => u.perfil === 'admin');
    return `<tr><td><b>${esc(c.nome)}</b><small>${esc(CIC.CARGOS[c.cargo].nome)}</small></td><td>${c.ufs.map(esc).join(', ')}</td>
    <td>${a ? `<b>${esc(a.nome)}</b><small>${esc(a.login)}</small>` : '<span class="pend">ainda não criado</span>'}</td>
    <td>${a ? 'A campanha cuida da equipe' : '<span class="ruim">Sem acesso</span>'}</td>
    <td class="n">${a ? '' : `<button class="bt peq" data-criar="${k}">Criar o primeiro administrador</button>`}</td></tr>`; }).join('')}</tbody></table></div>
  <p class="ajuda">Esqueceu a senha? O próprio administrador pede uma nova pelo e-mail. O partido não troca senha de ninguém.</p></section>`;
  main.querySelectorAll('[data-criar]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.criar; const c = s.store[k];
    CIC.dialogo(`<p class="rotulo">${esc(c.nome)}</p><h2>Criar o primeiro administrador</h2><p>Em geral, o próprio candidato ou o coordenador geral. Ele cria o resto da equipe.</p>
      <form class="form" id="pa"><label>Nome<input name="nome" required autocomplete="off"></label><p class="erro" id="pa-erro" role="alert"></p>
      <div class="acoes-dl"><button class="bt">Criar</button><button type="button" class="bt sec" data-fechar>Cancelar</button></div></form>`,
      (el, fechar) => el.querySelector('#pa').addEventListener('submit', (e) => {
        e.preventDefault(); const nome = e.target.nome.value.trim().replace(/\s+/g, ' ');
        if (nome.split(' ').length < 2) { el.querySelector('#pa-erro').textContent = 'Digite nome e sobrenome.'; return; }
        const u = { id: k + 'u' + Date.now().toString(36), nome, perfil: 'admin', login: CIC.loginDe(nome, k), criadoPor: 'Partido' };
        c.equipe.push(u); auditCamp(k, 'Partido criou o primeiro administrador', nome, u.login); fechar(); T.acessos(main);
        setTimeout(() => mostrarCredencial(u, senhaProvisoria(), 'Entregue ao administrador por um canal seguro.'), 200);
      }));
  }));
};
})();
