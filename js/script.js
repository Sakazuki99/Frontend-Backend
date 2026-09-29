(() => {
  const rubikFaces = ['U', 'D', 'F', 'B', 'L', 'R'];
  const rubikColors = {
    U: '#f8f9fb',
    D: '#ffd43b',
    F: '#23b26d',
    B: '#3983f7',
    L: '#ff8b32',
    R: '#ed4a58',
  };
  const rubikFaceTransforms = {
    U: 'up',
    D: 'down',
    F: 'front',
    B: 'back',
    L: 'left',
    R: 'right',
  };
  const rubikFaceNormals = {
    U: { x: 0, y: 1, z: 0 },
    D: { x: 0, y: -1, z: 0 },
    F: { x: 0, y: 0, z: 1 },
    B: { x: 0, y: 0, z: -1 },
    L: { x: -1, y: 0, z: 0 },
    R: { x: 1, y: 0, z: 0 },
  };
  const rubikTurnAxes = {
    U: ['y', 1],
    D: ['y', -1],
    F: ['z', 1],
    B: ['z', -1],
    L: ['x', -1],
    R: ['x', 1],
  };

  const selectors = {
    pages: '.page',
    pageButtons: '#navbar > button[data-page]',
    memberPanels: '.panel',
    memberButtons: '#member-tabs button[data-target]',
  };

  const elements = {};
  let rubikState = createSolvedRubikState();
  let rubikMoveHistory = [];
  let rubikMoveCount = 0;
  let rubikRotation = { x: -27, y: -34 };
  let rubikRotationTarget = { ...rubikRotation };
  let rubikViewAnimation = null;

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
    elements.rubikCube = document.getElementById('rubiks-cube');
    elements.rubikViewport = document.getElementById('cube-viewport');
    elements.rubikUndo = document.getElementById('rubik-undo');
    elements.rubikHistory = document.getElementById('rubik-history');
    elements.rubikMoveCount = document.getElementById('rubik-move-count');
    elements.rubikStateLabel = document.getElementById('rubik-state-label');

    initializeTheme();
    initializeTask1();
    initializeTask3();
    initializeRubik();
    updateTask2ClassList();

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleRubikKeyboard);
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
      case 'rubik-move':
        performRubikMove(control.dataset.move);
        break;
      case 'rubik-scramble':
        scrambleRubik();
        break;
      case 'rubik-undo':
        undoRubikMove();
        break;
      case 'rubik-reset':
        resetRubik();
        break;
      case 'rubik-clear-history':
        clearRubikHistory();
        break;
      case 'view-up':
        rotateRubikView(-12, 0);
        break;
      case 'view-down':
        rotateRubikView(12, 0);
        break;
      case 'view-left':
        rotateRubikView(0, -18);
        break;
      case 'view-right':
        rotateRubikView(0, 18);
        break;
      case 'view-reset':
        setRubikView({ x: -27, y: -34 });
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
// ..........................................
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

  function createSolvedRubikState() {
    return Object.fromEntries(rubikFaces.map((face) => [face, Array(9).fill(rubikColors[face])]));
  }

  function initializeRubik() {
    if (!elements.rubikCube || !elements.rubikViewport) return;

    elements.rubikCube.replaceChildren();

    rubikFaces.forEach((face) => {
      const faceElement = document.createElement('div');
      faceElement.className = `cube-face cube-face--${rubikFaceTransforms[face]}`;
      faceElement.dataset.face = face;
      faceElement.setAttribute('aria-hidden', 'true');

      for (let index = 0; index < 9; index += 1) {
        const sticker = document.createElement('span');
        sticker.className = 'cube-sticker';
        faceElement.append(sticker);
      }

      elements.rubikCube.append(faceElement);
    });

    renderRubik();
    renderRubikView();
    initializeRubikDrag();
  }

  function initializeRubikDrag() {
    let pointer = null;

    elements.rubikViewport.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return;

      stopRubikViewAnimation();
      rubikRotationTarget = { ...rubikRotation };

      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        rotationX: rubikRotation.x,
        rotationY: rubikRotation.y,
      };

      elements.rubikViewport.setPointerCapture(event.pointerId);
    });

    elements.rubikViewport.addEventListener('pointermove', (event) => {
      if (!pointer || pointer.id !== event.pointerId) return;

      rubikRotation = {
        x: Math.max(-85, Math.min(85, pointer.rotationX + (event.clientY - pointer.y) * -0.55)),
        y: pointer.rotationY + (event.clientX - pointer.x) * 0.55,
      };
      rubikRotationTarget = { ...rubikRotation };

      renderRubikView();
    });

    const stopDragging = (event) => {
      if (pointer?.id === event.pointerId) pointer = null;
    };

    elements.rubikViewport.addEventListener('pointerup', stopDragging);
    elements.rubikViewport.addEventListener('pointercancel', stopDragging);
  }

  function renderRubikView() {
    if (!elements.rubikCube) return;
    elements.rubikCube.style.transform = `rotateX(${rubikRotation.x}deg) rotateY(${rubikRotation.y}deg)`;
  }

  function rotateRubikView(deltaX, deltaY) {
    setRubikView({
      x: Math.max(-85, Math.min(85, rubikRotationTarget.x + deltaX)),
      y: rubikRotationTarget.y + deltaY,
    });
  }

  function setRubikView(nextRotation) {
    rubikRotationTarget = nextRotation;
    stopRubikViewAnimation();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rubikRotation = { ...rubikRotationTarget };
      renderRubikView();
      return;
    }

    const startRotation = { ...rubikRotation };
    const targetRotation = { ...rubikRotationTarget };
    const startedAt = performance.now();
    const duration = 360;

    const animate = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easing = 1 - Math.pow(1 - progress, 4);

      rubikRotation = {
        x: startRotation.x + (targetRotation.x - startRotation.x) * easing,
        y: startRotation.y + (targetRotation.y - startRotation.y) * easing,
      };
      renderRubikView();

      if (progress < 1) {
        rubikViewAnimation = window.requestAnimationFrame(animate);
      } else {
        rubikRotation = targetRotation;
        rubikViewAnimation = null;
        renderRubikView();
      }
    };

    rubikViewAnimation = window.requestAnimationFrame(animate);
  }

  function stopRubikViewAnimation() {
    if (rubikViewAnimation !== null) {
      window.cancelAnimationFrame(rubikViewAnimation);
      rubikViewAnimation = null;
    }
  }

  function handleRubikKeyboard(event) {
    if (!document.getElementById('page-rubik')?.classList.contains('active')) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;

    const viewMoves = {
      ArrowUp: [-12, 0],
      ArrowDown: [12, 0],
      ArrowLeft: [0, -18],
      ArrowRight: [0, 18],
    };
    const viewMove = viewMoves[event.key];

    if (viewMove) {
      event.preventDefault();
      rotateRubikView(...viewMove);
      return;
    }

    const face = event.key.toUpperCase();
    if (!rubikFaces.includes(face)) return;

    event.preventDefault();
    performRubikMove(`${face}${event.shiftKey ? "'" : ''}`);
  }

  function performRubikMove(move, record = true) {
    const match = /^([UDLRFB])([2']?)$/.exec(move || '');
    if (!match) return;

    const [, face, suffix] = match;
    const [axis, side] = rubikTurnAxes[face];
    const direction = suffix === "'" ? side : -side;
    const turns = suffix === '2' ? 2 : 1;
    const nextState = Object.fromEntries(rubikFaces.map((name) => [name, Array(9)]));

    rubikFaces.forEach((name) => {
      rubikState[name].forEach((color, index) => {
        let sticker = getRubikSticker(name, index);

        if (sticker.position[axis] === side) {
          for (let turn = 0; turn < turns; turn += 1) {
            sticker = {
              position: rotateRubikVector(sticker.position, axis, direction),
              normal: rotateRubikVector(sticker.normal, axis, direction),
              color,
            };
          }
        } else {
          sticker.color = color;
        }

        const destination = getRubikFacelet(sticker.normal, sticker.position);
        nextState[destination.face][destination.index] = color;
      });
    });

    rubikState = nextState;

    if (record) {
      rubikMoveHistory.push(move);
      rubikMoveCount += 1;
    }

    renderRubik();
  }

  function getRubikSticker(face, index) {
    const row = Math.floor(index / 3);
    const column = index % 3;
    let position;

    switch (face) {
      case 'U':
        position = { x: column - 1, y: 1, z: row - 1 };
        break;
      case 'D':
        position = { x: column - 1, y: -1, z: 1 - row };
        break;
      case 'F':
        position = { x: column - 1, y: 1 - row, z: 1 };
        break;
      case 'B':
        position = { x: 1 - column, y: 1 - row, z: -1 };
        break;
      case 'L':
        position = { x: -1, y: 1 - row, z: column - 1 };
        break;
      default:
        position = { x: 1, y: 1 - row, z: 1 - column };
        break;
    }

    return { position, normal: rubikFaceNormals[face] };
  }

  function getRubikFacelet(normal, position) {
    let face;
    let row;
    let column;

    if (normal.x === 1) {
      face = 'R';
      row = 1 - position.y;
      column = 1 - position.z;
    } else if (normal.x === -1) {
      face = 'L';
      row = 1 - position.y;
      column = position.z + 1;
    } else if (normal.y === 1) {
      face = 'U';
      row = position.z + 1;
      column = position.x + 1;
    } else if (normal.y === -1) {
      face = 'D';
      row = 1 - position.z;
      column = position.x + 1;
    } else if (normal.z === 1) {
      face = 'F';
      row = 1 - position.y;
      column = position.x + 1;
    } else {
      face = 'B';
      row = 1 - position.y;
      column = 1 - position.x;
    }

    return { face, index: row * 3 + column };
  }

  function rotateRubikVector(vector, axis, direction) {
    if (axis === 'x') {
      return direction > 0
        ? { x: vector.x, y: -vector.z, z: vector.y }
        : { x: vector.x, y: vector.z, z: -vector.y };
    }

    if (axis === 'y') {
      return direction > 0
        ? { x: vector.z, y: vector.y, z: -vector.x }
        : { x: -vector.z, y: vector.y, z: vector.x };
    }

    return direction > 0
      ? { x: -vector.y, y: vector.x, z: vector.z }
      : { x: vector.y, y: -vector.x, z: vector.z };
  }

  function scrambleRubik() {
    let previousFace = '';

    for (let index = 0; index < 25; index += 1) {
      const candidates = rubikFaces.filter((face) => face !== previousFace);
      const face = candidates[Math.floor(Math.random() * candidates.length)];
      const suffixes = ['', "'", '2'];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      performRubikMove(`${face}${suffix}`);
      previousFace = face;
    }
  }

  function undoRubikMove() {
    const move = rubikMoveHistory.pop();
    if (!move) return;

    rubikMoveCount = Math.max(0, rubikMoveCount - 1);
    performRubikMove(invertRubikMove(move), false);
    renderRubikHistory();
  }

  function invertRubikMove(move) {
    if (move.endsWith('2')) return move;
    return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
  }

  function resetRubik() {
    rubikState = createSolvedRubikState();
    rubikMoveHistory = [];
    rubikMoveCount = 0;
    renderRubik();
  }

  function clearRubikHistory() {
    rubikMoveHistory = [];
    renderRubikHistory();
  }

  function renderRubik() {
    if (!elements.rubikCube) return;

    rubikFaces.forEach((face) => {
      const faceElement = elements.rubikCube.querySelector(`[data-face="${face}"]`);
      if (!faceElement) return;

      faceElement.querySelectorAll('.cube-sticker').forEach((sticker, index) => {
        sticker.style.backgroundColor = rubikState[face][index];
      });
    });

    if (elements.rubikMoveCount) elements.rubikMoveCount.textContent = rubikMoveCount;
    if (elements.rubikUndo) elements.rubikUndo.disabled = rubikMoveHistory.length === 0;
    if (elements.rubikStateLabel) {
      elements.rubikStateLabel.textContent = isRubikSolved() ? '\u041A\u0443\u0431 \u0441\u043E\u0431\u0440\u0430\u043D' : '\u0412 \u0441\u0431\u043E\u0440\u043A\u0435';
    }

    renderRubikHistory();
  }

  function isRubikSolved() {
    return rubikFaces.every((face) => rubikState[face].every((color) => color === rubikColors[face]));
  }

  function renderRubikHistory() {
    if (!elements.rubikHistory) return;

    if (rubikMoveHistory.length === 0) {
      elements.rubikHistory.textContent = '\u0425\u043E\u0434\u044B \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C';
    } else {
      elements.rubikHistory.replaceChildren(...rubikMoveHistory.map((move) => {
        const token = document.createElement('span');
        token.className = 'rubik-history-token';
        token.textContent = move.replace("'", '′');
        return token;
      }));
    }

    elements.rubikHistory.scrollLeft = elements.rubikHistory.scrollWidth;
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
