export const STUDENT_ID_PREFIX = 'DEEGEETAL';
export const STUDENT_ID_ATTEMPTS = 12;
export function generateStudentId(level:string,stream:string) {
 const digits=crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
 const department=({Science:'SCI',Art:'ART',Commercial:'COM'} as Record<string,string>)[stream];
 if(!['SS1','SS2'].includes(level)||!department)throw new Error('Invalid student class.');
 return `${STUDENT_ID_PREFIX}-${level}-${department}-${String(digits).padStart(4,'0')}`;
}
export class StudentIdUnavailableError extends Error {
 constructor(){super('We could not assign a student ID. Please try submitting again, or contact your instructor.');this.name='StudentIdUnavailableError';}
}
