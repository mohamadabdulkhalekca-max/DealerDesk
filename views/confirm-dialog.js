/**
 * Styled replacement for the browser's native confirm() — matches the
 * rest of the app's dialog look instead of an unstyled OS popup.
 * Usage: const ok = await ConfirmDialog.open({ message: '...' });
 */
(function () {
  function open({ title = 'Are you sure?', message, confirmLabel = 'Delete', cancelLabel = 'Cancel' } = {}) {
    return new Promise((resolve) => {
      let resolved = false;
      const settle = (value) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };

      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog confirm-dialog';

      const box = document.createElement('div');
      box.className = 'confirm-box';

      const h2 = document.createElement('h2');
      h2.textContent = title;
      box.appendChild(h2);

      const p = document.createElement('p');
      p.className = 'confirm-message';
      p.textContent = message;
      box.appendChild(p);

      const actions = document.createElement('div');
      actions.className = 'dialog-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = cancelLabel;
      cancelBtn.addEventListener('click', () => {
        settle(false);
        dialog.close();
      });

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'primary danger-solid';
      confirmBtn.textContent = confirmLabel;
      confirmBtn.addEventListener('click', () => {
        settle(true);
        dialog.close();
      });

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      box.appendChild(actions);

      dialog.appendChild(box);
      document.body.appendChild(dialog);
      dialog.addEventListener('close', () => {
        settle(false); // dismissed via Escape without choosing
        dialog.remove();
      });
      dialog.showModal();
      confirmBtn.focus();
    });
  }

  window.ConfirmDialog = { open };
})();
