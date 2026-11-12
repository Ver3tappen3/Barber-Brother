import type { Booking, Master, Service } from './types'

export const BOOKINGS_KEY = 'brat-barbershop-bookings'

export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDateOptions(): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = 0; i <= 7; i += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(getLocalDateString(date))
  }
  return dates
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  }).format(new Date(`${dateString}T12:00:00`))
}

export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(price)} ₸`
}

export function readBookings(): Booking[] {
  try {
    const value = localStorage.getItem(BOOKINGS_KEY)
    return value ? (JSON.parse(value) as Booking[]) : []
  } catch {
    return []
  }
}

export function saveBookings(bookings: Booking[]): void {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings))
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function isSlotFree(
  date: string,
  time: string,
  service: Service,
  master: Master,
  bookings: Booking[],
): boolean {
  if (master.dayOff === new Date(`${date}T12:00:00`).getDay()) return false

  const start = toMinutes(time)
  const end = start + service.duration
  if (start < 10 * 60 || end > 21 * 60) return false

  const now = new Date()
  const slotDate = new Date(`${date}T${time}:00`)
  const earliest = new Date(now.getTime() + 30 * 60 * 1000)
  if (slotDate < earliest) return false

  return !bookings.some((booking) => {
    if (booking.date !== date || booking.masterId !== master.id) return false
    const bookingStart = toMinutes(booking.time)
    const bookingEnd = bookingStart + booking.duration
    return start < bookingEnd && end > bookingStart
  })
}

export function getAvailableTimes(
  date: string,
  service: Service,
  masterId: string,
  masters: Master[],
  bookings: Booking[],
): string[] {
  const selectedMasters = masterId === 'any'
    ? masters
    : masters.filter((master) => master.id === masterId)

  const times: string[] = []
  for (let minutes = 10 * 60; minutes < 21 * 60; minutes += 15) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    const hasFreeMaster = selectedMasters.some((master) =>
      isSlotFree(date, time, service, master, bookings),
    )
    if (hasFreeMaster) times.push(time)
  }
  return times
}

export function chooseMaster(
  date: string,
  time: string,
  service: Service,
  masterId: string,
  masters: Master[],
  bookings: Booking[],
): Master | undefined {
  const selectedMasters = masterId === 'any'
    ? masters
    : masters.filter((master) => master.id === masterId)
  return selectedMasters.find((master) =>
    isSlotFree(date, time, service, master, bookings),
  )
}

export function canCancel(booking: Booking): boolean {
  const start = new Date(`${booking.date}T${booking.time}:00`)
  return Date.now() <= start.getTime() - 2 * 60 * 60 * 1000
}

export function isFutureBooking(booking: Booking): boolean {
  return new Date(`${booking.date}T${booking.time}:00`).getTime() > Date.now()
}
