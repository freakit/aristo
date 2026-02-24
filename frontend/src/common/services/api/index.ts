// Barrel export for common API functions
// Only truly common APIs should remain here.
// Domain-specific APIs (Student/Teacher) should be imported directly from their respective directories.

// Auth APIs (Common)
export { login } from "./login";
export { signup } from "./signup";
export { changeStudentPassword } from "./changeStudentPassword";

// QA APIs (Might be shared?)
export { getQAList } from "./getQAList";

// Azure/File APIs (Common Utils)
export { getAzureSasToken } from "./getAzureSasToken";
export { listBlobs } from "./listBlobs";
export { saveFileRecord } from "./saveFileRecord";

// Common Exam APIs
export { getExamById } from "./getExamById";
export { getExamAttachments } from "./getExamAttachments";

// Deepgram APIs (Key retrieval is common)
export { getDeepgramKey } from "./getDeepgramKey";
