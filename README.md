# Lab P4 — BluePrints en Tiempo Real (Sockets & STOMP)

> **Repositorio:** `DECSIS-ECI/Lab_P4_BluePrints_RealTime-Sokets`  
> **Front:** React + Vite (Canvas, CRUD, y selector de tecnología RT)  
> **Backends guía (elige uno o compáralos):**
> - **Socket.IO (Node.js):** https://github.com/DECSIS-ECI/example-backend-socketio-node-/blob/main/README.md
> - **STOMP (Spring Boot):** https://github.com/DECSIS-ECI/example-backend-stopm/tree/main

## 🎯 Objetivo del laboratorio
Implementar **colaboración en tiempo real** para el caso de BluePrints. El Front consume la API CRUD de la Parte 3 (o equivalente) y habilita tiempo real usando **Socket.IO** o **STOMP**, para que múltiples clientes dibujen el mismo plano de forma simultánea.

Al finalizar, el equipo debe:
1. Integrar el Front con su **API CRUD** (listar/crear/actualizar/eliminar planos, y total de puntos por autor).
2. Conectar el Front a un backend de **tiempo real** (Socket.IO **o** STOMP) siguiendo los repos guía.
3. Demostrar **colaboración en vivo** (dos pestañas navegando el mismo plano).

---

## 🧩 Alcance y criterios funcionales
- **CRUD** (REST):
  - `GET /api/blueprints?author=:author` → lista por autor (incluye total de puntos).
  - `GET /api/blueprints/:author/:name` → puntos del plano.
  - `POST /api/blueprints` → crear.
  - `PUT /api/blueprints/:author/:name` → actualizar.
  - `DELETE /api/blueprints/:author/:name` → eliminar.
- **Tiempo real (RT)** (elige uno):
  - **Socket.IO** (rooms): `join-room`, `draw-event` → broadcast `blueprint-update`.
  - **STOMP** (topics): `@MessageMapping("/draw")` → `convertAndSend(/topic/blueprints.{author}.{name})`.
- **UI**:
  - Canvas con **dibujo por clic** (incremental).
  - Panel del autor: **tabla** de planos y **total de puntos** (`reduce`).
  - Barra de acciones: **Create / Save/Update / Delete** y **selector de tecnología** (None / Socket.IO / STOMP).
- **DX/Calidad**: código limpio, manejo de errores, README de equipo.

---

## 🏗️ Arquitectura (visión rápida)

```
React (Vite)
 ├─ HTTP (REST CRUD + estado inicial) ───────────────> Tu API (P3 / propia)
 └─ Tiempo Real (elige uno):
     ├─ Socket.IO: join-room / draw-event ──────────> Socket.IO Server (Node)
     └─ STOMP: /app/draw -> /topic/blueprints.* ────> Spring WebSocket/STOMP
```

**Convenciones recomendadas**  
- **Plano como canal/sala**: `blueprints.{author}.{name}`  
- **Payload de punto**: `{ x, y }`

---

## 📦 Repos guía (clona/consulta)
- **Socket.IO (Node.js)**: https://github.com/DECSIS-ECI/example-backend-socketio-node-/blob/main/README.md  
  - *Uso típico en el cliente:* `io(VITE_IO_BASE, { transports: ['websocket'] })`, `join-room`, `draw-event`, `blueprint-update`.
- **STOMP (Spring Boot)**: https://github.com/DECSIS-ECI/example-backend-stopm/tree/main  
  - *Uso típico en el cliente:* `@stomp/stompjs` → `client.publish('/app/draw', body)`; suscripción a `/topic/blueprints.{author}.{name}`.

---

## ⚙️ Variables de entorno (Front)
Crea `.env.local` en la raíz del proyecto **Front**:
```bash
# REST (tu backend CRUD)
VITE_API_BASE=http://localhost:8080

# Tiempo real: apunta a uno u otro según el backend que uses
VITE_IO_BASE=http://localhost:3001     # si usas Socket.IO (Node)
VITE_STOMP_BASE=http://localhost:8080  # si usas STOMP (Spring)
```
En la UI, selecciona la tecnología en el **selector RT**.

---

## 🚀 Puesta en marcha

### 1) Backend RT (elige uno)

**Opción A — Socket.IO (Node.js)**  
Sigue el README del repo guía:  
https://github.com/DECSIS-ECI/example-backend-socketio-node-/blob/main/README.md
```bash
npm i
npm run dev
# expone: http://localhost:3001
# prueba rápida del estado inicial:
curl http://localhost:3001/api/blueprints/juan/plano-1
```

**Opción B — STOMP (Spring Boot)**  
Sigue el repo guía:  
https://github.com/DECSIS-ECI/example-backend-stopm/tree/main
```bash
./mvnw spring-boot:run
# expone: http://localhost:8080
# endpoint WS (ej.): /ws-blueprints
```

### 2) Front (este repo)
```bash
npm i
npm run dev
# http://localhost:5173
```
En la interfaz: selecciona **Socket.IO** o **STOMP**, define `author` y `name`, abre **dos pestañas** y dibuja en el canvas (clics).

