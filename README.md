# 🎮 Game Project

A multiplayer 2D platformer game built with TypeScript, featuring a modern monorepo architecture with real-time gameplay, physics simulation, and comprehensive testing.

## 📋 Project Overview

- **Server**: Node.js game engine with physics, collision detection, and multiplayer support
- **Client**: Browser-based rendering using Pixi.js with responsive controls
- **Shared**: Common types and utilities shared between server and client
- **Specs**: Comprehensive documentation and game design specifications

## 🏗️ Architecture

### Monorepo Structure
```
├── server/          # Game server (Node.js + TypeScript)
├── client/          # Web client (Pixi.js + TypeScript) 
├── shared/          # Shared types and utilities
├── spec/            # Documentation and specifications
└── sample.map       # Game map data
```

### Key Features
- **Feet-based coordinate system** for precise player positioning
- **Real-time multiplayer** with WebSocket communication
- **Physics engine** with gravity, collision detection, and movement rules
- **Tile-based maps** with multiple terrain types (ground, ladders, platforms)
- **Comprehensive testing** (37 server tests, 11 client tests)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended package manager)

### Installation & Setup
```bash
# Clone the repository
git clone <repository-url>
cd game

# Install dependencies for all packages
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development server
pnpm dev
```

### Running the Game
```bash
# Start the game server
cd server
pnpm start

# In another terminal, start the client
cd client
pnpm dev
```

## 🎯 Game Mechanics

### Coordinate System
- **Server**: Y=0 at bottom, Y increases upward (feet-based positioning)
- **Client**: Automatic coordinate conversion for Pixi.js rendering
- **Player**: 1x1 tile hitbox with feet position as reference point

### Movement & Physics
- **Gravity**: Realistic falling mechanics with fall damage
- **Ladder System**: Complex rules for ladder climbing and movement
- **Ground Detection**: Precise collision detection for different tile types
- **State Management**: Multi-state system (ground, ladder, air)

### Tile Types
- `#` - Solid ground/walls
- `H` - Ladder (climbable)
- `_` - Ladder top (platform + ladder)
- `U` - Ladder up (up-only movement)
- `X` - Ladder cross (bidirectional)
- `.` - Empty space

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Run all tests
pnpm test

# Server tests (game logic, physics, collision)
cd server && pnpm test

# Client tests (rendering, coordinate mapping)
cd client && pnpm test
```

## 📚 Documentation

Detailed specifications are available in the `/spec` directory:

- **SPEC.md** - Core game specifications and coordinate system
- **MOVEMENT.md** - Player movement and physics documentation  
- **ARCH.md** - Architecture overview and design decisions
- **PLAN.md** - Development roadmap and feature planning

## 🛠️ Development

### Tech Stack
- **Language**: TypeScript
- **Server**: Node.js, WebSocket
- **Client**: Pixi.js, Vite
- **Testing**: Vitest, jsdom
- **Build**: tsup, pnpm workspaces

### Code Structure
- **Monorepo**: pnpm workspaces for package management
- **Shared Types**: Common interfaces between server/client
- **Modular Design**: Clean separation of concerns
- **Comprehensive Testing**: Unit tests for all core functionality

## 🔧 Scripts

```bash
# Root level
pnpm install        # Install all dependencies
pnpm build         # Build all packages
pnpm test          # Run all tests
pnpm dev           # Start development mode

# Package level (server/client/shared)
pnpm start         # Start the package
pnpm dev           # Development mode with hot reload
pnpm build         # Build the package
pnpm test          # Run package tests
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎮 Game Controls

- **WASD** / **Arrow Keys**: Movement
- **Space**: Jump/Climb
- **Mouse**: Camera control (future feature)

---

Built with ❤️ using TypeScript and modern web technologies.
