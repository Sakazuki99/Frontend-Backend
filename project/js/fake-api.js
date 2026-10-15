(() => {
  const todosUrl = 'https://dummyjson.com/todos';
  const usersUrl = 'https://dummyjson.com/users';
  const updatedTodos = new Map();
  const createdTodos = new Map();
  const deletedTodoIds = new Set();

  const toId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  };

  async function request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15000), ...options });
    } catch (cause) {
      const error = new Error(cause?.name === 'TimeoutError' ? 'Сервер не отвечает. Попробуйте позже.' : 'Нет соединения с сервером.');
      error.cause = cause;
      throw error;
    }
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `Ошибка API (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  const sendJson = (url, method, body) => request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  
  const fieldRules = {
    todo: [(v) => typeof v === 'string' && v.trim(), 'Название задачи должно быть непустой строкой.', (v) => v.trim()],
    completed: [(v) => typeof v === 'boolean', 'Статус задачи должен быть true или false.'],
    userId: [(v) => Number.isInteger(v) && v > 0, 'ID пользователя должен быть положительным целым числом.'],
  };

  function validateTodoFields(input, requireTitle = false) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Передайте объект с полями задачи.');
    }

    const fields = {};
    for (const [name, [isValid, message, normalize = (v) => v]] of Object.entries(fieldRules)) {
      if (!Object.hasOwn(input, name)) continue;
      if (!isValid(input[name])) throw new TypeError(message);
      fields[name] = normalize(input[name]);
    }

    if (requireTitle && !('todo' in fields)) throw new TypeError('Для создания задачи укажите название.');
    if (!requireTitle && Object.keys(fields).length === 0) throw new TypeError('Укажите хотя бы одно поле для обновления.');
    return fields;
  }

  const normalizeTodo = (todo) => ({ ...todo, id: Number(todo.id) });

  async function getAll() {
    const { todos: serverTodos } = await request(`${todosUrl}?limit=0`);
    const todos = serverTodos
      .filter((todo) => !deletedTodoIds.has(Number(todo.id)))
      .map((todo) => ({ ...todo, ...updatedTodos.get(Number(todo.id)) }));
    const serverIds = new Set(todos.map((todo) => Number(todo.id)));

    createdTodos.forEach((todo, id) => {
      if (!deletedTodoIds.has(id) && !serverIds.has(id)) todos.push({ ...todo });
    });
    return todos;
  }

  async function getById(id) {
    const todoId = toId(id);
    if (!todoId || deletedTodoIds.has(todoId)) return null;

    if (createdTodos.has(todoId)) return { ...createdTodos.get(todoId) };
    const localTodo = updatedTodos.get(todoId);

    try {
      return { ...normalizeTodo(await request(`${todosUrl}/${todoId}`)), ...localTodo };
    } catch (error) {
      if (error.status === 404) return localTodo ? { ...localTodo } : null;
      throw error;
    }
  }

  async function getUserById(id) {
    const userId = toId(id);
    return userId ? request(`${usersUrl}/${userId}`) : null;
  }

  async function getUsers() {
    const { users } = await request(`${usersUrl}?limit=0&select=firstName,lastName,image`);
    return users;
  }

  async function getByUserId(id) {
    const userId = toId(id);
    if (!userId) return [];
    return (await getAll())
      .filter((todo) => Number(todo.userId) === userId)
      .sort((left, right) => Number(right.id) - Number(left.id));
  }

  async function create(input) {
    const fields = validateTodoFields(input, true);
    const payload = { todo: fields.todo, completed: fields.completed ?? false, userId: fields.userId ?? 1 };
    const result = normalizeTodo(await sendJson(`${todosUrl}/add`, 'POST', payload));

    let { id } = result;
    const knownIds = [...createdTodos.keys(), ...updatedTodos.keys()];
    if (knownIds.includes(id)) id = Math.max(id, ...knownIds) + 1;

    const todo = { ...result, ...payload, id };
    createdTodos.set(id, todo);
    deletedTodoIds.delete(id);
    return { ...todo };
  }

  const notFound = (id) => new Error(`Задача с ID ${id} не найдена.`);

  // DummyJSON не сохраняет созданные задачи: PATCH/DELETE для них вернул бы 404.
  // Поэтому для локально созданных задач сервер не вызывается.
  async function update(id, input) {
    const todoId = toId(id);
    if (!todoId || deletedTodoIds.has(todoId)) throw notFound(id);
    const fields = validateTodoFields(input);

    const isLocal = createdTodos.has(todoId);
    const result = isLocal ? {} : await sendJson(`${todosUrl}/${todoId}`, 'PATCH', fields);
    const base = createdTodos.get(todoId) ?? updatedTodos.get(todoId) ?? {};
    const updatedTodo = { ...base, ...result, ...fields, id: todoId };
    updatedTodos.set(todoId, updatedTodo);
    if (isLocal) createdTodos.set(todoId, updatedTodo);
    return { ...updatedTodo };
  }

  async function remove(id) {
    const todoId = toId(id);
    if (!todoId || deletedTodoIds.has(todoId)) throw notFound(id);

    const result = createdTodos.has(todoId) ? {} : await request(`${todosUrl}/${todoId}`, { method: 'DELETE' });
    const current = createdTodos.get(todoId) ?? updatedTodos.get(todoId) ?? {};
    deletedTodoIds.add(todoId);
    createdTodos.delete(todoId);
    updatedTodos.delete(todoId);
    return { ...current, ...result, id: todoId };
  }

  window.fakeTodoApi = Object.freeze({
    getAll, getById, getUserById, getUsers, getByUserId, create, update, remove, delete: remove,
  });
})();