---

## 🔌 Protocolos de Tiempo Real (detalle mínimo)

### A) Socket.IO
- **Unirse a sala**
  ```js
  socket.emit('join-room', `blueprints.${author}.${name}`)
  ```
- **Enviar punto**
  ```js
  socket.emit('draw-event', { room, author, name, point: { x, y } })
  ```
- **Recibir actualización**
  ```js
  socket.on('blueprint-update', (upd) => { /* append points y repintar */ })
  ```

### B) STOMP
- **Publicar punto**
  ```js
  client.publish({ destination: '/app/draw', body: JSON.stringify({ author, name, point }) })
  ```
- **Suscribirse a tópico**
  ```js
  client.subscribe(`/topic/blueprints.${author}.${name}`, (msg) => { /* append points y repintar */ })
  ```

---

## 🧪 Casos de prueba mínimos
- **Estado inicial**: al seleccionar plano, el canvas carga puntos (`GET /api/blueprints/:author/:name`).  
- **Dibujo local**: clic en canvas agrega puntos y redibuja.  
- **RT multi-pestaña**: con 2 pestañas, los puntos se **replican** casi en tiempo real.  
- **CRUD**: Create/Save/Delete funcionan y refrescan la lista y el **Total** del autor.

---

## 📊 Entregables del equipo
1. Código del Front integrado con **CRUD** y **RT** (Socket.IO o STOMP).  
2. **Video corto** (≤ 90s) mostrando colaboración en vivo y operaciones CRUD.  
3. **README del equipo**: setup, endpoints usados, decisiones (rooms/tópicos), y (opcional) breve comparativa Socket.IO vs STOMP.

---

## 🧮 Rúbrica sugerida
- **Funcionalidad (40%)**: RT estable (join/broadcast), aislamiento por plano, CRUD operativo.  
- **Calidad técnica (30%)**: estructura limpia, manejo de errores, documentación clara.  
- **Observabilidad/DX (15%)**: logs útiles (conexión, eventos), health checks básicos.  
- **Análisis (15%)**: hallazgos (latencia/reconexión) y, si aplica, pros/cons Socket.IO vs STOMP.

---

## 🩺 Troubleshooting
- **Pantalla en blanco (Front)**: revisa consola; confirma `@vitejs/plugin-react` instalado y que `AppP4.jsx` esté en `src/`.  
- **No hay broadcast**: ambas pestañas deben hacer `join-room` al **mismo** plano (Socket.IO) o suscribirse al **mismo tópico** (STOMP).  
- **CORS**: en dev permite `http://localhost:5173`; en prod, **restringe orígenes**.  
- **Socket.IO no conecta**: fuerza transporte WebSocket `{ transports: ['websocket'] }`.  
- **STOMP no recibe**: verifica `brokerURL`/`webSocketFactory` y los prefijos `/app` y `/topic` en Spring.

---

## 🔐 Seguridad (mínimos)
- Validación de payloads (p. ej., zod/joi).  
- Restricción de orígenes en prod.  
- Opcional: **JWT** + autorización por plano/sala.

---

## 📄 Licencia
MIT (o la definida por el curso/equipo).

---

## 🚀 Solución implementada (Frontend RT)

Esta sección documenta la implementación realizada, los cambios hechos y su justificación.

### Repositorios del proyecto
- Frontend (este repo): `Lab05-BluePrints_en_Tiempo_Real`
- Backend STOMP: `Lab05-BluePrints_en_Tiempo_Real-Back`

> Para el tiempo real se usó **STOMP sobre WebSocket** con un backend Spring Boot.
> El código incluye también un cliente Socket.IO como alternativa, pero la solución
> demostrada y probada usa STOMP.

### ¿Por qué STOMP sobre WebSocket y no REST?

- **REST (request/response):** el cliente pregunta y el servidor responde. No sirve para notificar cambios que originan *otros* clientes (habría que hacer *polling* constante, ineficiente).
- **WebSocket:** canal **bidireccional y persistente**; el servidor puede enviar datos al cliente en cualquier momento.
- **STOMP:** protocolo de mensajería sobre WebSocket que añade **tópicos** (`/topic/...`) y **destinos de aplicación** (`/app/...`), encajando con el patrón **publicador/suscriptor** que Spring soporta nativamente.

La separación entre el destino donde el cliente publica (`/app/draw`) y el tópico al que los clientes se suscriben (`/topic/blueprints...`) aplica el principio de **bajo acoplamiento**: quien dibuja no sabe quién más está escuchando.

### Concepto de "sala" por plano
Cada plano es un canal identificado por `blueprints.{author}.{name}`. Las pestañas que comparten el **mismo autor y plano** están en el mismo canal y se sincronizan en tiempo real.

### Cómo correr el proyecto

**1. Backend (en su repo):**
```bash
mvn spring-boot:run
# http://localhost:8080 — WebSocket: /ws-blueprints
```

