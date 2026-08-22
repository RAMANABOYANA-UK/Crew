import { NextResponse } from "next/server";
import { syncEmployee } from "@/lib/auth";

export async function POST() {
  try {
    const employee = await syncEmployee();

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { success: false, message: "Sync failed" },
      { status: 500 }
    );
  }
}