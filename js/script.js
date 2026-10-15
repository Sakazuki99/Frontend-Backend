(() => {
  const $ = (id) => document.getElementById(id);
  const TODOS_PER_PAGE = 12;
  const USER_ROUTE = /^#user\/(\d+)$/;

  
  function h(tag, props = {}, ...children) {
    const { className, dataset, attrs, ...rest } = props;
    const node = document.createElement(tag);
    if (className) node.className = className;
    Object.assign(node.dataset, dataset);
    Object.entries(attrs || {}).forEach(([name, value]) => node.setAttribute(name, value));
    Object.assign(node, rest);
    node.append(...children.flat().filter((child) => child != null && child !== false));
    return node;
  }

  const button = (text, className, dataset = {}, extra = {}) =>
    h('button', { type: 'button', className, dataset, textContent: text, ...extra });

  const retryButton = (action, userId, text = 'Повторить') =>
    button(text, 'todo-open-button', { action, userId: String(userId) });

  const avatarImage = (className, src) => h('img', { className, src, alt: '', loading: 'lazy' });

  
  const state = {
    todos: [],
    page: 1,
    sort: 'newest',
    loadVersion: 0,
    searchTimer: 0,
    activeDialogId: null,
  };
  const userCache = new Map();
  const userViews = new WeakMap(); 
  const saveQueue = new Map(); // id задачи -> Promise: изменения одной задачи уходят на сервер строго по очереди
  let userDirectory = null; // id -> {firstName, lastName, image}; грузится одним запросом
  let sortFieldSeq = 0;
  const el = {};

  const sortOptions = [
    ['newest', 'Сначала новые'],
    ['oldest', 'Сначала старые'],
    ['title-asc', 'Название: А—Я'],
    ['title-desc', 'Название: Я—А'],
  ];

  function initialize() {
    [
      'member-tabs', 'task1-result', 'task2-target-element', 'class-list-output', 'table-rows', 'table-cols',
      'table-container', 'cell-color-picker', 'color-stats-output', 'theme-toggle-btn', 'todo-count', 'todo-summary',
      'todo-progress-fill', 'todo-list', 'todo-search', 'todo-search-clear', 'todo-filter', 'todo-sort-field',
      'todo-pagination', 'todo-create-form', 'todo-notice', 'todo-detail-dialog', 'todo-detail-dialog-title',
      'todo-detail-dialog-content', 'todo-user-dialog', 'todo-user-dialog-content', 'user-profile-content',
      'user-profile-title',
    ].forEach((id) => { el[id] = $(id); });
    el.todoProgress = document.querySelector('.todo-progress');
    el.todoRefresh = document.querySelector('[data-action="todos-refresh"]');
    el.createToggle = document.querySelector('[data-action="todo-create-toggle"]');

    el['todo-sort-field']?.replaceWith(createSortField('todo-sort'));

    initTheme();
    initTask1();
    initTask3();
    updateTask2ClassList();
    loadUserDirectory();
    loadTodos();

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('change', handleChange);
    document.addEventListener('submit', handleTodoSubmit);
    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    el['todo-search']?.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => goToFirstPage(), 160);
    });
    el['todo-filter']?.addEventListener('change', goToFirstPage);
  }

  async function loadUserDirectory() {
    if (!window.fakeTodoApi) return;
    try {
      userDirectory = new Map((await window.fakeTodoApi.getUsers()).map((user) => [Number(user.id), user]));
      if (state.todos.length) renderTodos();
      refreshUserViews();
    } catch {
      // Без справочника показываем «Пользователь #ID» — не критично.
    }
  }

  const loadUserTodos = (id) => state.todos.length
    ? Promise.resolve(state.todos.filter((todo) => Number(todo.userId) === id))
    : window.fakeTodoApi.getByUserId(id);

  function handleKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const node = event.target.closest?.('.editable-paragraph, td[data-color]');
    if (!node) return;
    event.preventDefault();
    node.click();
  }

  function goToFirstPage() {
    state.page = 1;
    renderTodos();
  }

  function resetFilters() {
    el['todo-search'].value = '';
    el['todo-filter'].value = 'all';
  }

  
  function handleChange(event) {
    const sortSelect = event.target.closest('select[data-action="todo-sort"]');
    if (sortSelect) {
      state.sort = sortSelect.value;
      document.querySelectorAll('select[data-action="todo-sort"]').forEach((select) => { select.value = state.sort; });
      goToFirstPage();
      renderUserTaskCards();
      return;
    }
    const checkbox = event.target.closest('input[data-action="todo-toggle"]');
    if (checkbox) {
      const { id } = checkbox.dataset;
      const scopeId = checkbox.closest('#todo-list, #user-profile-content, #todo-user-dialog-content')?.id;
      toggleTodo(id, checkbox.checked);
      // Карточки перерисованы — возвращаем фокус клавиатурным пользователям.
      if (scopeId) document.querySelector(`#${scopeId} [data-action="todo-toggle"][data-id="${id}"]`)?.focus();
    }
  }

  const actions = {
    'open-member': (c) => showMember(c.dataset.member || 'p1'),
    'create-task1-element': (c) => createTask1Element(c),
    'toggle-task2-class': () => { el['task2-target-element']?.classList.toggle('active'); updateTask2ClassList(); },
    'toggle-theme': () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true),
    'generate-table': () => generateTable(),
    'todos-refresh': () => loadTodos(),
    'todo-create-toggle': () => toggleCreateTodoForm(),
    'todo-open': (c) => openTodoDialog(c.dataset.id),
    'todo-edit': (c) => renderTodoEditDialog(c.dataset.id),
    'todo-edit-cancel': () => renderTodoDetails(state.activeDialogId),
    'todo-detail-close': () => el['todo-detail-dialog']?.close(),
    'todo-delete': (c) => deleteTodo(c.dataset.id),
    'todo-page': (c) => { state.page += Number(c.dataset.direction); renderTodos(); },
    'todo-search-clear': () => { el['todo-search'].value = ''; goToFirstPage(); el['todo-search'].focus(); },
    'todo-clear-filters': () => { resetFilters(); goToFirstPage(); el['todo-search'].focus(); },
    'todo-user': (c) => openTodoUserDialog(c.dataset.userId),
    'todo-user-close': () => el['todo-user-dialog']?.close(),
    'user-retry': (c) => renderUserView(c.closest('#todo-user-dialog-content, #user-profile-content'), c.dataset.userId, true),
  };

  function handleClick(event) {
    const { target } = event;
    const routeLink = target.closest('a[href^="#user/"], a[href="#todos"]');
    if (routeLink) {
      event.preventDefault();
      const hash = routeLink.getAttribute('href');
      if (location.hash === hash) handleRoute();
      else location.hash = hash;
      return;
    }

    if (target instanceof HTMLDialogElement) {
      // Клик по ::backdrop приходит с target = dialog; клики по отступам самого окна игнорируем.
      const { left, right, top, bottom } = target.getBoundingClientRect();
      const inside = event.clientX >= left && event.clientX <= right && event.clientY >= top && event.clientY <= bottom;
      if (!inside) target.close();
      return;
    }

    const paragraph = target.closest('.editable-paragraph');
    if (paragraph) {
      paragraph.classList.toggle('is-changed');
      return;
    }

    const control = target.closest('[data-page], [data-member], [data-action]');
    if (!control) return;
    const { page, member, action } = control.dataset;

    if (page) {
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      showPage(page);
      if (page === 'resume') showMember(document.querySelector('.panel.active')?.id || 'p1');
    } else if (member) {
      showMember(member);
    } else {
      actions[action]?.(control);
    }
  }

  
  function showPage(pageId) {
    const page = $(`page-${pageId}`);
    if (!page) return;
    document.body.dataset.page = pageId;
    document.querySelectorAll('.page').forEach((item) => item.classList.toggle('active', item === page));
    document.querySelectorAll('#navbar > button[data-page]').forEach((btn) => {
      const isActive = btn.dataset.page === pageId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
    if (el['member-tabs']) el['member-tabs'].hidden = pageId !== 'resume';
  }

  function showMember(memberId) {
    const panel = $(memberId);
    if (!panel?.matches('.panel')) return;
    showPage('resume');
    document.querySelectorAll('.panel').forEach((item) => item.classList.toggle('active', item === panel));
    document.querySelectorAll('#member-tabs button[data-target]').forEach((btn) => {
      const isActive = btn.dataset.target === memberId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function handleRoute() {
    const match = location.hash.match(USER_ROUTE);
    const isTodos = location.hash === '#todos';
    if (match || isTodos) {
      el['todo-detail-dialog']?.close();
      el['todo-user-dialog']?.close();
      showPage(match ? 'user' : 'todos');
      if (match) renderUserView(el['user-profile-content'], match[1]);
    } else if (!location.hash && $('page-user')?.classList.contains('active')) {
      showPage('todos');
    }
  }

  
  const getUserName = (user) =>
    [user.firstName, user.lastName].filter(Boolean).join(' ') || `Пользователь #${user.id}`;

  function getUserData(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return Promise.resolve(null);
    if (userCache.has(id)) return userCache.get(id);

    const request = window.fakeTodoApi.getUserById(id).then(
      (user) => {
        if (!user) userCache.delete(id);
        return user;
      },
      (error) => {
        userCache.delete(id);
        throw error;
      },
    );
    userCache.set(id, request);
    return request;
  }

  const isValidId = (id) => Number.isInteger(id) && id > 0;

  function renderUserLoading(container, message) {
    container.replaceChildren(h('p', { className: 'user-load-status', textContent: message, attrs: { role: 'status' } }));
    container.setAttribute('aria-busy', 'true');
  }

  function renderUserError(container, message, userId) {
    container.replaceChildren(
      h('p', { className: 'user-load-error', textContent: `Не удалось загрузить данные: ${message}` }),
      retryButton('user-retry', userId),
    );
    container.removeAttribute('aria-busy');
  }

  
  async function renderUserView(container, userId, retry = false) {
    const id = Number(userId);
    if (!container || !isValidId(id)) return;

    const isProfile = container === el['user-profile-content'];
    const version = (userViews.get(container)?.version || 0) + 1;
    const view = { version, todos: [] };
    userViews.set(container, view);
    container.dataset.userId = String(id);
    const isStale = () => userViews.get(container) !== view || (!isProfile && !el['todo-user-dialog'].open);

    if (isProfile) el['user-profile-title'].textContent = `Профиль пользователя #${id}`;
    renderUserLoading(container, 'Загружаем данные пользователя…');

    try {
      if (retry) userCache.delete(id);
      const [userResult, todosResult] = await Promise.allSettled([
        getUserData(id),
        loadUserTodos(id),
      ]);
      if (isStale()) return;
      if (userResult.status === 'rejected') throw userResult.reason;
      const user = userResult.value;
      if (!user) throw new Error(`Пользователь с ID ${id} не найден.`);

      if (isProfile) el['user-profile-title'].textContent = getUserName(user);
      const todosOk = todosResult.status === 'fulfilled';
      view.todos = todosOk ? todosResult.value : [];
      const details = createUserDetails(user, !isProfile);
      const tasks = todosOk ? createUserTasksSection(view.todos) : createUserTasksError(id, todosResult.reason.message);

      container.replaceChildren(...(isProfile ? [details, tasks] : [h('div', { className: 'user-modal' }, details, tasks)]));
      container.removeAttribute('aria-busy');
    } catch (error) {
      if (!isStale()) renderUserError(container, error.message, id);
    }
  }

  function openTodoUserDialog(userId) {
    const dialog = el['todo-user-dialog'];
    if (!dialog || !isValidId(Number(userId))) return;
    if (!dialog.open) dialog.showModal();
    return renderUserView(el['todo-user-dialog-content'], userId);
  }

  
  // Обновляем уже открытые профили из локального состояния — без повторных запросов и «мигания».
  function refreshUserViews() {
    [el['user-profile-content'], el['todo-user-dialog-content']].forEach((container) => {
      const view = userViews.get(container);
      const section = container?.querySelector('.user-tasks-section:not(.user-tasks-error)');
      if (!view || !section || !state.todos.length) return;
      const userId = Number(container.dataset.userId);
      view.todos = state.todos.filter((todo) => Number(todo.userId) === userId);
      section.replaceWith(createUserTasksSection(view.todos));
    });
  }

  function createUserDetails(user, compact) {
    const address = [user.address?.address, user.address?.city, user.address?.state].filter(Boolean).join(', ');
    const company = [user.company?.name, user.company?.title].filter(Boolean).join(' · ');
    const rows = [
      ['Электронная почта', user.email],
      ['Телефон', user.phone],
      ['Возраст', user.age ? `${user.age} лет` : ''],
      ['Пол', user.gender],
      ['Адрес', address],
      ['Компания', company],
      ['Университет', user.university],
    ].filter(([, value]) => value);

    return h('div', { className: `user-details${compact ? ' user-details--compact' : ''}` },
      h('div', { className: 'user-details-identity' },
        user.image && avatarImage('user-details-avatar', user.image),
        h('div', {},
          h(compact ? 'h3' : 'h2', { textContent: getUserName(user) }),
          h('p', { className: 'user-details-username', textContent: user.username ? `@${user.username}` : `ID: ${user.id}` }),
        ),
      ),
      h('dl', { className: 'user-details-list' },
        rows.map(([label, value]) => h('div', {}, h('dt', { textContent: label }), h('dd', { textContent: value }))),
      ),
      compact && h('a', {
        className: 'cta-btn user-profile-link',
        href: `#user/${user.id}`,
        textContent: 'Открыть страницу пользователя',
      }),
    );
  }

  function createUserTasksSection(todos) {
    const done = todos.filter((todo) => todo.completed).length;
    const section = h('section', { className: 'user-tasks-section' },
      h('div', { className: 'user-tasks-heading' },
        h('div', { className: 'user-tasks-heading-copy' },
          h('h2', { textContent: 'Задачи пользователя' }),
          h('p', { textContent: `Всего: ${todos.length} · В работе: ${todos.length - done} · Выполнено: ${done}` }),
        ),
        createSortField(`user-task-sort-${++sortFieldSeq}`),
      ),
    );

    if (todos.length === 0) {
      section.append(h('p', { className: 'user-tasks-empty', textContent: 'У этого пользователя пока нет задач.' }));
    } else {
      const list = h('div', { className: 'todo-list' });
      renderTodoCards(list, sortTodos(todos));
      section.append(list);
    }
    return section;
  }

  const createUserTasksError = (userId, message) =>
    h('section', { className: 'user-tasks-section user-tasks-error' },
      h('h2', { textContent: 'Не удалось загрузить задачи' }),
      h('p', { textContent: message || 'Проверьте подключение и попробуйте ещё раз.' }),
      retryButton('user-retry', userId, 'Повторить загрузку'),
    );

  
  function createSortField(id) {
    const select = h('select', { id, dataset: { action: 'todo-sort' } },
      sortOptions.map(([value, text]) => h('option', { value, textContent: text })));
    select.value = state.sort;
    return h('div', { className: 'todo-filter-field' }, h('label', { htmlFor: id, textContent: 'Сортировать' }), select);
  }

  function sortTodos(todos, order = state.sort) {
    return [...todos].sort((left, right) => {
      const idOrder = Number(right.id) - Number(left.id);
      if (order === 'oldest') return -idOrder;
      if (order === 'title-asc' || order === 'title-desc') {
        const titleOrder = String(left.todo).localeCompare(String(right.todo), 'ru', { sensitivity: 'base' });
        return (order === 'title-desc' ? -titleOrder : titleOrder) || idOrder;
      }
      return idOrder;
    });
  }

  const renderTodoCards = (list, todos) => list.replaceChildren(...todos.map((todo) => createTodoCard(todo)));

  function renderUserTaskCards() {
    [el['user-profile-content'], el['todo-user-dialog-content']].forEach((container) => {
      const list = container?.querySelector('.user-tasks-section .todo-list');
      if (list) renderTodoCards(list, sortTodos(userViews.get(container)?.todos || []));
    });
  }

  function createTodoCard(todo) {
    const id = String(todo.id);
    const checkbox = h('input', {
      type: 'checkbox',
      dataset: { action: 'todo-toggle', id },
      checked: todo.completed,
      attrs: { 'aria-label': todo.completed ? 'Снять отметку выполнения задачи' : 'Отметить задачу выполненной' },
    });

    return h('article', { className: `todo-card task-card${todo.completed ? ' is-completed' : ''}`, dataset: { todoId: id } },
      h('div', { className: 'task-card-heading-row' },
        createTodoAssignee(todo),
        h('h2', { className: 'todo-card-title task-card-title', textContent: todo.todo }),
        h('label', {
          className: `todo-checkbox-status${todo.completed ? ' is-complete' : ''}`,
          title: todo.completed ? 'Снять отметку выполнения' : 'Отметить выполнение',
        }, checkbox),
      ),
      h('p', { className: 'todo-meta', textContent: `Задача #${todo.id}` }),
      h('div', { className: 'todo-actions' },
        button('Подробнее', 'todo-open-button', { action: 'todo-open', id }),
        button('×', 'todo-open-button todo-delete-button', { action: 'todo-delete', id }, {
          title: 'Удалить задачу',
          attrs: { 'aria-label': 'Удалить задачу' },
        }),
      ),
    );
  }

  function createTodoAssignee(todo) {
    const assignee = button('', 'todo-assignee', { action: 'todo-user', userId: String(todo.userId) });
    renderTodoAssignee(assignee, userDirectory?.get(Number(todo.userId)) ?? null, todo.userId);
    return assignee;
  }

  function renderTodoAssignee(node, user, userId) {
    const name = user ? getUserName(user) : `Пользователь #${userId}`;
    const initials = user ? name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase() : '#';
    node.replaceChildren(
      user?.image
        ? avatarImage('todo-assignee-avatar', user.image)
        : h('span', { className: 'todo-assignee-avatar', textContent: initials }),
      h('span', { className: 'todo-assignee-name', textContent: name }),
    );
    node.setAttribute('aria-label', `Открыть профиль: ${name}`);
    node.title = name;
  }

  function createTodoEmptyState(hasTasks) {
    const [icon, title, text, label, action] = hasTasks
      ? ['⌕', 'Ничего не найдено', 'Попробуйте изменить запрос или сбросить фильтры.', 'Сбросить фильтры', 'todo-clear-filters']
      : ['✓', 'Пока нет задач', 'Добавьте первое дело, чтобы начать планировать.', 'Создать задачу', 'todo-create-toggle'];
    return h('div', { className: 'todo-empty-state' },
      h('span', { className: 'todo-empty-icon', textContent: icon, attrs: { 'aria-hidden': 'true' } }),
      h('h2', { textContent: title }),
      h('p', { textContent: text }),
      button(label, 'todo-open-button', { action }),
    );
  }

  function createLoadError() {
    return h('div', { className: 'todo-empty-state todo-load-error' },
      h('span', { className: 'todo-empty-icon', textContent: '!', attrs: { 'aria-hidden': 'true' } }),
      h('h2', { textContent: 'Не удалось загрузить задачи' }),
      h('p', { textContent: 'Проверьте подключение к интернету и попробуйте ещё раз.' }),
      button('Повторить загрузку', 'todo-open-button', { action: 'todos-refresh' }),
    );
  }

  
  function setLoading(isLoading) {
    const setBusy = (node) => (isLoading ? node.setAttribute('aria-busy', 'true') : node.removeAttribute('aria-busy'));
    setBusy(el['todo-list']);
    if (!el.todoRefresh) return;
    el.todoRefresh.disabled = isLoading;
    setBusy(el.todoRefresh);
  }

  async function loadTodos() {
    if (!el['todo-list']) return false;
    if (!window.fakeTodoApi) {
      el['todo-count'].textContent = 'Не удалось загрузить модуль задач';
      el['todo-list'].replaceChildren(createLoadError());
      return false;
    }

    const version = ++state.loadVersion;
    setLoading(true);
    if (state.todos.length === 0) {
      el['todo-count'].textContent = 'Загружаем задачи…';
      el['todo-list'].replaceChildren(...Array.from({ length: 6 }, () =>
        h('div', { className: 'todo-skeleton', attrs: { 'aria-hidden': 'true' } })));
    }

    try {
      const todos = await window.fakeTodoApi.getAll();
      if (version !== state.loadVersion) return false;
      state.todos = todos;
      setTodoNotice('');
      renderTodos();
      return true;
    } catch (error) {
      if (version !== state.loadVersion) return false;
      el['todo-count'].textContent = 'Не удалось обновить список';
      el['todo-summary'].textContent = 'Проверьте подключение и попробуйте ещё раз';
      el.todoProgress.hidden = true;
      if (state.todos.length === 0) el['todo-list'].replaceChildren(createLoadError());
      setTodoNotice(error.message, 'error');
      return false;
    } finally {
      if (version === state.loadVersion) setLoading(false);
    }
  }

  function renderTodos() {
    if (!el['todo-list']) return;

    const { todos } = state;
    const search = el['todo-search'].value.trim().toLocaleLowerCase();
    const filter = el['todo-filter'].value;
    const completed = todos.filter((todo) => todo.completed).length;
    const completion = todos.length ? Math.round((completed / todos.length) * 100) : 0;

    el['todo-summary'].textContent = `${todos.length - completed} в работе · ${completed} выполнено`;
    el.todoProgress.setAttribute('aria-valuenow', String(completion));
    el.todoProgress.setAttribute('aria-valuetext', `${completion}% выполнено`);
    el['todo-progress-fill'].style.width = `${completion}%`;
    el.todoProgress.hidden = todos.length === 0;
    el['todo-search-clear'].hidden = !search;

    const filtered = sortTodos(todos.filter((todo) => {
      const text = `${todo.todo} ${todo.userId} ${todo.id}`.toLocaleLowerCase();
      const matchesFilter = filter === 'all' || (filter === 'active' ? !todo.completed : todo.completed);
      return text.includes(search) && matchesFilter;
    }));
    const pageCount = Math.max(1, Math.ceil(filtered.length / TODOS_PER_PAGE));
    state.page = Math.min(Math.max(state.page, 1), pageCount);
    const start = (state.page - 1) * TODOS_PER_PAGE;

    el['todo-count'].textContent = search || filter !== 'all'
      ? `${filtered.length} из ${todos.length} задач`
      : `Всего задач: ${todos.length}`;

    if (filtered.length === 0) el['todo-list'].replaceChildren(createTodoEmptyState(todos.length > 0));
    else renderTodoCards(el['todo-list'], filtered.slice(start, start + TODOS_PER_PAGE));

    const pagination = el['todo-pagination'];
    pagination.querySelector('[data-page-label]').textContent = `Страница ${state.page} из ${pageCount}`;
    pagination.querySelector('[data-direction="-1"]').disabled = state.page <= 1;
    pagination.querySelector('[data-direction="1"]').disabled = state.page >= pageCount;
    pagination.hidden = filtered.length <= TODOS_PER_PAGE;
  }

  function setTodoNotice(message, type = '') {
    if (!el['todo-notice']) return;
    el['todo-notice'].textContent = message;
    el['todo-notice'].className = `todo-notice${type ? ` is-${type}` : ''}`;
  }

  
  const findTodo = (id) => state.todos.find((item) => item.id === Number(id));
  const replaceTodo = (updated) => {
    state.todos = state.todos.map((item) => (item.id === updated.id ? updated : item));
  };

  function showDialogContent(title, content) {
    el['todo-detail-dialog-title'].textContent = title;
    el['todo-detail-dialog-content'].replaceChildren(content);
  }

  function openTodoDialog(id) {
    const todo = findTodo(id);
    if (!todo || !el['todo-detail-dialog']) return;
    state.activeDialogId = String(todo.id);
    renderTodoDetails(todo.id);
    if (!el['todo-detail-dialog'].open) el['todo-detail-dialog'].showModal();
  }

  function renderTodoDetails(id) {
    const todo = findTodo(id);
    if (!todo || !el['todo-detail-dialog-content']) return;

    showDialogContent('Детали задачи', h('div', { className: 'todo-detail-content' },
      h('h3', { className: 'todo-detail-title', textContent: todo.todo }),
      h('p', { className: 'todo-meta', textContent: `Задача #${todo.id}` }),
      h('p', {
        className: `todo-detail-status${todo.completed ? ' is-completed' : ''}`,
        textContent: todo.completed ? 'Выполнена' : 'В работе',
      }),
      createTodoAssignee(todo),
      h('div', { className: 'todo-detail-actions' },
        button('Изменить', 'cta-btn', { action: 'todo-edit', id: String(todo.id) })),
    ));
  }

  function renderTodoEditDialog(id) {
    const todo = findTodo(id);
    if (!todo || !el['todo-detail-dialog-content']) return;
    state.activeDialogId = String(todo.id);
    showDialogContent('Изменить задачу', createTodoEditForm(todo));
    el['todo-detail-dialog-content'].querySelector('[name="todo"]')?.focus();
  }

  function createTodoEditForm(todo) {
    return h('form', { className: 'todo-form todo-dialog-edit-form', dataset: { todoForm: 'update', id: todo.id } },
      h('label', { textContent: 'Название задачи' },
        h('input', { name: 'todo', required: true, maxLength: 200, value: todo.todo })),
      h('label', { textContent: 'ID пользователя' },
        h('input', { name: 'userId', type: 'number', min: '1', step: '1', required: true, value: todo.userId })),
      h('label', { className: 'todo-checkbox-label' },
        h('input', { name: 'completed', type: 'checkbox', checked: todo.completed }),
        ' Выполнена'),
      h('button', { type: 'submit', className: 'todo-open-button', textContent: 'Сохранить' }),
      button('Отмена', 'todo-open-button', { action: 'todo-edit-cancel', id: todo.id }),
    );
  }

  function toggleCreateTodoForm() {
    const form = el['todo-create-form'];
    if (!form || !el.createToggle) return;
    setCreateFormOpen(form.hidden);
    if (!form.hidden) form.querySelector('[name="todo"]')?.focus();
  }

  function setCreateFormOpen(isOpen) {
    el['todo-create-form'].hidden = !isOpen;
    el.createToggle.setAttribute('aria-expanded', String(isOpen));
    el.createToggle.textContent = isOpen ? 'Скрыть форму' : 'Добавить задачу';
  }

  
  const todoPayload = (data) => ({
    todo: data.get('todo'),
    userId: Number(data.get('userId')),
    completed: data.get('completed') === 'on',
  });

  async function handleTodoSubmit(event) {
    const form = event.target.closest('form[data-todo-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.busy === 'true') return;

    const payload = todoPayload(new FormData(form));

    // Редактирование — оптимистично: окно сразу показывает новые данные, сервер получает запрос в фоне.
    if (form.dataset.todoForm !== 'create') {
      payload.todo = payload.todo.trim();
      if (!payload.todo) {
        setTodoNotice('Название задачи не может быть пустым.', 'error');
        return;
      }
      saveTodoChange(form.dataset.id, payload, 'Не удалось сохранить изменения', 'Изменения сохранены.');
      renderTodoDetails(Number(form.dataset.id));
      return;
    }

    // Создание ждёт ответ сервера: id новой задачи выдаёт API.
    const submit = form.querySelector('[type="submit"]');
    const originalLabel = submit?.textContent;
    form.dataset.busy = 'true';
    form.setAttribute('aria-busy', 'true');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Добавляем…';
    }
    try {
      const created = await window.fakeTodoApi.create(payload);
      form.reset();
      setCreateFormOpen(false);
      resetFilters();
      state.todos = [created, ...state.todos.filter((todo) => todo.id !== created.id)];
      goToFirstPage();
      setTodoNotice('Задача добавлена.', 'success');
    } catch (error) {
      setTodoNotice(error.message, 'error');
    } finally {
      delete form.dataset.busy;
      form.removeAttribute('aria-busy');
      if (submit) {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
    }
  }

  // ---- Оптимистичные изменения -------------------------------------------------------------
  // Сначала меняем локальное состояние и интерфейс, затем отправляем запрос.
  // Запросы по одной задаче идут по очереди; при ошибке изменение откатывается.
  function enqueueSave(todoId, work) {
    const task = (saveQueue.get(todoId) ?? Promise.resolve()).then(work); // work сам ловит свои ошибки
    saveQueue.set(todoId, task);
    task.then(() => { if (saveQueue.get(todoId) === task) saveQueue.delete(todoId); });
    return task;
  }

  function refreshTodoViews(todoId) {
    renderTodos();
    refreshUserViews();
    const dialog = el['todo-detail-dialog'];
    // Не выкидываем пользователя из формы редактирования — перерисовываем только режим просмотра.
    if (dialog?.open && state.activeDialogId === String(todoId) && !dialog.querySelector('form')) renderTodoDetails(todoId);
  }

  function saveTodoChange(id, changes, errorPrefix, successMessage = '') {
    const todoId = Number(id);
    const previous = findTodo(todoId);
    if (!previous) return Promise.resolve();

    replaceTodo({ ...previous, ...changes });
    refreshTodoViews(todoId);

    return enqueueSave(todoId, async () => {
      try {
        await window.fakeTodoApi.update(todoId, changes);
        if (successMessage) setTodoNotice(successMessage, 'success');
      } catch (error) {
        const current = findTodo(todoId);
        if (current) {
          // Откатываем только те поля, которые пользователь не успел изменить повторно.
          const reverted = { ...current };
          Object.keys(changes).forEach((key) => { if (current[key] === changes[key]) reverted[key] = previous[key]; });
          replaceTodo(reverted);
          refreshTodoViews(todoId);
        }
        setTodoNotice(`${errorPrefix}: ${error.message}`, 'error');
      }
    });
  }

  const toggleTodo = (id, completed) => saveTodoChange(id, { completed }, 'Не удалось обновить задачу');

  function deleteTodo(id) {
    const todoId = Number(id);
    const previous = findTodo(todoId);
    if (!previous || !window.confirm(`Удалить задачу #${todoId}?`)) return;

    state.todos = state.todos.filter((todo) => todo.id !== todoId);
    refreshTodoViews(todoId);

    return enqueueSave(todoId, async () => {
      try {
        await window.fakeTodoApi.delete(todoId);
      } catch (error) {
        state.todos = [...state.todos, previous];
        refreshTodoViews(todoId);
        setTodoNotice(`Не удалось удалить задачу: ${error.message}`, 'error');
      }
    });
  }

  function initTask1() {
    const target = $('target-element');
    if (target) target.textContent = 'Привет, мир!';
    document.querySelectorAll('.old-element').forEach((node) => node.remove());

    const result = el['task1-result'];
    if (!result || result.querySelector('.editable-paragraph')) return;
    result.append(h('p', { className: 'editable-paragraph', textContent: 'Это изменяемый абзац.', tabIndex: 0, attrs: { role: 'button' } }));
  }

  function createTask1Element(trigger) {
    if (!document.querySelector('.new-div')) document.body.append(h('div', { className: 'new-div', textContent: 'Я новый элемент' }));
    if (trigger) trigger.disabled = true; // элемент создаётся один раз
  }

  
  function updateTask2ClassList() {
    const target = el['task2-target-element'];
    const output = el['class-list-output'];
    if (!target || !output) return;
    const classes = [...target.classList];
    output.textContent = classes.length ? classes.join(', ') : '(классы отсутствуют)';
  }

  
  const clampDimension = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(20, Math.max(1, parsed)) : 3;
  };

  function initTask3() {
    const { 'table-container': container } = el;
    if (!container || !el['table-rows'] || !el['table-cols']) return;

    container.addEventListener('click', (event) => {
      const cell = event.target.closest('td[data-color]');
      if (!cell) return;
      const selected = el['cell-color-picker']?.value || '#3b82f6';
      cell.dataset.color = cell.dataset.color === selected ? '' : selected;
      cell.style.backgroundColor = cell.dataset.color;
      updateColorStats();
    });
    generateTable();
  }

  function generateTable() {
    const container = el['table-container'];
    if (!container || !el['table-rows'] || !el['table-cols']) return;

    const rows = (el['table-rows'].value = clampDimension(el['table-rows'].value));
    const cols = (el['table-cols'].value = clampDimension(el['table-cols'].value));

    container.replaceChildren(h('table', {}, h('tbody', {},
      Array.from({ length: rows }, (_, r) => h('tr', {},
        Array.from({ length: cols }, (_, c) => h('td', {
          tabIndex: 0,
          dataset: { color: '' },
          attrs: { 'aria-label': `Ячейка ${r + 1}, ${c + 1}` },
        })))))));
    updateColorStats();
  }

  function updateColorStats() {
    const output = el['color-stats-output'];
    if (!el['table-container'] || !output) return;

    const counts = new Map();
    el['table-container'].querySelectorAll('td[data-color]').forEach(({ dataset: { color } }) => {
      if (color) counts.set(color, (counts.get(color) || 0) + 1);
    });

    if (counts.size === 0) {
      output.textContent = 'Нет закрашенных ячеек. Кликните по любой ячейке.';
      return;
    }

    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const items = [...counts].map(([color, count]) => h('span', { className: 'color-stat' },
      h('span', { className: 'color-stat__swatch', style: `background-color: ${color}` }),
      `${color}: ${count}`));
    const withSeparators = items.flatMap((item, i) => (i ? [' | ', item] : [item]));
    output.replaceChildren(`Всего закрашено ячеек: ${total}. По цветам: `, ...withSeparators);
  }

  
  function initTheme() {
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') theme = saved;
    } catch {
      // Хранилище может быть запрещено настройками браузера.
    }
    setTheme(theme);
  }

  // Сохраняем тему только после явного выбора пользователя, иначе системная тема никогда не применится.
  function setTheme(theme, persist = false) {
    document.documentElement.dataset.theme = theme;
    const themeButton = el['theme-toggle-btn'];
    if (themeButton) themeButton.textContent = theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная';
    if (!persist) return;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Переключение темы работает и без сохранения настройки.
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();