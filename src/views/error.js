import { icon } from "../lib/icons.js";

function errorPage({ title, message, code }) {
  return {
    title,
    body: `
    <section class="error-state">
      <span class="error-code">${code}</span>
      <h1>${title}</h1>
      <p>${message}</p>
      <a class="btn btn-primary" href="/">${icon("arrowLeft")}Bosh sahifaga qaytish</a>
    </section>`,
  };
}

export function renderNotFound() {
  return errorPage({
    title: "Sahifa topilmadi",
    message: "Qidirayotgan sahifangiz mavjud emas yoki o'chirilgan.",
    code: "404",
  });
}

export function renderForbidden() {
  return errorPage({
    title: "Ruxsat yo'q",
    message: "Bu amal uchun ruxsatingiz yo'q yoki sahifa eskirgan. Sahifani yangilab, qaytadan urinib ko'ring.",
    code: "403",
  });
}

export function renderServerError() {
  return errorPage({
    title: "Xatolik yuz berdi",
    message: "So'rovni bajarib bo'lmadi. Iltimos, qaytadan urinib ko'ring.",
    code: "500",
  });
}
