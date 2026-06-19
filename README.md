# BallerID ⚽🏆

**El quiz definitivo sobre analítica avanzada de fútbol y métricas FIFA.**  
*The ultimate quiz on advanced football analytics and FIFA metrics.*

---

## 🎯 ¿Qué es BallerID?

BallerID es una aplicación web de quiz interactivo basada en **datos reales de rendimiento del FIFA World Cup 2026**. Los jugadores responden preguntas generadas dinámicamente a partir de métricas avanzadas de los partidos: velocidad máxima, distancia recorrida, sprints de alta intensidad, posesión, centros, xG, goles y asistencias.

Al finalizar cada partida se asigna un **Rol de Especialidad** según el tipo de preguntas que el jugador ha respondido mejor:

| Rol | Categoría | Descripción |
|-----|-----------|-------------|
| 📊 Analista Big Data | `big_data` | Domina métricas avanzadas: xG, PPDA, OBV |
| 🎯 Gurú del Táctico | `tictac` | Experto en posesión, formaciones y pases |
| ⚡ Preparador Físico | `physique` | Conoce velocidades, distancias y sprints |
| 📋 El Pizarra / Míster | `coach` | Maneja tácticas, cambios y reglamento |
| 🔍 Especialista Scouter | `scouter` | Identifica talento y métricas de rendimiento |

---

## 🚀 Modos de Juego

- **🏆 Campeonato Mundial** *(modo por defecto)*: 25 preguntas con dificultad creciente divididas en 5 fases (Grupos → Octavos → Cuartos → Semifinal → Final). El tiempo límite se reduce en cada fase. Un comodín disponible (VAR o Prórroga).
- **⚡ Muerte Súbita**: hasta 100 preguntas. Si fallas una, ¡eliminado!
- **👥 Multijugador (Salas)**: genera una sala única con código y comparte el enlace. Rankings en tiempo real para hasta 20 jugadores.

---

## 🎮 Características

- ✅ Preguntas generadas dinámicamente desde datos reales de los 24 partidos del torneo
- ✅ Estadísticas de categoría por respuesta correcta + asignación de Rol de Especialidad
- ✅ Certificado descargable en PNG con nombre, resultado y rol asignado
- ✅ Compartir resultado en WhatsApp y Twitter/X
- ✅ Tabla de clasificación global persistente (localStorage)
- ✅ Bilingüe: 🇪🇸 Español / 🇬🇧 English
- ✅ Comodines: VAR (descarta 2 incorrectas) y Prórroga (+15 segundos)
- ✅ Pantalla de transición de fase con animaciones

---

## 🛠️ Stack Técnico

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Bundler**: Vite
- **Icons**: Lucide React
- **Data**: Métricas reales de tracking de jugadores (posición, velocidad, xG, etc.)

---

## 📦 Instalación y ejecución

```bash
# Instalar dependencias
npm install

# Arrancar en modo desarrollo
npm run dev

# Build de producción
npm run build
```

La app estará disponible en `http://localhost:5173`

---

## 📁 Estructura del Proyecto

```
src/
├── App.tsx              # Componente principal, lógica del quiz y vistas
├── questionGenerator.ts # Motor de generación dinámica de preguntas + preguntas estáticas
├── mockData.ts          # Datos de los 24 partidos del torneo (jugadores, colectivos, goles)
└── index.css            # Estilos globales y tokens de diseño
public/
├── logo.jpg                 # Logotipo BallerID
└── championship_card_bg.png # Fondo del certificado
```

---

## 🏅 Roles de Especialidad

Al terminar una partida, el sistema calcula cuántas preguntas correctas has respondido de cada categoría y te asigna el rol en el que destacas. Aparece en:
- La **tarjeta de certificado** al finalizar la partida
- El **PDF/PNG descargable**
- La **tabla de clasificación**

---

## 📄 Licencia

MIT © 2026 BallerID
