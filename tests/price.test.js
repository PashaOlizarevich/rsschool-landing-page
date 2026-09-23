const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateProductPrice } = require("../src/price");
const products = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../public/data/products.json"), "utf8"),
);

test("calculates sizes and additives for every product", () => {
  for (const product of products) {
    assert.equal(calculateProductPrice(product, "s"), Number(product.price));
    assert.equal(
      calculateProductPrice(product, "m", [0]),
      Number(product.price) + Number(product.sizes.m["add-price"]) + 0.5,
    );
    assert.equal(
      calculateProductPrice(product, "l", [0, 1, 2]),
      Number(product.price) + Number(product.sizes.l["add-price"]) + 1.5,
    );
  }
});

test("rejects unknown sizes and additives", () => {
  assert.throws(() => calculateProductPrice(products[0], "xl"), TypeError);
  assert.throws(() => calculateProductPrice(products[0], "s", [99]), RangeError);
});
