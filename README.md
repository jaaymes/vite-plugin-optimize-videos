# vite-plugin-optimize-videos

A Vite plugin to optimize videos while maintaining the same input format (mp4, webm, mov, avi).

[🇧🇷 Português](#português-brasil) • [🇺🇸 English](#english)

---

## English

### Features

- 🎬 Maintains the output container equal to input (mp4, webm, mov, avi)
- ⚙️ Per-format quality adjustment
- 🚀 Automatic preset (optional)
- 📦 Uses embedded ffmpeg/ffprobe (no external installation required)
- 📁 Configurable source directory (defaults to `public`)
- 🎯 Supports path aliases and custom paths

### Installation

```bash
pnpm add -D vite-plugin-optimize-videos
```

or

```bash
npm install -D vite-plugin-optimize-videos
```

or

```bash
yarn add -D vite-plugin-optimize-videos
```

### Basic Usage

Add the plugin to your `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos()
  ]
})
```

The plugin will automatically:
- Scan the `public` directory (default) for video files
- Optimize all found videos during the build process
- Maintain the original format of each video

### Advanced Usage

#### Custom Source Directory

By default, the plugin scans the `public` directory. You can specify a custom directory:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'
import path from 'path'

export default defineConfig({
  plugins: [
    optimizeVideos({
      // Using a relative path (resolved from project root)
      videoDir: './src/assets/videos',
      
      // Or using path.resolve
      // videoDir: path.resolve(__dirname, 'src/assets/videos'),
      
      // Or using an absolute path
      // videoDir: '/absolute/path/to/videos',
      
      // Or using Vite alias (you can reference your project's alias)
      // videoDir: '@assets/videos'
    })
  ]
})
```

#### Per-Format Configuration (Recommended)

Configure quality and preset for each video format:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos({
      videoDir: 'public',
      exclude: ['.gif'], // Exclude animated GIFs that might have .mp4 extension
      '.mp4': {
        quality: 18,      // High quality
        preset: 'medium'   // Balanced encoding speed
      },
      '.webm': {
        quality: 20,       // Slightly lower quality for webm
        preset: 'fast'     // Faster encoding
      },
      '.mov': {
        quality: 18,
        preset: 'slow'     // Best compression, slower encoding
      },
      '.avi': {
        quality: 18,
        preset: 'medium'
      }
    })
  ]
})
```

#### Global Configuration

Set global quality and preset (used when format-specific config is not provided):

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos({
      videoDir: 'public',
      exclude: [],
      quality: 18,        // Global quality (default: 18)
      preset: 'medium'     // Global preset (default: 'medium')
    })
  ]
})
```

#### Minimal Configuration

Use default settings for everything:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos({
      exclude: [] // No exclusions
    })
  ]
})
```

### Options

#### `videoDir` (optional)
- **Type**: `string`
- **Default**: `"public"`
- **Description**: Directory to scan for video files. Can be:
  - A relative path (resolved from project root)
  - An absolute path
  - A path using Vite aliases from your project
  - A path resolved with `path.resolve()`

**Examples:**
```ts
videoDir: 'public'                           // Default
videoDir: './src/assets'                    // Relative path
videoDir: path.resolve(__dirname, 'videos') // Using path.resolve
videoDir: '/absolute/path/to/videos'        // Absolute path
```

#### `exclude` (optional)
- **Type**: `(".mp4" | ".webm" | ".mov" | ".avi" | string)[]`
- **Default**: `[]`
- **Description**: Patterns to exclude from optimization. Accepts:
  - Video extension types (`.mp4`, `.webm`, `.mov`, `.avi`)
  - Generic strings to exclude by filename

**Examples:**
```ts
exclude: ['.gif']              // Exclude files with .gif extension
exclude: ['demo', 'test']      // Exclude files containing 'demo' or 'test' in name
exclude: ['.mp4', 'backup']    // Exclude .mp4 files and files with 'backup' in name
```

#### `quality` (optional)
- **Type**: `number`
- **Default**: `18`
- **Description**: Global video quality (CRF value). Used when not specified per format.
  - Lower values = higher quality/larger files (18-23 recommended)
  - Higher values = lower quality/smaller files (24-28)

