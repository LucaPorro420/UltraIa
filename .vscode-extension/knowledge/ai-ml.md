# AI/ML Development Guide

## LLM Integration Patterns
```
User Input → Prompt Engineering → LLM API → Parse Response → Act
                                                      ↓
                                               Tool Use / RAG
                                                      ↓
                                               Memory Update
```

## Prompt Engineering
```
// System Prompt Structure
1. Identity: who the AI is
2. Capabilities: what it can do
3. Constraints: what it cannot do
4. Output Format: expected response format
5. Examples: few-shot learning

// Techniques
- Chain of Thought: "Let me think step by step"
- Few-Shot: provide examples
- ReAct: Reason + Act in loops
- Tree of Thought: explore multiple paths
- Self-Consistency: generate multiple, pick best

// Optimization
- Temperature: 0 = deterministic, 1 = creative
- Top P: nucleus sampling
- Max Tokens: limit response length
- Stop Sequences: end generation at marker
```

## RAG (Retrieval-Augmented Generation)
```
Document → Chunk → Embed → Store → Query → Retrieve → Context → LLM
```

### Implementation
```typescript
// Chunking Strategies
- Fixed size: 512 tokens with 50 overlap
- Semantic: split at sentence/paragraph boundaries
- Recursive: split by headers, then paragraphs, then sentences
- Document-aware: respect markdown/code structure

// Embedding Models
- OpenAI text-embedding-3-small: 1536 dimensions
- BGE-M3: multilingual, 1024 dimensions
- Nomic Embed: open source, 768 dimensions

// Vector Stores
- Qdrant: open source, fast, filters
- Pinecone: managed, scalable
- Weaviate: open source, GraphQL API
- Chroma: simple, embedded
- pgvector: PostgreSQL extension

// Retrieval
- Semantic search: cosine similarity
- Hybrid search: combine semantic + keyword
- Reranking: cross-encoder for precision
- Maximal Marginal Relevance: diversity
```

## Tool Use / Function Calling
```typescript
// OpenAI Format
tools: [{
  type: "function",
  function: {
    name: "get_weather",
    description: "Get current weather",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" }
      },
      required: ["location"]
    }
  }
}]

// ReAct Loop
1. Thought: reason about what to do
2. Action: call a tool
3. Observation: get tool result
4. Repeat until done
5. Final Answer: respond to user
```

## Agent Architecture
```
Agent = LLM + Memory + Tools + Planning

Memory:
- Working Memory: current conversation
- Episodic: past interactions
- Semantic: facts and knowledge
- Procedural: how to do things

Planning:
- Task Decomposition: break into steps
- Re-planning: adapt to new information
- Reflection: evaluate and improve

Tools:
- Code Execution: run code safely
- File Operations: read/write files
- Web Search: access information
- API Calls: interact with services
- Database: query and modify data
```

## Computer Vision
```python
# Image Classification
- ResNet, EfficientNet: image recognition
- YOLO: real-time object detection
- SAM: segment anything
- DINO: self-supervised features

# Processing
- OpenCV: image manipulation
- Pillow: basic image operations
- Albumentations: data augmentation
- torchvision: transforms, models

# Deployment
- ONNX: cross-platform inference
- TensorRT: GPU optimization
- OpenVINO: Intel optimization
- CoreML: Apple devices
```

## Audio Processing
```python
# Speech-to-Text
- Whisper: OpenAI's ASR model
- Deepgram: commercial ASR
- Vosk: offline ASR

# Text-to-Speech
- Edge TTS: Microsoft's free TTS
- ElevenLabs: high-quality voice cloning
- Bark: open source TTS
- Coqui TTS: open source

# Music
- MusicGen: Meta's music generation
- AudioCraft: audio generation
- MIDI: musical instrument digital interface

# Processing
- Librosa: audio analysis
- FFmpeg: audio/video manipulation
- Web Audio API: browser audio
```

## Model Deployment
```
Local:
- Ollama: local LLM serving
- llama.cpp: C++ inference
- vLLM: high-throughput serving
- Text Generation WebUI: Gradio interface

Cloud:
- OpenAI API: GPT models
- Anthropic API: Claude models
- Google API: Gemini models
- AWS Bedrock: multiple models
- Azure OpenAI: enterprise

Edge:
- ONNX Runtime: cross-platform
- TensorFlow Lite: mobile/embedded
- CoreML: Apple devices
- WebAssembly: browser inference
```

## Training & Fine-tuning
```python
# LoRA / QLoRA
- Low-Rank Adaptation: efficient fine-tuning
- Quantized LoRA: 4-bit training
- Tools: Hugging Face PEFT, Axolotl

# Datasets
- Hugging Face Datasets: dataset hub
-格式: JSONL, Parquet, Arrow
- Processing: tokenize, filter, shuffle

# Evaluation
- MMLU: general knowledge
- HumanEval: code generation
- GSM8K: math reasoning
- MT-Bench: instruction following
- Arena: human preference
```

## Multi-Agent Systems
```
Patterns:
- Supervisor: one agent directs others
- Blackboard: shared knowledge space
- Debate: agents argue different positions
- Consensus: agents vote on decisions

Frameworks:
- CrewAI: role-based agents
- AutoGen: multi-agent conversations
- LangGraph: stateful agent graphs
- Semantic Kernel: Microsoft's framework

Communication:
- Direct messaging: agent-to-agent
- Shared memory: blackboard pattern
- Event-driven: pub/sub messaging
- Hierarchical: supervisor → workers
```
