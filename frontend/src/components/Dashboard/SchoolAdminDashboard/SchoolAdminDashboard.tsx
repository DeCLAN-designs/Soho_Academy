import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { studentApi } from '../../../lib/api'
import type {
    CreateStudentAdmissionPayload,
    StudentDashboardData,
    StudentRecord,
    UpdateStudentMasterDataPayload,
} from '../../../lib/api'
import type { DashboardRoleConfig } from '../dashboard.types'
import './SchoolAdminDashboard.css'

type SchoolAdminDashboardProps = {
    activeSection: string
}

const initialAdmissionForm: CreateStudentAdmissionPayload = {
    admissionNumber: '',
    firstName: '',
    lastName: '',
    className: '',
    grade: '',
    parentContact: '',
    admissionDate: '',
}

const initialContactForm = {
    studentId: '',
    parentContact: '',
}

const initialWithdrawalForm = {
    studentId: '',
    withdrawalDate: '',
    withdrawalReason: '',
}

const initialMasterForm = {
    studentId: '',
    admissionNumber: '',
    firstName: '',
    lastName: '',
    className: '',
    grade: '',
    admissionDate: '',
}

export const schoolAdminDashboardConfig: DashboardRoleConfig = {
    title: 'School Admin Dashboard',
    subtitle: 'Manage student admissions, records, and lifecycle changes.',
    quickActions: ['Add Admission', 'Update Contact', 'Record Withdrawal'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'admissions', label: 'Admissions' },
        { id: 'contactChanges', label: 'Contact Changes' },
        { id: 'withdrawals', label: 'Withdrawals' },
        { id: 'masterData', label: 'Master Data' },
    ],
    sections: {
        overview: {
            heading: 'Student Operations Overview',
            description: 'Monitor admissions, withdrawals, and key student record metrics.',
            cards: [
                'Total student master records',
                'Active students for current term',
                'Withdrawn students tracking',
            ],
        },
        admissions: {
            heading: 'New Admissions',
            description: 'Add newly admitted students with class, grade, and parent contact.',
            cards: [
                'Admission number uniqueness check',
                'Class and grade assignment',
                'Parent contact captured on admission',
            ],
        },
        contactChanges: {
            heading: 'Parent Contact Changes',
            description: 'Update parent contacts and keep a complete change history.',
            cards: [
                'Single-student contact update',
                'Latest contact history log',
                'Change audit trail visibility',
            ],
        },
        withdrawals: {
            heading: 'Student Withdrawals',
            description: 'Record student withdrawals with effective date and reason.',
            cards: [
                'Withdrawal date recording',
                'Reason capture for reporting',
                'Status update to withdrawn',
            ],
        },
        masterData: {
            heading: 'Student Master Data',
            description: 'Maintain class, grade, and admission-related student profile data.',
            cards: [
                'Edit class and grade placement',
                'Correct admission profile fields',
                'Keep student directory current',
            ],
        },
    },
}

