'use strict';

const form = document.getElementById('loginForm');
const btn = document.getElementById('btn');

const passwordInput = document.getElementById('password');
const togglePwd = document.getElementById('togglePwd');
const togglePwdIcon = document.getElementById('togglePwdIcon');

// Modal elements
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalIcon = document.getElementById('modalIcon');
const modalIconWrap = document.getElementById('modalIconWrap');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalActions = document.getElementById('modalActions');
const modalOkBtn = document.getElementById('modalOkBtn');

let modalState = {
  open: false,
  closable: true,
  lastFocus: null,
  mode: 'info' // info | success | error | loading
};

function setModalVariant(mode) {
  modalState.mode = mode;

  // Reset icon wrap style
  modalIconWrap.style.background = '';
  modalIconWrap.style.borderColor = '';

  if (mode === 'success') {
    modalIcon.textContent = 'check_circle';
    // Verde suave (sin depender de Tailwind)
    modalIconWrap.style.background = 'rgba(34,197,94,.12)';
    modalIconWrap.style.borderColor = 'rgba(34,197,94,.25)';
  } else if (mode === 'error') {
    modalIcon.textContent = 'error';
    modalIconWrap.style.background = 'rgba(244,63,94,.12)';
    modalIconWrap.style.borderColor = 'rgba(244,63,94,.25)';
  } else if (mode === 'loading') {
    modalIcon.textContent = 'progress_activity';
    modalIconWrap.style.background = 'rgba(249,245,6,.14)';
    modalIconWrap.style.borderColor = 'rgba(249,245,6,.25)';
  } else {
    modalIcon.textContent = 'info';
  }
}

function setModalClosable(closable) {
  modalState.closable = !!closable;

  // Botón cerrar + botón OK
  modalCloseBtn.style.display = closable ? '' : 'none';
  modalActions.style.display = closable ? '' : 'none';

  // Clic en backdrop solo si es closable
  modalOverlay.querySelector('.modal-backdrop').style.pointerEvents = closable ? 'auto' : 'none';
}

function openModal({ title, message, mode = 'info', closable = true }) {
  modalState.lastFocus = document.activeElement;
  setModalVariant(mode);
  setModalClosable(closable);

  modalTitle.textContent = title || 'Aviso';
  modalDesc.innerHTML = message || '';

  modalOverlay.classList.remove('hidden');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  modalState.open = true;

  // Foco
  if (closable) modalOkBtn.focus();
}

function closeModal() {
  if (!modalState.open) return;
  if (!modalState.closable) return;

  modalOverlay.classList.add('hidden');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  modalState.open = false;

  // Devolver foco
  if (modalState.lastFocus && typeof modalState.lastFocus.focus === 'function') {
    modalState.lastFocus.focus();
  }
}

function bindModalCloseHandlers() {
  // Botones/elementos con data-modal-close
  modalOverlay.addEventListener('click', (e) => {
    const closeEl = e.target.closest('[data-modal-close]');
    if (!closeEl) return;
    closeModal();
  });

  // ESC para cerrar (solo si closable)
  document.addEventListener('keydown', (e) => {
    if (!modalState.open) return;
    if (!modalState.closable) return;
    if (e.key === 'Escape') closeModal();
  });
}

bindModalCloseHandlers();

// Toggle password
togglePwd.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  togglePwdIcon.textContent = show ? 'visibility_off' : 'visibility';
});

// Helpers
function showLoadingModal() {
  openModal({
    title: 'Verificando acceso…',
    message: `<div class="mt-3 flex items-center justify-center gap-3">
                <span class="spinner"></span>
                <span>Un momento, por favor.</span>
              </div>`,
    mode: 'loading',
    closable: false
  });
}

function showErrorModal(text) {
  openModal({
    title: 'No se pudo iniciar sesión',
    message: text || 'Credenciales inválidas.',
    mode: 'error',
    closable: true
  });
}

function showSuccessModal() {
  openModal({
    title: 'Acceso concedido',
    message: 'Autenticado correctamente. Entrando al panel…',
    mode: 'success',
    closable: false
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = passwordInput.value;

  // UI: evita doble submit
  btn.disabled = true;

  showLoadingModal();

  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok || !data.ok) {
      // Cierra el loading y muestra error
      // (forzamos closable para cerrar)
      modalState.closable = true;
      modalOverlay.querySelector('.modal-backdrop').style.pointerEvents = 'auto';
      modalCloseBtn.style.display = '';
      modalActions.style.display = '';
      closeModal();

      showErrorModal(data.error || 'Credenciales inválidas o usuario inactivo.');
      return;
    }

    // Success
    showSuccessModal();

    // Redirige un poco después (para que el usuario lo vea claro)
    setTimeout(() => {
      window.location.href = '/admin';
    }, 650);
  } catch {
    // Cierra loading y muestra error
    modalState.closable = true;
    modalOverlay.querySelector('.modal-backdrop').style.pointerEvents = 'auto';
    modalCloseBtn.style.display = '';
    modalActions.style.display = '';
    closeModal();

    showErrorModal('Error de red / servidor. Intenta de nuevo.');
  } finally {
    btn.disabled = false;
  }
});
