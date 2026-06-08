import React from 'react';
import './Loader.css';

type LoaderVariant = 'page' | 'section' | 'inline';

interface LoaderProps {
    label?: string;
    variant?: LoaderVariant;
    className?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
    label = 'Loading',
    variant = 'inline',
    className = ''
}) => {
    const classes = ['loaderContainer', `loaderContainer--${variant}`, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div 
            className={classes} 
            role="status" 
            aria-live="polite" 
            aria-label={`${label}...`}
        >
            <div className="loader" aria-hidden="true" />
            <div className="loadingText" aria-hidden="true">
                {label}
                <span>.</span>
                <span>.</span>
                <span>.</span>
            </div>
        </div>
    );
};

export default Loader;