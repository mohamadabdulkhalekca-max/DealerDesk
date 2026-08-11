/** Login view: first-run password setup, then password unlock per session. */
(function () {
  function render(root, { onUnlock }) {
    const settings = Storage.getSettings();
    const isSetup = !settings || !settings.passwordHash;

    root.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'login-wrap';

    const card = document.createElement('div');
    card.className = 'login-card';

    const title = document.createElement('h1');
    title.textContent = 'Car Trader Manager';
    card.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'login-subtitle';
    subtitle.textContent = isSetup
      ? 'Set a password to protect your data'
      : 'Enter your password to continue';
    card.appendChild(subtitle);

    const form = document.createElement('form');
    form.className = 'login-form';
    form.noValidate = true;

    const pwInput = document.createElement('input');
    pwInput.type = 'password';
    pwInput.placeholder = 'Password';
    pwInput.required = true;
    pwInput.autocomplete = isSetup ? 'new-password' : 'current-password';
    form.appendChild(pwInput);

    let confirmInput = null;
    if (isSetup) {
      confirmInput = document.createElement('input');
      confirmInput.type = 'password';
      confirmInput.placeholder = 'Confirm password';
      confirmInput.required = true;
      confirmInput.autocomplete = 'new-password';
      form.appendChild(confirmInput);
    }

    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-error hidden';
    form.appendChild(errorMsg);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = isSetup ? 'Set Password' : 'Unlock';
    form.appendChild(submitBtn);

    function showError(message) {
      errorMsg.textContent = message;
      errorMsg.classList.remove('hidden');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.add('hidden');
      const password = pwInput.value;

      if (isSetup) {
        if (password.length < 4) {
          showError('Password must be at least 4 characters.');
          return;
        }
        if (password !== confirmInput.value) {
          showError('Passwords do not match.');
          return;
        }
        const passwordHash = await Storage.hashPassword(password);
        Storage.saveSettings({ passwordHash });
        onUnlock();
        return;
      }

      const hash = await Storage.hashPassword(password);
      if (hash === settings.passwordHash) {
        onUnlock();
      } else {
        showError('Incorrect password.');
        pwInput.value = '';
        pwInput.focus();
      }
    });

    card.appendChild(form);
    wrap.appendChild(card);
    root.appendChild(wrap);
    pwInput.focus();
  }

  window.Views = window.Views || {};
  window.Views.login = { render };
})();
