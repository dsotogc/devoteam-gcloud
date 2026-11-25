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
  const [orden, setOrden] = useState('recomendados')

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
    .sort((a, b) => {
      if (orden === 'precio-asc') return a.precio - b.precio
      if (orden === 'nombre') return a.nombre.localeCompare(b.nombre)
      // Recomendados: por categoría y, dentro de cada una, la gama más alta primero
      return a.categoria.localeCompare(b.categoria) || b.precio - a.precio
    })
  }, [productos, categoria, busqueda, orden])

  return (
    <main className="contenido">
      <section aria-labelledby="titulo-catalogo">
        <div className="cabecera-catalogo">
          <h2 id="titulo-catalogo">Catálogo</h2>
          <p className="descripcion-suave">
            {productos === null
              ? 'Cargando productos…'
              : `${filtrados.length} producto${filtrados.length === 1 ? '' : 's'} disponibles (IVA incluido)`}
          </p>
        </div>

        <nav className="botones-categoria" aria-label="Categorías">
          <button
            type="button"
            className={categoria === 'todas' ? 'chip activo' : 'chip'}
            onClick={() => setCategoria('todas')}
          >
            Todo
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              className={categoria === cat ? 'chip activo' : 'chip'}
              onClick={() => setCategoria(cat)}
            >
              {ETIQUETAS_CATEGORIA[cat] || cat}
            </button>
          ))}
        </nav>

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
          <div className="campo-grupo">
            <label htmlFor="orden-catalogo">Ordenar</label>
            <select id="orden-catalogo" value={orden} onChange={(e) => setOrden(e.target.value)}>
              <option value="recomendados">Recomendados</option>
              <option value="precio-asc">Precio: de menor a mayor</option>
              <option value="nombre">Nombre</option>
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

      <AsistenteTienda />
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

const CATEGORIAS_COMPLEMENTO = ['iluminacion', 'textil', 'almacenaje', 'accesorio']
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

// Complementos por estancia (solo categorías de venta cruzada), del historial "se compran juntos"
const COMPLEMENTOS_POR_CATEGORIA = {
  sofa: ['manta-para-sofa', 'pack-4-cojines-decorativos', 'alfombra-de-salon-160x230', 'lampara-de-pie-arco'],
  cama: ['juego-de-sabanas-150', 'funda-nordica-150-todo-el-ano', 'mesilla-de-noche-1-cajon', 'lampara-de-mesilla-ceramica'],
  colchon: ['protector-de-colchon-impermeable-150', 'pack-2-almohadas-viscoelasticas', 'juego-de-sabanas-150'],
  mesa: ['lampara-de-techo-trenzada', 'aparador-3-puertas'],
  silla: ['lampara-de-techo-trenzada'],
  escritorio: ['flexo-led-regulable', 'soporte-de-monitor-de-madera', 'cajonera-con-ruedas-3-cajones'],
  silla_oficina: ['alfombrilla-protectora-para-silla', 'reposapies-ergonomico'],
}

function medida(nombre) {
  const m = /(\d{2,3})x(\d{3})/i.exec(nombre)
  return m ? `${m[1]}x${m[2]}` : null
}

function tamanoPack(nombre) {
  const m = /pack (\d+)/i.exec(nombre)
  return m ? m[1] : null
}

// Versión superior compatible: misma categoría, mismas plazas / medida / tamaño de pack, hasta el doble de precio
function mejoraDe(producto, productos, carrito, maxExtra) {
  if (CATEGORIAS_COMPLEMENTO.includes(producto.categoria)) return null
  const candidatos = (productos || []).filter(
    (p) =>
      p.categoria === producto.categoria &&
      p.sku !== producto.sku &&
      !carrito[p.sku] &&
      p.precio > producto.precio &&
      p.precio <= producto.precio * 2 &&
      p.precio - producto.precio <= maxExtra &&
      (producto.plazas == null || p.plazas === producto.plazas) &&
      medida(p.nombre) === medida(producto.nombre) &&
      tamanoPack(p.nombre) === tamanoPack(producto.nombre),
  )
  candidatos.sort((a, b) => b.precio - a.precio)
  return candidatos[0] || null
}

function complementosPara(lineas, productos, recomendaciones) {
  const enCarrito = new Set(lineas.map((l) => l.producto.sku))
  const skus = []
  for (const { producto } of lineas) {
    skus.push(...(COMPLEMENTOS_POR_CATEGORIA[producto.categoria] || []))
    for (const nombre of recomendaciones[producto.sku] || []) {
      const p = (productos || []).find((x) => x.nombre === nombre)
      if (p && CATEGORIAS_COMPLEMENTO.includes(p.categoria)) skus.push(p.sku)
    }
  }
  return [...new Set(skus)]
    .filter((sku) => !enCarrito.has(sku))
    .map((sku) => (productos || []).find((p) => p.sku === sku))
    .filter(Boolean)
    .slice(0, 8)
}

