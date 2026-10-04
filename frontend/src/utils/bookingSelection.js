const priceDetailIdOf = (group) =>
  group?.priceDetailId ??
  group?.group_price_detail_id ??
  group?.groupPriceDetailId ??
  group?.price_detail_id ??
  null;

export const toBookingSelection = (group) => {
  if (group?.id === null || group?.id === undefined || String(group.id).trim() === "") {
    return null;
  }

  return {
    id: String(group.id),
    source: group.source || "admin",
    priceDetailId: priceDetailIdOf(group),
    deptDate: group.deptDate || group.dept_date || null,
    sector: group.sector || null,
    flightNo: group.flightNo || group.details?.[0]?.flight_no || null,
  };
};

export const findSelectedGroup = (groups, selection) => {
  if (!Array.isArray(groups) || !selection?.id) return null;

  let matches = groups.filter(
    (group) =>
      String(group.id) === selection.id &&
      String(group.source || "admin").toLowerCase() ===
        String(selection.source || "admin").toLowerCase(),
  );

  if (selection.priceDetailId !== null && selection.priceDetailId !== undefined) {
    matches = matches.filter(
      (group) => String(priceDetailIdOf(group)) === String(selection.priceDetailId),
    );
  }

  if (matches.length > 1 && selection.deptDate) {
    const byDate = matches.filter(
      (group) =>
        String(group.dept_date || "").slice(0, 10) ===
        String(selection.deptDate).slice(0, 10),
    );
    if (byDate.length) matches = byDate;
  }

  if (matches.length > 1 && selection.sector) {
    const bySector = matches.filter((group) => group.sector === selection.sector);
    if (bySector.length) matches = bySector;
  }

  if (matches.length > 1 && selection.flightNo) {
    const byFlight = matches.filter(
      (group) => group.details?.[0]?.flight_no === selection.flightNo,
    );
    if (byFlight.length) matches = byFlight;
  }

  return matches.length === 1 ? matches[0] : null;
};
