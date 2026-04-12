import { Material, Location, Log, User, AppSettings, Document, Loan } from './types';

export const initialMaterials: Material[] = [];

export const initialLocations: Location[] = [
  { id: 'reserva-central', name: 'Reserva Central', type: 'reserva', status: 'ativo', materials: [] },
];

export const initialUsers: User[] = [
  { id: 'super-cavalieri', username: 'cavalieri', password: 'tricolor', name: 'Cavalieri', role: 'super', permissions: ['dashboard', 'inventory', 'allocations', 'loans', 'documents', 'logs', 'reports', 'settings', 'help'], lastAccess: new Date().toISOString() },
  { id: 'admin-default', username: 'admin', password: '123', name: 'Administrador', role: 'admin', permissions: ['dashboard', 'inventory', 'allocations', 'loans', 'documents', 'reports', 'settings', 'help'], lastAccess: new Date().toISOString() },
];

export const initialSettings: AppSettings = {
  unitName: '1º Grupamento de Bombeiros - SP',
  unitLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Bras%C3%A3o_do_Corpo_de_Bombeiros_da_Pol%C3%ADcia_Militar_do_Estado_de_S%C3%A3o_Paulo.svg/1200px-Bras%C3%A3o_do_Corpo_de_Bombeiros_da_Pol%C3%ADcia_Militar_do_Estado_de_S%C3%A3o_Paulo.svg.png',
  reportWatermark: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Bras%C3%A3o_do_Corpo_de_Bombeiros_da_Pol%C3%ADcia_Militar_do_Estado_de_S%C3%A3o_Paulo.svg/1200px-Bras%C3%A3o_do_Corpo_de_Bombeiros_da_Pol%C3%ADcia_Militar_do_Estado_de_S%C3%A3o_Paulo.svg.png',
  watermarkSize: 300,
  bgImage: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=2070&auto=format&fit=crop',
  bgOpacity: 0.15,
  theme: 'light',
  devInfo: 'Desenvolvido por: Equipe de Tecnologia CBPMESP\nVersão: 2.0.0\nContato: suporte@bombeiros.sp.gov.br',
  systemMode: 'local',
  googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbz8KdGmeUJbxD5Heb__3bEIpoYpDzwo8MXzVLfBeW3atJpOL8yudJ2QvcvWgR0wEC2Y/exec',
  hierarchy: {
    matrizName: '20º Grupamento de Bombeiros',
    subunitName: '1º SGB',
    postName: 'Posto Central'
  }
};

export const initialDocuments: Document[] = [
  { id: '1', title: 'Manual de Salvamento em Altura', category: 'fundamento', url: '#', uploadDate: new Date().toISOString() },
  { id: '2', title: 'Especificações Técnicas Cordas', category: 'equipamento', url: '#', uploadDate: new Date().toISOString() },
];

export const initialLoans: Loan[] = [];
