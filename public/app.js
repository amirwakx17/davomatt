(() => {
  const form = document.querySelector("#attendance-form");

  if (form) {
    const rows = Array.from(form.querySelectorAll("[data-student-row]"));
    const total = rows.length;
    const errorBox = document.querySelector("#form-error");
    const progress = document.querySelector("#session-progress");

    const setText = (selector, value) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = String(value);
      });
    };

    const setBar = (selector, value) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.style.width = `${value}%`;
      });
    };

    const applyStatus = (row, status) => {
      row.dataset.status = status;

      row.querySelectorAll("button[data-status]").forEach((button) => {
        const isActive = button.dataset.status === status;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      row.querySelector("[data-status-input]").value = status;
    };

    const refreshSummary = () => {
      const counts = { present: 0, absent: 0, unmarked: 0 };

      rows.forEach((row) => {
        const value = row.querySelector("[data-status-input]").value;
        counts[value || "unmarked"] += 1;
      });

      setText('[data-count="present"]', counts.present);
      setText('[data-count="absent"]', counts.absent);
      setText('[data-count="unmarked"]', counts.unmarked);
      setText('[data-count="marked"]', `${counts.present + counts.absent} / ${total}`);

      setBar('[data-bar="present"]', total ? (counts.present / total) * 100 : 0);
      setBar('[data-bar="absent"]', total ? (counts.absent / total) * 100 : 0);

      if (progress) {
        progress.setAttribute(
          "aria-label",
          `${counts.present} kelgan, ${counts.absent} kelmagan, ${counts.unmarked} belgilanmagan`
        );
      }
    };

    const hideError = () => {
      if (errorBox) {
        errorBox.hidden = true;
      }
    };

    form.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-status]");
      if (!button || !form.contains(button)) return;

      const row = button.closest("[data-student-row]");
      if (!row) return;

      applyStatus(row, button.dataset.status);
      hideError();
      refreshSummary();
    });

    form.querySelectorAll("[data-mark-all]").forEach((button) => {
      button.addEventListener("click", () => {
        rows.forEach((row) => applyStatus(row, button.dataset.markAll));
        hideError();
        refreshSummary();
      });
    });

    form.addEventListener("submit", (event) => {
      const hasUnmarked = rows.some(
        (row) => !row.querySelector("[data-status-input]").value
      );

      if (hasUnmarked) {
        event.preventDefault();
        if (errorBox) {
          errorBox.hidden = false;
          errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });

    refreshSummary();
  }

  const dateInput = document.querySelector(".date-picker input[type='date']");
  if (dateInput) {
    dateInput.addEventListener("change", () => {
      if (dateInput.value) {
        dateInput.form.submit();
      }
    });
  }

  document.addEventListener("submit", (event) => {
    const message = event.target.dataset.confirm;
    if (message && !window.confirm(message)) {
      event.preventDefault();
    }
  });
})();
