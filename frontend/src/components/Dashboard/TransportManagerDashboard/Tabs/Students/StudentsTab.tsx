import { lazy, Suspense, useEffect, useState } from 'react';
import type { RoleSection } from '../../../dashboard.types';
import './StudentsTab.css';
import { isStudentsSubTab } from './studentsSubTabs';
import Loader from '../../../../../components/Loader/Loader';

const Assignments = lazy(() => import('./Tabs/Assignments'));
const Attendance = lazy(() => import('./Tabs/StudentAttendance'));
const ChangeRequests = lazy(() => import('./Tabs/ChangeRequests'));

// Create a mapping for lazy-loaded components
const componentMap: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
    assignments: Assignments,
    attendance: Attendance,
    'change-requests': ChangeRequests,
};

interface StudentsTabProps {
    section: RoleSection;
    activeSection: string;
}

const StudentsTab = ({ section, activeSection }: StudentsTabProps) => {
    const [isFirstPaint, setIsFirstPaint] = useState(true);
    
    // Defer non-critical rendering until after first paint for LCP optimization
    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            setIsFirstPaint(false);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    const activeSubTab = isStudentsSubTab(activeSection) ? activeSection : 'assignments';
    
    // Get the component from the map, fallback to Assignments
    const ActiveComponent = componentMap[activeSubTab] || Assignments;

    return (
        <div className="tabContent">
            {/* Quick stats placeholder - renders immediately for LCP */}
            <div className="students-tab__stats-placeholder">
                <div className="students-tab__stat-card">
                    <span className="students-tab__stat-value">Loading...</span>
                    <span className="students-tab__stat-label">Students</span>
                </div>
                <div className="students-tab__stat-card">
                    <span className="students-tab__stat-value">Loading...</span>
                    <span className="students-tab__stat-label">Present Today</span>
                </div>
                <div className="students-tab__stat-card">
                    <span className="students-tab__stat-value">Loading...</span>
                    <span className="students-tab__stat-label">Assignments</span>
                </div>
            </div>

            {/* Main content - lazy loaded after first paint */}
            <div className="subTabContent">
                {!isFirstPaint ? (
                    <Suspense fallback={<Loader variant="section" label={`Loading ${activeSubTab}...`} />}>
                        <ActiveComponent section={section} />
                    </Suspense>
                ) : (
                    <div className="students-tab__placeholder">
                        <Loader variant="section" label="Loading content" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentsTab;