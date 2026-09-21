import { useState, useCallback, useEffect, useContext } from 'react';
import { getSession, requestEditPermission, getLatestEditRequest, getOnboarding } from '../api/onboarding';
import { AdminViewContext } from '../contexts/AdminViewContext';
import { useAuth } from './useAuth';
import { canEditDocuments, isSubmittedByAdmin, isTabSubmitted } from '../utils/onboardingSubmission';

export function useOnboardingPermissions(pageKey, sectionKey) {
    const adminView = useContext(AdminViewContext);
    const isAdminView = !!(adminView?.targetEmployeeId);
    const { isRootAdmin, can } = useAuth();
    const adminCanEditEmployee = isRootAdmin || can('employee:update');
    // Read initial state from localStorage
    const getCanEdit = () => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(pageKey) === 'true';
    };
    const getSubmitted = () => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(`submitted_${sectionKey}`) === 'true';
    };

    const [canEdit, setCanEdit] = useState(isAdminView ? adminCanEditEmployee : getCanEdit());
    const [onboardingSubmitted, setOnboardingSubmitted] = useState(isAdminView ? !adminCanEditEmployee : getSubmitted());
    const [submittedByAdmin, setSubmittedByAdmin] = useState(false);
    const [permissionRequested, setPermissionRequested] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null); // pending|approved|denied|null
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    // Keep state in sync with localStorage
    useEffect(() => {
        const sync = () => {
            setCanEdit(getCanEdit());
            setOnboardingSubmitted(getSubmitted());
            setSubmittedByAdmin(false);
        };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, [pageKey]);

    // Load server-side status for current user
    useEffect(() => {
        let mounted = true;
        async function loadStatus() {
            if (isAdminView) return; // admin access is initialized from employee:update
            setLoadingStatus(true);
            try {
                const session = await getSession();
                const user = session?.data || session;
                const employeeId = user?.employeeId || user?.id;
                if (!employeeId) return;

                // 1. Check server for per-tab submitted state (source of truth)
                let isSubmitted = false;
                try {
                    const onboardingRes = await getOnboarding(employeeId);
                    const submittedTabs = onboardingRes?.data?.employee?.submittedTabs || {};
                    const submittedTab = submittedTabs[sectionKey];
                    isSubmitted = isTabSubmitted(submittedTab);
                    if (mounted) setSubmittedByAdmin(isSubmittedByAdmin(submittedTab));
                    // Keep localStorage in sync for fast initial render next time
                    if (typeof window !== 'undefined') {
                        if (isSubmitted) localStorage.setItem(`submitted_${sectionKey}`, 'true');
                        else localStorage.removeItem(`submitted_${sectionKey}`);
                    }
                } catch {
                    // Fall back to localStorage if server is unreachable
                    isSubmitted = localStorage.getItem(`submitted_${sectionKey}`) === 'true';
                }
                if (mounted) {
                    setOnboardingSubmitted(isSubmitted);
                }

                // 2. Check Edit Request Status for this specific tab
                const latest = await getLatestEditRequest(employeeId, sectionKey);
                if (!mounted) return;
                if (latest) {
                    setRequestStatus(latest.status);
                    setPermissionRequested(latest.status === 'pending');
                    setPermissionGranted(latest.status === 'approved');
                    // If approved, enable editing for this tab only
                    if (latest.status === 'approved') {
                        if (typeof window !== 'undefined') localStorage.setItem(pageKey, 'true');
                        setCanEdit(true);
                    }
                }
            } catch (err) {
                // ignore
            } finally {
                if (mounted) setLoadingStatus(false);
            }
        }
        loadStatus();
        return () => { mounted = false; };
    }, [pageKey, sectionKey, isAdminView]);

    // Submit handler — only locks this tab, not all tabs
    const handleSubmit = useCallback(() => {
        if (isAdminView) return; // authorized admins stay editable after submit
        if (typeof window !== 'undefined') {
            localStorage.setItem(`submitted_${sectionKey}`, 'true');
            localStorage.removeItem(pageKey);
        }
        setOnboardingSubmitted(true);
        setSubmittedByAdmin(false);
        setCanEdit(false);
        setPermissionGranted(false);
        setPermissionRequested(false);
        setRequestStatus(null);
    }, [pageKey, isAdminView]);

    // Permission request flow
    const requestPermission = useCallback(async (reason) => {
        try {
            setPermissionRequested(true);
            const session = await getSession();
            const user = session?.data || session;
            const employeeId = user?.employeeId || user?.id;
            if (!employeeId) throw new Error('Missing employeeId');
            const res = await requestEditPermission(employeeId, reason, sectionKey);
            const reqItem = res.data?.request || res.data;
            setRequestStatus(reqItem?.status || 'pending');
            setPermissionRequested(reqItem?.status === 'pending');
            setPermissionGranted(reqItem?.status === 'approved');
            return reqItem;
        } catch (err) {
            setPermissionRequested(false);
            throw err;
        }
    }, [sectionKey]);

    // Reset permission
    const resetPermission = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(pageKey);
        }
        setCanEdit(false);
    }, [pageKey]);

    // Modal controls
    const openPermissionModal = useCallback(() => {
        setShowPermissionModal(true);
        setPermissionRequested(false);
        setPermissionGranted(false);
    }, []);
    const closePermissionModal = useCallback(() => {
        setShowPermissionModal(false);
        setPermissionRequested(false);
        setPermissionGranted(false);
    }, []);

    return {
        canEdit,
        adminCanEditEmployee,
        onboardingSubmitted,
        canEditDocuments: canEditDocuments({ onboardingSubmitted, canEdit, submittedByAdmin }),
        handleSubmit,
        requestPermission,
        resetPermission,
        showPermissionModal,
        openPermissionModal,
        closePermissionModal,
        permissionRequested,
        permissionGranted,
        requestStatus,
        loadingStatus,
    };
}