const formatDate = (value: string | null) => {
    if (!value) {
        return '-'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString()
}

const getStudentLabel = (student: StudentRecord) =>
    `${student.admissionNumber} - ${student.firstName} ${student.lastName}`

const SchoolAdminDashboard = ({ activeSection }: SchoolAdminDashboardProps) => {
    const defaultSection = schoolAdminDashboardConfig.navigation[0].id
    const section =
        schoolAdminDashboardConfig.sections[activeSection] ||
        schoolAdminDashboardConfig.sections[defaultSection]

    const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const [admissionForm, setAdmissionForm] = useState(initialAdmissionForm)
    const [contactForm, setContactForm] = useState(initialContactForm)
    const [withdrawalForm, setWithdrawalForm] = useState(initialWithdrawalForm)
    const [masterForm, setMasterForm] = useState(initialMasterForm)

    const students = dashboardData?.students || []
    const activeStudents = dashboardData?.admissions || []
    const withdrawnStudents = dashboardData?.withdrawals || []
    const parentContactChanges = dashboardData?.parentContactChanges || []

    const studentMap = useMemo(() => {
        const entries = students.map((student) => [student.id, student] as const)
        return new Map(entries)
    }, [students])

    const loadDashboardData = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        }

        try {
            const response = await studentApi.getDashboardData()
            setDashboardData(response.data || null)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load student data.')
        } finally {
            if (withLoader) {
                setIsLoading(false)
            }
        }
    }

    useEffect(() => {
        void loadDashboardData(true)
    }, [])

    const clearFlashMessages = () => {
        setErrorMessage('')
        setSuccessMessage('')
    }

    const handleAdmissionSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        clearFlashMessages()
        setIsSubmitting(true)

        try {
            await studentApi.createAdmission(admissionForm)
            setAdmissionForm(initialAdmissionForm)
            setSuccessMessage('Student admission created successfully.')
            await loadDashboardData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create student admission.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleParentContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        clearFlashMessages()

        const studentId = Number(contactForm.studentId)
        if (!studentId) {
            setErrorMessage('Select a student to update contact details.')
            return
        }

        setIsSubmitting(true)

        try {
            await studentApi.updateParentContact(studentId, {
                parentContact: contactForm.parentContact,
            })
            setContactForm(initialContactForm)
            setSuccessMessage('Parent contact updated successfully.')
            await loadDashboardData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to update parent contact.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleWithdrawalSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        clearFlashMessages()

        const studentId = Number(withdrawalForm.studentId)
        if (!studentId) {
            setErrorMessage('Select an active student to record withdrawal.')
            return
        }

        setIsSubmitting(true)

        try {
            await studentApi.withdrawStudent(studentId, {
                withdrawalDate: withdrawalForm.withdrawalDate || undefined,
                withdrawalReason: withdrawalForm.withdrawalReason || undefined,
            })
            setWithdrawalForm(initialWithdrawalForm)
            setSuccessMessage('Student withdrawal recorded successfully.')
            await loadDashboardData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to record student withdrawal.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleMasterDataSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        clearFlashMessages()

        const studentId = Number(masterForm.studentId)
        if (!studentId) {
            setErrorMessage('Select a student to update master data.')
            return
        }

        const payload: UpdateStudentMasterDataPayload = {}

        if (masterForm.admissionNumber.trim()) {
            payload.admissionNumber = masterForm.admissionNumber.trim()
        }
        if (masterForm.firstName.trim()) {
            payload.firstName = masterForm.firstName.trim()
        }
        if (masterForm.lastName.trim()) {
            payload.lastName = masterForm.lastName.trim()
        }
        if (masterForm.className.trim()) {
            payload.className = masterForm.className.trim()
        }
        if (masterForm.grade.trim()) {
            payload.grade = masterForm.grade.trim()
        }
        if (masterForm.admissionDate.trim()) {
            payload.admissionDate = masterForm.admissionDate.trim()
        }

        if (Object.keys(payload).length === 0) {
            setErrorMessage('Enter at least one field to update in master data.')
            return
        }

        setIsSubmitting(true)

        try {
            await studentApi.updateMasterData(studentId, payload)
            setMasterForm(initialMasterForm)
            setSuccessMessage('Student master data updated successfully.')
            await loadDashboardData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to update student master data.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderOverviewContent = () => (
        <div className="schoolAdminPanel">
            <div className="schoolAdminStats">
                <article className="schoolAdminStatCard">
                    <p>Total Students</p>
                    <strong>{dashboardData?.summary.totalStudents || 0}</strong>
                </article>
                <article className="schoolAdminStatCard">
                    <p>Active Students</p>
                    <strong>{dashboardData?.summary.activeStudents || 0}</strong>
                </article>
                <article className="schoolAdminStatCard">
                    <p>Withdrawn Students</p>
                    <strong>{dashboardData?.summary.withdrawnStudents || 0}</strong>
                </article>
            </div>

            <div className="schoolAdminLists">
                <div>
                    <h3>Recent Admissions</h3>
                    <ul>
                        {activeStudents.slice(0, 5).map((student) => (
                            <li key={student.id}>
                                <span>{getStudentLabel(student)}</span>
                                <span>{student.className} / {student.grade}</span>
                            </li>
                        ))}
                        {activeStudents.length === 0 ? <li>No active admissions found.</li> : null}
                    </ul>
                </div>

                <div>
                    <h3>Recent Withdrawals</h3>
                    <ul>
                        {withdrawnStudents.slice(0, 5).map((student) => (
                            <li key={student.id}>
                                <span>{getStudentLabel(student)}</span>
                                <span>{formatDate(student.withdrawalDate)}</span>
                            </li>
                        ))}
                        {withdrawnStudents.length === 0 ? <li>No withdrawals recorded.</li> : null}
                    </ul>
                </div>
            </div>
        </div>
    )

    const renderAdmissionsContent = () => (
        <div className="schoolAdminPanel">
            <form className="schoolAdminForm" onSubmit={handleAdmissionSubmit}>
                <h3>Add New Admission</h3>
                <div className="schoolAdminGrid">
                    <label>
                        Admission Number
                        <input
                            name="admissionNumber"
                            value={admissionForm.admissionNumber}
                            onChange={(event) =>
                                setAdmissionForm((current) => ({
                                    ...current,
                                    admissionNumber: event.target.value,
                                }))
                            }
                            required
                        />
                    </label>
                    <label>
                        First Name
                        <input
                            name="firstName"
                            value={admissionForm.firstName}
                            onChange={(event) =>
                                setAdmissionForm((current) => ({ ...current, firstName: event.target.value }))
                            }
                            required
                        />
                    </label>
                    <label>
                        Last Name
                        <input
                            name="lastName"
                            value={admissionForm.lastName}
                            onChange={(event) =>
                                setAdmissionForm((current) => ({ ...current, lastName: event.target.value }))
                            }
                            required
                        />
                    </label>
                    <label>
                        Class
                        <input
                            name="className"
                            value={admissionForm.className}
                            onChange={(event) =>
                                setAdmissionForm((current) => ({ ...current, className: event.target.value }))
                            }
                            required
                        />
                    </label>
                    <label>
                        Grade
                        <input
                            name="grade"
                            value={admissionForm.grade}
                            onChange={(event) =>
                                setAdmissionForm((current) => ({ ...current, grade: event.target.value }))
                            }
                            required
                        />
                    </label>
                    <label>
                        Parent Contact
                        <input
                            name="parentContact"
                            value={admissionForm.parentContact}
                            onChange={(event) =>
                                setAdmissionForm((current) => ({
                                    ...current,
                                    parentContact: event.target.value.replace(/\D/g, ''),
                                }))
                            }
                            required
                        />
                    </label>
                    <label>
                        Admission Date
                        <input
                            type="date"
                            name="admissionDate"
                            value={admissionForm.admissionDate}
                            onChange={(event) =>
                                setAdmissionForm((current) => ({ ...current, admissionDate: event.target.value }))
                            }
                        />
                    </label>
                </div>

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Admission'}
                </button>
            </form>

            <div className="schoolAdminRecords">
                <h3>Active Admissions</h3>
                <ul>
                    {activeStudents.map((student) => (
                        <li key={student.id}>
                            <span>{getStudentLabel(student)}</span>
                            <span>{student.className} / {student.grade}</span>
                            <span>{student.parentContact}</span>
                        </li>
                    ))}
                    {activeStudents.length === 0 ? <li>No active admissions available.</li> : null}
                </ul>
            </div>
        </div>
    )

    const renderContactChangesContent = () => (
        <div className="schoolAdminPanel">
            <form className="schoolAdminForm" onSubmit={handleParentContactSubmit}>
                <h3>Update Parent Contact</h3>
                <div className="schoolAdminGrid">
                    <label>
                        Student
                        <select
                            value={contactForm.studentId}
                            onChange={(event) =>
                                setContactForm((current) => ({ ...current, studentId: event.target.value }))
                            }
                            required
                        >
                            <option value="">Select student</option>
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {getStudentLabel(student)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        New Parent Contact
                        <input
                            value={contactForm.parentContact}
                            onChange={(event) =>
                                setContactForm((current) => ({
                                    ...current,
                                    parentContact: event.target.value.replace(/\D/g, ''),
                                }))
                            }
                            required
                        />
                    </label>
                </div>

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Contact'}
                </button>
            </form>

            <div className="schoolAdminRecords">
                <h3>Contact Change History</h3>
                <ul>
                    {parentContactChanges.map((change) => (
                        <li key={change.id}>
                            <span>{change.studentName}</span>
                            <span>
                                {change.previousContact}
                                {' -> '}
                                {change.newContact}
                            </span>
                            <span>{formatDate(change.changedAt)}</span>
                        </li>
                    ))}
                    {parentContactChanges.length === 0 ? <li>No parent contact changes recorded.</li> : null}
                </ul>
            </div>
        </div>
    )

    const renderWithdrawalsContent = () => (
        <div className="schoolAdminPanel">
            <form className="schoolAdminForm" onSubmit={handleWithdrawalSubmit}>
                <h3>Record Student Withdrawal</h3>
                <div className="schoolAdminGrid">
                    <label>
                        Active Student
                        <select
                            value={withdrawalForm.studentId}
                            onChange={(event) =>
                                setWithdrawalForm((current) => ({ ...current, studentId: event.target.value }))
                            }
                            required
                        >
                            <option value="">Select student</option>
                            {activeStudents.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {getStudentLabel(student)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Withdrawal Date
                        <input
                            type="date"
                            value={withdrawalForm.withdrawalDate}
                            onChange={(event) =>
                                setWithdrawalForm((current) => ({
                                    ...current,
                                    withdrawalDate: event.target.value,
                                }))
                            }
                        />
                    </label>
                    <label className="schoolAdminFullWidth">
                        Withdrawal Reason
                        <input
                            value={withdrawalForm.withdrawalReason}
                            onChange={(event) =>
                                setWithdrawalForm((current) => ({
                                    ...current,
                                    withdrawalReason: event.target.value,
                                }))
                            }
                            placeholder="Optional"
                        />
                    </label>
                </div>

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Withdrawal'}
                </button>
            </form>

            <div className="schoolAdminRecords">
                <h3>Withdrawn Students</h3>
                <ul>
                    {withdrawnStudents.map((student) => (
                        <li key={student.id}>
                            <span>{getStudentLabel(student)}</span>
                            <span>{formatDate(student.withdrawalDate)}</span>
                            <span>{student.withdrawalReason || '-'}</span>
                        </li>
                    ))}
                    {withdrawnStudents.length === 0 ? <li>No withdrawn students recorded.</li> : null}
                </ul>
            </div>
        </div>
    )

    const renderMasterDataContent = () => (
        <div className="schoolAdminPanel">
            <form className="schoolAdminForm" onSubmit={handleMasterDataSubmit}>
                <h3>Update Student Master Data</h3>
                <div className="schoolAdminGrid">
                    <label>
                        Student
                        <select
                            value={masterForm.studentId}
                            onChange={(event) => {
                                const nextStudentId = event.target.value
                                const selectedStudent = nextStudentId
                                    ? studentMap.get(Number(nextStudentId))
                                    : null

                                setMasterForm({
                                    studentId: nextStudentId,
                                    admissionNumber: selectedStudent?.admissionNumber || '',
                                    firstName: selectedStudent?.firstName || '',
                                    lastName: selectedStudent?.lastName || '',
                                    className: selectedStudent?.className || '',
                                    grade: selectedStudent?.grade || '',
                                    admissionDate: selectedStudent?.admissionDate || '',
                                })
                            }}
                            required
                        >
                            <option value="">Select student</option>
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {getStudentLabel(student)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Admission Number
                        <input
                            value={masterForm.admissionNumber}
                            onChange={(event) =>
                                setMasterForm((current) => ({
                                    ...current,
                                    admissionNumber: event.target.value,
                                }))
                            }
                        />
                    </label>
                    <label>
                        First Name
                        <input
                            value={masterForm.firstName}
                            onChange={(event) =>
                                setMasterForm((current) => ({ ...current, firstName: event.target.value }))
                            }
                        />
                    </label>
                    <label>
                        Last Name
                        <input
                            value={masterForm.lastName}
                            onChange={(event) =>
                                setMasterForm((current) => ({ ...current, lastName: event.target.value }))
                            }
                        />
                    </label>
                    <label>
                        Class
                        <input
                            value={masterForm.className}
                            onChange={(event) =>
                                setMasterForm((current) => ({ ...current, className: event.target.value }))
                            }
                        />
                    </label>
                    <label>
                        Grade
                        <input
                            value={masterForm.grade}
                            onChange={(event) =>
                                setMasterForm((current) => ({ ...current, grade: event.target.value }))
                            }
                        />
                    </label>
                    <label>
                        Admission Date
                        <input
                            type="date"
                            value={masterForm.admissionDate}
                            onChange={(event) =>
                                setMasterForm((current) => ({
                                    ...current,
                                    admissionDate: event.target.value,
                                }))
                            }
                        />
                    </label>
                </div>

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Master Data'}
                </button>
            </form>

            <div className="schoolAdminRecords">
                <h3>Student Master Data List</h3>
                <ul>
                    {students.map((student) => (
                        <li key={student.id}>
                            <span>{getStudentLabel(student)}</span>
                            <span>{student.className} / {student.grade}</span>
                            <span>{student.status}</span>
                        </li>
                    ))}
                    {students.length === 0 ? <li>No students found in master data.</li> : null}
                </ul>
            </div>
        </div>
    )

    const renderSectionContent = () => {
        if (isLoading) {
            return <p className="schoolAdminStatus">Loading student data...</p>
        }

        switch (activeSection) {
            case 'admissions':
                return renderAdmissionsContent()
            case 'contactChanges':
                return renderContactChangesContent()
            case 'withdrawals':
                return renderWithdrawalsContent()
            case 'masterData':
                return renderMasterDataContent()
            case 'overview':
            default:
                return renderOverviewContent()
        }
    }

    return (
        <>
            <div className="dashboardCards">
                {section.cards.map((card) => (
                    <article key={card} className="dashboardCard">
                        <p>{card}</p>
                    </article>
                ))}
            </div>

            {errorMessage ? <p className="schoolAdminStatus schoolAdminStatus--error">{errorMessage}</p> : null}
            {successMessage ? <p className="schoolAdminStatus schoolAdminStatus--success">{successMessage}</p> : null}

            {renderSectionContent()}
        </>
    )
}

export default SchoolAdminDashboard
