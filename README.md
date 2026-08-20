# ArchSim: Advanced Computer Architecture Simulator

ArchSim is a beautiful, interactive, and dynamic visualization tool for advanced computer architecture concepts. Built with React and modern web technologies, it allows students, educators, and architecture enthusiasts to visualize how instructions flow through a CPU in real-time.

---

## 🚀 Features

- **Modern Glassmorphism UI**: A stunning, highly responsive interface built with Tailwind CSS.
- **Dark/Light Mode**: Full support for themed interfaces (Rosewood/Navy palette).
- **Interactive Execution**: Step through CPU cycles one by one or auto-play at adjustable speeds.
- **Dynamic Dashboards**: Watch data hazards, register renaming, and hardware units update in real-time.
- **Customizable Hardware**: Easily configure execution latencies, the number of reservation stations, and issue widths.

---

## 🛠️ Included Simulators

### 1. Pipeline Simulator
A 5-stage RISC pipeline visualization.
- **Features**: Data hazard detection, forwarding paths, configurable latencies.
- **Visuals**: Dynamic Gantt chart showing instruction stages (IF, ID, EX, MEM, WB) and real-time IPC statistics.

### 2. Tomasulo Simulator
An interactive visualization of the Tomasulo Algorithm for dynamic scheduling and out-of-order execution.
- **Features**: Register Renaming, Reservation Stations, Out-of-order execution, and a Common Data Bus (CDB) broadcast system.
- **Visuals**: Live updates of the Register Alias Table (RAT), instruction queue, and functional unit statuses.

---

## 💻 Getting Started

### Prerequisites
You need Node.js installed on your machine. However, if you are on Windows, a portable Node environment is included!

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/mahermqr/ArchSim.git
   cd ArchSim
   ```

2. **Start the Simulator**

   **Option A: The Standard Way (Requires Node.js)**
   ```bash
   npm install
   npm run dev
   ```

   **Option B: The Portable Way (Windows Only)**
   Right-click the `run_archsim.ps1` file in the project folder and select **Run with PowerShell**. This will automatically use the bundled Node environment and start the server.

3. **Open the App**
   Open your browser and navigate to: [http://localhost:5173](http://localhost:5173)

---

## 📖 How to Use

1. **Write Assembly Code:** Use the text editor area to write standard RISC-style assembly code (e.g., `ADD`, `LD`, `MUL`). A default program is provided to get you started.
2. **Configure the Hardware:** Use the configuration panel to tweak hardware settings like execution latencies (cycles per instruction), number of functional units, and issue width.
3. **Execute:** 
   - Click **Start Simulation** to lock in your configuration.
   - Click **Step** to advance the CPU by exactly one clock cycle and watch how data moves.
   - Click **Play** to auto-run the simulation at your desired speed.
4. **Analyze:** Watch the dashboards to monitor the pipeline Gantt chart, reservation station tags, and overall IPC metrics.

---

## 🏗️ Tech Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
