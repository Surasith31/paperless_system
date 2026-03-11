// Email Service for sending OTP
import {
  ApprovalNotificationParams,
  ApprovalRequestParams,
  CompletionNotificationParams,
  EngineerAssignmentParams,
  RejectionNotificationParams,
  SendOTPEmailParams,
} from "@/models/email";
import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  // ตรวจสอบว่ามีการตั้งค่า SMTP หรือไม่
  if (
    !process.env["SMTP_HOST"] ||
    !process.env["SMTP_USER"] ||
    !process.env["SMTP_PASSWORD"]
  ) {
    console.warn("⚠️ SMTP configuration not found in environment variables");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env["SMTP_HOST"],
    port: Number(process.env["SMTP_PORT"]) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env["SMTP_USER"],
      pass: process.env["SMTP_PASSWORD"],
    },
  });
};

export async function sendOTPEmail({
  email,
  otp,
  name,
}: SendOTPEmailParams): Promise<boolean> {
  try {
    const transporter = createTransporter();

    // Development mode or no SMTP config: แสดง OTP ใน console
    if (!transporter) {
      return true;
    }

    // Production mode: ส่งอีเมลจริง
    const mailOptions = {
      from: `"Paperless System" <${
        process.env["EMAIL_FROM"] || process.env["SMTP_USER"]
      }>`,
      to: email,
      subject: "รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - Paperless System",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>รหัส OTP สำหรับรีเซ็ตรหัสผ่าน</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 รีเซ็ตรหัสผ่าน</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        สวัสดี <strong>${name || "คุณ"}</strong>,
                      </p>
                      
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี Paperless System กรุณาใช้รหัส OTP ด้านล่างนี้:
                      </p>
                      
                      <!-- OTP Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center" style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border: 2px dashed #667eea;">
                            <div style="font-size: 40px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                              ${otp}
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                        ⏰ <strong>รหัส OTP นี้จะหมดอายุภายใน 10 นาที</strong>
                      </p>
                      
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="color: #856404; font-size: 14px; margin: 0;">
                          ⚠️ หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่อการแจ้งเตือนนี้ บัญชีของคุณจะยังคงปลอดภัย
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px;">
                        ขอบคุณที่ใช้บริการ Paperless System
                      </p>
                      <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Paperless System. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      // Plain text version
      text: `
      สวัสดี ${name || "คุณ"},

      คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี Paperless System

      รหัส OTP ของคุณคือ: ${otp}

      รหัส OTP นี้จะหมดอายุภายใน 10 นาที

      หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่อการแจ้งเตือนนี้

      ขอบคุณที่ใช้บริการ Paperless System
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    return false;
  }
}

// ====================================
// 1. แจ้งเตือน Manager - มีเอกสารใหม่รออนุมัติ
// ====================================

export async function sendApprovalRequestEmail(
  params: ApprovalRequestParams
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return true;
    }

    const approvalLink = `${process.env["APP_URL"]}/page/manager`;

    const mailOptions = {
      from: `"Paperless System" <${
        process.env["EMAIL_FROM"] || process.env["SMTP_USER"]
      }>`,
      to: params.to,
      subject: `📄 [Paperless] เอกสารใหม่รออนุมัติ - ${params.documentTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📄 เอกสารใหม่รออนุมัติ</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        สวัสดีคุณ <strong>${params.managerName}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        มีเอกสารใหม่ส่งมาเพื่อขออนุมัติจากคุณ กรุณาตรวจสอบและพิจารณาอนุมัติ
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">เอกสาร:</strong> ${
                              params.documentTitle
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">ผู้ส่ง:</strong> ${
                              params.senderName
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">วันที่:</strong> ${
                              params.createdAt
                            }</p>
                            ${
                              params.description
                                ? `<p style="margin: 10px 0 0; color: #666;"><strong style="color: #333;">รายละเอียด:</strong><br>${params.description}</p>`
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${approvalLink}" style="display: inline-block; padding: 15px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                              ดูและอนุมัติเอกสาร
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px;">
                        ขอบคุณที่ใช้บริการ Paperless System
                      </p>
                      <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Paperless System. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
สวัสดีคุณ ${params.managerName},

มีเอกสารใหม่ส่งมาเพื่อขออนุมัติจากคุณ

เอกสาร: ${params.documentTitle}
ผู้ส่ง: ${params.senderName}
วันที่: ${params.createdAt}
${params.description ? `รายละเอียด: ${params.description}` : ""}

กรุณาเข้าสู่ระบบเพื่ออนุมัติเอกสาร: ${approvalLink}

ขอบคุณที่ใช้บริการ Paperless System
      `,
    };

    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("❌ Error sending approval request email:", error);
    return false;
  }
}

// ====================================
// 2. แจ้งเตือน Sell - เอกสารได้รับการอนุมัติแล้ว
// ====================================

export async function sendApprovalNotificationEmail(
  params: ApprovalNotificationParams
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return true;
    }

    const documentsLink = `${process.env["APP_URL"]}/page/sell/my-documents`;

    const mailOptions = {
      from: `"Paperless System" <${
        process.env["EMAIL_FROM"] || process.env["SMTP_USER"]
      }>`,
      to: params.to,
      subject: `✅ [Paperless] เอกสารได้รับการอนุมัติ - ${params.documentTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ เอกสารได้รับการอนุมัติ</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        สวัสดีคุณ <strong>${params.sellName}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        เอกสารของคุณได้รับการอนุมัติแล้ว 🎉
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">เอกสาร:</strong> ${
                              params.documentTitle
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">ผู้อนุมัติ:</strong> ${
                              params.approverName
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">วันที่อนุมัติ:</strong> ${
                              params.approvedAt
                            }</p>
                            ${
                              params.comment
                                ? `<p style="margin: 10px 0 0; color: #666;"><strong style="color: #333;">ความเห็น:</strong><br>${params.comment}</p>`
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${documentsLink}" style="display: inline-block; padding: 15px 40px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                              ดูสถานะเอกสาร
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px;">
                        ขอบคุณที่ใช้บริการ Paperless System
                      </p>
                      <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Paperless System. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
สวัสดีคุณ ${params.sellName},

เอกสารของคุณได้รับการอนุมัติแล้ว

เอกสาร: ${params.documentTitle}
ผู้อนุมัติ: ${params.approverName}
วันที่อนุมัติ: ${params.approvedAt}
${params.comment ? `ความเห็น: ${params.comment}` : ""}

ดูสถานะเอกสาร: ${documentsLink}

ขอบคุณที่ใช้บริการ Paperless System
      `,
    };

    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("❌ Error sending approval notification email:", error);
    return false;
  }
}

// ====================================
// 3. แจ้งเตือน Sell - เอกสารถูกปฏิเสธ
// ====================================

export async function sendRejectionNotificationEmail(
  params: RejectionNotificationParams
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return true;
    }

    const documentsLink = `${process.env["APP_URL"]}/page/sell/my-documents`;

    const mailOptions = {
      from: `"Paperless System" <${
        process.env["EMAIL_FROM"] || process.env["SMTP_USER"]
      }>`,
      to: params.to,
      subject: `❌ [Paperless] เอกสารถูกปฏิเสธ - ${params.documentTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">❌ เอกสารถูกปฏิเสธ</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        สวัสดีคุณ <strong>${params.sellName}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        เอกสารของคุณถูกปฏิเสธ กรุณาตรวจสอบเหตุผลและปรับปรุงเอกสาร
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">เอกสาร:</strong> ${
                              params.documentTitle
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">ผู้ปฏิเสธ:</strong> ${
                              params.rejectedBy
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">วันที่:</strong> ${
                              params.rejectedAt
                            }</p>
                            ${
                              params.reason
                                ? `<p style="margin: 10px 0 0; color: #991b1b; background-color: #fee2e2; padding: 15px; border-radius: 6px;"><strong style="color: #991b1b;">เหตุผล:</strong><br>${params.reason}</p>`
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${documentsLink}" style="display: inline-block; padding: 15px 40px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                              ดูรายละเอียด
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px;">
                        ขอบคุณที่ใช้บริการ Paperless System
                      </p>
                      <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Paperless System. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
สวัสดีคุณ ${params.sellName},

เอกสารของคุณถูกปฏิเสธ

เอกสาร: ${params.documentTitle}
ผู้ปฏิเสธ: ${params.rejectedBy}
วันที่: ${params.rejectedAt}
${params.reason ? `เหตุผล: ${params.reason}` : ""}

ดูรายละเอียด: ${documentsLink}

ขอบคุณที่ใช้บริการ Paperless System
      `,
    };

    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("❌ Error sending rejection notification email:", error);
    return false;
  }
}

// ====================================
// 4. แจ้งเตือน Engineer - มีงานใหม่มอบหมาย
// ====================================

export async function sendEngineerAssignmentEmail(
  params: EngineerAssignmentParams
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return true;
    }

    const workLink = `${process.env["APP_URL"]}/page/engineer`;

    const mailOptions = {
      from: `"Paperless System" <${
        process.env["EMAIL_FROM"] || process.env["SMTP_USER"]
      }>`,
      to: params.to,
      subject: `🔧 [Paperless] งานใหม่มอบหมายให้คุณ - ${params.documentTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔧 งานใหม่มอบหมาย</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        สวัสดีคุณ <strong>${params.engineerName}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        มีงานใหม่ถูกมอบหมายให้คุณ กรุณาตรวจสอบและดำเนินการ
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">เอกสาร:</strong> ${
                              params.documentTitle
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">มอบหมายโดย:</strong> ${
                              params.assignedBy
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">วันที่มอบหมาย:</strong> ${
                              params.assignedAt
                            }</p>
                            ${
                              params.description
                                ? `<p style="margin: 10px 0 0; color: #666;"><strong style="color: #333;">รายละเอียด:</strong><br>${params.description}</p>`
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${workLink}" style="display: inline-block; padding: 15px 40px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                              ดูงานและดำเนินการ
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px;">
                        ขอบคุณที่ใช้บริการ Paperless System
                      </p>
                      <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Paperless System. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
สวัสดีคุณ ${params.engineerName},

มีงานใหม่ถูกมอบหมายให้คุณ

เอกสาร: ${params.documentTitle}
มอบหมายโดย: ${params.assignedBy}
วันที่มอบหมาย: ${params.assignedAt}
${params.description ? `รายละเอียด: ${params.description}` : ""}

ดูงานและดำเนินการ: ${workLink}

ขอบคุณที่ใช้บริการ Paperless System
      `,
    };
    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("❌ Error sending engineer assignment email:", error);
    return false;
  }
}

// ====================================
// 5. แจ้งเตือน Sell - งานเสร็จสมบูรณ์
// ====================================

export async function sendCompletionNotificationEmail(
  params: CompletionNotificationParams
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return true;
    }

    // กำหนด link ตาม role
    const documentsLink =
      params.role === "sell"
        ? `${process.env["APP_URL"]}/page/sell/my-documents` // สำหรับ Sell
        : `${process.env["APP_URL"]}/page/manager/approval-history`; // สำหรับ Manager

    const mailOptions = {
      from: `"Paperless System" <${
        process.env["EMAIL_FROM"] || process.env["SMTP_USER"]
      }>`,
      to: params.to,
      subject: `🎉 [Paperless] งานเสร็จสมบูรณ์ - ${params.documentTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 งานเสร็จสมบูรณ์</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        สวัสดีคุณ <strong>${params.sellName}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        เอกสารของคุณได้รับการดำเนินการเสร็จสมบูรณ์แล้ว 🎊
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf5ff; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">เอกสาร:</strong> ${
                              params.documentTitle
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">ดำเนินการโดย:</strong> ${
                              params.completedBy
                            }</p>
                            <p style="margin: 0 0 10px; color: #666;"><strong style="color: #333;">วันที่เสร็จสิ้น:</strong> ${
                              params.completedAt
                            }</p>
                            ${
                              params.comment
                                ? `<p style="margin: 10px 0 0; color: #666;"><strong style="color: #333;">หมายเหตุ:</strong><br>${params.comment}</p>`
                                : ""
                            }
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${documentsLink}" style="display: inline-block; padding: 15px 40px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                              ดูผลการทำงาน
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px;">
                        ขอบคุณที่ใช้บริการ Paperless System
                      </p>
                      <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Paperless System. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
สวัสดีคุณ ${params.sellName},

เอกสารของคุณได้รับการดำเนินการเสร็จสมบูรณ์แล้ว

เอกสาร: ${params.documentTitle}
ดำเนินการโดย: ${params.completedBy}
วันที่เสร็จสิ้น: ${params.completedAt}
${params.comment ? `หมายเหตุ: ${params.comment}` : ""}

ดูผลการทำงาน: ${documentsLink}

ขอบคุณที่ใช้บริการ Paperless System
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("❌ Error sending completion notification email:", error);
    return false;
  }
}
