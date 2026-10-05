(() => {
  const initialTodos = [
    { id: 1, todo: 'Составить список требований к проекту', completed: true, userId: 1 },
    { id: 2, todo: 'Подготовить макет менеджера задач', completed: false, userId: 1 },
    { id: 3, todo: 'Реализовать получение задачи по ID', completed: false, userId: 2 },
    { id: 4, todo: 'Проверить отображение списка задач', completed: true, userId: 2 },
    { id: 5, todo: 'Добавить адаптивные стили', completed: false, userId: 3 },
  ];


  const todos = initialTodos.map((todo) => ({ ...todo }));

  function validateTodoFields(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Передайте объект с полями задачи.');
    }

    const fields = {};
    if (Object.hasOwn(input, 'todo')) {
      if (typeof input.todo !== 'string' || !input.todo.trim()) {
        throw new TypeError('Название задачи должно быть непустой строкой.');
      }
      fields.todo = input.todo.trim();
    }

    if (Object.hasOwn(input, 'completed')) {
      if (typeof input.completed !== 'boolean') {
        throw new TypeError('Статус completed должен быть boolean.');
      }
      fields.completed = input.completed;
    }

    if (Object.hasOwn(input, 'userId')) {
      if (!Number.isInteger(input.userId) || input.userId < 1) {
        throw new TypeError('userId должен быть положительным целым числом.');
      }
      fields.userId = input.userId;
    }

    return fields;
  }

  function createTodo(input) {
    const fields = validateTodoFields(input);
    if (!Object.hasOwn(fields, 'todo')) {
      throw new TypeError('Для создания задачи укажите название todo.');
    }
    const nextId = todos.reduce((maxId, todo) => Math.max(maxId, todo.id), 0) + 1;
    const createdTodo = {
      id: nextId,
      todo: fields.todo,
      completed: fields.completed ?? false,
      userId: fields.userId ?? 1,
    };

    todos.push(createdTodo);
    return { ...createdTodo };
  }

  function removeTodo(id) {
    const todoIndex = todos.findIndex((item) => item.id === Number(id));
    if (todoIndex === -1) {
      throw new Error(`Todo with ID ${id} was not found.`);
    }

    const [deletedTodo] = todos.splice(todoIndex, 1);
    return { ...deletedTodo };
  }

  function updateTodo(id, input) {
    const todoIndex = todos.findIndex((item) => item.id === Number(id));
    if (todoIndex === -1) {
      throw new Error(`Задача с ID ${id} не найдена.`);
    }

    const fields = validateTodoFields(input);
    if (Object.keys(fields).length === 0) {
      throw new TypeError('Укажите хотя бы одно поле для обновления.');
    }

    todos[todoIndex] = { ...todos[todoIndex], ...fields };
    return { ...todos[todoIndex] };
  }

  window.fakeTodoApi = Object.freeze({
    async getAll() {
      return todos.map((todo) => ({ ...todo }));
    },

    async getById(id) {
      const todo = todos.find((item) => item.id === Number(id));
      return todo ? { ...todo } : null;
    },

    async update(id, fields) {
      return updateTodo(id, fields);
    },

    async remove(id) {
      return removeTodo(id);
    },

    async delete(id) {
      return removeTodo(id);
    },

    async create(input) {
      return createTodo(input);
    },
  });
})();
