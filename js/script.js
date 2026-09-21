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

  document.querySelectorAll('#navbar > button[data-page]').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-page') === pageId);
  });

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
});
