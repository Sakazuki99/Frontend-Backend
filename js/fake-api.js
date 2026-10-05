(() => {
  const initialTodos = [
    { id: 1, todo: 'Составить список требований к проекту', completed: true, userId: 1 },
    { id: 2, todo: 'Подготовить макет менеджера задач', completed: false, userId: 1 },
    { id: 3, todo: 'Реализовать получение задачи по ID', completed: false, userId: 2 },
    { id: 4, todo: 'Проверить отображение списка задач', completed: true, userId: 2 },
    { id: 5, todo: 'Добавить адаптивные стили', completed: false, userId: 3 },
  ];


  const todos = initialTodos.map((todo) => ({ ...todo }));

  function createTodo(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Для создания задачи передайте объект.');
    }

    const title = typeof input.todo === 'string' ? input.todo.trim() : '';
    if (!title) {
      throw new TypeError('Название задачи должно быть непустой строкой.');
    }

    const nextId = todos.reduce((maxId, todo) => Math.max(maxId, todo.id), 0) + 1;
    const createdTodo = {
      id: nextId,
      todo: title,
      completed: typeof input.completed === 'boolean' ? input.completed : false,
      userId: Number.isInteger(input.userId) && input.userId > 0 ? input.userId : 1,
    };

    todos.push(createdTodo);
    return { ...createdTodo };
  }

  window.fakeTodoApi = Object.freeze({
    async getAll() {
      return todos.map((todo) => ({ ...todo }));
    },

    async getById(id) {
      const todo = todos.find((item) => item.id === Number(id));
      return todo ? { ...todo } : null;
    },

    async create(input) {
      return createTodo(input);
    },
  });
})();
