# Contexto de sesión — TPI Prog 4

Esto resume todo lo que se hizo en la sesión remota para que puedas continuar en una sesión local de Claude Code sin perder hilo.

---

## Repositorios involucrados

| Repo | Ruta local usada en la sesión | Rama principal |
|------|-------------------------------|----------------|
| Backend (FastAPI) | `/tmp/backendProg4` | `main` |
| Frontend (React + TS) | `/tmp/tpi-prog4-front` | `main` |

Los cambios se bundlearon y se pushearon. En el repo `NicolasLlaneza/Neu-` (rama `claude/clever-curie-qjpTB`) están los bundles:
- `backend-readme-seed.bundle` — últimos 4 commits del backend
- (frontend bundle de sesión anterior)

Para aplicar:
```bash
# Backend
git fetch /ruta/backend-readme-seed.bundle main:main

# Frontend (bundle de la sesión anterior si hace falta)
# Los commits ya deberían estar pusheados al repo original
```

---

## Qué se cambió en el BACKEND

### 1. `requirements.txt`
Agregado:
```
pydantic[email]
email-validator
```
Necesario porque `UsuarioCreate` usa `EmailStr` de pydantic.

---

### 2. `app/db/seed.py`
Se agregó un **usuario cliente** para pruebas. Ahora el seed crea:

| Rol    | Email              | Contraseña   |
|--------|--------------------|--------------|
| ADMIN  | admin@admin.com    | admin1234    |
| CLIENT | cliente@test.com   | cliente1234  |

El seed es idempotente (no falla si ya existen los usuarios).

---

### 3. `app/modules/productos/schemas.py`
Agregado `costo_estimado: float = 0.0` a `ProductoPublic`:
```python
class ProductoPublic(SQLModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    precio_base: float
    stock_cantidad: int       # DERIVADO de ingredientes
    disponible: bool
    unidad_venta_id: Optional[int] = None
    costo_estimado: float = 0.0   # ← NUEVO: Σ(cantidad × precio_por_unidad)
    created_at: datetime
```

---

### 4. `app/modules/productos/repository.py`
Agregado `get_active_con_ingredientes()` con eager loading para evitar N+1:
```python
def get_active_con_ingredientes(self, offset=0, limit=20) -> list[Producto]:
    return list(self.session.exec(
        select(Producto)
        .where(Producto.deleted_at == None)
        .options(
            selectinload(Producto.producto_ingredientes).selectinload(
                ProductoIngrediente.ingrediente
            ),
        )
        .offset(offset).limit(limit)
    ).all())
```

---

### 5. `app/modules/productos/service.py`
Dos helpers a nivel módulo:

```python
def calcular_stock_derivado(producto: Producto) -> int:
    """Stock = min( floor(stock_ing / cantidad_requerida) ) por ingrediente.
    Si el producto no tiene ingredientes, usa producto.stock_cantidad directamente."""
    pis = list(producto.producto_ingredientes or [])
    if not pis:
        return producto.stock_cantidad
    posibles = []
    for pi in pis:
        if pi.ingrediente is None or pi.cantidad <= 0:
            continue
        posibles.append(int(pi.ingrediente.stock_cantidad // pi.cantidad))
    if not posibles:
        return producto.stock_cantidad
    return min(posibles)

def calcular_costo_estimado(producto: Producto) -> float:
    """Costo = Σ(cantidad × precio_por_unidad). Se recalcula en cada lectura."""
    total = 0.0
    for pi in (producto.producto_ingredientes or []):
        if pi.ingrediente is not None:
            total += pi.cantidad * pi.ingrediente.precio_por_unidad
    return round(total, 2)
```

`get_all()` usa `get_active_con_ingredientes()` y construye `ProductoPublic` con valores derivados.
`_build_detalle()` usa ambos helpers para stock y costo.

---

### 6. `app/modules/pedidos/service.py`
Corregido el doble descuento/restauración de stock:

- `_restaurar_stock_pedido()`: Si el producto tiene ingredientes → restaura stock de **ingredientes**. Si no tiene → restaura `producto.stock_cantidad`.
- `_descontar_stock_ingredientes()`: Descuenta solo del stock de **ingredientes**.
- `create()`: Para productos con ingredientes llama a `_descontar_stock_ingredientes()`; para productos sin ingredientes descuenta `producto.stock_cantidad`.

**La lógica es:**
> El stock del producto compuesto es SIEMPRE derivado de sus ingredientes (no se almacena). Al crear un pedido se tocan solo los ingredientes. Al cancelar se devuelven los ingredientes.

---

### 7. `README.md` (backend)
Reescrito con:
- Setup Docker y local
- Tabla de usuarios seed
- Explicación del stock derivado (ejemplo pizza/queso)
- Instrucciones del frontend

