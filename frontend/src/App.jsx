import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'

function Portada() {
  const [productos, setProductos] = useState(null)

  useEffect(() => {
    fetch('/catalogo.json')
      .then((r) => r.json())
      .then((d) => setProductos(Array.isArray(d) ? d : d.productos || []))
      .catch(() => setProductos([]))
  }, [])

  return (
    <main className="contenido">
      <h2>Catálogo</h2>
      {productos === null && <p>Cargando productos…</p>}
      {productos && productos.length === 0 && <p>Estamos preparando el catálogo. Vuelve en unos minutos.</p>}
      <ul className="rejilla">
        {(productos || []).map((p) => (
          <li key={p.sku} className="tarjeta">
            <h3>{p.nombre || p.name}</h3>
            <p className="precio">{Number(p.precio ?? p.price).toFixed(2)} €</p>
          </li>
        ))}
      </ul>
    </main>
  )
}

function NoEncontrada() {
  return (
    <main className="contenido">
      <h2>Página no encontrada</h2>
      <p><Link to="/">Volver a la tienda</Link></p>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Portada />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}
