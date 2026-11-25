import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'

const ETIQUETAS_CATEGORIA = {
  accesorio: 'Accesorios',
  almacenaje: 'Almacenaje',
  cama: 'Camas',
  colchon: 'Colchones',
  escritorio: 'Escritorios',
  iluminacion: 'Iluminación',
  mesa: 'Mesas',
  silla: 'Sillas',
  silla_oficina: 'Sillas de oficina',
  sofa: 'Sofás',
  textil: 'Textil',
}

function formatearPrecio(precio) {
  return `${Number(precio).toFixed(2).replace('.', ',')} €`
}

function AsistenteTienda() {
  const [pregunta, setPregunta] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const enviarPregunta = async (e) => {
    e.preventDefault()
    const texto = pregunta.trim()
    if (!texto || cargando) return

    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto }),
      })
      if (!res.ok) {
        throw new Error('No se pudo consultar al asistente')
      }
      const data = await res.json()
      setRespuesta(data.respuesta || '')
    } catch {
      setError('No se pudo obtener respuesta en este momento. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="panel-asistente" aria-labelledby="titulo-asistente">
      <h2 id="titulo-asistente">Asistente de la tienda</h2>
      <p className="descripcion-suave">
        Pregunta sobre productos, medidas, precios con IVA, envíos, montaje, devoluciones o garantía.
      </p>
      <form className="formulario-asistente" onSubmit={enviarPregunta}>
        <div className="campo-grupo">
          <label htmlFor="pregunta-asistente">Tu pregunta</label>
          <input
            id="pregunta-asistente"
            name="pregunta"
            type="text"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Ej. ¿Cuánto cuesta el envío o qué sofás de 3 plazas tenéis?"
            maxLength={500}
            required
          />
        </div>
        <button type="submit" className="boton-primario" disabled={cargando}>
          {cargando ? 'Consultando…' : 'Preguntar'}
        </button>
      </form>
      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}
      {respuesta && (
        <div className="caja-respuesta" aria-live="polite">
          <p>{respuesta}</p>
        </div>
      )}
    </section>
  )
}

