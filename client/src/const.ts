export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const isDesktopMode = () =>
  typeof window !== "undefined" && window.pegasus?.desktop === true;
