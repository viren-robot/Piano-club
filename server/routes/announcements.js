const { crudRouter, str } = require('./crud');

const sanitize = (body, { partial }) => {
  const out = {};
  if (!partial || body.title !== undefined) {
    const t = str(body.title, { field: 'Title', max: 120, required: true });
    if (t.error) return { error: t.error };
    out.title = t.value;
  }
  if (!partial || body.body !== undefined) {
    const b = str(body.body, { field: 'Message', max: 5000, required: true });
    if (b.error) return { error: b.error };
    out.body = b.value;
  }
  return { value: out };
};

module.exports = crudRouter({ collection: 'announcements', sanitize });
