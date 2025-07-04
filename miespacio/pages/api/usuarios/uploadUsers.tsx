import { NextApiRequest, NextApiResponse } from 'next';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { FotoEspacio } from '@/libs/fotoEspacio';
import { OkPacket, RowDataPacket } from 'mysql2';
import pool from '@/libs/db';
import url from 'url';
import { IncomingForm, Fields, Files, File as FormidableFile } from 'formidable';
import readXlsxFile from 'read-excel-file/node';
import { PersonaInterna } from '@/libs/persona';

export const config = {
    api: {
        bodyParser: false,
    },
};

function validateData(data: any[][]): string | null {
    // Validar que se haya proporcionado al menos una fila con datos
    if (data.length <= 1) {
        return 'El archivo está vacío o no contiene datos válidos';
    }

    const expectedColumns = [
        'Nombre',
        'Apellido Paterno',
        'Apellido Materno',
        'ID',
        'Cédula',
        'Correo Institucional',
        'Correo Personal',
        'Teléfono'
    ];

    const headerRow = data[0];

    if (headerRow.length < expectedColumns.length) {
        return 'El archivo no contiene las columnas esperadas';
    }

    for (let i = 0; i < expectedColumns.length; i++) {
        if (headerRow[i] !== expectedColumns[i]) {
            return `La columna ${expectedColumns[i]} no está presente en el archivo`;
        }
    }

    // Validar cada fila del archivo
    for (let i = 1; i < data.length; i++) {
        const row = data[i];

        // Validar que Nombre, Apellido Paterno y Apellido Materno estén presentes
        if (!row[0] && !row[1] && !row[2]) {
            return `Falta información requerida en "Nombre", "Apellido Paterno" y "Apellido Materno" en la fila ${i + 1}. Si desea puede ingresar el nombre completo en la columna "Nombre" o "Apellido Paterno"`;
        }

        if (!row[0] || !row[1] || !row[2]) {
            //Validar que row[0] tenga al menos 2 palabras
            if (row[0] && row[0].split(' ').length < 2 && !row[2]) {
                return `Falta información requerida en "Nombre" y "Apellido Materno" en la fila ${i + 1}. Si desea puede ingresar el nombre completo en la columna "Nombre" o "Apellido Paterno"`;
            }

            //Validar que row[1] tenga al menos 2 palabras
            if (row[1] && row[1].split(' ').length < 2 && !row[2]) {
                return `Falta información requerida en "Apellido Paterno" y "Apellido Materno" en la fila ${i + 1}. Si desea puede ingresar el nombre completo en la columna "Nombre" o "Apellido Paterno"`;
            }
        }

        // Validar que ID esté presente
        if (!row[3]) {
            return `Falta información de ID institucional en la fila ${i + 1}`;
        }

        // Validar que al menos uno de los correos esté presente y sea válido
        if (!row[5]) {
            return `Falta información de correo institucional en la fila ${i + 1}`;
        }

        if (row[5] && !isValidEmail(row[5])) {
            return `Correo institucional inválido en la fila ${i + 1}`;
        }

        if (row[6] && !isValidEmail(row[6])) {
            return `Correo personal inválido en la fila ${i + 1}`;
        }
    }

    return null; // Los datos son válidos
}

