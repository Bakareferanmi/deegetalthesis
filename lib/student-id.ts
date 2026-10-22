export const STUDENT_ID_PREFIX = 'DEEGEETAL';
export const STUDENT_ID_ATTEMPTS = 12;
export function generateStudentId() {
 const digits=crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
 return STUDENT_ID_PREFIX + String(digits).padStart(4,'0');
}
export class StudentIdUnavailableError extends Error {
 constructor(){super('We could not assign a student ID. Please try submitting again, or contact your instructor.');this.name='StudentIdUnavailableError';}
}
