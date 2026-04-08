import './Loader.css'

type LoaderVariant = 'page' | 'section' | 'inline'

type LoaderProps = {
    label?: string
    variant?: LoaderVariant
    className?: string
}

const Loader = ({
    label = 'Loading',
    variant = 'inline',
    className = '',
}: LoaderProps) => {
    const classes = ['loaderContainer', `loaderContainer--${variant}`, className]
        .filter(Boolean)
        .join(' ')

    return (
        <div className={classes} role="status" aria-live="polite" aria-label={`${label}...`}>
            <div className="loader" aria-hidden="true"></div>
            <div className="loadingText">
                {label}
                <span>.</span>
                <span>.</span>
                <span>.</span>
            </div>
        </div>
    )
}

export default Loader
