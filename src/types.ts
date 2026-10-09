export interface Material {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  unit: string;
  minStock: number;
  lastUpdated: string;
  observations?: string;
  unitId?: string; // Identificador da unidade (para modo Matriz)
  unitName?: string;
}

export interface Location {
  id: string;
  name: string;
  type: 'viatura' | 'reserva' | 'outro';
  prefixo?: string;
  description?: string;
  status: 'operacional' | 'manutencao' | 'reserva' | 'ativo';
  unitId?: string; // Identificador da unidade
  unitName?: string;
  materials: {
    materialId: string;
    quantity: number;
  }[];
}

export interface Loan {
  id: string;
  soldierName: string;
  destination: string;
  courseName: string;
  observations?: string;
  expectedDuration: string;
  exitDate: string;
  returnDate?: string;
  status: 'ativo' | 'devolvido';
  sourceLocationId?: string; // De onde o material foi retirado (reserva ou viatura)
  deliveryResponsible?: string; // Responsável que realizou a entrega/saída dos materiais
  returnResponsible?: string; // Responsável que realizou a conferência e recebimento na devolução
  returnObservations?: string; // Observações / Termo inserido no momento da devolução
  missingObservations?: string; // Observações específicas de materiais faltantes/pendências
  hasMissingItems?: boolean; // Indica se houve devolução com itens faltantes
  returnedMaterials?: { // Registro dos materiais que foram efetivamente devolvidos
    materialId: string;
    quantity: number;
  }[];
  missingMaterials?: { // Registro dos materiais que ficaram pendentes/faltantes
    materialId: string;
    quantity: number;
    reason?: string;
  }[];
  materials: {
    materialId: string;
    quantity: number;
  }[];
}

export interface Document {
  id: string;
  title: string;
  category: 'manual' | 'equipamento' | 'fundamento' | 'outro';
  url: string;
  uploadDate: string;
}

export interface Log {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'super' | 'admin' | 'operador';
  permissions: string[];
  lastAccess: string;
  resetPasswordNextLogin?: boolean;
}

export interface AppSettings {
  systemName: string;
  unitName: string;
  unitLogo: string;
  reportWatermark: string;
  watermarkSize: number;
  bgImage: string;
  bgOpacity: number;
  theme: 'light' | 'dark';
  devInfo: string;
  systemMode: 'matriz' | 'local';
  googleSheetsUrl?: string;
  hierarchy: {
    matrizName: string;
    subunitName: string;
    postName: string;
  };
}
