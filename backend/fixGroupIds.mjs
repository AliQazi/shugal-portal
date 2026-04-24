import mongoose from 'mongoose';
import Booking from './models/Booking.js';

async function fixGroupIds() {
  await mongoose.connect('mongodb://localhost:27017/shaheenwings');
  const result = await Booking.updateMany(
    { groupId: "2655" },
    { $set: { groupId: "69eb428a7cceba076362677c" } }
  );
  console.log('Updated bookings:', result.modifiedCount);
  await mongoose.disconnect();
}
fixGroupIds();
