import test from "node:test";
import assert from "node:assert/strict";
import { findSelectedGroup, toBookingSelection } from "../src/utils/bookingSelection.js";

test("stores only a group identity and loads the current fare flags", () => {
  const selected = {
    id: "group-7",
    source: "admin",
    sector: "LHE-JED",
    dept_date: "2026-10-16",
    price: 250000,
    priceOnCall: { adult: false },
  };
  const selection = toBookingSelection(selected);
  assert.equal(selection.price, undefined);
  assert.equal(selection.priceOnCall, undefined);

  const updated = { ...selected, priceOnCall: { adult: true } };
  assert.equal(findSelectedGroup([updated], selection), updated);
});

test("matches the selected provider fare and rejects a missing fare", () => {
  const first = { id: "12", source: "sabaoon", group_price_detail_id: 1 };
  const second = { id: "12", source: "sabaoon", group_price_detail_id: 2 };
  const selection = toBookingSelection(second);

  assert.equal(findSelectedGroup([first, second], selection), second);
  assert.equal(findSelectedGroup([first], selection), null);
});

test("does not reuse an old snapshot when a group disappears", () => {
  const selection = toBookingSelection({ id: "group-7", source: "admin" });
  assert.equal(findSelectedGroup([], selection), null);
  assert.equal(toBookingSelection({ id: "" }), null);
});
