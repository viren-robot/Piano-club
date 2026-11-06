(async function teacherPage() {
  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const role = await getRole();

  if (role !== 'teacher') {
    gate.hidden = false;
    return;
  }
  app.hidden = false;

  // ---- Tabs ----
  const tabs = document.querySelectorAll('.tabs button');
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  }));

  // Generic editable list: create/edit/delete for announcements and events.
  function setupCollection({ path, form, list, notice, toRow, toBody, onEdit }) {
    let editingId = null;
    const submit = form.querySelector('button[type="submit"]');
    const cancel = form.querySelector('[data-cancel]');

    function reset() {
      editingId = null;
      form.reset();
      submit.textContent = submit.dataset.label;
      cancel.hidden = true;
    }
    cancel.addEventListener('click', reset);
    submit.dataset.label = submit.textContent;

    async function load() {
      try {
        const items = await api(path);
        list.replaceChildren(items.length
          ? el('ul', { class: 'list' }, items.map((item) => toRow(item, {
              edit: () => { editingId = item._id; onEdit(item); submit.textContent = 'Save changes'; cancel.hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
              remove: async () => {
                if (!confirm('Delete this item? This cannot be undone.')) return;
                try {
                  await api(`${path}/${item._id}`, { method: 'DELETE' });
                  if (editingId === item._id) reset();
                  load();
                } catch (err) { showNotice(notice, err.message, 'error'); }
              },
            })))
          : el('p', { class: 'empty', text: 'Nothing here yet.' }));
      } catch (err) {
        list.replaceChildren(el('p', { class: 'muted', text: err.message }));
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      try {
        const body = toBody(form);
        if (editingId) await api(`${path}/${editingId}`, { method: 'PUT', body });
        else await api(path, { method: 'POST', body });
        showNotice(notice, editingId ? 'Changes saved.' : 'Posted.', 'ok');
        reset();
        load();
      } catch (err) {
        showNotice(notice, err.message, 'error');
      } finally {
        submit.disabled = false;
      }
    });

    load();
    return { reload: load, reset };
  }

  // ---- Announcements ----
  const annForm = document.getElementById('ann-form');
  setupCollection({
    path: '/api/announcements',
    form: annForm,
    list: document.getElementById('ann-list'),
    notice: document.getElementById('ann-notice'),
    toBody: (f) => ({ title: f.elements.title.value, body: f.elements.body.value }),
    onEdit: (a) => { annForm.elements.title.value = a.title; annForm.elements.body.value = a.body; },
    toRow: (a, { edit, remove }) => el('li', { class: 'item' },
      el('div', { class: 'item-head' }, el('h3', { text: a.title }), el('span', { class: 'item-meta', text: fmtDate(a.createdAt) })),
      el('div', { class: 'item-body', text: a.body }),
      el('div', { class: 'item-actions' },
        el('button', { class: 'btn secondary small', type: 'button', text: 'Edit', onclick: edit }),
        el('button', { class: 'btn danger small', type: 'button', text: 'Delete', onclick: remove }))),
  });

  // ---- Events ----
  const evForm = document.getElementById('ev-form');
  setupCollection({
    path: '/api/events',
    form: evForm,
    list: document.getElementById('ev-list'),
    notice: document.getElementById('ev-notice'),
    toBody: (f) => ({
      title: f.elements.title.value,
      type: f.elements.type.value,
      date: f.date.value ? new Date(f.date.value).toISOString() : '',
      location: f.location.value,
      description: f.description.value,
    }),
    onEdit: (e) => {
      evForm.elements.title.value = e.title;
      evForm.type.value = e.type;
      evForm.date.value = toLocalInput(e.date);
      evForm.location.value = e.location || '';
      evForm.description.value = e.description || '';
    },
    toRow: (e, { edit, remove }) => el('li', { class: 'item' },
      el('div', { class: 'item-head' },
        el('h3', { text: e.title }),
        el('span', { class: `tag ${e.type}`, text: e.type })),
      el('div', { class: 'item-meta', text: `${fmtDateTime(e.date)}${e.location ? ' · ' + e.location : ''}` }),
      e.description ? el('div', { class: 'item-body', text: e.description }) : null,
      el('div', { class: 'item-actions' },
        el('button', { class: 'btn secondary small', type: 'button', text: 'Edit', onclick: edit }),
        el('button', { class: 'btn danger small', type: 'button', text: 'Delete', onclick: remove }))),
  });

  // ---- Practice sheets (upload) ----
  const shForm = document.getElementById('sheet-form');
  const shNotice = document.getElementById('sheet-notice');
  const shList = document.getElementById('sheet-list');
  const shSubmit = shForm.querySelector('button[type="submit"]');

  async function loadSheets() {
    try {
      const sheets = await api('/api/practice-sheets');
      shList.replaceChildren(sheets.length
        ? el('ul', { class: 'list' }, sheets.map((s) => el('li', { class: 'item' },
            el('div', { class: 'item-head' }, el('h3', { text: s.title }), el('span', { class: 'item-meta', text: `${fmtDate(s.uploadedAt)} · ${fmtBytes(s.size)}` })),
            s.description ? el('div', { class: 'item-body', text: s.description }) : null,
            el('div', { class: 'item-actions' },
              el('a', { class: 'btn secondary small', href: `/api/practice-sheets/${s._id}/file`, download: s.filename, text: 'Open' }),
              el('button', { class: 'btn danger small', type: 'button', text: 'Delete', onclick: async () => {
                if (!confirm(`Delete "${s.title}"?`)) return;
                try { await api(`/api/practice-sheets/${s._id}`, { method: 'DELETE' }); loadSheets(); }
                catch (err) { showNotice(shNotice, err.message, 'error'); }
              } })))))
        : el('p', { class: 'empty', text: 'No practice sheets uploaded yet.' }));
    } catch (err) {
      shList.replaceChildren(el('p', { class: 'muted', text: err.message }));
    }
  }

  shForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = shForm.file.files[0];
    if (!file) return showNotice(shNotice, 'Choose a PDF, PNG or JPEG file.', 'error');
    if (file.size > 10 * 1024 * 1024) return showNotice(shNotice, 'File must be 10 MB or smaller.', 'error');

    const data = new FormData();
    data.append('file', file);
    data.append('title', shForm.elements.title.value);
    data.append('description', shForm.description.value);

    shSubmit.disabled = true;
    shSubmit.textContent = 'Uploading…';
    try {
      await api('/api/practice-sheets', { method: 'POST', form: data });
      showNotice(shNotice, 'Practice sheet uploaded.', 'ok');
      shForm.reset();
      loadSheets();
    } catch (err) {
      showNotice(shNotice, err.message, 'error');
    } finally {
      shSubmit.disabled = false;
      shSubmit.textContent = 'Upload sheet';
    }
  });
  loadSheets();

  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
  function toLocalInput(value) {
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
})();
