"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTicketPdf = generateTicketPdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
const node_path_1 = __importDefault(require("node:path"));
async function generateTicketPdf(data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({
            size: "A4",
            margin: 40,
            info: { Title: `AiBus Ticket ${data.ticketNumber}`, Author: "AiBus" },
        });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        try {
            doc.registerFont("Unicode", node_path_1.default.resolve(__dirname, "../../../assets/fonts/NotoSansDevanagari.ttf"));
            doc.font("Unicode");
            const red = "#D84D56", ink = "#414258", muted = "#738099", border = "#D8D8DF";
            const x = 70, w = 455;
            let y = 35;
            const text = (value, tx, ty, width, size = 10, color = ink) => {
                doc
                    .fillColor(color)
                    .fontSize(size)
                    .text(String(value ?? "—"), tx, ty, { width });
                return doc.y;
            };
            const room = (height) => {
                if (y + height > 790) {
                    doc.addPage();
                    y = 40;
                }
            };
            doc.rect(x, y, w, 120).fill(red);
            text("AiBus", x + 20, y + 12, 110, 17, "#FFFFFF");
            text("Trip Details", x + 130, y + 20, 250, 15, "#FFFFFF");
            text(`${data.fromCityName}-${data.toCityName}`, x + 120, y + 55, w - 140, 15, "#FFFFFF");
            doc
                .moveTo(x + 14, y + 88)
                .lineTo(x + w - 14, y + 88)
                .strokeColor("#F2B3B8")
                .stroke();
            text(`Ticket Number: ${data.ticketNumber}  |  PNR: ${data.pnrNumber}`, x + 15, y + 95, w - 30, 9, "#FFFFFF");
            y += 140;
            text(`Hello ${data.contactName},`, x + 4, y, w - 8);
            y = doc.y + 14;
            text(`Your journey details from ${data.fromCityName} to ${data.toCityName} are below.`, x + 4, y, w - 8);
            y = doc.y + 24;
            room(360);
            const panelPage = doc.page;
            const panelTop = y;
            doc.rect(x, y, w, 28).fill("#E6EAF6");
            text("Journey Details", x + 18, y + 6, w - 36, 12);
            y += 44;
            const pickup = (data.pickupSnapshot || {});
            const drop = (data.dropoffSnapshot || {});
            text("Departure date and time", x + 18, y, 200, 9, muted);
            text("Arrival date and time", x + 245, y, 190, 9, muted);
            y += 19;
            const format = (v) => {
                if (typeof v !== "string")
                    return "—";
                const date = new Date(v);
                return Number.isNaN(date.getTime())
                    ? v
                    : date.toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
            };
            const left = text(pickup.departureDateTime
                ? format(pickup.departureDateTime)
                : `${data.journeyDate} ${data.pickupTime}`, x + 18, y, 200, 10);
            const right = text(drop.arrivalDateTime
                ? format(drop.arrivalDateTime)
                : data.dropoffTime || "—", x + 245, y, 190, 10);
            y = Math.max(left, right) + 18;
            text("Travels", x + 18, y, w - 36, 9, muted);
            y += 17;
            text(data.operatorName, x + 18, y, w - 36, 11);
            y = doc.y + 3;
            text(data.busType, x + 18, y, w - 36, 9, muted);
            y = doc.y + 18;
            const rule = () => {
                doc
                    .moveTo(x + 18, y)
                    .lineTo(x + w - 18, y)
                    .dash(2, { space: 2 })
                    .strokeColor(muted)
                    .stroke()
                    .undash();
                y += 18;
            };
            rule();
            text("Boarding Point", x + 18, y, 200, 9, muted);
            text("Dropping Point", x + 245, y, 190, 9, muted);
            y += 18;
            const board = text([data.pickupLocation, pickup.address, pickup.landmark, pickup.contact]
                .filter(Boolean)
                .join("\n"), x + 18, y, 200, 10);
            const dropping = text([data.dropoffLocation, drop.address, drop.landmark]
                .filter(Boolean)
                .join("\n"), x + 245, y, 190, 10);
            y = Math.max(board, dropping) + 18;
            rule();
            text("Passenger Details", x + 18, y, 250, 9, muted);
            text("Seat no", x + 355, y, 80, 9, muted);
            y += 24;
            for (const p of data.passengers) {
                room(65);
                text(p.cancelled ? `${p.name} (Cancelled)` : p.name, x + 18, y, 300, 11);
                const after = doc.y;
                text(p.seatNo, x + 355, y, 80, 11);
                y = Math.max(after, doc.y) + 3;
                text(`${p.age} years, ${p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}`, x + 18, y, 300, 9, muted);
                y = doc.y + 18;
            }
            if (doc.page === panelPage)
                doc.rect(x, panelTop, w, y - panelTop).strokeColor(border).stroke();
            room(70);
            doc
                .moveTo(x, y)
                .lineTo(x + w, y)
                .strokeColor(border)
                .stroke();
            y += 15;
            text(`Status: ${data.status || "—"}   |   Amount: INR ${Number(data.totalFare).toFixed(2)}`, x + 18, y, w - 36, 9);
            doc.end();
        }
        catch (err) {
            reject(err);
            doc.end();
        }
    });
}
//# sourceMappingURL=ticketPdfGenerator.js.map