function Portada({ productos, anadir }) {
  const [categoria, setCategoria] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  const categorias = useMemo(() => {
    if (!productos) return []
    return Array.from(new Set(productos.map((p) => p.categoria))).sort()
  }, [productos])

  const filtrados = useMemo(() => {
    if (!productos) return []
    const q = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (categoria !== 'todas' && p.categoria !== categoria) return false
      if (!q) return true
      const texto = `${p.nombre} ${p.categoria} ${p.color || ''} ${p.material || ''}`.toLowerCase()
      return texto.includes(q)
    })
  }, [productos, categoria, busqueda])

  return (
    <main className="contenido">
      <AsistenteTienda />

      <section aria-labelledby="titulo-catalogo">
        <div className="cabecera-catalogo">
          <h2 id="titulo-catalogo">Catálogo</h2>
          <p className="descripcion-suave">
            {productos === null
              ? 'Cargando productos…'
              : `${filtrados.length} producto${filtrados.length === 1 ? '' : 's'} disponibles (IVA incluido)`}
          </p>
        </div>

        <div className="filtros">
          <div className="campo-grupo">
            <label htmlFor="buscador-catalogo">Buscar producto</label>
            <input
              id="buscador-catalogo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Sofá, roble, 150x190…"
            />
          </div>
          <div className="campo-grupo">
            <label htmlFor="filtro-categoria">Categoría</label>
            <select
              id="filtro-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {ETIQUETAS_CATEGORIA[cat] || cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {productos && filtrados.length === 0 && (
          <p>No encontramos productos con esos criterios.</p>
        )}

        <ul className="rejilla">
          {filtrados.map((p) => (
            <li key={p.sku} className="tarjeta">
              <p className="etiqueta-cat">{ETIQUETAS_CATEGORIA[p.categoria] || p.categoria}</p>
              <h3>
                <Link to={`/producto/${p.sku}`}>{p.nombre}</Link>
              </h3>
              <p className="detalles-cortos">
                {[
                  p.color,
                  p.material,
                  p.ancho_cm ? `${p.ancho_cm} cm` : null,
                  p.plazas ? `${p.plazas} plazas` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="precio">{formatearPrecio(p.precio)}</p>
              <BotonAnadir producto={p} anadir={anadir} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function DetalleProducto({ productos, recomendaciones, anadir }) {
  const { sku } = useParams()
  const producto = (productos || []).find((p) => p.sku === sku)

  if (productos === null) {
    return (
      <main className="contenido">
        <p>Cargando producto…</p>
      </main>
    )
  }

  if (!producto) {
    return (
      <main className="contenido">
        <h2>Producto no encontrado</h2>
        <p>
          <Link to="/">Volver al catálogo</Link>
        </p>
      </main>
    )
  }

  const nombresRelacionados = recomendaciones[producto.sku] || []
  const relacionados = nombresRelacionados
    .map((nombre) => productos.find((p) => p.nombre === nombre))
    .filter(Boolean)

  return (
    <main className="contenido">
      <p className="miga">
        <Link to="/">← Volver al catálogo</Link>
      </p>
      <article className="ficha-producto">
        <p className="etiqueta-cat">
          {ETIQUETAS_CATEGORIA[producto.categoria] || producto.categoria}
        </p>
        <h2>{producto.nombre}</h2>
        <p className="precio-grande">{formatearPrecio(producto.precio)}</p>
        <p className="descripcion-suave">Precio con IVA (21 %) incluido.</p>
        <BotonAnadir producto={producto} anadir={anadir} />
        <dl className="especificaciones">
          <div>
            <dt>Ancho</dt>
            <dd>{producto.ancho_cm} cm</dd>
          </div>
          <div>
            <dt>Color</dt>
            <dd>{producto.color}</dd>
          </div>
          <div>
            <dt>Material</dt>
            <dd>{producto.material}</dd>
          </div>
          {producto.plazas && (
            <div>
              <dt>Plazas</dt>
              <dd>{producto.plazas}</dd>
            </div>
          )}
        </dl>
      </article>

      {relacionados.length > 0 && (
        <section className="seccion-relacionados" aria-labelledby="titulo-relacionados">
          <h3 id="titulo-relacionados">Suele comprarse con</h3>
          <ul className="rejilla">
            {relacionados.map((rel) => (
              <li key={rel.sku} className="tarjeta">
                <h4>
                  <Link to={`/producto/${rel.sku}`}>{rel.nombre}</Link>
                </h4>
                <p className="precio">{formatearPrecio(rel.precio)}</p>
                <BotonAnadir producto={rel} anadir={anadir} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Condiciones() {
  return (
    <main className="contenido">
      <p className="miga">
        <Link to="/">← Volver al catálogo</Link>
      </p>
      <article className="ficha-producto">
        <h2>Condiciones de venta</h2>
        <h3>Envío</h3>
        <ul>
          <li>Envío gratis en pedidos desde 500 €. En pedidos de menos de 500 € cuesta 49 €.</li>
          <li>Entrega en 3 a 5 días laborables en península y 7 a 10 días laborables en Baleares.</li>
          <li>No enviamos a Canarias, Ceuta ni Melilla.</li>
        </ul>
        <h3>Montaje</h3>
        <ul>
          <li>Montaje a domicilio: 39 € por pedido. Gratis en pedidos desde 1.500 €.</li>
        </ul>
        <h3>Devoluciones</h3>
        <ul>
          <li>30 días naturales para devolver cualquier producto sin usar.</li>
          <li>Los colchones tienen 100 noches de prueba con recogida sin coste.</li>
        </ul>
        <h3>Garantía</h3>
        <ul>
          <li>3 años de garantía en todos los muebles y 10 años en los colchones.</li>
        </ul>
        <h3>Pago</h3>
        <ul>
          <li>Aceptamos tarjeta, Bizum y transferencia bancaria.</li>
          <li>No ofrecemos financiación ni pago a plazos.</li>
        </ul>
      </article>
    </main>
  )
}

const CLAVE_CARRITO = 'hk_carrito'
const ENVIO_GRATIS = 500
const MONTAJE_GRATIS = 1500

function cargarCarrito() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || '{}')
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {}
  } catch {
    return {}
  }
}

function BotonAnadir({ producto, anadir }) {
  const [hecho, setHecho] = useState(false)
  return (
    <button
      type="button"
      className="boton-primario boton-anadir"
      onClick={() => {
        anadir(producto.sku)
        setHecho(true)
      }}
    >
      {hecho ? 'Añadido ✓ Añadir otro' : 'Añadir al carrito'}
    </button>
  )
}

function BarraCarrito({ unidades, total }) {
  return (
    <div className="barra-carrito">
      <Link to="/carrito" className="enlace-carrito">
        Ver carrito ({unidades} {unidades === 1 ? 'producto' : 'productos'} · {formatearPrecio(total)})
      </Link>
      {unidades > 0 && (
        <Link to="/checkout" className="boton-primario enlace-boton">
          Finalizar compra
        </Link>
      )}
    </div>
  )
}

function lineasDelCarrito(carrito, productos) {
  return Object.entries(carrito)
    .map(([sku, cantidad]) => ({ producto: (productos || []).find((p) => p.sku === sku), cantidad }))
    .filter((l) => l.producto && l.cantidad > 0)
}

function AvisosPromocion({ total }) {
  return (
    <ul className="avisos-promo">
      <li>
        {total >= ENVIO_GRATIS
          ? 'Envío gratis en tu pedido.'
          : `Te faltan ${formatearPrecio(ENVIO_GRATIS - total)} para el envío gratis (pedidos desde 500 €).`}
      </li>
      <li>
        {total >= MONTAJE_GRATIS
          ? 'Montaje a domicilio gratis en tu pedido.'
          : `Te faltan ${formatearPrecio(MONTAJE_GRATIS - total)} para el montaje gratis (pedidos desde 1.500 €).`}
      </li>
    </ul>
  )
}

function Carrito({ productos, carrito, cambiarCantidad, recomendaciones, anadir, total }) {
  const lineas = lineasDelCarrito(carrito, productos)

  const sugerencias = useMemo(() => {
    const enCarrito = new Set(lineas.map((l) => l.producto.sku))
    const nombres = lineas.flatMap((l) => recomendaciones[l.producto.sku] || [])
    const vistos = new Set()
    return nombres
      .map((n) => (productos || []).find((p) => p.nombre === n))
      .filter((p) => p && !enCarrito.has(p.sku) && !vistos.has(p.sku) && vistos.add(p.sku))
      .slice(0, 4)
  }, [lineas, recomendaciones, productos])

  return (
    <main className="contenido">
      <p className="miga">
        <Link to="/">← Seguir comprando</Link>
      </p>
      <h2>Tu carrito</h2>
      {lineas.length === 0 ? (
        <p>
          Tu carrito está vacío. <Link to="/">Ver el catálogo</Link>
        </p>
      ) : (
        <>
          <ul className="lista-carrito">
            {lineas.map(({ producto, cantidad }) => (
              <li key={producto.sku} className="linea-carrito">
                <span className="linea-nombre">{producto.nombre}</span>
                <span>{formatearPrecio(producto.precio)}</span>
                <span className="linea-cantidad">
                  <label htmlFor={`cantidad-${producto.sku}`}>Cantidad</label>
                  <input
                    id={`cantidad-${producto.sku}`}
                    type="number"
                    min="0"
                    max="99"
                    value={cantidad}
                    onChange={(e) => cambiarCantidad(producto.sku, parseInt(e.target.value, 10) || 0)}
                  />
                </span>
                <span className="linea-subtotal">{formatearPrecio(producto.precio * cantidad)}</span>
                <button type="button" className="boton-secundario" onClick={() => cambiarCantidad(producto.sku, 0)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <p className="total-carrito">Total (IVA incluido): {formatearPrecio(total)}</p>
          <AvisosPromocion total={total} />
          <Link to="/checkout" className="boton-primario enlace-boton">
            Finalizar compra
          </Link>
        </>
      )}

      {sugerencias.length > 0 && (
        <section className="seccion-relacionados" aria-labelledby="titulo-sugerencias">
          <h3 id="titulo-sugerencias">Completa tu compra: suele comprarse junto</h3>
          <ul className="rejilla">
            {sugerencias.map((p) => (
              <li key={p.sku} className="tarjeta">
                <h4>
                  <Link to={`/producto/${p.sku}`}>{p.nombre}</Link>
                </h4>
                <p className="precio">{formatearPrecio(p.precio)}</p>
                <BotonAnadir producto={p} anadir={anadir} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Checkout({ productos, carrito, total, vaciar }) {
  const navigate = useNavigate()
  const [datos, setDatos] = useState({ nombre: '', email: '', direccion: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const lineas = lineasDelCarrito(carrito, productos)

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value })

  const pagar = async (e) => {
    e.preventDefault()
    if (enviando || lineas.length === 0) return
    setEnviando(true)
    setError('')
    try {
      const res = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: datos,
          items: lineas.map((l) => ({ sku: l.producto.sku, cantidad: l.cantidad })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo completar el pago. Inténtalo de nuevo.')
      sessionStorage.setItem('hk_ultimo_pedido', JSON.stringify(data))
      vaciar()
      navigate(`/pedido/${data.order_id}`)
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  if (productos !== null && lineas.length === 0) {
    return (
      <main className="contenido">
        <h2>Finalizar compra</h2>
        <p>
          Tu carrito está vacío. <Link to="/">Ver el catálogo</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="contenido">
      <p className="miga">
        <Link to="/carrito">← Volver al carrito</Link>
      </p>
      <h2>Finalizar compra como invitado</h2>
      <p className="descripcion-suave">Sin registro. El pago es simulado: no se piden datos de tarjeta.</p>
      <ul className="resumen-pedido">
        {lineas.map(({ producto, cantidad }) => (
          <li key={producto.sku}>
            {cantidad} × {producto.nombre} — {formatearPrecio(producto.precio * cantidad)}
          </li>
        ))}
      </ul>
      <p className="total-carrito">Total a pagar (IVA incluido): {formatearPrecio(total)}</p>
      <form className="formulario-checkout" onSubmit={pagar}>
        <div className="campo-grupo">
          <label htmlFor="checkout-nombre">Nombre y apellidos</label>
          <input id="checkout-nombre" name="nombre" autoComplete="name" required value={datos.nombre} onChange={cambiar} />
        </div>
        <div className="campo-grupo">
          <label htmlFor="checkout-email">Email</label>
          <input id="checkout-email" name="email" type="email" autoComplete="email" required value={datos.email} onChange={cambiar} />
        </div>
        <div className="campo-grupo">
          <label htmlFor="checkout-direccion">Dirección de entrega (calle, número, código postal y ciudad)</label>
          <input id="checkout-direccion" name="direccion" autoComplete="street-address" required value={datos.direccion} onChange={cambiar} />
        </div>
        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="boton-primario boton-pagar" disabled={enviando}>
          {enviando ? 'Procesando pago…' : `Pagar ${formatearPrecio(total)}`}
        </button>
      </form>
    </main>
  )
}

function Confirmacion() {
  const { id } = useParams()
  let pedido = null
  try {
    pedido = JSON.parse(sessionStorage.getItem('hk_ultimo_pedido') || 'null')
  } catch {
    pedido = null
  }
  const coincide = pedido && pedido.order_id === id

  return (
    <main className="contenido">
      <h2>¡Pedido confirmado!</h2>
      <p className="mensaje-ok" role="status">
        Gracias por tu compra. Tu pedido se ha completado y pagado correctamente.
      </p>
      <p>
        Número de pedido: <strong>{id}</strong>
      </p>
      {coincide && (
        <>
          <ul className="resumen-pedido">
            {pedido.items.map((i) => (
              <li key={i.sku}>
                {i.quantity} × {i.name} — {formatearPrecio(i.unit_price * i.quantity)}
              </li>
            ))}
          </ul>
          <p className="total-carrito">Total pagado: {formatearPrecio(pedido.total)}</p>
        </>
      )}
      <p>
        <Link to="/">Volver a la tienda</Link>
      </p>
    </main>
  )
}

function NoEncontrada() {
  return (
    <main className="contenido">
      <h2>Página no encontrada</h2>
      <p>
        <Link to="/">Volver a la tienda</Link>
      </p>
    </main>
  )
}

export default function App() {
  const [productos, setProductos] = useState(null)
  const [recomendaciones, setRecomendaciones] = useState({})
  const [carrito, setCarrito] = useState(cargarCarrito)

  useEffect(() => {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito))
  }, [carrito])

  const anadir = (sku) => setCarrito((c) => ({ ...c, [sku]: Math.min((c[sku] || 0) + 1, 99) }))
  const cambiarCantidad = (sku, cantidad) =>
    setCarrito((c) => {
      const nuevo = { ...c }
      if (cantidad > 0) nuevo[sku] = Math.min(cantidad, 99)
      else delete nuevo[sku]
      return nuevo
    })
  const vaciar = () => setCarrito({})

  const lineas = lineasDelCarrito(carrito, productos)
  const unidades = lineas.reduce((n, l) => n + l.cantidad, 0)
  // Suma en céntimos para evitar errores de coma flotante
  const total = lineas.reduce((t, l) => t + Math.round(l.producto.precio * 100) * l.cantidad, 0) / 100

  useEffect(() => {
    fetch('/catalogo.json')
      .then((r) => r.json())
      .then((d) => setProductos(Array.isArray(d) ? d : d.productos || []))
      .catch(() => setProductos([]))

    fetch('/api/recomendaciones')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setRecomendaciones(d && typeof d === 'object' ? d : {}))
      .catch(() => setRecomendaciones({}))
  }, [])

  return (
    <>
      <BarraCarrito unidades={unidades} total={total} />
      <Routes>
        <Route path="/" element={<Portada productos={productos} anadir={anadir} />} />
        <Route
          path="/producto/:sku"
          element={<DetalleProducto productos={productos} recomendaciones={recomendaciones} anadir={anadir} />}
        />
        <Route
          path="/carrito"
          element={
            <Carrito
              productos={productos}
              carrito={carrito}
              cambiarCantidad={cambiarCantidad}
              recomendaciones={recomendaciones}
              anadir={anadir}
              total={total}
            />
          }
        />
        <Route
          path="/checkout"
          element={<Checkout productos={productos} carrito={carrito} total={total} vaciar={vaciar} />}
        />
        <Route path="/pedido/:id" element={<Confirmacion />} />
        <Route path="/condiciones" element={<Condiciones />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </>
  )
}
