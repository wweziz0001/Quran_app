import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { readdir, cp, rm, stat, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";

const EXTRACTED_DIR = join(process.cwd(), "extracted-system");
const PROJECT_ROOT = process.cwd();

// Deploy state
export const deployState = {
  status: "idle" as "idle" | "deploying" | "completed" | "error",
  message: "",
  progress: 0,
  error: null as string | null,
  step: "",
};

// Exclude patterns
const EXCLUDE_PATTERNS = [
  "node_modules",
  ".next",
  ".git",
  "dev.log",
  "server.log",
  "extracted-system",
  ".restart",
];

function shouldExclude(name: string): boolean {
  return EXCLUDE_PATTERNS.includes(name);
}

// Find the actual project root (handle single subfolder case)
async function findProjectRoot(extractedDir: string): Promise<string> {
  const entries = await readdir(extractedDir, { withFileTypes: true });
  const directories = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
  const files = entries.filter((e) => e.isFile());

  // If there's only one directory and no files at root, use that directory
  if (directories.length === 1 && files.length === 0) {
    const subDir = join(extractedDir, directories[0].name);
    const subEntries = await readdir(subDir, { withFileTypes: true });
    // Check if this directory contains project files
    const hasPackageJson = subEntries.some((e) => e.name === "package.json");
    if (hasPackageJson) {
      return subDir;
    }
  }

  return extractedDir;
}

// Copy directory recursively, excluding certain patterns
async function copyDirectory(
  source: string,
  target: string,
  onProgress?: (file: string) => void
): Promise<void> {
  if (!existsSync(source)) {
    throw new Error(`المجلد المصدر غير موجود: ${source}`);
  }

  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldExclude(entry.name)) {
      continue;
    }

    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath, onProgress);
    } else {
      // Copy file
      const targetDir = target;
      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }
      await cp(sourcePath, targetPath);
      onProgress?.(entry.name);
    }
  }
}

// Execute command with progress
function executeCommand(
  command: string,
  args: string[],
  cwd: string = PROJECT_ROOT,
  timeout: number = 120000
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      timeout,
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: "", error: err.message });
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({
          success: false,
          output: stdout,
          error: stderr || `فشل الأمر برمز ${code}`,
        });
      }
    });
  });
}

export async function POST() {
  try {
    // Reset state
    deployState.status = "deploying";
    deployState.progress = 0;
    deployState.message = "جاري بدء النشر...";
    deployState.error = null;
    deployState.step = "init";

    // Check if extracted directory exists
    if (!existsSync(EXTRACTED_DIR)) {
      deployState.status = "error";
      deployState.error = "لم يتم العثور على ملفات مستخرجة. يرجى رفع الملف أولاً.";
      return NextResponse.json(
        { error: "لم يتم العثور على ملفات مستخرجة. يرجى رفع الملف أولاً." },
        { status: 400 }
      );
    }

    // Find the actual project root (handle single subfolder case)
    deployState.message = "جاري تحديد مجلد المشروع...";
    const sourceDir = await findProjectRoot(EXTRACTED_DIR);
    deployState.message = `مجلد المشروع: ${sourceDir.split("/").pop()}`;

    // Step 1: Copy files (20%)
    deployState.step = "copying";
    deployState.message = "جاري نسخ الملفات...";
    deployState.progress = 10;

    let filesCopied = 0;
    await copyDirectory(sourceDir, PROJECT_ROOT, (file) => {
      filesCopied++;
      if (filesCopied % 10 === 0) {
        deployState.progress = Math.min(30, 10 + Math.floor(filesCopied / 10));
      }
    });

    deployState.progress = 30;
    deployState.message = `تم نسخ ${filesCopied} ملف`;

    // Step 2: Install dependencies (50%)
    deployState.step = "installing";
    deployState.message = "جاري تثبيت الاعتمادات...";
    deployState.progress = 35;

    // Check if package.json exists
    if (existsSync(join(PROJECT_ROOT, "package.json"))) {
      const installResult = await executeCommand("bun", ["install"], PROJECT_ROOT, 180000);

      if (!installResult.success) {
        deployState.status = "error";
        deployState.error = `فشل تثبيت الاعتمادات: ${installResult.error}`;
        return NextResponse.json(
          { error: `فشل تثبيت الاعتمادات: ${installResult.error}` },
          { status: 500 }
        );
      }
    }

    deployState.progress = 60;
    deployState.message = "تم تثبيت الاعتمادات";

    // Step 3: Setup Prisma (70%)
    deployState.step = "prisma";
    deployState.message = "جاري تهيئة قاعدة البيانات...";
    deployState.progress = 65;

    // Check if prisma schema exists
    if (existsSync(join(PROJECT_ROOT, "prisma", "schema.prisma"))) {
      const prismaResult = await executeCommand("bun", ["run", "db:generate"], PROJECT_ROOT, 60000);

      if (!prismaResult.success) {
        // Don't fail, just log warning
        console.warn("Prisma generate warning:", prismaResult.error);
      }

      // Try to push schema
      const pushResult = await executeCommand("bun", ["run", "db:push"], PROJECT_ROOT, 60000);
      if (!pushResult.success) {
        console.warn("Prisma push warning:", pushResult.error);
      }
    }

    deployState.progress = 80;

    // Step 4: Copy database file if exists in source directory
    deployState.step = "database";
    deployState.message = "جاري نسخ ملف قاعدة البيانات...";

    const dbFile = join(sourceDir, "dev.db");
    if (existsSync(dbFile)) {
      await cp(dbFile, join(PROJECT_ROOT, "dev.db"));
    }

    // Also check for db folder with custom.db
    const customDbFile = join(sourceDir, "db", "custom.db");
    if (existsSync(customDbFile)) {
      await mkdir(join(PROJECT_ROOT, "db"), { recursive: true });
      await cp(customDbFile, join(PROJECT_ROOT, "db", "custom.db"));
    }

    deployState.progress = 90;

    // Step 5: Create restart signal file
    deployState.step = "restarting";
    deployState.message = "جاري إعداد إعادة التشغيل...";

    const restartFile = join(PROJECT_ROOT, ".restart");
    await writeFile(restartFile, new Date().toISOString());

    deployState.status = "completed";
    deployState.progress = 100;
    deployState.message = "تم النشر بنجاح! سيتم إعادة تحميل الصفحة...";
    deployState.step = "done";

    return NextResponse.json({
      success: true,
      message: "تم نشر النظام بنجاح",
      filesCopied,
      restartRequired: true,
    });
  } catch (error) {
    deployState.status = "error";
    deployState.error = error instanceof Error ? error.message : "خطأ غير معروف";
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطأ غير معروف" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: deployState.status,
    message: deployState.message,
    progress: deployState.progress,
    error: deployState.error,
    step: deployState.step,
  });
}
