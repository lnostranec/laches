(() => {
  const COOKIE_NAME = "cookie_consent";
  const MAX_AGE = 60 * 60 * 24 * 365;

  const hasChoice = document.cookie
    .split("; ")
    .some((item) => item.startsWith(COOKIE_NAME + "="));

  if (hasChoice) return;

  const banner = document.createElement("div");
  banner.className = "cookie";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Уведомление об использовании cookie");
  banner.innerHTML = `
    <p>Мы используем только технические cookie, чтобы сайт работал корректно и запоминал ваш выбор.
       Аналитических и рекламных cookie нет. Подробнее — в <a href="cookies.html">политике cookie</a>.</p>
    <div class="cookie__actions">
      <button type="button" class="btn btn--light cookie__accept" data-cookie-accept>Принять</button>
      <button type="button" class="cookie__essential" data-cookie-essential>Только необходимые</button>
    </div>
  `;

  document.body.appendChild(banner);
  document.body.classList.add("cookie-open");

  const save = (value) => {
    document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
    banner.remove();
    document.body.classList.remove("cookie-open");
  };

  banner.querySelector("[data-cookie-accept]").addEventListener("click", () => save("accepted"));
  banner.querySelector("[data-cookie-essential]").addEventListener("click", () => save("essential"));
})();
