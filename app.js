/** View router and top-level chrome (nav, error banner, lock). */
(function () {
  const root = document.getElementById('app-root');
  const header = document.getElementById('app-header');
  const nav = document.getElementById('app-nav');
  const lockBtn = document.getElementById('lock-btn');
  const errorBanner = document.getElementById('error-banner');

  let unlocked = false;

  function showError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.remove('hidden');
  }

  function clearError() {
    errorBanner.classList.add('hidden');
    errorBanner.textContent = '';
  }

  window.App = { showError, clearError };

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

  function render(route) {
    clearError();
    try {
      if (!unlocked) {
        header.classList.add('hidden');
        Views.login.render(root, {
          onUnlock: () => {
            unlocked = true;
            navigate('dashboard');
          },
        });
        return;
      }
      header.classList.remove('hidden');
      setActiveNav(route);
      if (route === 'inventory') Views.inventory.render(root);
      else if (route === 'sales') Views.sales.render(root);
      else Views.dashboard.render(root);
    } catch (err) {
      showError(err.message);
    }
  }

  lockBtn.addEventListener('click', () => {
    unlocked = false;
    navigate('login');
  });

  window.addEventListener('hashchange', () => render(currentRoute()));

  render(currentRoute());
})();
