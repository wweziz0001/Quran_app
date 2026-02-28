import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, rm, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";
import { extractionState } from "./status/route";

const EXTRACTED_DIR = join(process.cwd(), "extracted-system");

// Get all files recursively
async function getAllFiles(dirPath: string, basePath: string = dirPath): Promise<string[]> {
  const files: string[] = [];

  if (!existsSync(dirPath)) {
    return files;
  }

  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, basePath);
      files.push(...subFiles);
    } else {
      files.push(fullPath.replace(basePath + "/", ""));
    }
  }

  return files;
}

// Extract tar file using spawn for better memory handling
async function extractTarFile(
  tarPath: string,
  targetDir: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    extractionState.status = "extracting";
    extractionState.message = "جاري استخراج الملفات...";
    extractionState.progress = 30;

    // Create target directory
    if (!existsSync(targetDir)) {
      mkdir(targetDir, { recursive: true }).catch(() => {});
    }

    const tar = spawn("tar", ["-xf", tarPath, "-C", targetDir], {
      timeout: 300000, // 5 minutes timeout
    });

    let stderr = "";

    tar.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    tar.on("error", (err) => {
      resolve({ success: false, error: `خطأ في استخراج الملف: ${err.message}` });
    });

    tar.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: `فشل الاستخراج برمز ${code}: ${stderr || "خطأ غير معروف"}`,
        });
      }
    });

    // Update progress during extraction
    const progressInterval = setInterval(() => {
      if (extractionState.progress < 90) {
        extractionState.progress += 5;
        extractionState.message = `جاري استخراج الملفات... ${extractionState.progress}%`;
      }
    }, 2000);

    tar.on("close", () => {
      clearInterval(progressInterval);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    // Reset state
    extractionState.status = "uploading";
    extractionState.message = "جاري رفع الملف...";
    extractionState.progress = 0;
    extractionState.files = [];
    extractionState.error = null;
    extractionState.totalSize = 0;
    extractionState.extractedSize = 0;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      extractionState.status = "error";
      extractionState.error = "لم يتم العثور على ملف";
      return NextResponse.json({ error: "لم يتم العثور على ملف" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".tar") && !file.name.endsWith(".tar.gz") && !file.name.endsWith(".tgz")) {
      extractionState.status = "error";
      extractionState.error = "يجب أن يكون الملف بصيغة tar أو tar.gz أو tgz";
      return NextResponse.json(
        { error: "يجب أن يكون الملف بصيغة tar أو tar.gz أو tgz" },
        { status: 400 }
      );
    }

    extractionState.message = "جاري حفظ الملف...";
    extractionState.progress = 10;
    extractionState.totalSize = file.size;

    // Save file to temp directory
    const tempDir = join(tmpdir(), "system-upload");
    await mkdir(tempDir, { recursive: true });

    const tempFilePath = join(tempDir, `upload-${Date.now()}.tar`);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await writeFile(tempFilePath, fileBuffer);

    extractionState.progress = 20;
    extractionState.message = "تم حفظ الملف، جاري الاستخراج...";

    // Clean up old extracted directory
    if (existsSync(EXTRACTED_DIR)) {
      await rm(EXTRACTED_DIR, { recursive: true, force: true });
    }

    // Extract the tar file
    const result = await extractTarFile(tempFilePath, EXTRACTED_DIR);

    // Clean up temp file
    await rm(tempFilePath, { force: true }).catch(() => {});

    if (!result.success) {
      extractionState.status = "error";
      extractionState.error = result.error || "فشل في استخراج الملفات";
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    extractionState.progress = 95;
    extractionState.message = "جاري قراءة قائمة الملفات...";

    // Get list of extracted files
    const files = await getAllFiles(EXTRACTED_DIR);
    extractionState.files = files.slice(0, 100); // Limit to 100 files for response

    extractionState.status = "completed";
    extractionState.progress = 100;
    extractionState.message = `تم استخراج ${files.length} ملف بنجاح`;

    return NextResponse.json({
      success: true,
      message: `تم استخراج ${files.length} ملف بنجاح`,
      fileCount: files.length,
      files: files.slice(0, 50), // Return first 50 files
    });
  } catch (error) {
    extractionState.status = "error";
    extractionState.error = error instanceof Error ? error.message : "خطأ غير معروف";
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطأ غير معروف" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: extractionState.status,
    message: extractionState.message,
    progress: extractionState.progress,
    files: extractionState.files,
    error: extractionState.error,
    fileCount: extractionState.files.length,
  });
}
