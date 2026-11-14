function pdfEscape(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/([\\()])/g, "\\$1");
}

export function createTextPdf(
  lines: Array<{ text: string; size?: number; gap?: number }>,
  qr?: { size: number; data: ArrayLike<number> },
) {
  let y = 750;
  const operations: string[] = [];
  for (const line of lines) {
    const size = line.size ?? 11;
    operations.push(`BT /F1 ${size} Tf 54 ${y} Td (${pdfEscape(line.text)}) Tj ET`);
    y -= line.gap ?? Math.max(18, size + 7);
  }
  if (qr) {
    const moduleSize = 120 / qr.size;
    const originX = 438;
    const originY = 600;
    operations.push("q 0 0 0 rg");
    for (let row = 0; row < qr.size; row += 1) {
      for (let column = 0; column < qr.size; column += 1) {
        if (qr.data[row * qr.size + column]) {
          operations.push(`${(originX + column * moduleSize).toFixed(3)} ${(originY + (qr.size - row - 1) * moduleSize).toFixed(3)} ${moduleSize.toFixed(3)} ${moduleSize.toFixed(3)} re f`);
        }
      }
    }
    operations.push("Q");
  }
  const stream = operations.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, "utf8"));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output, "utf8");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(output, "utf8");
}