#### `preset` (optional)
- **Type**: `string`
- **Default**: `"medium"`
- **Description**: Global encoding speed preset. Used when not specified per format.
  - `"slow"` - Best compression, smaller files, slower encoding
  - `"medium"` - Good balance between speed and quality (recommended)
  - `"fast"` - Faster encoding, larger files

#### Format-Specific Options

Each format (`.mp4`, `.webm`, `.mov`, `.avi`) can have its own configuration:

##### `".mp4"` | `".webm"` | `".mov"` | `".avi"` (optional)
- **Type**: `VideoFormatOptions`
- **Description**: Format-specific optimization settings

**VideoFormatOptions:**
- `quality?: number` - Quality for this format (overrides global)
- `preset?: string` - Preset for this format (overrides global)

**Example:**
```ts
optimizeVideos({
  quality: 20,           // Global fallback
  '.mp4': {
    quality: 18,         // Override for MP4
    preset: 'slow'       // Override preset for MP4
  },
  '.webm': {
    quality: 22          // Uses global preset: 'medium'
  }
})
```

### Supported Formats

- **.mp4** (H.264 codec)
- **.webm** (VP9 codec)
- **.mov** (H.264 codec)
- **.avi** (H.264 codec)

### Notes

- For `.webm`, VP9 codec is used with CRF quality and `-b:v 0`
- Audio is removed from optimized videos
- Files are written atomically (temporary file with same extension, replaced after success)
- If you don't specify `quality` or `preset`, default values are used automatically (quality: 18, preset: "medium")
- The plugin only runs during the build process (`apply: "build"`)
- Videos are optimized in-place in the source directory

### How It Works

1. During the build process, the plugin scans the specified directory (default: `public`)
2. Finds all video files matching supported formats
3. Applies format-specific or global optimization settings
4. Optimizes each video using ffmpeg
5. Replaces the original file with the optimized version
6. Logs optimization results (file sizes and reduction percentage)

### Output Example

```
🎬 Encontrados 3 arquivo(s) de vídeo para otimizar
⚡ Otimizando: video1.mp4
✅ video1.mp4: 15.23 MB → 8.45 MB (44.5% menor)
⚡ Otimizando: video2.webm
✅ video2.webm: 22.10 MB → 12.30 MB (44.3% menor)
⚡ Otimizando: demo.mov
✅ demo.mov: 45.67 MB → 28.90 MB (36.7% menor)
🎉 Otimização de vídeos concluída!
```

### Requirements

- Node.js >= 16
- Vite >= 4

### Contributing

Contributions are welcome! This project is open for improvements and collaboration. Here are some ways you can contribute:

#### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

#### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🧪 Additional test coverage
- 🎨 Code quality improvements
- 🌍 Translations
- 📦 Performance optimizations

#### Ideas for Future Improvements

- [ ] Support for additional video formats (mkv, flv, etc.)
- [ ] Audio preservation option
- [ ] Video thumbnail generation
- [ ] Parallel video processing
- [ ] Progress reporting for large batches
- [ ] Cache mechanism to skip already optimized videos
- [ ] Custom ffmpeg parameters option
- [ ] Video resizing/resolution options
- [ ] Support for multiple output formats from single input
- [ ] Development mode with watch support
- [ ] Better error handling and recovery
- [ ] Support for video metadata preservation

### License

MIT

---

## Português (Brasil)

### Recursos

- 🎬 Mantém o contêiner de saída igual ao de entrada (mp4, webm, mov, avi)
- ⚙️ Ajuste de qualidade por formato de vídeo
- 🚀 Preset automático (opcional)
- 📦 Usa ffmpeg/ffprobe embutidos (sem instalação externa necessária)
- 📁 Diretório de origem configurável (padrão: `public`)
- 🎯 Suporte a aliases de caminho e caminhos customizados

### Instalação

```bash
pnpm add -D vite-plugin-optimize-videos
```

ou

```bash
npm install -D vite-plugin-optimize-videos
```

ou

```bash
yarn add -D vite-plugin-optimize-videos
```

### Uso Básico

Adicione o plugin no seu `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos()
  ]
})
```

O plugin irá automaticamente:
- Escanear o diretório `public` (padrão) em busca de arquivos de vídeo
- Otimizar todos os vídeos encontrados durante o processo de build
- Manter o formato original de cada vídeo

