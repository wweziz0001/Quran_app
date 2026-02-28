import { NextResponse } from "next/server";

// Global state for extraction status
export const extractionState = {
  status: "idle" as "idle" | "uploading" | "extracting" | "completed" | "error",
  message: "",
  progress: 0,
  files: [] as string[],
  error: null as string | null,
  totalSize: 0,
  extractedSize: 0,
};

export async function GET() {
  return NextResponse.json({
    status: extractionState.status,
    message: extractionState.message,
    progress: extractionState.progress,
    files: extractionState.files,
    error: extractionState.error,
    totalSize: extractionState.totalSize,
    extractedSize: extractionState.extractedSize,
  });
}
