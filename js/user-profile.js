(() => {
  const modal = document.getElementById('user-modal');
  const modalContent = document.getElementById('user-modal-content');
  const profileDetails = document.getElementById('user-profile-details');
  const profileTitle = document.getElementById('user-profile-title');
  const profileSubtitle = document.getElementById('user-profile-subtitle');

  if (!modal || !modalContent || !profileDetails) return;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  async function getUser(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) throw new Error('Некорректный ID пользователя.');
    const response = await fetch(`https://dummyjson.com/users/${id}`);
    if (!response.ok) throw new Error(response.status === 404 ? 'Пользователь не найден.' : 'Не удалось загрузить данные пользователя.');
    return response.json();
  }

  function renderUser(container, user, withLink) {
    container.replaceChildren();
    const avatar = element('img', withLink ? 'user-modal__avatar' : 'user-profile-avatar');
    avatar.src = user.image;
    avatar.alt = `Фото: ${user.firstName} ${user.lastName}`;
    container.append(avatar, element('h2', '', `${user.firstName} ${user.lastName}`));
    container.append(
      element('p', '', user.email),
      element('p', '', `Телефон: ${user.phone}`),
      element('p', '', `Возраст: ${user.age}`),
      element('p', '', `Адрес: ${user.address.address}, ${user.address.city}`),
      element('p', '', `Компания: ${user.company.name} · ${user.company.title}`)
    );
    if (withLink) {
      const link = element('button', 'todo-open-button user-profile-link', 'Открыть страницу пользователя');
      link.type = 'button';
      link.dataset.action = 'user-profile-open';
      link.dataset.userId = user.id;
      container.append(link);
    }
  }

  async function loadProfile(userId) {
    profileDetails.textContent = 'Загрузка данных пользователя…';
    try {
      const user = await getUser(userId);
      profileTitle.textContent = `${user.firstName} ${user.lastName}`;
      profileSubtitle.textContent = `Профиль пользователя #${user.id} из DummyJSON`;
      renderUser(profileDetails, user, false);
    } catch (error) {
      profileDetails.textContent = error.message;
    }
  }

  document.addEventListener('click', async (event) => {
    const control = event.target.closest('[data-action]');
    if (!control) return;

    if (control.dataset.action === 'user-modal-close') {
      modal.hidden = true;
      return;
    }
    if (control.dataset.action === 'user-profile-back') {
      showPage('todos');
      return;
    }
    if (control.dataset.action === 'user-profile-open') {
      modal.hidden = true;
      showPage('user-profile');
      await loadProfile(control.dataset.userId);
      return;
    }
    if (control.dataset.action !== 'user-open') return;

    modal.hidden = false;
    modalContent.textContent = 'Загрузка профиля…';
    try {
      const user = await getUser(control.dataset.userId);
      renderUser(modalContent, user, true);
    } catch (error) {
      modalContent.textContent = error.message;
    }
    modal.querySelector('[data-action="user-modal-close"]')?.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) modal.hidden = true;
  });

  function showPage(pageId) {
    const page = document.getElementById(`page-${pageId}`);
    if (!page) return;
    document.querySelectorAll('.page').forEach((item) => item.classList.toggle('active', item === page));
    document.querySelectorAll('#navbar > button[data-page]').forEach((button) => {
      const active = button.dataset.page === pageId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    const memberTabs = document.getElementById('member-tabs');
    if (memberTabs) memberTabs.hidden = pageId !== 'resume';
  }
})();
