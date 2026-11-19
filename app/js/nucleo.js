/* Comando Integrado de Campanha, protótipo navegável.
   nucleo.js: formatos, estado, dados de demonstração, rede, índices, regras de alerta e perfis.
   Todos os nomes de pessoas, telefones, contas e valores são fictícios.
   Geografia e população: IBGE (malhas municipais e Censo 2022). */
'use strict';

const CIC = (window.CIC = {});

/* ---------- formatos pt-BR ---------- */
const fN = new Intl.NumberFormat('pt-BR');
const fP = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fD = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fDA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fDH = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const DIA = 86400000;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rngDe(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function codigoDe(n) { return (n * 2654435761 >>> 0).toString(36).toUpperCase().padStart(6, 'K').slice(-6); }
function iniciais(nome) { const p = String(nome).split(' ').filter(Boolean); return (p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : ''); }
function fmtTel(d) { return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; }
Object.assign(CIC, { fN, fP, fR, fD, fDA, fDH, DIA, esc, clamp, rngDe, hashStr, iniciais, fmtTel });

/* ---------- armazenamento local (só conveniência do protótipo) ---------- */
const CHAVE = 'cic.prototipo.v3';
CIC.ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; } };
CIC.gravar = () => {
  try {
    const s = CIC.s;
    CIC.guardarAtual();
    localStorage.setItem(CHAVE, JSON.stringify({ perfil: s.perfil, camp: s.camp, uf: s.uf, sim: s.sim, store: s.store, auditoria: s.auditoria.slice(0, 2000) }));
  } catch { /* navegador sem armazenamento: o protótipo segue sem gravar */ }
};
CIC.apagarTudo = () => { try { localStorage.removeItem(CHAVE); } catch {} };

