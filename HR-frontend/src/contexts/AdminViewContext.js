import { createContext, useContext } from 'react';

export const AdminViewContext = createContext(null);

export function useAdminView() {
  return useContext(AdminViewContext);
}
