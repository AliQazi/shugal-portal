import mongoose from 'mongoose';
import Booking from './models/Booking.js';

async function updateBookings() {
  await mongoose.connect('mongodb://localhost:27017/shaheenwings'); // Update with your DB URI if different
  const result = await Booking.updateMany(
    { status: 'cancelled' },
    { $set: { status: 'on hold' } }
  );
  console.log('Updated bookings:', result.modifiedCount);
  await mongoose.disconnect();
}

updateBookings();
