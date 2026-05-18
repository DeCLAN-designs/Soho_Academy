export type NavigationItem = {
    id: string
    label: string
    children?: NavigationItem[]
}

export type RoleSection = {
    heading: string
    description: string
    cards: string[]
}

export type DashboardRoleConfig = {
    title: string
    subtitle: string
    quickActions: string[]
    navigation: NavigationItem[]
    sections: Record<string, RoleSection>
}
