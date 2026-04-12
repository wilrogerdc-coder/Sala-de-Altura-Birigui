import { Material, Location, Loan } from '../types';

export const getAllocatedQuantity = (materialId: string, locations: Location[]) => {
  return (locations || [])
    .filter(loc => loc.type !== 'reserva')
    .reduce((acc, loc) => {
      const item = loc.materials.find(m => m.materialId === materialId);
      return acc + (item ? item.quantity : 0);
    }, 0);
};

export const getActiveLoansQuantity = (materialId: string, loans: Loan[], fromReservaOnly: boolean = true) => {
  return (loans || [])
    .filter(l => l.status === 'ativo' && (fromReservaOnly ? !l.sourceLocationId : true))
    .reduce((acc, l) => {
      const item = l.materials.find(m => m.materialId === materialId);
      return acc + (item ? item.quantity : 0);
    }, 0);
};

export const getAvailableQuantity = (material: Material, locations: Location[], loans: Loan[]) => {
  const allocated = getAllocatedQuantity(material.id, locations);
  const loanedFromReserva = getActiveLoansQuantity(material.id, loans, true);
  return (material.totalQuantity || 0) - allocated - loanedFromReserva;
};
