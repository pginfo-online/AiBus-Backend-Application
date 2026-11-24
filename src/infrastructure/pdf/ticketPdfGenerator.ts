import PDFDocument from "pdfkit";
import path from "node:path";
import fs from "node:fs";

export interface TicketPdfData {
  bookingNumber: string;
  ticketNumber: string;
  pnrNumber: string;
  operatorName: string;
  busType: string;
  journeyDate: string;
  fromCityName: string;
  toCityName: string;
  pickupLocation: string;
  pickupTime: string;
  dropoffLocation: string;
  dropoffTime: string;
  totalFare: number | string | unknown;
  baseFare?: number | string | unknown;
  operatorGst?: number | string | unknown;
  serviceTax?: number | string | unknown;
  discountAmount?: number | string | unknown;
  walletAmount?: number | string | unknown;
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  confirmedAt?: string | Date | null;
  serviceId?: string | number | null;
  tripId?: string | null;
  busId?: string | number | null;
  operatorGstin?: string | null;
  operatorHelpline?: string | null;
  pickupSnapshot?: unknown;
  dropoffSnapshot?: unknown;
  cancellationPolicy?: unknown;
  passengers: { name: string; age: number; gender: string; seatNo: string; cancelled?: boolean }[];
}

function formatInr(val: number | string): string {
  const num = Number(val) || 0;
  return "Rs. " + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateStr(dateStr?: string | Date | null): string {
  if (!dateStr || String(dateStr).includes("Invalid")) {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  try {
    const clean = String(dateStr).trim().split(/[T ]/)[0];
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split(/[-/]/).map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {
    // fallback
  }
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeStr(dateVal?: string | Date | null): string {
  const d = dateVal && !String(dateVal).includes("Invalid") ? new Date(dateVal) : new Date();
  const safeDate = isNaN(d.getTime()) ? new Date() : d;
  const dStr = safeDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const tStr = safeDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dStr}, ${tStr}`;
}

function calcReportingTime(timeStr?: string): string {
  if (!timeStr || !timeStr.includes(":")) return "21:15";
  try {
    const [h, m] = timeStr.split(":").map(Number);
    let totalMins = h * 60 + m - 15;
    if (totalMins < 0) totalMins += 24 * 60;
    const repH = String(Math.floor(totalMins / 60)).padStart(2, "0");
    const repM = String(totalMins % 60).padStart(2, "0");
    return `${repH}:${repM}`;
  } catch {
    return timeStr;
  }
}

export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 25,
      info: { Title: `AiBus Ticket ${data.ticketNumber}`, Author: "AiBus" },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const fontPath = path.resolve(__dirname, "../../../assets/fonts/NotoSansDevanagari.ttf");
      const hasCustomFont = fs.existsSync(fontPath);
      if (hasCustomFont) {
        doc.registerFont("Unicode", fontPath);
      }

      const totalFare = Number(data.totalFare) || 0;
      const discount = Number(data.discountAmount) || 0;
      const walletPromo = Number(data.walletAmount) || 0;
      const totalSaved = discount + walletPromo;

      let gst = Number(data.operatorGst || data.serviceTax || 0);
      if (!gst && totalFare > 0) {
        gst = Math.round((totalFare * 5) / 105);
      }

      let basicFare = Number(data.baseFare || 0);
      if (!basicFare && totalFare > 0) {
        basicFare = totalFare - gst + discount + walletPromo;
      }

      const pickup = (data.pickupSnapshot || {}) as Record<string, unknown>;
      const dropoff = (data.dropoffSnapshot || {}) as Record<string, unknown>;

      const pickupAddr = String(pickup.address || data.pickupLocation || "Main Boarding Point");
      const pickupContact = String(pickup.contact || data.contactPhone || "9371036617");
      const dropoffAddr = String(dropoff.address || data.dropoffLocation || "Destination Terminal");

      const depDateStr = formatDateStr(data.journeyDate);
      const bookedOnStr = formatDateTimeStr(data.confirmedAt || data.createdAt);
      const repTime = calcReportingTime(data.pickupTime);

      const x = 30;
      const w = 535;
      const pageHeight = 792;

      // ==========================================
      // PAGE 1: ABHIBUS FORMAT TICKET
      // ==========================================
      // Outer Page Border
      doc.rect(x, 25, w, pageHeight).strokeColor("#777777").lineWidth(0.8).stroke();

      let y = 38;

      // 1. BRAND HEADER & APP ICONS
      doc.font("Helvetica-Bold").fontSize(22).fillColor("#d84e55").text("aibus", x + 15, y);
      
      // Store Badges (Google Play & App Store representation)
      const storeX = x + w - 100;
      doc.roundedRect(storeX, y + 2, 38, 20, 3).strokeColor("#cccccc").lineWidth(0.5).stroke();
      doc.font("Helvetica-Bold").fontSize(6).fillColor("#333333").text("Google Play", storeX + 2, y + 8, { width: 34, align: "center" });

      doc.roundedRect(storeX + 44, y + 2, 38, 20, 3).strokeColor("#cccccc").lineWidth(0.5).stroke();
      doc.font("Helvetica-Bold").fontSize(6).fillColor("#333333").text("App Store", storeX + 46, y + 8, { width: 34, align: "center" });

      y += 34;
      doc.moveTo(x + 12, y).lineTo(x + w - 12, y).strokeColor("#dddddd").lineWidth(0.6).stroke();
      y += 8;

      // 2. TICKET META BAR
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#222222").text("AiBus Ticket", x + 15, y);
      doc.font("Helvetica").fontSize(9).fillColor("#555555").text(`Booked on ${bookedOnStr}`, x + 15, y + 14);

      doc.font("Helvetica").fontSize(8.5).fillColor("#555555").text("AiBus Booking ID: ", x + w - 240, y, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#222222").text(String(data.bookingNumber || "AZ5865583147"));

      doc.font("Helvetica").fontSize(8.5).fillColor("#555555").text("Ticket Number: ", x + w - 240, y + 12, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#222222").text(String(data.ticketNumber || data.pnrNumber || "5026271054"));

      doc.font("Helvetica").fontSize(8.5).fillColor("#555555").text("Bus Partner PNR: ", x + w - 240, y + 24, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#222222").text(String(data.pnrNumber || "414539818-626815"));

      y += 42;
      doc.moveTo(x + 12, y).lineTo(x + w - 12, y).strokeColor("#dddddd").lineWidth(0.6).stroke();
      y += 8;

      // 3. OPERATOR & SERVICE INFO
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#222222").text(String(data.operatorName || "Online go"), x + 15, y);
      doc.font("Helvetica").fontSize(8.5).fillColor("#444444").text(String(data.busType || "Ashok leyland, NON-AC, Seater"), x + 15, y + 13);
      doc.font("Helvetica").fontSize(8.5).fillColor("#444444").text("Bus Start Time: ", x + 15, y + 25, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#222222").text(String(data.pickupTime || "21:00"));

      // Right column
      const srvNo = String(data.serviceId || data.busId || "117089");
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#222222").text(`Service # ${srvNo}`, x + w - 250, y, { align: "right", width: 235 });
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333").text(`${data.fromCityName || "Pune"} - ${data.toCityName || "Nanded"}`, x + w - 250, y + 13, { align: "right", width: 235 });
      
      const gstin = data.operatorGstin || "27APPPP5097J2ZZ";
      doc.font("Helvetica").fontSize(8).fillColor("#555555").text(`Bus Partner GSTIN: ${gstin}`, x + w - 250, y + 25, { align: "right", width: 235 });
      
      const helpline = data.operatorHelpline || "9209081234";
      doc.font("Helvetica").fontSize(8).fillColor("#555555").text("Bus Partner Helpline Number: ", x + w - 250, y + 36, { align: "right", width: 170, continued: true });
      doc.font("Helvetica-Bold").fillColor("#0284c7").text(helpline);

      y += 52;
      doc.moveTo(x + 12, y).lineTo(x + w - 12, y).strokeColor("#dddddd").lineWidth(0.6).stroke();
      y += 10;

      // 4. JOURNEY GRID: DEPARTURE -> BOARDING POINT -> ARRIVAL -> DROPPING POINT
      // Col 1: Departure
      doc.font("Helvetica").fontSize(8).fillColor("#777777").text("Departure ", x + 15, y, { continued: true });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text(String(data.fromCityName || "Pune"));
      doc.font("Helvetica").fontSize(8).fillColor("#444444").text(depDateStr, x + 15, y + 12);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#222222").text(String(data.pickupTime || "21:30"), x + 15, y + 23);

      // Col 2: Boarding Point
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text("Boarding Point:", x + 115, y);
      const boardingText = [pickupAddr, pickupContact ? `Tel: ${pickupContact}` : ""].filter(Boolean).join("\n");
      doc.font("Helvetica").fontSize(7.5).fillColor("#444444").text(boardingText, x + 115, y + 12, { width: 145 });

      // Center Arrow
      doc.font("Helvetica-Bold").fontSize(14).fillColor("#b71c1c").text("->", x + 270, y + 10);

      // Col 3: Arrival
      doc.font("Helvetica").fontSize(8).fillColor("#777777").text("Arrival", x + 310, y);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text(String(data.toCityName || "Nanded"), x + 310, y + 11);
      doc.font("Helvetica").fontSize(8).fillColor("#444444").text(`${depDateStr} ${data.dropoffTime || "10:28"}`, x + 310, y + 23);

      // Col 4: Dropping Point
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text("Dropping Point:", x + 415, y);
      doc.font("Helvetica").fontSize(7.5).fillColor("#444444").text(dropoffAddr, x + 415, y + 12, { width: 105 });

      y += 62;
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#333333").text(`*Reporting Time at the boarding Point- ${repTime}`, x + 15, y);

      y += 16;
      doc.moveTo(x + 12, y).lineTo(x + w - 12, y).strokeColor("#dddddd").lineWidth(0.6).stroke();
      y += 10;

      // 5. TWO SIDE-BY-SIDE TABLES (PASSENGER DETAILS & PAYMENT DETAILS)
      const colW = (w - 36) / 2; // 249.5
      const leftColX = x + 12;
      const rightColX = x + 18 + colW;

      // Header Bar - Passenger Details
      doc.rect(leftColX, y, colW, 18).fill("#efefef");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text("Passenger Details", leftColX + 8, y + 4);

      // Header Bar - Payment Details
      doc.rect(rightColX, y, colW, 18).fill("#efefef");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text("Payment Details", rightColX + 8, y + 4);

      y += 24;
      const tableContentTop = y;

      // Passenger Sub-headers
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#555555");
      doc.text("Name", leftColX + 6, y, { width: 110 });
      doc.text("Gender", leftColX + 118, y, { width: 45 });
      doc.text("Age", leftColX + 165, y, { width: 30 });
      doc.text("Seat No", leftColX + 200, y, { width: 45, align: "right" });

      let passY = y + 14;
      for (const p of data.passengers) {
        doc.font("Helvetica").fontSize(7.5).fillColor("#222222");
        doc.text(p.name, leftColX + 6, passY, { width: 110 });
        doc.text(p.gender === "F" || p.gender === "Female" ? "Female" : "Male", leftColX + 118, passY, { width: 45 });
        doc.text(String(p.age || 25), leftColX + 165, passY, { width: 30 });
        doc.font("Helvetica-Bold").text(String(p.seatNo || "—"), leftColX + 200, passY, { width: 45, align: "right" });
        passY += 15;
      }

      // Payment Details Rows
      let payY = tableContentTop;
      const payLabelX = rightColX + 6;
      const payValW = 100;
      const payValX = rightColX + colW - payValW - 6;

      const printPayLine = (lbl: string, val: string, isNegative = false, isBold = false) => {
        doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(isBold ? "#222222" : "#444444").text(lbl, payLabelX, payY);
        doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(isBold ? (isNegative ? "#2e7d32" : "#222222") : "#333333").text(val, payValX, payY, { width: payValW, align: "right" });
        payY += 14;
      };

      printPayLine("Basic Fare", formatInr(basicFare));
      printPayLine("Bus Partner GST", formatInr(gst));
      if (discount > 0) {
        printPayLine("Coupon Discount", `(-)Rs. ${discount.toFixed(2)}`, true);
      }
      if (walletPromo > 0) {
        printPayLine("AiBus Cash (promo)", `(-)Rs. ${walletPromo.toFixed(2)}`, true);
      }

      doc.moveTo(rightColX + 4, payY).lineTo(rightColX + colW - 4, payY).strokeColor("#dddddd").lineWidth(0.5).stroke();
      payY += 4;

      // Amount Paid in Red bold
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#222222").text("Amount Paid", payLabelX, payY);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#d32f2f").text(formatInr(totalFare), payValX, payY, { width: payValW, align: "right" });
      payY += 18;

      // Savings Box
      if (totalSaved > 0) {
        doc.rect(rightColX + 6, payY, colW - 12, 30).strokeColor("#4caf50").lineWidth(0.8).fillAndStroke("#f1f8e9", "#4caf50");
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#2e7d32").text(`You Saved Rs. ${totalSaved.toFixed(0)} Via aibus`, rightColX + 8, payY + 5, { width: colW - 16, align: "center" });
        doc.font("Helvetica").fontSize(7).fillColor("#388e3c").text(`(Rs. ${discount.toFixed(2)} + Rs. ${walletPromo.toFixed(2)} promo aibus)`, rightColX + 8, payY + 17, { width: colW - 16, align: "center" });
        payY += 36;
      }

      y = Math.max(passY, payY) + 12;
      doc.moveTo(x + 12, y).lineTo(x + w - 12, y).strokeColor("#dddddd").lineWidth(0.6).stroke();
      y += 10;

      // 6. IMPORTANT INFORMATION
      doc.rect(x + 12, y, w - 24, 18).fill("#efefef");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text("Important information", x + 20, y + 4);

      y += 24;
      doc.font("Helvetica").fontSize(7.5).fillColor("#333333");
      doc.text("• Please reach the boarding point by the reporting time", x + 20, y);
      y += 13;
      doc.text("• Chat with us https://aibus.com/chat", x + 20, y);
      y += 13;
      doc.text("• In case Operator is not reachable please reach out to AiBus Customer Support at 040-61656789", x + 20, y);

      y += 20;
      doc.moveTo(x + 12, y).lineTo(x + w - 12, y).strokeColor("#dddddd").lineWidth(0.6).stroke();
      y += 10;

      // 7. TERMS & CONDITIONS AND CANCELLATION POLICY
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text("Terms and Conditions", leftColX + 6, y);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222").text("Cancellation Policy", rightColX + 6, y);

      y += 14;
      // Terms Column Left
      doc.font("Helvetica").fontSize(7).fillColor("#444444");
      doc.text("• The arrival and departure times mentioned on the ticket are only tentative timings.", leftColX + 6, y, { width: colW - 14 });
      doc.text("• Passengers are requested to arrive at the boarding point at least 15 min. before the scheduled time of departure.", leftColX + 6, y + 24, { width: colW - 14 });

      // Cancellation Column Right
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#444444");
      doc.text("Cancellation Time", rightColX + 6, y, { width: 100 });
      doc.text("Refund (%)", rightColX + 115, y, { width: 50 });
      doc.text("Refund Amount", rightColX + 175, y, { width: 65, align: "right" });

      doc.font("Helvetica").fontSize(7).fillColor("#555555");
      doc.text(`After ${depDateStr} 09:00`, rightColX + 6, y + 12, { width: 100 });
      doc.text("0%", rightColX + 115, y + 12, { width: 50 });
      doc.text("Rs. 0", rightColX + 175, y + 12, { width: 65, align: "right" });

      doc.font("Helvetica").fontSize(6.5).fillColor("#777777");
      doc.text("Additional Cancellation Charge of Rs. 15 per seat is applicable", rightColX + 6, y + 30, { width: colW - 12 });

      // ==========================================
      // PAGE 2: TERMS AND LEGAL CONDITIONS
      // ==========================================
      doc.addPage();
      doc.rect(x, 25, w, pageHeight).strokeColor("#777777").lineWidth(0.8).stroke();

      let p2Y = 45;
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#222222").text("AiBus Terms & Conditions", x + 20, p2Y);
      p2Y += 24;

      const bulletPoints = [
        "AiBus is not responsible for any accidents or loss of passenger belongings.",
        "AiBus is not responsible for any delay or inconvenience during the journey due to breakdown of the vehicle or other reasons beyond the control of AiBus.",
        "If a bus/service is canceled, for tickets booked through AiBus, the refund money is transferred back to the passenger's Credit/Debit card or Bank Account used for booking.",
        "Cancellation charges are applicable on Original fare but not on the Discounted Fare.",
        "Any complaints/grievances related to journey should be reported within a week from date of journey.",
        "For detailed AiBus Terms and Conditions, Please Click Here https://www.aibus.com/terms.",
      ];

      for (const bullet of bulletPoints) {
        doc.font("Helvetica").fontSize(8.5).fillColor("#333333").text(`• ${bullet}`, x + 20, p2Y, {
          width: w - 40,
          lineGap: 4,
        });
        p2Y += 34;
      }

      // Footer
      doc.font("Helvetica").fontSize(8).fillColor("#777777").text(
        "Copyright © AiBus Technologies Ltd. All Rights Reserved.",
        x + 20,
        pageHeight - 20,
        { width: w - 40, align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
      doc.end();
    }
  });
}
