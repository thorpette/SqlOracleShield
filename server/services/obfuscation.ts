import { SensitiveFieldData } from "@shared/schema";
import crypto from "crypto";

// Constants for common sensitive data patterns
const SENSITIVE_PATTERNS = {
  PERSONAL_ID: /\b(\d{8}|\d{10}|\d{11})[-]?\w?\b/i,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i,
  CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/,
  PHONE: /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\b/,
  ADDRESS: /\b(calle|avenida|av|plaza|paseo)\b/i,
  NAME: /\b(nombre|apellido|nombre_completo|apellido_paterno|apellido_materno|primer_nombre)\b/i,
  PASSWORD: /\b(password|contraseña|clave|pwd|pass)\b/i,
  FINANCIAL: /\b(cuenta|saldo|monto|tarjeta|credito|debito|bancario)\b/i,
  MEDICAL: /\b(diagnostico|enfermedad|medicamento|tratamiento|paciente|clinico|medico)\b/i,
  LOCATION: /\b(ubicacion|coordenada|latitud|longitud|direccion|localizacion)\b/i,
};

// Analysis function
export function analyzeTableSensitivity(
  tableName: string,
  columnName: string,
  dataType: string,
  sampleData: Record<string, any>[]
): SensitiveFieldData {
  const reasons: string[] = [];
  let score = 0;
  let recommendation = "No se requiere ofuscación";

  // Analysis based on column name
  if (columnName.toLowerCase().includes("id") && !columnName.toLowerCase().includes("uuid")) {
    if (columnName.toLowerCase() === "id" && (tableName.toLowerCase().includes("usuario") || tableName.toLowerCase().includes("user"))) {
      score += 30;
      reasons.push("Identificador primario de usuario");
    } else if (
      columnName.toLowerCase().includes("dni") || 
      columnName.toLowerCase().includes("rut") || 
      columnName.toLowerCase().includes("cedula") ||
      columnName.toLowerCase().includes("passport") ||
      columnName.toLowerCase().includes("pasaporte") ||
      columnName.toLowerCase().includes("personal_id") ||
      columnName.toLowerCase().includes("id_personal") ||
      columnName.toLowerCase().includes("nacional")
    ) {
      score += 90;
      reasons.push("Identificador nacional o documento de identidad");
    }
  }

  // Common sensitive patterns
  if (SENSITIVE_PATTERNS.PERSONAL_ID.test(columnName.toLowerCase())) {
    score += 90;
    reasons.push("Posible identificador personal");
  }
  
  if (SENSITIVE_PATTERNS.EMAIL.test(columnName.toLowerCase()) || columnName.toLowerCase().includes("email") || columnName.toLowerCase().includes("correo")) {
    score += 80;
    reasons.push("Dirección de correo electrónico");
  }
  
  if (SENSITIVE_PATTERNS.CREDIT_CARD.test(columnName.toLowerCase()) || columnName.toLowerCase().includes("tarjeta") || columnName.toLowerCase().includes("card")) {
    score += 95;
    reasons.push("Datos de tarjeta de crédito/débito");
  }
  
  if (SENSITIVE_PATTERNS.PHONE.test(columnName.toLowerCase()) || columnName.toLowerCase().includes("telefono") || columnName.toLowerCase().includes("celular") || columnName.toLowerCase().includes("movil")) {
    score += 70;
    reasons.push("Número telefónico");
  }
  
  if (SENSITIVE_PATTERNS.ADDRESS.test(columnName.toLowerCase()) || columnName.toLowerCase().includes("direccion") || columnName.toLowerCase().includes("domicilio")) {
    score += 75;
    reasons.push("Dirección postal");
  }
  
  if (SENSITIVE_PATTERNS.NAME.test(columnName.toLowerCase()) || columnName.toLowerCase().includes("nombre") || columnName.toLowerCase().includes("apellido")) {
    score += 60;
    reasons.push("Nombre o apellido de persona");
  }
  
  if (SENSITIVE_PATTERNS.PASSWORD.test(columnName.toLowerCase())) {
    score += 100;
    reasons.push("Contraseña o credencial");
  }
  
  if (SENSITIVE_PATTERNS.FINANCIAL.test(columnName.toLowerCase())) {
    score += 85;
    reasons.push("Datos financieros");
  }
  
  if (SENSITIVE_PATTERNS.MEDICAL.test(columnName.toLowerCase())) {
    score += 95;
    reasons.push("Datos médicos o de salud");
  }
  
  if (SENSITIVE_PATTERNS.LOCATION.test(columnName.toLowerCase())) {
    score += 65;
    reasons.push("Datos de ubicación");
  }

  // Analyze data type
  if (dataType.toLowerCase().includes("varchar") || dataType.toLowerCase().includes("text") || dataType.toLowerCase().includes("string")) {
    // Analyze sample data if available
    if (sampleData && sampleData.length > 0) {
      // Take a sample of up to 5 rows
      const sampleSize = Math.min(5, sampleData.length);
      let emailCount = 0;
      let nameCount = 0;
      let addressCount = 0;
      let phoneCount = 0;
      let idCount = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const value = sampleData[i][columnName];
        
        if (value && typeof value === 'string') {
          if (SENSITIVE_PATTERNS.EMAIL.test(value)) emailCount++;
          if (SENSITIVE_PATTERNS.PHONE.test(value)) phoneCount++;
          if (SENSITIVE_PATTERNS.PERSONAL_ID.test(value)) idCount++;
          if (SENSITIVE_PATTERNS.ADDRESS.test(value)) addressCount++;
          if (value.split(' ').length >= 2 && value.length > 5 && /^[A-Za-z\sáéíóúÁÉÍÓÚñÑ]+$/.test(value)) nameCount++;
        }
      }
      
      if (emailCount >= 1) {
        score += 30;
        reasons.push("Muestra de datos contiene correos electrónicos");
      }
      
      if (phoneCount >= 1) {
        score += 30;
        reasons.push("Muestra de datos contiene números telefónicos");
      }
      
      if (idCount >= 1) {
        score += 40;
        reasons.push("Muestra de datos contiene documentos de identidad");
      }
      
      if (addressCount >= 1) {
        score += 35;
        reasons.push("Muestra de datos contiene direcciones");
      }
      
      if (nameCount >= 2) {
        score += 25;
        reasons.push("Muestra de datos contiene posibles nombres de personas");
      }
    }
  }

  // Normalize score to 0-100 range
  score = Math.min(100, score);
  
  // Define recommendation based on score
  if (score >= 90) {
    recommendation = "Ofuscación crítica: Aplicar hash o eliminación";
  } else if (score >= 70) {
    recommendation = "Ofuscación alta: Aplicar enmascaramiento o tokenización";
  } else if (score >= 50) {
    recommendation = "Ofuscación media: Aplicar generalización o reemplazo";
  } else if (score >= 30) {
    recommendation = "Ofuscación baja: Revisar manualmente";
  }
  
  return {
    score,
    reasons,
    recommendation
  };
}

