/** Login view: Supabase email/password sign-in, with a toggle to sign up. */
(function () {
  function render(root, { onUnlock }) {
    let mode = 'signin'; // or 'signup'

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
    form.appendChild(pwInput);

    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-error hidden';
    form.appendChild(errorMsg);

    const infoMsg = document.createElement('div');
    infoMsg.className = 'form-info hidden';
    form.appendChild(infoMsg);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    form.appendChild(submitBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'link-btn';
    form.appendChild(toggleBtn);

    function updateMode() {
      subtitle.textContent = I18n.t(mode === 'signin' ? 'login.signInSubtitle' : 'login.signUpSubtitle');
      submitBtn.textContent = I18n.t(mode === 'signin' ? 'login.signIn' : 'login.createAccount');
      toggleBtn.textContent = I18n.t(mode === 'signin' ? 'login.noAccount' : 'login.hasAccount');
      pwInput.autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    }
    updateMode();

    toggleBtn.addEventListener('click', () => {
      mode = mode === 'signin' ? 'signup' : 'signin';
      errorMsg.classList.add('hidden');
      infoMsg.classList.add('hidden');
      updateMode();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.add('hidden');
      infoMsg.classList.add('hidden');
      submitBtn.disabled = true;

      const email = emailInput.value.trim();
      const password = pwInput.value;

      try {
        if (mode === 'signin') {
          const { error } = await Auth.signIn(email, password);
          if (error) throw error;
          onUnlock();
        } else {
          if (password.length < 6) {
            throw new Error(I18n.t('login.passwordMinLength'));
          }
          const { data, error } = await Auth.signUp(email, password);
          if (error) throw error;
          if (data.session) {
            onUnlock();
          } else {
            infoMsg.textContent = I18n.t('login.accountCreated');
            infoMsg.classList.remove('hidden');
            mode = 'signin';
            updateMode();
          }
        }
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
