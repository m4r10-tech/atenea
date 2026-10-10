# Cervecería Atenea · Toledo

Web de la Cervecería Atenea, en el Polígono de Santa María de Benquerencia (45007 Toledo).
HTML, CSS y JavaScript nativos, sin frameworks ni build.

## Arrancar

```bash
npm install
npm run preview
```

Abre `http://localhost:4173`. Si ese puerto está ocupado, `serve` elige otro y lo muestra en la terminal.

Para verla en el móvil dentro de la misma red wifi, abre la dirección "Network" que imprime `serve`.

## Secciones

- Inicio con estado abierto/cerrado en directo.
- ¿Abierto o cerrado?: cuenta atrás con la hora de Toledo (`Europe/Madrid`).
- Horario semanal con el día de hoy resaltado.
- Carta: platos más citados en las reseñas.
- Galería con carrusel y visor de fotos.
- Reseñas de Google.
- Reservas: formulario con validación que termina en llamada al bar.
- Cómo llegar: mapa de Google y botón de ruta.

## Probar el horario

Añade `?t=AAAA-MM-DDTHH:MM` a la URL para simular una hora de Toledo:

- `?t=2026-10-13T12:00` → martes, cerrado.
- `?t=2026-10-12T23:59` → lunes, a punto de cerrar.
- `?t=2026-10-14T08:10` → miércoles, abre en breve.

## Datos

Sacados de la ficha de Google Maps (octubre de 2026):

- Teléfono: 925 23 27 50
- Horario: lunes y de miércoles a domingo, 8:15–24:00. Martes cerrado.
- Valoración: 4,0 con 226 reseñas.
- Plus Code: V364+QV Toledo.

**Pendiente de confirmar con el negocio:**

- Número exacto de la calle (Google solo muestra "45007 Toledo"; los directorios lo sitúan en C. Río Guadarrama).
- Carta y precios: no están publicados en internet. La sección de carta muestra los platos que destacan las reseñas y está marcada como orientativa.
- Fotos: son fotos reales del bar publicadas por clientes en su ficha de Google Maps, usadas con permiso del negocio. Si el dueño tiene fotos propias, se pueden sustituir con los mismos nombres de archivo en `assets/img/`.

## Fotos

`assets/img/`: fritura, croquetas, bravas, alitas, filete, ensalada y pan. Son fotos de clientes en la ficha de Google Maps de Cervecería Atenea, redimensionadas a 1400 px. La vista de la terraza es Google Street View incrustado.