/* ---------- redes sociais: catálogo e normalização ---------- */
function regraConta(padraoUrl, padraoId, montarUrl, opcoes = {}) {
  return (valor) => {
    let v = String(valor || '').trim();
    if (!v) return { erro: 'Preencha a conta.' };
    const m = v.match(padraoUrl);
    if (m) v = m[1];
    else if (/^https?:\/\//i.test(v) || /\.(com|net|me)\//i.test(v)) return { erro: 'O link não é desta rede. Confira a rede escolhida.' };
    v = v.replace(/^@/, '').replace(/[/?#].*$/, '');
    if (opcoes.minusculo) v = v.toLowerCase();
    if (!padraoId.test(v)) return { erro: opcoes.msg || 'Formato de conta inválido.' };
    return { id: (opcoes.semArroba ? '' : '@') + v, url: montarUrl(v) };
  };
}
CIC.REDES = {
  whatsapp: { nome: 'WhatsApp', sigla: 'WA', dica: 'Número com DDD. Pode colar com ou sem +55, espaço ou traço.', exemplo: '(11) 91234-5678',
    norm(v) { const d = String(v || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); if (!/^\d{10,11}$/.test(d)) return { erro: 'Digite o DDD e o número: 10 ou 11 dígitos.' }; return { id: '+55' + d, rotulo: fmtTel(d), url: 'https://wa.me/55' + d }; } },
  instagram: { nome: 'Instagram', sigla: 'IG', dica: 'Nome de usuário (com ou sem @) ou o link do perfil.', exemplo: '@maria.silva',
    norm: regraConta(/instagram\.com\/([A-Za-z0-9._]+)/i, /^[a-z0-9._]{1,30}$/, (u) => `https://www.instagram.com/${u}/`, { minusculo: true, msg: 'Use até 30 letras, números, ponto ou sublinhado.' }) },
  facebook: { nome: 'Facebook', sigla: 'FB', dica: 'Copie o link do perfil no aplicativo: Perfil > ... > Copiar link.', exemplo: 'facebook.com/maria.silva',
    norm(v) {
      const s = String(v || '').trim();
      const id = s.match(/profile\.php\?id=(\d{5,20})/); if (id) return { id: 'id:' + id[1], url: 'https://www.facebook.com/profile.php?id=' + id[1] };
      return regraConta(/(?:facebook|fb)\.com\/([A-Za-z0-9.]+)/i, /^[a-z0-9.]{5,50}$/, (u) => `https://www.facebook.com/${u}`, { minusculo: true, semArroba: true, msg: 'Cole o link do perfil.' })(s);
    } },
  tiktok: { nome: 'TikTok', sigla: 'TT', dica: 'Nome de usuário com @ ou o link do perfil.', exemplo: '@mariasilva',
    norm: regraConta(/tiktok\.com\/@([A-Za-z0-9._]+)/i, /^[a-z0-9._]{2,24}$/, (u) => `https://www.tiktok.com/@${u}`, { minusculo: true, msg: 'Use de 2 a 24 letras, números, ponto ou sublinhado.' }) },
  x: { nome: 'X (Twitter)', sigla: 'X', dica: 'Nome de usuário com @ ou o link do perfil.', exemplo: '@mariasilva',
    norm: regraConta(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i, /^[A-Za-z0-9_]{1,15}$/, (u) => `https://x.com/${u}`, { msg: 'Use até 15 letras, números ou sublinhado.' }) },
  youtube: { nome: 'YouTube', sigla: 'YT', dica: 'Identificador do canal, que começa com @.', exemplo: '@canaldamaria',
    norm: regraConta(/youtube\.com\/@([A-Za-z0-9._-]+)/i, /^[A-Za-z0-9._-]{3,30}$/, (u) => `https://www.youtube.com/@${u}`, { msg: 'Use de 3 a 30 caracteres.' }) },
  threads: { nome: 'Threads', sigla: 'TH', dica: 'O mesmo usuário do Instagram.', exemplo: '@maria.silva',
    norm: regraConta(/threads\.(?:net|com)\/@([A-Za-z0-9._]+)/i, /^[a-z0-9._]{1,30}$/, (u) => `https://www.threads.net/@${u}`, { minusculo: true }) },
  telegram: { nome: 'Telegram', sigla: 'TG', dica: 'Nome de usuário (Configurações > Nome de usuário).', exemplo: '@mariasilva',
    norm: regraConta(/t\.me\/([A-Za-z0-9_]+)/i, /^[A-Za-z0-9_]{5,32}$/, (u) => `https://t.me/${u}`, { msg: 'Use de 5 a 32 letras, números ou sublinhado.' }) },
  linkedin: { nome: 'LinkedIn', sigla: 'IN', dica: 'Link do perfil: linkedin.com/in/seu-nome.', exemplo: 'linkedin.com/in/maria-silva',
    norm: regraConta(/linkedin\.com\/in\/([A-Za-z0-9-]+)/i, /^[a-z0-9-]{3,100}$/, (u) => `https://www.linkedin.com/in/${u}`, { minusculo: true, semArroba: true, msg: 'Cole o link do perfil.' }) },
  kwai: { nome: 'Kwai', sigla: 'KW', dica: 'Nome de usuário com @ ou o link do perfil.', exemplo: '@mariasilva',
    norm: regraConta(/kwai\.com\/@([A-Za-z0-9._]+)/i, /^[A-Za-z0-9._]{2,30}$/, (u) => `https://www.kwai.com/@${u}`) },
};

/* ---------- cargos e unidade territorial ---------- */
CIC.CARGOS = {
  presidente: { nome: 'Presidente da República', sistema: 'majoritário, 2 turnos', unidade: 'Estado e município', abrangencia: 'Brasil', fonte: 'TSE' },
  governador: { nome: 'Governador', sistema: 'majoritário, 2 turnos', unidade: 'Município', abrangencia: 'Estado', fonte: 'TSE' },
  senador: { nome: 'Senador', sistema: 'majoritário, 1 turno', unidade: 'Município', abrangencia: 'Estado', fonte: 'TSE' },
  depfed: { nome: 'Deputado Federal', sistema: 'proporcional (quociente eleitoral)', unidade: 'Município', abrangencia: 'Estado', fonte: 'TSE' },
  depest: { nome: 'Deputado Estadual', sistema: 'proporcional (quociente eleitoral)', unidade: 'Município', abrangencia: 'Estado', fonte: 'TSE' },
  prefeito: { nome: 'Prefeito', sistema: 'majoritário (2 turnos acima de 200 mil eleitores)', unidade: 'Zona, local de votação e bairro', abrangencia: 'Município', fonte: 'TSE' },
  vereador: { nome: 'Vereador', sistema: 'proporcional (quociente eleitoral)', unidade: 'Zona, local de votação e bairro', abrangencia: 'Município', fonte: 'TSE' },
  conselho: { nome: 'Conselho profissional (CREA, CONFEA, OAB, CRM e outros)', sistema: 'regra do regimento eleitoral da entidade', unidade: 'Regional da entidade e município', abrangencia: 'Estado ou Brasil', fonte: 'cadastro de votantes da entidade' },
  interna: { nome: 'Eleição interna (partido, sindicato, associação)', sistema: 'regra do estatuto', unidade: 'Diretório, núcleo ou município', abrangencia: 'livre', fonte: 'lista de filiados' },
};

/* ---------- perfis de acesso ---------- */
CIC.PERFIS = {
  candidato: { nome: 'Candidato', desc: 'Vê tudo da própria campanha.', rotas: '*', mascara: false, financeiro: true },
  coordgeral: { nome: 'Coordenação geral', desc: 'Vê tudo, exceto a aprovação de pagamentos.', rotas: '*', mascara: false, financeiro: 'leitura' },
  coordterr: { nome: 'Coordenação territorial', desc: 'Vê só o grupo do território que coordena. Não vê acordos nem pagamentos.', rotas: ['painel', 'territorio', 'rede', 'contatos', 'liderancas', 'alertas', 'relatorios', 'cadastro'], mascara: false, financeiro: false, travaEscopo: true },
  financeiro: { nome: 'Financeiro e conformidade', desc: 'Registra e aprova acordos e pagamentos. Vê contatos sem dados pessoais.', rotas: ['painel', 'acordos', 'alertas', 'relatorios', 'cadastro'], mascara: true, financeiro: true },
  partido: { nome: 'Partido contratante', desc: 'Vê e abre todas as candidaturas do partido, só para leitura. Dado pessoal só de quem autorizou o partido. Não vê acordos.', rotas: ['painel', 'territorio', 'rede', 'contatos', 'liderancas', 'cenarios', 'alertas', 'relatorios', 'config', 'cadastro'], mascara: true, financeiro: false },
  lideranca: { nome: 'Liderança', desc: 'Vê só a própria rede e o próprio link.', rotas: ['painel', 'rede', 'cadastro'], mascara: false, financeiro: false, soPropriaRede: true },
  analista: { nome: 'Analista', desc: 'Vê números, mapas e cenários. Não vê nenhum dado pessoal.', rotas: ['painel', 'territorio', 'liderancas', 'cenarios', 'alertas', 'relatorios', 'cadastro'], mascara: true, financeiro: false },
};
CIC.pode = (rota) => {
  const s = CIC.s; const p = CIC.PERFIS[s.perfil];
  if (rota === 'partido') return s.perfil === 'partido';
  if (rota === 'auditoria') return ['candidato', 'coordgeral', 'partido'].includes(s.perfil);
  return p.rotas === '*' || p.rotas.includes(rota);
};
CIC.editaConfig = () => ['candidato', 'coordgeral'].includes(CIC.s.perfil);
CIC.USUARIOS = { candidato: 'Titular da candidatura', coordgeral: 'Coordenação geral · usuário 01', coordterr: 'Coordenação territorial · usuário 07', financeiro: 'Financeiro · usuário 03', partido: 'Secretaria do partido · usuário 01', analista: 'Analista · usuário 05' };
CIC.usuarioAtual = () => (CIC.s.perfil === 'lideranca' && CIC.lideres ? 'Liderança ' + CIC.eu().nome : CIC.USUARIOS[CIC.s.perfil]);
CIC.nomeVisivel = (pe) => {
  const p = CIC.PERFIS[CIC.s.perfil];
  if (!p.mascara) return pe.nome;
  if (CIC.s.perfil === 'partido' && pe.consPartido) return pe.nome;
  const partes = pe.nome.split(' ');
  return partes[0][0] + '. ' + partes[partes.length - 1][0] + '.';
};
CIC.telVisivel = (pe) => (CIC.PERFIS[CIC.s.perfil].mascara ? '(••) •••••-' + pe.tel.slice(-2) : fmtTel(pe.tel));

/* ---------- carga de dados do IBGE ---------- */
CIC.carregarBase = async () => {
  const r = await fetch('dados/municipios.json');
  if (!r.ok) throw new Error('Não carregou a lista de municípios.');
  CIC.base = await r.json();
};
CIC.geoCache = {};
CIC.carregarGeo = async (uf) => {
  if (CIC.geoCache[uf]) return CIC.geoCache[uf];
  let g;
  try { const r = await fetch(`dados/geo/${uf}.json`); if (!r.ok) throw 0; g = await r.json(); }
  catch {
    const id = CIC.base.estados.find((e) => e.sigla === uf).id;
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${id}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`);
    g = await r.json();
    g.features.forEach((f) => (f.id = +f.properties.codarea));
  }
  CIC.geoCache[uf] = g;
  return g;
};

/* ---------- geração dos dados de demonstração ---------- */
const NOMES = ['Ana', 'Bruna', 'Carla', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana', 'Larissa', 'Mariana', 'Natália', 'Patrícia', 'Renata', 'Sabrina', 'Tatiane', 'Vanessa', 'Aline', 'Camila', 'Adriano', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gustavo', 'Henrique', 'Igor', 'João', 'Lucas', 'Marcelo', 'Nelson', 'Otávio', 'Paulo', 'Rafael', 'Sérgio', 'Thiago', 'Vítor', 'Wagner'];
const SOBRENOMES = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferraz', 'Gomes', 'Hilário', 'Lacerda', 'Machado', 'Nogueira', 'Oliveira', 'Pacheco', 'Queiroz', 'Ribeiro', 'Siqueira', 'Teixeira', 'Valente', 'Xavier', 'Zanetti', 'Arruda', 'Bastos', 'Campos', 'Duarte', 'Fontes', 'Guerra', 'Leme', 'Moraes', 'Prado', 'Rocha'];
const CANAIS = [['WhatsApp', 0.52], ['Instagram', 0.17], ['QR em evento', 0.12], ['Facebook', 0.07], ['TikTok', 0.05], ['Indicação presencial', 0.07]];
const PROB_REDE = { instagram: 0.46, facebook: 0.31, tiktok: 0.16, x: 0.06, youtube: 0.03, threads: 0.05, telegram: 0.05, linkedin: 0.05, kwai: 0.04 };

function sorteioPeso(r, pares) { let x = r() * pares.reduce((a, p) => a + p[1], 0); for (const p of pares) { x -= p[1]; if (x <= 0) return p[0]; } return pares[pares.length - 1][0]; }

CIC.gerarDemo = (uf, campId = 'c1') => {
  const base = CIC.CAMPANHAS_BASE[campId] || CIC.CAMPANHAS_BASE.c1;
  const r = rngDe(hashStr('demo-' + uf + campId));
  const lista = CIC.base.municipios[uf].map((m) => ({ cod: m[0], nome: m[1], pop: m[2], ri: m[3], riNome: m[4], rint: m[5], rintNome: m[6], eleit: Math.round(m[2] * 0.74) }));
  const mun = new Map(lista.map((m) => [m.cod, m]));
  const porRi = new Map(); lista.forEach((m) => { if (!porRi.has(m.ri)) porRi.set(m.ri, []); porRi.get(m.ri).push(m); });
  const pesos = lista.map((m) => [m.cod, Math.pow(Math.max(m.pop, 800), 0.82)]);
  const capital = lista.reduce((a, b) => (b.pop > a.pop ? b : a));
  const agora = Date.now();
  const pessoas = [];
  let n = 0;
  const nova = (pai, cod, entrada, papel) => {
    const nome = NOMES[Math.floor(r() * NOMES.length)] + ' ' + SOBRENOMES[Math.floor(r() * SOBRENOMES.length)] + (r() < 0.35 ? ' ' + SOBRENOMES[Math.floor(r() * SOBRENOMES.length)] : '');
    const tel = '00' + '9' + String(Math.floor(r() * 1e8)).padStart(8, '0');
    const slug = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ');
    const redes = [{ rede: 'whatsapp', id: '+55' + tel, url: 'https://wa.me/55' + tel, verif: r() < 0.7 }];
    for (const [rd, pr] of Object.entries(PROB_REDE)) if (r() < pr) {
      const u = (slug[0] + (r() < 0.5 ? '.' : '') + slug[slug.length - 1] + (r() < 0.6 ? Math.floor(r() * 99) : '')).slice(0, 24);
      redes.push({ rede: rd, id: rd === 'facebook' || rd === 'linkedin' ? u.replace(/\./g, '-') : '@' + u, url: '', verif: r() < 0.4 });
    }
    const st = r();
    const p = { id: n, cod: codigoDe(n + 1000), nome, tel, mun: cod, pai, entrada, papel, canal: pai == null ? '' : sorteioPeso(r, CANAIS),
      status: st < 0.84 ? 'confirmado' : st < 0.975 ? 'pendente' : 'suspeito', redes, consContato: r() < 0.96, consPartido: r() < 0.55,
      acoes: Math.floor(r() * 30), acoesOk: 0, sim: false };
    p.acoesOk = Math.round(p.acoes * clamp(0.35 + r() * 0.6, 0, 1));
    n++; pessoas.push(p); return p;
  };
  const munPerto = (cod) => {
    const x = r(); const m = mun.get(cod);
    if (x < 0.68) return cod;
    if (x < 0.9) { const v = porRi.get(m.ri); return v[Math.floor(r() * v.length)].cod; }
    return sorteioPeso(r, pesos);
  };
  const cand = nova(null, capital.cod, agora - 170 * DIA, 'candidato');
  cand.nome = base.nome; cand.status = 'confirmado';
  const L = clamp(Math.round(lista.length * 0.1 * base.escala), 12, 80);
  const limite = Math.round(clamp(lista.length * 7, 900, 5200) * base.escala);
  let fila = [];
  for (let i = 0; i < L; i++) {
    const cod = i < 3 ? capital.cod : sorteioPeso(r, pesos);
    const p = nova(cand.id, cod, agora - (60 + r() * 100) * DIA, 'lideranca');
    p.canal = 'Indicação presencial'; p.status = 'confirmado';
    p.forca = Math.exp((r() - 0.35) * 2.2);
    fila.push([p, 1]);
  }
  const media = [0, 5.2, 1.7, 1.05, 0.72, 0.5, 0.32, 0.18];
  while (fila.length && pessoas.length < limite) {
    const prox = [];
    for (const [p, g] of fila) {
      const lambda = (media[g] || 0.1) * (p.forca || 1);
      let k = 0; let L2 = Math.exp(-lambda), pp = 1; do { k++; pp *= r(); } while (pp > L2 && k < 40); k--;
      for (let j = 0; j < k && pessoas.length < limite; j++) {
        const ent = Math.min(agora - r() * 3600000, p.entrada + DIA * 0.5 + (agora - p.entrada) * Math.pow(r(), 1.7) * 0.97);
        const f = nova(p.id, munPerto(p.mun), ent, 'apoiador');
        f.forca = (p.forca || 1) * (0.55 + r() * 0.9);
        prox.push([f, g + 1]);
      }
    }
    fila = prox;
  }
  pessoas.forEach((p) => { if (p.entrada > agora) p.entrada = agora - r() * DIA; });
  // aliados para o cenário de alianças (nomes fictícios)
  const maiores = [...lista].sort((a, b) => b.pop - a.pop).slice(0, 40);
  const aliados = [];
  const cargosAliados = [['Prefeito', 0.55], ['Vereador', 0.3], ['Liderança comunitária', 0.15]];
  for (let i = 0; i < Math.min(18, maiores.length); i++) {
    const m = maiores[Math.floor(r() * maiores.length)];
    const cargo = sorteioPeso(r, cargosAliados);
    const base = Math.round(m.eleit * (cargo === 'Prefeito' ? 0.25 + r() * 0.25 : cargo === 'Vereador' ? 0.004 + r() * 0.01 : 0.002 + r() * 0.004));
    aliados.push({ id: 'a' + i, nome: (cargo === 'Prefeito' ? 'Prefeito(a) aliado(a) ' : cargo === 'Vereador' ? 'Vereador(a) aliado(a) ' : 'Liderança local ') + String.fromCharCode(65 + i), cargo, mun: m.cod, base, forca: ['forte', 'média', 'fraca'][Math.floor(r() * 3)], partido: ['mesmo partido', 'federação', 'outro partido'][Math.floor(r() * 3)] });
  }
  // resultado de referência (eleição anterior, fictício) para dobradinhas
  const ref = {};
  const regioes = [...new Set(lista.map((m) => m.rint))];
  const forcaRegiao = (seed) => { const rr = rngDe(seed); const o = {}; regioes.forEach((x) => (o[x] = 0.3 + rr() * 1.7)); return o; };
  const fN0 = forcaRegiao(hashStr(uf + 'nos'));
  const parceiros = [['Parceiro estadual A', 11], ['Parceiro estadual B', 22], ['Parceiro estadual C', 33]].map(([nome, s]) => ({ nome, forca: forcaRegiao(hashStr(uf + s)) }));
  lista.forEach((m) => {
    const ruido = () => 0.6 + r() * 0.8;
    ref[m.cod] = { nos: Math.round(m.eleit * 0.008 * fN0[m.rint] * ruido()), parceiros: parceiros.map((p) => Math.round(m.eleit * 0.006 * p.forca[m.rint] * ruido())) };
  });
  return { lista, mun, pessoas, aliados, ref, parceiros: parceiros.map((p) => p.nome), capital };
};

/* ---------- acordos de demonstração ---------- */
CIC.OBJETOS = [
  ['coordenacao', 'Coordenação de militância contratada (pessoal de campanha)'],
  ['mobilizacao', 'Mobilização de rua contratada (pessoal de campanha)'],
  ['espaco', 'Cessão ou locação de espaço para comitê ou evento'],
  ['transporte', 'Transporte e combustível para agenda'],
  ['material', 'Produção ou distribuição de material de campanha'],
  ['evento', 'Estrutura de evento (som, palco, alimentação)'],
  ['apoio', 'Apoio político sem valor (compromisso de agenda e indicação)'],
];
CIC.gerarAcordos = (demo) => {
  const r = rngDe(hashStr('acordos-' + CIC.s.uf + CIC.s.camp));
  const lid = demo.pessoas.filter((p) => p.papel === 'lideranca').sort((a, b) => b.id - a.id).slice(0, 24);
  const usuarios = ['Financeiro 1', 'Financeiro 2', 'Coordenação geral'];
  return lid.map((p, i) => {
    const obj = CIC.OBJETOS[Math.floor(r() * CIC.OBJETOS.length)][0];
    const valor = obj === 'apoio' ? 0 : Math.round((800 + r() * 7000) / 50) * 50;
    const pagos = []; let soma = 0; const npag = valor ? Math.floor(r() * 4) : 0;
    for (let k = 0; k < npag && soma < valor; k++) { const v = Math.min(valor - soma, Math.round(valor / 3 / 50) * 50 || valor); soma += v; pagos.push({ data: Date.now() - (40 - k * 12) * DIA, valor: v, forma: r() < 0.88 ? 'PIX' : 'Espécie', comprovante: r() < 0.9 }); }
    const registrou = usuarios[Math.floor(r() * 2)];
    return { id: 'c' + (i + 1), pessoa: p.id, objeto: obj, negociado: valor, pagamentos: pagos, contrato: obj === 'apoio' ? false : r() < 0.88, spce: r() < 0.7,
      registrou, aprovou: i === 5 ? registrou : r() < 0.85 ? (registrou === 'Financeiro 1' ? 'Financeiro 2' : 'Financeiro 1') : null,
      obs: ['Agenda semanal de visitas na região.', 'Inclui 2 eventos de bairro.', 'Pagamento em 3 parcelas após entrega.', 'Compromisso de indicar 30 lideranças locais.', 'Contrato com recibo eleitoral.'][Math.floor(r() * 5)], criado: Date.now() - (60 - i) * DIA };
  });
};

/* ---------- estado ---------- */
/* candidaturas do partido de demonstração (fictícias) */
CIC.PARTIDO = 'Partido Exemplo (fictício)';
CIC.CAMPANHAS_BASE = {
  c1: { nome: 'Candidatura Exemplo', cargo: 'depfed', ufs: ['SP'], escala: 1 },
  c2: { nome: 'Candidatura B', cargo: 'depest', ufs: ['SP'], escala: 0.55 },
  c3: { nome: 'Candidatura C', cargo: 'senador', ufs: ['MG'], escala: 0.8 },
  c4: { nome: 'Candidatura D', cargo: 'depfed', ufs: ['RJ'], escala: 0.45 },
  c5: { nome: 'Candidatura E', cargo: 'governador', ufs: ['BA'], escala: 0.7 },
};
CIC.s = { perfil: 'candidato', camp: 'c1', uf: 'SP', cargo: 'depfed', niveis: ['Região', 'Sub-região', 'Polo'], grupos: [], extras: [], acordos: null, aliados: null, escopo: null, auditoria: [], sim: true, store: {} };
CIC.campAtual = () => CIC.s.store[CIC.s.camp];
CIC.nomeUF = (uf) => CIC.base.estados.find((e) => e.sigla === uf)?.nome || uf;
CIC.audit = (acao, alvo, detalhe) => {
  const s = CIC.s;
  s.auditoria.unshift({ quando: Date.now(), quem: CIC.usuarioAtual(), perfil: CIC.PERFIS[s.perfil].nome, camp: s.camp, campNome: CIC.campAtual()?.nome || '', uf: s.uf, acao, alvo: alvo ?? '', detalhe: detalhe ?? '' });
  CIC.gravar();
};
CIC.auditSistema = (acao, alvo) => { const s = CIC.s; s.auditoria.unshift({ quando: Date.now(), quem: 'Plataforma (automático)', perfil: 'Sistema', camp: s.camp, campNome: CIC.campAtual()?.nome || '', uf: s.uf, acao, alvo: alvo ?? '', detalhe: '' }); };

/* ---------- território: grupos, contenção e cobertura ---------- */
CIC.CORES_GRUPO = 8;
CIC.gruposIBGE = () => {
  const d = CIC.demo; const grupos = [];
  const inter = new Map(); const imed = new Map();
  d.lista.forEach((m) => {
    if (!inter.has(m.rint)) inter.set(m.rint, { id: 'g' + m.rint, nome: m.rintNome, nivel: 0, pai: null, munis: [] });
    inter.get(m.rint).munis.push(m.cod);
    if (!imed.has(m.ri)) imed.set(m.ri, { id: 'g' + m.ri, nome: m.riNome, nivel: 1, pai: 'g' + m.rint, munis: [] });
    imed.get(m.ri).munis.push(m.cod);
  });
  [...inter.values()].forEach((g, i) => { g.cor = i % CIC.CORES_GRUPO; grupos.push(g); });
  [...imed.values()].forEach((g, i) => { g.cor = i % CIC.CORES_GRUPO; grupos.push(g); });
  // um polo de exemplo que atravessa duas sub-regiões, para mostrar o aviso de contenção
  const sub = [...imed.values()].sort((a, b) => b.munis.length - a.munis.length);
  if (sub.length > 1) {
    const a = sub[0]; const vizinho = sub.find((s) => s.pai === a.pai && s !== a) || sub[1];
    grupos.push({ id: 'gpolo1', nome: 'Polo de exemplo', nivel: 2, pai: a.id, cor: 0, munis: [...a.munis.slice(0, 4), ...vizinho.munis.slice(0, 2)] });
  }
  return grupos;
};
CIC.grupo = (id) => CIC.s.grupos.find((g) => g.id === id);
CIC.filhos = (id) => CIC.s.grupos.filter((g) => g.pai === id);
CIC.verificarTerritorio = () => {
  const avisos = [];
  const gs = CIC.s.grupos;
  gs.forEach((g) => {
    if (g.pai) {
      const p = CIC.grupo(g.pai);
      if (!p) { avisos.push({ tipo: 'orfao', grupo: g.id, texto: `"${g.nome}" aponta para um grupo-pai que não existe mais.` }); return; }
      const dentro = new Set(p.munis);
      const fora = g.munis.filter((c) => !dentro.has(c));
      if (fora.length && !g.excecao) avisos.push({ tipo: 'fora', grupo: g.id, fora, texto: `"${g.nome}" tem ${fN.format(fora.length)} município(s) fora de "${p.nome}".` });
    }
  });
  for (let nv = 0; nv < CIC.s.niveis.length; nv++) {
    const visto = new Map();
    gs.filter((g) => g.nivel === nv).forEach((g) => g.munis.forEach((c) => { if (!visto.has(c)) visto.set(c, []); visto.get(c).push(g); }));
    const dup = [...visto.entries()].filter(([, v]) => v.length > 1);
    if (dup.length) {
      const pares = new Map();
      dup.forEach(([c, v]) => { const k = v.map((g) => g.id).sort().join('|'); if (!pares.has(k)) pares.set(k, { gs: v, munis: [] }); pares.get(k).munis.push(c); });
      pares.forEach((x) => { if (!x.gs.every((g) => g.sobreposicaoOk)) avisos.push({ tipo: 'sobre', grupo: x.gs[0].id, fora: x.munis, texto: `${x.gs.map((g) => `"${g.nome}"`).join(' e ')} dividem ${fN.format(x.munis.length)} município(s) no nível ${CIC.s.niveis[nv]}.` }); });
    }
  }
  const nivel0 = new Set(gs.filter((g) => g.nivel === 0).flatMap((g) => g.munis));
  const sem = CIC.demo.lista.filter((m) => !nivel0.has(m.cod));
  if (gs.length && sem.length) avisos.push({ tipo: 'cobertura', grupo: null, fora: sem.map((m) => m.cod), texto: `${fN.format(sem.length)} município(s) não estão em nenhum grupo do nível ${CIC.s.niveis[0]}.` });
  return avisos;
};
CIC.munisEscopo = () => {
  const g = CIC.s.escopo && CIC.grupo(CIC.s.escopo);
  return g ? new Set(g.munis) : null;
};
CIC.nomeEscopo = () => { const g = CIC.s.escopo && CIC.grupo(CIC.s.escopo); return g ? g.nome : CIC.base.estados.find((e) => e.sigla === CIC.s.uf).nome; };

/* ---------- rede: índices por pessoa ---------- */
CIC.todas = () => CIC.demo.pessoas.concat(CIC.s.extras);
CIC.indexar = () => {
  const todas = CIC.todas();
  const porId = new Map(todas.map((p) => [p.id, p]));
  const filhos = new Map(); todas.forEach((p) => { if (p.pai != null) { if (!filhos.has(p.pai)) filhos.set(p.pai, []); filhos.get(p.pai).push(p.id); } });
  const agora = Date.now();
  todas.forEach((p) => { p.gen = 0; p.raiz = null; });
  const ordem = []; const pilha = [CIC.demo.pessoas[0].id];
  while (pilha.length) { const id = pilha.pop(); ordem.push(id); const p = porId.get(id); (filhos.get(id) || []).forEach((f) => { const c = porId.get(f); c.gen = p.gen + 1; c.raiz = p.gen === 0 ? c.id : p.raiz; pilha.push(f); }); }
  for (let i = ordem.length - 1; i >= 0; i--) {
    const p = porId.get(ordem[i]); const fs = filhos.get(p.id) || [];
    p.diretos = fs.length; p.rede = 0; p.conf = 0; p.n14 = 0; p.p14 = 0; p.prof = 0; p.multip = 0; p.munSet = new Set([p.mun]);
    fs.forEach((f) => {
      const c = porId.get(f);
      p.rede += 1 + c.rede; p.conf += (c.status === 'confirmado' ? 1 : 0) + c.conf;
      const idade = agora - c.entrada;
      p.n14 += (idade < 14 * DIA ? 1 : 0) + c.n14; p.p14 += (idade >= 14 * DIA && idade < 28 * DIA ? 1 : 0) + c.p14;
      p.prof = Math.max(p.prof, 1 + c.prof); if (c.diretos > 0) p.multip++;
      c.munSet.forEach((m) => p.munSet.add(m));
    });
    if (p.papel === 'apoiador' && p.diretos >= 5) p.papel = 'lideranca';
  }
  CIC.idx = { porId, filhos };
  CIC.calcularIEL();
};
CIC.PESOS_IEL = { vol: 20, qua: 20, ade: 15, mul: 10, rit: 15, con: 20 };
CIC.calcularIEL = () => {
  const L = CIC.todas().filter((p) => p.papel === 'lideranca' && p.diretos >= 3);
  const comp = (p) => ({
    vol: Math.log1p(p.rede),
    qua: p.rede ? p.conf / p.rede : 0,
    ade: (p.acoesOk + 0.65 * 20) / (p.acoes + 20),
    mul: p.diretos ? p.multip / p.diretos : 0,
    rit: (p.n14 + 1) / (p.p14 + 1),
  });
  const vals = L.map((p) => [p, comp(p)]);
  const chaves = ['vol', 'qua', 'ade', 'mul', 'rit'];
  const pct = {};
  chaves.forEach((k) => { const ord = vals.map((v) => v[1][k]).sort((a, b) => a - b); pct[k] = (x) => { let lo = 0, hi = ord.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ord[m] < x) lo = m + 1; else hi = m; } return ord.length > 1 ? (lo / (ord.length - 1)) * 100 : 50; }; });
  const w = CIC.PESOS_IEL; const soma = chaves.reduce((a, k) => a + w[k], 0);
  vals.forEach(([p, c]) => {
    p.ielComp = {}; chaves.forEach((k) => (p.ielComp[k] = Math.round(pct[k](c[k]))));
    p.iel = Math.round(chaves.reduce((a, k) => a + w[k] * p.ielComp[k], 0) / soma);
    p.ielClasse = p.iel >= 75 ? 'A' : p.iel >= 55 ? 'B' : p.iel >= 35 ? 'C' : 'D';
  });
  CIC.lideres = vals.map((v) => v[0]);
};
CIC.caminho = (id) => { const c = []; let p = CIC.idx.porId.get(id); while (p) { c.unshift(p); p = p.pai == null ? null : CIC.idx.porId.get(p.pai); } return c; };

/* ---------- conjunto no escopo e perfil ---------- */
CIC.noEscopo = () => {
  const ms = CIC.munisEscopo();
  let v = CIC.todas().filter((p) => p.gen > 0 || p.papel === 'candidato');
  v = v.filter((p) => p.papel !== 'candidato');
  if (ms) v = v.filter((p) => ms.has(p.mun));
  if (CIC.PERFIS[CIC.s.perfil].soPropriaRede) {
    const eu = CIC.eu();
    const dentro = new Set(); const pilha = [eu.id];
    while (pilha.length) { const id = pilha.pop(); (CIC.idx.filhos.get(id) || []).forEach((f) => { dentro.add(f); pilha.push(f); }); }
    v = v.filter((p) => dentro.has(p.id));
  }
  return v;
};
CIC.eu = () => CIC.lideres.slice().sort((a, b) => b.rede - a.rede)[2] || CIC.demo.pessoas[1];

/* ---------- limite de referência de contratação (Lei 9.504/1997, art. 100-A) ---------- */
CIC.limiteContratacao = (eleitores) => (eleitores <= 30000 ? Math.floor(eleitores * 0.01) : 300 + Math.floor((eleitores - 30000) / 1000));

/* ---------- regras de alerta ---------- */
CIC.alertas = () => {
  const out = [];
  const v = CIC.noEscopo();
  const add = (sev, regra, texto, rota, quantos) => out.push({ sev, regra, texto, rota, quantos });
  const paradas = CIC.lideres.filter((p) => v.includes(p) && p.rede >= 15 && p.n14 === 0);
  if (paradas.length) add('alerta', 'Liderança parada', `${fN.format(paradas.length)} lideranças com 15 ou mais pessoas na rede não trouxeram nenhum cadastro em 14 dias.`, 'liderancas', paradas.length);
  const susp = v.filter((p) => p.status === 'suspeito');
  if (susp.length) add('grave', 'Cadastro suspeito', `${fN.format(susp.length)} cadastros com sinal de duplicidade ou dado inválido esperam revisão.`, 'contatos?status=suspeito', susp.length);
  const ag = Date.now(); const s7 = v.filter((p) => ag - p.entrada < 7 * DIA).length; const a7 = v.filter((p) => ag - p.entrada >= 7 * DIA && ag - p.entrada < 14 * DIA).length;
  if (a7 && s7 < a7 * 0.8) add('alerta', 'Queda de ritmo', `Cadastros nos últimos 7 dias: ${fN.format(s7)}. Nos 7 dias anteriores: ${fN.format(a7)} (${fP.format((s7 / a7 - 1) * 100)}%).`, 'painel', 1);
  const ms = CIC.munisEscopo(); const cont = new Map(); v.forEach((p) => cont.set(p.mun, (cont.get(p.mun) || 0) + 1));
  const vazios = CIC.demo.lista.filter((m) => (!ms || ms.has(m.cod)) && m.pop >= 50000 && !cont.get(m.cod));
  if (vazios.length) add('alerta', 'Município grande sem rede', `${fN.format(vazios.length)} municípios com 50 mil habitantes ou mais (Censo 2022) não têm nenhum contato.`, 'territorio', vazios.length);
  const terr = CIC.verificarTerritorio();
  terr.filter((a) => a.tipo !== 'cobertura').forEach((a) => add('alerta', a.tipo === 'fora' ? 'Subgrupo fora do grupo-pai' : a.tipo === 'sobre' ? 'Sobreposição de grupos' : 'Grupo sem pai', a.texto, 'territorio', 1));
  const contas = new Map(); v.forEach((p) => p.redes.forEach((rd) => { if (rd.rede === 'whatsapp') return; const k = rd.rede + rd.id; contas.set(k, (contas.get(k) || 0) + 1); }));
  const rep = [...contas.values()].filter((x) => x > 1).length;
  if (rep) add('info', 'Conta de rede social repetida', `${fN.format(rep)} contas de rede social aparecem em mais de um cadastro.`, 'contatos', rep);
  const semCons = v.filter((p) => !p.consContato).length;
  if (semCons) add('info', 'Sem consentimento de contato', `${fN.format(semCons)} contatos não autorizaram mensagens. A plataforma bloqueia o envio para eles.`, 'contatos', semCons);
  if (CIC.PERFIS[CIC.s.perfil].financeiro) {
    const ac = CIC.s.acordos || [];
    const semContrato = ac.filter((a) => !a.contrato && a.pagamentos.length);
    if (semContrato.length) add('critico', 'Pagamento sem contrato', `${fN.format(semContrato.length)} acordos têm pagamento registrado e nenhum contrato anexado.`, 'acordos', semContrato.length);
    const mesmo = ac.filter((a) => a.aprovou && a.aprovou === a.registrou);
    if (mesmo.length) add('critico', 'Aprovação pela mesma pessoa', `${fN.format(mesmo.length)} acordos foram registrados e aprovados pelo mesmo usuário.`, 'acordos', mesmo.length);
    const especie = ac.filter((a) => a.pagamentos.some((p) => p.forma === 'Espécie'));
    if (especie.length) add('grave', 'Pagamento em espécie', `${fN.format(especie.length)} acordos têm pagamento em espécie. Prefira PIX ou transferência identificada.`, 'acordos', especie.length);
    const semComp = ac.filter((a) => a.pagamentos.some((p) => !p.comprovante));
    if (semComp.length) add('grave', 'Pagamento sem comprovante', `${fN.format(semComp.length)} acordos têm pagamento sem comprovante anexado.`, 'acordos', semComp.length);
  }
  const ordem = { critico: 0, grave: 1, alerta: 2, info: 3 };
  return out.sort((a, b) => ordem[a.sev] - ordem[b.sev]);
};

/* ---------- inicialização ---------- */
/* ---------- candidaturas e estados ativos ---------- */
CIC.demos = {};
CIC.demoDe = (camp, uf) => (CIC.demos[camp + uf] = CIC.demos[camp + uf] || CIC.gerarDemo(uf, camp));
CIC.guardarAtual = () => {
  const s = CIC.s; const c = s.store[s.camp]; if (!c) return;
  c.cargo = s.cargo; c.niveis = s.niveis; c.uf = s.uf;
  c.porUF[s.uf] = { grupos: s.grupos, extras: s.extras, acordos: s.acordos, aliados: s.aliados };
};
CIC.ativar = (campId, uf) => {
  const s = CIC.s;
  CIC.guardarAtual();
  if (!s.store[campId]) { const b = CIC.CAMPANHAS_BASE[campId]; s.store[campId] = { nome: b.nome, cargo: b.cargo, ufs: b.ufs.slice(), uf: b.ufs[0], niveis: ['Região', 'Sub-região', 'Polo'], porUF: {} }; }
  const c = s.store[campId];
  if (!uf || !c.ufs.includes(uf)) uf = c.ufs.includes(c.uf) ? c.uf : c.ufs[0];
  const mudou = campId !== s.camp || uf !== s.uf;
  s.camp = campId; s.uf = uf; s.cargo = c.cargo; s.niveis = c.niveis;
  CIC.demo = CIC.demoDe(campId, uf);
  const d = c.porUF[uf];
  if (d) { s.grupos = d.grupos; s.extras = d.extras; s.acordos = d.acordos; s.aliados = d.aliados; }
  else { s.grupos = CIC.gruposIBGE(); s.extras = []; s.acordos = null; s.aliados = null; CIC.auditSistema('Montou a divisão inicial pelas regiões do IBGE', CIC.nomeUF(uf)); }
  if (mudou || (s.escopo && !CIC.grupo(s.escopo))) s.escopo = null;
  CIC.indexar();
  if (!s.acordos) s.acordos = CIC.gerarAcordos(CIC.demo);
  if (!s.aliados) s.aliados = CIC.demo.aliados;
  CIC.gravar();
};

/* resumo de uma candidatura, para o painel do partido */
CIC.resumoCamp = (campId) => {
  const s = CIC.s; const c = s.store[campId] || { ...CIC.CAMPANHAS_BASE[campId], porUF: {} };
  const ufs = c.ufs; const ag = Date.now();
  const out = { id: campId, nome: c.nome, cargo: c.cargo, ufs, total: 0, d7: 0, p7: 0, d1: 0, lid: 0, ativos: 0, munRede: 0, munTotal: 0, susp: 0, meta: 0, serie: new Array(61).fill(0) };
  ufs.forEach((uf) => {
    const d = CIC.demoDe(campId, uf);
    const extras = campId === s.camp && uf === s.uf ? s.extras : (c.porUF?.[uf]?.extras || []);
    const P = d.pessoas.slice(1).concat(extras);
    const filhos = new Map(); P.forEach((p) => filhos.set(p.pai, (filhos.get(p.pai) || 0) + 1));
    const rec = new Set(P.filter((p) => ag - p.entrada < 14 * DIA).map((p) => p.pai));
    const L = P.filter((p) => p.pai === d.pessoas[0].id || (filhos.get(p.id) || 0) >= 5);
    out.total += P.length;
    out.d7 += P.filter((p) => ag - p.entrada < 7 * DIA).length;
    out.p7 += P.filter((p) => ag - p.entrada >= 7 * DIA && ag - p.entrada < 14 * DIA).length;
    out.d1 += P.filter((p) => ag - p.entrada < DIA).length;
    out.lid += L.length; out.ativos += L.filter((p) => rec.has(p.id)).length;
    out.munRede += new Set(P.map((p) => p.mun)).size; out.munTotal += d.lista.length;
    out.susp += P.filter((p) => p.status === 'suspeito').length;
    out.meta += Math.ceil((d.pessoas.length * 1.5) / 1000) * 1000;
    P.forEach((p) => { const k = Math.floor((ag - p.entrada) / DIA); const ini = k > 60 ? 0 : 60 - k; for (let i = ini; i <= 60; i++) out.serie[i]++; });
  });
  return out;
};

/* ---------- inicialização ---------- */
CIC.iniciar = async () => {
  await CIC.carregarBase();
  const salvo = CIC.ler();
  const s = CIC.s;
  if (salvo && salvo.store) { s.store = salvo.store; s.perfil = salvo.perfil || 'candidato'; s.auditoria = salvo.auditoria || []; s.sim = salvo.sim !== false; }
  const camp = salvo?.camp || 'c1'; const uf = salvo?.uf;
  s.camp = null;
  CIC.ativar(s.perfil === 'partido' ? camp : 'c1', uf);
};