---

## Qué se cambió en el FRONTEND

### Stack
- React 18 + TypeScript + Vite
- TanStack React Query v5
- Zustand v5
- Tailwind CSS v4
- axios (agregado en esta sesión)

### Autenticación
**HttpOnly cookies** — no hay tokens en localStorage ni en el store.

`authStore.ts`:
```typescript
interface AuthState {
  user: Usuario | null;
  accessToken: null;    // siempre null — cookie maneja auth
  login: (user: Usuario) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (rol: RolNombre) => boolean;
  hasAnyRole: (roles: RolNombre[]) => boolean;
}
// isAuthenticated = !!user (no chequea accessToken)
```

---

### `src/api/client.ts`
Axios instance real con:
- `withCredentials: true` (envía cookies en cada request)
- `baseURL` desde `VITE_API_URL` (`.env`)
- Interceptor REQUEST: camelCase → snake_case automático
- Interceptor RESPONSE: snake_case → camelCase automático + 401 → logout
- `ApiError` / `HttpError` (alias para compat)

**IMPORTANTE:** Algunos API files mandan el body ya en snake_case para evitar que el interceptor convierta mal nombres compuestos (ej: `forma_pago_codigo`, `producto_id`). Esos archivos bypassean el interceptor a propósito.

---

### `src/api/auth.api.ts`
```typescript
authApi.login(data)    // POST /auth/login
authApi.logout()       // POST /auth/logout
authApi.registro(data) // POST /auth/registro + auto-login
authApi.me()           // GET /auth/me
```
`adaptUser()` mapea: `createdAt→creadoEn`, `updatedAt→actualizadoEn`, `deletedAt→eliminadoEn`

---

### `src/api/productos.api.ts`
`adaptProducto()` mapea: `costoEstimado→precioSugerido`, extrae `categoriaIds` e `ingredientes` del detalle.

Flujo de creación (3 pasos):
1. POST `/admin/productos/` → datos básicos
2. POST `/admin/productos/{id}/categorias` × N (en paralelo)
3. POST `/admin/productos/{id}/ingredientes` × N (en paralelo)
4. GET `/admin/productos/{id}` → devuelve con detalle completo

Flujo de edición: PATCH básicos → diff categorías → diff ingredientes → GET detalle.

**Trailing slash obligatoria** en endpoints de colección: `/admin/productos/`, `/categorias/`, `/unidades-medida/`, `/admin/insumos/` → sin ella FastAPI devuelve 307 que rompe CORS con cookies.

---

### `src/api/ingredientes.api.ts`
`adaptIngrediente()` mapea:
- `stockCantidad → stockDisponible`
- `precioPorUnidad → costoUnitario`

`toBackend()` construye snake_case manual (no pasa por el interceptor):
```typescript
{ stock_cantidad: data.stockDisponible, precio_por_unidad: data.costoUnitario, es_alergeno: data.esAlergeno }
```

---

### `src/api/pedidos.api.ts` — NUEVO
```typescript
pedidosApi.crear(data)             // POST /pedidos/
pedidosApi.listar(skip, limit)     // GET /pedidos/mis-pedidos
pedidosApi.obtener(id)             // GET /pedidos/{id}
pedidosApi.avanzarEstado(id, estado, motivo)  // POST /pedidos/{id}/estado
pedidosApi.cancelar(id)            // → avanzarEstado(id, "cancelado")
pedidosApi.listarFormasPago()      // GET /pedidos/formas-pago
pedidosApi.listarTodos(skip, limit) // GET /pedidos/admin/todos
```
Body enviado en snake_case manual para evitar double-conversion del interceptor.

---

### `src/stores/carritoStore.ts` — NUEVO
Zustand persisted en localStorage:
```typescript
useCarritoStore.getState().agregar(producto, cantidad?)
useCarritoStore.getState().quitar(productoId)
useCarritoStore.getState().actualizarCantidad(productoId, cantidad)
useCarritoStore.getState().limpiar()
useCarritoStore.getState().total()    // Σ(precioBase × cantidad)
useCarritoStore.getState().conteo()   // Σ(cantidades)
```

---

### `src/hooks/usePedidos.ts` — NUEVO
```typescript
useMisPedidosQuery()    // React Query → pedidosApi.listar()
usePedidoQuery(id)      // React Query → pedidosApi.obtener(id)
useTodosPedidosQuery()  // React Query → pedidosApi.listarTodos()
useFormasPagoQuery()    // React Query → pedidosApi.listarFormasPago()
usePedidoMutations()    // { crearPedido, avanzarEstado, cancelarPedido }
```

---

