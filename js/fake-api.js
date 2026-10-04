(() => {
  const initialTodos = [
    { id: 1, todo: 'Составить список требований к проекту', completed: true, userId: 1 },
    { id: 2, todo: 'Подготовить макет менеджера задач', completed: false, userId: 1 },
    { id: 3, todo: 'Реализовать получение задачи по ID', completed: false, userId: 2 },
    { id: 4, todo: 'Проверить отображение списка задач', completed: true, userId: 2 },
    { id: 5, todo: 'Добавить адаптивные стили', completed: false, userId: 3 },
  ];


  const todos = initialTodos.map((todo) => ({ ...todo }));

  window.fakeTodoApi = Object.freeze({
    async getAll() {
      return todos.map((todo) => ({ ...todo }));
    },

    async getById(id) {
      const todo = todos.find((item) => item.id === Number(id));
      return todo ? { ...todo } : null;
    },
  });
})();
