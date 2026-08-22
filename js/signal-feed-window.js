/* ViCamBachGiai — incremental reveal inside the existing Reader Signals area only. */
(function () {
  const BATCH = 8;
  let boundList = null;
  let onScroll = null;

  function cards(list) {
    return Array.from(list.querySelectorAll(':scope > .sig-card'));
  }

  function hiddenCards(list) {
    return cards(list).filter((card) => card.classList.contains('is-hidden'));
  }

  function ensureStatus(board, list) {
    let status = board.querySelector('.sig-scroll-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'sig-scroll-status';
      status.setAttribute('aria-live', 'polite');
      list.insertAdjacentElement('afterend', status);
    }
    return status;
  }

  function syncStatus(board, list) {
    const status = ensureStatus(board, list);
    const remaining = hiddenCards(list).length;
    const total = cards(list).length;
    if (!total) {
      status.hidden = true;
      return;
    }
    status.hidden = false;
    if (remaining) {
      status.classList.remove('is-done');
      status.textContent = `Kéo xuống để xem thêm · còn ${remaining} bình luận`;
    } else {
      status.classList.add('is-done');
      status.textContent = 'Đã hiển thị tất cả bình luận';
    }
  }

  function revealNext(board, list) {
    hiddenCards(list).slice(0, BATCH).forEach((card) => card.classList.remove('is-hidden'));
    syncStatus(board, list);
  }

  function bind() {
    const board = document.querySelector('#tin-hieu .sig-board');
    const list = board && board.querySelector('#sigList, .sig-list');
    if (!board || !list) return;
    if (boundList === list) {
      syncStatus(board, list);
      return;
    }

    if (boundList && onScroll) boundList.removeEventListener('scroll', onScroll);
    boundList = list;
    board.classList.add('signal-window-ready');

    /* Preserve the site's initial six-card behavior, then reveal incrementally. */
    syncStatus(board, list);
    onScroll = function () {
      if (list.scrollHeight - list.scrollTop - list.clientHeight < 180) revealNext(board, list);
    };
    list.addEventListener('scroll', onScroll, { passive: true });
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      bind();
    });
  }

  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();