// Presupuesto de referencia del cliente: ninguna sugerencia puede llevar el pedido por encima de él
const LIMITE_SUGERENCIAS = 4000

function MejorasYComplementos({ lineas, productos, carrito, recomendaciones, anadir, cambiar }) {
  const totalActual = lineas.reduce((t, l) => t + Math.round(l.producto.precio * 100) * l.cantidad, 0) / 100
  const restante = LIMITE_SUGERENCIAS - totalActual

  // Complementos: solo los que caben en lo que queda (el pack, sumado, también cabe)
  const candidatos = complementosPara(lineas, productos, recomendaciones).filter((p) => p.precio <= restante)
  const complementos = []
  let sumaPack = 0
  for (const p of candidatos) {
    if (complementos.length < 6 && sumaPack + p.precio <= restante) {
      complementos.push(p)
      sumaPack += p.precio
    }
  }
  const totalComplementos = Math.round(sumaPack * 100) / 100

  // Mejoras: caben en lo que queda, reservando sitio para al menos un complemento si aún no hay ninguno
  const yaHayComplemento = lineas.some((l) => CATEGORIAS_COMPLEMENTO.includes(l.producto.categoria))
  const reserva = yaHayComplemento || complementos.length === 0 ? 0 : Math.min(...complementos.map((p) => p.precio))
  const mejoras = lineas
    .map((l) => ({ ...l, mejora: mejoraDe(l.producto, productos, carrito, (restante - reserva) / l.cantidad) }))
    .filter((l) => l.mejora)

  if (mejoras.length === 0 && complementos.length === 0) return null
  return (
    <section className="panel-recomendaciones" aria-labelledby="titulo-recomendaciones">
      <h3 id="titulo-recomendaciones">Recomendado antes de pagar</h3>
      {complementos.length > 0 && (
        <>
          <p>
            <strong>Tu hogar, listo para entrar a vivir.</strong> Casi todos los clientes que compran estos muebles
            añaden también la ropa de cama, la iluminación y los textiles a juego: sin ellos la casa no está completa.
          </p>
          <button
            type="button"
            className="boton-primario"
            onClick={() => complementos.forEach((p) => anadir(p.sku))}
          >
            Añadir los {complementos.length} complementos recomendados ({formatearPrecio(totalComplementos)})
          </button>
          <ul className="lista-complementos">
            {candidatos.map((p) => (
              <li key={p.sku}>
                <span>
                  {p.nombre} · {formatearPrecio(p.precio)}
                </span>
                <BotonAnadir producto={p} anadir={anadir} />
              </li>
            ))}
          </ul>
        </>
      )}
      {mejoras.length > 0 && (
        <>
          <p>
            <strong>Mejora tu compra:</strong> versiones superiores compatibles (misma medida y tipo), con mejores
            materiales y más durabilidad. Con 3 años de garantía (10 en colchones) es la compra que más compensa.
          </p>
          <ul className="lista-complementos">
            {mejoras.map(({ producto, cantidad, mejora }) => (
              <li key={producto.sku}>
                <span>
                  {producto.nombre} → <strong>{mejora.nombre}</strong> ({mejora.material}, {mejora.color}) por{' '}
                  {formatearPrecio(mejora.precio)} (+{formatearPrecio(mejora.precio - producto.precio)})
                </span>
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => {
                    cambiar(producto.sku, 0)
                    for (let i = 0; i < cantidad; i++) anadir(mejora.sku)
                  }}
                >
                  Cambiar a {mejora.nombre}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
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
      <p className="aviso-ventajas">
        Compra como invitado · Envío gratis desde 500 € · Montaje gratis desde 1.500 € · Pago simulado en un clic
      </p>
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

      {lineas.length > 0 && (
        <MejorasYComplementos
          lineas={lineas}
          productos={productos}
          carrito={carrito}
          recomendaciones={recomendaciones}
          anadir={anadir}
          cambiar={cambiarCantidad}
        />
      )}
    </main>
  )
}

function Checkout({ productos, carrito, total, vaciar, recomendaciones, anadir, cambiarCantidad }) {
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
      <MejorasYComplementos
        lineas={lineas}
        productos={productos}
        carrito={carrito}
        recomendaciones={recomendaciones}
        anadir={anadir}
        cambiar={cambiarCantidad}
      />
      <p className="total-carrito">Total a pagar (IVA incluido): {formatearPrecio(total)}</p>
      <AvisosPromocion total={total} />
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
          element={
            <Checkout
              productos={productos}
              carrito={carrito}
              total={total}
              vaciar={vaciar}
              recomendaciones={recomendaciones}
              anadir={anadir}
              cambiarCantidad={cambiarCantidad}
            />
          }
        />
        <Route path="/pedido/:id" element={<Confirmacion />} />
        <Route path="/condiciones" element={<Condiciones />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </>
  )
}
