(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DIMS = [['love', 'Love'], ['good_at', 'Good at'], ['needs', 'World needs'], ['paid', 'Paid for']];
  const EST_Q = 15;
  let lang = 'hinglish', msgs = [], busy = false, report = null;

  const T = {
    hinglish: { ph: 'Apna jawab likho...', err: 'Kuch gadbad hui. Dobara try karo.', retry: 'Retry' },
    english: { ph: 'Type your answer...', err: 'Something went wrong. Please try again.', retry: 'Retry' },
    hindi: { ph: 'अपना जवाब लिखें...', err: 'कुछ गड़बड़ हुई। दोबारा कोशिश करें।', retry: 'दोबारा' },
  };

  document.querySelectorAll('#langs label').forEach((l) => l.addEventListener('click', () => {
    document.querySelectorAll('#langs label').forEach((x) => x.classList.remove('on'));
    l.classList.add('on');
  }));

  function addMsg(text, cls) {
    const d = document.createElement('div');
    d.className = 'm ' + cls; d.textContent = text;
    $('log').appendChild(d); $('log').scrollTop = 1e9; return d;
  }
  function progress() {
    const asked = msgs.filter((m) => m.role === 'model').length;
    $('pbar').style.width = Math.min(100, Math.round((asked / EST_Q) * 100)) + '%';
  }
  async function api(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')');
    return j;
  }

  async function turn() {
    busy = true; $('send').disabled = true;
    const wait = addMsg('...', 'ai');
    try {
      const j = await api('/api/chat', { messages: msgs, lang });
      wait.remove();
      if (j.reply) { msgs.push({ role: 'model', text: j.reply }); addMsg(j.reply, 'ai'); }
      progress();
      if (j.done) return makeReport();
    } catch (e) {
      wait.remove();
      const er = addMsg(e.message + ' ', 'err');
      const b = document.createElement('button'); b.textContent = T[lang].retry; b.className = 'alt'; b.style.cssText = 'padding:4px 10px;margin-left:6px';
      b.onclick = () => { er.remove(); turn(); }; er.appendChild(b);
    }
    busy = false; $('send').disabled = false; $('inp').focus();
  }

  async function makeReport() {
    $('chat').style.display = 'none'; $('gen').style.display = 'block';
    try {
      const j = await api('/api/report', { messages: msgs, lang });
      report = j.report; renderReport(report);
      $('gen').style.display = 'none'; $('report').style.display = 'block'; window.scrollTo(0, 0);
    } catch (e) {
      $('gen').innerHTML = '<h2>' + esc(T[lang].err) + '</h2><p class="mut">' + esc(e.message) + '</p><button id="again">' + esc(T[lang].retry) + '</button>';
      $('again').onclick = () => { $('gen').innerHTML = '<div class="spin"></div><h2>...</h2>'; makeReport(); };
    }
  }

  $('start').onclick = () => {
    lang = document.querySelector('input[name=lang]:checked').value;
    $('inp').placeholder = T[lang].ph;
    $('intro').style.display = 'none'; $('chat').style.display = 'block';
    msgs = [{ role: 'user', text: 'START' }];
    turn();
  };
  function send() {
    const t = $('inp').value.trim();
    if (!t || busy) return;
    $('inp').value = ''; msgs.push({ role: 'user', text: t }); addMsg(t, 'me'); turn();
  }
  $('send').onclick = send;
  $('inp').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });

  // ---------- report ----------
  function table(head, rows) {
    return '<div class="tw"><table><tr>' + head.map((h) => '<th>' + esc(h) + '</th>').join('') + '</tr>' +
      rows.map((r) => '<tr>' + r.map((c, i) => '<td>' + (i === 0 ? '<b>' + esc(c) + '</b>' : esc(c)) + '</td>').join('') + '</tr>').join('') + '</table></div>';
  }
  function renderReport(r) {
    const top = r.niches[0], p = r.persona || {};
    let h = '<div class="hero"><small>YOUR RECOMMENDED NICHE</small><h2>' + esc(top.name) + '</h2><p>' + esc(p.statement) + '</p></div>' +
      '<div class="dl noprint"><button id="dPdf">Download PDF</button><button id="dPpt" class="alt">Download PPT</button><button id="dXls" class="alt">Download Excel workbook</button><button id="dNew" class="alt">Start over</button></div>';
    h += '<div class="card"><h3 style="margin-top:0">1. Profile' + (r.client_name ? ' - ' + esc(r.client_name) : '') + '</h3>' + table(['Area', 'Detail'], (r.profile || []).map((x) => [x.label, x.value]));
    h += '<h3>What the AI noticed</h3><ul>' + (r.insights || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';
    h += '<h3>2. Ikigai scoring</h3><p class="mut">Each niche is scored 1-10. Weights: Love 20%, Good at 30%, World needs 25%, Paid for 25%.</p>' +
      table(['Niche', 'Love', 'Good at', 'World needs', 'Paid for', 'Total'], r.niches.map((n, i) => [n.name, n.scores.love, n.scores.good_at, n.scores.needs, n.scores.paid, n.total + (i === 0 ? ' (best)' : '')]));
    h += '<ul>' + r.niches.map((n) => '<li><b>' + esc(n.short || n.name) + ':</b> ' + esc(n.why) + '</li>').join('') + '</ul>';
    h += '<h3>3. Your niche in detail</h3>' + table(['Question', 'Answer'], [['Who you help', p.who], ['Their problem', p.pain], ['Your promise', p.promise], ['One-line statement', p.statement]]);
    h += '<h3>Offer ladder</h3><p class="mut">Starting points to test, not fixed prices.</p>' + table(['Offer', 'Price', 'What it includes'], (r.offers || []).map((o) => [o.name, o.price_label, o.includes]));
    h += '<h3>4. 30 / 60 / 90 day roadmap</h3>' + (r.roadmap || []).map((ph) => '<p><b>' + esc(ph.phase) + '</b></p><ul>' + (ph.steps || []).map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>').join('');
    h += '<h3>5. Delivery playbook</h3><p><b>A. Discovery meeting (45 min)</b></p>' + table(['Time', 'Stage', 'What to do'], (r.meeting || []).map((x) => [x.time, x.stage, x.action]));
    h += '<p style="margin-top:14px"><b>B. First webinar (60 min)</b></p>' + table(['Time', 'Section', 'What to do'], (r.webinar || []).map((x) => [x.time, x.section, x.action]));
    h += '<h3>6. Next steps this week</h3><ol>' + (r.next_steps || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
    h += '<p class="foot">Scores and prices are AI estimates based only on your answers. Test them with real conversations.</p></div>';
    $('report').innerHTML = h;
    $('dPdf').onclick = () => { const o = document.title; document.title = 'Niche Report - ' + (r.client_name || 'You'); window.print(); document.title = o; };
    $('dPpt').onclick = () => buildPptx(r);
    $('dXls').onclick = () => buildXlsx(r);
    $('dNew').onclick = () => location.reload();
  }

  // ---------- PPTX ----------
  function buildPptx(r) {
    const NAVY = '1B263B', SAFF = 'F4A300', LIGHT = 'F3F5F8', INK = '222B38', MUT = '5B6573';
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_16x9'; pptx.title = 'Niche Plan - ' + (r.client_name || '');
    const top = r.niches[0], p = r.persona || {};
    const F = 'Calibri';
    const title = (s, t, dark) => s.addText(t, { x: 0.5, y: 0.3, w: 9, h: 0.7, fontFace: F, fontSize: 28, bold: true, color: dark ? 'FFFFFF' : NAVY, isTextBox: true, margin: 0 });
    const hdr = (arr) => arr.map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY }, fontFace: F, fontSize: 12 } }));
    const cell = (t, b) => ({ text: String(t == null ? '' : t), options: { fontFace: F, fontSize: 11, color: INK, bold: !!b, valign: 'top' } });

    let s = pptx.addSlide(); s.background = { color: NAVY };
    s.addText('YOUR NICHE PLAN', { x: 0.6, y: 0.9, w: 8.8, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: SAFF, isTextBox: true, margin: 0 });
    s.addText(r.client_name || 'Your niche', { x: 0.6, y: 1.35, w: 8.8, h: 0.9, fontFace: F, fontSize: 40, bold: true, color: 'FFFFFF', isTextBox: true, margin: 0 });
    s.addText(p.statement || top.name, { x: 0.6, y: 2.5, w: 8.2, h: 1.6, fontFace: F, fontSize: 20, color: 'E5E9F0', isTextBox: true, margin: 0, valign: 'top' });

    s = pptx.addSlide(); title(s, 'Who you are');
    s.addTable([hdr(['Area', 'Detail'])].concat((r.profile || []).slice(0, 8).map((x) => [cell(x.label, true), cell(x.value)])), { x: 0.5, y: 1.2, w: 9, colW: [2.2, 6.8], fontFace: F, border: { type: 'solid', color: 'D5DAE1', pt: 0.5 } });

    s = pptx.addSlide(); title(s, 'What the pattern says');
    (r.insights || []).slice(0, 4).forEach((t, i) => {
      const y = 1.25 + i * 1.0;
      s.addShape(pptx.ShapeType.ellipse, { x: 0.5, y: y + 0.1, w: 0.55, h: 0.55, fill: { color: SAFF }, line: { color: SAFF } });
      s.addText(String(i + 1), { x: 0.5, y: y + 0.1, w: 0.55, h: 0.55, align: 'center', valign: 'middle', fontFace: F, fontSize: 18, bold: true, color: NAVY, isTextBox: true, margin: 0 });
      s.addText(t, { x: 1.3, y, w: 8.2, h: 0.8, fontFace: F, fontSize: 16, color: INK, valign: 'middle', isTextBox: true, margin: 0 });
    });

    s = pptx.addSlide(); title(s, 'Ikigai scores by niche');
    const colors = [NAVY, SAFF, '8C96A6'];
    s.addChart(pptx.charts.BAR, r.niches.map((n) => ({ name: n.short || n.name, labels: DIMS.map((d) => d[1]), values: DIMS.map((d) => n.scores[d[0]]) })), {
      x: 0.5, y: 1.1, w: 9, h: 3.7, barDir: 'col', chartColors: colors, showLegend: true, legendPos: 'b', legendFontFace: F, legendFontSize: 12,
      showValue: true, dataLabelFontFace: F, dataLabelFontSize: 11, dataLabelPosition: 'outEnd', catAxisLabelFontFace: F, catAxisLabelFontSize: 12, valAxisLabelFontFace: F, valAxisLabelFontSize: 11,
      valAxisMaxVal: 10, valAxisMinVal: 0, valGridLine: { color: 'E3E7EE', size: 0.5 }, catGridLine: { style: 'none' },
    });
    s.addText('Best fit: ' + top.name + ' (' + top.total + ' / 10)', { x: 0.5, y: 4.9, w: 9, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0 });

    s = pptx.addSlide(); s.background = { color: NAVY }; title(s, 'Your niche', true);
    s.addText(top.name, { x: 0.5, y: 1.1, w: 9, h: 0.8, fontFace: F, fontSize: 22, bold: true, color: SAFF, isTextBox: true, margin: 0, valign: 'top' });
    [['Who you help', p.who], ['Their problem', p.pain], ['Your promise', p.promise]].forEach((c, i) => {
      const x = 0.5 + i * 3.05;
      s.addShape(pptx.ShapeType.roundRect, { x, y: 2.1, w: 2.9, h: 2.9, fill: { color: '27344F' }, line: { color: '27344F' }, rectRadius: 0.1 });
      s.addText([{ text: c[0], options: { bold: true, color: SAFF, fontSize: 14, breakLine: true } }, { text: c[1] || '', options: { color: 'FFFFFF', fontSize: 13 } }], { x: x + 0.15, y: 2.2, w: 2.6, h: 2.7, fontFace: F, valign: 'top', isTextBox: true, margin: 0, paraSpaceAfter: 6 });
    });

    s = pptx.addSlide(); title(s, 'Offer ladder');
    (r.offers || []).slice(0, 3).forEach((o, i) => {
      const x = 0.5 + i * 3.05;
      s.addShape(pptx.ShapeType.roundRect, { x, y: 1.2, w: 2.9, h: 3.8, fill: { color: LIGHT }, line: { color: 'D5DAE1', width: 0.75 }, rectRadius: 0.1 });
      s.addText([{ text: 'STEP ' + (i + 1), options: { bold: true, color: MUT, fontSize: 11, breakLine: true } }, { text: o.name, options: { bold: true, color: NAVY, fontSize: 16, breakLine: true } }, { text: o.price_label, options: { bold: true, color: 'B97800', fontSize: 14, breakLine: true } }, { text: o.includes, options: { color: INK, fontSize: 12 } }], { x: x + 0.15, y: 1.3, w: 2.6, h: 3.6, fontFace: F, valign: 'top', isTextBox: true, margin: 0, paraSpaceAfter: 6 });
    });

    s = pptx.addSlide(); title(s, '30 / 60 / 90 day roadmap');
    (r.roadmap || []).slice(0, 3).forEach((ph, i) => {
      const x = 0.5 + i * 3.05;
      s.addShape(pptx.ShapeType.roundRect, { x, y: 1.15, w: 2.9, h: 3.95, fill: { color: LIGHT }, line: { color: 'D5DAE1', width: 0.75 }, rectRadius: 0.1 });
      const runs = [{ text: ph.phase, options: { bold: true, color: NAVY, fontSize: 13, breakLine: true } }].concat((ph.steps || []).slice(0, 5).map((t, k, a) => ({ text: t, options: { color: INK, fontSize: 11, bullet: true, breakLine: k < a.length - 1 } })));
      s.addText(runs, { x: x + 0.12, y: 1.25, w: 2.66, h: 3.75, fontFace: F, valign: 'top', isTextBox: true, margin: 0, paraSpaceAfter: 5 });
    });

    s = pptx.addSlide(); title(s, 'Discovery meeting (45 min)');
    s.addTable([hdr(['Time', 'Stage', 'What to do'])].concat((r.meeting || []).slice(0, 7).map((x) => [cell(x.time, true), cell(x.stage, true), cell(x.action)])), { x: 0.5, y: 1.2, w: 9, colW: [1.3, 1.9, 5.8], border: { type: 'solid', color: 'D5DAE1', pt: 0.5 } });

    s = pptx.addSlide(); title(s, 'First webinar (60 min)');
    s.addTable([hdr(['Time', 'Section', 'What to do'])].concat((r.webinar || []).slice(0, 7).map((x) => [cell(x.time, true), cell(x.section, true), cell(x.action)])), { x: 0.5, y: 1.2, w: 9, colW: [1.3, 1.9, 5.8], border: { type: 'solid', color: 'D5DAE1', pt: 0.5 } });

    s = pptx.addSlide(); s.background = { color: NAVY }; title(s, 'Next steps this week', true);
    s.addText((r.next_steps || []).map((t, i, a) => ({ text: t, options: { bullet: { type: 'number' }, breakLine: i < a.length - 1 } })), { x: 0.7, y: 1.3, w: 8.6, h: 3.6, fontFace: F, fontSize: 18, color: 'FFFFFF', valign: 'top', isTextBox: true, margin: 0, paraSpaceAfter: 12 });

    pptx.writeFile({ fileName: 'Niche_Deck.pptx' });
  }

  // ---------- XLSX ----------
  function buildXlsx(r) {
    const A = 'Arial';
    const st = (o) => Object.assign({ font: { name: A, sz: 10 }, alignment: { vertical: 'top', wrapText: true } }, o || {});
    const H = st({ font: { name: A, sz: 10, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B263B' } } });
    const IN = st({ font: { name: A, sz: 10, color: { rgb: '0000FF' } }, fill: { fgColor: { rgb: 'FFF8DC' } } });
    const TITLE = st({ font: { name: A, sz: 14, bold: true, color: { rgb: '1B263B' } }, alignment: { wrapText: false } });
    const BOLD = st({ font: { name: A, sz: 10, bold: true } });
    const NOTE = st({ font: { name: A, sz: 9, italic: true, color: { rgb: '5B6573' } }, alignment: { wrapText: false } });
    const c = (v, s, extra) => Object.assign({ v: v == null ? '' : v, t: typeof v === 'number' ? 'n' : 's', s: s || st() }, extra || {});
    const f = (formula, s, z) => ({ f: formula, t: 'n', s: s || st(), z });
    const mk = (rows, widths) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = widths.map((w) => ({ wch: w })); return ws; };
    const wb = XLSX.utils.book_new();

    // Read me
    wb.SheetNames.push('Read Me');
    wb.Sheets['Read Me'] = mk([
      [c('Niche workbook' + (r.client_name ? ' - ' + r.client_name : ''), TITLE)],
      [c('Blue text on a pale yellow cell = you can edit it. Black = calculated.', NOTE)],
      [c('')],
      [c('Sheets', BOLD)],
      [c('Ikigai Scorer: change the scores or weights to test other niches. Totals and rank update.')],
      [c('Offers & Revenue: enter how many clients per month you expect. Revenue and the gap to your income target update.')],
      [c('90-Day Tracker: update the status of each step weekly.')],
      [c('Client Pipeline: log every owner or client you talk to.')],
      [c('Meeting Script and Webinar Plan: your delivery structure.')],
      [c('')],
      [c('Scores and prices are AI estimates from your interview. Replace them with real numbers as you learn.', NOTE)],
    ], [110]);

    // Ikigai Scorer
    const n = r.niches.length, w = r.weights || { love: .2, good_at: .3, needs: .25, paid: .25 };
    const sc = [[c('Ikigai Scorer', TITLE)], [c('Score each niche 1-10. Weights must add to 100%.', NOTE)], [c('')],
      [c('Weights', BOLD)].concat(DIMS.map((d) => c(d[1], H))),
      [c('Weight', BOLD)].concat(DIMS.map((d) => c(w[d[0]], IN, { z: '0%' }))), [c('')],
      ['Niche', 'Love', 'Good at', 'World needs', 'Paid for', 'Total (/10)', 'Rank'].map((t) => c(t, H))];
    r.niches.forEach((x, i) => {
      const row = 8 + i;
      sc.push([c(x.name, st())].concat(DIMS.map((d) => c(x.scores[d[0]], IN)), [f(`SUMPRODUCT(B${row}:E${row},$B$5:$E$5)`, st({ font: { name: A, sz: 10, bold: true } }), '0.00'), f(`RANK(F${row},$F$8:$F$${7 + n})`, st())]));
    });
    sc.push([c('')], [c('Weight check (should be 100%)', NOTE), f('SUM(B5:E5)', st(), '0%')]);
    wb.SheetNames.push('Ikigai Scorer'); wb.Sheets['Ikigai Scorer'] = mk(sc, [58, 10, 10, 12, 10, 12, 8]);

    // Offers & Revenue
    const of = r.offers || [];
    const o = [[c('Offers & Revenue', TITLE)], [c('Prices are starting points to test. Enter expected clients per month.', NOTE)], [c('')],
      ['Offer', 'Unit', 'Price (Rs)', 'Clients per month', 'Monthly revenue (Rs)'].map((t) => c(t, H))];
    of.forEach((x, i) => { const row = 5 + i; o.push([c(x.name), c(x.unit), c(Number(x.price_inr) || 0, IN, { z: '#,##0' }), c(x.unit === 'free' ? 0 : (i === 1 ? 2 : 1), IN), f(`C${row}*D${row}`, st(), '#,##0')]); });
    const last = 4 + of.length;
    o.push([c('Total per month', BOLD), c(''), c(''), c(''), f(`SUM(E5:E${last})`, st({ font: { name: A, sz: 10, bold: true } }), '#,##0')]);
    o.push([c('')], [c('Target monthly income (Rs)', BOLD), c(''), c(50000, IN, { z: '#,##0' })]);
    o.push([c('Gap to target (Rs)', BOLD), c(''), f(`C${last + 3}-E${last + 1}`, st(), '#,##0;(#,##0);-')]);
    o.push([c('Note: target of Rs 50,000 is a placeholder. Replace it with your own goal.', NOTE)]);
    wb.SheetNames.push('Offers & Revenue'); wb.Sheets['Offers & Revenue'] = mk(o, [38, 12, 14, 18, 22]);

    // 90-day tracker
    const t = [[c('90-Day Tracker', TITLE)], [c('Statuses: Not started / In progress / Done', NOTE)], [c('')], ['Phase', 'Step', 'Due date', 'Status', 'Notes'].map((x) => c(x, H))];
    (r.roadmap || []).forEach((ph) => (ph.steps || []).forEach((s2) => t.push([c(ph.phase), c(s2), c('', IN), c('Not started', IN), c('', IN)])));
    wb.SheetNames.push('90-Day Tracker'); wb.Sheets['90-Day Tracker'] = mk(t, [30, 70, 14, 14, 30]);

    // Pipeline
    const pl = [[c('Client Pipeline', TITLE)], [c('Stages: Listed / Contacted / Call booked / Call done / Proposal / Won / Lost', NOTE)], [c('')],
      ['Name', 'Contact', 'Source', 'Stage', 'Last contact', 'Next step', 'Next date', 'Value (Rs)', 'Notes'].map((x) => c(x, H)),
      [c('Example: Sharma Classes', NOTE), c('98xxxxxx01', NOTE), c('Referral', NOTE), c('Call booked', NOTE), c('2026-11-02', NOTE), c('Run free check', NOTE), c('2026-11-05', NOTE), c(24999, NOTE), c('Example row - delete it', NOTE)]];
    for (let i = 0; i < 25; i++) pl.push(['', '', '', '', '', '', '', '', ''].map((x) => c(x, IN)));
    wb.SheetNames.push('Client Pipeline'); wb.Sheets['Client Pipeline'] = mk(pl, [26, 16, 14, 14, 14, 24, 14, 12, 30]);

    // Meeting & Webinar
    const m = [[c('Discovery Meeting Script (45 min)', TITLE)], [c('')], ['Time', 'Stage', 'What to do', 'Done?'].map((x) => c(x, H))];
    (r.meeting || []).forEach((x) => m.push([c(x.time, BOLD), c(x.stage, BOLD), c(x.action), c('', IN)]));
    wb.SheetNames.push('Meeting Script'); wb.Sheets['Meeting Script'] = mk(m, [12, 20, 90, 10]);
    const wbn = [[c('Webinar Plan (60 min)', TITLE)], [c('')], ['Time', 'Section', 'What to do', 'Slide or asset needed', 'Done?'].map((x) => c(x, H))];
    (r.webinar || []).forEach((x) => wbn.push([c(x.time, BOLD), c(x.section, BOLD), c(x.action), c('', IN), c('', IN)]));
    wb.SheetNames.push('Webinar Plan'); wb.Sheets['Webinar Plan'] = mk(wbn, [12, 20, 70, 28, 10]);

    XLSX.writeFile(wb, 'Niche_Workbook.xlsx');
  }
})();
