import "dotenv/config";
import mongoose from "mongoose";
import GroupTicketing from "./models/GroupTicketing.js";

await mongoose.connect(process.env.MONGO_URI);

try {
  const groups = await GroupTicketing.find(
    {},
    {
      groupName: 1,
      internalStatus: 1,
      flights: 1,
      groupType: 1,
      createdAt: 1,
    },
  )
    .sort({ createdAt: -1 })
    .lean();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusCounts = groups.reduce((acc, group) => {
    const key = group.internalStatus ?? "<missing>";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log("TOTAL", groups.length);
  console.log("STATUS", JSON.stringify(statusCounts));

  for (const group of groups) {
    const depDate = group.flights?.[0]?.depDate
      ? new Date(group.flights[0].depDate)
      : null;
    const depDateValue =
      depDate && !Number.isNaN(depDate.getTime())
        ? depDate.toISOString().split("T")[0]
        : "";
    const passesCurrentFilter =
      group.internalStatus === "Public" && (!depDate || depDate >= today);

    console.log(
      JSON.stringify({
        id: String(group._id),
        groupName: group.groupName || "",
        internalStatus: group.internalStatus ?? null,
        depDate: depDateValue,
        groupType: group.groupType || "",
        passesCurrentFilter,
      }),
    );
  }
} finally {
  await mongoose.disconnect();
}