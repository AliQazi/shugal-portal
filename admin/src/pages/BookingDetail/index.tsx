import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import axiosInstance from '../../Api/axios'

interface Booking {
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

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            "on hold": 'border border-yellow-200 bg-yellow-50 text-yellow-700',
            pending: 'border border-yellow-200 bg-yellow-50 text-yellow-700',
            confirmed: 'border border-green-200 bg-green-50 text-green-700',
            cancelled: 'border border-red-200 bg-red-50 text-red-700'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
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

    const safeBooking = booking as Booking

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
                        <p className="text-gray-600 mt-1">Reference: <span className="font-semibold text-blue-600">{safeBooking.bookingReference}</span></p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Back
                    </button>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Booking Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Card with Update */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Booking Status</h2>
                            </div>
                            <div className="flex items-center gap-4">
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="on hold">On Hold</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <button
                                    onClick={handleStatusChange}
                                    disabled={selectedStatus === safeBooking.status || isUpdating}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                            <p className="text-gray-600 mt-4 text-sm">Created: {formatDate(safeBooking.createdAt)}</p>
                        </div>

                        {/* Booking Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-600">Contact Person</label>
                                    <p className="text-gray-900 font-medium">{(safeBooking?.passengers?.[0]?.givenName + ' ' + safeBooking?.passengers?.[0]?.surName) || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Sector</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.sector}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Airline</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.airline?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">PNR</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.pnr || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Departure Date</label>
                                    <p className="text-gray-900 font-medium">{formatDate(safeBooking.departureDate)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Arrival Date</label>
                                    <p className="text-gray-900 font-medium">{formatDate(safeBooking.arrivalDate)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Booked By (User ID)</label>
                                    <p className="text-gray-900 font-medium text-xs">{typeof safeBooking.userId === 'string' ? safeBooking.userId : safeBooking.userId?._id || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Passenger Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger Breakdown</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-blue-600">{safeBooking.adultsCount || "0"}</p>
                                    <p className="text-sm text-gray-600">Adults</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-600">{safeBooking.childrenCount || "0"}</p>
                                    <p className="text-sm text-gray-600">Children</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-purple-600">{safeBooking.infantsCount || "0"}</p>
                                    <p className="text-sm text-gray-600">Infants</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-gray-700"><span className="font-semibold">Total Passengers:</span> {safeBooking.totalPassengers}</p>
                            </div>
                        </div>

                        {/* Pricing Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h3>
                            <div className="space-y-3">
                                {/* Adults */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Adult Base Price (x{safeBooking.adultsCount})</span>
                                    <span className="font-medium">PKR {(safeBooking.pricing?.adultBasePrice || safeBooking.pricing?.adultPrice || 0).toLocaleString()}</span>
                                </div>
                                {safeBooking.pricing?.adultBasePrice !== undefined &&
                                    safeBooking.pricing.adultPrice !== safeBooking.pricing.adultBasePrice && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-amber-700">↑ Margin per Adult</span>
                                            <span className="font-medium text-amber-700">
                                                +PKR {(safeBooking.pricing.adultPrice - safeBooking.pricing.adultBasePrice).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Adult Final Price (x{safeBooking.adultsCount})</span>
                                    <span className="font-medium">PKR {(safeBooking.pricing?.adultPrice || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Adult Total</span>
                                    <span className="font-medium text-blue-600">PKR {(safeBooking.pricing?.adultTotal || 0).toLocaleString()}</span>
                                </div>

                                {/* Children */}
                                {safeBooking.childrenCount > 0 && (
                                    <>
                                        <div className="border-t border-gray-100 pt-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Child Base Price (x{safeBooking.childrenCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.childBasePrice || safeBooking.pricing?.childPrice || 0).toLocaleString()}</span>
                                        </div>
                                        {safeBooking.pricing?.childBasePrice !== undefined &&
                                            (safeBooking.pricing?.childPrice || 0) !== (safeBooking.pricing?.childBasePrice || 0) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-amber-700">↑ Margin per Child</span>
                                                    <span className="font-medium text-amber-700">
                                                        +PKR {((safeBooking.pricing?.childPrice || 0) - (safeBooking.pricing?.childBasePrice || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Child Final Price (x{safeBooking.childrenCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.childPrice || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Child Total</span>
                                            <span className="font-medium text-green-600">PKR {(safeBooking.pricing?.childTotal || 0).toLocaleString()}</span>
                                        </div>
                                    </>
                                )}

                                {/* Infants */}
                                {safeBooking.infantsCount > 0 && (
                                    <>
                                        <div className="border-t border-gray-100 pt-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Infant Base Price (x{safeBooking.infantsCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.infantBasePrice || safeBooking.pricing?.infantPrice || 0).toLocaleString()}</span>
                                        </div>
                                        {safeBooking.pricing?.infantBasePrice !== undefined &&
                                            (safeBooking.pricing?.infantPrice || 0) !== (safeBooking.pricing?.infantBasePrice || 0) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-amber-700">↑ Margin per Infant</span>
                                                    <span className="font-medium text-amber-700">
                                                        +PKR {((safeBooking.pricing?.infantPrice || 0) - (safeBooking.pricing?.infantBasePrice || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Infant Final Price (x{safeBooking.infantsCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.infantPrice || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Infant Total</span>
                                            <span className="font-medium text-purple-600">PKR {(safeBooking.pricing?.infantTotal || 0).toLocaleString()}</span>
                                        </div>
                                    </>
                                )}

                                <div className="border-t border-gray-200 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-900">Grand Total</span>
                                        <span className="text-lg font-bold text-blue-600">PKR {(safeBooking.pricing?.grandTotal || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Passenger List */}
                        {safeBooking.passengers && safeBooking.passengers.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger List</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Passport</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Passport Expiry</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">DOB</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {safeBooking.passengers.map((passenger, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">{`${passenger.title}.`} {passenger.givenName} {passenger.surName}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${passenger.type === 'Adult' ? 'bg-blue-100 text-blue-800' :
                                                            passenger.type === 'Child' ? 'bg-green-100 text-green-800' :
                                                                'bg-purple-100 text-purple-800'
                                                            }`}>
                                                            {passenger.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{passenger.passport || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(passenger.passportExpiry)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {formatDate(passenger.dateOfBirth)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {passenger.documentUrl ? (
                                                            /\.(jpg|jpeg|png|webp)/i.test(passenger.documentUrl) ? (
                                                                <a href={passenger.documentUrl} target="_blank" rel="noreferrer">
                                                                    <img
                                                                        src={passenger.documentUrl}
                                                                        alt="document"
                                                                        className="h-10 w-16 object-cover rounded border border-gray-300 hover:opacity-80 transition-opacity"
                                                                    />
                                                                </a>
                                                            ) : (
                                                                <a
                                                                    href={passenger.documentUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                                    PDF
                                                                </a>
                                                            )
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Flight Details */}
                        {safeBooking.flights && safeBooking.flights.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                                <div className="space-y-4">
                                    {safeBooking.flights.map((flight, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <p className="font-semibold text-gray-900">Flight {index + 1}: {flight.flightNo}</p>
                                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                                                <div><span className="font-medium">Origin:</span> {flight.origin}</div>
                                                <div><span className="font-medium">Destination:</span> {flight.destination}</div>
                                                <div><span className="font-medium">Departure:</span> {formatDate(safeBooking.departureDate)} {flight.depTime}</div>
                                                <div><span className="font-medium">Arrival:</span> {formatDate(safeBooking.arrivalDate)} {flight.arrTime}</div>
                                                <div><span className="font-medium">Baggage:</span> {flight.baggage || 'N/A'}</div>
                                                <div><span className="font-medium">Meal:</span> {flight.meal || 'N/A'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Summary */}
                    <div>
                        <div className="bg-white rounded-lg shadow p-6 sticky top-20">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <label className="text-gray-600">Reference</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.bookingReference}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">Status</label>
                                    <p className={`font-medium px-3 py-1 rounded w-fit text-xs mt-1 ${getStatusColor(safeBooking.status)}`}>
                                        {safeBooking.status.charAt(0).toUpperCase() + safeBooking.status.slice(1)}
                                    </p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Total Passengers</label>
                                    <p className="text-2xl font-bold text-gray-900">{safeBooking.totalPassengers}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Grand Total</label>
                                    <p className="text-2xl font-bold text-blue-600">PKR {(safeBooking.pricing?.grandTotal || 0).toLocaleString()}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Booked on</label>
                                    <p className="text-gray-900">{formatDate(safeBooking.createdAt)}</p>
                                </div>
                                {safeBooking.sabaoonBookingStatus && safeBooking.sabaoonBookingStatus !== 'not_applicable' && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <label className="text-gray-600">Sabaoon Status</label>
                                        <p className={`mt-1 inline-block px-2 py-1 rounded text-xs font-semibold ${safeBooking.sabaoonBookingStatus === 'success'
                                                ? 'bg-green-100 text-green-700'
                                                : safeBooking.sabaoonBookingStatus === 'failed'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {safeBooking.sabaoonBookingStatus.charAt(0).toUpperCase() + safeBooking.sabaoonBookingStatus.slice(1)}
                                        </p>
                                    </div>
                                )}
                                {safeBooking.sabaoonTransactionId && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <label className="text-gray-600">Sabaoon Transaction ID</label>
                                        <p className="text-gray-900 font-medium text-sm">{safeBooking.sabaoonTransactionId}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