// Hash a string value using SHA-256
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Mask a string by replacing characters with *
export function maskValue(value: string, keepStart = 0, keepEnd = 0): string {
  if (!value || typeof value !== 'string') return value;
  
  if (value.length <= keepStart + keepEnd) {
    return value;
  }
  
  const start = value.slice(0, keepStart);
  const middle = '*'.repeat(Math.max(1, value.length - keepStart - keepEnd));
  const end = value.slice(value.length - keepEnd);
  
  return start + middle + end;
}

// Shuffle character positions in a string
export function shuffleValue(value: string): string {
  if (!value || typeof value !== 'string') return value;
  
  const arr = value.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr.join('');
}

// Random replacement with a similar type of data
export function randomizeValue(value: string, dataType: string): string {
  if (!value || typeof value !== 'string') return value;
  
  // Check data type or pattern and generate appropriate random value
  if (SENSITIVE_PATTERNS.EMAIL.test(value)) {
    return `user${Math.floor(Math.random() * 10000)}@example.com`;
  }
  
  if (SENSITIVE_PATTERNS.PHONE.test(value)) {
    return `+${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 10000)}`;
  }
  
  if (SENSITIVE_PATTERNS.CREDIT_CARD.test(value)) {
    return `XXXX-XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  
  if (SENSITIVE_PATTERNS.PERSONAL_ID.test(value)) {
    return `ID${Math.floor(Math.random() * 100000000)}`;
  }
  
  // For names or general text
  return `SAMPLE-${Math.floor(Math.random() * 100000)}`;
}

// Apply obfuscation method to a value
export function applyObfuscation(
  value: any,
  method: 'hash' | 'mask' | 'random' | 'shuffle' | 'none',
  parameters?: Record<string, any>,
  dataType?: string
): any {
  if (value === null || value === undefined) {
    return value;
  }
  
  const stringValue = String(value);
  
  switch (method) {
    case 'hash':
      return hashValue(stringValue);
      
    case 'mask': {
      const keepStart = parameters?.keepStart || 0;
      const keepEnd = parameters?.keepEnd || 0;
      return maskValue(stringValue, keepStart, keepEnd);
    }
    
    case 'random':
      return randomizeValue(stringValue, dataType || 'text');
      
    case 'shuffle':
      return shuffleValue(stringValue);
      
    case 'none':
    default:
      return value;
  }
}