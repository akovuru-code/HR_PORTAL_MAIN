// Typography component for admin pages
const AdminTypography = {
    button: ({
        children,
        className = '',
        type = 'button',
        variant = 'primary',
        disabled = false,
        style = {},
        ...props
    }) => {
        let base = 'font-admin px-4 py-1 rounded-lg text-sm font-semibold transition duration-150 focus:outline-none border border-blue-300';
        let variantClass = '';
        let customStyle = { minWidth: 80, ...style };
        switch (variant) {
            case 'secondary':
                variantClass = 'bg-gray-100 text-gray-800 hover:bg-gray-200';
                break;
            case 'danger':
                variantClass = 'bg-red-500 text-white hover:bg-red-500';
                break;
            case 'primary':
            default:
                variantClass = 'bg-blue-100 text-blue-900 hover:bg-blue-400 active:scale-95 active:bg-blue-300';
        }
        let disabledClass = disabled ? 'opacity-60 cursor-not-allowed' : '';
        return (
            <button
                type={type}
                className={`${base} ${variantClass} ${disabledClass} ${className}`}
                style={customStyle}
                disabled={disabled}
                {...props}
            >
                {children}
            </button>
        );
    },


    select: ({ children, className = '', ...props }) => (
        <select className={`font-admin text-admin-base text-gray-800 border border-gray-300 rounded px-2 py-1 ${className}`} {...props}>
            {children}
        </select>
    ),

    _log: () => console.log('AdminTypography imported and available'),
    h1: ({ children, className = '' }) => (
        <h1 className={`font-admin text-admin-h1 text-gray-900 ${className}`}>
            {children}
        </h1>
    ),
    h2: ({ children, className = '' }) => (
        <h2 className={`font-admin text-admin-h2 text-gray-800 ${className}`}>
            {children}
        </h2>
    ),
    h3: ({ children, className = '' }) => (
        <h3 className={`font-admin text-admin-h3 text-gray-800 ${className}`}>
            {children}
        </h3>
    ),
    h4: ({ children, className = '' }) => (
        <h4 className={`font-admin text-admin-h4 text-gray-700 ${className}`}>
            {children}
        </h4>
    ),
    p: ({ children, className = '' }) => (
        <p className={`font-admin text-admin-base text-gray-600 ${className}`}>
            {children}
        </p>
    ),
    small: ({ children, className = '' }) => (
        <p className={`font-admin text-admin-sm text-gray-500 ${className}`}>
            {children}
        </p>
    ),
    label: ({ children, className = '' }) => (
        <label className={`font-admin text-admin-sm font-medium ${className}`}>
            {children}
        </label>
    ),
};

export default AdminTypography;
