-- Performance: tez-tez so'raladigan maydonlarga indekslar
CREATE INDEX "QuizAttempt_studentId_idx" ON "QuizAttempt"("studentId");
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");
CREATE INDEX "Submission_submittedAt_idx" ON "Submission"("submittedAt");
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");
CREATE INDEX "Attendance_courseId_date_idx" ON "Attendance"("courseId", "date");
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Certificate_studentId_idx" ON "Certificate"("studentId");
CREATE INDEX "GradeChangeRequest_submissionId_idx" ON "GradeChangeRequest"("submissionId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_facultyId_idx" ON "User"("facultyId");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
