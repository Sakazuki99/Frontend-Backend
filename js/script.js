function runTask1() {
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

function changeTargetText() {
  const targetElement = document.getElementById('target-element');
  if (targetElement) {
    targetElement.textContent = 'Привет, мир!';
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
  console.log('Список классов элемента:', classes);
  output.textContent = classes.length ? classes.join(', ') : '(классы отсутствуют)';
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
  document.querySelectorAll('#navbar > button[data-page]').forEach(function (button) {
    button.addEventListener('click', function () {
      showPage(button.dataset.page);
    });
  });

  const toggleButton = document.getElementById('toggle-btn');
  const task2Target = document.getElementById('task2-target-element');
  if (toggleButton && task2Target) {
    toggleButton.addEventListener('click', function () {
      if (task2Target.classList.contains('active')) {
        task2Target.classList.remove('active');
      } else {
        task2Target.classList.add('active');
      }
      updateTask2ClassList();
    });
  }

  updateTask2ClassList();
  runTask1();
});
