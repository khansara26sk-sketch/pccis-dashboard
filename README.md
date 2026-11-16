# PCCIS — Packaged Commodity Compliance Inspection System
> Premium AI-Assisted Packaged Commodity Label Compliance Platform for Legal Metrology Officers

---

## 🚀 Overview

**PCCIS** is a modern, high-aesthetic enterprise web application built for Legal Metrology Inspectors and Senior Regulatory Officers. It automates packaged commodity compliance auditing by combining optical character recognition (OCR) with statutory rule verification (under the **Legal Metrology Act, 2009** and **Packaged Commodities Rules, 2011**).

---

## 🛠️ Technology Stack

- **React 19 + Vite 8** — Fast development and production build
- **JavaScript (ES Modules)**
- **React Router DOM v7** — Dynamic routing and navigation
- **Tailwind CSS v4** — High-performance utility styling with custom dark/light palettes
- **Lucide React** — Crisp enterprise iconography
- **Recharts** — Theme-aware statistical charts (Area/Line, Donut, Bar charts)
- **Axios** — Centralized HTTP client configured for FastAPI backend
- **Framer Motion** — Subtle micro-interactions, modal backdrops, and phased pipeline animations

---

## ✨ Features

1. **Enterprise Design System**:
   - Inspired by Linear, Stripe, and Vercel.
   - Refined typography (Plus Jakarta Sans & JetBrains Mono).
   - High-contrast Dark Mode (deep slate `#0b0f17`) and crisp Light Mode with `localStorage` persistence.
   - Zero jarring animations or neon decorations; tailored for government/regulatory auditing.

2. **Overview Dashboard**:
   - 4 Key Inspection KPI cards with trend indicators.
   - 14-day Inspection Activity Area/Line chart.
   - Compliance status distribution Donut chart.
   - Commodity category violation comparison Bar chart.
   - Interactive Recent Inspections Table with search, status filtering, and slide-out detail drawer.

3. **New Inspection Suite (AI-Powered Workflow)**:
   - **Step 1 (Upload)**: Drag-and-drop packaging label upload (JPG/PNG) plus realistic presets (Cookies, Hair Oil, Wireless Mouse, Mustard Oil).
   - **Step 2 (Phased Pipeline)**: 5-stage animated progress indicator (Image Upload → Preprocessing → OCR Extraction → Entity Mapping → Rule Validation).
   - **Step 3 (Specimen Inspector)**: Dual-panel layout featuring an interactive packaging image viewer with zoom/pan and live OCR bounding box overlays.
   - **Step 4 (Declarations & Legal Metrology Rules)**:
     - Extraction of all mandatory declarations: Product Name, Manufacturer/Packer, Address, Net Quantity, MRP, Packaging Date, Consumer Care, and Country of Origin.
     - Inline modal editor for physical officer corroboration.
     - Automated rule audit citations with explanation and evidence snippets.
   - **Step 5 (Inspector Determination)**: Official review sign-off modal with determination options (Compliant, Potential Issue, Manual Review, Re-inspection) and export/print capabilities.

4. **Inspection History**:
   - Filterable data grid with keyword search, status filter, inspector filter, and date picker.
   - Pagination and instant CSV export.
   - Full inspection audit drawer.

5. **Compliance Reports**:
   - Aggregate compliance metrics (Pass Rate, Common Infractions, Avg Inspection Speed).
   - Filter by date range and commodity category.
   - One-click print-ready PDF styling (`window.print`) and CSV export.

6. **Compliance Rules Directory**:
   - Reference table of statutory Legal Metrology rules (Rule 6(1)(a) through Rule 6(10)).
   - Clear administrative disclaimer: automated heuristics assist rather than replace authorized legal counsel.
   - Detailed rule inspect modals.

7. **Inspector & System Settings**:
   - Inspector profile and badge credential configuration.
   - **Live FastAPI Integration Hub**: Test connectivity to your Python backend (`http://127.0.0.1:8000`) with live ping status.
   - Optical sensitivity sliders and theme controls.

---

## 🔌 FastAPI Backend Integration

The application is pre-configured to connect to your Python FastAPI backend at `http://127.0.0.1:8000`.

### Environment Configuration
Edit `.env` (or set via the UI in **Settings**):
```env
VITE_API_URL=http://127.0.0.1:8000
```

### Expected REST Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/inspections/analyze` | Multipart form-data upload running OCR and rule verification |
| `GET` | `/api/inspections` | Returns paginated inspection records |
| `GET` | `/api/inspections/{id}` | Fetches individual inspection details |
| `POST` | `/api/inspections` | Saves inspector determination & notes |
| `GET` | `/api/dashboard/stats` | Returns aggregate metrics and chart data |
| `GET` | `/api/reports` | Returns historical reporting and violation ratios |
| `GET` | `/api/rules` | Returns Legal Metrology rule configurations |
| `GET` | `/health` or `/` | Health check endpoint for connection verification |

> **Graceful Fallback Mode**: If your FastAPI backend is currently offline or specific endpoints are still being built, the frontend automatically falls back to rich, simulated Legal Metrology data so all screens, workflows, filters, and charts remain 100% interactive and testable.

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```
