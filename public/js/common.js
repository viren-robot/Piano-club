// Runs on every page: shows the right navigation links for the signed-in role.
(async function setupNav() {
  const role = await getRole();

  document.querySelectorAll('[data-need]').forEach((link) => {
    const need = link.dataset.need;
    const allowed = need === 'teacher' ? role === 'teacher' : Boolean(role);
    link.hidden = !allowed;
  });
  document.querySelectorAll('[data-auth="in"]').forEach((n) => { n.hidden = !role; });
  document.querySelectorAll('[data-auth="out"]').forEach((n) => { n.hidden = Boolean(role); });

  const current = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.site-nav a[href]').forEach((a) => {
    if (a.getAttribute('href') === current) a.setAttribute('aria-current', 'page');
  });

  const signOut = document.getElementById('signout');
  if (signOut) {
    signOut.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
      resetRole();
      location.href = '/';
    });
  }
})();
