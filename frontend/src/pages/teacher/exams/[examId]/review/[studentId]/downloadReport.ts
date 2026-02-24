import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// PDF 리포트 다운로드
export const downloadReport = async (
  reportElement: HTMLElement,
  studentRegistrationNumber: string,
  examName: string
): Promise<void> => {
  try {
    const canvas = await html2canvas(reportElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Additional pages
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `report_${studentRegistrationNumber}_${(
      examName || "exam"
    ).replace(/\s+/g, "_")}.pdf`;
    pdf.save(fileName);
  } catch (err) {
    console.error("Failed to generate PDF", err);
    throw new Error("Failed to generate report");
  }
};
