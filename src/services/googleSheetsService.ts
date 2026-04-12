import { Material, Location, Loan, Document, Log, User, AppSettings } from '../types';

export type SyncData = {
  Materials: Material[];
  Locations: Location[];
  Users: User[];
  Settings: AppSettings[];
  Documents: Document[];
  Loans: Loan[];
  Logs: Log[];
};

export class GoogleSheetsService {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async fetchAllData(): Promise<SyncData | null> {
    if (!this.url) return null;
    try {
      // Adiciona um timestamp para evitar cache e garantir que a requisição seja fresca
      const separator = this.url.includes('?') ? '&' : '?';
      const fetchUrl = `${this.url}${separator}t=${Date.now()}`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        Materials: data.Materials || [],
        Locations: data.Locations || [],
        Users: data.Users || [],
        Settings: data.Settings || [],
        Documents: data.Documents || [],
        Loans: data.Loans || [],
        Logs: data.Logs || []
      };
    } catch (error) {
      console.error('Erro detalhado ao buscar dados do Google Sheets:', error);
      // Lança o erro para que a UI possa capturar se necessário
      throw error;
    }
  }

  async syncAll(data: SyncData): Promise<boolean> {
    if (!this.url) return false;
    try {
      // Usamos mode: 'no-cors' e Content-Type: 'text/plain' para evitar preflight (CORS)
      // O Google Apps Script consegue ler o corpo da requisição mesmo assim
      await fetch(this.url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'sync_all',
          data
        })
      });
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar com Google Sheets:', error);
      return false;
    }
  }

  async addLog(log: Log): Promise<boolean> {
    if (!this.url) return false;
    try {
      await fetch(this.url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'add_log',
          log
        })
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar log para Google Sheets:', error);
      return false;
    }
  }
}
