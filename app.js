/** View router and top-level chrome (nav, error banner, lock). */
(function () {
  const root = document.getElementById('app-root');
  const header = document.getElementById('app-header');
  const nav = document.getElementById('app-nav');
  const lockBtn = document.getElementById('lock-btn');
  const errorBanner = document.getElementById('error-banner');

  function showError(message) {
    errorBanner.classList.remove('info');
    errorBanner.textContent = message;
    errorBanner.classList.remove('hidden');
  }

  function showInfo(message) {
    errorBanner.classList.add('info');
    errorBanner.textContent = message;
    errorBanner.classList.remove('hidden');
  }

  function clearError() {
    errorBanner.classList.add('hidden');
    errorBanner.classList.remove('info');
    errorBanner.textContent = '';
  }

  let toastEl = null;
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    // Force reflow so re-triggering the same message still re-animates.
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  window.App = { showError, showInfo, clearError, showToast };

  function setActiveNav(route) {
    nav.querySelectorAll('a[data-route]').forEach((a) => {
      a.classList.toggle('active', a.dataset.route === route);
    });
  }

  function currentRoute() {
    return window.location.hash.replace('#/', '') || 'dashboard';
  }

  function navigate(route) {
    if (window.location.hash === `#/${route}`) {
      render(route);
    } else {
      window.location.hash = `#/${route}`;
    }
  }

  async function render(route) {
    clearError();
    try {
      const {
        data: { session },
      } = await Auth.getSession();

      if (!session) {
        header.classList.add('hidden');
        Views.login.render(root, { onUnlock: () => navigate('dashboard') });
        return;
      }

      header.classList.remove('hidden');
      setActiveNav(route);
      if (route === 'inventory') await Views.inventory.render(root);
      else if (route === 'sales') await Views.sales.render(root);
      else await Views.dashboard.render(root);
    } catch (err) {
      showError(err.message);
    }
  }

  lockBtn.addEventListener('click', async () => {
    await Auth.signOut();
    navigate('login');
  });

  window.addEventListener('hashchange', () => render(currentRoute()));

  render(currentRoute());
})();
