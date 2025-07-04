import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { Espacio, Espacio_Create } from '@/libs/espacios';
import { jwtVerify } from 'jose';
import { insertAuditLog } from '@/src/components/Auditoria';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetRolesParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getEspacios(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetRolesParams = {}) {
  try {
    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy: { [key: string]: string } = {
      CodEspacio: 'e.PK_TMEESPACIO',
      NombreEspacio: 'e.ESP_NOMBRE',
      CapacidadEspacio: 'e.ESP_CAPACIDAD',
      NombreTipoEspacio: 'te.TES_NOMBRE',
      NombreUnidad: 'u.UNI_NOMBRE',
      FechaCreacion: 'e.ESP_FECHA_CREACION',
      Estado: 'e.ESTADO',
      Estado_TipoEspacio: 'te.ESTADO',
      Estado_Unidad: 'u.ESTADO',
      Estado_Foto: 'f.ESTADO',
      Disponibilidad: 'e.ESP_DISPONIBILIDAD',
    };
    if (orderBy) {
      orderBy = allowedOrderBy[orderBy || ''] ? allowedOrderBy[orderBy] : 'e.PK_TMEESPACIO';
    }
    const allowedOrderDir = ['ASC', 'DESC'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
    const filterConditions: { [key: string]: string[] } = {};

    if (filter) {
      // Separar los filtros.
      const filterParams = filter ? filter.split(',') : [];
      const allowedAttributes: { [key: string]: string } = {
        CodEspacio: 'e.PK_TMEESPACIO',
        NombreEspacio: 'e.ESP_NOMBRE',
        CapacidadEspacio: 'e.ESP_CAPACIDAD',
        CodTipoEspacio: 'e.PK_TMETIPO_ESPACIO',
        CodUnidad: 'e.PK_TMEUNIDAD',
        FechaCreacion: 'e.ESP_FECHA_CREACION',
        Estado: 'e.ESTADO',
        Estado_TipoEspacio: 'te.ESTADO',
        Estado_Unidad: 'u.ESTADO',
        Estado_Foto: 'f.ESTADO',
        Disponibilidad: 'e.ESP_DISPONIBILIDAD',
      };

      // Construimos la cláusula WHERE en base a los filtros y la cadena de búsqueda.
      filterParams.forEach(param => {
        const [attribute, value] = param.split('-');
        if (!allowedAttributes[attribute]) {
          console.error(`El atributo ${attribute} no está permitido`);
          return;
        }
        if (!value) {
          console.error(`Se debe proporcionar un valor para el atributo ${attribute}`);
          return;
        }

        if (!filterConditions[allowedAttributes[attribute]]) {
          filterConditions[allowedAttributes[attribute]] = [];
        }

        filterConditions[allowedAttributes[attribute]].push(`${allowedAttributes[attribute]} = '${value}'`);
      });
    }

    const filterGroups = Object.values(filterConditions).map(group => `(${group.join(' OR ')})`);

    if (search) {
      filterGroups.push(`e.ESP_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = filterGroups.length > 0 ? `WHERE ${filterGroups.join(' AND ')} AND te.ESTADO = 1 AND u.ESTADO = 1` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
        SELECT e.PK_TMEESPACIO as CodEspacio, e.PK_TMETIPO_ESPACIO as CodTipoEspacio, te.TES_NOMBRE as NombreTipoEspacio, te.TES_DESCRIPCION as DescripcionTipoEspacio, 
        e.PK_TMEUNIDAD as CodUnidad, u.UNI_NOMBRE as NombreUnidad, u.UNI_DESCRIPCION as DescripcionUnidad, e.ESP_NOMBRE as NombreEspacio, e.ESP_DESCRIPCION as DescripcionEspacio,
        e.ESP_CAPACIDAD as CapacidadEspacio, e.ESP_DESCRIPCION_UBICACION as DescripcionUbicacion, e.ESP_DIAS_ANTELACION as DiasAntelacion, e.ESP_DISPONIBILIDAD as Disponibilidad,
        e.ESP_FECHA_CREACION as FechaCreacion, e.ESP_FECHA_EDICION as FechaEdicion, e.ESTADO as Estado,
        f.FES_NOMBRE as NombreFoto, f.FES_RUTA as RutaFoto, f.FES_ORDEN as Orden, IFNULL(f.ESTADO, NULL) as Estado_Foto, te.ESTADO as Estado_TipoEspacio, u.ESTADO as Estado_Unidad
        FROM T_MEESPACIO e
        JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
        JOIN T_MEUNIDAD u ON e.PK_TMEUNIDAD = u.PK_TMEUNIDAD
        LEFT JOIN (
          SELECT *
          FROM T_MEFOTO_ESPACIO
          WHERE ESTADO = 1
          AND (PK_TMEESPACIO, FES_ORDEN) IN (
            SELECT PK_TMEESPACIO, MIN(FES_ORDEN)
            FROM T_MEFOTO_ESPACIO
            WHERE ESTADO = 1
            GROUP BY PK_TMEESPACIO
          )
        ) f ON e.PK_TMEESPACIO = f.PK_TMEESPACIO
        ${whereClause !== '' ? whereClause : 'WHERE te.ESTADO = 1 AND u.ESTADO = 1'}
        ${orderClause}
        LIMIT ${limit}
        OFFSET ${offset}
    `;


    const countQuery = `
    SELECT COUNT(*) as count 
    FROM T_MEESPACIO e 
    JOIN T_METIPO_ESPACIO te ON e.PK_TMETIPO_ESPACIO = te.PK_TMETIPO_ESPACIO
    JOIN T_MEUNIDAD u ON e.PK_TMEUNIDAD = u.PK_TMEUNIDAD
    LEFT JOIN (
      SELECT * 
      FROM T_MEFOTO_ESPACIO
      WHERE ESTADO = 1
      ORDER BY FES_ORDEN ASC  
      LIMIT 1
    ) f ON e.PK_TMEESPACIO = f.PK_TMEESPACIO 
    ${whereClause !== '' ? whereClause : 'WHERE te.ESTADO = 1 AND u.ESTADO = 1'}`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.

    const [result] = await pool.query(query);
    const espacio = result as Espacio[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ espacio, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los espacios' });
  }
}

async function createEspacio(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      CodTipoEspacio,
      CodUnidad,
      NombreEspacio,
      DescripcionEspacio,
      CapacidadEspacio,
      DescripcionUbicacion,
      DiasAntelacion,
      PersonasInternas
    } = req.body;

    const FechaCreacion = new Date(Date.now());
    const FechaEdicion = FechaCreacion;
    const Disponibilidad = 1;

    const { miEspacioSession } = req.cookies;

    if (miEspacioSession === undefined) {
      const { miEspacioSession } = req.cookies;
      if (miEspacioSession !== undefined) {
        await insertAuditLog(
          miEspacioSession,
          new Date().toISOString().slice(0, 10),
          new Date().toLocaleTimeString(),
          req.socket?.remoteAddress ?? "",
          `Crear espacio`,
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
      'INSERT INTO T_MEESPACIO (PK_TMEUNIDAD, PK_TMCPERSONA_INTERNA, PK_TMETIPO_ESPACIO, ESP_NOMBRE, ESP_DESCRIPCION, ESP_CAPACIDAD, ESP_DESCRIPCION_UBICACION, ESP_DISPONIBILIDAD, ESP_DIAS_ANTELACION, ESP_FECHA_CREACION, ESP_FECHA_EDICION, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
        FechaCreacion,
        FechaEdicion,
        1
      ]
    );

    const nuevoEspacio: Espacio_Create = {
      CodEspacio: espacioResult.insertId,
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

    const dirigentesValues = PersonasInternas.map((personaInterna: number) => [nuevoEspacio.CodEspacio, personaInterna, FechaCreacion, 1]);

    await pool.query<OkPacket>(
      'INSERT INTO T_MEDIRIGENTE_ESPACIO (PK_TMEESPACIO, PK_TMCPERSONA_INTERNA, DES_FECHA_ASIGNACION, ESTADO) VALUES ?',
      [dirigentesValues]
    );
    console.log(nuevoEspacio);
    if (miEspacioSession !== undefined) {
      await insertAuditLog(
        miEspacioSession,
        new Date().toISOString().slice(0, 10),
        new Date().toLocaleTimeString(),
        req.socket?.remoteAddress ?? "",
        `Crear espacio`,
        'Éxito',
        req.headers['user-agent']?.split(' ')[0] ?? "",
        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
      );
    }
    res.status(201).json(nuevoEspacio);
  } catch (error) {
    console.error(error);
    const { miEspacioSession } = req.cookies;
    if (miEspacioSession !== undefined) {
      await insertAuditLog(
        miEspacioSession,
        new Date().toISOString().slice(0, 10),
        new Date().toLocaleTimeString(),
        req.socket?.remoteAddress ?? "",
        `Crear espacio`,
        'Fracaso',
        req.headers['user-agent']?.split(' ')[0] ?? "",
        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
      );
    }
    res.status(500).json({ message: 'Error al crear el espacio' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Espacio[] | Espacio | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getEspacios(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir?.toString().toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createEspacio(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}