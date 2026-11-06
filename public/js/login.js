(function loginPage() {
  const form = document.getElementById('login-form');
  const pin = document.getElementById('pin');
  const notice = document.getElementById('notice');
  const button = form.querySelector('button[type="submit"]');
  const next = new URLSearchParams(location.search).get('next');

  pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 8); });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    try {
      const { role } = await api('/api/auth/login', { method: 'POST', body: { pin: pin.value } });
      resetRole();
      // Only follow same-site relative paths, so ?next can't redirect off-site.
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      location.href = safeNext || (role === 'teacher' ? '/teacher.html' : '/practice.html');
    } catch (err) {
      showNotice(notice, err.message, 'error');
      pin.value = '';
      pin.focus();
    } finally {
      button.disabled = false;
    }
  });
})();
