import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { jwtVerify } from 'jose';

interface SolicitudRow extends RowDataPacket {
  PK_REGISTRO_SOLICITUD: number;
  PK_TMCPERSONA_INTERNA: number;
  USU_NOMBRE: string;
  XEUSU_PASWD: string;
  ROL: string;
  ESTADO: string;
}

export default async function manageRegistrationHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} no permitido` });
  }

  const { miEspacioSession } = req.cookies;
  if (!miEspacioSession) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { payload } = await jwtVerify(
      miEspacioSession,
      new TextEncoder().encode('secret')
    );

    // Verificar si el usuario es Admin Root (PK_TMSROL = 3)
    if (payload.CodRol !== 3) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }

    const { solicitudId, accion, comentario } = req.body;

    if (!solicitudId || !accion || !['Aceptado', 'Rechazado'].includes(accion)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Obtener la solicitud
    const [solicitudes] = await pool.query<SolicitudRow[]>(
      'SELECT * FROM T_REGISTRO_SOLICITUD WHERE PK_REGISTRO_SOLICITUD = ? AND ESTADO = ?',
      [solicitudId, 'Pendiente']
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    const solicitud = solicitudes[0];

    if (accion === 'Aceptado') {
      // Iniciar transacción
      await pool.query('START TRANSACTION');
      try{
        /*
        // Mapear valores del ENUM a nombres para T_MSUSUARIO (mantener consistencia)
        const enumToRoleMapping: { [key: string]: string } = {
          'Estudiante': 'Estudiante',
          'Profesor': 'Docente',           // BD: Profesor -> T_MSUSUARIO: Docente
          'Administrativo': 'Administrador' // BD: Administrativo -> T_MSUSUARIO: Administrador
        };

        co1nst fullRole = enumToRoleMapping[solicitud.ROL] || solicitud.ROL;*/

        // Insertar en T_MSUSUARIO si es aceptado
        const [userResult] = await pool.query<OkPacket>(
          'INSERT INTO T_MSUSUARIO (PK_TMCPERSONA_INTERNA, USU_NOMBRE, XEUSU_PASWD, ROL) VALUES (?, ?, ?, ?)',
          [solicitud.PK_TMCPERSONA_INTERNA, solicitud.USU_NOMBRE, solicitud.XEUSU_PASWD, solicitud.ROL]
        );

        // Asignar rol según el tipo solicitado
        let rolId: number;
        switch (solicitud.ROL) {
          case 'Estudiante':
            rolId = 5; // PK_TMSROL = 5
            break;
          case 'Docente':
            rolId = 6; // PK_TMSROL = 6
            break;
          case 'Administrador':
            rolId = 2; // PK_TMSROL = 2
            break;
          default:
            // Si no coincide con ninguno, asignar Usuario por defecto
            rolId = 1; // PK_TMSROL = 1
            console.warn(`Rol no reconocido: ${solicitud.ROL}, asignando rol Usuario por defecto`);
        }

        // Insertar en T_MSROL_USUARIO
        await pool.query(
          'INSERT INTO T_MSROL_USUARIO (PK_TMSROL, XEUSU_CODIGO, RUS_FECHA_ASIGNACION, ESTADO) VALUES (?, ?, NOW(), 1)',
          [rolId, userResult.insertId]
        );

        // Confirmar transacción
        await pool.query('COMMIT');
        
        console.log(`Usuario ${solicitud.USU_NOMBRE} creado con rol ${solicitud.ROL} (PK_TMSROL: ${rolId})`);
      } catch (error) {
        // Rollback en caso de error
        await pool.query('ROLLBACK');
        throw error;
      }
    }
      /*
      // Insertar en T_MSUSUARIO si es aceptado
      const [userResult] = await pool.query<OkPacket>(
        'INSERT INTO T_MSUSUARIO (PK_TMCPERSONA_INTERNA, USU_NOMBRE, XEUSU_PASWD, ROL) VALUES (?, ?, ?, ?)',
        [solicitud.PK_TMCPERSONA_INTERNA, solicitud.USU_NOMBRE, solicitud.XEUSU_PASWD, solicitud.ROL]
      );

      // Asignar rol por defecto (Usuario, PK_TMSROL = 1) o según el rol solicitado
      const rolId = solicitud.ROL === 'Administrativo' ? 2 : 5; // 2 para Administrativo, 5 para Estudiante/Profesor
      await pool.query(
        'INSERT INTO T_MSROL_USUARIO (PK_TMSROL, XEUSU_CODIGO, RUS_FECHA_ASIGNACION, ESTADO) VALUES (?, ?, NOW(), 1)',
        [rolId, userResult.insertId]
      );*/

    // Actualizar el estado de la solicitud
    await pool.query(
      'UPDATE T_REGISTRO_SOLICITUD SET ESTADO = ?, FECHA_RESPUESTA = CURRENT_TIMESTAMP, COMENTARIO_ADMIN = ? WHERE PK_REGISTRO_SOLICITUD = ?',
      [accion, comentario || null, solicitudId]
    );

    return res.status(200).json({ message: `Solicitud ${accion.toLowerCase()} con éxito` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}