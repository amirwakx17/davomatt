import { icon } from "../lib/icons.js";
import { layout } from "./layout.js";

function errorPage({ title, message, code }) {
  const body = `
    <section class="error-state">
      <span class="error-code">${code}</span>
      <h1>${title}</h1>
      <p>${message}</p>
      <a class="btn btn-primary" href="/">${icon("arrowLeft")}Bosh sahifaga qaytish</a>
    </section>`;
  return layout({ title, body });
}

export function renderNotFound() {
  return errorPage({
    title: "Sahifa topilmadi",
    message: "Qidirayotgan sahifangiz mavjud emas yoki guruh o'chirilgan.",
    code: "404",
  });
}

export function renderServerError() {
  return errorPage({
    title: "Xatolik yuz berdi",
    message: "So'rovni bajarib bo'lmadi. Iltimos, qaytadan urinib ko'ring.",
    code: "500",
  });
}
