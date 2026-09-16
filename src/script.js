(() => {
  "use strict";

  const STORAGE_KEY = "coffee-house-theme";
  const THEMES = {
    light: {
      label: "Switch to dark theme",
      themeColor: "#e1d4c9",
    },
    dark: {
      label: "Switch to light theme",
      themeColor: "#242321",
    },
  };

  const root = document.documentElement;

  function readStoredTheme() {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEY);

      return Object.hasOwn(THEMES, storedTheme) ? storedTheme : null;
    } catch {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The selected theme still applies when storage is unavailable.
    }
  }

  function applyTheme(theme) {
    const activeTheme = Object.hasOwn(THEMES, theme) ? theme : "light";
    const isDark = activeTheme === "dark";

    root.dataset.theme = activeTheme;

    document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", activeTheme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEMES[activeTheme].themeColor);

    document.querySelectorAll(".theme-toggle").forEach((toggle) => {
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute("aria-label", THEMES[activeTheme].label);
    });
  }

  function initializeThemeToggle() {
    applyTheme(root.dataset.theme);

    document.querySelectorAll(".theme-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

        applyTheme(nextTheme);
        storeTheme(nextTheme);
      });
    });
  }

  function createProductCard(product, index) {
    const item = document.createElement("li");
    const card = document.createElement("article");
    const media = document.createElement("div");
    const image = document.createElement("img");
    const content = document.createElement("div");
    const title = document.createElement("h2");
    const description = document.createElement("p");
    const price = document.createElement("p");

    card.className = "product-card";
    media.className = "product-card__media";
    image.className = "product-card__image";
    content.className = "product-card__content";
    title.className = "product-card__title";
    description.className = "product-card__description";
    price.className = "product-card__price";

    image.src = `public/assets/menu/coffee/coffee-${index + 1}.jpg`;
    image.alt = `${product.name} from the Coffee House menu`;
    image.width = 340;
    image.height = 340;
    image.loading = "lazy";

    title.textContent = product.name;
    description.textContent = product.description;
    price.textContent = `$${Number(product.price).toFixed(2)}`;

    media.append(image);
    content.append(title, description, price);
    card.append(media, content);
    item.append(card);

    return item;
  }

  async function initializeCatalog() {
    const menuList = document.querySelector("#menu-list");

    if (!menuList) {
      return;
    }

    try {
      const response = await fetch("public/data/products.json");

      if (!response.ok) {
        throw new Error(`Catalog request failed with status ${response.status}`);
      }

      const products = await response.json();
      const coffeeProducts = products
        .filter((product) => product.category === "coffee")
        .slice(0, 8);
      const cards = coffeeProducts.map(createProductCard);

      menuList.replaceChildren(...cards);
    } catch (error) {
      console.error("Unable to load the Coffee House catalog.", error);
    }
  }

  function initializePage() {
    initializeThemeToggle();
    initializeCatalog();
  }

  applyTheme(readStoredTheme() ?? root.dataset.theme);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage, { once: true });
  } else {
    initializePage();
  }
})();
