# vite-plugin-optimize-videos

[![npm version](https://badge.fury.io/js/vite-plugin-optimize-videos.svg)](https://badge.fury.io/js/vite-plugin-optimize-videos)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Vite plugin to optimize videos during build, maintaining input formats (mp4, webm, mov, avi).

[🇧🇷 Português](#português-brasil) | [🇺🇸 English](#english)

---

## English

### Features

- 🎬 **Format Preservation**: Keeps original container (mp4, webm, mov, avi).
- 📦 **Zero Config**: Works out of the box with embedded ffmpeg.
- ⚙️ **Granular Control**: Configure quality/presets globally or per-format.
- 📁 **Auto-Discovery**: Automatically finds and optimizes videos in `dist`.

### Installation

```bash
pnpm add -D vite-plugin-optimize-videos
# or npm / yarn
```

### Usage

**Basic** (Defaults: quality 18, medium preset)

```ts
// vite.config.ts
import { optimizeVideos } from "vite-plugin-optimize-videos";

export default defineConfig({
  plugins: [optimizeVideos()],
});
```

**Advanced**

```ts
optimizeVideos({
  quality: 20, // Global default
  exclude: ["intro.mp4"], // Skip files
  ".mp4": {
    quality: 18, // Override for mp4
    preset: "slow", // Slower encoding, better compression
  },
  ".webm": { quality: 25 },
});
```

### Configuration

| Option    | Type       | Default    | Description                                                |
| --------- | ---------- | ---------- | ---------------------------------------------------------- |
| `quality` | `number`   | `18`       | CRF value. Lower = better quality/larger file. Rec: 18-23. |
| `preset`  | `string`   | `'medium'` | Encoding speed: `fast`, `medium`, `slow`.                  |
| `exclude` | `string[]` | `[]`       | Patterns/Extensions to skip (e.g. `['intro', 'test']`).    |
| `.<ext>`  | `object`   | -          | Format overrides (`.mp4`, `.webm`, `.mov`, `.avi`).        |

> **Note:** Auido is removed from optimized videos.

---

## Português (Brasil)

### Recursos

- 🎬 **Preservação de Formato**: Mantém o container original (mp4, webm, mov, avi).
- 📦 **Zero Configuração**: Funciona direto com ffmpeg embutido.
- ⚙️ **Controle Granular**: Ajuste qualidade/presets globalmente ou por formato.
- 📁 **Auto-Descoberta**: Encontra e otimiza vídeos na pasta `dist` automaticamente.

### Instalação

```bash
pnpm add -D vite-plugin-optimize-videos
# ou npm / yarn
```

### Como Usar

**Básico** (Padrões: qualidade 18, preset medium)

```ts
// vite.config.ts
import { optimizeVideos } from "vite-plugin-optimize-videos";

export default defineConfig({
  plugins: [optimizeVideos()],
});
```

**Avançado**

```ts
optimizeVideos({
  quality: 20, // Padrão global
  exclude: ["intro.mp4"], // Ignorar arquivos
  ".mp4": {
    quality: 18, // Sobrescrever para mp4
    preset: "slow", // Codificação mais lenta, melhor compressão
  },
  ".webm": { quality: 25 },
});
```

### Configuração

| Opção     | Tipo       | Padrão     | Descrição                                                      |
| --------- | ---------- | ---------- | -------------------------------------------------------------- |
| `quality` | `number`   | `18`       | Valor CRF. Menor = melhor qualidade/arquivo maior. Rec: 18-23. |
| `preset`  | `string`   | `'medium'` | Velocidade: `fast`, `medium`, `slow`.                          |
| `exclude` | `string[]` | `[]`       | Padrões/Extensões para pular (ex: `['intro', 'teste']`).       |
| `.<ext>`  | `object`   | -          | Ajustes por formato (`.mp4`, `.webm`, `.mov`, `.avi`).         |

> **Nota:** O áudio é removido dos vídeos otimizados.

---

### License

MIT
