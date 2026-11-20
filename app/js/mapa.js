/* mapa.js: mapa municipal em SVG (d3-geo), com zoom, seleção por clique,
   seleção em área (Shift + arrastar), rótulos de grupo e dica ao passar o mouse. */
'use strict';

CIC.ajustarSentido = (geo) => {
  geo.features.forEach((f) => {
    if (f._ok) return;
    if (d3.geoArea(f) > 2 * Math.PI) {
      const g = f.geometry;
      if (g.type === 'Polygon') g.coordinates.forEach((r) => r.reverse());
      else g.coordinates.forEach((p) => p.forEach((r) => r.reverse()));
    }
    f._ok = true;
  });
  return geo;
};

CIC.dica = (() => {
  let el;
  const garantir = () => { if (!el) { el = document.createElement('div'); el.className = 'dica'; el.setAttribute('role', 'tooltip'); document.body.appendChild(el); } return el; };
  return {
    mostrar(html, ev) {
      const d = garantir(); d.innerHTML = html; d.style.opacity = '1';
      const w = d.offsetWidth, h = d.offsetHeight;
      let x = ev.clientX + 14, y = ev.clientY + 14;
      if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
      if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
      d.style.transform = `translate(${x}px, ${y}px)`;
    },
    esconder() { if (el) el.style.opacity = '0'; },
  };
})();

