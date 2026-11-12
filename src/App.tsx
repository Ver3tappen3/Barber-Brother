import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Booking, Master, Service } from './types'
import {
  canCancel,
  chooseMaster,
  formatDate,
  formatPrice,
  getAvailableTimes,
  getDateOptions,
  isFutureBooking,
  readBookings,
  saveBookings,
} from './utils'

type Tab = 'booking' | 'mine'

function App() {
  const [services, setServices] = useState<Service[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [bookings, setBookings] = useState<Booking[]>(readBookings)
  const [tab, setTab] = useState<Tab>('booking')
  const [serviceId, setServiceId] = useState('')
  const [masterId, setMasterId] = useState('any')
  const [date, setDate] = useState(getDateOptions()[0])
  const [time, setTime] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('+7')
  const [comment, setComment] = useState('')
  const [lookupPhone, setLookupPhone] = useState('+7')
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/data/services.json').then((response) => response.json()) as Promise<Service[]>,
      fetch('/data/masters.json').then((response) => response.json()) as Promise<Master[]>,
    ]).then(([loadedServices, loadedMasters]) => {
      setServices(loadedServices)
      setMasters(loadedMasters)
      if (loadedServices.length) setServiceId(loadedServices[0].id)
    }).catch(() => setError('Не удалось загрузить данные. Перезапустите проект.'))
  }, [])

  useEffect(() => {
    saveBookings(bookings)
  }, [bookings])

  const selectedService = services.find((service) => service.id === serviceId)
  const dateOptions = useMemo(() => getDateOptions(), [])
  const availableTimes = useMemo(() => {
    if (!selectedService || !date) return []
    return getAvailableTimes(date, selectedService, masterId, masters, bookings)
  }, [date, selectedService, masterId, masters, bookings])

  useEffect(() => {
    if (time && !availableTimes.includes(time)) setTime('')
  }, [availableTimes, time])

  const myBookings = bookings
    .filter((booking) => booking.phone === lookupPhone && isFutureBooking(booking))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))

  function handlePhoneChange(value: string, setter: (value: string) => void) {
    const digits = value.replace(/\D/g, '').replace(/^7/, '').slice(0, 10)
    setter(`+7${digits}`)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!selectedService) return setError('Выберите услугу.')
    if (!customerName.trim()) return setError('Введите имя.')
    if (!/^\+7\d{10}$/.test(phone)) return setError('Введите телефон в формате +7 и 10 цифр.')
    if (!time) return setError('Выберите свободное время.')

    const master = chooseMaster(date, time, selectedService, masterId, masters, bookings)
    if (!master) return setError('Это время уже занято. Выберите другое.')

    const booking: Booking = {
      id: crypto.randomUUID(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      duration: selectedService.duration,
      price: selectedService.price,
      masterId: master.id,
      masterName: master.name,
      date,
      time,
      customerName: customerName.trim(),
      phone,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    }
    setBookings((current) => [...current, booking])
    setSuccessBooking(booking)
    setCustomerName('')
    setPhone('+7')
    setComment('')
    setTime('')
  }

  function cancelBooking(id: string) {
    const booking = bookings.find((item) => item.id === id)
    if (!booking || !canCancel(booking)) return
    setBookings((current) => current.filter((item) => item.id !== id))
    setNotice('Запись отменена.')
    window.setTimeout(() => setNotice(''), 3000)
  }

  function startNewBooking() {
    setSuccessBooking(null)
    setTab('booking')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => { setTab('booking'); setSuccessBooking(null) }}>
          <span className="brand-mark">Б</span>
          <span>БРАТ<span className="brand-sub"> BARBERSHOP</span></span>
        </a>
        <nav className="nav">
          <button className={tab === 'booking' ? 'nav-link active' : 'nav-link'} onClick={() => { setTab('booking'); setSuccessBooking(null) }}>Записаться</button>
          <button className={tab === 'mine' ? 'nav-link active' : 'nav-link'} onClick={() => { setTab('mine'); setSuccessBooking(null) }}>Мои записи</button>
        </nav>
      </header>

      <main>
        {successBooking ? (
          <section className="success-card">
            <div className="success-icon">✓</div>
            <p className="eyebrow">ЗАПИСЬ СОЗДАНА</p>
            <h1>Ждём тебя в гости</h1>
            <p className="muted">Всё готово. Сохрани детали своей записи.</p>
            <div className="summary">
              <SummaryRow label="Услуга" value={successBooking.serviceName} />
              <SummaryRow label="Мастер" value={successBooking.masterName} />
              <SummaryRow label="Дата" value={formatDate(successBooking.date)} />
              <SummaryRow label="Время" value={successBooking.time} />
              <SummaryRow label="Длительность" value={`${successBooking.duration} минут`} />
              <SummaryRow label="Стоимость" value={formatPrice(successBooking.price)} />
            </div>
            <button className="primary-button full" onClick={startNewBooking}>Записаться ещё</button>
            <button className="text-button" onClick={() => { setTab('mine'); setSuccessBooking(null); setLookupPhone(successBooking.phone) }}>Перейти в мои записи</button>
          </section>
        ) : tab === 'booking' ? (
          <>
            <section className="hero">
              <p className="eyebrow">МУЖСКОЙ ХАРАКТЕР. ЧЁТКИЙ СТИЛЬ.</p>
              <h1>ТВОЙ СТИЛЬ.<br /><span>ТВОЁ ВРЕМЯ.</span></h1>
              <p>Выбери услугу, мастера и удобное время. Остальное мы берём на себя.</p>
              <div className="hero-line"><span /> БАРБЕРШОП «БРАТ» <span /></div>
            </section>

            <section className="booking-layout">
              <div className="booking-main">
                <div className="section-heading">
                  <div><p className="eyebrow">ОНЛАЙН-ЗАПИСЬ</p><h2>Запишись к нам</h2></div>
                  <span className="step-label">01 / 04</span>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-section">
                    <SectionTitle number="01" title="Выбери услугу" />
                    <div className="service-grid">
                      {services.map((service) => (
                        <button type="button" key={service.id} className={`service-card ${serviceId === service.id ? 'selected' : ''}`} onClick={() => { setServiceId(service.id); setTime('') }}>
                          <span className="service-check">{serviceId === service.id ? '✓' : '+'}</span>
                          <strong>{service.name}</strong>
                          <span className="service-meta">{service.duration} мин</span>
                          <b>{formatPrice(service.price)}</b>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <SectionTitle number="02" title="Выбери мастера" />
                    <div className="master-list">
                      <button type="button" className={`master-option ${masterId === 'any' ? 'selected' : ''}`} onClick={() => { setMasterId('any'); setTime('') }}>
                        <span className="avatar any-avatar">✦</span><span><strong>Любой мастер</strong><small>Первый свободный специалист</small></span><span className="radio-dot" />
                      </button>
                      {masters.map((master) => (
                        <button type="button" key={master.id} className={`master-option ${masterId === master.id ? 'selected' : ''}`} onClick={() => { setMasterId(master.id); setTime('') }}>
                          <span className="avatar">{master.name.slice(0, 1)}</span>
                          <span><strong>{master.name}</strong><small>{master.dayOff === 1 ? 'Выходной: понедельник' : 'Барбер'}</small></span>
                          <span className="radio-dot" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <SectionTitle number="03" title="Дата и время" />
                    <div className="date-list">
                      {dateOptions.map((dateValue, index) => (
                        <button type="button" key={dateValue} className={`date-option ${date === dateValue ? 'selected' : ''}`} onClick={() => { setDate(dateValue); setTime('') }}>
                          <small>{index === 0 ? 'Сегодня' : index === 1 ? 'Завтра' : new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(`${dateValue}T12:00:00`))}</small>
                          <strong>{new Date(`${dateValue}T12:00:00`).getDate()}</strong>
                          <small>{new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(new Date(`${dateValue}T12:00:00`))}</small>
                        </button>
                      ))}
                    </div>
                    <div className="time-heading"><strong>Свободное время</strong><span>Шаг 15 минут</span></div>
                    {availableTimes.length ? (
                      <div className="time-grid">
                        {availableTimes.map((slot) => <button type="button" key={slot} className={`time-option ${time === slot ? 'selected' : ''}`} onClick={() => setTime(slot)}>{slot}</button>)}
                      </div>
                    ) : <p className="empty-state">На эту дату свободного времени нет. Попробуй выбрать другую дату или мастера.</p>}
                  </div>

                  <div className="form-section">
                    <SectionTitle number="04" title="Твои контакты" />
                    <div className="fields-grid">
                      <label className="field"><span>Имя</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Как тебя зовут?" maxLength={60} /></label>
                      <label className="field"><span>Телефон</span><input value={phone} onChange={(event) => handlePhoneChange(event.target.value, setPhone)} inputMode="numeric" placeholder="+7 700 000 00 00" /></label>
                    </div>
                    <label className="field"><span>Комментарий <em>необязательно</em></span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Пожелания мастеру..." rows={3} maxLength={300} /></label>
                  </div>

                  {error && <div className="error-message" role="alert">{error}</div>}
                  <button className="primary-button full" type="submit">Подтвердить запись <span>↗</span></button>
                  <p className="fine-print">Нажимая кнопку, ты подтверждаешь выбранные дату и время.</p>
                </form>
              </div>

              <aside className="booking-aside">
                <div className="aside-photo">
                  <div className="photo-overlay"><span>БРАТ</span><small>МЕСТО, ГДЕ СОЗДАЮТ СТИЛЬ</small></div>
                </div>
                <div className="aside-info">
                  <p className="eyebrow">МЫ ЖДЁМ ТЕБЯ</p>
                  <h3>Без спешки.<br />С вниманием к деталям.</h3>
                  <div className="info-row"><span>График работы</span><b>Ежедневно, 10:00–21:00</b></div>
                  <div className="info-row"><span>Длительность</span><b>{selectedService ? `${selectedService.duration} минут` : '—'}</b></div>
                  <div className="info-row"><span>Стоимость</span><b>{selectedService ? formatPrice(selectedService.price) : '—'}</b></div>
                </div>
              </aside>
            </section>
          </>
        ) : (
          <section className="mine-section">
            <p className="eyebrow">ТВОИ ВИЗИТЫ</p>
            <h1>Мои записи</h1>
            <p className="muted">Введи номер телефона, который указывал при записи.</p>
            <label className="field lookup-field"><span>Номер телефона</span><input value={lookupPhone} onChange={(event) => handlePhoneChange(event.target.value, setLookupPhone)} inputMode="numeric" /></label>
            {notice && <div className="notice">{notice}</div>}
            {myBookings.length ? (
              <div className="my-bookings">
                {myBookings.map((booking) => (
                  <article className="booking-item" key={booking.id}>
                    <div className="booking-date"><strong>{booking.time}</strong><span>{formatDate(booking.date)}</span></div>
                    <div className="booking-details"><strong>{booking.serviceName}</strong><span>Мастер: {booking.masterName}</span><span>{booking.customerName}</span><b>{formatPrice(booking.price)}</b></div>
                    <div className="booking-actions">
                      {canCancel(booking) ? <button className="cancel-button" onClick={() => cancelBooking(booking.id)}>Отменить</button> : <span className="locked-label">Отмена недоступна</span>}
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-large"><span>✂</span><h3>Будущих записей пока нет</h3><p>Когда запишешься, здесь появятся детали визита.</p><button className="primary-button" onClick={() => setTab('booking')}>Записаться</button></div>}
          </section>
        )}
      </main>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark">Б</span><span>БРАТ<span className="brand-sub"> BARBERSHOP</span></span></a><span>© 2026 Барбершоп «Брат»</span><span>Ежедневно · 10:00–21:00</span></footer>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="section-title"><span>{number}</span><h3>{title}</h3></div>
}

export default App