### Uso Avançado

#### Diretório de Origem Customizado

Por padrão, o plugin escaneia o diretório `public`. Você pode especificar um diretório customizado:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'
import path from 'path'

export default defineConfig({
  plugins: [
    optimizeVideos({
      // Usando um caminho relativo (resolvido a partir da raiz do projeto)
      videoDir: './src/assets/videos',
      
      // Ou usando path.resolve
      // videoDir: path.resolve(__dirname, 'src/assets/videos'),
      
      // Ou usando um caminho absoluto
      // videoDir: '/caminho/absoluto/para/videos',
      
      // Ou usando alias do Vite (você pode referenciar o alias do seu projeto)
      // videoDir: '@assets/videos'
    })
  ]
})
```

#### Configuração por Formato (Recomendado)

Configure qualidade e preset para cada formato de vídeo:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos({
      videoDir: 'public',
      exclude: ['.gif'], // Excluir GIFs animados que possam ter extensão .mp4
      '.mp4': {
        quality: 18,      // Alta qualidade
        preset: 'medium'   // Velocidade de codificação balanceada
      },
      '.webm': {
        quality: 20,       // Qualidade um pouco menor para webm
        preset: 'fast'     // Codificação mais rápida
      },
      '.mov': {
        quality: 18,
        preset: 'slow'     // Melhor compressão, codificação mais lenta
      },
      '.avi': {
        quality: 18,
        preset: 'medium'
      }
    })
  ]
})
```

#### Configuração Global

Defina qualidade e preset globais (usados quando a configuração específica do formato não é fornecida):

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos({
      videoDir: 'public',
      exclude: [],
      quality: 18,        // Qualidade global (padrão: 18)
      preset: 'medium'     // Preset global (padrão: 'medium')
    })
  ]
})
```

#### Configuração Mínima

Use configurações padrão para tudo:

```ts
import { defineConfig } from 'vite'
import { optimizeVideos } from 'vite-plugin-optimize-videos'

