import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import GroupTicketing from '../models/GroupTicketing.js';
import MarginLedger from '../models/MarginLedger.js';
import UmrahPackageBooking from '../models/UmrahPackageBooking.js';
import {
    cancelAbidAirSupplierBooking,
    isPartnerAbidAirBooking,
} from './Abid-Air.js';

// Cancels the Abid Air side of an expired hold. Returns false (and leaves the
// booking untouched for the next run / manual reconciliation) if it fails.
const releaseAbidAirHold = async (booking, label) => {
    if (!isPartnerAbidAirBooking(booking)) return true;
    try {
        await cancelAbidAirSupplierBooking(booking);
        return true;
    } catch (error) {
        console.error(`Abid Air ${label} expiry could not release supplier hold`, {
            bookingId: String(booking._id),
            supplierBookingId: booking.supplierBookingId || null,
            supplierStatus: booking.supplierBookingStatus || null,
            status: error.status,
            code: error.code,
            requestId: error.requestId,
        });
        return false;
    }
};

export const startBookingExpiryJob = () => {
    setInterval(async () => {

        try {
            const expiredBookings = await Booking.find({
                status: { $in: ['on hold', 'pending'] },
                expiresAt: { $lte: new Date() }
            });

            
            for (const booking of expiredBookings) {
                console.log('⏰ Running booking expiry job...');
                if (!(await releaseAbidAirHold(booking, 'ticket'))) continue;
                booking.status = 'cancelled';
                booking.expiresAt = null;
                await booking.save();

                const seatsToReturn = booking.adultsCount + booking.childrenCount;

                // External group ids are not ObjectIds and would throw a CastError
                // that aborts the rest of the run — only local groups hold seats.
                if (!isPartnerAbidAirBooking(booking) && mongoose.Types.ObjectId.isValid(booking.groupId)) {
                    await GroupTicketing.updateOne(
                        { _id: booking.groupId },
                        { $inc: { totalSeats: seatsToReturn } }
                    );
                }

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

            // Abid Air Umrah holds (no other Umrah source has an expiry).
            const expiredUmrahBookings = await UmrahPackageBooking.find({
                status: 'pending',
                supplierName: { $ne: '' },
                expiresAt: { $lte: new Date(), $ne: null },
            });

            for (const booking of expiredUmrahBookings) {
                if (!(await releaseAbidAirHold(booking, 'Umrah'))) continue;
                booking.status = 'cancelled';
                booking.expiresAt = null;
                await booking.save();
                console.log(`⏰ Auto-cancelled Umrah booking ${booking._id}`);
            }
        } catch (err) {
            console.error('Expiry job error:', err);
        }
    }, 60 * 1000); // runs every 1 minute
};
