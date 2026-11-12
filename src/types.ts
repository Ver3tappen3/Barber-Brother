export type Service = {
  id: string
  name: string
  duration: number
  price: number
}

export type Master = {
  id: string
  name: string
  dayOff: number | null
}

export type Booking = {
  id: string
  serviceId: string
  serviceName: string
  duration: number
  price: number
  masterId: string
  masterName: string
  date: string
  time: string
  customerName: string
  phone: string
  comment: string
  createdAt: string
}
