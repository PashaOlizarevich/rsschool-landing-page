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
    for (const size of ["s", "m", "l"]) {
      const base = Number(product.price) + Number(product.sizes[size]["add-price"]);
      assert.equal(calculateProductPrice(product, size), base);
      assert.equal(calculateProductPrice(product, size, [0]), base + Number(product.additives[0]["add-price"]));
      assert.equal(calculateProductPrice(product, size, [0, 1, 2]), base + product.additives.reduce((sum, item) => sum + Number(item["add-price"]), 0));
    }
  }
});

test("rejects unknown sizes and additives", () => {
  assert.throws(() => calculateProductPrice(products[0], "xl"), TypeError);
  assert.throws(() => calculateProductPrice(products[0], "s", [99]), RangeError);
});
