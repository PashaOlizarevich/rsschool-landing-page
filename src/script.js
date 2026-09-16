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

    image.src = `public/assets/menu/${product.category}/${product.category}-${index + 1}.jpg`;
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
    const menuPanel = document.querySelector("#menu-panel");
    const tabs = [...document.querySelectorAll(".menu-tab[data-category]")];
    const loadMore = document.querySelector("[data-load-more]");

    if (!menuList) {
      return;
    }

    try {
      const response = await fetch("public/data/products.json");

      if (!response.ok) {
        throw new Error(`Catalog request failed with status ${response.status}`);
      }

      const products = await response.json();
      const compactLayout = window.matchMedia("(max-width: 768px)");
      let activeCategory = "coffee";
      let expanded = false;

      function updateVisibleCards() {
        const cards = [...menuList.children];

        cards.forEach((card, index) => {
          card.hidden = compactLayout.matches && !expanded && index >= 4;
        });

        if (loadMore) {
          loadMore.hidden = !compactLayout.matches || expanded || cards.length <= 4;
        }
      }

      function selectCategory(category) {
        activeCategory = category;
        expanded = false;

        tabs.forEach((tab) => {
          const selected = tab.dataset.category === activeCategory;

          tab.classList.toggle("menu-tab--active", selected);
          tab.setAttribute("aria-selected", String(selected));
          tab.tabIndex = selected ? 0 : -1;
        });

        menuPanel?.setAttribute("aria-labelledby", `category-${activeCategory}`);
        menuList.replaceChildren(
          ...products.filter((product) => product.category === activeCategory).map(createProductCard),
        );
        updateVisibleCards();
      }

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectCategory(tab.dataset.category));
        tab.addEventListener("keydown", (event) => {
          let nextIndex;

          switch (event.key) {
            case "ArrowRight":
              nextIndex = (index + 1) % tabs.length;
              break;
            case "ArrowLeft":
              nextIndex = (index - 1 + tabs.length) % tabs.length;
              break;
            case "Home":
              nextIndex = 0;
              break;
            case "End":
              nextIndex = tabs.length - 1;
              break;
            default:
              return;
          }

          event.preventDefault();
          selectCategory(tabs[nextIndex].dataset.category);
          tabs[nextIndex].focus();
        });
      });

      loadMore?.addEventListener("click", () => {
        expanded = true;
        updateVisibleCards();
      });

      compactLayout.addEventListener("change", () => {
        expanded = false;
        updateVisibleCards();
      });

      selectCategory(activeCategory);
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
