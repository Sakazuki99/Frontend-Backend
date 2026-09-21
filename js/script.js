// Переключение страниц верхнего уровня: Главная / Резюме
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(function(p){
    p.classList.remove('active');
  });
  document.getElementById('page-' + pageId).classList.add('active');

  document.querySelectorAll('#navbar > button[data-page]').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-page') === pageId);
  });

  // Если открыта не страница резюме, снимаем активность со вкладок участников
  if (pageId !== 'resume') {
    document.querySelectorAll('#member-tabs button').forEach(function(b){
      b.classList.remove('active');
    });
  }
}

// Переключение участника — автоматически открывает страницу резюме
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

// Привязка обработчиков событий к кнопкам навигации
document.querySelectorAll('#navbar > button[data-page]').forEach(function(btn){
  btn.addEventListener('click', function(){
    showPage(btn.getAttribute('data-page'));
  });
});

document.querySelectorAll('#member-tabs button').forEach(function(btn){
  btn.addEventListener('click', function(){
    showMember(btn.getAttribute('data-target'));
  });
});