(async function practicePage() {
  const gate = document.getElementById('gate');
  const list = document.getElementById('sheets');
  const role = await getRole();

  if (!role) {
    gate.hidden = false;
    return;
  }

  try {
    const sheets = await api('/api/practice-sheets');
    list.replaceChildren(sheets.length
      ? el('ul', { class: 'list' }, sheets.map((s) =>
          el('li', { class: 'item' },
            el('div', { class: 'item-head' },
              el('h3', { text: s.title }),
              el('span', { class: 'item-meta', text: `${fmtDate(s.uploadedAt)} · ${fmtBytes(s.size)}` })),
            s.description ? el('div', { class: 'item-body', text: s.description }) : null,
            el('div', { class: 'item-actions' },
              el('a', { class: 'btn small', href: `/api/practice-sheets/${s._id}/file`, download: s.filename, text: 'Download' })))))
      : el('p', { class: 'empty', text: 'No practice sheets have been posted yet.' }));
  } catch (err) {
    if (err.status === 401) { gate.hidden = false; return; }
    list.replaceChildren(el('p', { class: 'muted', text: 'Practice sheets could not be loaded right now.' }));
  }
})();
