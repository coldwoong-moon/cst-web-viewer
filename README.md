# cst-web-viewer

High-performance Three.js-based web 3D viewer for IFC/BIM models with professional Tekla Structures-style navigation controls.

## Features

- **Production-Ready Performance**: Tested with 28.7M triangles, 276K+ meshes in browser
- **Tekla-Style Navigation**: Industry-standard BIM navigation paradigm (orbit/pan/zoom/fit)
- **Geometry Instancing**: Efficient handling of repeated components (windows, columns, etc.)
- **Gzip Streaming**: 40-50% transfer size reduction with streaming compression
- **Touch Support**: Full mobile support with intuitive gestures
- **ViewCube**: Quick access to standard views (Top, Front, Right, Isometric, etc.)
- **Binary Mesh Format**: Efficient v1/v2/v3 formats with backward compatibility

## Performance

**Tested with Production IFC Data:**
- **28.7M triangles** rendered smoothly in Chrome/Firefox
- **276,577 regular meshes** + 8 instanced groups
- **848.5 MB** raw binary mesh file
- **~400-500 MB** with gzip compression (level 6)
- **Format v3** with geometry instancing support
- **Smooth 60fps** navigation with ViewCube and keyboard shortcuts
- **300ms** animated view transitions (ease-in-out)

**File Transfer:**
- Streaming gzip compression reduces network transfer by 40-50%
- Browser decompression handled automatically
- Progress feedback during loading

## Navigation Controls

### Mouse
| Action | Control |
|--------|---------|
| Orbit | Middle mouse button (MMB) drag |
| Pan | Shift + MMB drag **or** Right mouse button drag |
| Zoom | Scroll wheel |
| Zoom drag | Ctrl + MMB drag |
| Fit all | Double-click MMB |

### Keyboard
| Key | Action |
|-----|--------|
| **H** | Home view (reset to initial position) |
| **F** | Fit all (frame entire model) |
| **1** | Front view (+Z axis) |
| **2** | Back view (-Z axis) |
| **3** | Left view (-X axis) |
| **4** | Right view (+X axis) |
| **5** | Top view (+Y axis) |
| **6** | Bottom view (-Y axis) |
| **7** | Isometric view (SW perspective) |

### Touch (Mobile/Tablet)
| Action | Gesture |
|--------|---------|
| Orbit | 1-finger drag |
| Pan | 2-finger drag |
| Zoom | 2-finger pinch |

All view changes use **smooth animated transitions** for professional feel.

## Quick Start

### 1. Generate Binary Mesh Data

Use **[cst-ifc-rs](https://github.com/coldwoong-moon/cst-ifc-rs)** to convert IFC files:

```bash
cargo run --example cst_viewer -- --web model.ifc
```

This creates `mesh.bin` in the `web_viewer/` directory.

### 2. Start the Viewer Server

```bash
cd cst-web-viewer
npm install  # First time only
npm start
```

The server will:
- Start on port 3000 (or next available port if busy)
- Enable CORS for cross-origin requests
- Serve gzip-compressed mesh data automatically

### 3. Open in Browser

Navigate to **http://localhost:3000**

The viewer will:
- Load and decompress the binary mesh
- Display loading progress
- Render the model with default lighting
- Enable navigation controls immediately

## Binary Mesh Format

The viewer supports three format versions with backward compatibility:

### v1 (Legacy with Normals)
```
[u8 version=1]
[u32 mesh_count]
For each mesh:
  [u32 name_len][name_bytes]
  [f32 r][f32 g][f32 b]
  [u32 vertex_count][u32 index_count]
  [vertex_count × 3 × f32 positions]
  [vertex_count × 3 × f32 normals]
  [index_count × u32 indices]
```

### v2 (No Normals, FlatShading)
**33% smaller than v1** - normals computed per-face in browser

```
[u8 version=2]
[u32 mesh_count]
For each mesh:
  [u32 name_len][name_bytes]
  [f32 r][f32 g][f32 b]
  [u32 vertex_count][u32 index_count]
  [vertex_count × 3 × f32 positions]
  [index_count × u32 indices]
```

### v3 (Geometry Instancing)
**Recommended for production** - efficient handling of repeated geometry

```
[u8 version=3]
[u32 regular_mesh_count]
[u32 instanced_group_count]

// Regular meshes (v2 format)
For each regular mesh: ...

// Instanced groups (shared geometry, multiple transforms)
For each group:
  [u32 name_len][name_bytes]
  [f32 r][f32 g][f32 b]
  [u32 vertex_count][u32 index_count][u32 instance_count]
  [vertex_count × 3 × f32 positions]
  [index_count × u32 indices]
  [instance_count × 16 × f32 transform_matrices (4×4 column-major)]
```

**Instancing Benefits:**
- Single geometry stored in GPU memory
- Multiple instances with different transforms
- Ideal for windows, doors, columns, fasteners
- Dramatic memory and transfer savings

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Viewer HTML page with Three.js renderer |
| `/api/mesh` | GET | Binary mesh data (gzip compressed stream) |
| `/api/info` | GET | Model metadata (mesh count, file size, format version) |

**Example `/api/info` response:**
```json
{
  "meshes": 276577,
  "instancedGroups": 8,
  "fileSize": 848512345,
  "version": 3
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (auto-increments if busy) |

## Companion Library

Generate binary mesh data using **[cst-ifc-rs](https://github.com/coldwoong-moon/cst-ifc-rs)**:
- IFC file parsing and geometry extraction
- B-Rep to triangle mesh conversion
- Binary mesh writer with v2/v3 format support
- Geometry instancing detection
- Triangle budget control for large models

## Used With

This viewer is designed to work seamlessly with:
- **[cst-ifc-rs](https://github.com/coldwoong-moon/cst-ifc-rs)** - Rust IFC parser and mesh generator
- **Three.js r160+** - WebGL rendering engine
- Modern browsers with WebGL 2.0 support

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Tested |
| Firefox | 88+ | ✅ Tested |
| Safari | 14+ | ✅ Compatible |
| Edge | 90+ | ✅ Compatible |

## Screenshots

![Viewer Interface](docs/viewer-interface.png)
*Main viewer with 28M triangle model, ViewCube, and navigation controls*

![ViewCube Navigation](docs/viewcube.png)
*Quick access to standard views via ViewCube widget*

![Mobile Touch Support](docs/mobile-touch.png)
*Full touch gesture support for mobile/tablet viewing*

## Project Structure

```
cst-web-viewer/
├── server.js          # Express server with gzip streaming
├── public/
│   ├── index.html     # Viewer HTML with Three.js
│   └── mesh.bin       # Binary mesh data (generated by cst-ifc-rs)
├── package.json       # Node.js dependencies
└── README.md          # This file
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Server logs show:
# - Port binding status
# - Mesh file size and version
# - Gzip compression stats
# - Client connection events
```

## Technical Details

**Rendering Pipeline:**
1. Server streams gzip-compressed binary mesh via `/api/mesh`
2. Browser decompresses automatically (Content-Encoding: gzip)
3. ArrayBuffer parsed by format version decoder
4. Three.js BufferGeometry created for each mesh/instance
5. MeshStandardMaterial applied with RGB colors from binary
6. Scene rendered with PerspectiveCamera + DirectionalLight

**Memory Management:**
- BufferGeometry shares vertex data when instancing
- Float32Array used for positions/normals
- Uint32Array used for indices
- Automatic garbage collection of old meshes

**Navigation Algorithm:**
- OrbitControls with modified event handlers
- Smooth damping for professional feel
- Bounding sphere calculation for fit-all
- Quaternion-based rotation for ViewCube

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
