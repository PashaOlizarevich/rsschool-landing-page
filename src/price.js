(function initializePriceModule(root, factory) {
  "use strict";
  const api = Object.freeze(factory());
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    Object.defineProperty(root, "CoffeeHousePrice", {
      value: api,
      writable: false,
      configurable: false,
    });
  }
})(globalThis, () => {
  "use strict";

  function calculateProductPrice(product, sizeKey, additiveIndexes = []) {
    const size = product?.sizes?.[sizeKey];
    if (!product || !size) {
      throw new TypeError("A product and a valid size are required.");
    }
    const additivesPrice = additiveIndexes.reduce((total, index) => {
      const additive = product.additives?.[index];
      if (!additive) {
        throw new RangeError(`Unknown additive index: ${index}`);
      }
      return total + Number(additive["add-price"]);
    }, 0);
    const total = Number(product.price) + Number(size["add-price"]) + additivesPrice;
    if (!Number.isFinite(total)) {
      throw new TypeError("Product prices must be numeric.");
    }
    return total;
  }

  return { calculateProductPrice };
});
