export interface ClassAvailable {
    classID: string;
    classCode: string;
    subjectName: string;
    credits: number;
    teacherName: string;
    currentStudents: number;
    maxStudents: number;
    dayOfWeek: number;
    periodStart: number;
    periodEnd: number;
    room: string;
}

export interface EligibilityCheck {
    classAvailable: boolean;
    prerequisitePassed: boolean;
    noScheduleConflict: boolean;
    withinCreditLimit: boolean;
    message: string;
}

export interface RegistrationRequest {
    studentID: string;
    classID: string;
    status?: string; // backend sẽ set PENDING
}