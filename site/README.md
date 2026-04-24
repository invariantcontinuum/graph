# @invariantcontinuum/graph Showcase

This is the official showcase and demonstration site for the `@invariantcontinuum/graph` library — a high-performance WASM + WebGL2 graph rendering engine.

## 🚀 Features Demonstrated

- **Multi-Engine Rendering**: Harnessing WebGL2 for smooth 60fps rendering of large-scale graphs.
- **Worker-Offloaded Layout**: Force-directed and hierarchical layouts running in a dedicated Web Worker to keep the UI responsive.
- **Interactive Inspector**: Deep dive into node metadata and relationships.
- **Dynamic Mutations**: Live adding/removing of nodes with real-time layout updates.
- **Theme Engine**: Full support for Dark and Light modes with customizable palette and shapes (round rectangles, barrels, etc.).
- **Community Detection**: Visualizing node clusters with hull rendering.
- **Center & Fit**: Intelligent camera management for optimal viewport framing.

## 🛠️ Development

First, ensure you are in the `site/` directory:

```bash
cd site
npm install
npm run dev
```

The application will be available at [http://localhost:3000/graph](http://localhost:3000/graph).

> **Note**: The `basePath` is configured as `/graph` to match GitHub Pages deployment. When running locally, Next.js handles this routing automatically.

## 📦 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Engine**: [@invariantcontinuum/graph](https://www.npmjs.com/package/@invariantcontinuum/graph) (WASM + Rust)

## 🌐 Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions on every push to the `main` branch.

**Live Demo**: [https://invariantcontinuum.github.io/graph/](https://invariantcontinuum.github.io/graph/)

---

Built with ❤️ by [Invariant Continuum](https://github.com/invariantcontinuum)
