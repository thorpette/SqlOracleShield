import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set document title
document.title = "SQL Migrator - Herramienta de Migración SQL a MongoDB";

// Add meta description
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'Herramienta robusta de procesamiento SQL, con capacidades de ofuscación, que transforma complejas transiciones de bases de datos en una experiencia intuitiva, segura y amigable.';
document.head.appendChild(metaDescription);

createRoot(document.getElementById("root")!).render(<App />);
