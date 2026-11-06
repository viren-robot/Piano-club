(async function eventsPage() {
  const upEl = document.getElementById('upcoming');
  const pastEl = document.getElementById('past');

  function eventItem(e) {
    return el('li', { class: 'item' },
      el('div', { class: 'item-head' },
        el('h3', { text: e.title }),
        el('span', { class: `tag ${e.type}`, text: e.type })),
      el('div', { class: 'item-meta', text: `${fmtDateTime(e.date)}${e.location ? ' · ' + e.location : ''}` }),
      e.description ? el('div', { class: 'item-body', text: e.description }) : null);
  }

  try {
    const events = await api('/api/events');
    const now = new Date();
    const upcoming = events.filter((e) => new Date(e.date) >= now);
    const past = events.filter((e) => new Date(e.date) < now).reverse();

    upEl.replaceChildren(upcoming.length
      ? el('ul', { class: 'list' }, upcoming.map(eventItem))
      : el('p', { class: 'empty', text: 'No upcoming events yet.' }));
    pastEl.replaceChildren(past.length
      ? el('ul', { class: 'list' }, past.map(eventItem))
      : el('p', { class: 'empty', text: 'No past events to show.' }));
  } catch {
    upEl.replaceChildren(el('p', { class: 'muted', text: 'Events could not be loaded right now.' }));
  }
})();
