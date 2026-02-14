import type { ReactNode } from 'react'

type PrivateRouteProps = {
    isAuthenticated: boolean
    fallback: ReactNode
    children: ReactNode
}

const PrivateRoute = ({ isAuthenticated, fallback, children }: PrivateRouteProps) => {
    if (!isAuthenticated) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

export default PrivateRoute
