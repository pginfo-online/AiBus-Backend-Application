"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTicketPdf = generateTicketPdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * Generates an enterprise-styled, print-ready PDF e-ticket using PDFKit.
 * Returns a Buffer containing the complete binary PDF data.
 */
async function generateTicketPdf(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 40,
                info: {
                    Title: `AiBus Ticket - ${data.ticketNumber}`,
                    Author: 'AiBus Booking Platform',
                    Subject: `Bus Travel Ticket ${data.pnrNumber}`,
                },
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            // Brand Colors
            const primaryColor = '#1e3a8a'; // Deep Navy
            const accentColor = '#0284c7'; // Sky Blue
            const darkColor = '#0f172a'; // Slate Dark
            const lightBg = '#f8fafc'; // Off-white / light slate
            const grayColor = '#64748b'; // Muted slate
            // Header Banner
            doc.rect(40, 40, 515, 60).fill(primaryColor);
            doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('AiBus', 55, 52);
            doc.fontSize(10).font('Helvetica').text('ENTERPRISE TRAVEL SERVICES', 55, 78);
            doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('E-TICKET / BOARDING PASS', 350, 55, { align: 'right', width: 190 });
            doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 350, 75, { align: 'right', width: 190 });
            // Booking Reference Cards
            let y = 115;
            doc.rect(40, y, 515, 65).fill(lightBg).stroke('#cbd5e1');
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('PNR NUMBER', 55, y + 12);
            doc.fillColor(darkColor).fontSize(14).font('Helvetica-Bold').text(data.pnrNumber, 55, y + 26);
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('TICKET NUMBER', 200, y + 12);
            doc.fillColor(darkColor).fontSize(14).font('Helvetica-Bold').text(data.ticketNumber, 200, y + 26);
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('BOOKING ID', 350, y + 12);
            doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text(data.bookingNumber, 350, y + 28);
            // Journey Details Section
            y = 195;
            doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('JOURNEY & OPERATOR DETAILS', 40, y);
            doc.moveTo(40, y + 16).lineTo(555, y + 16).strokeColor('#e2e8f0').stroke();
            y += 25;
            doc.rect(40, y, 515, 90).fill(lightBg).stroke('#e2e8f0');
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('OPERATOR', 55, y + 10);
            doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text(data.operatorName, 55, y + 24);
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('BUS TYPE', 240, y + 10);
            doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text(data.busType, 240, y + 24, { width: 150 });
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('DATE OF JOURNEY', 410, y + 10);
            doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text(data.journeyDate, 410, y + 24);
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('BOARDING POINT & TIME', 55, y + 50);
            doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text(`${data.pickupLocation} (${data.pickupTime})`, 55, y + 64, { width: 175 });
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('DROPOFF POINT & TIME', 240, y + 50);
            doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text(`${data.dropoffLocation} (${data.dropoffTime})`, 240, y + 64, { width: 160 });
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('ROUTE', 410, y + 50);
            doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold').text(`${data.fromCityName} → ${data.toCityName}`, 410, y + 64);
            // Passenger Details Table
            y = 325;
            doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('PASSENGER INFORMATION', 40, y);
            doc.moveTo(40, y + 16).lineTo(555, y + 16).strokeColor('#e2e8f0').stroke();
            y += 24;
            // Table Header
            doc.rect(40, y, 515, 22).fill(primaryColor);
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
                .text('SL', 50, y + 6)
                .text('PASSENGER NAME', 90, y + 6)
                .text('AGE', 280, y + 6)
                .text('GENDER', 340, y + 6)
                .text('SEAT NO', 420, y + 6);
            y += 22;
            data.passengers.forEach((p, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                doc.rect(40, y, 515, 22).fill(rowBg).stroke('#e2e8f0');
                doc.fillColor(darkColor).fontSize(9).font('Helvetica')
                    .text(String(idx + 1), 50, y + 6)
                    .text(p.name, 90, y + 6, { width: 180 })
                    .text(String(p.age), 280, y + 6)
                    .text(p.gender === 'F' ? 'Female' : 'Male', 340, y + 6)
                    .font('Helvetica-Bold')
                    .text(p.seatNo, 420, y + 6);
                y += 22;
            });
            // Contact & Fare Summary
            y += 15;
            doc.rect(40, y, 250, 75).fill(lightBg).stroke('#e2e8f0');
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('PRIMARY CONTACT', 50, y + 10);
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('Name:', 50, y + 28);
            doc.fillColor(darkColor).font('Helvetica-Bold').text(data.contactName, 90, y + 28);
            doc.fillColor(grayColor).font('Helvetica').text('Phone:', 50, y + 44);
            doc.fillColor(darkColor).font('Helvetica-Bold').text(data.contactPhone, 90, y + 44);
            doc.rect(305, y, 250, 75).fill(lightBg).stroke('#e2e8f0');
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('FARE SUMMARY', 315, y + 10);
            doc.fillColor(grayColor).fontSize(9).font('Helvetica').text('Total Paid:', 315, y + 32);
            doc.fillColor('#15803d').fontSize(16).font('Helvetica-Bold').text(`₹ ${Number(data.totalFare).toFixed(2)}`, 380, y + 28);
            doc.fillColor(grayColor).fontSize(8).font('Helvetica').text('(Inclusive of all taxes & fees)', 380, y + 48);
            // Important Terms & Conditions
            y += 90;
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('IMPORTANT INSTRUCTIONS', 40, y);
            doc.moveTo(40, y + 14).lineTo(555, y + 14).strokeColor('#e2e8f0').stroke();
            y += 20;
            const terms = [
                '1. Please arrive at the boarding location at least 15 minutes prior to scheduled departure.',
                '2. A valid government photo ID is mandatory for all passengers during boarding and travel.',
                '3. Cancellation is subject to the specific bus operator policy. Cancellations can be initiated via portal.',
                '4. For any assistance or queries, please contact AiBus 24x7 Customer Support.',
            ];
            doc.fillColor(grayColor).fontSize(8).font('Helvetica');
            terms.forEach((t) => {
                doc.text(t, 45, y);
                y += 13;
            });
            // Footer
            doc.rect(40, 750, 515, 25).fill('#f1f5f9');
            doc.fillColor(grayColor).fontSize(8).font('Helvetica').text('AiBus Commercial Travel Platform — Powered by Real-Time GDS Integration', 40, 758, { align: 'center', width: 515 });
            doc.end();
        }
        catch (err) {
            reject(err);
        }
    });
}
//# sourceMappingURL=ticketPdfGenerator.js.map