document.addEventListener('DOMContentLoaded', () => {
  const pages = document.querySelectorAll('.page');
  const navButtons = document.querySelectorAll('.navbar > button');
  const memberTabs = document.querySelectorAll('#member-tabs button');
  const panels = document.querySelectorAll('.panel');

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
});