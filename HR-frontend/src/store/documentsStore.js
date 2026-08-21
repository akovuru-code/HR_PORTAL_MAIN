import { create } from 'zustand';

export const useDocumentsStore = create((set) => ({
    docs: [],
    restrictedDocs: [],
    setDocs: (docs) => set({ docs }),
    setRestrictedDocs: (restrictedDocs) => set({ restrictedDocs }),
    updateDoc: (id, changes) => set((state) => ({
        docs: state.docs.map(doc => doc.id === id ? { ...doc, ...changes } : doc)
    })),
    updateRestrictedDoc: (id, changes) => set((state) => ({
        restrictedDocs: state.restrictedDocs.map(doc => doc.id === id ? { ...doc, ...changes } : doc)
    })),
    addDoc: (doc) => set((state) => ({ docs: [...state.docs, doc] })),
    addRestrictedDoc: (doc) => set((state) => ({ restrictedDocs: [...state.restrictedDocs, doc] })),
    removeDoc: (id) => set((state) => ({ docs: state.docs.filter(doc => doc.id !== id) })),
    removeRestrictedDoc: (id) => set((state) => ({ restrictedDocs: state.restrictedDocs.filter(doc => doc.id !== id) })),
}));
