function runTask1() {
  const targetElement = document.getElementById('target-element');
  if (targetElement) {
    targetElement.textContent = 'Привет, мир!';
  }

  document.querySelectorAll('.old-element').forEach(function (element) {
    element.remove();
  });

  const result = document.getElementById('task1-result');
  if (result && !result.querySelector('.editable-paragraph')) {
    const paragraph = document.createElement('p');
    paragraph.className = 'editable-paragraph';
    paragraph.textContent = 'Это изменяемый абзац.';
    paragraph.addEventListener('click', function () {
      paragraph.classList.toggle('is-changed');
    });
    result.appendChild(paragraph);
  }
}

function createTask1NewDiv() {
  if (document.body.querySelector('.new-div')) {
    return;
  }

  const newDiv = document.createElement('div');
  newDiv.className = 'new-div';
  newDiv.textContent = 'Я новый элемент';
  document.body.appendChild(newDiv);
}

function updateTask2ClassList() {
  const targetElement = document.getElementById('task2-target-element');
  const output = document.getElementById('class-list-output');
  if (!targetElement || !output) {
    return;
  }

  const classes = Array.from(targetElement.classList);
  output.textContent = classes.length ? classes.join(', ') : '(классы отсутствуют)';
}

// КОММИТ 3: Логика генерации таблицы и подсчета цветов (Задание 3)
function initTask3() {
  const generateBtn = document.getElementById('generate-table-btn');
  if (!generateBtn) return;

  generateBtn.addEventListener('click', () => {
    const rowsInput = document.getElementById('table-rows');
    const colsInput = document.getElementById('table-cols');
    const container = document.getElementById('table-container');

    const rows = parseInt(rowsInput.value) || 3;
    const cols = parseInt(colsInput.value) || 3;

    container.innerHTML = '';
    const table = document.createElement('table');

    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        
        td.addEventListener('click', () => {
          const colorPicker = document.getElementById('cell-color-picker');
          const selectedColor = colorPicker ? colorPicker.value : '#3b82f6';
          
          td.style.backgroundColor = td.style.backgroundColor === hexToRgbString(selectedColor) ? '' : selectedColor;
          updateColorStats();
        });

        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    container.appendChild(table);
    updateColorStats();
  });

  generateBtn.click();
}

function updateColorStats() {
  const table = document.querySelector('#table-container table');
  const output = document.getElementById('color-stats-output');
  if (!table || !output) return;

  const cells = table.querySelectorAll('td');
  const colorCounts = {};
  let totalColored = 0;

  cells.forEach(cell => {
    const bg = cell.style.backgroundColor;
    if (bg && bg !== '' && bg !== 'transparent') {
      colorCounts[bg] = (colorCounts[bg] || 0) + 1;
      totalColored++;
    }
  });

  if (totalColored === 0) {
    output.textContent = 'Нет закрашенных ячеек. Кликните по любой ячейке.';
    return;
  }

  let statsText = `Всего закрашено ячеек: ${totalColored}. По цветам: `;
  const details = [];
  for (const [color, count] of Object.entries(colorCounts)) {
    details.push(`<span style="display:inline-block;width:12px;height:12px;background:${color};border-radius:50%;vertical-align:middle;margin-right:4px;"></span>${color}: ${count}`);
  }
  output.innerHTML = statsText + details.join(' | ');
}

function hexToRgbString(hex) {
  let c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
    c = hex.substring(1).split('');
    if(c.length === 3){
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return `rgb(${[(c>>16)&255, (c>>8)&255, c&255].join(', ')})`;
  }
  return hex;
}


function initThemeToggle() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (!themeBtn) return;

  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeBtn.textContent = '☀️ Светлая';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeBtn.textContent = '🌙 Темная';
  }

  themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      themeBtn.textContent = '🌙 Темная';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      themeBtn.textContent = '☀️ Светлая';
    }
  });
}

function showPage(pageId) {
  const selectedPage = document.getElementById('page-' + pageId);
  if (!selectedPage) {
    return;
  }

  document.querySelectorAll('.page').forEach(function (page) {
    page.classList.toggle('active', page === selectedPage);
  });

  document.querySelectorAll('#navbar > button[data-page]').forEach(function (button) {
    button.classList.toggle('active', button.dataset.page === pageId);
  });

  const memberTabs = document.getElementById('member-tabs');
  if (memberTabs) {
    memberTabs.style.display = pageId === 'resume' ? 'flex' : 'none';
  }

  if (pageId === 'task1') {
    runTask1();
  } else if (pageId === 'task3') {
    initTask3();
  }
}

function showMember(memberId) {
  showPage('resume');

  document.querySelectorAll('.panel').forEach(function (panel) {
    panel.classList.toggle('active', panel.id === memberId);
  });

  document.querySelectorAll('#member-tabs button[data-target]').forEach(function (button) {
    button.classList.toggle('active', button.dataset.target === memberId);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initThemeToggle(); 

  document.querySelectorAll('#navbar > button[data-page]').forEach(function (button) {
    button.addEventListener('click', function () {
      showPage(button.dataset.page);
    });
  });

  const toggleButton = document.getElementById('toggle-btn');
  const task2Target = document.getElementById('task2-target-element');
  if (toggleButton && task2Target) {
    toggleButton.addEventListener('click', function () {
      task2Target.classList.toggle('active');
      updateTask2ClassList();
    });
  }

  updateTask2ClassList();
  runTask1();
});