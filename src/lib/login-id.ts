/**
 * Login ID Auto-Generation
 * 
 * Format: OI + first 2 letters of first name + first 2 letters of last name 
 *         + year of joining + 4-digit serial number
 * 
 * Example: OIJODO20220001
 * - OI = prefix
 * - JO = first 2 of "John"
 * - DO = first 2 of "Doe"
 * - 2022 = year of joining
 * - 0001 = serial number
 */

import { prisma } from "./prisma";

/**
 * Generate a login ID for a new employee.
 * 
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name
 * @param dateOfJoining - Employee's date of joining
 * @returns Auto-generated login ID string
 */
export async function generateLoginId(
  firstName: string,
  lastName: string,
  dateOfJoining: Date
): Promise<string> {
  const prefix = "OI";
  const firstTwo = firstName.substring(0, 2).toUpperCase();
  const lastTwo = lastName.substring(0, 2).toUpperCase();
  const joinYear = dateOfJoining.getFullYear().toString();

  // Find existing login IDs with the same prefix pattern to determine serial number
  const pattern = `${prefix}${firstTwo}${lastTwo}${joinYear}`;

  const existingCount = await prisma.employee.count({
    where: {
      loginId: {
        startsWith: pattern,
      },
    },
  });

  const serialNumber = (existingCount + 1).toString().padStart(4, "0");

  return `${pattern}${serialNumber}`;
}

/**
 * Generate a login ID synchronously (for seed data where we know the serial).
 * 
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name  
 * @param dateOfJoining - Employee's date of joining
 * @param serial - The serial number to use
 * @returns Auto-generated login ID string
 */
export function generateLoginIdSync(
  firstName: string,
  lastName: string,
  dateOfJoining: Date,
  serial: number
): string {
  const prefix = "OI";
  const firstTwo = firstName.substring(0, 2).toUpperCase();
  const lastTwo = lastName.substring(0, 2).toUpperCase();
  const joinYear = dateOfJoining.getFullYear().toString();
  const serialNumber = serial.toString().padStart(4, "0");

  return `${prefix}${firstTwo}${lastTwo}${joinYear}${serialNumber}`;
}
