# Programming Course — UltraIa Learning

## Course Overview
A structured programming course covering fundamentals to advanced topics, organized from the verified learning sources in UltraIa. Focus on keyless-first, deterministic, and production-ready code.

## Module 1: Fundamentals (from `fundamentos-programacion.md`)
### 1.1 Pixel Engine Mathematics
- Linear algebra: vectors, matrices, homogeneous transformations `p'=Tp`
- Geometry: lines, circles `x=cx+r·cos(θ)`, ellipses, Bézier curves
- Intersection tests and geometric primitives

### 1.2 Trigonometry and Calculus
- Phase, frequency, oscillations
- Derivatives `v(t)=dp/dt`, acceleration `a(t)=d²p/dt²`
- Oscillation and wave motion

### 1.3 Rasterization
- Geometric → equation → pixel test → RGBA
- Framebuffer `w×h×c` (1920×1080×4 RGBA)
- `pixel(x,y)=f(x,y,t)` — image as mathematical function

### 1.4 Procedural Generation
- Perlin/Simplex noise, fractal noise, cellular noise
- Particle systems, procedural textures/geometry
- Humo, fuego, agua, nubes, partículas, deformaciones

### 1.5 Audio as Signal
- `audio(t)` → FFT → frequencies → events → animation
- Beat → scale/illumination/partículas connection

### 1.6 Video I/O and GPU
- FFmpeg programático: codecs, containers, frames, packets
- PTS/DTS, FPS, GOP, bitrate, pixel formats
- chroma subsampling
- C/C++: OpenCV, FFmpeg API, SDL, GLFW, OpenGL, Vulkan
- CUDA: threads/blocks/grids/warps, memory, streams, CUDA graphs
- OpenCL 3.1 portable

### 1.7 Metrics and Performance
- MAE, MSE, PSNR, SSIM, VMAF
- Structural error, motion error
- `E_total = w1·E_pixel + w2·E_structure + w3·E_flow + w4·E_temporal + w5·E_color`
- Performance: 1920×1080×60fps = 124M píxeles/s
- Parallelization: multithreading/SIMD/GPU
- Memory: cache locality, zero-copy, pinned memory
- Profiling by stage

### 1.8 Architecture and Projects
- **8-level learning**: fundamentals → mathematics → image → CV → graphics → video → GPU → reconstrucción
- **11 progressive projects**:
  1. Pixel Engine
  2. Procedural Image
  3. Shader Renderer
  4. Video Procedural
  5. Optical Flow Analyzer
  6. Motion Reconstruction
  7. Frame Comparator
  8. Replica Engine v0.1
  9. Optimización automática `θ_{n+1}=θ_n−η∇L`
  10. Replica Engine GPU
  11. **Differentiable Replica Engine** (∂L/∂θ vía autograd)

## Module 2: Free Programming Resources (from `libros-programacion-gratis.md`)
### 2.1 Curated Book List
- 115 free programming books (midudev/libros-programacion-gratis)
- Categories: language-specific, frameworks, methodologies
- Updated via curl download (20.225 bytes, UTF-8, 18/08/2026)

### 2.2 Repository Structure
- Source: https://github.com/midudev/libros-programacion-gratis
- Link: https://librosgratis.dev
- Total: 115 recursos in 32 seconds

### 2.3 Usage
- Download via: `curl -sL https://... | ...`
- Filter by language/framework
- Contribute to the repository

## Module 3: Graph Theory and Structures (from `graphify*.md`)
### 3.1 Graph Theory Fundamentals
- Nodes and edges
- Directed vs undirected
- Weighted graphs
- Adjacency matrix vs adjacency list

### 3.2 Graph Algorithms
- BFS and DFS traversal
- Shortest path (Dijkstra, A*)
- Minimum spanning tree (Kruskal, Prim)
- Topological sort

### 3.3 Applications
- Dependency resolution
- Network analysis
- Routing algorithms
- Social network analysis

## Module 4: Media Processing Programming (from `media-automation.md`)
### 4.1 Pipeline Programming
- Image/video pipeline as function composition
- `I_ref → Analyze → θ → Renderize(θ) → I_gen → Compare → Error → Optimize → θ'`
- Analysis by synthesis approach

### 4.2 Scripting and Automation
- FFmpeg programmatic API
- Python prototyping with OpenCV/CUDA
- Rust/C++ for production pipelines
- CUDA/OpenCL parallel processing

### 4.3 Integration with UltraIa
- How the learned concepts apply to UltraIa's generative tools
- Connecting pixel engines to video generation
- SDF and ray marching for procedural video

## Module 5: Advanced Topics
### 5.1 Differentiable Programming
- Autograd differentiation through pipelines
- Gradient-based optimization of parameters
- ∂L/∂θ via autograd

### 5.2 Multi-language Stack
- C/C++ for performance-critical code
- Python for prototyping and scripting
- Rust for systems programming
- CUDA for GPU computation
- WebAssembly for browser-based processing

### 5.3 Testing and Verification
- Pixel-accurate comparison
- Structural metric verification
- Motion error analysis
- Automated regression testing