function isValidEmail(email: string): boolean {
    // Patrón para validar un correo electrónico
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const form = new IncomingForm();

        form.parse(req, async (err: any, fields: Fields, files: Files) => {
            if (err) {
                console.error(err);
                res.status(201).json({ message: 'Error al procesar el formulario' });
                return;
            }
            try {
                const file: FormidableFile | FormidableFile[] = files['file'];

                if (!Array.isArray(file)) {
                    const data = await readXlsxFile(file.filepath);

                    // Validar los datos antes de procesarlos
                    const validationError = validateData(data);
                    if (validationError) {
                        res.status(201).json({ message: validationError });
                        return;
                    }

                    const query = `
                        SELECT 
                        pi.PK_TMCPERSONA_INTERNA AS CodPersonaInterna,
                        pi.PK_TMEUNIDAD AS CodUnidad,
                        pi.PEI_CARNET_ID AS CarnetID,
                        pi.PEI_EMAIL_INSTITUCIONAL AS EmailInstitucional
                        FROM T_MCPERSONA_INTERNA pi
                    `;
                    const [result] = await pool.query(query);
                    const usuariosBD = result as { CodPersonaInterna: number; CodUnidad: number | null, CarnetID: string; EmailInstitucional: string }[];

                    // Obtener la lista de usuarios del archivo (sin el encabezado)
                    const usuariosArchivo = data.slice(1);

                    // Verificar si hay más de 2 usuarios con el mismo CarnetID en el archivo o en la base de datos
                    const carnetIDCounts: { [carnetID: string]: number } = {};

                    usuariosArchivo.forEach((usuarioArchivo) => {
                        const carnetID = usuarioArchivo[3] as string; // Índice de la columna de CarnetID

                        if (!carnetIDCounts[carnetID]) {
                            carnetIDCounts[carnetID] = 1;
                        } else {
                            carnetIDCounts[carnetID]++;
                        }
                    });

                    const duplicatedCarnetIDs = Object.keys(carnetIDCounts).filter((carnetID) => carnetIDCounts[carnetID] > 1);

                    if (duplicatedCarnetIDs.length > 0) {
                        const message = `Existen usuarios con el mismo ID institucional: ${duplicatedCarnetIDs.join(', ')}`;
                        res.status(201).json({ message });
                        return;
                    }

                    const PersonasInternasAInsertar: PersonaInterna[] = [];
                    const usuariosAInsertar: any[] = [];
                    const PersonasInternasAActualizar: PersonaInterna[] = [];
                    const usuariosAActualizar: any[] = [];

                    // Iterar por cada usuario del archivo
                    for (const usuarioArchivo of usuariosArchivo) {
                        const carnetID = usuarioArchivo[3] as string; // Índice de la columna de CarnetID

                        // Verificar si el CarnetID existe en la base de datos
                        const usuarioBD = usuariosBD.find((usuario) => usuario.CarnetID === carnetID);

                        if (!usuarioBD) {
                            let apellido = '';
                            if (!usuarioArchivo[0] || usuarioArchivo[0] === '' || !usuarioArchivo[1] || usuarioArchivo[1] === '') {
                                if ((usuarioArchivo[0] as string).split(' ').length >= 2) {
                                    apellido = (usuarioArchivo[0] as string);
                                }
                            }

                            const personaInterna = {
                                CodPersonaInterna: 0,
                                Nombre: apellido !== '' ? '' : usuarioArchivo[0] as string,
                                ApellidoPaterno: apellido !== '' ? apellido : usuarioArchivo[1] as string,
                                ApellidoMaterno: usuarioArchivo[2] as string,
                                CarnetID: usuarioArchivo[3] as string,
                                Cedula: usuarioArchivo[4] as string,
                                EmailInstitucional: usuarioArchivo[5] as string,
                                EmailPersonal: usuarioArchivo[6] as string,
                                Telefono: usuarioArchivo[7] as string
                            } as PersonaInterna;

                            // Extraer la primera parte del correo institucional antes del '@'
                            const emailInstitucional = usuarioArchivo[5] as string; // Índice de la columna de Correo Institucional
                            const usuario = emailInstitucional.split('@')[0];
                            console.log("usuarios a crearse ", personaInterna, usuario);
                            PersonasInternasAInsertar.push(personaInterna);
                            usuariosAInsertar.push({ ...personaInterna, NombreUsuario: usuario });

                        } else {
                            let apellido = '';
                            if (!usuarioArchivo[0] || usuarioArchivo[0] === '' || !usuarioArchivo[1] || usuarioArchivo[1] === '') {
                                if ((usuarioArchivo[0] as string).split(' ').length >= 2) {
                                    apellido = (usuarioArchivo[0] as string);
                                }
                            }

                            const personaInterna = {
                                CodPersonaInterna: usuarioBD.CodPersonaInterna,
                                CodUnidad: usuarioBD.CodUnidad,
                                Nombre: apellido !== '' ? '' : usuarioArchivo[0] as string,
                                ApellidoPaterno: apellido !== '' ? apellido : usuarioArchivo[1] as string,
                                ApellidoMaterno: usuarioArchivo[2] as string,
                                CarnetID: usuarioArchivo[3] as string,
                                Cedula: usuarioArchivo[4] as string,
                                EmailInstitucional: usuarioArchivo[5] as string,
                                EmailPersonal: usuarioArchivo[6] as string,
                                Telefono: usuarioArchivo[7] as string
                            } as PersonaInterna;

                            // Extraer la primera parte del correo institucional antes del '@'
                            const emailInstitucional = usuarioArchivo[5] as string; // Índice de la columna de Correo Institucional
                            const usuario = emailInstitucional.split('@')[0];
                            console.log("usuarios a actualizarse ", personaInterna, usuario);
                            PersonasInternasAActualizar.push(personaInterna);
                            usuariosAActualizar.push({ ...personaInterna, NombreUsuario: usuario });
                        }
                    }

                    if (PersonasInternasAInsertar.length > 0) {
                        const insertQuery = `INSERT INTO T_MCPERSONA_INTERNA (PEI_NOMBRE, PEI_APELLIDO_PATERNO, PEI_APELLIDO_MATERNO, PEI_CARNET_ID, PEI_EMAIL_INSTITUCIONAL, PEI_EMAIL_PERSONAL, PEI_CEDULA, PEI_TELEFONO) VALUES ?`;

                        const insertValues = PersonasInternasAInsertar.map((personaInterna) => [
                            personaInterna.Nombre,
                            personaInterna.ApellidoPaterno,
                            personaInterna.ApellidoMaterno,
                            personaInterna.CarnetID,
                            personaInterna.EmailInstitucional,
                            personaInterna.EmailPersonal,
                            personaInterna.Cedula,
                            personaInterna.Telefono,
                        ]);

                        const [insertPersonaInternaResult] = await pool.query(insertQuery, [insertValues]);
                        const firstInsertedPersonaInternaId = (insertPersonaInternaResult as any).insertId;
                        console.log("------------------------------insertPersonaInternaResult------------------->>>>>>>>>>>>", insertPersonaInternaResult);
                        let currentInsertedPersonaInternaId_New = firstInsertedPersonaInternaId;
                        let currentInsertedPersonaInternaId_Usuario = firstInsertedPersonaInternaId;

                        // Crear mapeo de CodPersonaInterna a CodPersonaInterna para las personas internas insertadas
                        const insertedPersonasInternasMap: { [codPersonaInterna: number]: number } = {};
                        let currentInsertedPersonaInternaId = firstInsertedPersonaInternaId;

                        for (const personaInterna of PersonasInternasAInsertar) {
                            insertedPersonasInternasMap[currentInsertedPersonaInternaId_New] = currentInsertedPersonaInternaId;
                            currentInsertedPersonaInternaId++;
                            currentInsertedPersonaInternaId_New++;
                        }

                        // Realizar inserción de los usuarios en la tabla T_MSUSUARIO utilizando CodPersonaInterna
                        const insertUsuarioQuery = `INSERT INTO T_MSUSUARIO (PK_TMCPERSONA_INTERNA, USU_NOMBRE, XEUSU_PASWD) VALUES ?`;

                        const insertUsuarioValues = usuariosAInsertar.map((usuario, index) => [
                            insertedPersonasInternasMap[usuario.CodPersonaInterna + index + currentInsertedPersonaInternaId_Usuario],
                            usuario.NombreUsuario,
                            '123456',
                        ]);
                        console.log("usuariosAInsertar ", usuariosAInsertar);
                        console.log("usuarios ", insertedPersonasInternasMap);
                        console.log("usuarios a crearse ", insertUsuarioValues);

                        await pool.query(insertUsuarioQuery, [insertUsuarioValues]);
                    }

                    if (PersonasInternasAActualizar.length > 0) {
                        const updatePersonaInternaQuery = `
                        UPDATE T_MCPERSONA_INTERNA
                        SET
                        PEI_NOMBRE = (CASE PK_TMCPERSONA_INTERNA
                            ${PersonasInternasAActualizar.map((personaInterna) => `WHEN ${personaInterna.CodPersonaInterna} THEN '${personaInterna.Nombre ? personaInterna.Nombre : ''}'`).join('\n')}
                            ELSE PEI_NOMBRE
                        END),
                        PEI_APELLIDO_PATERNO = (CASE PK_TMCPERSONA_INTERNA
                            ${PersonasInternasAActualizar.map((personaInterna) => `WHEN ${personaInterna.CodPersonaInterna} THEN '${personaInterna.ApellidoPaterno}'`).join('\n')}
                            ELSE PEI_APELLIDO_PATERNO
                        END),
                        PEI_APELLIDO_MATERNO = (CASE PK_TMCPERSONA_INTERNA
                            ${PersonasInternasAActualizar.map((personaInterna) => `WHEN ${personaInterna.CodPersonaInterna} THEN '${personaInterna.ApellidoMaterno ? personaInterna.ApellidoMaterno : ''}'`).join('\n')}
                            ELSE PEI_APELLIDO_MATERNO
                        END),
                        PEI_CEDULA = (CASE PK_TMCPERSONA_INTERNA
                            ${PersonasInternasAActualizar.map((personaInterna) => `WHEN ${personaInterna.CodPersonaInterna} THEN '${personaInterna.Cedula ? personaInterna.Cedula : ''}'`).join('\n')}
                            ELSE PEI_CEDULA
                        END),
                        PEI_EMAIL_INSTITUCIONAL = (CASE PK_TMCPERSONA_INTERNA
                            ${PersonasInternasAActualizar.map((personaInterna) => `WHEN ${personaInterna.CodPersonaInterna} THEN '${personaInterna.EmailInstitucional}'`).join('\n')}
                            ELSE PEI_EMAIL_INSTITUCIONAL
                        END),
                        PEI_EMAIL_PERSONAL = (CASE PK_TMCPERSONA_INTERNA
                            ${PersonasInternasAActualizar.map((personaInterna) => `WHEN ${personaInterna.CodPersonaInterna} THEN '${personaInterna.EmailPersonal ? personaInterna.EmailPersonal : ''}'`).join('\n')}
                            ELSE PEI_EMAIL_PERSONAL
                        END),
                        PEI_TELEFONO = (CASE PK_TMCPERSONA_INTERNA
                            ${PersonasInternasAActualizar.map((personaInterna) => `WHEN ${personaInterna.CodPersonaInterna} THEN '${personaInterna.Telefono ? personaInterna.Telefono : ''}'`).join('\n')}
                            ELSE PEI_TELEFONO
                        END)
                        WHERE PK_TMCPERSONA_INTERNA IN (${PersonasInternasAActualizar.map((personaInterna) => personaInterna.CodPersonaInterna).join(', ')})`;
                        
                        console.log(updatePersonaInternaQuery);
                        await pool.query(updatePersonaInternaQuery);

                        // Realizar actualización masiva en la tabla T_MSUSUARIO con los CodPersonaInterna correspondientes
                        const updateUsuarioQuery = `
                            UPDATE T_MSUSUARIO
                            SET USU_NOMBRE = (CASE PK_TMCPERSONA_INTERNA
                            ${usuariosAActualizar.map((usuario) => `WHEN ${usuario.CodPersonaInterna} THEN '${usuario.NombreUsuario}'`).join('\n')}
                            ELSE USU_NOMBRE
                            END)
                            WHERE PK_TMCPERSONA_INTERNA IN (${usuariosAActualizar.map((usuario) => usuario.CodPersonaInterna).join(', ')})`;
                        
                        console.log(updateUsuarioQuery);
                        await pool.query(updateUsuarioQuery);
                    }

                    res.status(200).json({ message: 'Archivo recibido y procesado exitosamente' });

                } else {
                    res.status(201).json({ message: 'Solo puede enviar un archivo' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error al actualizar al lista de usuarios' });
            }
        });
    } else {
        res.status(405).json({ message: 'Método no permitido' });
    }
};