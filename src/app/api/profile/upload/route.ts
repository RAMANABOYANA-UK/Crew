import { NextRequest, NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    let fileBuffer: Buffer;
    let mimeType: string;
    let fileName: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, message: "No file uploaded. Please include 'file' in form data." },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid file type: ${file.type}. Allowed formats: JPEG, PNG, WebP, GIF.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: `File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB).`,
          },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      mimeType = file.type;
      const ext = path.extname(file.name) || ".jpg";
      fileName = `profile_${employee.id}_${Date.now()}${ext}`;
    } else {
      // JSON Base64 payload support
      const body = await req.json();
      const { imageBase64, mimeType: providedMime = "image/jpeg" } = body;

      if (!imageBase64) {
        return NextResponse.json(
          { success: false, message: "Missing imageBase64 in request body." },
          { status: 400 }
        );
      }

      mimeType = providedMime;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid mime type: ${mimeType}. Allowed formats: JPEG, PNG, WebP, GIF.`,
          },
          { status: 400 }
        );
      }

      // Strip data url prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      fileBuffer = Buffer.from(base64Data, "base64");

      if (fileBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: `Image exceeds 5MB size limit.`,
          },
          { status: 400 }
        );
      }

      const ext = mimeType.split("/")[1] || "jpg";
      fileName = `profile_${employee.id}_${Date.now()}.${ext}`;
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "profile-pictures");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);

    const publicUrl = `/uploads/profile-pictures/${fileName}`;

    // Update employee record
    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: { profilePic: publicUrl, profilePicture: publicUrl },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            loginId: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile picture uploaded and updated successfully.",
      data: {
        url: publicUrl,
        employee: updatedEmployee,
      },
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during image upload" },
      { status: 500 }
    );
  }
}
