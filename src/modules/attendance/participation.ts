export type AttendanceStatusLike =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED"
  | "SUSPICIOUS"
  | "LEFT_EARLY";

export function countsAsParticipated(status: AttendanceStatusLike): boolean {
  return status === "PRESENT" || status === "LATE";
}

export function finalStatusWithoutCheckout(status: AttendanceStatusLike): AttendanceStatusLike {
  return countsAsParticipated(status) ? "LEFT_EARLY" : status;
}
