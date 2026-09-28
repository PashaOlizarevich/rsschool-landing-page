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
  const { calculateProductPrice } = globalThis.CoffeeHousePrice;

  function isVisibleFocusable(element) {
    return (
      !element.hidden &&
      !element.closest("[hidden], [inert]") &&
      element.getClientRects().length > 0
    );
  }

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

  function initializeBurgerMenu() {
    const header = document.querySelector(".header");
    const toggle = header?.querySelector(".burger-button");
    const menu = header?.querySelector(".mobile-menu");

    if (!header || !toggle || !menu) {
      return;
    }

    const compactLayout = window.matchMedia("(max-width: 768px)");
    const menuLinks = [...menu.querySelectorAll("a")];
    const desktopFocusTarget = header.querySelector(".header__navigation a, .menu-link");
    const pageRegions = [document.querySelector("main"), document.querySelector("footer")].filter(
      Boolean,
    );
    let isOpen = false;

    function setMenuOpen(open, { restoreFocus = false } = {}) {
      const nextOpen = open && compactLayout.matches;

      isOpen = nextOpen;
      header.dataset.menuOpen = String(nextOpen);
      toggle.setAttribute("aria-expanded", String(nextOpen));
      toggle.setAttribute("aria-label", nextOpen ? "Close navigation menu" : "Open navigation menu");
      menu.setAttribute("aria-hidden", String(!nextOpen));
      menu.inert = !nextOpen;
      pageRegions.forEach((region) => {
        region.inert = nextOpen;
      });
      root.classList.toggle("scroll-locked", nextOpen);
      document.body.classList.toggle("scroll-locked", nextOpen);

      if (nextOpen) {
        requestAnimationFrame(() => menuLinks[0]?.focus());
      } else if (restoreFocus) {
        (compactLayout.matches ? toggle : desktopFocusTarget)?.focus();
      }
    }

    toggle.addEventListener("click", () => {
      setMenuOpen(!isOpen, { restoreFocus: isOpen });
    });

    menuLinks.forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false, { restoreFocus: true }));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setMenuOpen(false, { restoreFocus: true });
      }
    });

    header.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !isOpen) {
        return;
      }

      const focusable = [
        ...header.querySelectorAll('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])'),
      ].filter(isVisibleFocusable);
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    compactLayout.addEventListener("change", () => {
      setMenuOpen(false, { restoreFocus: isOpen });
    });

    setMenuOpen(false);
  }

  function initializeFavoritesSlider() {
    const slider = document.querySelector(".slider");
    const list = slider?.querySelector(".slider__list");
    const viewport = slider?.querySelector(".slider__viewport");
    const slides = [...(slider?.querySelectorAll(".slider__item") ?? [])];
    const indicators = [...(slider?.querySelectorAll(".slider__indicator") ?? [])];
    const previous = slider?.querySelector(".slider__control--previous");
    const next = slider?.querySelector(".slider__control--next");

    if (!slider || !list || !viewport || slides.length === 0) {
      return;
    }

    let activeIndex = 0;

    function showSlide(index) {
      activeIndex = (index + slides.length) % slides.length;
      list.style.transform = `translate3d(-${activeIndex * 100}%, 0, 0)`;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;

        slide.id ||= `favorite-slide-${slideIndex + 1}`;
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.classList.toggle("slider__item--active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
        slide.setAttribute("aria-label", `${slideIndex + 1} of ${slides.length}`);
      });

      indicators.forEach((indicator, indicatorIndex) => {
        const isActive = indicatorIndex === activeIndex;

        indicator.setAttribute("aria-controls", slides[indicatorIndex]?.id ?? "");
        indicator.classList.toggle("slider__indicator--active", isActive);

        if (isActive) {
          indicator.setAttribute("aria-current", "true");
        } else {
          indicator.removeAttribute("aria-current");
        }
      });
    }

    previous?.addEventListener("click", () => showSlide(activeIndex - 1));
    next?.addEventListener("click", () => showSlide(activeIndex + 1));

    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => showSlide(index));
    });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => showSlide(activeIndex));

      resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", () => showSlide(activeIndex));
    }

    showSlide(activeIndex);
  }

  function initializeProductModal() {
    const modal = document.querySelector("#product-modal");
    const media = modal?.querySelector("[data-modal-media]");
    const title = modal?.querySelector("[data-modal-title]");
    const description = modal?.querySelector("[data-modal-description]");
    const price = modal?.querySelector("[data-modal-price]");
    const sizeList = modal?.querySelector("[data-modal-sizes] .product-modal__option-list");
    const additiveList = modal?.querySelector(
      "[data-modal-additives] .product-modal__option-list",
    );
    const closeButton = modal?.querySelector("[data-modal-close]");
    let trigger = null;
    let currentProduct = null;
    let selectedSize = "s";
    let selectedAdditives = new Set();

    if (
      !modal ||
      !media ||
      !title ||
      !description ||
      !price ||
      !sizeList ||
      !additiveList ||
      !closeButton
    ) {
      return null;
    }

    function updatePrice() {
      if (!currentProduct) {
        price.textContent = "$0.00";
        return;
      }

      const total = calculateProductPrice(currentProduct, selectedSize, [
        ...selectedAdditives,
      ]);

      price.textContent = `$${total.toFixed(2)}`;
    }

    function createOptionButton(indexLabel, text, ariaLabel, pressed) {
      const button = document.createElement("button");
      const index = document.createElement("span");
      const label = document.createElement("span");

      button.className = "product-option";
      button.type = "button";
      button.setAttribute("aria-label", ariaLabel);
      button.setAttribute("aria-pressed", String(pressed));
      index.className = "product-option__index";
      index.setAttribute("aria-hidden", "true");
      index.textContent = indexLabel;
      label.className = "product-option__label";
      label.textContent = text;
      button.append(index, label);

      return button;
    }

    function renderProductOptions(product) {
      selectedSize = "s";
      selectedAdditives = new Set();

      const sizeButtons = Object.entries(product.sizes).map(([key, option]) => {
        const button = createOptionButton(
          key.toUpperCase(),
          option.size,
          `Size ${key.toUpperCase()}: ${option.size}`,
          key === selectedSize,
        );

        button.addEventListener("click", () => {
          selectedSize = key;
          [...sizeList.children].forEach((sizeButton) => {
            sizeButton.setAttribute("aria-pressed", String(sizeButton === button));
          });
          updatePrice();
        });

        return button;
      });

      const additiveButtons = product.additives.map((additive, additiveIndex) => {
        const button = createOptionButton(
          String(additiveIndex + 1),
          additive.name,
          `Add ${additive.name}`,
          false,
        );

        button.addEventListener("click", () => {
          if (selectedAdditives.has(additiveIndex)) {
            selectedAdditives.delete(additiveIndex);
          } else {
            selectedAdditives.add(additiveIndex);
          }

          button.setAttribute(
            "aria-pressed",
            String(selectedAdditives.has(additiveIndex)),
          );
          updatePrice();
        });

        return button;
      });

      sizeList.replaceChildren(...sizeButtons);
      additiveList.replaceChildren(...additiveButtons);
      updatePrice();
    }

    function unlockPage() {
      root.classList.remove("scroll-locked");
      document.body.classList.remove("scroll-locked");
    }

    function closeModal() {
      if (modal.open) {
        modal.close();
      }
    }

    function restorePage() {
      unlockPage();

      if (trigger?.isConnected) {
        trigger.focus();
      }

      trigger = null;
    }

    function trapFocus(event) {
      if (event.key !== "Tab") {
        return;
      }

      const focusable = [
        ...modal.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter(isVisibleFocusable);

      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function openModal(product, index, source) {
      const image = document.createElement("img");

      image.className = "product-modal__image";
      image.src = `public/assets/menu/${product.category}/${product.category}-${index + 1}.jpg`;
      image.alt = `${product.name} from the Coffee House menu`;
      image.width = 310;
      image.height = 310;

      media.replaceChildren(image);
      title.textContent = product.name;
      description.textContent = product.description;
      currentProduct = product;
      renderProductOptions(product);
      trigger = source;

      root.classList.add("scroll-locked");
      document.body.classList.add("scroll-locked");
      modal.showModal();
      closeButton.focus();
    }

    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeModal();
    });

    modal.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeModal();
    });

    modal.addEventListener("close", restorePage);
    modal.addEventListener("keydown", trapFocus);
    modal.addEventListener("click", (event) => {
      if (event.target !== modal) {
        return;
      }

      const bounds = modal.getBoundingClientRect();
      const clickedBackdrop =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (clickedBackdrop) {
        closeModal();
      }
    });

    return openModal;
  }

  function createProductCard(product, index, openModal) {
    const item = document.createElement("li");
    const card = document.createElement("button");
    const media = document.createElement("span");
    const image = document.createElement("img");
    const content = document.createElement("span");
    const title = document.createElement("span");
    const description = document.createElement("span");
    const price = document.createElement("span");

    card.className = "product-card";
    card.type = "button";
    card.setAttribute("aria-label", `Open details for ${product.name}`);
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
    card.addEventListener("click", () => openModal?.(product, index, card));

    return item;
  }

  function initializeCatalog() {
    const menuList = document.querySelector("#menu-list");
    const menuPanel = document.querySelector("#menu-panel");
    const tabs = [...document.querySelectorAll(".menu-tab[data-category]")];
    const loadMore = document.querySelector("[data-load-more]");
    const openModal = initializeProductModal();

    if (!menuList) {
      return;
    }

    const compactLayout = window.matchMedia("(max-width: 768px)");
    let products = [];
    let activeCategory = "coffee";
    let expanded = false;

    function setTabsDisabled(disabled) {
      tabs.forEach((tab) => {
        tab.disabled = disabled;
      });
    }

    function renderStatus(message, { error = false, retry = false } = {}) {
      const item = document.createElement("li");
      const text = document.createElement("p");

      item.className = error
        ? "menu-list__status catalog-error"
        : "menu-list__status catalog-loading";
      text.textContent = message;
      item.append(text);

      if (error) {
        item.setAttribute("role", "alert");
      } else {
        item.setAttribute("role", "status");
      }

      if (retry) {
        const retryButton = document.createElement("button");

        retryButton.className = "catalog-error__retry";
        retryButton.type = "button";
        retryButton.textContent = "Try again";
        retryButton.addEventListener("click", loadProducts);
        item.append(retryButton);
      }

      menuList.replaceChildren(item);
    }

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
        ...products
          .filter((product) => product.category === activeCategory)
          .map((product, index) => createProductCard(product, index, openModal)),
      );
      updateVisibleCards();
    }

    async function loadProducts() {
      menuList.setAttribute("aria-busy", "true");
      setTabsDisabled(true);
      loadMore?.setAttribute("hidden", "");
      renderStatus("Loading menu…");

      try {
        const response = await fetch("public/data/products.json");

        if (!response.ok) {
          throw new Error(`Catalog request failed with status ${response.status}`);
        }

        products = await response.json();
        activeCategory = "coffee";
        expanded = false;
        setTabsDisabled(false);
        selectCategory(activeCategory);
      } catch (error) {
        products = [];
        setTabsDisabled(true);
        renderStatus(
          "We couldn’t load the menu. Check your connection and try again.",
          { error: true, retry: true },
        );
        console.error("Unable to load the Coffee House catalog.", error);
      } finally {
        menuList.setAttribute("aria-busy", "false");
      }
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

      if (products.length > 0) {
        updateVisibleCards();
      }
    });

    loadProducts();
  }

  function initializePage() {
    initializeThemeToggle();
    initializeBurgerMenu();
    initializeFavoritesSlider();
    initializeCatalog();
  }

  applyTheme(readStoredTheme() ?? root.dataset.theme);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage, { once: true });
  } else {
    initializePage();
  }
})();
