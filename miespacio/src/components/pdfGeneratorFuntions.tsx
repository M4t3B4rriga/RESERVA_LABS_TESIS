import jsPDF from 'jspdf';
import 'jspdf-autotable';
interface JsPdfWithAutoTable extends jsPDF {
  autoTable: any; // Agregar una definición de tipo para 'autoTable'
}


export const generatePDF = (data: string[], header: string[], reportTitle: string) => {
    const doc = new jsPDF();

    // Encabezado centrado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const title = "Universidad de las Fuerzas Armadas-ESPE";
    const titleWidth = doc.getTextWidth(title);
    const x = (doc.internal.pageSize.getWidth() - titleWidth) / 2;
    doc.text(title, x, 20);

    // Descripción del reporte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const reportTitleWidth = doc.getTextWidth(reportTitle);
    const reportTitleX = (doc.internal.pageSize.getWidth() - reportTitleWidth) / 2;
    doc.text(reportTitle, reportTitleX, 30);
    
    const rows = data.map((r, i=0) => {
        const values = Object.values(r);
        const estadoIndex = header.indexOf("Estado"); // assuming "estado" is the column header
        if (estadoIndex !== -1) { // check if "estado" column exists
          const estadoValue = values[estadoIndex];
          values[estadoIndex] = parseInt(estadoValue, 10) === 1 ? "Activo" : "Inactivo";
        }
        return values;
      });
      // @ts-ignore
    doc.autoTable({
        head: [header],
        body: rows,
        startY: 40,
    });

    // Pie de página
    const totalPages = doc.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    doc.text(`Sistema de gestión de espacio Miespacio`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10, { align: "right" });
    const date = new Date().toLocaleDateString('es-EC');
    doc.text(`${date}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 5, { align: "right"});
}

    doc.save(reportTitle+".pdf");
};