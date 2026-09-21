<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', () => {
  const pages = document.querySelectorAll('.page');
  const navButtons = document.querySelectorAll('.navbar > button');
  const memberTabs = document.querySelectorAll('#member-tabs button');
  const panels = document.querySelectorAll('.panel');
=======
function runTask1() {
  document.querySelector('.old-element')?.remove();

  const result = document.getElementById('task1-result');
  if (!result || result.querySelector('.editable-paragraph')) {
    return;
  }

  const paragraph = document.createElement('p');
  paragraph.className = 'editable-paragraph';
  paragraph.textContent = 'Это изменяемый абзац.';
  paragraph.addEventListener('click', function () {
    paragraph.classList.toggle('is-changed');
  });
  result.appendChild(paragraph);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(function(p){
    p.classList.remove('active');
  });
  document.getElementById('page-' + pageId).classList.add('active');
>>>>>>> bc8b0b1f5a542945b470fa64fb7dbebfd7f0c273

  function resetNavButtons() {
    navButtons.forEach(btn => btn.classList.remove('active'));
    memberTabs.forEach(btn => btn.classList.remove('active'));
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pageId = `page-${btn.dataset.page}`;
      
      pages.forEach(page => {
        page.classList.toggle('active', page.id === pageId);
      });

      resetNavButtons();
      btn.classList.add('active');
    });
  });

<<<<<<< HEAD
  window.showMember = function(memberId) {
    pages.forEach(page => {
      page.classList.toggle('active', page.id === 'page-resume');
    });

    resetNavButtons();
    memberTabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === memberId);
    });

    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === memberId);
    });

    window.location.hash = memberId;
  };

ц
  memberTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      showMember(btn.dataset.target);
    });
  });

  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && document.getElementById(initialHash)) {
    showMember(initialHash);
  }

  // Задание 2: Логика управления классами
  const targetElement = document.getElementById('target-element');
  const toggleBtn = document.getElementById('toggle-btn');
  const classListOutput = document.getElementById('class-list-output');

  function updateClassListInfo() {
    const classes = Array.from(targetElement.classList);
    const classString = classes.join(', ');

    console.log('Текущий список классов элемента:', classes);

    classListOutput.textContent = classString ? classString : '(Классы отсутствуют)';
  }

  if (targetElement && toggleBtn && classListOutput) {
    updateClassListInfo();

    toggleBtn.addEventListener('click', () => {
      targetElement.classList.toggle('active');
      
      updateClassListInfo();
    });
  }
=======
  const memberTabs = document.getElementById('member-tabs');
  if (pageId === 'resume') {
    memberTabs.style.display = 'flex';
  } else {
    memberTabs.style.display = 'none';
  }

  if (pageId === 'task1') {
    runTask1();
  }
}

function showMember(targetId) {
  showPage('resume');

  document.querySelectorAll('.panel').forEach(function(panel){
    panel.classList.remove('active');
  });
  document.querySelectorAll('#member-tabs button').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-target') === targetId);
  });
  document.getElementById(targetId).classList.add('active');
}

document.querySelectorAll('#navbar > button[data-page]').forEach(function(btn){
  btn.addEventListener('click', function(){
    showPage(btn.getAttribute('data-page'));
  });
<<<<<<< HEAD
});
=======
>>>>>>> bc8b0b1f5a542945b470fa64fb7dbebfd7f0c273
});
>>>>>>> ef216c5b0f7589fed420a459c0b96f2f1936a58a
