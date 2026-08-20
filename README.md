# ArchSim: Advanced Computer Architecture Simulator

ArchSim is a beautiful, interactive, and dynamic visualization tool for advanced computer architecture concepts, built with React and Tailwind CSS. It currently features two primary simulators:

1. **Pipeline Simulator**
   A 5-stage RISC pipeline visualization with data hazard detection, forwarding paths, and configurable latencies. Features include a dynamic Gantt chart and real-time statistics.

2. **Tomasulo Simulator**
   An interactive visualization of the Tomasulo Algorithm for dynamic scheduling. It features Reservation Stations, Register Renaming, and a Common Data Bus (CDB) broadcast system.

## Features

- **Modern Glassmorphism UI**: Built with React and Tailwind CSS, featuring custom responsive components.
- **Dark/Light Mode**: Full support for themed interfaces (Rosewood/Navy palette).
- **Fully Responsive**: Complex technical data tables automatically adapt with horizontal scrolling for mobile devices.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (or use the provided portable Node environment via `run_archsim.ps1` if on Windows)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ArchSim.git
   cd ArchSim
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   *(Alternatively, on Windows, you can simply run the `./run_archsim.ps1` script to use the portable environment.)*

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
