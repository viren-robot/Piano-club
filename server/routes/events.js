const { crudRouter, str } = require('./crud');

const EVENT_TYPES = ['recital', 'meeting', 'performance'];

const sanitize = (body, { partial }) => {
  const out = {};
  const want = (key) => !partial || body[key] !== undefined;

  if (want('title')) {
    const t = str(body.title, { field: 'Title', max: 120, required: true });
    if (t.error) return { error: t.error };
    out.title = t.value;
  }
  if (want('type')) {
    if (!EVENT_TYPES.includes(body.type)) {
      return { error: `Type must be one of: ${EVENT_TYPES.join(', ')}` };
    }
    out.type = body.type;
  }
  if (want('date')) {
    const d = new Date(body.date);
    if (!body.date || Number.isNaN(d.getTime())) return { error: 'A valid date and time is required' };
    out.date = d;
  }
  if (want('location')) {
    const l = str(body.location, { field: 'Location', max: 200 });
    if (l.error) return { error: l.error };
    out.location = l.value;
  }
  if (want('description')) {
    const d = str(body.description, { field: 'Description', max: 2000 });
    if (d.error) return { error: d.error };
    out.description = d.value;
  }
  return { value: out };
};

// Upcoming events first, soonest at the top.
module.exports = crudRouter({ collection: 'events', sanitize, sort: { date: 1 } });
