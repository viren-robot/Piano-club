(async function homePage() {
  const eventsEl = document.getElementById('next-event');
  const annEl = document.getElementById('announcements');

  try {
    const events = await api('/api/events');
    const upcoming = events.filter((e) => new Date(e.date) >= new Date());
    const next = upcoming[0];
    eventsEl.replaceChildren(
      next
        ? el('div', { class: 'card' },
            el('span', { class: `tag ${next.type}`, text: next.type }),
            el('h3', { text: next.title, style: 'margin-top:10px' }),
            el('p', { class: 'muted small', text: `${fmtDateTime(next.date)}${next.location ? ' · ' + next.location : ''}` }),
            next.description ? el('p', { text: next.description }) : null,
            el('a', { href: '/events.html', text: 'All events →' }))
        : el('div', { class: 'card' },
            el('p', { class: 'muted', text: 'No upcoming events yet. Check back soon.' }))
    );
  } catch {
    eventsEl.replaceChildren(el('p', { class: 'muted', text: 'Events could not be loaded right now.' }));
  }

  try {
    const items = await api('/api/announcements');
    const latest = items.slice(0, 5);
    annEl.replaceChildren(
      latest.length
        ? el('ul', { class: 'list' }, latest.map((a) =>
            el('li', { class: 'item' },
              el('div', { class: 'item-head' },
                el('h3', { text: a.title }),
                el('span', { class: 'item-meta', text: fmtDate(a.createdAt) })),
              el('div', { class: 'item-body', text: a.body }))))
        : el('p', { class: 'empty', text: 'No announcements yet.' })
    );
  } catch {
    annEl.replaceChildren(el('p', { class: 'muted', text: 'Announcements could not be loaded right now.' }));
  }
})();
