import { NextResponse } from "next/server";
import { syncUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Sync failed" },
      { status: 500 }
    );
  }
}