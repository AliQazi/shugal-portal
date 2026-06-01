import Booking from '../models/Booking.js';
import GroupTicketing from '../models/GroupTicketing.js';
import MarginLedger from '../models/MarginLedger.js';

export const startBookingExpiryJob = () => {
    setInterval(async () => {

        try {
            const expiredBookings = await Booking.find({
                status: { $in: ['on hold', 'pending'] },
                expiresAt: { $lte: new Date() }
            });

            
            for (const booking of expiredBookings) {
                console.log('⏰ Running booking expiry job...');
                booking.status = 'cancelled';
                booking.expiresAt = null;
                await booking.save();

                const seatsToReturn = booking.adultsCount + booking.childrenCount;

                await GroupTicketing.updateOne(
                    { _id: booking.groupId },
                    { $inc: { totalSeats: seatsToReturn } }
                );

                await MarginLedger.deleteMany({
                  entryType: 'booking_confirmed',
                  $or: [
                    { bookingId: booking._id },
                    { bookingId: String(booking._id) },
                    { bookingReference: booking.bookingReference },
                  ],
                }).catch((cleanupErr) => {
                  console.error('Expiry job ledger cleanup failed:', cleanupErr.message || cleanupErr);
                });

                console.log(`⏰ Auto-cancelled booking ${booking._id}`);
            }
        } catch (err) {
            console.error('Expiry job error:', err);
        }
    }, 60 * 1000); // runs every 1 minute
};