### Páginas nuevas
- `src/pages/CarritoPage.tsx` — Muestra items del carrito, selector de forma de pago, campo notas, botón confirmar pedido. Llama `usePedidoMutations().crearPedido` y limpia el carrito al confirmar.
- `src/pages/MisPedidosPage.tsx` — Lista pedidos del usuario. Si hay `:id` en la URL muestra detalle (items + historial de estados + botón cancelar si está en `pendiente`).

---

### Componentes modificados
- `Navbar.tsx` — Badge rojo con conteo del carrito, link "Mis pedidos", logout asíncrono (llama `authApi.logout()` antes de limpiar el store)
- `ProductoCard.tsx` — Botón "Agregar al carrito" para usuarios no-admin en productos disponibles con stock > 0
- `LoginPage.tsx` / `RegisterPage.tsx` — Importan `ApiError` desde `client` (no del mockServer); usan `login(res.user)` no `login(res)`; `isAuthenticated` chequea `!!s.user`
- `PrivateRoute.tsx` — `isAuthenticated` chequea `!!s.user` (sin `&&` con `accessToken`)

---

### `src/App.tsx`
Rutas agregadas:
```tsx
<Route path="/carrito" element={<PrivateRoute><CarritoPage /></PrivateRoute>} />
<Route path="/mis-pedidos" element={<PrivateRoute><MisPedidosPage /></PrivateRoute>} />
<Route path="/mis-pedidos/:id" element={<PrivateRoute><MisPedidosPage /></PrivateRoute>} />
```
`/` (catálogo) envuelto en `<PrivateRoute>` porque el backend exige auth en todos los endpoints.

---

### `.env` del frontend
```
VITE_API_URL=http://localhost:8000
```

---

## Tipos importantes (`src/types/index.ts`)

```typescript
// Pedidos
type EstadoPedido = "pendiente"|"confirmado"|"en_preparacion"|"en_camino"|"entregado"|"cancelado"
interface DetallePedido { productoId, cantidad, nombreSnapshot, precioSnapshot, subtotalSnap, personalizacion }
interface HistorialEstado { id, estadoDesde, estadoHacia, usuarioId, motivo, creadoEn }
interface Pedido { id, usuarioId, direccionId, estadoCodigo, formaPagoCodigo, subtotal, descuento, costoEnvio, total, notas, creadoEn }
interface PedidoDetalle extends Pedido { items: DetallePedido[], historial: HistorialEstado[] }
interface PedidoCreate { formaPagoCodigo, notas?, items: {productoId, cantidad, personalizacion?}[] }
interface FormaPago { codigo, descripcion, habilitado }
interface ItemCarrito { producto: Producto, cantidad: number }

// Auth
interface LoginResponse { user: Usuario, accessToken?: string, refreshToken?: string }
```

---

## Decisiones de diseño que NO deben cambiarse

1. **Auth = HttpOnly cookies.** No Bearer tokens. `withCredentials: true` en axios. El store solo guarda el objeto `Usuario`, no tokens.

2. **Stock derivado:** Nunca se almacena ni se edita el stock de un producto compuesto. Se calcula como `min(floor(ing.stock / pi.cantidad))`. Solo los ingredientes tienen stock editable.

3. **Costo estimado:** Se recalcula en cada lectura del backend. Si sube el precio de un ingrediente, el costo de todos los productos que lo usan sube automáticamente sin tocar ningún producto.

4. **Trailing slash:** Todos los endpoints de colección en el backend usan trailing slash (`/admin/productos/`, `/categorias/`, etc.). Sin ella, FastAPI devuelve 307 que rompe CORS con cookies.

5. **snake_case en bodies de pedidos e ingredientes:** Se manda manualmente en snake_case para evitar que el interceptor convierta doble o mal (ej: `forma_pago_codigo` no se puede reconvertir bien desde camelCase).

6. **Soft delete:** El backend tiene `deleted_at` pero no tiene endpoint `/reactivar`. Los registros eliminados no aparecen en las listas (filtro `where deleted_at == None`).

---

## Pendientes / posibles mejoras

- Página de gestión de pedidos para ADMIN/PEDIDOS (avanzar estados desde el panel)
- Validación de stock en el carrito antes de confirmar el pedido (el backend ya lo valida y devuelve error 400)
- Imágenes de productos (`imagenUrl` está en el tipo pero el backend no lo gestiona todavía)
- `AdminConfigPage` usa el mock local de configuración de precios — no tiene endpoint real en el backend
- Filtros en el catálogo (por categoría, precio, disponibilidad) — el frontend tiene los tipos pero los endpoints del backend no implementan todos los filtros aún
- WebSockets para seguimiento en tiempo real de pedidos (pendiente según el README original)
