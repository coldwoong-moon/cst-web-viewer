# cst-web-viewer

Three.js-based web 3D viewer for IFC/BIM models with Tekla Structures-style navigation controls.

## Features

- **High-Performance Rendering**: Handles 28M+ triangles using Three.js with geometry instancing
- **Tekla-Style Controls**: Professional BIM navigation paradigm
- **Binary Mesh Format**: Efficient v2/v3 binary format with optional geometry instancing
- **Gzip Compression**: Streaming gzip for large mesh files (40-50% size reduction)
- **Touch Support**: Full mobile support with 1-finger orbit, 2-finger pan/pinch
- **ViewCube**: Quick standard view access (Top, Front, Right, Iso, etc.)

## Navigation Controls

### Mouse
| Action | Control |
|--------|---------|
| Orbit | Middle mouse button drag |
| Pan | Shift + MMB drag / Right mouse button drag |
| Zoom | Scroll wheel |
| Zoom drag | Ctrl + MMB drag |
| Fit all | Double-click MMB |

### Keyboard
| Key | Action |
|-----|--------|
| H | Home view |
| F | Fit all |
| 1 | Front view |
| 2 | Back view |
| 3 | Left view |
| 4 | Right view |
| 5 | Top view |
| 6 | Bottom view |
| 7 | Isometric view |

### Touch (Mobile)
| Action | Gesture |
|--------|---------|
| Orbit | 1-finger drag |
| Pan | 2-finger drag |
| Zoom | 2-finger pinch |

## Quick Start

1. Generate mesh data using [cst-ifc-rs](https://github.com/coldwoong-moon/cst-ifc-rs):
   ```bash
   cargo run --example cst_viewer -- --web model.ifc
   ```
   This creates `mesh.bin` in the web_viewer directory.

2. Start the server:
   ```bash
   npm start
   # or
   node server.js
   ```

3. Open http://localhost:3000 in your browser.

## Binary Mesh Format

The viewer supports three binary mesh format versions:

### v2 (No Normals)
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

### v3 (Instancing)
```
[u8 version=3]
[u32 regular_mesh_count]
[u32 instanced_group_count]
... regular meshes (v2 format) ...
... instanced groups:
  [u32 name_len][name_bytes]
  [f32 r][f32 g][f32 b]
  [u32 vertex_count][u32 index_count][u32 instance_count]
  [positions][indices]
  [instance_count × 16 × f32 transform_matrices]
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Viewer page |
| `GET /api/mesh` | Binary mesh data (gzip compressed) |
| `GET /api/info` | Model metadata (mesh count, file size) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |

## License

MIT License
