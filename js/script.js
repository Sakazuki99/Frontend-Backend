function runTask1() {
  const target = document.getElementById('target-element');
  if (target) {
    target.textContent = "Привет, мир!";
  }

  let existingNewDiv = document.querySelector('body > .new-div');
  if (!existingNewDiv) {
    const newDiv = document.createElement('div');
    newDiv.className = 'new-div';
    newDiv.textContent = "Я новый элемент";
    document.body.appendChild(newDiv);
  }
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