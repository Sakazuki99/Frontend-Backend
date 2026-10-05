(() => {
  const todosUrl = 'https://dummyjson.com/todos';
  const updatedTodos = new Map();
  const createdTodos = new Map();
  const deletedTodoIds = new Set();

  async function request(url, options) {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(data?.message || `Ошибка API (${response.status}).`);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function validateTodoFields(input, requireTitle = false) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Передайте объект с полями задачи.');
    }

    const fields = {};
    if (Object.hasOwn(input, 'todo')) {
      if (typeof input.todo !== 'string' || !input.todo.trim()) {
        throw new TypeError('Название задачи должно быть непустой строкой.');
      }
      fields.todo = input.todo.trim();
    } else if (requireTitle) {
      throw new TypeError('Для создания задачи укажите название.');
    }

    if (Object.hasOwn(input, 'completed')) {
      if (typeof input.completed !== 'boolean') {
        throw new TypeError('Статус задачи должен быть true или false.');
      }
      fields.completed = input.completed;
    }

    if (Object.hasOwn(input, 'userId')) {
      if (!Number.isInteger(input.userId) || input.userId < 1) {
        throw new TypeError('ID пользователя должен быть положительным целым числом.');
      }
      fields.userId = input.userId;
    }

    if (!requireTitle && Object.keys(fields).length === 0) {
      throw new TypeError('Укажите хотя бы одно поле для обновления.');
    }

    return fields;
  }

  function normalizeTodo(todo) {
    return { ...todo, id: Number(todo.id) };
  }

  async function getAll() {
    const data = await request(`${todosUrl}?limit=0`);
    const todos = data.todos
      .filter((todo) => !deletedTodoIds.has(Number(todo.id)))
      .map((todo) => {
        const id = Number(todo.id);
        return { ...todo, ...(updatedTodos.get(id) || {}) };
      });
    const serverIds = new Set(todos.map((todo) => Number(todo.id)));

    createdTodos.forEach((todo, id) => {
      if (!deletedTodoIds.has(id) && !serverIds.has(id)) todos.push({ ...todo });
    });

    return todos;
  }

  async function getById(id) {
    const todoId = Number(id);
    if (!Number.isInteger(todoId) || todoId < 1 || deletedTodoIds.has(todoId)) return null;

    const localTodo = createdTodos.get(todoId) || updatedTodos.get(todoId);
    if (localTodo && createdTodos.has(todoId)) return { ...localTodo };

    try {
      const todo = normalizeTodo(await request(`${todosUrl}/${todoId}`));
      return { ...todo, ...(updatedTodos.get(todoId) || {}) };
    } catch (error) {
      if (error.status === 404) return localTodo ? { ...localTodo } : null;
      throw error;
    }
  }

  async function create(input) {
    const fields = validateTodoFields(input, true);
    const payload = {
      todo: fields.todo,
      completed: fields.completed ?? false,
      userId: fields.userId ?? 1,
    };
    const result = normalizeTodo(await request(`${todosUrl}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));

    let id = result.id;
    const knownIds = [...createdTodos.keys(), ...updatedTodos.keys()];
    if (knownIds.includes(id)) id = Math.max(id, ...knownIds) + 1;
    const todo = { ...result, ...payload, id };
    createdTodos.set(id, todo);
    deletedTodoIds.delete(id);
    return { ...todo };
  }

  async function update(id, input) {
    const todoId = Number(id);
    const fields = validateTodoFields(input);
    const currentTodo = await getById(todoId);
    if (!currentTodo) throw new Error(`Задача с ID ${id} не найдена.`);

    const result = await request(`${todosUrl}/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const updatedTodo = { ...currentTodo, ...result, ...fields, id: todoId };
    updatedTodos.set(todoId, updatedTodo);
    if (createdTodos.has(todoId)) createdTodos.set(todoId, updatedTodo);
    return { ...updatedTodo };
  }

  async function remove(id) {
    const todoId = Number(id);
    const currentTodo = await getById(todoId);
    if (!currentTodo) throw new Error(`Задача с ID ${id} не найдена.`);

    const result = await request(`${todosUrl}/${todoId}`, { method: 'DELETE' });
    deletedTodoIds.add(todoId);
    createdTodos.delete(todoId);
    updatedTodos.delete(todoId);
    return { ...currentTodo, ...result, id: todoId };
  }

  window.fakeTodoApi = Object.freeze({
    getAll,
    getById,
    create,
    update,
    remove,
    delete: remove,
  });
})();
