import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Espacio, DirigenteEspacio_EspID, Espacio_Create } from '@/libs/espacios';
import { jwtVerify } from 'jose';
import { FotoEspacio } from '@/libs/fotoEspacio';
import { Equipo } from '@/libs/equipo';
import { TipoEquipo } from '@/libs/tipoEquipo';
import { insertAuditLog } from '@/src/components/Auditoria';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':
      try {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT 
            e.PK_TMEESPACIO AS CodEspacio,
            e.PK_TMETIPO_ESPACIO AS CodTipoEspacio,
            te.TES_NOMBRE AS NombreTipoEspacio,
            te.TES_DESCRIPCION AS DescripcionTipoEspacio,
            e.PK_TMEUNIDAD AS CodUnidad,
            u.UNI_NOMBRE AS NombreUnidad,
            u.UNI_SIGLAS AS SiglasUnidad,
            u.UNI_DESCRIPCION AS DescripcionUnidad,
            e.ESP_NOMBRE AS NombreEspacio,
            e.ESP_DESCRIPCION AS DescripcionEspacio,
            e.ESP_CAPACIDAD AS CapacidadEspacio,
            e.ESP_DESCRIPCION_UBICACION AS DescripcionUbicacion,
            e.ESP_DISPONIBILIDAD AS Disponibilidad,
            e.ESP_DIAS_ANTELACION AS DiasAntelacion,
            e.ESP_FECHA_CREACION AS FechaCreacion,
            e.ESP_FECHA_EDICION AS FechaEdicion,
            e.ESTADO AS Estado,
            te.ESTADO AS Estado_TipoEspacio,
            u.ESTADO AS Estado_Unidad
          FROM T_MEESPACIO e
            JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
            JOIN T_MEUNIDAD u ON e.PK_TMEUNIDAD = u.PK_TMEUNIDAD
          WHERE e.PK_TMEESPACIO = ?`,
          [id]
        ); // NO OLVIDAR PONER e.ESTAD = 1 O PONER UNA VALIDACION DEPENDIENDO EL TIOP DE USUARIO LOGUEADO

        if (rows.length === 0) {
          res.status(404).json({ message: 'Espacio no encontrado' });
          return;
        }

        const [queryFotos] = await pool.query<RowDataPacket[]>(
          `SELECT PK_TMEFOTO_ESPACIO as CodFotoEspacio, PK_TMEESPACIO as CodEspacio, FES_NOMBRE as NombreFoto, FES_RUTA as RutaFoto, FES_ORDEN as Orden, ESTADO as Estado
           FROM T_MEFOTO_ESPACIO
           WHERE ESTADO = 1 AND PK_TMEESPACIO = ?`,
          [id]
        );

        if (queryFotos.length === 0) {
          console.log({ message: 'Fotos no encontradas' });
        }

        const [queryDirigentes] = await pool.query<RowDataPacket[]>(
          `SELECT 
            de.PK_TMEDIRIGENTE_ESPACIO AS CodDirigente,
            pi.PK_TMCPERSONA_INTERNA AS CodUsuario,
            pi.PEI_NOMBRE AS NombreUsuario,
            pi.PEI_APELLIDO_PATERNO AS ApellidoPaternoUsuario,
            pi.PEI_APELLIDO_MATERNO AS ApellidoMaternoUsuario,
            pi.PEI_CARNET_ID AS CarnetID,
            de.PK_TMEESPACIO AS CodEspacio,
            de.DES_FECHA_ASIGNACION AS FechaAsignacion,
            de.DES_FECHA_RETIRO AS FechaRetiro,
            de.ESTADO AS Estado
          FROM T_MEDIRIGENTE_ESPACIO de
            JOIN T_MCPERSONA_INTERNA pi ON de.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
          WHERE de.PK_TMEESPACIO = ? AND de.ESTADO = 1`,
          [id]
        );

        if (queryDirigentes.length === 0) {
          console.log({ message: 'Dirigentes no encontrados' });
        }

        const espacio = rows as Espacio[];
        const fotos = queryFotos as FotoEspacio[];
        const dirigentes = queryDirigentes as DirigenteEspacio_EspID[];

        res.status(200).json({ espacio, fotos, dirigentes });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener el espacio' });
      }
      break;

    case 'PUT':
      try {
        const {
          CodEspacio,
          CodTipoEspacio,
          CodUnidad,
          NombreEspacio,
          DescripcionEspacio,
          CapacidadEspacio,
          DescripcionUbicacion,
          DiasAntelacion,
          PersonasInternas,
          Disponibilidad
        } = req.body;

        const FechaCreacion = new Date(Date.now());
        const FechaEdicion = FechaCreacion;

        const { miEspacioSession } = req.cookies;

        if (miEspacioSession === undefined) {
          const { miEspacioSession } = req.cookies;
          if (miEspacioSession !== undefined) {
            await insertAuditLog(
              miEspacioSession,
              new Date().toISOString().slice(0, 10),
              new Date().toLocaleTimeString(),
              req.socket?.remoteAddress ?? "",
              `Actualizar espacio`,
              'Fracaso',
              req.headers['user-agent']?.split(' ')[0] ?? "",
              req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
            );
          }
          res.status(401).json({ message: 'No se ha iniciado sesión' });
          return;
        }

        const { payload } = await jwtVerify(
          miEspacioSession,
          new TextEncoder().encode('secret')
        );

        const CodUsuario = payload?.CodUsuario;

        const [espacioResult] = await pool.query<OkPacket>(
          'UPDATE T_MEESPACIO SET PK_TMEUNIDAD = ?, PK_TMCPERSONA_INTERNA = ?, PK_TMETIPO_ESPACIO = ?, ESP_NOMBRE = ?, ESP_DESCRIPCION = ?, ESP_CAPACIDAD = ?, ESP_DESCRIPCION_UBICACION = ?, ESP_DISPONIBILIDAD = ?, ESP_DIAS_ANTELACION = ?, ESP_FECHA_EDICION = ?, ESTADO = ? WHERE PK_TMEESPACIO = ?',
          [
            CodUnidad,
            CodUsuario,
            CodTipoEspacio,
            NombreEspacio,
            DescripcionEspacio,
            CapacidadEspacio,
            DescripcionUbicacion,
            Disponibilidad,
            DiasAntelacion,
            FechaEdicion,
            1,
            CodEspacio
          ]
        );

        const updatedEspacio: Espacio_Create = {
          CodEspacio: CodEspacio,
          CodTipoEspacio,
          CodUnidad,
          CodUsuario: CodUsuario as number,
          NombreEspacio,
          DescripcionEspacio,
          CapacidadEspacio,
          DescripcionUbicacion,
          Disponibilidad,
          DiasAntelacion,
          FechaCreacion,
          FechaEdicion,
          Estado: '1',
        };

        await pool.query<OkPacket>(
          'UPDATE T_MEDIRIGENTE_ESPACIO SET ESTADO = 0, DES_FECHA_RETIRO = CURDATE() WHERE PK_TMEESPACIO = ?',
          [updatedEspacio.CodEspacio]
        );

        const dirigentesValues = PersonasInternas.map((personaInterna: number) => [updatedEspacio.CodEspacio, personaInterna, FechaCreacion, 1]);

        await pool.query<OkPacket>(
          'INSERT INTO T_MEDIRIGENTE_ESPACIO (PK_TMEESPACIO, PK_TMCPERSONA_INTERNA, DES_FECHA_ASIGNACION, ESTADO) VALUES ?',
          [dirigentesValues]
        );
        console.log(updatedEspacio);

        if (miEspacioSession !== undefined) {
          await insertAuditLog(
            miEspacioSession,
            new Date().toISOString().slice(0, 10),
            new Date().toLocaleTimeString(),
            req.socket?.remoteAddress ?? "",
            `Actualizar espacio`,
            'Éxito',
            req.headers['user-agent']?.split(' ')[0] ?? "",
            req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
          );
        }

        res.status(201).json(updatedEspacio);
      } catch (error) {
        console.error(error);
        const { miEspacioSession } = req.cookies;
        if (miEspacioSession !== undefined) {
          await insertAuditLog(
            miEspacioSession,
            new Date().toISOString().slice(0, 10),
            new Date().toLocaleTimeString(),
            req.socket?.remoteAddress ?? "",
            `Actualizar espacio`,
            'Fracaso',
            req.headers['user-agent']?.split(' ')[0] ?? "",
            req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
          );
        }
        res.status(500).json({ message: 'Error al crear el espacio' });
      }

      break;

    case 'DELETE':
      try {
        console.log(id);
        // Obtener el estado actual del registro
        const [registro] = await pool.query<any[]>('SELECT * FROM T_MEESPACIO WHERE PK_TMEESPACIO = ?', [id]);
        console.log(registro);

        // Obtener el nuevo estado
        const newState = registro[0].ESTADO === 0 ? 1 : 0;

        // Actualizar el registro con el nuevo estado
        const [result] = await pool.query<OkPacket>('UPDATE T_MEESPACIO SET ESP_DISPONIBILIDAD = ?, ESTADO = ? WHERE PK_TMEESPACIO = ?', [newState, newState, id]);

        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Espacio no encontrado' });
          return;
        }

        const espacioUpdated: Espacio_Create = {
          CodEspacio: Number(id),
          CodUnidad: registro[0].PK_TMEUNIDAD,
          CodUsuario: registro[0].PK_TMCPERSONA_INTERNA,
          CodTipoEspacio: registro[0].PK_TMETIPO_ESPACIO,
          NombreEspacio: registro[0].ESP_NOMBRE,
          DescripcionEspacio: registro[0].ESP_DESCRIPCION,
          CapacidadEspacio: registro[0].ESP_CAPACIDAD,
          DescripcionUbicacion: registro[0].ESP_DESCRIPCION_UBICACION,
          Disponibilidad: newState,
          DiasAntelacion: registro[0].ESP_DIAS_ANTELACION,
          FechaCreacion: registro[0].ESP_FECHA_CREACION,
          FechaEdicion: registro[0].ESP_FECHA_EDICION,
          Estado: newState.toString(),
        };

        res.status(200).json(espacioUpdated);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el espacio' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}