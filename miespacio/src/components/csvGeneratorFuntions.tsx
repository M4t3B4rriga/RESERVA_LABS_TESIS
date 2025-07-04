import * as ExcelJS from 'exceljs';

export const generateCSV = (headers: string[], data: any[], titulo: string) => {
  const csvData = headers.join(',') + '\n' + data.map((row, i) => {
    return headers.map(header => row[header]).join(',')
  }).join('\n')
  const csvBlob = new Blob(["\ufeff", csvData], { type: 'text/csv;charset=utf-8;' });
  const csvUrl = URL.createObjectURL(csvBlob);

  const link = document.createElement("a");
  link.href = csvUrl;
  link.setAttribute("download", titulo + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateXLSX = async (headers: string[], data: any[], titulo: string) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');

  // Agregar los encabezados
  sheet.addRow(headers);

  // Agregar los datos
  data.forEach(row => {
    const rowData = headers.map(header => row[header]);
    sheet.addRow(rowData);
  });

  // Crear el archivo XLSX en un buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Crear el objeto Blob y la URL
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  // Crear el enlace y descargar el archivo
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', titulo + '.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};