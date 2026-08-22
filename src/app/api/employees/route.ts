import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.employee.findMany({
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: employees });
}
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>

<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
The user wants example code for Ansible on AWS — showing how to use Ansible to provision EC2 instances and deploy a simple application. Let me write a README-style guide with clear examples, along with basic YAML playbooks.

This directory contains an Ansible project. Let me first inspect the current structure to understand the context before creating or modifying files.Let me look at the existing files to understand the current setup and context before making changes.

<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
</｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
[File list requested]
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
<｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
</｜DSML｜>
<｜DSML｜>
<｜DSML｜>
</｜DSML｜>
<check_results>
<result>
<status>SUCCESS</status>
<content>