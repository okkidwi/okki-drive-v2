/* @refresh reload */
import { render } from "solid-js/web";
import { I18nProvider } from "solid-i18next";
import i18n from "./i18n";
import "./styles.css";
import App from "./App";

render(
  () => (
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>
  ),
  document.getElementById("root")
);
