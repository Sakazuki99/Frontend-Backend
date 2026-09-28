(() => {
  const selectors = {
    pages: '.page',
    pageButtons: '#navbar > button[data-page]',
    memberPanels: '.panel',
    memberButtons: '#member-tabs button[data-target]',
  };

  const elements = {};

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

    initializeTheme();
    initializeTask1();
    initializeTask3();
    updateTask2ClassList();

    document.addEventListener('click', handleClick);
  }

  function handleClick(event) {
    const paragraph = event.target.closest('.editable-paragraph');
    if (paragraph) {
      paragraph.classList.toggle('is-changed');
      return;
    }

    const control = event.target.closest('[data-page], [data-member], [data-action]');
    if (!control) return;

    if (control.dataset.page) {
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
