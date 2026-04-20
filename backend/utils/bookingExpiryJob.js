import Booking from '../models/Booking.js';
import GroupTicketing from '../models/GroupTicketing.js';

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

                console.log(`⏰ Auto-cancelled booking ${booking._id}`);
            }
        } catch (err) {
            console.error('Expiry job error:', err);
        }
    }, 60 * 1000); // runs every 1 minute
};