export default defineConfig({
  plugins: [
    optimizeVideos({
      exclude: [] // Sem exclusões
    })
  ]
})
```

### Opções

#### `videoDir` (opcional)
- **Tipo**: `string`
- **Padrão**: `"public"`
- **Descrição**: Diretório para escanear arquivos de vídeo. Pode ser:
  - Um caminho relativo (resolvido a partir da raiz do projeto)
  - Um caminho absoluto
  - Um caminho usando aliases do Vite do seu projeto
  - Um caminho resolvido com `path.resolve()`

**Exemplos:**
```ts
videoDir: 'public'                           // Padrão
videoDir: './src/assets'                     // Caminho relativo
videoDir: path.resolve(__dirname, 'videos')  // Usando path.resolve
videoDir: '/caminho/absoluto/para/videos'    // Caminho absoluto
```

#### `exclude` (opcional)
- **Tipo**: `(".mp4" | ".webm" | ".mov" | ".avi" | string)[]`
- **Padrão**: `[]`
- **Descrição**: Padrões para excluir da otimização. Aceita:
  - Tipos de extensão de vídeo (`.mp4`, `.webm`, `.mov`, `.avi`)
  - Strings genéricas para excluir por nome de arquivo

**Exemplos:**
```ts
exclude: ['.gif']              // Excluir arquivos com extensão .gif
exclude: ['demo', 'test']      // Excluir arquivos contendo 'demo' ou 'test' no nome
exclude: ['.mp4', 'backup']    // Excluir arquivos .mp4 e arquivos com 'backup' no nome
```

#### `quality` (opcional)
- **Tipo**: `number`
- **Padrão**: `18`
- **Descrição**: Qualidade global do vídeo (valor CRF). Usado quando não especificado por formato.
  - Valores menores = maior qualidade/arquivos maiores (18-23 recomendado)
  - Valores maiores = menor qualidade/arquivos menores (24-28)

#### `preset` (opcional)
- **Tipo**: `string`
- **Padrão**: `"medium"`
- **Descrição**: Preset global de velocidade de codificação. Usado quando não especificado por formato.
  - `"slow"` - Melhor compressão, arquivos menores, codificação mais lenta
  - `"medium"` - Bom equilíbrio entre velocidade e qualidade (recomendado)
  - `"fast"` - Codificação mais rápida, arquivos maiores

#### Opções Específicas por Formato

Cada formato (`.mp4`, `.webm`, `.mov`, `.avi`) pode ter sua própria configuração:

##### `".mp4"` | `".webm"` | `".mov"` | `".avi"` (opcional)
- **Tipo**: `VideoFormatOptions`
- **Descrição**: Configurações de otimização específicas do formato

**VideoFormatOptions:**
- `quality?: number` - Qualidade para este formato (sobrescreve a global)
- `preset?: string` - Preset para este formato (sobrescreve a global)

**Exemplo:**
```ts
optimizeVideos({
  quality: 20,           // Fallback global
  '.mp4': {
    quality: 18,         // Sobrescrever para MP4
    preset: 'slow'       // Sobrescrever preset para MP4
  },
  '.webm': {
    quality: 22          // Usa preset global: 'medium'
  }
})
```

### Formatos Suportados

- **.mp4** (codec H.264)
- **.webm** (codec VP9)
- **.mov** (codec H.264)
- **.avi** (codec H.264)

### Observações

- Para `.webm`, é usado o codec VP9 com qualidade CRF e `-b:v 0`
- O áudio é removido dos vídeos otimizados
- Os arquivos são escritos de forma atômica (arquivo temporário com mesma extensão e substituição após sucesso)
- Se você não especificar `quality` ou `preset`, os valores padrão serão usados automaticamente (quality: 18, preset: "medium")
- O plugin só executa durante o processo de build (`apply: "build"`)
- Os vídeos são otimizados in-place no diretório de origem

### Como Funciona

1. Durante o processo de build, o plugin escaneia o diretório especificado (padrão: `public`)
2. Encontra todos os arquivos de vídeo que correspondem aos formatos suportados
3. Aplica configurações de otimização específicas do formato ou globais
4. Otimiza cada vídeo usando ffmpeg
5. Substitui o arquivo original pela versão otimizada
6. Registra os resultados da otimização (tamanhos de arquivo e percentual de redução)

### Exemplo de Saída

```
🎬 Encontrados 3 arquivo(s) de vídeo para otimizar
⚡ Otimizando: video1.mp4
✅ video1.mp4: 15.23 MB → 8.45 MB (44.5% menor)
⚡ Otimizando: video2.webm
✅ video2.webm: 22.10 MB → 12.30 MB (44.3% menor)
⚡ Otimizando: demo.mov
✅ demo.mov: 45.67 MB → 28.90 MB (36.7% menor)
🎉 Otimização de vídeos concluída!
```

### Requisitos

- Node.js >= 16
- Vite >= 4

### Contribuindo

Contribuições são bem-vindas! Este projeto está aberto para melhorias e colaboração. Aqui estão algumas formas de contribuir:

#### Como Começar

1. Faça um fork do repositório
2. Crie uma branch de feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça suas alterações
4. Faça commit das alterações (`git commit -m 'Adiciona nova funcionalidade'`)
5. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
6. Abra um Pull Request

#### Áreas para Contribuição

- 🐛 Correção de bugs
- ✨ Novas funcionalidades
- 📝 Melhorias na documentação
- 🧪 Cobertura adicional de testes
- 🎨 Melhorias na qualidade do código
- 🌍 Traduções
- 📦 Otimizações de performance

#### Ideias para Melhorias Futuras

- [ ] Suporte para formatos adicionais de vídeo (mkv, flv, etc.)
- [ ] Opção de preservação de áudio
- [ ] Geração de thumbnails de vídeo
- [ ] Processamento paralelo de vídeos
- [ ] Relatório de progresso para lotes grandes
- [ ] Mecanismo de cache para pular vídeos já otimizados
- [ ] Opção de parâmetros customizados do ffmpeg
- [ ] Opções de redimensionamento/resolução de vídeo
- [ ] Suporte para múltiplos formatos de saída a partir de uma única entrada
- [ ] Modo de desenvolvimento com suporte a watch
- [ ] Melhor tratamento de erros e recuperação
- [ ] Suporte para preservação de metadados de vídeo

### Licença

MIT