**2. Frontend (este repo):**
```bash
npm install      # solo la primera vez
npm run dev
# http://localhost:5173
```

**3. Probar:** abre 2 pestañas con el mismo autor/plano (ej: `juan` / `plano-1`) y dibuja en una; los puntos aparecen en la otra en tiempo real.

### Funcionalidades implementadas y justificación

| Funcionalidad | Justificación |
|---------------|---------------|
| **Acumulación de puntos** | El código base borraba el canvas en cada evento; ahora mantiene el dibujo completo |
| **Círculos + líneas visibles** | Hacer los puntos perceptibles (antes eran líneas casi invisibles) |
| **Modo clic / arrastre (selector)** | Clic = dibujo incremental (lo que pide el lab); arrastre = trazo continuo |
| **Espaciado de puntos en arrastre (cada 10px)** | Evita saturar el canal de tiempo real con cientos de mensajes/segundo: decisión de **eficiencia y control de carga** |
| **Selector de color** | Cada punto viaja con su color `{x, y, color}`; requirió ampliar el DTO `Point` del backend para mantener coherencia cliente-servidor |
| **Limpiar todo (global)** | Publica un evento en `/app/clear` que el backend reenvía a todos los suscriptores; demuestra que el canal soporta **varios tipos de evento**, no solo dibujar |
| **Suscripciones al cambiar de plano** | Al cambiar autor/plano, se desuscribe del canal anterior y se suscribe al nuevo, evitando fugas de suscripción |

### Cambios realizados en el backend
Sobre el backend STOMP guía se hicieron tres ajustes (ver su repositorio):
- **`@CrossOrigin(origins = "http://localhost:5173")`** → resolvió el bloqueo **CORS** del navegador al llamar al backend desde el frontend (orígenes distintos: puerto 5173 vs 8080).
- **Nuevo `@MessageMapping("/clear")`** → maneja el evento de limpiar y lo reenvía al tópico `...clear`.
- **Campo `color` agregado al DTO `Point`** → para que el color viaje del cliente al servidor y de vuelta a todos.

### Estructura del proyecto

src/


├── App.jsx              # Canvas, lógica de tiempo real y UI

├── main.jsx             # Punto de entrada de React

└── lib/

├── stompClient.js  # Cliente STOMP (conexión y suscripción)

└── socketIoClient.js  # Cliente Socket.IO (alternativa, no usada en la demo)




La lógica de conexión se separó en `lib/` para no mezclarla con la UI, aplicando **separación de responsabilidades**.

### Nota sobre persistencia
El backend de tiempo real usado **no almacena** los planos
(solo reenvía eventos en vivo). Por eso, al cambiar de plano el lienzo inicia vacío. La persistencia (PostgreSQL) corresponde al laboratorio anterior (CRUD REST); este laboratorio se centra en la **comunicación en tiempo real**.

---
##  CRUD de planos (REST)

Además del tiempo real, se implementó el **CRUD completo vía API REST** que pide el lab: tabla
de planos del autor, **total de puntos** (calculado con `reduce`), y botones **Create /
Save/Update / Delete**.

**Implementación:** el CRUD consume una **API REST real** expuesta por el backend (no se simula
en el frontend). El backend mantiene los planos en un almacén en memoria (`BlueprintStore`,
un `ConcurrentHashMap`) y los expone con los cinco endpoints estándar:

| Operación | Método y ruta |
|-----------|---------------|
| Listar planos del autor | `GET /api/blueprints?author=:author` |
| Obtener un plano | `GET /api/blueprints/:author/:name` |
| Crear | `POST /api/blueprints` |
| Actualizar puntos | `PUT /api/blueprints/:author/:name` |
| Eliminar | `DELETE /api/blueprints/:author/:name` |

El frontend invoca estos endpoints con `fetch` (ver funciones `loadPlans`, `loadCanvas`,
`createBlueprint`, `saveBlueprint`, `deleteBlueprint` en `App.jsx`).

**Decisión de arquitectura (ARSW):** el mismo backend Spring Boot maneja **dos estilos de
comunicación** sobre responsabilidades distintas:
- **REST** (request/response) para el **CRUD** de planos.
- **STOMP/WebSocket** (publish/subscribe) para la **colaboración en tiempo real**.

Esto evidencia que un servicio puede combinar estilos de comunicación según la necesidad de cada
caso de uso, manteniendo cada controlador con una responsabilidad clara (`BlueprintRestController`
para REST, `BlueprintController` para el tiempo real). Es una aplicación directa del principio de
**separación de responsabilidades** visto en ARSW.

**Sobre la persistencia:** el almacén es en memoria (no base de datos), porque el foco de este
laboratorio es la **comunicación** (REST + tiempo real), no la persistencia —que se resolvió en
el Lab04 con PostgreSQL. El contrato REST queda idéntico al de una implementación con base de
datos, por lo que el almacén en memoria podría sustituirse por uno persistente sin cambiar la API.

### Video de demostración

link: https://youtu.be/Y6-5XTsb7NI