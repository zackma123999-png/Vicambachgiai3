/* Demo: animated story card stack — vanilla port of a 21st.dev framer-motion component. */
(function () {
  var stories = [
    { title: "Sổ Đèn Lồng", author: "Từ Yên", slug: "so-den-long", img: "covers/hoang-thanh.jpg" },
    { title: "Thư Không Gửi", author: "Lâm Dạ", slug: "thu-khong-gui", img: "covers/huyen-kiem.jpg" },
    { title: "Biển Không Tên", author: "Hà Vũ", slug: "bien-khong-ten", img: "covers/bien-suong.jpg" },
    { title: "Ga 1:17", author: "K. Trần", slug: "ga-mot-gio-muoi-bay", img: "covers/dem-muoi.jpg" },
    { title: "Đường Không Gọi Tên", author: "Bạch Lộ", slug: "duong-khong-goi-ten", img: "covers/rung-xua.jpg" },
    { title: "Ghế Bên Cửa Sổ", author: "Ngô An", slug: "ghe-ben-cua-so", img: "covers/thu-trang.jpg" }
  ];

  var positions = [
    { scale: 1, y: 12 },
    { scale: 0.95, y: -16 },
    { scale: 0.9, y: -44 }
  ];
  var exitTransform = { scale: 1, y: 340 };
  var enterTransform = { scale: 0.9, y: -16 };
  var TRANSITION_MS = 550;

  function transformOf(pos) {
    return "translate(-50%, " + pos.y + "px) scale(" + pos.scale + ")";
  }

  function readIcon() {
    return (
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="square"><path d="M9.5 18L15.5 12L9.5 6"/></svg>'
    );
  }

  function buildCard(uid, story, pos, zIndex) {
    var el = document.createElement("div");
    el.className = "acs-card";
    el.dataset.uid = uid;
    el.style.zIndex = zIndex;
    el.style.transform = transformOf(pos);
    el.innerHTML =
      '<div class="acs-card__inner">' +
      '  <div class="acs-card__cover"><img src="' + story.img + '" alt="' + story.title + '" /></div>' +
      '  <div class="acs-card__meta">' +
      '    <div class="acs-card__text"><strong>' + story.title + "</strong><span>Tác giả: " + story.author + "</span></div>" +
      '    <a class="acs-read-btn" href="index.html#/truyen/' + story.slug + '">Đọc ' + readIcon() + "</a>" +
      "  </div>" +
      "</div>";
    return el;
  }

  function init(root) {
    var stage = root.querySelector(".acs-stage");
    var animateBtn = root.querySelector(".acs-animate-btn");

    var nextUid = 3;
    var visible = [
      { uid: 0, storyIndex: 0 },
      { uid: 1, storyIndex: 1 },
      { uid: 2, storyIndex: 2 }
    ];

    visible.forEach(function (card, index) {
      var zIndex = 3 - index;
      var el = buildCard(card.uid, stories[card.storyIndex], positions[index], zIndex);
      stage.appendChild(el);
    });

    var animating = false;

    function handleAnimate() {
      if (animating) return;
      animating = true;
      animateBtn.disabled = true;

      var outgoing = visible[0];
      var remaining = visible.slice(1);
      var newStoryIndex = (remaining[1].storyIndex + 1) % stories.length;
      var incoming = { uid: nextUid++, storyIndex: newStoryIndex };
      var nextVisible = remaining.concat([incoming]);

      var outgoingEl = stage.querySelector('[data-uid="' + outgoing.uid + '"]');
      outgoingEl.style.zIndex = 10;
      outgoingEl.style.transform = transformOf(exitTransform);
      setTimeout(function () {
        if (outgoingEl.parentNode) outgoingEl.parentNode.removeChild(outgoingEl);
      }, TRANSITION_MS);

      remaining.forEach(function (card, oldIndex) {
        var newIndex = oldIndex;
        var el = stage.querySelector('[data-uid="' + card.uid + '"]');
        el.style.zIndex = 3 - newIndex;
        el.style.transform = transformOf(positions[newIndex]);
      });

      var incomingEl = buildCard(incoming.uid, stories[incoming.storyIndex], enterTransform, 1);
      incomingEl.style.transition = "none";
      stage.appendChild(incomingEl);
      // Force reflow so the browser registers the initial transform before we animate it.
      void incomingEl.offsetHeight;
      incomingEl.style.transition = "";
      incomingEl.style.transform = transformOf(positions[2]);

      visible = nextVisible;

      setTimeout(function () {
        animating = false;
        animateBtn.disabled = false;
      }, TRANSITION_MS);
    }

    animateBtn.addEventListener("click", handleAnimate);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-acs-root]");
    if (root) init(root);
  });
})();
