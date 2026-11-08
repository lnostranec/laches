(() => {
  const header = document.getElementById("header");
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  /* ---------- Шапка: фон при прокрутке ---------- */
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const setMenu = (open) => {
    // Не трогаем блокировку прокрутки, если меню и так закрыто (её может держать окно записи)
    if (!open && !nav.classList.contains("is-open")) return;
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    document.body.classList.toggle("no-scroll", open);
  };
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Плавное появление блоков ---------- */
  const revealTargets = document.querySelectorAll(
    ".section__head, .about > *, .gallery__item, .step, .care, .faq > *, .booking > *, .contacts > *"
  );
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach((el) => { el.classList.add("reveal"); io.observe(el); });
  }

  /* ---------- Год в подвале ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();


  /* ---------- FAQ: плавное раскрытие ответов ---------- */
  // <details> не умеет анимировать высоту, поэтому перехватываем клик
  // и анимируем обёртку .faq__body. Сам плюс/минус меняется мгновенно (CSS).
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canAnimate = typeof Element.prototype.animate === "function";

  document.querySelectorAll(".faq__item").forEach((item) => {
    const summary = item.querySelector("summary");
    const body = item.querySelector(".faq__body");
    if (!summary || !body || reduceMotion || !canAnimate) return;

    let animation = null;
    let expanded = item.open;

    summary.addEventListener("click", (event) => {
      event.preventDefault();

      // Если анимации нет, доверяем фактическому состоянию details
      if (!animation) expanded = item.open;
      expanded = !expanded;

      // Высоту меряем до остановки: после cancel она скакнёт к auto.
      // У закрытого details контент скрыт, но layout у него сохраняется,
      // поэтому при открытии стартуем с нуля, а не с rect.height.
      const isOpen = item.open;
      const from = isOpen ? body.getBoundingClientRect().height : 0;
      const fromOpacity = isOpen ? Number(getComputedStyle(body).opacity) : 0;
      if (animation) {
        animation.cancel();
        animation = null;
      }

      if (expanded) {
        item.classList.remove("is-closing");
        item.open = true;
        animation = body.animate(
          [
            { height: from + "px", opacity: fromOpacity },
            { height: body.scrollHeight + "px", opacity: 1 },
          ],
          { duration: 380, easing: "cubic-bezier(.22, .61, .36, 1)" }
        );
        animation.onfinish = () => { animation = null; };
      } else {
        // Плюс возвращаем сразу, не дожидаясь конца сворачивания
        item.classList.add("is-closing");
        animation = body.animate(
          [
            { height: from + "px", opacity: fromOpacity },
            { height: "0px", opacity: 0 },
          ],
          { duration: 300, easing: "cubic-bezier(.22, .61, .36, 1)" }
        );
        animation.onfinish = () => {
          item.open = false;
          item.classList.remove("is-closing");
          animation = null;
        };
      }
    });
  });

  /* ---------- Маска телефона +7 (XXX) XXX-XX-XX ---------- */

  // Возвращает цифры в виде 7XXXXXXXXXX. Первую «8» или «7», введённую
  // после префикса +7 (или вставленную в начале номера), отбрасываем.
  const phoneDigits = (value) => {
    let rest = value.trim();
    const hasPrefix = rest.startsWith("+7");
    if (hasPrefix) rest = rest.slice(2);
    let d = rest.replace(/\D/g, "");
    if (!d) return hasPrefix ? "7" : "";
    if (/^[78]/.test(d) && (d.length === 1 || d.length === 11 || !hasPrefix)) d = d.slice(1);
    return ("7" + d).slice(0, 11);
  };

  const formatPhone = (d) => {
    if (!d) return "";
    let out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length > 4) out += ") " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    return out;
  };

  /* ---------- Формы заявки (на странице и во всплывающем окне) ---------- */

  const setupForm = (form, { onSuccess } = {}) => {
    const { name, phone, comment, consent, website } = form.elements;
    const status = form.querySelector(".form__status");
    const submit = form.querySelector("[type=submit]");

    phone.addEventListener("input", () => { phone.value = formatPhone(phoneDigits(phone.value)); });
    phone.addEventListener("focus", () => { if (!phone.value) phone.value = "+7 ("; });
    phone.addEventListener("blur", () => { if (phoneDigits(phone.value).length <= 1) phone.value = ""; });

    const setInvalid = (el, invalid) => el.closest(".field, .check").classList.toggle("is-invalid", invalid);

    const validate = () => {
      const nameOk = name.value.trim().length >= 2;
      const phoneOk = phoneDigits(phone.value).length === 11;
      const consentOk = consent.checked;
      setInvalid(name, !nameOk);
      setInvalid(phone, !phoneOk);
      setInvalid(consent, !consentOk);
      return nameOk && phoneOk && consentOk;
    };

    const showStatus = (text, type) => {
      status.textContent = text;
      status.className = "form__status" + (type ? " is-" + type : "");
    };

    form.addEventListener("input", (e) => {
      const wrap = e.target.closest(".is-invalid");
      if (wrap) wrap.classList.remove("is-invalid");
    });
    form.addEventListener("change", (e) => {
      const wrap = e.target.closest(".is-invalid");
      if (wrap) wrap.classList.remove("is-invalid");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate()) {
        showStatus("Проверьте, пожалуйста, поля формы", "error");
        return;
      }

      submit.disabled = true;
      showStatus("Отправляем…");

      try {
        const res = await fetch("send.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.value.trim(),
            phone: phone.value,
            comment: comment.value.trim(),
            website: website.value,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка отправки");

        form.reset();
        if (onSuccess) {
          showStatus("");
          onSuccess();
        } else {
          showStatus("Спасибо! Заявка отправлена — я скоро с вами свяжусь.", "success");
        }
      } catch (err) {
        showStatus("Не удалось отправить заявку. Попробуйте ещё раз или напишите мне в Telegram.", "error");
      } finally {
        submit.disabled = false;
      }
    });

    // Сброс ошибок и статуса (нужно при повторном открытии окна)
    return () => {
      form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
      showStatus("");
    };
  };

  setupForm(document.getElementById("booking-form"));

  /* ---------- Всплывающее окно «Записаться» ---------- */

  const modal = document.getElementById("booking-modal");
  const modalForm = document.getElementById("modal-form");

  const resetModalForm = setupForm(modalForm, {
    onSuccess: () => modal.classList.add("is-done"),
  });

  const openModal = () => {
    resetModalForm();
    modal.classList.remove("is-done");
    modal.showModal();
    document.body.classList.add("no-scroll");
  };

  document.querySelectorAll("[data-open-booking]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (typeof modal.showModal !== "function") return; // старый браузер — просто прокрутка к форме
      e.preventDefault();
      setMenu(false);
      openModal();
    });
  });

  modal.addEventListener("close", () => document.body.classList.remove("no-scroll"));
  modal.querySelectorAll("[data-close-modal]").forEach((btn) => btn.addEventListener("click", () => modal.close()));
  // Клик по затемнённому фону закрывает окно
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
})();
