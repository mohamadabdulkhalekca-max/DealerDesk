/** Login view: Supabase email/password sign-in only — accounts are created by the operator (Supabase Dashboard → Authentication → Users), not by visitors. */
(function () {
  function render(root, { onUnlock }) {
    root.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'login-wrap';

    const card = document.createElement('div');
    card.className = 'login-card';

    const title = document.createElement('h1');
    title.textContent = I18n.t('brand');
    card.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'login-subtitle';
    subtitle.textContent = I18n.t('login.signInSubtitle');
    card.appendChild(subtitle);

    const form = document.createElement('form');
    form.className = 'login-form';
    form.noValidate = true;

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = I18n.t('login.email');
    emailInput.required = true;
    emailInput.autocomplete = 'email';
    form.appendChild(emailInput);

    const pwInput = document.createElement('input');
    pwInput.type = 'password';
    pwInput.placeholder = I18n.t('login.password');
    pwInput.required = true;
    pwInput.autocomplete = 'current-password';
    form.appendChild(pwInput);

    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-error hidden';
    form.appendChild(errorMsg);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = I18n.t('login.signIn');
    form.appendChild(submitBtn);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.add('hidden');
      submitBtn.disabled = true;

      const email = emailInput.value.trim();
      const password = pwInput.value;

      try {
        const { error } = await Auth.signIn(email, password);
        if (error) throw error;
        onUnlock();
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
      }
    });

    card.appendChild(form);
    wrap.appendChild(card);
    root.appendChild(wrap);
    emailInput.focus();
  }

  window.Views = window.Views || {};
  window.Views.login = { render };
})();
