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

export const generateEspacioPDF = (espacio: any, equiposEspacio: any[], tiposEquipo: any[], dirigentesEspacio: any[]) => {
    const doc = new jsPDF();

    // Encabezado centrado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const title = "Universidad de las Fuerzas Armadas-ESPE";
    const titleWidth = doc.getTextWidth(title);
    const x = (doc.internal.pageSize.getWidth() - titleWidth) / 2;
    doc.text(title, x, 20);

    // Título del espacio
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const espacioTitle = `Información del Espacio: ${espacio.NombreEspacio}`;
    const espacioTitleWidth = doc.getTextWidth(espacioTitle);
    const espacioTitleX = (doc.internal.pageSize.getWidth() - espacioTitleWidth) / 2;
    doc.text(espacioTitle, espacioTitleX, 35);

    let yPosition = 50;

    // Información general del espacio
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Información General', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const infoGeneral = [
        ['Nombre del Espacio:', espacio.NombreEspacio || 'N/A'],
        ['Tipo de Espacio:', espacio.NombreTipoEspacio || 'N/A'],
        ['Capacidad:', `${espacio.CapacidadEspacio || 0} personas`],
        ['Estado:', espacio.Estado === '1' ? 'Activo' : 'Inactivo'],
        ['Disponibilidad:', espacio.Disponibilidad === 1 ? 'Disponible' : 'No disponible'],
        ['Unidad:', `${espacio.SiglasUnidad || 'N/A'} - ${espacio.NombreUnidad || 'N/A'}`],
        ['Ubicación:', espacio.DescripcionUbicacion || 'N/A'],
        ['Fecha de Creación:', espacio.FechaCreacion ? new Date(espacio.FechaCreacion).toLocaleDateString('es-EC') : 'N/A'],
        ['Fecha de Edición:', espacio.FechaEdicion ? new Date(espacio.FechaEdicion).toLocaleDateString('es-EC') : 'N/A']
    ];

    // @ts-ignore
    doc.autoTable({
        body: infoGeneral,
        startY: yPosition,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 3
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { cellWidth: 120 }
        }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Descripción del espacio
    if (espacio.DescripcionEspacio) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Descripción', 20, yPosition);
        yPosition += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const splitDescription = doc.splitTextToSize(espacio.DescripcionEspacio, 170);
        doc.text(splitDescription, 20, yPosition);
        yPosition += splitDescription.length * 5 + 10;
    }

    // Responsables del espacio
    if (dirigentesEspacio && dirigentesEspacio.length > 0) {
        // Verificar si necesita nueva página
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Responsables del Espacio', 20, yPosition);
        yPosition += 10;

        const responsablesData = dirigentesEspacio.map(dirigente => [
            `${dirigente.NombreUsuario} ${dirigente.ApellidoPaternoUsuario} ${dirigente.ApellidoMaternoUsuario}`,
            dirigente.CarnetID || 'N/A'
        ]);

        // @ts-ignore
        doc.autoTable({
            head: [['Nombre Completo', 'Carnet ID']],
            body: responsablesData,
            startY: yPosition,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3
            }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Equipos del espacio
    if (tiposEquipo && tiposEquipo.length > 0 && equiposEspacio && equiposEspacio.length > 0) {
        // Verificar si necesita nueva página
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Equipos del Espacio', 20, yPosition);
        yPosition += 10;

        tiposEquipo.forEach(tipo => {
            const equiposDelTipo = equiposEspacio.filter(equipo => equipo.CodTipoEquipo === tipo.CodTipoEquipo);
            
            if (equiposDelTipo.length > 0) {
                // Verificar si necesita nueva página
                if (yPosition > 240) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text(tipo.NombreTipoEquipo, 20, yPosition);
                yPosition += 8;

                const equiposData = equiposDelTipo.map(equipo => [
                    equipo.NombreEquipo || 'N/A',
                    `${equipo.Marca || 'N/A'} ${equipo.Modelo || 'N/A'}`,
                    `x${equipo.Cantidad || 0}`,
                    equipo.EstaInstalado === '1' ? 'Instalado' : 'No instalado'
                ]);

                // @ts-ignore
                doc.autoTable({
                    head: [['Equipo', 'Marca/Modelo', 'Cantidad', 'Estado']],
                    body: equiposData,
                    startY: yPosition,
                    theme: 'grid',
                    styles: {
                        fontSize: 9,
                        cellPadding: 2
                    },
                    columnStyles: {
                        2: { halign: 'center' },
                        3: { halign: 'center' }
                    }
                });

                yPosition = (doc as any).lastAutoTable.finalY + 10;
            }
        });
    } else {
        // Si no hay equipos, agregar una nota informativa
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Equipos del Espacio', 20, yPosition);
        yPosition += 15;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('No hay información de equipos disponible para este espacio.', 20, yPosition);
        yPosition += 10;
    }

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
        doc.text(`Sistema de gestión de espacio MiEspacio`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10, { align: "right" });
        const date = new Date().toLocaleDateString('es-EC');
        doc.text(`${date}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 5, { align: "right"});
    }

    // Limpiar el nombre del archivo para evitar caracteres problemáticos
    const cleanSpaceName = espacio.NombreEspacio ? espacio.NombreEspacio.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Espacio';
    const fileName = `Espacio_${cleanSpaceName}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    try {
        doc.save(fileName);
        console.log('PDF guardado con nombre:', fileName);
    } catch (saveError) {
        console.error('Error al guardar PDF:', saveError);
        // Intento de respaldo con nombre simple
        doc.save(`Espacio_${new Date().getTime()}.pdf`);
    }
};