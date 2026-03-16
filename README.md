# axionatic.github.io

Mark's website, full of interactive generative art sketches — things I've made for fun — live at **[mark.dingwall.com.au](https://mark.dingwall.com.au)**.

---

## Sketches

| Sketch | Description | Notable techniques |
|---|---|---|
| **Forest** | Click to plant seeds that grow into procedurally generated trees | Recursive branching, seed/branch/leaf lifecycle state machines, Catmull-Rom spline terrain, RGB colour palette interpolation, pixel-level ground collision |
| **Constellations** | Stars that link up when they drift close enough | Velocity/acceleration simulation, proximity-based dynamic linking, lerp-stepped link rendering with pulse and fade |
| **Waterfall** | Cascading drops of light | Particle physics with gravity, friction, click-triggered radial explosion force |
| **Bioluminescence** | Tiny swimming organisms | 3D Simplex noise flow fields driving particle motion |
| **Microbes** | Excited little dots | 2D Simplex noise |
| **Drift V1 & V2** | Visuals created for Drift Arts Festival | Noise-driven generative art |
| **Flowsphere** | A swirling, marble-like sphere | Noise-mapped colour and surface displacement |
| **Cubeworms** | Wanderers in the void | Procedural 3D-perspective motion |

---

## How the homepage works

The grid page is itself a small technical piece:

- **Hover effect** — on hover, every letter in a card's title and subtitle animates independently, driven by Simplex noise for x/y translation and rotation, ramping up in intensity the longer you hover.
- **Responsive layout** — CSS Grid with `container-type: inline-size` (CSS container queries) so text scales proportionally within each card at any viewport width.
- **Animated tab title** — a small marquee scrolls the page title through the browser tab.

---

## Stack

- **[p5.js](https://p5js.org)** for canvas rendering
- **Simplex noise** (2D/3D/4D) for organic, continuous randomness — using a fast JS implementation based on Stefan Gustavson's algorithm
- **Vanilla JS** and **CSS** — no build tools, no bundlers, no frameworks

---

## Running locally

No setup required. Clone the repo and open `index.html` directly in a browser.

```sh
git clone https://github.com/Axionatic/axionatic.github.io.git
cd axionatic.github.io
open index.html
```
