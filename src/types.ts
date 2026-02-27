import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CommissionItem {
  id: string;
  name: string;
  basePrice: number;
  quantity?: number;
  subType?: string;
  isFullBody?: boolean;
  hasAiFile?: boolean;
  customPrice?: number;
  noMultiplier?: boolean;
}

export interface AddOn {
  propSmall: number;
  propLarge: number;
  customDesignPrice: number;
}

export interface Order {
  id: string;
  clientName: string;
  clientContact: string;
  contactType: string; // Facebook, X, Discord, etc.
  items: CommissionItem[];
  multiplier: number; // 1, 1.5, 2
  addOns: AddOn;
  totalPrice: number;
  date: string;
  deadline: string;
  status: QueueStatus;
}

export enum QueueStatus {
  AWAITING_DEPOSIT = "รอชำระมัดจำ",
  BRIEFING = "บรีฟงาน",
  DRAFT = "ร่างภาพ",
  LINEART = "ตัดเส้น",
  BASE_COLOR = "ลงสีพื้น",
  MOTION_COLOR = "ลงสี/ขยับ",
  FINISHED = "เสร็จสมบูรณ์",
}

export const STATUS_COLORS: Record<QueueStatus, string> = {
  [QueueStatus.AWAITING_DEPOSIT]: "bg-[#FFB6C1] text-[#8B0000] border-[#FF69B4]", // LightPink
  [QueueStatus.BRIEFING]: "bg-[#FFE4E1] text-[#CD5C5C] border-[#FFB6C1]",
  [QueueStatus.DRAFT]: "bg-[#FFEBCD] text-[#D2691E] border-[#F5DEB3]",
  [QueueStatus.LINEART]: "bg-[#FFF8DC] text-[#DAA520] border-[#EEE8AA]",
  [QueueStatus.BASE_COLOR]: "bg-[#E0FFF0] text-[#2E8B57] border-[#98FB98]",
  [QueueStatus.MOTION_COLOR]: "bg-[#E6E6FA] text-[#9370DB] border-[#D8BFD8]",
  [QueueStatus.FINISHED]: "bg-[#F0FFF0] text-[#556B2F] border-[#8FBC8F]",
};
