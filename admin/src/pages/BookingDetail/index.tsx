import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import axiosInstance from '../../Api/axios'
import BookingDetailView from './BookingDetailView'

export interface Booking {
    _id: string
    bookingReference: string
    contactPersonName: string
    sector: string
    airline?: {
        id?: string
        name: string
        logoUrl?: string
    }
    pnr?: string
    departureDate: string
    arrivalDate?: string
    userId?: string | { _id: string }
    status: string
    adultsCount: number
    childrenCount: number
    infantsCount: number
    totalPassengers: number
    pricing?: {
        adultPrice: number
        adultBasePrice?: number
        adultTotal: number
        childPrice?: number
        childBasePrice?: number
        childTotal?: number
        infantPrice?: number
        infantBasePrice?: number
        infantTotal?: number
        discountAmount?: number
        originalGrandTotal?: number
        grandTotal: number
    }
    passengers?: Array<{
        type: string
        title: string,
        givenName: string
        surName: string
        passport: string
        passportExpiry?: string
        dateOfBirth: string
        documentUrl?: string 
    }>
    flights?: Array<{
        flightNo: string
        origin: string
        destination: string
        depDate: string
        depTime: string
        arrDate: string
        arrTime: string
        baggage?: string
        meal?: string
    }>
    createdAt: string
    sabaoonTransactionId?: number | null
    sabaoonBookingStatus?: 'pending' | 'success' | 'failed' | 'not_applicable' | null
}

export default function BookingDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedStatus, setSelectedStatus] = useState('')
    const [discountAmount, setDiscountAmount] = useState(0)
    const [isSavingDiscount, setIsSavingDiscount] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        fetchBookingDetail()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const fetchBookingDetail = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await axiosInstance.get(`/bookings/${id}`)

            if (response.data.success) {
                setBooking(response.data.data)
                setSelectedStatus(response.data.data.status)
                setDiscountAmount(response.data.data.pricing?.discountAmount || 0)
            } else {
                setError('Failed to load booking details')
            }
        } catch (err) {
            console.error('Error fetching booking:', err)
            setError('Failed to load booking details')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async () => {
        if (!booking || selectedStatus === booking.status) {
            return
        }

        try {
            setIsUpdating(true)
            const response = await axiosInstance.patch(`/bookings/${id}/status`, {
                status: selectedStatus
            })

            if (response.data.success) {
                setBooking(response.data.data)
                alert('Booking status updated successfully!')
            }
        } catch (err) {
            console.error('Error updating status:', err)
            alert('Failed to update booking status. Please try again.')
            if (booking) {
                setSelectedStatus(booking.status)
            }
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDiscountSave = async () => {
        if (!booking) return

        try {
            setIsSavingDiscount(true)
            const response = await axiosInstance.patch(`/bookings/${id}/discount`, {
                discountAmount: Number(discountAmount || 0),
            })

            if (response.data.success) {
                setBooking(response.data.data)
                setDiscountAmount(response.data.data.pricing?.discountAmount || 0)
                alert('Discount saved successfully')
            }
        } catch (err) {
            console.error('Error saving discount:', err)
            alert('Failed to save discount. Please try again.')
        } finally {
            setIsSavingDiscount(false)
        }
    }

    if (loading) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading booking details...</p>
                </div>
            </div>
        )
    }

    if (error || !booking) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg mb-4">{error || 'Booking not found'}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return <BookingDetailView booking={booking} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} discountAmount={discountAmount} setDiscountAmount={setDiscountAmount} isUpdating={isUpdating} isSavingDiscount={isSavingDiscount} onStatusChange={handleStatusChange} onDiscountSave={handleDiscountSave} />
}