CIC.Mapa = class {
  constructor(el, op = {}) { this.el = el; this.op = op; this.paths = new Map(); }
  async desenhar(uf) {
    const geo = CIC.ajustarSentido(await CIC.carregarGeo(uf));
    this.geo = geo;
    const w = this.el.clientWidth || 600, h = this.el.clientHeight || 480;
    this.el.innerHTML = '';
    const svg = d3.select(this.el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('width', '100%').attr('height', '100%').attr('role', 'img').attr('aria-label', 'Mapa dos municípios');
    this.svg = svg;
    const proj = d3.geoMercator().fitExtent([[10, 10], [w - 10, h - 10]], geo);
    const path = d3.geoPath(proj);
    this.path = path;
    const raiz = svg.append('g');
    this.raiz = raiz;
    const munis = raiz.append('g').attr('class', 'mapa-munis');
    this.centro = new Map(); this.area = new Map();
    geo.features.forEach((f) => { this.centro.set(f.id, path.centroid(f)); this.area.set(f.id, path.area(f)); });
    const self = this;
    munis.selectAll('path').data(geo.features).join('path')
      .attr('d', path).attr('class', 'muni').attr('data-cod', (f) => f.id)
      .each(function (f) { self.paths.set(f.id, this); })
      .on('mousemove', (ev, f) => { if (this.op.dica) CIC.dica.mostrar(this.op.dica(f.id), ev); })
      .on('mouseleave', () => CIC.dica.esconder())
      .on('click', (ev, f) => { if (this.arrastou) return; this.op.aoClicar && this.op.aoClicar(f.id, ev); });
    this.camRotulos = raiz.append('g').attr('class', 'mapa-rotulos');
    this.k = 1;
    const zoom = d3.zoom().scaleExtent([1, 14]).filter((ev) => !ev.shiftKey && (!ev.button || ev.type === 'wheel'))
      .on('zoom', (ev) => { raiz.attr('transform', ev.transform); this.k = ev.transform.k; this.camRotulos.selectAll('text').attr('font-size', 12 / ev.transform.k).attr('stroke-width', 3 / ev.transform.k); munis.attr('stroke-width', 0.6 / ev.transform.k); });
    svg.call(zoom);
    this.zoom = zoom;
    if (this.op.aoSelecionarArea) this.ativarArea(svg);
    if (this.op.aoDesenhar) this.op.aoDesenhar(this);
    return this;
  }
  ativarArea(svg) {
    let ini = null; let ret = null;
    const ponto = (ev) => { const r = this.svg.node().getBoundingClientRect(); const vb = this.svg.node().viewBox.baseVal; return [(ev.clientX - r.left) * (vb.width / r.width), (ev.clientY - r.top) * (vb.height / r.height)]; };
    svg.on('pointerdown.area', (ev) => { if (!ev.shiftKey) return; ini = ponto(ev); this.arrastou = false; ret = svg.append('rect').attr('class', 'mapa-area'); ev.preventDefault(); });
    svg.on('pointermove.area', (ev) => {
      if (!ini) return; const p = ponto(ev); this.arrastou = true;
      ret.attr('x', Math.min(ini[0], p[0])).attr('y', Math.min(ini[1], p[1])).attr('width', Math.abs(p[0] - ini[0])).attr('height', Math.abs(p[1] - ini[1]));
    });
    const fim = (ev) => {
      if (!ini) return; const p = ponto(ev);
      const t = d3.zoomTransform(svg.node());
      const x0 = Math.min(ini[0], p[0]), x1 = Math.max(ini[0], p[0]), y0 = Math.min(ini[1], p[1]), y1 = Math.max(ini[1], p[1]);
      const sel = [];
      this.centro.forEach((c, cod) => { const [x, y] = t.apply(c); if (x >= x0 && x <= x1 && y >= y0 && y <= y1) sel.push(cod); });
      ret.remove(); ini = null;
      if (this.arrastou && sel.length) this.op.aoSelecionarArea(sel);
      setTimeout(() => (this.arrastou = false), 0);
    };
    svg.on('pointerup.area', fim).on('pointerleave.area', fim);
  }
  pintar(cor, classe) {
    this.paths.forEach((el, cod) => { el.style.fill = cor(cod) || ''; if (classe) el.setAttribute('class', 'muni ' + (classe(cod) || '')); });
  }
  rotulos(lista) {
    const t = this.camRotulos; t.selectAll('*').remove();
    lista.forEach(({ nome, munis }) => {
      let sx = 0, sy = 0, sa = 0;
      munis.forEach((c) => { const ce = this.centro.get(c); const a = this.area.get(c) || 0; if (ce && a) { sx += ce[0] * a; sy += ce[1] * a; sa += a; } });
      if (!sa) return;
      t.append('text').attr('x', sx / sa).attr('y', sy / sa).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').attr('font-size', 12 / this.k).attr('stroke-width', 3 / this.k).text(nome);
    });
  }
  enquadrar(munis) {
    if (!munis || !munis.length) { this.svg.transition().duration(450).call(this.zoom.transform, d3.zoomIdentity); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    munis.forEach((c) => { const el = this.paths.get(c); if (!el) return; const b = el.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
    if (!isFinite(x0)) return;
    const vb = this.svg.node().viewBox.baseVal;
    const k = Math.min(12, 0.88 / Math.max((x1 - x0) / vb.width, (y1 - y0) / vb.height));
    const tx = vb.width / 2 - k * (x0 + x1) / 2, ty = vb.height / 2 - k * (y0 + y1) / 2;
    this.svg.transition().duration(450).call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
  }
};

/* rampa sequencial (azul), um passo por classe; clara para escura no tema claro */
CIC.RAMPA = ['#d4f3ee', '#a3e6dc', '#6fd3c5', '#38bcaa', '#14998a', '#0d766b', '#08524b'];
CIC.RAMPA_ESCURO = ['#0f3330', '#11504a', '#137066', '#169384', '#2db8a5', '#5ed6c5', '#9eeade'];
CIC.escuro = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
CIC.classes = (valores, n = 7) => {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  const cortes = []; for (let i = 1; i < n; i++) cortes.push(v[Math.floor((i / n) * (v.length - 1))] ?? 0);
  return { cortes, cor(x) { if (!(x > 0)) return null; let i = 0; while (i < cortes.length && x > cortes[i]) i++; return (CIC.escuro() ? CIC.RAMPA_ESCURO : CIC.RAMPA)[i]; } };
};
