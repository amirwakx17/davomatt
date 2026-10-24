import { icon } from "../lib/icons.js";
import { layout } from "./layout.js";

function errorPage({ title, message, code }) {
  const body = `
    <section class="error-state">
      <span class="error-code">${code}</span>
      <h1>${title}</h1>
      <p>${message}</p>
      <a class="btn btn-primary" href="/">${icon("arrowLeft")}Back to dashboard</a>
    </section>`;
  return layout({ title, body });
}

export function renderNotFound() {
  return errorPage({
    title: "Page not found",
    message: "The page you are looking for does not exist or the group has been removed.",
    code: "404",
  });
}

export function renderServerError() {
  return errorPage({
    title: "Something went wrong",
    message: "The server could not complete this request. Please try again.",
    code: "500",
  });
}
