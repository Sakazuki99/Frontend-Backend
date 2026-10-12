(() => {
  const selectors = {
    pages: '.page',
    pageButtons: '#navbar > button[data-page]',
    memberPanels: '.panel',
    memberButtons: '#member-tabs button[data-target]',
  };

  const elements = {};
  let todoLoadVersion = 0;
  let todoPage = 1;
  const todosPerPage = 12;
  let allTodos = [];
  const userCache = new Map();
  let userDialogRequestVersion = 0;
  let userProfileRequestVersion = 0;
  const pendingTodoIds = new Set();
  const editingTodoIds = new Set();
  const todoEditDrafts = new Map();

  function initialize() {
    elements.memberTabs = document.getElementById('member-tabs');
    elements.task1Result = document.getElementById('task1-result');
    elements.task2Target = document.getElementById('task2-target-element');
    elements.task2Output = document.getElementById('class-list-output');
    elements.tableRows = document.getElementById('table-rows');
    elements.tableCols = document.getElementById('table-cols');
    elements.tableContainer = document.getElementById('table-container');
    elements.colorPicker = document.getElementById('cell-color-picker');
    elements.colorStats = document.getElementById('color-stats-output');
    elements.themeButton = document.getElementById('theme-toggle-btn');
    elements.todoCount = document.getElementById('todo-count');
    elements.todoSummary = document.getElementById('todo-summary');
    elements.todoProgress = document.querySelector('.todo-progress');
    elements.todoProgressFill = document.getElementById('todo-progress-fill');
    elements.todoList = document.getElementById('todo-list');
    elements.todoSearch = document.getElementById('todo-search');
    elements.todoSearchClear = document.getElementById('todo-search-clear');
    elements.todoFilter = document.getElementById('todo-filter');
    elements.todoPagination = document.getElementById('todo-pagination');
    elements.todoCreateForm = document.getElementById('todo-create-form');
    elements.todoRefresh = document.querySelector('[data-action="todos-refresh"]');
    elements.todoNotice = document.getElementById('todo-notice');
    elements.todoUserDialog = document.getElementById('todo-user-dialog');
    elements.todoUserDialogContent = document.getElementById('todo-user-dialog-content');
    elements.userProfileContent = document.getElementById('user-profile-content');
    elements.userProfileTitle = document.getElementById('user-profile-title');

    initializeTheme();
    initializeTask1();
    initializeTask3();
    updateTask2ClassList();
    loadTodos();

    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleTodoChange);
    document.addEventListener('submit', handleTodoSubmit);
    window.addEventListener('hashchange', handleUserRoute);
    handleUserRoute();
    elements.todoSearch?.addEventListener('input', () => {
      todoPage = 1;
      renderTodos();
    });
    elements.todoFilter?.addEventListener('change', () => {
      todoPage = 1;
      renderTodos();
    });
  }

  function handleTodoChange(event) {
    const checkbox = event.target.closest('input[data-action="todo-toggle"]');
    if (checkbox) toggleTodo(checkbox.dataset.id, checkbox);
  }

  function handleClick(event) {
    const routeLink = event.target.closest('a[href^="#user/"], a[href="#todos"]');
    if (routeLink) {
      event.preventDefault();
      navigateToHash(routeLink.getAttribute('href'));
      return;
    }

    if (event.target === elements.todoUserDialog) {
      elements.todoUserDialog.close();
      return;
    }

    const paragraph = event.target.closest('.editable-paragraph');
    if (paragraph) {
      paragraph.classList.toggle('is-changed');
      return;
    }

    const control = event.target.closest('[data-page], [data-member], [data-action]');
    if (!control) return;

    if (control.dataset.page) {
      if (window.location.hash.startsWith('#user/')) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
      showPage(control.dataset.page);
      if (control.dataset.page === 'resume' && !document.querySelector(`${selectors.memberPanels}.active`)) {
        showMember('p1');
      }
      return;
    }

    if (control.dataset.member) {
      showMember(control.dataset.member);
      return;
    }

    switch (control.dataset.action) {
      case 'open-member':
        showMember(control.dataset.member || 'p1');
        break;
      case 'create-task1-element':
        createTask1Element();
        break;
      case 'toggle-task2-class':
        elements.task2Target?.classList.toggle('active');
        updateTask2ClassList();
        break;
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'generate-table':
        generateTable();
        break;
      case 'todos-refresh':
        loadTodos();
        break;
      case 'todo-create-toggle':
        toggleCreateTodoForm();
        break;
      case 'todo-edit':
        toggleTodoEdit(control.dataset.id);
        break;
      case 'todo-delete':
        deleteTodo(control.dataset.id, control);
        break;
      case 'todo-page':
        todoPage += Number(control.dataset.direction);
        renderTodos();
        break;
      case 'todo-search-clear':
        elements.todoSearch.value = '';
        todoPage = 1;
        renderTodos();
        elements.todoSearch.focus();
        break;
      case 'todo-clear-filters':
        elements.todoSearch.value = '';
        elements.todoFilter.value = 'all';
        todoPage = 1;
        renderTodos();
        elements.todoSearch.focus();
        break;
      case 'todo-user':
        openTodoUserDialog(control.dataset.userId);
        break;
      case 'todo-user-close':
        elements.todoUserDialog?.close();
        break;
      case 'todo-user-retry':
        openTodoUserDialog(control.dataset.userId, true);
        break;
      case 'user-profile-retry':
        loadUserProfile(control.dataset.userId);
        break;
    }
  }

  function showPage(pageId) {
    const page = document.getElementById(`page-${pageId}`);
    if (!page) return;

    document.querySelectorAll(selectors.pages).forEach((item) => {
      item.classList.toggle('active', item === page);
    });

    document.querySelectorAll(selectors.pageButtons).forEach((button) => {
      button.classList.toggle('active', button.dataset.page === pageId);
      button.setAttribute('aria-current', button.dataset.page === pageId ? 'page' : 'false');
    });

    if (elements.memberTabs) {
      elements.memberTabs.hidden = pageId !== 'resume';
    }
  }

  function navigateToHash(hash) {
    if (window.location.hash === hash) {
      handleUserRoute();
      return;
    }
    window.location.hash = hash;
  }

  function handleUserRoute() {
    const match = window.location.hash.match(/^#user\/(\d+)$/);
    if (match) {
      elements.todoUserDialog?.close();
      showPage('user');
      loadUserProfile(Number(match[1]));
      return;
    }

    if (window.location.hash === '#todos') {
      elements.todoUserDialog?.close();
      showPage('todos');
      return;
    }

    if (!window.location.hash && document.getElementById('page-user')?.classList.contains('active')) {
      showPage('todos');
    }
  }

  async function getUserData(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return null;
    if (userCache.has(id)) return userCache.get(id);

    const request = window.fakeTodoApi.getUserById(id)
      .then((user) => {
        if (user) userCache.set(id, user);
        else userCache.delete(id);
        return user;
      })
      .catch((error) => {
        userCache.delete(id);
        throw error;
      });
    userCache.set(id, request);
    return request;
  }

  async function openTodoUserDialog(userId, retry = false) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1 || !elements.todoUserDialog) return;

    const requestVersion = ++userDialogRequestVersion;
    if (!elements.todoUserDialog.open) elements.todoUserDialog.showModal();
    renderUserLoading(elements.todoUserDialogContent, 'Загружаем данные пользователя…');

    try {
      if (retry) userCache.delete(id);
      const user = await getUserData(id);
      if (requestVersion !== userDialogRequestVersion || !elements.todoUserDialog.open) return;
      if (!user) throw new Error(`Пользователь с ID ${id} не найден.`);
      elements.todoUserDialogContent.replaceChildren(createUserDetails(user, true));
      elements.todoUserDialogContent.removeAttribute('aria-busy');
    } catch (error) {
      if (requestVersion !== userDialogRequestVersion || !elements.todoUserDialog.open) return;
      renderUserError(elements.todoUserDialogContent, error.message, 'todo-user-retry', id);
    }
  }

  async function loadUserProfile(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1 || !elements.userProfileContent) return;

    const requestVersion = ++userProfileRequestVersion;
    elements.userProfileTitle.textContent = `Профиль пользователя #${id}`;
    renderUserLoading(elements.userProfileContent, 'Загружаем профиль пользователя…');

    try {
      const user = await getUserData(id);
      if (requestVersion !== userProfileRequestVersion) return;
      if (!user) throw new Error(`Пользователь с ID ${id} не найден.`);
      elements.userProfileTitle.textContent = getUserName(user);
      elements.userProfileContent.replaceChildren(createUserDetails(user, false));
      elements.userProfileContent.removeAttribute('aria-busy');
    } catch (error) {
      if (requestVersion !== userProfileRequestVersion) return;
      renderUserError(elements.userProfileContent, error.message, 'user-profile-retry', id);
    }
  }

  function getUserName(user) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || `Пользователь #${user.id}`;
  }

  function createUserDetails(user, includeProfileLink) {
    const wrapper = document.createElement('div');
    wrapper.className = `user-details${includeProfileLink ? ' user-details--compact' : ''}`;

    const identity = document.createElement('div');
    identity.className = 'user-details-identity';
    if (user.image) {
      const avatar = document.createElement('img');
      avatar.className = 'user-details-avatar';
      avatar.src = user.image;
      avatar.alt = '';
      avatar.loading = 'lazy';
      identity.append(avatar);
    }
    const identityText = document.createElement('div');
    const name = document.createElement(includeProfileLink ? 'h3' : 'h2');
    name.textContent = getUserName(user);
    const username = document.createElement('p');
    username.className = 'user-details-username';
    username.textContent = user.username ? `@${user.username}` : `ID: ${user.id}`;
    identityText.append(name, username);
    identity.append(identityText);
    wrapper.append(identity);

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
    const details = document.createElement('dl');
    details.className = 'user-details-list';
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      row.append(term, description);
      details.append(row);
    });
    wrapper.append(details);

    if (includeProfileLink) {
      const profileLink = document.createElement('a');
      profileLink.className = 'cta-btn user-profile-link';
      profileLink.href = `#user/${user.id}`;
      profileLink.textContent = 'Открыть страницу пользователя';
      wrapper.append(profileLink);
    }
    return wrapper;
  }

  function renderUserLoading(container, message) {
    if (!container) return;
    const status = document.createElement('p');
    status.className = 'user-load-status';
    status.setAttribute('role', 'status');
    status.textContent = message;
    container.replaceChildren(status);
    container.setAttribute('aria-busy', 'true');
  }

  function renderUserError(container, message, action, userId) {
    if (!container) return;
    const error = document.createElement('p');
    error.className = 'user-load-error';
    error.textContent = `Не удалось загрузить данные: ${message}`;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'todo-open-button';
    retry.dataset.action = action;
    retry.dataset.userId = String(userId);
    retry.textContent = 'Повторить';
    container.replaceChildren(error, retry);
    container.removeAttribute('aria-busy');
  }

  function showMember(memberId) {
    const panel = document.getElementById(memberId);
    if (!panel || !panel.matches(selectors.memberPanels)) return;

    showPage('resume');

    document.querySelectorAll(selectors.memberPanels).forEach((item) => {
      item.classList.toggle('active', item === panel);
    });

    document.querySelectorAll(selectors.memberButtons).forEach((button) => {
      const isActive = button.dataset.target === memberId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  async function loadTodos() {
    if (!elements.todoList || !window.fakeTodoApi) return false;

    const requestVersion = ++todoLoadVersion;
    elements.todoList.setAttribute('aria-busy', 'true');
    if (elements.todoRefresh) elements.todoRefresh.disabled = true;
    if (allTodos.length === 0) {
      elements.todoCount.textContent = 'Загружаем задачи…';
      elements.todoList.textContent = 'Подождите, загружаем список.';
    }

    try {
      const todos = await window.fakeTodoApi.getAll();
      if (requestVersion !== todoLoadVersion) return false;
      allTodos = todos;
      setTodoNotice('');
      renderTodos();
      return true;
    } catch (error) {
      if (requestVersion !== todoLoadVersion) return false;
      elements.todoCount.textContent = 'Не удалось обновить список';
      elements.todoSummary.textContent = 'Проверьте подключение и попробуйте ещё раз';
      elements.todoProgress.hidden = true;
      if (allTodos.length === 0) {
        const failure = document.createElement('div');
        failure.className = 'todo-empty-state todo-load-error';
        const icon = document.createElement('span');
        icon.className = 'todo-empty-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '!';
        const title = document.createElement('h2');
        title.textContent = 'Не удалось загрузить задачи';
        const description = document.createElement('p');
        description.textContent = 'Проверьте подключение к интернету и попробуйте ещё раз.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'todo-open-button';
        retry.dataset.action = 'todos-refresh';
        retry.textContent = 'Повторить загрузку';
        failure.append(icon, title, description, retry);
        elements.todoList.replaceChildren(failure);
      }
      setTodoNotice(error.message, 'error');
      return false;
    } finally {
      if (requestVersion === todoLoadVersion) {
        elements.todoList.removeAttribute('aria-busy');
        if (elements.todoRefresh) elements.todoRefresh.disabled = false;
      }
    }
  }

  function renderTodos() {
    if (!elements.todoList) return;

    elements.todoList.querySelectorAll('form[data-todo-form="update"]').forEach((form) => {
      const data = new FormData(form);
      todoEditDrafts.set(String(form.dataset.id), {
        todo: data.get('todo'),
        userId: Number(data.get('userId')),
        completed: data.get('completed') === 'on',
      });
    });

    const search = elements.todoSearch.value.trim().toLocaleLowerCase();
    const filter = elements.todoFilter.value;
    const completedCount = allTodos.filter((todo) => todo.completed).length;
    const activeCount = allTodos.length - completedCount;
    const completion = allTodos.length ? Math.round(completedCount / allTodos.length * 100) : 0;
    elements.todoSummary.textContent = `${activeCount} в работе · ${completedCount} выполнено`;
    elements.todoProgress.setAttribute('aria-valuenow', String(completion));
    elements.todoProgress.setAttribute('aria-valuetext', `${completion}% выполнено`);
    elements.todoProgressFill.style.width = `${completion}%`;
    elements.todoProgress.hidden = allTodos.length === 0;
    elements.todoSearchClear.hidden = !search;
    const filteredTodos = [...allTodos].sort((left, right) => right.id - left.id).filter((todo) => {
      const searchableText = `${todo.todo} ${todo.userId} ${todo.id}`.toLocaleLowerCase();
      const matchesSearch = searchableText.includes(search);
      const matchesFilter = filter === 'all' || (filter === 'active' ? !todo.completed : todo.completed);
      return matchesSearch && matchesFilter;
    });
    const pageCount = Math.max(1, Math.ceil(filteredTodos.length / todosPerPage));
    todoPage = Math.min(Math.max(todoPage, 1), pageCount);
    const firstIndex = (todoPage - 1) * todosPerPage;
    const visibleTodos = filteredTodos.slice(firstIndex, firstIndex + todosPerPage);

    elements.todoCount.textContent = search || filter !== 'all'
      ? `${filteredTodos.length} из ${allTodos.length} задач`
      : `Всего задач: ${allTodos.length}`;

    if (filteredTodos.length === 0) {
      elements.todoList.replaceChildren(createTodoEmptyState(allTodos.length > 0));
    } else {
      elements.todoList.replaceChildren(...visibleTodos.map(createTodoCard));
    }

    const pageLabel = elements.todoPagination.querySelector('[data-page-label]');
    const previousButton = elements.todoPagination.querySelector('[data-direction="-1"]');
    const nextButton = elements.todoPagination.querySelector('[data-direction="1"]');
    pageLabel.textContent = `Страница ${todoPage} из ${pageCount}`;
    previousButton.disabled = todoPage <= 1;
    nextButton.disabled = todoPage >= pageCount;
    elements.todoPagination.hidden = filteredTodos.length <= todosPerPage;
  }

  function createTodoEmptyState(hasTasks) {
    const empty = document.createElement('div');
    empty.className = 'todo-empty-state';
    const icon = document.createElement('span');
    icon.className = 'todo-empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = hasTasks ? '⌕' : '✓';
    const title = document.createElement('h2');
    title.textContent = hasTasks ? 'Ничего не найдено' : 'Пока нет задач';
    const description = document.createElement('p');
    description.textContent = hasTasks
      ? 'Попробуйте изменить запрос или сбросить фильтры.'
      : 'Добавьте первое дело, чтобы начать планировать.';
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'todo-open-button';
    if (hasTasks) {
      action.dataset.action = 'todo-clear-filters';
      action.textContent = 'Сбросить фильтры';
    } else {
      action.dataset.action = 'todo-create-toggle';
      action.textContent = 'Создать задачу';
    }
    empty.append(icon, title, description, action);
    return empty;
  }

  function createTodoCard(todo) {
    const card = document.createElement('article');
    const todoId = String(todo.id);
    const isEditing = editingTodoIds.has(todoId);
    const isPending = pendingTodoIds.has(todoId);
    card.className = `todo-card${isEditing ? ' is-editing' : ''}${todo.completed ? ' is-completed' : ''}`;
    card.dataset.todoId = todoId;

    const heading = document.createElement('h2');
    heading.textContent = todo.todo;
    const meta = document.createElement('p');
    meta.className = 'todo-meta';
    meta.textContent = `#${todo.id} · Пользователь ${todo.userId}`;
    const status = document.createElement('label');
    status.className = `todo-status todo-checkbox-status${todo.completed ? ' is-complete' : ''}`;
    const statusCheckbox = document.createElement('input');
    statusCheckbox.type = 'checkbox';
    statusCheckbox.dataset.action = 'todo-toggle';
    statusCheckbox.dataset.id = todoId;
    statusCheckbox.checked = todo.completed;
    statusCheckbox.disabled = isPending || isEditing;
    statusCheckbox.setAttribute('aria-label', '\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u0447\u0438');
    status.append(statusCheckbox, document.createTextNode(todo.completed ? ' \u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430' : ' \u0412 \u0440\u0430\u0431\u043e\u0442\u0435'));

    const actions = document.createElement('div');
    actions.className = 'todo-actions';
    const userButton = document.createElement('button');
    userButton.type = 'button';
    userButton.className = 'todo-user-button';
    userButton.dataset.action = 'todo-user';
    userButton.dataset.userId = String(todo.userId);
    userButton.setAttribute('aria-label', `Открыть данные пользователя ${todo.userId}`);
    userButton.title = `Данные пользователя ${todo.userId}`;
    userButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.6-3.2 3.1-5 7-5s6.4 1.8 7 5"></path></svg>';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'todo-open-button';
    editButton.dataset.action = 'todo-edit';
    editButton.dataset.id = todoId;
    editButton.disabled = isPending;
    editButton.textContent = isEditing ? 'Закрыть' : 'Изменить';


    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'todo-open-button todo-delete-button';
    deleteButton.dataset.action = 'todo-delete';
    deleteButton.dataset.id = todoId;
    deleteButton.disabled = isPending || isEditing;
    deleteButton.textContent = '\u00d7';
    deleteButton.setAttribute('aria-label', '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443');
    deleteButton.title = '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443';
    actions.append(userButton, editButton, deleteButton);
    card.append(heading, meta, status, actions);

    if (isEditing) card.append(createTodoEditForm(todo, todoEditDrafts.get(todoId)));
    return card;
  }

  function toggleCreateTodoForm() {
    const form = elements.todoCreateForm;
    const button = document.querySelector('[data-action="todo-create-toggle"]');
    if (!form || !button) return;
    form.hidden = !form.hidden;
    button.setAttribute('aria-expanded', String(!form.hidden));
    button.textContent = form.hidden ? 'Добавить задачу' : 'Скрыть форму';
    if (!form.hidden) form.querySelector('[name="todo"]')?.focus();
  }

  function toggleTodoEdit(id) {
    const todoId = String(id);
    if (editingTodoIds.has(todoId)) {
      editingTodoIds.delete(todoId);
      todoEditDrafts.delete(todoId);
    }
    else editingTodoIds.add(todoId);
    renderTodos();
    if (editingTodoIds.has(todoId)) {
      elements.todoList.querySelector(`[data-todo-id="${todoId}"] [name="todo"]`)?.focus();
    }
  }

  function createTodoEditForm(todo, draft = {}) {
    const form = document.createElement('form');
    form.className = 'todo-form';
    form.dataset.todoForm = 'update';
    form.dataset.id = todo.id;
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Название задачи';
    const titleInput = document.createElement('input');
    titleInput.name = 'todo';
    titleInput.required = true;
    titleInput.maxLength = 200;
    titleInput.value = draft.todo ?? todo.todo;
    titleLabel.append(titleInput);

    const userLabel = document.createElement('label');
    userLabel.textContent = 'ID пользователя';
    const userInput = document.createElement('input');
    userInput.name = 'userId';
    userInput.type = 'number';
    userInput.min = '1';
    userInput.step = '1';
    userInput.required = true;
    userInput.value = draft.userId ?? todo.userId;
    userLabel.append(userInput);

    const completedLabel = document.createElement('label');
    completedLabel.className = 'todo-checkbox-label';
    const completedInput = document.createElement('input');
    completedInput.name = 'completed';
    completedInput.type = 'checkbox';
    completedInput.checked = draft.completed ?? todo.completed;
    completedLabel.append(completedInput, document.createTextNode(' Выполнена'));
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'todo-open-button';
    submit.textContent = 'Сохранить';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'todo-open-button';
    cancel.dataset.action = 'todo-edit';
    cancel.dataset.id = todo.id;
    cancel.textContent = 'Отмена';
    form.append(titleLabel, userLabel, completedLabel, submit, cancel);
    return form;
  }

  async function handleTodoSubmit(event) {
    const form = event.target.closest('form[data-todo-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.busy === 'true') return;
    form.dataset.busy = 'true';
    form.setAttribute('aria-busy', 'true');
    const submit = form.querySelector('[type="submit"]');
    const originalLabel = submit?.textContent;
    if (submit) {
      submit.disabled = true;
      submit.textContent = form.dataset.todoForm === 'create' ? 'Добавляем…' : 'Сохраняем…';
    }

    const data = new FormData(form);
    let pendingUpdateId = null;
    const editCard = form.closest('.todo-card');
    try {
      if (form.dataset.todoForm === 'create') {
        const createdTodo = await window.fakeTodoApi.create({
          todo: data.get('todo'),
          userId: Number(data.get('userId')),
          completed: data.get('completed') === 'on',
        });
        form.reset();
        form.hidden = true;
        document.querySelector('[data-action="todo-create-toggle"]').textContent = 'Добавить задачу';
        document.querySelector('[data-action="todo-create-toggle"]').setAttribute('aria-expanded', 'false');
        elements.todoSearch.value = '';
        elements.todoFilter.value = 'all';
        allTodos = [createdTodo, ...allTodos.filter((todo) => todo.id !== createdTodo.id)];
        todoPage = 1;
        renderTodos();
        const listUpdated = await loadTodos();
        setTodoNotice(
          listUpdated ? 'Задача добавлена.' : 'Задача создана, но список не обновился. Попробуйте обновить его.',
          listUpdated ? 'success' : 'error',
        );
      } else if (form.dataset.todoForm === 'update') {
        const id = form.dataset.id;
        pendingUpdateId = String(id);
        pendingTodoIds.add(pendingUpdateId);
        editCard?.querySelectorAll('.todo-actions button').forEach((button) => { button.disabled = true; });
        const updatedTodo = await window.fakeTodoApi.update(id, {
          todo: data.get('todo'),
          userId: Number(data.get('userId')),
          completed: data.get('completed') === 'on',
        });
        editingTodoIds.delete(String(id));
        todoEditDrafts.delete(String(id));
        allTodos = allTodos.map((todo) => todo.id === updatedTodo.id ? updatedTodo : todo);
        renderTodos();
        const listUpdated = await loadTodos();
        setTodoNotice(
          listUpdated ? 'Изменения сохранены.' : 'Изменения сохранены, но список не обновился. Попробуйте обновить его.',
          listUpdated ? 'success' : 'error',
        );
      }
    } catch (error) {
      setTodoNotice(error.message, 'error');
    } finally {
      delete form.dataset.busy;
      form.removeAttribute('aria-busy');
      if (submit) {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
      if (pendingUpdateId) {
        pendingTodoIds.delete(pendingUpdateId);
        if (editCard?.isConnected) {
          editCard.querySelectorAll('.todo-actions button').forEach((button) => { button.disabled = false; });
        } else {
          renderTodos();
        }
      }
    }
  }

  async function toggleTodo(id, button) {
    if (pendingTodoIds.has(String(id))) return;
    pendingTodoIds.add(String(id));
    button.disabled = true;
    button.textContent = 'Обновляем…';
    try {
      const todo = allTodos.find((item) => item.id === Number(id));
      if (!todo) return;
      const updatedTodo = await window.fakeTodoApi.update(id, { completed: button.checked });
      allTodos = allTodos.map((item) => item.id === updatedTodo.id ? updatedTodo : item);
      await loadTodos();
    } catch (error) {
      setTodoNotice(`Не удалось обновить задачу: ${error.message}`, 'error');
    } finally {
      pendingTodoIds.delete(String(id));
      renderTodos();
    }
  }

  async function deleteTodo(id, button) {
    if (pendingTodoIds.has(String(id))) return;
    const todo = allTodos.find((item) => item.id === Number(id));
    const taskLabel = todo ? `«${todo.todo}»` : `#${id}`;
    if (!window.confirm(`Удалить задачу ${taskLabel}?`)) return;
    pendingTodoIds.add(String(id));
    button.disabled = true;
    try {
      await window.fakeTodoApi.delete(id);
      allTodos = allTodos.filter((todo) => todo.id !== Number(id));
      editingTodoIds.delete(String(id));
      renderTodos();
      await loadTodos();
    } catch (error) {
      setTodoNotice(`Не удалось удалить задачу: ${error.message}`, 'error');
    } finally {
      pendingTodoIds.delete(String(id));
      renderTodos();
    }
  }

  function setTodoNotice(message, type = '') {
    if (!elements.todoNotice) return;
    elements.todoNotice.textContent = message;
    elements.todoNotice.className = `todo-notice${type ? ` is-${type}` : ''}`;
  }
// ..........................................
  function initializeTask1() {
    const target = document.getElementById('target-element');
    if (target) target.textContent = '\u041F\u0440\u0438\u0432\u0435\u0442, \u043C\u0438\u0440!';

    document.querySelectorAll('.old-element').forEach((element) => element.remove());

    if (!elements.task1Result || elements.task1Result.querySelector('.editable-paragraph')) return;

    const paragraph = document.createElement('p');
    paragraph.className = 'editable-paragraph';
    paragraph.textContent = '\u042D\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u044F\u0435\u043C\u044B\u0439 \u0430\u0431\u0437\u0430\u0446.';
    elements.task1Result.append(paragraph);
  }

  function createTask1Element() {
    if (document.querySelector('.new-div')) return;

    const element = document.createElement('div');
    element.className = 'new-div';
    element.textContent = '\u042F \u043D\u043E\u0432\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442';
    document.body.append(element);
  }

  function updateTask2ClassList() {
    if (!elements.task2Target || !elements.task2Output) return;

    const classes = Array.from(elements.task2Target.classList);
    elements.task2Output.textContent = classes.length ? classes.join(', ') : '(\u043A\u043B\u0430\u0441\u0441\u044B \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442)';
  }

  function initializeTask3() {
    if (!elements.tableContainer || !elements.tableRows || !elements.tableCols) return;

    elements.tableContainer.addEventListener('click', (event) => {
      const cell = event.target.closest('td[data-color]');
      if (!cell || !elements.tableContainer.contains(cell)) return;

      const selectedColor = elements.colorPicker?.value || '#3b82f6';
      cell.dataset.color = cell.dataset.color === selectedColor ? '' : selectedColor;
      cell.style.backgroundColor = cell.dataset.color;
      updateColorStats();
    });

    generateTable();
  }

  function generateTable() {
    if (!elements.tableContainer || !elements.tableRows || !elements.tableCols) return;

    const rows = clampDimension(elements.tableRows.value);
    const columns = clampDimension(elements.tableCols.value);
    elements.tableRows.value = rows;
    elements.tableCols.value = columns;

    const table = document.createElement('table');
    const body = document.createElement('tbody');

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const row = document.createElement('tr');

      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const cell = document.createElement('td');
        cell.dataset.color = '';
        cell.setAttribute('aria-label', `\u042F\u0447\u0435\u0439\u043A\u0430 ${rowIndex + 1}, ${columnIndex + 1}`);
        row.append(cell);
      }

      body.append(row);
    }

    table.append(body);
    elements.tableContainer.replaceChildren(table);
    updateColorStats();
  }

  function clampDimension(value) {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) ? Math.min(20, Math.max(1, parsedValue)) : 3;
  }

  function updateColorStats() {
    if (!elements.tableContainer || !elements.colorStats) return;

    const colorCounts = new Map();
    elements.tableContainer.querySelectorAll('td[data-color]').forEach((cell) => {
      if (cell.dataset.color) {
        colorCounts.set(cell.dataset.color, (colorCounts.get(cell.dataset.color) || 0) + 1);
      }
    });

    const totalColored = Array.from(colorCounts.values()).reduce((total, count) => total + count, 0);
    if (totalColored === 0) {
      elements.colorStats.textContent = '\u041D\u0435\u0442 \u0437\u0430\u043A\u0440\u0430\u0448\u0435\u043D\u043D\u044B\u0445 \u044F\u0447\u0435\u0435\u043A. \u041A\u043B\u0438\u043A\u043D\u0438\u0442\u0435 \u043F\u043E \u043B\u044E\u0431\u043E\u0439 \u044F\u0447\u0435\u0439\u043A\u0435.';
      return;
    }

    const summary = document.createTextNode(`\u0412\u0441\u0435\u0433\u043E \u0437\u0430\u043A\u0440\u0430\u0448\u0435\u043D\u043E \u044F\u0447\u0435\u0435\u043A: ${totalColored}. \u041F\u043E \u0446\u0432\u0435\u0442\u0430\u043C: `);
    const details = [];

    colorCounts.forEach((count, color) => {
      const item = document.createElement('span');
      item.className = 'color-stat';

      const swatch = document.createElement('span');
      swatch.className = 'color-stat__swatch';
      swatch.style.backgroundColor = color;

      item.append(swatch, document.createTextNode(`${color}: ${count}`));
      details.push(item);
    });

    elements.colorStats.replaceChildren(summary);
    details.forEach((item, index) => {
      if (index > 0) elements.colorStats.append(document.createTextNode(' | '));
      elements.colorStats.append(item);
    });
  }

  function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    setTheme(savedTheme === 'dark' ? 'dark' : 'light');
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme;
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);

    if (elements.themeButton) {
      elements.themeButton.textContent = theme === 'dark' ? '\u2600\uFE0F \u0421\u0432\u0435\u0442\u043B\u0430\u044F' : '\uD83C\uDF19 \u0422\u0435\u043C\u043D\u0430\u044F';
      elements.themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();
